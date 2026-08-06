export const STATES = [
  { id: 'cl_library', title: 'Course · Library', group: 'Course Library', kind: 'happy' },
  { id: 'cl_detail', title: 'Course · Detail', group: 'Course Library', kind: 'happy' },
  { id: 'cl_add_free', title: 'Course · Add free course', group: 'Course Library', kind: 'happy' },
  { id: 'cl_unlock_confirm', title: 'Course · Parent unlock confirmation', group: 'Course Library', kind: 'happy' },
  { id: 'cl_added', title: 'Course · Added to Library', group: 'Course Library', kind: 'happy' },
  { id: 'cl_complete', title: 'Course · Lesson complete (synced)', group: 'Course Library', kind: 'happy' },
  { id: 'cl_locked', title: 'Course · Locked', group: 'Course Library', kind: 'edge' },
] as const;
