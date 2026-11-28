import { expect, test } from "@playwright/test";

// Wide enough that the inspector starts open (it auto-collapses below 1440px).
test.use({ viewport: { width: 1600, height: 900 } });

test.describe("visual lens", () => {
  test("labels the data as sample and shows real image sizes", async ({ page }) => {
    await page.goto("/visual");
    const main = page.getByRole("main");
    await expect(main.getByText("Sample data").first()).toBeVisible();
    const inspector = page.getByRole("complementary", { name: "Inspector" });
    await expect(inspector.getByText("1280 × 800").first()).toBeVisible();
    await expect(inspector.getByText("Sizes match").locator("xpath=following-sibling::dd")).toHaveText("Yes");
  });

  test("slider is keyboard operable", async ({ page }) => {
    await page.goto("/visual");
    const slider = page.getByRole("slider", { name: "Before and after divider" });
    await expect(slider).toHaveAttribute("aria-valuenow", "50");
    await slider.focus();
    await page.keyboard.press("ArrowRight");
    await expect(slider).toHaveAttribute("aria-valuenow", "52");
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(slider).toHaveAttribute("aria-valuenow", "42");
    await page.keyboard.press("End");
    await expect(slider).toHaveAttribute("aria-valuenow", "100");
    await page.keyboard.press("Home");
    await expect(slider).toHaveAttribute("aria-valuenow", "0");
  });

  test("slider follows a pointer click", async ({ page }) => {
    await page.goto("/visual");
    const slider = page.getByRole("slider", { name: "Before and after divider" });
    const frame = page.locator("div.touch-pan-y");
    const box = await frame.boundingBox();
    if (!box) throw new Error("slider frame not found");
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.5);
    const now = Number(await slider.getAttribute("aria-valuenow"));
    expect(now).toBeGreaterThan(20);
    expect(now).toBeLessThan(30);
  });

  test("switches views and keeps them in the URL", async ({ page }) => {
    await page.goto("/visual");
    await page.getByRole("radio", { name: "Side by side" }).click();
    await expect(page).toHaveURL(/view=side-by-side/);
    await expect(page.getByRole("figure")).toHaveCount(2);

    await page.getByRole("radio", { name: "Overlay" }).click();
    await expect(page).toHaveURL(/view=overlay/);
    await page.getByLabel("After opacity").fill("30");
    await expect(page.getByText("After · 30%")).toBeVisible();

    await page.reload();
    await expect(page.getByRole("radio", { name: "Overlay" })).toHaveAttribute("aria-checked", "true");
  });

  test("number keys switch views, but not while typing", async ({ page }) => {
    await page.goto("/visual");
    // The workspace renders on the client, so wait for it before sending keys. A key pressed before the
    // shortcut listener is attached is simply lost, so the press is retried together with its assertion.
    await expect(page.getByRole("slider", { name: "Before and after divider" })).toBeVisible();
    await expect(async () => {
      await page.keyboard.press("3");
      await expect(page.getByRole("radio", { name: "Overlay" })).toHaveAttribute("aria-checked", "true", { timeout: 1000 });
    }).toPass();
    await expect(async () => {
      await page.keyboard.press("2");
      await expect(page.getByRole("radio", { name: "Side by side" })).toHaveAttribute("aria-checked", "true", { timeout: 1000 });
    }).toPass();
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox", { name: "Search commands" }).fill("1");
    // While the palette is open the page behind it is aria-hidden, so close it before querying by role.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("radio", { name: "Side by side" })).toHaveAttribute("aria-checked", "true");
  });

  test("difference and heatmap are unavailable until there is an analysis, and nothing is invented", async ({ page }) => {
    await page.goto("/visual");
    const diff = page.getByRole("radio", { name: "Difference" });
    await expect(diff).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByRole("slider", { name: "Before and after divider" })).toBeVisible();
    const url = page.url();
    await diff.click({ force: true }); // Playwright refuses to click aria-disabled controls unless forced
    await page.keyboard.press("4");
    await page.waitForTimeout(500); // give a (wrongly) enabled shortcut time to navigate
    expect(page.url()).toBe(url);
    await expect(diff).toHaveAttribute("aria-checked", "false");
    const inspector = page.getByRole("complementary", { name: "Inspector" });
    await expect(inspector.getByText("Not computed", { exact: true })).toHaveCount(3);
    await expect(inspector.getByText("Unknown")).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Changed regions" })).toHaveCount(0);
  });

  test("a difference view requested by URL without analysis explains itself", async ({ page }) => {
    await page.goto("/visual?view=difference");
    await expect(page.getByText("This view needs an analysis")).toBeVisible();
  });
});

