import type { CurrentAssignment, PreloadStatus, TerminalAssignment } from '@/services/api/course-library.api';

export type AssignmentSelection = Readonly<{
  deviceId?: string;
  assignmentId?: string;
  assignmentVersion?: number;
  childId?: string;
  sessionId?: string;
  profile?: string;
  manifestChecksum?: string | null;
}>;

export function validAssignmentVersion(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function matchesActive(selection: AssignmentSelection, current: CurrentAssignment): boolean {
  return Boolean(selection.deviceId?.trim() && selection.assignmentId?.trim() && current.assignmentId?.trim() && current.childId?.trim() &&
    validAssignmentVersion(current.assignmentVersion) &&
    selection.assignmentId === current.assignmentId &&
    (selection.profile === undefined || selection.profile === current.profile) &&
    (selection.assignmentVersion === undefined || selection.assignmentVersion === current.assignmentVersion) &&
    (!selection.childId || selection.childId === current.childId));
}

export function matchesTerminal(selection: AssignmentSelection, terminal: TerminalAssignment): boolean {
  return Boolean(selection.deviceId?.trim() && selection.assignmentId?.trim() &&
    validAssignmentVersion(selection.assignmentVersion) &&
    selection.assignmentId === terminal.assignmentId && selection.assignmentVersion === terminal.assignmentVersion);
}

export function readyAssignment(selection: AssignmentSelection, current: CurrentAssignment | null, preload: PreloadStatus | null): CurrentAssignment | null {
  if (!selection.assignmentId || !selection.childId || !current || !preload ||
      !matchesActive(selection, current) || current.state !== 'READY' || preload.state !== 'READY' || preload.errorCode ||
      preload.assignmentId !== current.assignmentId || preload.profile !== current.profile ||
      !current.profile?.trim() || !current.manifestChecksum?.trim() ||
      (selection.manifestChecksum != null && selection.manifestChecksum !== current.manifestChecksum)) return null;
  return current;
}

// Entry routes must retain the complete write receipt, not adopt whichever
// assignment happens to occupy the device when the next read finishes.
export function entryAssignment(selection: AssignmentSelection, current: CurrentAssignment | null): CurrentAssignment | null {
  if (!selection.childId?.trim() || !selection.profile?.trim() ||
      !selection.manifestChecksum?.trim() || !validAssignmentVersion(selection.assignmentVersion) ||
      !current || !matchesActive(selection, current) ||
      current.manifestChecksum !== selection.manifestChecksum ||
      !['ASSIGNED', 'PRELOADING', 'READY', 'RUNNING'].includes(current.state)) return null;
  return current;
}

export function matchesObserver(frame: unknown, assignment: CurrentAssignment, sessionId: string): boolean {
  if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return false;
  const record = frame as Record<string, unknown>;
  return (record.session_id === undefined || record.session_id === sessionId) &&
    (record.sessionId === undefined || record.sessionId === sessionId) &&
    (record.assignment_id === undefined || record.assignment_id === assignment.assignmentId) &&
    (record.assignmentId === undefined || record.assignmentId === assignment.assignmentId) &&
    (record.assignmentVersion === undefined || record.assignmentVersion === assignment.assignmentVersion) &&
    (record.assignment_version === undefined || record.assignment_version === assignment.assignmentVersion);
}
