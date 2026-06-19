/** @jest-environment node */

import fs from 'fs';
import path from 'path';
import * as httpTokens from '@/services/http/tokens';
import * as secureStore from '@/services/storage/secureStore';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

function readSourceFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__mocks__') continue;
      result.push(...readSourceFiles(full));
    } else if (
      entry.isFile() &&
      (full.endsWith('.ts') || full.endsWith('.tsx')) &&
      !full.endsWith('.test.ts') &&
      !full.endsWith('.test.tsx')
    ) {
      result.push(full);
    }
  }
  return result;
}

describe('T12: remove API shims and consolidate secure-storage wrappers', () => {
  it('does not ship src/api shim files', () => {
    const shims = [
      path.join(SRC, 'api', 'client.ts'),
      path.join(SRC, 'api', 'tokens.ts'),
      path.join(SRC, 'api', 'learning.ts'),
    ];
    for (const shim of shims) {
      expect(fs.existsSync(shim)).toBe(false);
    }
  });

  it('exposes token helpers from the canonical src/services/http/tokens.ts module', () => {
    expect(fs.existsSync(path.join(SRC, 'services', 'http', 'tokens.ts'))).toBe(true);
    expect(typeof httpTokens.getAccessToken).toBe('function');
    expect(typeof httpTokens.getRefreshToken).toBe('function');
    expect(typeof httpTokens.setTokens).toBe('function');
    expect(typeof httpTokens.clearTokens).toBe('function');
    expect(typeof httpTokens.getSecureJson).toBe('function');
    expect(typeof httpTokens.setSecureJson).toBe('function');
    expect(typeof httpTokens.deleteSecureItem).toBe('function');
    expect(httpTokens.SECURE_STORE_KEYS).toBeDefined();
  });

  it('exposes generic secure storage helpers from src/services/storage/secureStore.ts', () => {
    expect(typeof secureStore.getItem).toBe('function');
    expect(typeof secureStore.setItem).toBe('function');
    expect(typeof secureStore.removeItem).toBe('function');
  });

  it('has no source imports from @/api/* or relative api/* shim paths', () => {
    const files = readSourceFiles(SRC);
    const offenders: string[] = [];
    const aliasImportPattern = /@\/api\/[^'"]+/g;
    const relativeImportPattern = /from\s+['"](\.\.\/)+api\/[^'"]+['"]/g;
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      if (aliasImportPattern.test(content) || relativeImportPattern.test(content)) {
        offenders.push(path.relative(ROOT, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('imports token/storage helpers from canonical service modules in AuthContext and HouseholdContext', () => {
    const authPath = path.join(SRC, 'contexts', 'AuthContext.tsx');
    const householdPath = path.join(SRC, 'contexts', 'HouseholdContext.tsx');
    const authContent = fs.readFileSync(authPath, 'utf-8');
    const householdContent = fs.readFileSync(householdPath, 'utf-8');

    // AuthContext must no longer reach into the deleted api shim.
    expect(authContent).not.toMatch(/from\s+['"]\.\.\/api\/tokens['"]/);
    expect(authContent).not.toMatch(/from\s+['"]@\/api\/tokens['"]/);
    expect(authContent).toMatch(
      /from\s+['"](\.\.\/services\/http\/tokens|@\/services\/http\/tokens)['"]/,
    );

    // HouseholdContext must stop importing the deleted api shim.
    expect(householdContent).not.toMatch(/from\s+['"]\.\.\/api\/tokens['"]/);
    expect(householdContent).not.toMatch(/from\s+['"]@\/api\/tokens['"]/);
  });
});
