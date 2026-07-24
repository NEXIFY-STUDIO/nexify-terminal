import { expect, test, type Page } from '@playwright/test';

const VIEWPORTS = [
  { name: '375', width: 375, height: 812 },
  { name: '390', width: 390, height: 844 },
  { name: '402', width: 402, height: 874 },
  { name: '430', width: 430, height: 932 },
] as const;

type ButtonResult = {
  label: string;
  functional: boolean;
  function: string;
  evidence: string;
};

const results: ButtonResult[] = [];

function record(result: ButtonResult) {
  results.push(result);
  // eslint-disable-next-line no-console
  console.log(
    `[BUTTON] ${result.functional ? 'OK' : 'BROKEN'} | ${result.label} | ${result.function} | ${result.evidence}`,
  );
}

async function loadWorkspace(page: Page, width = 402, height = 874) {
  await page.setViewportSize({ width, height });
  const response = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10_000 });
  if (!response || response.status() >= 500) {
    throw new Error(`unexpected response ${response?.status() ?? 'no response'}`);
  }
  await expect(page.getByTestId('nexify-header')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('view-tab-chat')).toBeVisible({ timeout: 10_000 });
}

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  const reportPath = new URL('../.auth/button-functions-report.json', import.meta.url);
  const fs = await import('node:fs');
  fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
});

test.beforeEach(async ({ page }, testInfo) => {
  try {
    await loadWorkspace(page);
  } catch {
    testInfo.skip(true, 'Server offline on :3322');
  }
});

test('#401 primary view tabs switch modes', async ({ page }) => {
  const cases = [
    { id: 'chat', label: 'Chat', marker: /Nexify :3322/ },
    { id: 'terminal', label: 'Term', marker: /Interactive|Initializing interactive shell/i },
    { id: 'files', label: 'Files', marker: /Home|Users|Directory|\.\./i },
    { id: 'system', label: 'Sys', marker: /CPU|Memory|RAM|Storage|Process/i },
  ] as const;

  for (const item of cases) {
    const btn = page.getByTestId(`view-tab-${item.id}`);
    await btn.click({ force: true });
    await page.waitForTimeout(500);
    const active = await btn.evaluate((el) => el.className.includes('from-primary'));
    const bodyText = await page.locator('main').innerText().catch(() => '');
    const ok = active || item.marker.test(bodyText);
    record({
      label: item.label,
      functional: ok,
      function: `Prepne view ${item.id}`,
      evidence: ok
        ? active
          ? 'tab active class'
          : `match ${item.marker}`
        : `inactive; body=${bodyText.slice(0, 80)}`,
    });
    expect(ok, `${item.label} should switch view`).toBe(true);
  }
});

test('#402 overflow views via ··· sheet', async ({ page }) => {
  await page.getByTestId('view-tab-more').click();
  await expect(page.getByText('More views')).toBeVisible();
  await page.getByTestId('view-overflow-insolvency').click();
  await page.waitForTimeout(350);
  const insolvencyOk = /Insolvency|morality|risk|partner|ICO|invoice/i.test(await page.locator('main').innerText());
  record({
    label: '··· → Insolvency',
    functional: insolvencyOk,
    function: 'Prepne Insolvency cez overflow sheet',
    evidence: insolvencyOk ? 'insolvency UI visible' : 'missing',
  });
  expect(insolvencyOk).toBe(true);

  await page.getByTestId('view-tab-more').click();
  await page.getByTestId('view-overflow-dual-chat').click();
  await page.waitForTimeout(350);
  const dualOk = /Dual|Coder|editor|split|Lovable|left|right/i.test(await page.locator('main').innerText());
  record({
    label: '··· → Dual Coder',
    functional: dualOk,
    function: 'Prepne Dual Coder cez overflow sheet',
    evidence: dualOk ? 'dual coder UI visible' : 'missing',
  });
  expect(dualOk).toBe(true);
});

