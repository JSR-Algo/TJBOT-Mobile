// re-exports
export { devicePairingMachine, DevicePairingServices } from './devicePairing.machine';
export type { DevicePairingContext, DevicePairingEvent, DevicePairingState, ProvisioningErrorCode } from './devicePairing.types';
export { parentApprovalMachine, ParentApprovalServices } from './parentApproval.machine';
export type { ParentApprovalContext, ParentApprovalEvent, DashboardSubState } from './parentApproval.types';
export {
  createLessonSessionMachine,
  noopLessonSessionServices,
  type LessonSessionMachine,
  type LessonSessionActor,
} from './lessonSession.machine';
export type {
  LessonSessionContext,
  LessonSessionEvent,
  LessonSessionServices,
  SessionEndReason,
  InterruptReason,
  AudioFailureCode,
} from './lessonSession.types';
