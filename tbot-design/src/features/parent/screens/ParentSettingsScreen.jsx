import React from 'react';
import { PA } from '../components/palette';
import ParentScroll from '../components/ParentScroll';
import PRowGroup from '../components/PRowGroup';
import PRow from '../components/PRow';
import { getLang, setLang as setLangBridge } from '@/services/i18n/langBridge.web';

export default function ParentSettingsPage({ go }){
  const [mic, setMic] = React.useState(true);
  const [sound, setSound] = React.useState(true);
  const [haptics, setHaptics] = React.useState(true);
  const [analytics, setAnalytics] = React.useState(false);
  const [lessonLen, setLessonLen] = React.useState('Standard');
  const [lang, setLang] = React.useState(() => getLang());
  const pickLang = (v) => { setLang(v); setLangBridge(v); };
  const langLabel = lang==='vi' ? 'Tiếng Việt' : lang==='en' ? 'English' : 'Tiếng Việt + English';

  return (
    <ParentScroll title="Settings" onBack={()=>go('parent_summary')}>
      <PRowGroup header="Language" footer="Changes apply to the whole app — for both child and parent surfaces.">
        <PRow icon="🌐" label="App language" value={langLabel} isLast/>
        <div style={{ padding:'0 16px 14px', display:'flex', gap:8, background:'#fff', borderTop:`1px solid ${PA.hair}` }}>
          {[
            {v:'vi',  label:'Tiếng Việt'},
            {v:'both',label:'VI + EN'},
            {v:'en',  label:'English'},
          ].map(o => (
            <button
              key={o.v}
              data-no-i18n
              onClick={(e)=>{ e.stopPropagation(); pickLang(o.v); }}
              style={{
                flex:1, padding:'10px 8px', marginTop:12, borderRadius:10,
                border:`1px solid ${lang===o.v ? PA.accent : PA.hair}`,
                background: lang===o.v ? PA.accent : '#fff',
                color: lang===o.v ? '#fff' : PA.ink,
                fontSize:14, fontWeight:600, cursor:'pointer',
              }}>{o.label}</button>
          ))}
        </div>
      </PRowGroup>

      <PRowGroup header="Child profile">
        <PRow icon="👤" label="Name" value="Mira" chevron/>
        <PRow icon="🎂" label="Age" value="7" chevron/>
        <PRow icon="🎯" label="Learning level" value="Beginner" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Lesson">
        <PRow icon="⏱" label="Lesson length" value={lessonLen} chevron onClick={()=>setLessonLen(lessonLen==='Short'?'Standard': lessonLen==='Standard'?'Long':'Short')}/>
        <PRow icon="🔔" label="Daily reminder" value="4:00 PM" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Audio & feedback" footer="Microphone is required for speaking practice. Turning it off pauses voice lessons.">
        <PRow icon="🎤" label="Microphone" toggle={mic} onToggle={setMic}/>
        <PRow icon="🔊" label="Sound effects" toggle={sound} onToggle={setSound}/>
        <PRow icon="📳" label="Haptics" toggle={haptics} onToggle={setHaptics} isLast/>
      </PRowGroup>

      <PRowGroup header="Privacy">
        <PRow icon="📊" label="Anonymous usage analytics" toggle={analytics} onToggle={setAnalytics}/>
        <PRow icon="🛡" label="Safety & Privacy details" chevron onClick={()=>go('parent_safety')}/>
        <PRow icon="🗑" label="Delete child's data" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Subscription">
        <PRow icon="✦" label="Robot English Plus" value="Active" chevron/>
        <PRow icon="💳" label="Manage billing" chevron isLast/>
      </PRowGroup>

      <PRowGroup header="Support">
        <PRow icon="?" label="Help center" chevron/>
        <PRow icon="✉" label="Contact support" chevron/>
        <PRow icon="ⓘ" label="About Robot English" value="v1.0.2" chevron isLast/>
      </PRowGroup>

      <PRowGroup>
        <PRow label="Sign out" danger onClick={()=>{}} isLast/>
      </PRowGroup>

      <div style={{ height:36 }}/>
    </ParentScroll>
  );
}
