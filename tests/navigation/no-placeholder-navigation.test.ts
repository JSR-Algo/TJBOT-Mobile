import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..', '..');

function listFeatureFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listFeatureFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('no placeholder navigation', () => {
  it('does not keep stub/demo/no-op navigation paths in feature screens', () => {
    const offenders = listFeatureFiles(join(root, 'src', 'features')).flatMap((file) => {
      const src = readFileSync(file, 'utf8');
      return src
        .split('\n')
        .map((line, index) => ({ line, lineNumber: index + 1 }))
        .filter(({ line }) => {
          const normalized = line.toLowerCase();
          return normalized.includes('(stub)')
            || normalized.includes('(demo)')
            || /on(?:press|click)=\{\(\) => \{\}\}/i.test(line);
        })
        .map(({ line, lineNumber }) => `${file.replace(`${root}/`, '')}:${lineNumber}: ${line.trim()}`);
    });

    expect(offenders).toEqual([]);
  });

  it('does not render enabled feature touch targets without behavior', () => {
    const offenders = listFeatureFiles(join(root, 'src', 'features')).flatMap((file) => {
      const src = readFileSync(file, 'utf8');
      const lines = src.split('\n');
      const entries: string[] = [];

      lines.forEach((line, index) => {
        const componentMatch = line.match(/<(TouchableOpacity|DeviceBigBtn)\b/);
        if (!componentMatch) return;

        const tagLines = [line];
        let cursor = index;
        while (!tagLines.join('\n').includes('>') && cursor < lines.length - 1) {
          cursor += 1;
          tagLines.push(lines[cursor]);
        }

        const tag = tagLines.join('\n');
        const hasBehavior = /\bon(?:Press|Click)=/.test(tag);
        const isDisabled = /\bdisabled(?:=|\b)/.test(tag) || /accessibilityState=\{\{\s*disabled:\s*true\s*\}\}/.test(tag);
        if (!hasBehavior && !isDisabled) {
          entries.push(`${file.replace(`${root}/`, '')}:${index + 1}: ${line.trim()}`);
        }
      });

      return entries;
    });

    expect(offenders).toEqual([]);
  });
});