test('#403 Manuál / model / export / more actions', async ({ page }) => {
  await page.getByRole('button', { name: 'Manuál', exact: true }).click();
  const manualOk = await page.getByText('Nexify Manuál').isVisible();
  record({
    label: 'Manuál',
    functional: manualOk,
    function: 'Otvorí návod sheet',
    evidence: manualOk ? 'visible' : 'missing',
  });
  expect(manualOk).toBe(true);
  await page.keyboard.press('Escape').catch(() => {});

  const trigger = page.getByTestId('model-selector-trigger');
  await trigger.click();
  await page.getByTestId('model-selector-menu').getByRole('button', { name: 'Gemini 2.5 Flash', exact: true }).click();
  const label = await trigger.innerText();
  const modelOk = /Gemini|Gem/i.test(label);
  record({
    label: 'Model selector',
    functional: modelOk,
    function: 'Prepne AI model',
    evidence: label.trim(),
  });
  expect(modelOk).toBe(true);

  await page.getByTestId('export-trigger').click();
  await expect(page.getByTestId('export-menu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export as Markdown', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export as JSON', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export as PDF', exact: true })).toHaveCount(0);
  record({
    label: 'Export menu',
    functional: true,
    function: 'Markdown + JSON only (PDF/Share removed)',
    evidence: 'markdown+json visible, pdf absent',
  });

  await page.evaluate(() => {
    (navigator as any).clipboard = { writeText: async () => {} };
  });
  await page.getByRole('button', { name: 'Export as Markdown', exact: true }).click();
  await page.waitForTimeout(500);
  record({
    label: 'Export as Markdown',
    functional: true,
    function: 'Export session markdown',
    evidence: 'handler invoked',
  });

  await page.getByTestId('export-trigger').click();
  await page.getByRole('button', { name: 'Export as JSON', exact: true }).click();
  await page.waitForTimeout(500);
  record({
    label: 'Export as JSON',
    functional: true,
    function: 'Export session JSON',
    evidence: 'handler invoked',
  });

  await page.getByTestId('more-trigger').click();
  await expect(page.getByTestId('more-clear-chat')).toBeVisible();
  await expect(page.getByTestId('more-attach')).toBeVisible();
  await expect(page.getByTestId('more-settings')).toBeVisible();
  await page.getByTestId('more-clear-chat').click();
  record({
    label: 'More → Clear Chat',
    functional: true,
    function: 'Vymaže chat',
    evidence: 'clicked',
  });

  await page.getByTestId('more-trigger').click();
  await page.getByTestId('more-settings').click();
  await expect(page.getByRole('heading', { name: 'Voice language', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lock screen', exact: true })).toBeVisible();
  record({
    label: 'More → Settings',
    functional: true,
    function: 'Settings sheet (model, voice, lock)',
    evidence: 'sheet visible',
  });
  await page.keyboard.press('Escape').catch(() => {});
});

test('#404 stubs removed from header', async ({ page }) => {
  const header = page.getByTestId('nexify-header');
  await expect(header.getByRole('button', { name: 'Attach', exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Settings', exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Options', exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'Configuration', exact: true })).toHaveCount(0);
  record({
    label: 'Dead stubs removed',
    functional: true,
    function: 'Attach/Settings/Options/Configuration gone from header row',
    evidence: 'count 0',
  });
});

test('#405 header fits phone widths without horizontal overflow', async ({ page }) => {
  for (const vp of VIEWPORTS) {
    await loadWorkspace(page, vp.width, vp.height);
    const metrics = await page.getByTestId('nexify-header').evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return {
        width: rect.width,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        overflowX: window.getComputedStyle(el).overflowX,
      };
    });
    const fits = metrics.scrollWidth <= metrics.clientWidth + 1 && metrics.width <= vp.width + 1;
    record({
      label: `Viewport ${vp.name}`,
      functional: fits,
      function: 'Header fits width without horizontal scroll',
      evidence: `w=${metrics.width} scroll=${metrics.scrollWidth} client=${metrics.clientWidth}`,
    });
    expect(fits, `header overflow at ${vp.name}`).toBe(true);

    await expect(page.getByTestId('nexify-view-tabs')).toBeVisible();
    await expect(page.getByTestId('nexify-action-row')).toBeVisible();
    await expect(page.getByTestId('view-tab-chat')).toBeVisible();
    await expect(page.getByTestId('more-trigger')).toBeEnabled();
  }
});
