import { expect, type Page } from '@playwright/test';

export type TabName =
  | 'Chat'
  | 'Terminal'
  | 'Files'
  | 'System'
  | 'Insolvency'
  | 'Dual Coder';

export const ALL_TABS: TabName[] = [
  'Chat',
  'Terminal',
  'Files',
  'System',
  'Insolvency',
  'Dual Coder',
];

const PRIMARY_TAB_TESTIDS: Partial<Record<TabName, string>> = {
  Chat: 'view-tab-chat',
  Terminal: 'view-tab-terminal',
  Files: 'view-tab-files',
  System: 'view-tab-system',
};

const OVERFLOW_TAB_TESTIDS: Partial<Record<TabName, string>> = {
  Insolvency: 'view-overflow-insolvency',
  'Dual Coder': 'view-overflow-dual-chat',
};

export async function gotoTab(page: Page, name: TabName) {
  const primaryId = PRIMARY_TAB_TESTIDS[name];
  if (primaryId) {
    const btn = page.getByTestId(primaryId);
    await expect(btn).toBeVisible({ timeout: 15000 });
    await btn.click({ force: true });
    return;
  }

  const overflowId = OVERFLOW_TAB_TESTIDS[name];
  if (!overflowId) throw new Error(`Unknown tab ${name}`);
  const more = page.getByTestId('view-tab-more');
  await expect(more).toBeVisible({ timeout: 15000 });
  await more.click({ force: true });
  await expect(page.getByText('More views')).toBeVisible({ timeout: 8000 });
  const item = page.locator(`[data-testid="${overflowId}"]:visible`).first();
  await expect(item).toBeVisible({ timeout: 8000 });
  await item.evaluate((el: HTMLElement) => el.click());
}

export async function assertNoDocumentScroll(page: Page) {
  const scroll = await page.evaluate(() => ({
    y: window.scrollY,
    x: window.scrollX,
  }));
  expect(scroll.y).toBe(0);
  expect(scroll.x).toBe(0);
}

export function assertInViewport(
  box: { x: number; y: number; width: number; height: number } | null,
  vw: number,
  vh: number,
  pad = 2
) {
  expect(box).toBeTruthy();
  expect(box!.x).toBeGreaterThanOrEqual(-pad);
  expect(box!.y).toBeGreaterThanOrEqual(-pad);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vw + pad);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vh + pad);
}

/** Resolve a non-interactive long-press target (not button/input). */
async function longPressPoint(page: Page): Promise<{ x: number; y: number }> {
  const point = await page.evaluate(() => {
    const el =
      document.querySelector('.operator-status') ??
      document.querySelector('[data-copyable-text]') ??
      document.querySelector('main') ??
      document.body;
    const rect = el.getBoundingClientRect();
    return {
      x: Math.min(Math.max(rect.left + rect.width / 2, 20), window.innerWidth - 20),
      y: Math.min(Math.max(rect.top + Math.min(rect.height / 2, 40), 80), window.innerHeight - 80),
    };
  });
  return point;
}

/** CDP touch long-press so document touch listeners receive real touches[]. */
export async function openLongPressContextMenu(page: Page) {
  const { x, y } = await longPressPoint(page);
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  await page.waitForTimeout(2200);
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
}

/** Open paste fallback by disabling clipboard + long-press → Vložiť. */
export async function openPasteFallbackDialog(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  });

  await openLongPressContextMenu(page);
  await expect(page.locator('#custom-ios-context-menu')).toBeVisible({ timeout: 8000 });
  await page.locator('#custom-ios-context-menu').getByRole('button', { name: 'Vložiť' }).click();
}
