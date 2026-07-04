import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '../..');

export function readSource(relativePath) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing file: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

export function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT_DIR, relativePath));
}

/** Build numbered tests from regex assertions against one file. */
export function patternTests(startId, relativePath, label, assertions) {
  return assertions.map((a, i) => ({
    id: startId + i,
    name: `${label}: ${a.name}`,
    run() {
      const content = readSource(relativePath);
      if (a.pattern.test(content)) return { ok: true };
      return { ok: false, error: `Pattern not found in ${relativePath}: ${a.name}` };
    },
  }));
}

/** Build numbered tests that check file existence. */
export function existsTests(startId, paths, labelPrefix) {
  return paths.map((p, i) => ({
    id: startId + i,
    name: `${labelPrefix}: ${p} exists`,
    run() {
      return fileExists(p) ? { ok: true } : { ok: false, error: `Missing ${p}` };
    },
  }));
}

/** Single mock/logic test. */
export function mockTest(id, name, fn) {
  return {
    id,
    name,
    run() {
      try {
        const result = fn();
        if (result === true || result?.ok === true) return { ok: true };
        return { ok: false, error: result?.error || 'Mock assertion failed' };
      } catch (err) {
        return { ok: false, error: err.message };
      }
    },
  };
}

export async function runModule(mod) {
  let passed = 0;
  let failed = 0;
  const failures = [];

  console.log(`\n--- ${mod.name} (${mod.tests.length} tests) ---`);

  for (const test of mod.tests) {
    const idStr = String(test.id).padStart(3, '0');
    const result = test.run();
    if (result.ok) {
      passed++;
    } else {
      failed++;
      failures.push({ id: test.id, name: test.name, error: result.error });
      console.error(`  #${idStr} FAIL: ${test.name} — ${result.error}`);
    }
  }

  if (failed === 0) {
    console.log(`  ${passed}/${mod.tests.length} passed`);
  }

  return { passed, failed, failures, total: mod.tests.length };
}

export function padId(n) {
  return String(n).padStart(3, '0');
}
