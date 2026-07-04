import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

function loadEnvLocal(key: string): string | undefined {
  for (const file of ['.env.local', '.env']) {
    const envPath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [k, ...rest] = trimmed.split('=');
      if (k.trim() === key) return rest.join('=').trim();
    }
  }
  return undefined;
}

/** iPhone 17 Air device profile — 402×874 logical px, DPR 3.0 */
export const iPhone17Air = {
  viewport: { width: 402, height: 874 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};

export const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://localhost:${process.env.WEB_PORT || process.env.NEXT_PORT || '3322'}`;

/** Must match NEXT_PUBLIC_PASSCODE baked into the Next.js client bundle. */
export const PIN =
  loadEnvLocal('NEXT_PUBLIC_PASSCODE') ||
  process.env.NEXT_PUBLIC_PASSCODE ||
  '1337';
