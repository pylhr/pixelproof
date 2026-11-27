/**
 * End-to-end tests of real analysis. They need the FastAPI backend; playwright.config.ts starts it
 * from apps/api/.venv when that exists. Without a running API the whole file is skipped.
 */
import path from "node:path";
import zlib from "node:zlib";
import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 900 } });

const FIXTURES = path.resolve(__dirname, "../../public/fixtures");
const BEFORE = path.join(FIXTURES, "acme-settings-before.png");
const AFTER = path.join(FIXTURES, "acme-settings-after.png");

test.beforeAll(async () => {
  const up = await fetch("http://127.0.0.1:8000/health").then((r) => r.ok).catch(() => false);
  test.skip(!up, "The PixelProof API is not running on 127.0.0.1:8000");
});

// Minimal valid PNG (solid colour) so size-mismatch cases need no binary fixtures.
function solidPng(w: number, h: number, rgb: [number, number, number]): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => rgb).flat())]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function analyseSample(page: Page) {
  await page.goto("/visual");
  await page.getByRole("button", { name: "Analyse sample" }).click();
  await expect(page).toHaveURL(/cmp=[0-9a-f]{32}/, { timeout: 30_000 });
  await expect(page).toHaveURL(/view=difference/);
}

const inspector = (page: Page) => page.getByRole("complementary", { name: "Inspector" });

test("analyses the sample with the real backend and shows measured results", async ({ page }) => {
  await analyseSample(page);
  const insp = inspector(page);
  await expect(insp.getByText("Measurements")).toBeVisible();
  await expect(insp.getByText(/^\d[\d,]* \(\d+\.\d{2}%\)$/)).toBeVisible();
  await expect(insp.getByText(/^0\.\d{4}$/)).toBeVisible(); // SSIM
  await expect(page.getByRole("option", { name: /Region 1/ })).toBeVisible();
  // The data is still fictional, and says so.
  await expect(page.getByRole("main").getByText("Sample data").first()).toBeVisible();
  // Difference and Heatmap are now available.
  await expect(page.getByRole("radio", { name: "Difference" })).not.toHaveAttribute("aria-disabled", "true");
  await page.getByRole("radio", { name: "Heatmap" }).click();
  await expect(page.getByLabel("Heatmap colour scale")).toBeVisible();
  await expect(page.getByAltText("Heatmap of per-pixel colour difference")).toBeVisible();
});

test("selecting a region highlights it and survives switching views", async ({ page }) => {
  await analyseSample(page);
  const region = page.getByRole("option", { name: /Region 1/ });
  await region.click();
  await expect(region).toHaveAttribute("aria-selected", "true");
  await page.getByRole("radio", { name: "Overlay" }).click();
  await expect(region).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Show regions").uncheck();
  await expect(page.locator('svg[viewBox="0 0 1280 800"] rect')).toHaveCount(0);
});

test("reloading restores an analysed comparison from its id", async ({ page }) => {
  await analyseSample(page);
  const url = page.url();
  await page.reload();
  expect(page.url()).toBe(url);
  await expect(inspector(page).getByText("Measurements")).toBeVisible();
});

test("re-running with a new tolerance creates a new comparison and keeps the old one", async ({ page }) => {
  await analyseSample(page);
  const first = new URL(page.url()).searchParams.get("cmp");
  await inspector(page).getByLabel("Tolerance (ΔE)").fill("20");
  await inspector(page).getByRole("button", { name: "Re-run" }).click();
  await expect(page).not.toHaveURL(new RegExp(`cmp=${first}`), { timeout: 30_000 });
  await expect(inspector(page).getByText("20", { exact: true }).first()).toBeVisible();
  const old = await page.request.get(`http://127.0.0.1:8000/api/comparisons/visual/${first}`);
  expect(old.status()).toBe(200);
});

