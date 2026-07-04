export const STATES = [
  { id: 'parent_gate', title: 'Parent Gate', group: 'Parent', kind: 'edge' },
  { id: 'parent_locked_out', title: 'Parent Gate Locked Out', group: 'Parent', kind: 'edge' },
  { id: 'parent_summary', title: 'Parent Summary', group: 'Parent', kind: 'happy' },
  { id: 'parent_today', title: 'Practiced Today', group: 'Parent', kind: 'happy' },
  { id: 'parent_history', title: 'Past 30 Days', group: 'Parent', kind: 'happy' },
  { id: 'parent_safety', title: 'Safety & Privacy', group: 'Parent', kind: 'happy' },
  { id: 'parent_settings', title: 'Parent Settings', group: 'Parent', kind: 'happy' },
  { id: 'parent_diagnostic_log', title: 'Diagnostic Log', group: 'Parent', kind: 'edge' },
  { id: 'parent_account_privacy', title: 'Account Privacy', group: 'Parent', kind: 'edge' },
] as const;
