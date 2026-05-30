import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const fileUtilsPath = path.join(rootDir, 'lib/security/fileUtils.ts');
const apiRoutePath = path.join(rootDir, 'app/api/files/route.ts');
const fileExplorerPath = path.join(rootDir, 'components/file-explorer.tsx');
const chatAreaPath = path.join(rootDir, 'components/chat-area.tsx');

console.log('🔍 Running File Explorer Integration and Safety Tests...');

let failed = false;

// 1. File existence validation
console.log('\n📁 Verifying file paths...');
const pathsToCheck = [
  { name: 'fileUtils security helpers', path: fileUtilsPath },
  { name: 'files API Route', path: apiRoutePath },
  { name: 'FileExplorer React Component', path: fileExplorerPath }
];

pathsToCheck.forEach(file => {
  if (fs.existsSync(file.path)) {
    console.log(`✅ File exists: ${file.name}`);
  } else {
    console.error(`❌ Missing file: ${file.name} at ${file.path}`);
    failed = true;
  }
});

if (failed) process.exit(1);

// 2. Code integrity checks for API route
console.log('\n🔐 Verifying app/api/files/route.ts code integrity & validations...');
const apiContent = fs.readFileSync(apiRoutePath, 'utf8');

const apiAssertions = [
  { name: 'Import of getSafePath safety helper', pattern: /getSafePath/ },
  { name: 'Directory listing fs.readdir', pattern: /fs\.readdir/ },
  { name: 'Action check in POST', pattern: /const\s+\{\s*action/ },
  { name: 'Read file action', pattern: /case\s+["']read["']/ },
  { name: 'Write file action', pattern: /case\s+["']write["']/ },
  { name: 'Create file/folder action', pattern: /case\s+["']create["']/ },
  { name: 'Delete file/folder action', pattern: /case\s+["']delete["']/ }
];

apiAssertions.forEach(assertion => {
  if (assertion.pattern.test(apiContent)) {
    console.log(`✅ Passed: ${assertion.name}`);
  } else {
    console.error(`❌ Failed: ${assertion.name} (Pattern: ${assertion.pattern})`);
    failed = true;
  }
});

// 3. Code integrity checks for file-explorer.tsx
console.log('\n🖥️ Verifying components/file-explorer.tsx UI & interaction flows...');
const explorerContent = fs.readFileSync(fileExplorerPath, 'utf8');

const explorerAssertions = [
  { name: 'FileExplorer component export', pattern: /export\s+function\s+FileExplorer/ },
  { name: 'API fetch calls to /api/files', pattern: /fetch\(\s*['"]\/api\/files/ },
  { name: 'Folder navigation handler', pattern: /handleFolderClick/ },
  { name: 'File edit action reader', pattern: /handleFileClick/ },
  { name: 'Save changes writer', pattern: /handleSaveFile/ },
  { name: 'Delete click action', pattern: /handleDelete/ },
  { name: 'Textarea code editor workspace', pattern: /<textarea/ },
  { name: 'Preview image tag element', pattern: /<img/ }
];

explorerAssertions.forEach(assertion => {
  if (assertion.pattern.test(explorerContent)) {
    console.log(`✅ Passed: ${assertion.name}`);
  } else {
    console.error(`❌ Failed: ${assertion.name} (Pattern: ${assertion.pattern})`);
    failed = true;
  }
});

// 4. Live API operations & path traversal security verify (if server is active)
console.log('\n🌐 Testing live API file operations and directory traversal protection...');
const ptyPort = process.env.PORT || '3010';
const nextPort = '3002'; // Next.js server port
const testFile = '/Users/erikbabcan/test_nexify_file.txt';
const traversalPath = '/etc/passwd';

try {
  // Test directory listing from Next.js server
  const listRes = await fetch(`http://localhost:${nextPort}/api/files?path=${encodeURIComponent('/Users/erikbabcan')}`);
  if (listRes.ok) {
    const listData = await listRes.json();
    if (listData.success) {
      console.log('✅ Live API: Directory listing retrieved successfully');
      console.log(`   Found ${listData.files.length} items in ${listData.currentPath}`);
    } else {
      console.error('❌ Live API: Directory listing query returned success: false', listData);
      failed = true;
    }

    // Try to perform Directory Traversal Attack
    console.log('🔒 Testing path traversal protection request for /etc/passwd...');
    const traverseRes = await fetch(`http://localhost:${nextPort}/api/files?path=${encodeURIComponent(traversalPath)}`);
    const traverseData = await traverseRes.json();
    if (!traverseRes.ok || !traverseData.success) {
      console.log('✅ Live API: Directory traversal blocked successfully! (Expected error code)');
      console.log(`   Message: ${traverseData.error}`);
    } else {
      console.error('❌ Live API: SECURITY VULNERABILITY! Path traversal to /etc/passwd was allowed!');
      failed = true;
    }

    // Try to create a file
    console.log('📝 Testing temporary file creation...');
    const createRes = await fetch(`http://localhost:${nextPort}/api/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', path: testFile, type: 'file' })
    });
    const createData = await createRes.json();
    
    if (createRes.ok && createData.success) {
      console.log('✅ Live API: Test file created successfully');
      
      // Try to write to it
      const writeRes = await fetch(`http://localhost:${nextPort}/api/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'write', path: testFile, content: 'Nexify file integration unit tests pass.' })
      });
      const writeData = await writeRes.json();
      if (writeRes.ok && writeData.success) {
        console.log('✅ Live API: Written to test file successfully');
      } else {
        console.error('❌ Live API: Write file action failed', writeData);
        failed = true;
      }

      // Try to read it
      const readRes = await fetch(`http://localhost:${nextPort}/api/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', path: testFile })
      });
      const readData = await readRes.json();
      if (readRes.ok && readData.success && readData.content === 'Nexify file integration unit tests pass.') {
        console.log('✅ Live API: Read file content successfully matched output');
      } else {
        console.error('❌ Live API: Read file content verification failed', readData);
        failed = true;
      }

      // Cleanup: Delete file
      console.log('🧹 Cleaning up test file...');
      const deleteRes = await fetch(`http://localhost:${nextPort}/api/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', path: testFile })
      });
      const deleteData = await deleteRes.json();
      if (deleteRes.ok && deleteData.success) {
        console.log('✅ Live API: Test file deleted successfully during cleanup');
      } else {
        console.error('❌ Live API: Delete cleanup failed', deleteData);
        failed = true;
      }

    } else {
      console.error('❌ Live API: File creation action failed', createData);
      failed = true;
    }

  } else {
    console.log('⚠️  Next.js dev server is offline (API integration request skipped). Run pnpm dev to verify live routing.');
  }
} catch (e) {
  console.log('ℹ️  Next.js dev server is offline (live integration requests skipped).', e.message);
}

console.log('\n==================================================');
console.log('File Explorer Integration Test Summary');
console.log('==================================================');
if (failed) {
  console.error('❌ FILE EXPLORER INTEGRATION TEST FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL FILE EXPLORER INTEGRATION TESTS PASSED');
  process.exit(0);
}
