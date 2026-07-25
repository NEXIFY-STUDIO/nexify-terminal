import { defineConfig } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_URL, iPhone17Air } from './device-profile';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth/iphone17-user.json');

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    ...iPhone17Air,
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
      name: 'lockscreen',
      testMatch: /iphone17-lockscreen\.spec\.ts/,
    },
    {
      name: 'authenticated',
      testMatch: /iphone17-(authenticated|screens|operator)\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: authFile },
    },
  ],
  reporter: [['line']],
});
