import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

async function touch(page: Page) {
  const client = await page.context().newCDPSession(page);
  const send = async (type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel", x?: number, y?: number) => {
    await client.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: x === undefined ? [] : [{ x, y: y!, id: 1, radiusX: 1, radiusY: 1 }],
    });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  return { send, close: () => client.detach() };
}

for (const width of [320, 390, 820]) {
  test(`right-edge drag follows the finger and opens/closes at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/?demo=1");
    const sidebar = page.getByRole("complementary", { name: "Herdr workspaces", includeHidden: true });
    const finger = await touch(page);
    try {
      await expect(sidebar).toHaveAttribute("aria-hidden", "true");
      expect((await sidebar.boundingBox())!.x).toBeGreaterThanOrEqual(width);
      await finger.send("touchStart", width - 12, 250);
      await finger.send("touchMove", width - 60, 252);
      const first = (await sidebar.boundingBox())!;
      expect(first.x).toBeLessThan(width - 20);
      expect(first.x).toBeGreaterThan(width - first.width);
      await finger.send("touchMove", width - 170, 252);
      expect((await sidebar.boundingBox())!.x).toBeLessThan(first.x - 70);
      await finger.send("touchEnd");
      await expect(sidebar).toHaveAttribute("aria-hidden", "false");
      await expect.poll(async () => Math.abs((await sidebar.boundingBox())!.x + (await sidebar.boundingBox())!.width - width)).toBeLessThan(1);
      const box = (await sidebar.boundingBox())!;
      await finger.send("touchStart", box.x + 35, 250);
      await finger.send("touchMove", box.x + 170, 252);
      await finger.send("touchEnd");
      await expect(sidebar).toHaveAttribute("aria-hidden", "true");
      await expect.poll(async () => (await sidebar.boundingBox())!.x).toBeGreaterThanOrEqual(width);
    } finally { await finger.close(); }
  });
}

test("short, reversed, and cancelled gestures restore the previous drawer state", async ({ page }) => {
  await page.goto("/?demo=1");
  const sidebar = page.locator("aside.sidebar");
  const finger = await touch(page);
  try {
    await finger.send("touchStart", 378, 250);
    await finger.send("touchMove", 335, 252);
    await finger.send("touchEnd");
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await expect.poll(async () => (await sidebar.boundingBox())!.x).toBeGreaterThanOrEqual(390);
    await finger.send("touchStart", 378, 250);
    await finger.send("touchMove", 210, 252);
    await finger.send("touchMove", 360, 252);
    await finger.send("touchEnd");
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await finger.send("touchStart", 378, 250);
    await finger.send("touchMove", 210, 252);
    await finger.send("touchCancel");
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await page.getByTitle("Open sidebar").tap();
    await expect(sidebar).toHaveAttribute("aria-hidden", "false");
    await expect.poll(async () => (await sidebar.boundingBox())!.x).toBeLessThan(73);
    await finger.send("touchStart", 115, 250);
    await finger.send("touchMove", 250, 252);
    await finger.send("touchCancel");
    await expect(sidebar).toHaveAttribute("aria-hidden", "false");
    await page.getByTitle("Close sidebar", { exact: true }).tap();
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  } finally { await finger.close(); }
});

test("only an inward swipe starting at the right edge opens the drawer", async ({ page }) => {
  await page.goto("/?demo=1");
  const finger = await touch(page);
  try {
    for (const [from, to] of [[30, 200], [200, 45], [378, 389]]) {
      await finger.send("touchStart", from, 250);
      await finger.send("touchMove", to, 251);
      await finger.send("touchEnd");
      await expect(page.locator("aside.sidebar")).toHaveAttribute("aria-hidden", "true");
    }
  } finally { await finger.close(); }
});

test("vertical gestures scroll the content and workspace list without toggling the menu", async ({ page }) => {
  await page.goto("/?demo=1");
  await page.locator(".session-main").evaluate(element => {
    const filler = document.createElement("div"); filler.style.height = "1600px";
    element.append(filler); (element as HTMLElement).style.scrollBehavior = "auto"; element.scrollTop = 0;
  });
  const finger = await touch(page);
  try {
    await finger.send("touchStart", 378, 430);
    await finger.send("touchMove", 376, 330);
    await finger.send("touchMove", 374, 200);
    await finger.send("touchEnd");
    await expect.poll(() => page.locator(".session-main").evaluate(element => element.scrollTop)).toBeGreaterThan(20);
    await expect(page.locator("aside.sidebar")).toHaveAttribute("aria-hidden", "true");
    await page.getByTitle("Open sidebar").tap();
    await page.locator(".workspace-list").evaluate(element => {
      const filler = document.createElement("div"); filler.style.height = "1600px";
      element.append(filler); (element as HTMLElement).style.scrollBehavior = "auto"; element.scrollTop = 0;
    });
    await finger.send("touchStart", 230, 430);
    await finger.send("touchMove", 232, 300);
    await finger.send("touchMove", 234, 180);
    await finger.send("touchEnd");
    await expect.poll(() => page.locator(".workspace-list").evaluate(element => element.scrollTop)).toBeGreaterThan(20);
    await expect(page.locator("aside.sidebar")).toHaveAttribute("aria-hidden", "false");
  } finally { await finger.close(); }
});

test("dialogs and editable controls keep their own gestures", async ({ page }) => {
  await page.goto("/?demo=1&settings=1");
  const finger = await touch(page);
  try {
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
    await finger.send("touchStart", 378, 250);
    await finger.send("touchMove", 210, 252);
    await finger.send("touchEnd");
    await expect(page.locator("aside.sidebar")).toHaveAttribute("aria-hidden", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.evaluate(() => {
      const input = document.createElement("textarea"); input.id = "gesture-input";
      input.style.cssText = "position:fixed;right:0;top:180px;width:100px;height:100px;z-index:100;font-size:16px";
      document.body.append(input);
    });
    await finger.send("touchStart", 378, 225);
    await finger.send("touchMove", 210, 227);
    await finger.send("touchEnd");
    await expect(page.locator("aside.sidebar")).toHaveAttribute("aria-hidden", "true");
    await page.locator("#gesture-input").evaluate(element => element.remove());
    await finger.send("touchStart", 378, 250);
    await finger.send("touchMove", 210, 252);
    await finger.send("touchEnd");
    await expect(page.locator("aside.sidebar")).toHaveAttribute("aria-hidden", "false");
  } finally { await finger.close(); }
});

test("swipes suppress a synthesized click but allow the next intentional tap", async ({ page }) => {
  await page.goto("/?demo=1");
  const finger = await touch(page);
  try {
    await finger.send("touchStart", 378, 250);
    await finger.send("touchMove", 210, 252);
    await finger.send("touchEnd");
    await expect(page.locator("aside.sidebar")).toHaveAttribute("aria-hidden", "false");
    const close = page.getByRole("button", { name: "Close workspace t3-herdr", exact: true });
    const dispatched = await close.evaluate(element => element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1 })));
    expect(dispatched).toBe(false);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await close.tap();
    const dialog = page.getByRole("dialog", { name: "Close workspace", exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel", exact: true }).tap();
  } finally { await finger.close(); }
});

test("desktop gestures are ignored and resizing clears an unfinished mobile drag", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 844 });
  await page.goto("/?demo=1");
  const sidebar = page.locator("aside.sidebar");
  const finger = await touch(page);
  try {
    await finger.send("touchStart", 1268, 250);
    await finger.send("touchMove", 1080, 252);
    await finger.send("touchEnd");
    expect((await sidebar.boundingBox())!.x).toBe(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await finger.send("touchStart", 378, 250);
    await finger.send("touchMove", 210, 252);
    await expect(sidebar).toHaveClass(/is-dragging/);
    await page.setViewportSize({ width: 1280, height: 844 });
    await finger.send("touchEnd");
    await expect(sidebar).not.toHaveClass(/is-dragging/);
    expect(await sidebar.evaluate(element => getComputedStyle(element).transform)).toBe("none");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await expect.poll(async () => (await sidebar.boundingBox())!.x).toBeGreaterThanOrEqual(390);
  } finally { await finger.close(); }
});

test("reduced motion and the existing menu button and backdrop still work", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?demo=1");
  const sidebar = page.locator("aside.sidebar");
  const finger = await touch(page);
  try {
    await finger.send("touchStart", 378, 250);
    await finger.send("touchMove", 210, 252);
    await finger.send("touchEnd");
    await expect(sidebar).toHaveAttribute("aria-hidden", "false");
    expect(parseFloat(await sidebar.evaluate(element => getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.001);
    await page.locator(".sidebar-scrim").tap({ position: { x: 20, y: 400 } });
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await page.getByTitle("Open sidebar").tap();
    await expect(sidebar).toHaveAttribute("aria-hidden", "false");
    await page.getByTitle("Close sidebar", { exact: true }).tap();
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
  } finally { await finger.close(); }
});
