import fs from 'fs';
import path from 'path';

// lucide-react-native ships ESM and is outside the current transform whitelist.
// Mock it so the Icon component can be required without worrying about the
// exact set of named exports used by the implementation.
jest.mock('lucide-react-native', () => {
  const noOpIcon = () => null;
  return new Proxy(
    { __esModule: true },
    {
      get(_target, prop) {
        if (prop === '__esModule') return true;
        if (prop === 'default') return noOpIcon;
        return noOpIcon;
      },
    },
  );
});

const ROOT = path.resolve(__dirname, '../..');
const srcPath = (rel: string) => path.join(ROOT, 'src', rel);
const readSource = (rel: string) => fs.readFileSync(srcPath(rel), 'utf-8');

// Matches the specific emoji glyphs found in the audit plus common emoji ranges.
const EMOJI_REGEX =
  /[\u{23F9}\u{26A0}\u{2699}\u{1F399}\u{1F916}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1FAD6}\u{1FA70}-\u{1FAFF}]\u{FE0F}?/gu;

// Matches imports/requires of react-native-svg and raw SVG JSX tags.
const SVG_REGEX =
  /from\s+['"]react-native-svg['"]|require\s*\(\s*['"]react-native-svg['"]\s*\)|<Svg\b|<Path\b|<Rect\b|<Circle\b|<G\b|<Defs\b|<Use\b|<Line\b|<Polyline\b|<Polygon\b/i;

const ICON_LIBRARY_IMPORT = /from\s+['"]@\/design-system\/icons['"]/;

describe('T29: centralize icon library and remove inline SVG/emoji', () => {
  test('src/design-system/icons/index.ts exports a typed Icon component', () => {
    const icons = require('@/design-system/icons');
    expect(icons).toBeDefined();
    expect(icons.Icon).toBeDefined();
    expect(typeof icons.Icon).toBe('function');
  });

  const iconBearingComponents = [
    { rel: 'components/ErrorMessage.tsx', label: 'ErrorMessage' },
    { rel: 'components/EmptyState.tsx', label: 'EmptyState' },
    { rel: 'components/gemini/BigMicButton.tsx', label: 'BigMicButton' },
    { rel: 'components/gemini/ControlBar.tsx', label: 'ControlBar' },
    { rel: 'design-system/components/PageHeader/index.tsx', label: 'PageHeader' },
    { rel: 'components/DeviceRow/index.tsx', label: 'DeviceRow' },
    { rel: 'components/MicButton/index.tsx', label: 'MicButton' },
    { rel: 'components/OnbShell/index.tsx', label: 'OnbShell' },
  ];

  test.each(iconBearingComponents)(
    '$label no longer contains inline emoji or SVG and imports from @/design-system/icons',
    ({ rel }) => {
      const content = readSource(rel);
      expect(content).not.toMatch(EMOJI_REGEX);
      expect(content).not.toMatch(SVG_REGEX);
      expect(content).toMatch(ICON_LIBRARY_IMPORT);
    },
  );

  const iconAgnosticComponents = [
    { rel: 'design-system/components/CircleBtn/index.tsx', label: 'CircleBtn' },
  ];

  test.each(iconAgnosticComponents)(
    '$label does not contain inline emoji or SVG',
    ({ rel }) => {
      const content = readSource(rel);
      expect(content).not.toMatch(EMOJI_REGEX);
      expect(content).not.toMatch(SVG_REGEX);
    },
  );
});
