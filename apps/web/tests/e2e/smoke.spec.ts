import { expect, test } from "@playwright/test";

const ROUTES: [string, string][] = [
  ["/overview", "Overview"],
  ["/visual", "Visual Evolution"],
  ["/code", "Code Evolution"],
  ["/impact", "Component Impact"],
  ["/timeline", "Development Timeline"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
  ["/design-system", "Design system"],
];

test("root redirects to the overview", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/overview$/);
});

for (const [path, title] of ROUTES) {
  test(`renders ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  });
}

test("sidebar navigates between modules", async ({ page }) => {
  await page.goto("/overview");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(/\/reports$/);
});

test("theme setting switches and persists across reload", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("command palette opens with Ctrl+K and navigates", async ({ page }) => {
  await page.goto("/overview");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await page.getByRole("combobox", { name: "Search commands" }).fill("settings");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/settings$/);
});

test("sidebar collapses with Ctrl+B", async ({ page }) => {
  await page.goto("/overview");
  const toggle = page.getByRole("button", { name: /(Collapse|Expand) sidebar/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Control+b");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("api status reports a definite state (online or offline), never fabricated", async ({ page }) => {
  await page.goto("/overview");
  await expect(page.getByRole("status").filter({ hasText: /API (online|offline)/ })).toBeVisible();
});
