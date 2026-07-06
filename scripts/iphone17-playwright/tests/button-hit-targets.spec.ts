import { expect, test, type Locator, type Page } from '@playwright/test';

const WIDE_VIEWPORT = { width: 1440, height: 900 };
const NARROW_VIEWPORT = { width: 1180, height: 900 };

const toolbarButtons = [
  'Chat',
  'Terminal',
  'Files',
  'System',
  'Insolvency',
  'Dual Coder',
  'Manuál',
  'Configuration',
  'Export',
  'Attach',
  'Settings',
  'Options',
] as const;

async function loadWorkspace(page: Page, viewport = WIDE_VIEWPORT) {
  await page.setViewportSize(viewport);
  const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 8000 });
  if (!response || response.status() >= 500) {
    throw new Error(`unexpected response ${response?.status() ?? 'no response'}`);
  }
}

async function assertTopHitTarget(locator: Locator, label: string) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  await expect(locator, `${label} should be enabled`).toBeEnabled();
  await locator.click({ trial: true, timeout: 5000 });

  const hit = await locator.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const topElement = document.elementFromPoint(centerX, centerY);

    return {
      width: rect.width,
      height: rect.height,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      pointerEvents: style.pointerEvents,
      topTag: topElement?.tagName ?? null,
      topText: topElement?.textContent?.trim() ?? null,
      topMatches: Boolean(topElement && (topElement === el || el.contains(topElement))),
    };
  });

  expect(hit.width, `${label} should have width`).toBeGreaterThan(0);
  expect(hit.height, `${label} should have height`).toBeGreaterThan(0);
  expect(hit.display, `${label} should not be display:none`).not.toBe('none');
  expect(hit.visibility, `${label} should not be hidden`).not.toBe('hidden');
  expect(Number.parseFloat(hit.opacity), `${label} should not be transparent`).toBeGreaterThan(0.01);
  expect(hit.pointerEvents, `${label} should accept pointer events`).not.toBe('none');
  expect(hit.topMatches, `${label} is covered by ${hit.topTag ?? 'nothing'}${hit.topText ? ` (${hit.topText})` : ''}`).toBe(true);
}

test.beforeEach(async ({ page }, testInfo) => {
  try {
    await loadWorkspace(page);
  } catch {
    testInfo.skip(true, 'Server offline on :3322');
    return;
  }

  await expect(page.getByRole('button', { name: 'Chat', exact: true })).toBeVisible({ timeout: 8000 });
});

test('#301 desktop header controls are clickable and frontmost', async ({ page }) => {
  const header = page.locator('header').first();
  await expect(header).toBeVisible();

  for (const label of toolbarButtons) {
    const locator = page.locator('header').getByRole('button', { name: label, exact: true }).first();
    await assertTopHitTarget(locator, label);
  }

  await assertTopHitTarget(page.getByTestId('model-selector-trigger'), 'Model selector');
  await assertTopHitTarget(page.getByRole('button', { name: 'LOCK', exact: true }), 'LOCK');
});

test('#302 desktop header survives a narrower desktop width', async ({ page }) => {
  await loadWorkspace(page, NARROW_VIEWPORT);

  for (const label of ['Chat', 'Manuál', 'Configuration', 'Export', 'LOCK'] as const) {
    const locator =
      label === 'LOCK'
        ? page.getByRole('button', { name: label, exact: true })
        : page.locator('header').getByRole('button', { name: label, exact: true }).first();
    await assertTopHitTarget(locator, label);
  }

  await assertTopHitTarget(page.getByTestId('model-selector-trigger'), 'Model selector');
});

test('#303 model dropdown options are not hidden behind the page stack', async ({ page }) => {
  const modelTrigger = page.getByTestId('model-selector-trigger');
  await assertTopHitTarget(modelTrigger, 'Model selector');

  await modelTrigger.click();
  const menu = page.getByTestId('model-selector-menu');
  await expect(menu).toBeVisible();

  for (const label of ['Gemini 2.5 Flash', 'GPT-4.1 Mini (GitHub)', 'Mistral Small'] as const) {
    const item = menu.getByRole('button', { name: label, exact: true });
    await assertTopHitTarget(item, label);
  }

  await menu.getByRole('button', { name: 'Mistral Small', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(page.locator('header').getByRole('button', { name: 'Mistral Small', exact: true }).first()).toBeVisible();
});
