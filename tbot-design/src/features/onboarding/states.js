// `autoAdvance: { after: <ms>, to: <id> }` documents screens that advance
// without user input (animation/timer driven). Addresses ISSUE 10 from
// user-flow-review.md (dead-ends without auto-advance documentation).
// Schema only — runtime auto-advance is implemented in-component via setTimeout.
export const STATES = [
  { id:'onb_splash',          title:'1 · Splash',                 group:'Onboarding', kind:'happy' },
  { id:'onb_welcome',         title:'2 · Welcome',                group:'Onboarding', kind:'happy' },
  { id:'onb_intro_listen',    title:'3 · Intro · Listen',         group:'Onboarding', kind:'happy', autoAdvance:{ after:3000, to:'onb_intro_speak' } },
  { id:'onb_intro_speak',     title:'4 · Intro · Speak',          group:'Onboarding', kind:'happy', autoAdvance:{ after:3000, to:'onb_intro_retry' } },
  { id:'onb_intro_retry',     title:'5 · Intro · Try Again',      group:'Onboarding', kind:'happy', autoAdvance:{ after:2500, to:'onb_intro_celebrate' } },
  { id:'onb_intro_celebrate', title:'6 · Intro · Celebrate',      group:'Onboarding', kind:'happy', autoAdvance:{ after:2500, to:'onb_trust' } },
  { id:'onb_trust',           title:'7 · Parent Trust Intro',     group:'Onboarding', kind:'happy' },
  { id:'onb_mic',             title:'8 · Voice Permission',       group:'Onboarding', kind:'happy' },
  { id:'onb_first_lesson',    title:'12 · First Lesson Entry',    group:'Onboarding', kind:'happy' },
];
