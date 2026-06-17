import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Initiating Nexify Terminal Production Preparation...\n');

let warnings = 0;

try {
  // Step 1: Integrity Tests (BLOCKING)
  console.log('1️⃣  Running Master Integrity Test Suite (60 Assertions)...');
  execSync('npm run test:integrity-60', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Integrity Tests Passed.\n');

  // Step 2: Security Checks (BLOCKING)
  console.log('2️⃣  Running Security Checks...');
  execSync('npm run test:security', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Security Checks Passed.\n');

  // Step 3: Typechecking (WARNING only - project uses ignoreBuildErrors: true)
  console.log('3️⃣  Typechecking (advisory)...');
  try {
    execSync('npm run lint', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ Typecheck Passed.\n');
  } catch {
    warnings++;
    console.warn('⚠️  Typecheck warnings detected (non-blocking, project uses ignoreBuildErrors).\n');
  }

  // Step 4: Production Build (BLOCKING)
  console.log('4️⃣  Building production bundle...');
  execSync('npm run build', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Production Build Succeeded.\n');

  console.log('==================================================');
  console.log('🎉 Production Preparation Complete!');
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} advisory warning(s) detected — review recommended.`);
  }
  console.log('==================================================');
  console.log('To start the production server, run: npm run start');
  
} catch (error) {
  console.error('\n❌ Production Preparation Failed! Please fix the errors above before deploying.');
  process.exit(1);
}
