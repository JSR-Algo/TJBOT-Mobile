/**
 * Connector boundary vocabulary for hardware-dependent surfaces.
 *
 * Six honest states govern every robot-connector domain (pairing, robot
 * status, lesson delivery, robot control, firmware update, robot voice).
 * A connector never fakes hardware success: it either returns a real value
 * (`state: 'ok'`) or one of these states with optional reason/retryability.
 *
 * Manual impact note (new module, 2026-07-18): no upstream callers yet by
 * construction. Planned consumers (P2 mobile de-fake): robot-mgmt + device
 * screens, RobotLessonControlScreen, course-library send-to-robot path.
 * Paired backend vocabulary: backend/vendor/contracts/enums.json
 * `ConnectorState` (same six literals — keep in sync).
 * Copy strings double as i18n catalog keys (en.json/vi.json); locale
 * fallback is `en` per governance (AGENTS.md §11.2).
 */
import { normalizeError } from '@/utils/errors';
import { isBackendContractUnavailableError } from '@/services/api/undocumented-api-routes';

export const ROBOT_LINK_STATES = [
  'not_connected',
  'simulated',
  'queued_for_robot',
  'robot_offline',
  'server_unavailable',
  'unsupported_until_connector',
] as const;

export type RobotLinkState = (typeof ROBOT_LINK_STATES)[number];

export type ConnectorResult<T> =
  | { state: 'ok'; value: T }
  | { state: RobotLinkState; reason?: string; retryable?: boolean };

export function ok<T>(value: T): ConnectorResult<T> {
  return { state: 'ok', value };
}

export function linkBlocked(
  state: RobotLinkState,
  reason?: string,
  retryable?: boolean,
): ConnectorResult<never> {
  return {
    state,
    ...(reason !== undefined ? { reason } : {}),
    ...(retryable !== undefined ? { retryable } : {}),
  };
}

/**
 * Map a thrown/network error to a robot-link state, or null when the error
 * is not a link-state failure (screens keep their normal error UX for it).
 *
 * Mapping rules (stable, test-covered):
 * - BACKEND_CONTRACT_UNAVAILABLE / FEATURE_*_DISABLED → unsupported_until_connector
 * - NETWORK_ERROR / SERVICE_UNAVAILABLE / GATEWAY_TIMEOUT / INTERNAL_ERROR → server_unavailable
 * - ROBOT_OFFLINE / ROBOT_BRIDGE_UNAVAILABLE → robot_offline
 * - ROBOT_BUSY → queued_for_robot
 */
export function mapErrorToLinkState(error: unknown): RobotLinkState | null {
  if (isBackendContractUnavailableError(error)) {
    return 'unsupported_until_connector';
  }
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    if (
      error.name.endsWith('DisabledError') ||
      (typeof code === 'string' && code.startsWith('FEATURE_') && code.endsWith('_DISABLED'))
    ) {
      return 'unsupported_until_connector';
    }
  }

  const normalized = normalizeError(error);
  switch (normalized.code) {
    case 'NETWORK_ERROR':
    case 'SERVICE_UNAVAILABLE':
    case 'GATEWAY_TIMEOUT':
    case 'INTERNAL_ERROR':
      return 'server_unavailable';
    case 'ROBOT_OFFLINE':
    case 'ROBOT_BRIDGE_UNAVAILABLE':
      return 'robot_offline';
    case 'ROBOT_BUSY':
      return 'queued_for_robot';
    default:
      return null;
  }
}

/**
 * Pre-flight state check before any connector call. Precedence: an explicit
 * demo/simulation flag always wins; then a missing paired device means the
 * surface must present `not_connected` instead of a fabricated status.
 */
export function resolvePreconditionState(options: {
  simulated?: boolean;
  hasPairedDevice: boolean | null;
}): RobotLinkState | null {
  if (options.simulated) {
    return 'simulated';
  }
  if (options.hasPairedDevice === false) {
    return 'not_connected';
  }
  return null;
}

/**
 * Canonical copy per state. Strings are English (the i18n key); Vietnamese
 * lives in vi.json under the same key. Keep both catalogs paired.
 */
export const ROBOT_LINK_STATE_COPY: Record<RobotLinkState, { title: string; body: string }> = {
  not_connected: {
    title: 'No robot connected yet',
    body: 'Pair your robot to see its status and send lessons.',
  },
  simulated: {
    title: 'Demo mode',
    body: 'This is simulated robot data shown for demonstration. No real robot is involved.',
  },
  queued_for_robot: {
    title: 'Queued for your robot',
    body: "Robot will pick this up when it's back online.",
  },
  robot_offline: {
    title: 'Robot is offline',
    body: 'Check that Robot is on and connected, then try again.',
  },
  server_unavailable: {
    title: "Can't reach the server",
    body: 'Check your connection and try again in a moment.',
  },
  unsupported_until_connector: {
    title: 'Not available yet',
    body: "This feature needs the robot connection, which isn't available in this build.",
  },
};
