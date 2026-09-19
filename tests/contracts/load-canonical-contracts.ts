import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

type RobotState = typeof import('../../src/contracts/robot-state');
type Expression = typeof import('../../src/contracts/expression');
type Motion = typeof import('../../src/contracts/motion');
type Realtime = typeof import('../../src/contracts/realtime-events');

interface CanonicalSnapshot {
  robotState: Pick<RobotState, 'RobotInteractionState' | 'ALL_STATES' | 'FORWARD_EDGES' | 'UNIVERSAL_TARGETS'> & {
    transitions: Record<string, Record<string, boolean>>;
    targets: Record<string, string[]>;
  };
  expression: Pick<Expression, 'Expression' | 'ALL_EXPRESSIONS' | 'EXPRESSION_METADATA' | 'DEFAULT_EXPRESSION'>;
  motion: Pick<Motion, 'Motion' | 'ALL_MOTIONS' | 'MOTION_CHANNEL' | 'HEAD_PRIMITIVES' | 'ARM_PRIMITIVES' | 'POSE_PRIMITIVES' | 'COMPOSABILITY' | 'DEFAULT_MOTION'>;
  realtime: Pick<Realtime, 'RealtimeEventType' | 'ALL_EVENT_TYPES'>;
}

function invokeCanonical(request: object): string {
  const backendRoot = process.env.TBOT_BACKEND_DIR === undefined
    ? resolve(__dirname, '../../../tbot-backend')
    : resolve(process.env.TBOT_BACKEND_DIR);
  const result = spawnSync(process.execPath, [join(__dirname, 'canonical-contracts-bridge.js'), backendRoot], {
    input: JSON.stringify(request), encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024,
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      'Canonical parity requires TBOT_BACKEND_DIR=' + backendRoot + '.\n' +
      (result.error?.stack ?? '') + result.stderr,
      { cause: result.error ?? result.stderr },
    );
  }
  return result.stdout;
}

export function loadCanonicalContracts(states: readonly string[]) {
  // Types describe the bridge transport only; values and function results come
  // exclusively from the native canonical modules, never the mobile projections.
  const data: CanonicalSnapshot = JSON.parse(invokeCanonical({ operation: 'snapshot', states }));
  return {
    canonicalRobotState: {
      ...data.robotState,
      isValidTransition: (from: string, to: string) => data.robotState.transitions[from][to],
      legalTargets: (from: string) => data.robotState.targets[from],
    },
    canonicalExpression: data.expression,
    canonicalMotion: data.motion,
    canonicalRealtime: {
      ...data.realtime,
      createExpression: (args: {
        session_id: string; turn_id: string; expression: string;
        duration_ms: number; source: string; timestamp_ms: number;
      }): unknown => JSON.parse(invokeCanonical({ operation: 'createExpression', args })),
    },
  };
}
