import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const projectRoot = join(__dirname, '..', '..');

describe('Kids Category release dependencies', () => {
  it('does not package third-party analytics or crash-reporting SDKs', () => {
    const packageJson = JSON.parse(
      readFileSync(join(projectRoot, 'package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };
    const dependencies = packageJson.dependencies ?? {};

    expect(dependencies).not.toHaveProperty('@sentry/react-native');
    expect(dependencies).not.toHaveProperty('posthog-react-native');

    const productionSources = [
      'src/services/observability/analytics.ts',
      'src/services/observability/sentry.ts',
      'src/services/observability/voice-telemetry.ts',
    ].map(relativePath => readFileSync(join(projectRoot, relativePath), 'utf8'));

    expect(productionSources.join('\n')).not.toMatch(/@sentry\/react-native|posthog-react-native/);
  });
});
