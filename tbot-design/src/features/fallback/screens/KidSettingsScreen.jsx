import React from 'react';
import Robot from '@/design-system/components/Robot';

export default function KidSettingsPage({ go, robotProps }){
  const [sound, setSound] = React.useState(true);
  const [mic, setMic] = React.useState(true);
  const Row = ({ icon, label, on, set }) => (
    <div style={{
      display:'flex', alignItems:'center', gap:14, background:'#fff',
      borderRadius:20, padding:'14px 18px', boxShadow:'0 2px 6px rgba(0,0,0,.05)',
    }}>
      <div style={{ width:48, height:48, borderRadius:14, background:'var(--cream-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>{icon}</div>
      <div style={{ flex:1, fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink)' }}>{label}</div>
      <div onClick={()=>set(!on)} style={{
        width:60, height:36, borderRadius:18, background: on? 'var(--mint)' : 'rgba(0,0,0,.12)',
        position:'relative', cursor:'pointer', transition:'background .15s', flexShrink:0,
      }}>
        <div style={{ position:'absolute', top:3, left: on? 27:3, width:30, height:30, borderRadius:'50%', background:'#fff', boxShadow:'0 2px 4px rgba(0,0,0,.2)', transition:'left .15s' }}/>
      </div>
    </div>
  );
  return (
    <PageScroll>
      <PageHeader onBack={()=>go('home_hub_idle')} title="Settings"/>
      <div style={{ padding:'4px 24px 16px', display:'flex', justifyContent:'center' }}>
        <Robot emotion="happy" size={140} {...robotProps}/>
      </div>
      <div style={{ padding:'0 18px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        <Row icon="🔊" label="Sounds" on={sound} set={setSound}/>
        <Row icon="🎤" label="Microphone" on={mic} set={setMic}/>
      </div>
      <div style={{ padding:'4px 18px 18px' }}>
        <button onClick={(e)=>{e.stopPropagation(); go('parent_gate');}} style={{
          width:'100%', background:'#fff', border:'2px dashed rgba(0,0,0,.15)', borderRadius:20,
          padding:'16px 18px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', textAlign:'left',
        }}>
          <div style={{ width:48, height:48, borderRadius:14, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🔒</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:16, color:'var(--ink)' }}>Grown-up area</div>
            <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:13, color:'var(--ink-soft)' }}>For parents</div>
          </div>
          <span style={{ fontSize:18, color:'var(--ink-soft)' }}>›</span>
        </button>
      </div>
      <div style={{ padding:'0 18px 24px' }}>
        <button onClick={(e)=>{e.stopPropagation(); go('help_faq');}} style={{
          width:'100%', background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer', padding:'12px',
        }}>Need help?</button>
      </div>
    </PageScroll>
  );
}