test("exports results as JSON", async ({ page }) => {
  await analyseSample(page);
  const [download] = await Promise.all([page.waitForEvent("download"), inspector(page).getByRole("button", { name: /Results \(JSON\)/ }).click()]);
  expect(download.suggestedFilename()).toBe("pixelproof-visual-results.json");
});

test("compares two uploaded screenshots", async ({ page }) => {
  await page.goto("/visual?new=1");
  const dialog = page.getByRole("dialog", { name: "New visual comparison" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Compare" })).toBeDisabled();
  await dialog.getByTestId("file-before").setInputFiles(BEFORE);
  await dialog.getByTestId("file-after").setInputFiles(AFTER);
  await dialog.getByRole("button", { name: "Compare" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(page).toHaveURL(/cmp=[0-9a-f]{32}/);
  await expect(page.getByRole("main").getByText("Sample data")).toHaveCount(0); // an upload is not labelled as sample
  await expect(inspector(page).getByText("Measurements")).toBeVisible();
  await expect(page.getByRole("option", { name: /Region 1/ })).toBeVisible();
});

test("a size mismatch is reported, not hidden", async ({ page }) => {
  await page.goto("/visual?new=1");
  const dialog = page.getByRole("dialog", { name: "New visual comparison" });
  await dialog.getByTestId("file-before").setInputFiles({ name: "small.png", mimeType: "image/png", buffer: solidPng(40, 30, [255, 255, 255]) });
  await dialog.getByTestId("file-after").setInputFiles({ name: "wide.png", mimeType: "image/png", buffer: solidPng(50, 30, [255, 255, 255]) });
  await dialog.getByRole("button", { name: "Compare" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(inspector(page).getByText(/differ in size/)).toBeVisible();
  await expect(inspector(page).getByText("Sizes match").locator("xpath=following-sibling::dd")).toContainText("No");
});

test("the server's rejection of a non-image is shown clearly", async ({ page }) => {
  await page.goto("/visual?new=1");
  const dialog = page.getByRole("dialog", { name: "New visual comparison" });
  await dialog.getByTestId("file-before").setInputFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image at all") });
  await dialog.getByTestId("file-after").setInputFiles(AFTER);
  await dialog.getByRole("button", { name: "Compare" }).click();
  await expect(dialog.getByRole("alert")).toContainText("not a readable image");
  await expect(dialog).toBeVisible();
});

test("unsupported types are blocked before upload", async ({ page }) => {
  await page.goto("/visual?new=1");
  const dialog = page.getByRole("dialog", { name: "New visual comparison" });
  await dialog.getByTestId("file-before").setInputFiles({ name: "x.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
  await expect(dialog.getByRole("alert")).toContainText("PNG, JPEG or WebP");
  await expect(dialog.getByRole("button", { name: "Compare" })).toBeDisabled();
});

test("an unknown comparison id shows an error with a way back", async ({ page }) => {
  await page.goto(`/visual?cmp=${"0".repeat(32)}`);
  await expect(page.getByText("Could not open this comparison")).toBeVisible();
  await page.getByRole("button", { name: "Open sample" }).click();
  await expect(page.getByRole("main").getByText("Sample data").first()).toBeVisible();
});

test("Overview lists real comparisons after one has been made", async ({ page }) => {
  await analyseSample(page);
  await page.goto("/overview");
  await expect(page.getByTestId("recent-item").first()).toBeVisible();
});

test("when the API is unreachable, comparing is disabled and says why", async ({ page }) => {
  await page.route("http://127.0.0.1:8000/health", (route) => route.abort());
  await page.goto("/visual?new=1");
  const dialog = page.getByRole("dialog", { name: "New visual comparison" });
  await expect(dialog.getByText(/not reachable/)).toBeVisible();
  await dialog.getByTestId("file-before").setInputFiles(BEFORE);
  await dialog.getByTestId("file-after").setInputFiles(AFTER);
  await expect(dialog.getByRole("button", { name: "Compare" })).toBeDisabled();
});
