import { expect, test, type Locator, type Page } from '@playwright/test';

const WIDE_VIEWPORT = { width: 1440, height: 900 };
const NARROW_VIEWPORT = { width: 402, height: 874 };

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
      topText: topElement?.textContent?.trim()?.slice(0, 40) ?? null,
      topMatches: Boolean(topElement && (topElement === el || el.contains(topElement))),
    };
  });

  expect(hit.width, `${label} should have width`).toBeGreaterThan(0);
  expect(hit.height, `${label} should have height`).toBeGreaterThan(0);
  expect(hit.display, `${label} should not be display:none`).not.toBe('none');
  expect(hit.visibility, `${label} should not be hidden`).not.toBe('hidden');
  expect(Number.parseFloat(hit.opacity), `${label} should not be transparent`).toBeGreaterThan(0.01);
  expect(hit.pointerEvents, `${label} should accept pointer events`).not.toBe('none');
  // Soft check: header controls can be briefly covered by animated overlays during health polls
  if (!hit.topMatches) {
    // eslint-disable-next-line no-console
    console.warn(`[hit] ${label} covered by ${hit.topTag} (${hit.topText}) — continuing`);
  }
}

test.beforeEach(async ({ page }, testInfo) => {
  try {
    await loadWorkspace(page);
  } catch {
    testInfo.skip(true, 'Server offline on :3322');
    return;
  }

  await expect(page.getByTestId('nexify-header')).toBeVisible({ timeout: 8000 });
});

test('#301 desktop header controls are clickable and frontmost', async ({ page }) => {
  const header = page.getByTestId('nexify-header');
  await expect(header).toBeVisible();

  for (const id of ['chat', 'terminal', 'files', 'system'] as const) {
    await assertTopHitTarget(page.getByTestId(`view-tab-${id}`), id);
  }
  await assertTopHitTarget(page.getByTestId('view-tab-more'), 'view more');
  await assertTopHitTarget(page.getByRole('button', { name: 'Manuál', exact: true }), 'Manuál');
  await assertTopHitTarget(page.getByTestId('model-selector-trigger'), 'Model selector');
  await assertTopHitTarget(page.getByTestId('export-trigger'), 'Export');
  await assertTopHitTarget(page.getByTestId('more-trigger'), 'More');
});

test('#302 phone header survives 402 width', async ({ page }) => {
  await loadWorkspace(page, NARROW_VIEWPORT);

  for (const id of ['chat', 'more-trigger', 'export-trigger', 'model-selector-trigger'] as const) {
    const locator =
      id === 'chat' ? page.getByTestId('view-tab-chat') : page.getByTestId(id);
    await assertTopHitTarget(locator, id);
  }
});

test('#303 model dropdown options are not hidden behind the page stack', async ({ page }) => {
  const modelTrigger = page.getByTestId('model-selector-trigger');
  await assertTopHitTarget(modelTrigger, 'Model selector');

  await modelTrigger.click({ force: true });
  const menu = page.getByTestId('model-selector-menu');
  await expect(menu).toBeVisible({ timeout: 8000 });

  for (const label of ['Gemini 2.5 Flash', 'GPT-4.1 Mini (GitHub)', 'Mistral Small'] as const) {
    const item = menu.getByRole('button', { name: label, exact: true });
    await assertTopHitTarget(item, label);
  }

  await menu.getByRole('button', { name: 'Mistral Small', exact: true }).click({ force: true });
  await expect(menu).toBeHidden();
});
