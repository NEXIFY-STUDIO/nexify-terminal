import { test, expect } from '@playwright/test';
import {
  ALL_TABS,
  assertInViewport,
  assertNoDocumentScroll,
  gotoTab,
  openLongPressContextMenu,
  openPasteFallbackDialog,
  type TabName,
} from '../screen-helpers';

test.beforeEach(async ({ page }, testInfo) => {
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 8000 });
  } catch {
    testInfo.skip(true, 'Server offline on :3322');
  }
});

const PANEL_MARKERS: Record<TabName, RegExp> = {
  Chat: /Správa|Nexify|chat/i,
  Terminal: /Nexify Interactive Shell/i,
  Files: /Search in folder|Home|\.agents/i,
  System: /CPU Usage/i,
  Insolvency: /Tracked Companies|Insolvency Predictor|GOLD TAXI/i,
  'Dual Coder': /Vibe Coder/i,
};

// --- #301–#306: each tab panel + header + no document scroll ---
for (const [i, tab] of ALL_TABS.entries()) {
  const id = 301 + i;
  test(`#${id} ${tab}: panel visible, header in bounds, no document scroll`, async ({ page }) => {
    await gotoTab(page, tab);
    await expect(page.getByText(PANEL_MARKERS[tab]).first()).toBeVisible({ timeout: 8000 });
    const header = page.locator('header').first();
    const box = await header.boundingBox();
    const { vw, vh } = await page.evaluate(() => ({
      vw: window.innerWidth,
      vh: window.innerHeight,
    }));
    assertInViewport(box, vw, vh);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    await assertNoDocumentScroll(page);
  });
}

test('#307 Files: search input focusable and list area visible', async ({ page }) => {
  await gotoTab(page, 'Files');
  const search = page.getByRole('textbox', { name: /Search in folder/i });
  await expect(search).toBeVisible({ timeout: 12000 });
  await search.click();
  await expect(search).toBeFocused();
  await expect(page.getByText(/Home|\.agents|Files Explorer/i).first()).toBeVisible({ timeout: 8000 });
});

test('#308 Insolvency: partners search box visible', async ({ page }) => {
  await gotoTab(page, 'Insolvency');
  await expect(page.getByRole('textbox', { name: /Search partners/i })).toBeVisible({ timeout: 12000 });
});

test('#309 Dual Coder: Vibe Coder and Gemini Coder labels', async ({ page }) => {
  await gotoTab(page, 'Dual Coder');
  await expect(page.getByText(/Vibe Coder/i)).toBeVisible({ timeout: 8000 });
  await expect(page.getByText(/Gemini Coder/i)).toBeVisible({ timeout: 8000 });
});

test('#310 Terminal: shell chrome visible, scroll locked, xterm fitted', async ({ page }) => {
  await gotoTab(page, 'Chat');
  await gotoTab(page, 'Terminal');
  await expect(page.getByText(/Nexify Interactive Shell/i)).toBeVisible({ timeout: 8000 });
  await assertNoDocumentScroll(page);
  const screen = page.locator('.xterm-screen').first();
  await expect(screen).toBeVisible({ timeout: 10000 });
  const box = await screen.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeGreaterThan(80);
  expect(box!.height).toBeGreaterThan(40);
});

// --- #311–#316: per-tab header controls within viewport height ---
for (const [i, tab] of ALL_TABS.entries()) {
  const id = 311 + i;
  test(`#${id} ${tab}: header stays within viewport bottom`, async ({ page }) => {
    await gotoTab(page, tab);
    const vh = await page.evaluate(() => window.innerHeight);
    const box = await page.getByTestId('nexify-header').boundingBox();
    expect(box).toBeTruthy();
    expect(box!.y + box!.height).toBeLessThanOrEqual(vh + 2);
  });
}

test('#317 primary view tabs meet HIG min 44px hit targets', async ({ page }) => {
  for (const id of ['view-tab-chat', 'view-tab-terminal', 'view-tab-files', 'view-tab-system', 'view-tab-more']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(Math.min(box!.width, box!.height)).toBeGreaterThanOrEqual(40);
  }
});

test('#318 long-press opens custom iOS context menu', async ({ page }) => {
  await gotoTab(page, 'Chat');
  await openLongPressContextMenu(page);
  await expect(page.locator('#custom-ios-context-menu')).toBeVisible({ timeout: 6000 });
  await expect(page.locator('#custom-ios-context-menu').getByRole('button', { name: 'Vložiť' })).toBeVisible();
});

test('#319 paste fallback dialog opens when clipboard unavailable', async ({ page }) => {
  await gotoTab(page, 'Chat');
  await openPasteFallbackDialog(page);
  await expect(page.getByText(/Vložiť text \(PWA Fallback\)/i)).toBeVisible({ timeout: 5000 });
});

test('#320 paste fallback dialog accepts manual text and closes', async ({ page }) => {
  await gotoTab(page, 'Chat');
  await openPasteFallbackDialog(page);
  const dialogTextarea = page.locator('textarea[placeholder*="Sem vložte"]');
  await expect(dialogTextarea).toBeVisible();
  await dialogTextarea.fill('Playwright screen paste');
  await page
    .locator('div')
    .filter({ has: page.getByText(/Vložiť text \(PWA Fallback\)/i) })
    .getByRole('button', { name: 'Vložiť', exact: true })
    .click();
  await expect(page.getByText(/Vložiť text \(PWA Fallback\)/i)).not.toBeVisible();
});
