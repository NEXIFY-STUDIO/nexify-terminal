import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL } from './device-profile';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth/iphone17-user.json');

const desktopViewport = {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  isMobile: false,
  hasTouch: false,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    ...desktopViewport,
    locale: 'sk-SK',
    colorScheme: 'dark',
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'desktop-authenticated',
      testMatch: /button-(hit-targets|functions)\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: authFile },
    },
  ],
  reporter: [['line']],
});
