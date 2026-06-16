import { BLOCKLIST_VERSION as BL_VERSION } from './blocklist';
import { checkInput as checkInputImpl } from './inputBlocklist';
import { checkOutput as checkOutputImpl } from './outputBlocklist';
import { assemblePersona as assemblePersonaImpl } from './persona';

export interface TelemetryPort {
  emit(event: 'safety_block_event' | 'safety_shim_error', payload: Record<string, unknown>): void;
}

export interface SafetyContext {
  readonly childAgeBracket: '4-6' | '7-9' | '10-12';
  readonly childProfileId: string;
  readonly sessionId: string;
  readonly theme: {
    version: string;
    allowedTopics: string[];
    vocab: string[];
    openers: string[];
  };
  readonly telemetry: TelemetryPort;
}

export interface CheckResult {
  readonly verdict: 'allow' | 'block';
  readonly category?:
    | 'violence'
    | 'sexual'
    | 'substance'
    | 'self-harm'
    | 'pii'
    | 'prompt-injection';
  readonly termSha256?: string;
  readonly fallback?: string;
}

export const BLOCKLIST_VERSION = BL_VERSION;

export function checkInput(utterance: string, ctx: SafetyContext): CheckResult {
  try {
    const result = checkInputImpl(utterance, ctx);
    // Safety telemetry never includes a plaintext term; only termSha256 is emitted.
    if (result.verdict === 'block') {
      ctx.telemetry.emit('safety_block_event', {
        sessionId: ctx.sessionId,
        side: 'input',
        category: result.category,
        termSha256: result.termSha256,
        blocklistVersion: BL_VERSION,
        promptVersion: ctx.theme.version,
        tsMs: Date.now(),
      });
    }
    return result;
  } catch (err) {
    ctx.telemetry.emit('safety_shim_error', { side: 'input', err: (err as Error).name });
    return { verdict: 'block', category: 'prompt-injection' };
  }
}

export function checkOutput(transcriptChunk: string, ctx: SafetyContext): CheckResult {
  try {
    const result = checkOutputImpl(transcriptChunk, ctx);
    if (result.verdict === 'block') {
      ctx.telemetry.emit('safety_block_event', {
        sessionId: ctx.sessionId,
        side: 'output',
        category: result.category,
        termSha256: result.termSha256,
        blocklistVersion: BL_VERSION,
        promptVersion: ctx.theme.version,
        tsMs: Date.now(),
      });
    }
    return result;
  } catch (err) {
    ctx.telemetry.emit('safety_shim_error', { side: 'output', err: (err as Error).name });
    return { verdict: 'block', category: 'prompt-injection' };
  }
}

export function assemblePersona(ctx: SafetyContext): string {
  return assemblePersonaImpl(ctx);
}
