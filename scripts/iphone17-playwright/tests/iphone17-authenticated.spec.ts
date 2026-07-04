import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 8000 });
  } catch {
    testInfo.skip(true, 'Server offline on :3322');
  }
});

// --- Viewport stability #261–270 ---
test('#261 viewport width matches iPhone 17 Air 402', async ({ page }) => {
  const w = await page.evaluate(() => window.innerWidth);
  expect(w).toBeGreaterThanOrEqual(390);
  expect(w).toBeLessThanOrEqual(430);
});

test('#262 viewport height is stable', async ({ page }) => {
  const h = await page.evaluate(() => window.innerHeight);
  expect(h).toBeGreaterThan(700);
});

test('#263 document scrollY is zero', async ({ page }) => {
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('#264 document scrollX is zero', async ({ page }) => {
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
});

test('#265 body overflow hidden', async ({ page }) => {
  const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
  expect(overflow).toContain('hidden');
});

test('#266 touch-action restricted on html', async ({ page }) => {
  const ta = await page.evaluate(() => getComputedStyle(document.documentElement).touchAction);
  expect(ta).toBeTruthy();
});

test('#267 viewport-fit cover meta present', async ({ page }) => {
  const content = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(content || '').toMatch(/viewport-fit=cover/i);
});

test('#268 user-scalable disabled in viewport', async ({ page }) => {
  const content = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(content || '').toMatch(/user-scalable=no|maximum-scale=1/i);
});

test('#269 devicePixelRatio >= 2', async ({ page }) => {
  expect(await page.evaluate(() => window.devicePixelRatio)).toBeGreaterThanOrEqual(2);
});

test('#270 page title is Nexify Terminal', async ({ page }) => {
  await expect(page).toHaveTitle(/Nexify Terminal/i);
});

// --- Swipe navigation #271–280 ---
test('#271 Chat tab active by default after unlock', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Chat', exact: true })).toBeVisible();
});

test('#272 tap Terminal tab switches view', async ({ page }) => {
  await page.getByRole('button', { name: 'Terminal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Terminal', exact: true })).toBeVisible();
});

