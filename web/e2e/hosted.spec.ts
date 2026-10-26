import { expect, test } from "@playwright/test";

test("hosted app serves an installable PWA without caching relay data", async ({ page, request }) => {
  test.skip(!process.env.HERDR_WEB_TEST_URL, "Requires a hosted production build");
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("Herdr");
  expect(manifest.display).toBe("standalone");
  const icon = await request.get(manifest.icons[0].src);
  expect(icon.headers()["content-type"]).toContain("image/png");

  await page.goto("/?demo=1");
  await expect(page.getByText("Terminal output")).toBeVisible();
  const workerUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });
  expect(workerUrl).toMatch(/\/sw\.js$/);
  const cachedPaths = await page.evaluate(async () => {
    const keys = await caches.keys();
    const entries = await Promise.all(keys.map(async (key) => (await (await caches.open(key)).keys()).map((request) => new URL(request.url).pathname)));
    return entries.flat();
  });
  expect(cachedPaths).toContain("/index.html");
  expect(cachedPaths.some((path) => path.startsWith("/api/"))).toBe(false);
});

test("small iPhones keep navigation and the composer within the viewport", async ({ page }) => {
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/?demo=1");
    await expect(page.getByText("Terminal output")).toBeVisible();
    await expect(page.getByLabel("Reply to pane")).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await page.getByTitle("Open sidebar").click();
    await expect(page.getByRole("complementary", { name: "Herdr workspaces" })).toHaveAttribute("aria-hidden", "false");
    await page.getByTitle("Close sidebar").click();
    await expect(page.locator("aside.sidebar")).toHaveAttribute("aria-hidden", "true");
  }
});

test("preview workspace and pane actions work with explicit termination confirmation", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?demo=1");
  await page.getByRole("button", { name: "New workspace", exact: true }).click();
  const workspace = page.getByRole("dialog", { name: "New workspace" });
  await workspace.getByLabel("Name", { exact: true }).fill("browser-check");
  await workspace.getByRole("button", { name: "Create workspace" }).click();
  await expect(page.getByText("Demo workspace created.")).toBeVisible();
  await page.getByRole("button", { name: "New pane", exact: true }).click();
  const pane = page.getByRole("dialog", { name: "New pane" });
  await pane.getByLabel("Tab name").fill("browser-shell");
  await pane.getByRole("button", { name: "Create pane" }).click();
  await expect(page.locator(".topbar-title")).toContainText("browser-shell");
  await page.getByTitle("Special terminal keys").click();
  await page.getByRole("button", { name: "Esc", exact: true }).click();
  await expect(page.getByText("Sent Esc in demo mode.")).toBeVisible();
  await page.getByTitle("Terminate pane").click();
  const confirmation = page.getByRole("dialog", { name: "Terminate pane" });
  await expect(confirmation.getByText("This stops the process running in the selected Herdr pane.")).toBeVisible();
  await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".topbar-title")).toContainText("browser-shell");
  await page.getByTitle("Terminate pane").click();
  await page.getByRole("button", { name: "Terminate", exact: true }).click();
  await expect(page.getByText("Demo pane closed.")).toBeVisible();
});
