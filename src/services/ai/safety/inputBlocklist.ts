import { scanBlocklist, validateIntegrity } from './blocklist';
import blocklistData from './blocklist.v1.json';
import type { CheckResult, SafetyContext } from './schemas';

export function checkInput(utterance: string, ctx: SafetyContext): CheckResult {
  try {
    if (!validateIntegrity(blocklistData as unknown as import('./schemas').BlocklistV1)) {
      ctx.telemetry.emit('safety_shim_error', { side: 'input', reason: 'integrity_failed' });
      return { verdict: 'block', category: 'prompt-injection' };
    }
    return scanBlocklist(utterance, ctx, 'input');
  } catch (err) {
    ctx.telemetry.emit('safety_shim_error', { side: 'input', err: (err as Error).name });
    return { verdict: 'block', category: 'prompt-injection' };
  }
}
