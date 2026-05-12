export const STATES = [
  { id: 'rm_my_robot',     title: 'Robot · My Robot',           group: 'Robot Mgmt', kind: 'happy' },
  { id: 'rm_status',       title: 'Robot · Status',             group: 'Robot Mgmt', kind: 'happy' },
  { id: 'rm_battery',      title: 'Robot · Battery',            group: 'Robot Mgmt', kind: 'happy' },
  { id: 'rm_wifi',         title: 'Robot · Wi-Fi',              group: 'Robot Mgmt', kind: 'happy' },
  { id: 'rm_storage',      title: 'Robot · Courses installed',  group: 'Robot Mgmt', kind: 'happy' },
  { id: 'rm_firmware',     title: 'Robot · Software update',    group: 'Robot Mgmt', kind: 'happy' },
  { id: 'rm_sound',        title: 'Robot · Sound & volume',     group: 'Robot Mgmt', kind: 'happy' },
  { id: 'rm_mic_test',     title: 'Robot · Microphone test',    group: 'Robot Mgmt', kind: 'happy' },
  { id: 'rm_speaker_test', title: 'Robot · Speaker test',       group: 'Robot Mgmt', kind: 'happy' },
  { id: 'rm_factory',      title: 'Robot · Factory reset',      group: 'Robot Mgmt', kind: 'edge' },
  { id: 'rm_offline_help', title: 'Robot · Offline help',       group: 'Robot Mgmt', kind: 'edge' },
  { id: 'rm_support',      title: 'Robot · Contact support',    group: 'Robot Mgmt', kind: 'happy' },
] as const;
