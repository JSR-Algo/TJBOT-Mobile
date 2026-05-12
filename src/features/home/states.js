export const STATES = [
  { id:'home_hub_idle',         title:'Home · Idle happy',          group:'Home', state:'idle',             kind:'happy' },
  { id:'home_hub_greet',        title:'Home · Robot greeting',      group:'Home', state:'greeting',         kind:'happy' },
  { id:'home_hub_daily',        title:"Home · Today's lesson",      group:'Home', state:'daily_available',  kind:'happy' },
  { id:'home_hub_done',         title:'Home · Lesson done today',   group:'Home', state:'completed_today',  kind:'happy' },
  { id:'home_hub_mic',          title:'Home · Needs microphone',    group:'Home', state:'mic_needed',       kind:'edge'  },
  { id:'home_hub_offline',      title:'Home · Reconnecting',        group:'Home', state:'offline',          kind:'edge'  },
];
