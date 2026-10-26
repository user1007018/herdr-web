import { expect, test, type Page } from "@playwright/test";
import { demoPaneById, demoSnapshot } from "../src/lib/mock";

async function closeDemoWorkspace(page: Page, width: number) {
  const deletes: string[] = [];
  page.on("request", request => {
    if (request.method() === "DELETE") deletes.push(request.url());
  });
  await page.goto("/?demo=1");
  if (width <= 820) await page.getByTitle("Open sidebar").click();
  const sidebar = page.getByRole("complementary", { name: "Herdr workspaces" });
  const close = sidebar.getByRole("button", { name: "Close workspace t3-herdr", exact: true });
  await close.locator("..").hover();
  await expect(close).toBeInViewport();
  if (width <= 820) await expect(close).toHaveCSS("opacity", "1");
  await close.click();
  const dialog = page.getByRole("dialog", { name: "Close workspace", exact: true });
  await expect(dialog).toContainText("t3-herdr");
  await expect(dialog).toContainText("stops all processes");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(sidebar.locator(".workspace-toggle")).toHaveCount(4);
  expect(deletes).toHaveLength(0);
  await close.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await close.click();
  await dialog.getByRole("button", { name: "Close workspace", exact: true }).click();
  await expect(sidebar.locator(".workspace-toggle")).toHaveCount(3);
  await expect(sidebar.getByRole("button", { name: "Close workspace t3-herdr", exact: true })).toHaveCount(0);
  await expect(sidebar.locator(".pane-row.is-active")).toHaveCount(1);
  await expect(page.getByText("Demo workspace closed.", { exact: true })).toBeVisible();
  expect(deletes).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

for (const width of [320, 390, 1280]) {
  test.describe(`workspace closing at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: width <= 820, isMobile: width <= 820 });
    test("requires confirmation and preserves the other workspaces", async ({ page }) => {
      await closeDemoWorkspace(page, width);
    });
  });
}

async function mockLive(page: Page) {
  const snapshot = structuredClone(demoSnapshot);
  snapshot.sessions?.push({ name: "buildbox", isPrimary: false, reachable: true, agents: 1, working: 1, blocked: 0 });
  const requests: Array<{ url: string; body: { requestId: string } }> = [];
  await page.route("**/api/snapshot*", route => route.fulfill({ json: snapshot }));
  await page.route("**/api/pane/**", route => route.fulfill({ json: demoPaneById["w1:p1"] }));
  await page.route("**/api/workspace/**", route => {
    requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return route.fulfill({ json: { ok: false, error: "Workspace close refused" } });
  });
  return { snapshot, requests };
}

test("closing targets the current session and preserves the workspace on failure", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  const { requests } = await mockLive(page);
  await page.goto("/?session=buildbox");
  const close = page.getByRole("button", { name: "Close workspace t3-herdr", exact: true });
  await expect(close).toBeEnabled();
  await close.click();
  expect(requests).toHaveLength(0);
  await page.getByRole("dialog", { name: "Close workspace", exact: true }).getByRole("button", { name: "Close workspace", exact: true }).click();
  await expect(page.getByText("Workspace close refused", { exact: true })).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(new URL(requests[0].url).pathname).toBe("/api/workspace/w1");
  expect(new URL(requests[0].url).searchParams.get("session")).toBe("buildbox");
  expect(requests[0].body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  await expect(page.locator(".workspace-toggle")).toHaveCount(4);
});

test("read-only revocation dismisses pending confirmation and prevents closing", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  const { snapshot, requests } = await mockLive(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Close workspace t3-herdr", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Close workspace", exact: true });
  await expect(dialog).toBeVisible();
  snapshot.device = { enforced: true, device: "phone", authorized: false };
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Close workspace t3-herdr", exact: true })).toBeDisabled();
  expect(requests).toHaveLength(0);
});

test("switching session dismisses a pending workspace close", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  const { requests } = await mockLive(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Close workspace t3-herdr", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Close workspace", exact: true })).toBeVisible();
  await page.locator(".session-select select").selectOption("buildbox", { force: true });
  await expect(page.getByRole("dialog", { name: "Close workspace", exact: true })).toHaveCount(0);
  expect(requests).toHaveLength(0);
});

test("creating after closing a demo workspace keeps workspace IDs independent", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto("/?demo=1");
  const create = async (name: string) => {
    await page.getByRole("button", { name: "New workspace", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "New workspace", exact: true });
    await dialog.getByLabel("Name", { exact: true }).fill(name);
    await dialog.getByRole("button", { name: "Create workspace", exact: true }).click();
    await expect(page.getByRole("button", { name: `Close workspace ${name}`, exact: true })).toBeAttached();
  };
  const close = async (name: string) => {
    await page.getByRole("button", { name: `Close workspace ${name}`, exact: true }).click();
    await page.getByRole("dialog", { name: "Close workspace", exact: true }).getByRole("button", { name: "Close workspace", exact: true }).click();
  };
  await create("demo-first");
  await create("demo-second");
  await close("demo-first");
  await create("demo-third");
  await close("demo-third");
  await expect(page.getByRole("button", { name: "Close workspace demo-second", exact: true })).toHaveCount(1);
  await expect(page.locator(".workspace-toggle")).toHaveCount(5);
});