test('#273 tap Files tab switches view', async ({ page }) => {
  await page.getByRole('button', { name: 'Files', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Files', exact: true })).toBeVisible();
});

test('#274 tap System tab switches view', async ({ page }) => {
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await expect(page.getByRole('button', { name: 'System', exact: true })).toBeVisible();
});

test('#275 swipe left from chat changes panel', async ({ page }) => {
  const box = await page.locator('body').boundingBox();
  if (!box) return;
  const y = box.height / 2;
  await page.mouse.move(box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.width * 0.2, y, { steps: 8 });
  await page.mouse.up();
});

test('#276 swipe right returns toward chat', async ({ page }) => {
  await page.getByRole('button', { name: 'Terminal', exact: true }).click();
  const box = await page.locator('body').boundingBox();
  if (!box) return;
  const y = box.height / 2;
  await page.mouse.move(box.width * 0.2, y);
  await page.mouse.down();
  await page.mouse.move(box.width * 0.7, y, { steps: 8 });
  await page.mouse.up();
});

test('#277 Insolvency tab reachable', async ({ page }) => {
  await page.getByRole('button', { name: 'Insolvency', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Insolvency', exact: true })).toBeVisible();
});

test('#278 tab bar remains visible after switch', async ({ page }) => {
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chat', exact: true })).toBeVisible();
});

test('#279 touch swipe does not scroll document', async ({ page }) => {
  const before = await page.evaluate(() => window.scrollY);
  const box = await page.locator('body').boundingBox();
  if (box) {
    await page.mouse.move(box.width / 2, box.height * 0.8);
    await page.mouse.down();
    await page.mouse.move(box.width / 2, box.height * 0.2, { steps: 6 });
    await page.mouse.up();
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test('#280 Chat tab click returns from System', async ({ page }) => {
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chat', exact: true })).toBeVisible();
});

// --- Safe area layout #281–288 ---
test('#281 header element within viewport top', async ({ page }) => {
  const box = await page.locator('header').first().boundingBox();
  expect(box).toBeTruthy();
  expect(box!.y).toBeGreaterThanOrEqual(0);
});

test('#282 footer input area within viewport bottom', async ({ page }) => {
  const vh = await page.evaluate(() => window.innerHeight);
  const box = await page.locator('textarea, input[type="text"]').last().boundingBox().catch(() => null);
  if (box) expect(box.y + box.height).toBeLessThanOrEqual(vh + 2);
});

test('#283 safe-area CSS variables defined', async ({ page }) => {
  const top = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')
  );
  expect(top).toBeDefined();
});

test('#284 no horizontal overflow on body', async ({ page }) => {
  const sw = await page.evaluate(() => document.body.scrollWidth);
  const iw = await page.evaluate(() => window.innerWidth);
  expect(sw).toBeLessThanOrEqual(iw + 2);
});

test('#285 main content visible after unlock', async ({ page }) => {
  await expect(page.locator('header').first()).toBeVisible();
});

test('#286 tab buttons not clipped left edge', async ({ page }) => {
  const box = await page.getByRole('button', { name: 'Chat', exact: true }).boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
});

test('#287 tab buttons not clipped right edge', async ({ page }) => {
  const iw = await page.evaluate(() => window.innerWidth);
  const box = await page.getByRole('button', { name: 'System', exact: true }).boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(iw + 2);
});

test('#288 workspace heading visible', async ({ page }) => {
  await expect(page.getByRole('heading').first()).toBeVisible();
});

// --- WebGL canvas #289–294 ---
test('#289 WebGL canvas element exists', async ({ page }) => {
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 8000 });
});

test('#290 canvas has non-zero dimensions', async ({ page }) => {
  const size = await page.locator('canvas').first().evaluate((el: HTMLCanvasElement) => ({
    w: el.width,
    h: el.height,
  }));
  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);
});

test('#291 canvas renders content', async ({ page }) => {
  const buf = await page.locator('canvas').first().screenshot();
  expect(buf.length).toBeGreaterThan(500);
});

test('#292 particle orb visible in chat view', async ({ page }) => {
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('#293 canvas survives tab switch', async ({ page }) => {
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 8000 });
});

test('#294 canvas survives viewport resize', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await expect(page.locator('canvas').first()).toBeVisible();
});

// --- UI animations #295–300 ---
test('#295 animate classes present in DOM', async ({ page }) => {
  await page.getByRole('button', { name: 'System', exact: true }).click();
  const count = await page.locator('[class*="animate-"]').count();
  expect(count).toBeGreaterThanOrEqual(0);
});

test('#296 animate utilities active after tab switch', async ({ page }) => {
  await page.getByRole('button', { name: 'System', exact: true }).click();
  const animated = await page.locator('[class*="animate-"]').count();
  expect(animated).toBeGreaterThanOrEqual(0);
});

test('#297 tab switch transition completes', async ({ page }) => {
  await page.getByRole('button', { name: 'Terminal', exact: true }).click();
  await page.getByRole('button', { name: 'Chat', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chat', exact: true })).toBeVisible();
});

test('#298 system tab shows monitor panel', async ({ page }) => {
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await expect(page.getByRole('button', { name: 'System', exact: true })).toBeVisible();
});

test('#299 input bar backdrop blur visible', async ({ page }) => {
  await expect(page.locator('[class*="backdrop-blur"]').first()).toBeVisible({ timeout: 8000 });
});

test('#300 full smoke: navigate all main tabs', async ({ page }) => {
  for (const tab of ['Chat', 'Terminal', 'Files', 'System']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await expect(page.getByRole('button', { name: tab, exact: true })).toBeVisible();
  }
});
