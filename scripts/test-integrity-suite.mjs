import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const filesToTest = {
  chatArea: path.join(rootDir, 'components/chat-area.tsx'),
  fileExplorer: path.join(rootDir, 'components/file-explorer.tsx'),
  page: path.join(rootDir, 'app/page.tsx'),
  layout: path.join(rootDir, 'app/layout.tsx'),
  apiFiles: path.join(rootDir, 'app/api/files/route.ts'),
  apiAuthChallenge: path.join(rootDir, 'app/api/auth/challenge/route.ts'),
  middleware: path.join(rootDir, 'middleware.ts'),
  cookieSecurity: path.join(rootDir, 'lib/security/cookieSecurity.ts'),
  rateLimiter: path.join(rootDir, 'lib/security/rateLimiter.ts'),
  packageJson: path.join(rootDir, 'package.json'),
  nextConfig: path.join(rootDir, 'next.config.mjs'),
};

console.log('🔍 Running Master Integrity Test Suite (61 Assertions)...\n');

let failed = 0;
let passed = 0;

function runAssertions(targetName, filePath, assertions) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file for testing: ${targetName} (${filePath})`);
    failed += assertions.length;
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  
  assertions.forEach((assertion) => {
    if (assertion.pattern.test(content)) {
      passed++;
    } else {
      console.error(`❌ Failed [${targetName}]: ${assertion.name} (Pattern: ${assertion.pattern})`);
      failed++;
    }
  });
}

const assertionsList = [
  {
    target: 'chatArea',
    path: filesToTest.chatArea,
    assertions: [
      { name: '1. ChatArea component export', pattern: /export\s+(default\s+)?function\s+ChatArea/ },
      { name: '2. Messages mapping', pattern: /messages\.find/ },
      { name: '3. Input submission handler', pattern: /handleSend/ },
      { name: '4. Textarea reference', pattern: /textareaRef/ },
      { name: '5. Button component presence', pattern: /<Button/ },
      { name: '6. Message state hook', pattern: /useState</ },
      { name: '7. Auto-scroll ref hook', pattern: /useRef</ },
      { name: '8. Lucide icon (Terminal)', pattern: /<Terminal/ },
      { name: '9. Tailwind bg-background', pattern: /bg-background/ },
      { name: '10. API route fetch call', pattern: /fetch\(['"`]\/api\// },
      { name: '10b. In-app Manuál button', pattern: /NexifyManualSheet/ }
    ]
  },
  {
    target: 'fileExplorer',
    path: filesToTest.fileExplorer,
    assertions: [
      { name: '11. FileExplorer export', pattern: /export\s+(default\s+)?function\s+FileExplorer/ },
      { name: '12. API fetch for files', pattern: /fetch\(['"`]\/api\/files/ },
      { name: '13. handleFolderClick method', pattern: /handleFolderClick/ },
      { name: '14. handleSaveFile method', pattern: /handleSaveFile/ },
      { name: '15. handleDelete method', pattern: /handleDelete/ },
      { name: '16. FolderIcon presence', pattern: /Folder/ },
      { name: '17. FileIcon presence', pattern: /File/ },
      { name: '18. Active file state', pattern: /activeFile/ },
      { name: '19. Content editing textarea', pattern: /<textarea/ },
      { name: '20. Image preview tag', pattern: /<img/ }
    ]
  },
  {
    target: 'page',
    path: filesToTest.page,
    assertions: [
      { name: '21. Main landing export', pattern: /export\s+default\s+function/ },
      { name: '22. Global layout class', pattern: /h-dvh/ },
      { name: '23. Tailwind hidden overflow', pattern: /overflow-hidden/ },
      { name: '24. ChatArea inclusion', pattern: /<ChatArea/ },
      { name: '25. Sidebar inclusion', pattern: /<Sidebar/ }
    ]
  },
  {
    target: 'layout',
    path: filesToTest.layout,
    assertions: [
      { name: '26. RootLayout export', pattern: /export\s+default\s+function\s+RootLayout/ },
      { name: '27. Html lang attribute', pattern: /<html\s+lang/ },
      { name: '28. Body tag', pattern: /<body/ },
      { name: '29. Children prop typing', pattern: /children:\s*React\.ReactNode/ },
      { name: '30. Metadata export', pattern: /export\s+(const|let|var)\s+metadata/ }
    ]
  },
  {
    target: 'apiFiles',
    path: filesToTest.apiFiles,
    assertions: [
      { name: '31. POST handler export', pattern: /export\s+async\s+function\s+POST/ },
      { name: '32. GET handler export', pattern: /export\s+async\s+function\s+GET/ },
      { name: '33. fs.promises usage', pattern: /node:fs\/promises/ },
      { name: '34. Path traversal protection helper', pattern: /getSafePath/ },
      { name: '35. Read action implementation', pattern: /case\s*['"`]read['"`]/ },
      { name: '36. Write action implementation', pattern: /case\s*['"`]write['"`]/ },
      { name: '37. Delete action implementation', pattern: /case\s*['"`]delete['"`]/ }
    ]
  },
  {
    target: 'apiAuthChallenge',
    path: filesToTest.apiAuthChallenge,
    assertions: [
      { name: '38. WebAuthn challenge endpoint', pattern: /export\s+async\s+function\s+(GET|POST)/ },
      { name: '39. NextResponse usage', pattern: /NextResponse\.json/ },
      { name: '40. Crypto challenge generation', pattern: /crypto\.randomBytes/ }
    ]
  },
  {
    target: 'middleware',
    path: filesToTest.middleware,
    assertions: [
      { name: '41. Middleware function export', pattern: /export\s+function\s+middleware/ },
      { name: '42. NextResponse.next call', pattern: /NextResponse\.next\(\)/ },
      { name: '43. Tailscale lockdown logic', pattern: /tailscaleAllowedIp/i },
      { name: '44. Tailscale IP auto-allow prefix (100.)', pattern: /100\./ },
      { name: '45. Security headers enforcement', pattern: /getSecurityHeaders/ },
      { name: '46. X-Frame-Options config', pattern: /X-Frame-Options/ },
      { name: '47. X-Content-Type-Options config', pattern: /X-Content-Type-Options/ },
      { name: '48. API Rate Limiter integration', pattern: /apiRateLimiter/ },
      { name: '49. Rate Limit Headers', pattern: /X-RateLimit-/ },
      { name: '50. Middleware config matcher', pattern: /export\s+const\s+config\s*=\s*\{\s*matcher/ }
    ]
  },
  {
    target: 'cookieSecurity',
    path: filesToTest.cookieSecurity,
    assertions: [
      { name: '51. Secure cookie options defaults', pattern: /DEFAULT_SECURE_COOKIE_OPTIONS/ },
      { name: '52. SameSite attribute restriction', pattern: /sameSite:\s*['"`](Lax|Strict)['"`]/i },
      { name: '53. supportsSecureCookies check', pattern: /export\s+function\s+supportsSecureCookies/ },
      { name: '54. localhost OR tailscale exception', pattern: /protocol\.includes\(['"`]100\.['"`]\)/ }
    ]
  },
  {
    target: 'rateLimiter',
    path: filesToTest.rateLimiter,
    assertions: [
      { name: '55. RateLimiter class structure', pattern: /class\s+RateLimiter/ },
      { name: '56. getClientIp extraction', pattern: /export\s+function\s+getClientIp/ }
    ]
  },
  {
    target: 'packageJson',
    path: filesToTest.packageJson,
    assertions: [
      { name: '57. Next.js dependency', pattern: /"next":/ },
      { name: '58. Dev script binds to 0.0.0.0', pattern: /"dev":\s*"next\s+dev\s+-p\s+3322\s+-H\s+0\.0\.0\.0"/ }
    ]
  },
  {
    target: 'nextConfig',
    path: filesToTest.nextConfig,
    assertions: [
      { name: '59. nextConfig object definition', pattern: /const\s+nextConfig\s*=/ },
      { name: '60. Disable powered-by header', pattern: /poweredByHeader:\s*false/ }
    ]
  }
];

assertionsList.forEach(group => {
  runAssertions(group.target, group.path, group.assertions);
});

console.log('\n==================================================');
console.log(`Integrity Check Result: ${passed}/61 Passed`);
console.log('==================================================');

if (failed === 0 && passed === 61) {
  console.log('✅ ALL 61 INTEGRITY CHECKS PASSED');
  process.exit(0);
} else {
  console.error(`❌ ${failed} INTEGRITY CHECKS FAILED`);
  process.exit(1);
}
