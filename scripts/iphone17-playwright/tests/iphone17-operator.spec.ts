import { test, expect, type Page } from '@playwright/test';
import { gotoTab } from '../screen-helpers';
import { PIN } from '../device-profile';

test.beforeEach(async ({ page }, testInfo) => {
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 8000 });
    await expect(page.getByTestId('view-tab-chat')).toBeVisible({ timeout: 15000 });
  } catch {
    testInfo.skip(true, 'Server offline on :3322');
  }
});

async function openOrCreateTextFile(page: Page) {
  await gotoTab(page, 'Files');
  await expect(page.getByPlaceholder(/Search in folder/i)).toBeVisible({ timeout: 12000 });
  await expect(page.getByText(/Loading file tree/i)).toHaveCount(0, { timeout: 15000 });

  const fileEditor = page.getByPlaceholder('Empty file content...');

  // Always create a disposable temp file — never overwrite docs (e.g. IPHONE17_AIR_PROMPT.md)
  page.once('dialog', (dialog) => {
    void dialog.accept().catch(() => {});
  });
  await page.getByRole('button', { name: /New File/i }).click();
  const nameInput = page.getByPlaceholder(/Enter new file name/i);
  await expect(nameInput).toBeVisible({ timeout: 5000 });
  const fileName = `pw-e2e-temp-${Date.now()}.txt`;
  await nameInput.fill(fileName);
  await page.getByRole('button', { name: /^Create$/i }).click();
  await expect(page.locator('.cursor-pointer').filter({ hasText: fileName })).toBeVisible({
    timeout: 12000,
  });
  await page.locator('.cursor-pointer').filter({ hasText: fileName }).first().click();
  await expect(fileEditor).toBeVisible({ timeout: 12000 });
  return fileEditor;
}

test('#321 Files: open or create editable text file', async ({ page }) => {
  await openOrCreateTextFile(page);
  await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible({ timeout: 12000 });
});

test('#322 Files: editor textarea visible with content area', async ({ page }) => {
  const editor = await openOrCreateTextFile(page);
  await expect(editor).toBeVisible({ timeout: 12000 });
});

test('#323 Files: edit and Save Changes roundtrip', async ({ page }) => {
  const editor = await openOrCreateTextFile(page);
  await expect(editor).toBeVisible({ timeout: 12000 });
  const marker = `pw-e2e-${Date.now()}`;
  await editor.fill(`# Playwright save test\n${marker}\n`);
  const saveBtn = page.getByRole('button', { name: /Save Changes/i });
  await expect(saveBtn).toBeVisible({ timeout: 10000 });

  let dialogMessage = '';
  page.once('dialog', (dialog) => {
    dialogMessage = dialog.message();
    void dialog.accept().catch(() => {});
  });
  await saveBtn.click();
  await expect
    .poll(() => dialogMessage, { timeout: 10000 })
    .toMatch(/saved successfully/i);
  await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible({ timeout: 10000 });
});

test('#324 mode chip cycles to shell $', async ({ page }) => {
  await gotoTab(page, 'Chat');
  const chip = page.getByTitle(/Prepni režim/i);
  await expect(chip).toBeVisible();
  // AI → $ → /
  await chip.click();
  await expect(chip).toHaveText('$');
});

async function waitForShellSession(page: Page) {
  await gotoTab(page, 'Terminal');
  await expect(page.getByText(/Initializing interactive shell/i)).toHaveCount(0, {
    timeout: 20000,
  });
  await expect(
    page.getByText(/Nexify Interactive Shell|Terminal|\$/i).first()
  ).toBeVisible({ timeout: 10000 });
  await gotoTab(page, 'Chat');
}

test('#325 $ chip shell echo runs command pipeline', async ({ page }) => {
  await waitForShellSession(page);
  const chip = page.getByTitle(/Prepni režim/i);
  await chip.click(); // AI → $
  await expect(chip).toHaveText('$');
  const input = page.getByLabel('Správa');
  await input.click();
  await input.fill('$ echo nexify-e2e');
  await input.press('Enter');
  await expect(
    page.getByText(/\$ echo nexify-e2e|nexify-e2e/i).first()
  ).toBeVisible({ timeout: 20000 });
});
test('#326 voice hold inserts transcript without auto-send', async ({ page }) => {
  await gotoTab(page, 'Chat');
  await page.evaluate(() => {
    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = 'sk-SK';
      onresult: ((ev: any) => void) | null = null;
      onerror: ((ev: any) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          const result: any = [{ transcript: 'hlasovy test nexify' }];
          result.isFinal = true;
          result.length = 1;
          this.onresult?.({
            resultIndex: 0,
            results: Object.assign([result], { length: 1 }),
          });
        }, 40);
      }
      stop() {
        this.onend?.();
      }
      abort() {
        this.onend?.();
      }
    }
    (window as any).webkitSpeechRecognition = MockSpeechRecognition;
    (window as any).SpeechRecognition = MockSpeechRecognition;
  });

  const input = page.getByLabel('Správa');
  const before = await input.inputValue();
  const mic = page.getByLabel('Drž pre hlasový vstup');
  const box = await mic.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  await expect(input).toHaveValue(/hlasovy test nexify/i, { timeout: 5000 });
  // No auto-send: value stays in input (not cleared by send)
  await page.waitForTimeout(400);
  const after = await input.inputValue();
  expect(after).toMatch(/hlasovy test nexify/i);
  expect(after.length).toBeGreaterThan(before.length);
});

test('#327 export markdown redacts PIN and API keys', async ({ page }) => {
  await gotoTab(page, 'Chat');

  await page.evaluate(() => {
    const capture = async (text: string) => {
      (window as any).__nexifyExportMarkdown = text;
    };
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (payload: { text?: string }) => {
        await capture(String(payload?.text || ''));
      },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: capture,
        readText: async () => '',
      },
    });
  });

  const input = page.getByLabel('Správa');
  const chip = page.getByTitle(/Prepni režim/i);
  for (let i = 0; i < 3; i++) {
    const label = (await chip.innerText()).trim();
    if (label === 'AI') break;
    await chip.click();
  }
  await input.fill(`API_KEY=sk-leakedsecret99 PIN: ${PIN}`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);

  await input.fill('export');
  await page.keyboard.press('Enter');

  await expect
    .poll(async () => page.evaluate(() => (window as any).__nexifyExportMarkdown || ''), {
      timeout: 10000,
    })
    .toMatch(/REDACTED|# Nexify|SESSION/i);

  const captured = await page.evaluate(() => (window as any).__nexifyExportMarkdown || '');
  expect(captured).toMatch(/\[REDACTED\]/);
  expect(captured).not.toMatch(/sk-leakedsecret99/);
  expect(captured).not.toContain(PIN);
});
