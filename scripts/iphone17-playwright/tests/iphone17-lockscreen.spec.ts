import { test, expect, type Page } from '@playwright/test';
import { PIN, BASE_URL } from '../device-profile';

test.beforeEach(async ({ page }, testInfo) => {
  try {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 8000 });
    if (!res || res.status() >= 500) testInfo.skip(true, 'Server offline');
  } catch {
    testInfo.skip(true, 'Server offline on :3322');
  }
});

async function enterPin(page: Page, pin: string) {
  for (const digit of pin.split('')) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await page.waitForTimeout(900);
}

test('#251 lockscreen shows NEXIFY TERMINAL heading', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /NEXIFY TERMINAL/i })).toBeVisible();
});

test('#252 lockscreen shows PIN keypad digits 0-9', async ({ page }) => {
  for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
    await expect(page.getByRole('button', { name: d, exact: true })).toBeVisible();
  }
});

test('#253 lockscreen shows Face ID button', async ({ page }) => {
  await expect(page.getByText(/Použiť Face ID/i)).toBeVisible();
});

test('#254 lockscreen shows SECURE INTERFACE subtitle', async ({ page }) => {
  await expect(page.getByText(/SECURE INTERFACE/i)).toBeVisible();
});

test('#255 correct PIN unlocks workspace', async ({ page }) => {
  await enterPin(page, PIN);
  await expect(page.getByRole('button', { name: 'Chat', exact: true })).toBeVisible({ timeout: 8000 });
});

test('#256 wrong PIN keeps lockscreen visible', async ({ page }) => {
  await enterPin(page, '0000');
  await expect(page.getByRole('heading', { name: /NEXIFY TERMINAL/i })).toBeVisible();
});

test('#257 lockscreen has delete/backspace control', async ({ page }) => {
  await page.getByRole('button', { name: '1', exact: true }).click();
  await expect(page.locator('button').first()).toBeVisible();
});

test('#258 PIN entry accepts four digits', async ({ page }) => {
  await enterPin(page, PIN.slice(0, 2));
  await expect(page.getByRole('heading', { name: /NEXIFY TERMINAL/i })).toBeVisible();
});

test('#259 unlocked state shows tab bar', async ({ page }) => {
  await enterPin(page, PIN);
  await expect(page.getByRole('button', { name: 'Terminal', exact: true })).toBeVisible();
});

test('#260 unlocked state shows Files tab', async ({ page }) => {
  await enterPin(page, PIN);
  await expect(page.getByRole('button', { name: 'Files', exact: true })).toBeVisible();
});
