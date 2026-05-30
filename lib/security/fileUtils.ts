import { resolve, sep } from 'node:path';

// Define the root folder directory path restriction
const ALLOWED_ROOT = '/Users/erikbabcan';

/**
 * Validates whether the absolute path is within the allowed home directory folder.
 * Prevents Directory Traversal attacks (e.g. using "../")
 */
export function isPathSafe(candidatePath: string): boolean {
  if (!candidatePath) return false;
  
  try {
    const resolvedPath = resolve(candidatePath);
    // Path must either be exactly ALLOWED_ROOT or a subdirectory inside it
    return resolvedPath === ALLOWED_ROOT || resolvedPath.startsWith(`${ALLOWED_ROOT}${sep}`);
  } catch (error) {
    return false;
  }
}

/**
 * Clean path input (trim, resolve) and return if safe.
 * Throws an error if path is unsafe.
 */
export function getSafePath(candidatePath: string): string {
  const resolved = resolve(candidatePath);
  if (!isPathSafe(resolved)) {
    throw new Error("Access Denied: Path is outside the permitted directory.");
  }
  return resolved;
}

export function getHomeDir(): string {
  return ALLOWED_ROOT;
}