test.describe("code lens", () => {
  test("lists the sample files and shows a diff for the selected one", async ({ page }) => {
    await page.goto("/code");
    await expect(page.getByRole("option")).toHaveCount(6);
    await page.getByRole("option", { name: /Button\.tsx/ }).click();
    await expect(page).toHaveURL(/file=src-components-button-tsx/);
    await expect(page.getByRole("table", { name: /diff of src\/components\/Button\.tsx/ })).toBeVisible();
    await expect(page.getByRole("cell", { name: /variant === "danger"/ })).toBeVisible();
  });

  test("filters by name and status", async ({ page }) => {
    await page.goto("/code");
    await page.getByRole("searchbox", { name: "Filter files" }).fill("css");
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.getByRole("searchbox", { name: "Filter files" }).fill("zzz");
    await expect(page.getByText("No files match")).toBeVisible();
    await page.getByRole("searchbox", { name: "Filter files" }).fill("");
    await page.getByRole("radio", { name: "Deleted" }).click();
    await expect(page.getByRole("option")).toHaveCount(1);
    await expect(page.getByRole("option", { name: /LegacyBanner/ })).toBeVisible();
  });

  test("arrow keys move through the file list", async ({ page }) => {
    await page.goto("/code");
    const list = page.getByRole("listbox", { name: "Changed files" });
    await list.focus();
    await expect(page.getByRole("option", { name: /package\.json/ })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("option", { name: /Button\.tsx/ })).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("End");
    await expect(page.getByRole("option", { name: /settings\.css/ })).toHaveAttribute("aria-selected", "true");
  });

  test("unified and split layouts both render and persist", async ({ page }) => {
    await page.goto("/code?file=src-styles-settings-css");
    await page.getByRole("radio", { name: "Split" }).click();
    await expect(page).toHaveURL(/layout=split/);
    await expect(page.getByRole("table", { name: /Side-by-side diff/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("table", { name: /Side-by-side diff/ })).toBeVisible();
    await expect(async () => {
      await page.keyboard.press("1");
      await expect(page.getByRole("table", { name: /Unified diff/ })).toBeVisible({ timeout: 1000 });
    }).toPass();
  });

  test("added and deleted lines are exposed to assistive tech, not colour alone", async ({ page }) => {
    await page.goto("/code?file=src-components-legacybanner-tsx");
    await expect(page.getByText("Removed:").first()).toBeAttached();
    await page.goto("/code?file=src-components-dangerzone-tsx");
    await expect(page.getByText("Added:").first()).toBeAttached();
  });

  test("invalid URL parameters fall back to defaults", async ({ page }) => {
    await page.goto("/code?file=nope&layout=bogus");
    await expect(page.getByRole("option", { name: /package\.json/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("table", { name: /Unified diff/ })).toBeVisible();
  });
});

test.describe("workspace shell", () => {
  test("lens switch keeps the selected file", async ({ page }) => {
    await page.goto("/code?file=src-styles-settings-css");
    await page.getByRole("navigation", { name: "Comparison lens" }).getByRole("link", { name: "Visual" }).click();
    await expect(page).toHaveURL(/\/visual\?file=src-styles-settings-css/);
    await page.getByRole("navigation", { name: "Comparison lens" }).getByRole("link", { name: "Code" }).click();
    await expect(page.getByRole("option", { name: /settings\.css/ })).toHaveAttribute("aria-selected", "true");
  });

  test("panes can be hidden and shown", async ({ page }) => {
    await page.goto("/code");
    await expect(page.getByRole("complementary", { name: "Inspector" })).toBeVisible();
    await page.getByRole("button", { name: "Hide inspector" }).click();
    await expect(page.getByRole("complementary", { name: "Inspector" })).toBeHidden();
    await page.getByRole("button", { name: "Hide list" }).click();
    await expect(page.getByRole("complementary", { name: "Changed files" })).toBeHidden();
  });

  test("overview lists the sample comparison and links into the workspace", async ({ page }) => {
    await page.goto("/overview");
    await expect(page.getByRole("main").getByText("Sample data").first()).toBeVisible();
    await page.getByRole("link", { name: /Open code/ }).click();
    await expect(page).toHaveURL(/\/code$/);
  });
});

test.describe("narrower screens", () => {
  test("inspector starts collapsed below 1440px", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/visual");
    await expect(page.getByRole("complementary", { name: "Inspector" })).toBeHidden();
    await page.getByRole("button", { name: "Show inspector" }).click();
    await expect(page.getByRole("complementary", { name: "Inspector" })).toBeVisible();
  });

  test("panes become a switcher on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto("/code");
    const group = page.getByRole("group", { name: "Workspace pane" });
    await expect(group).toBeVisible();
    await expect(page.getByRole("listbox", { name: "Changed files" })).toBeHidden();
    await group.getByRole("button", { name: "Files" }).click();
    await expect(page.getByRole("listbox", { name: "Changed files" })).toBeVisible();
    await page.getByRole("option", { name: /Button\.tsx/ }).click();
    await expect(page.getByRole("table", { name: /diff of src\/components\/Button\.tsx/ })).toBeVisible();
  });
});
