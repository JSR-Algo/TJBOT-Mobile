import React from 'react';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import DvBigBtn from '@/components/DeviceBigBtn';
import { RM } from '../components/styles';

export default function SupportPage({ go }){
  const [topic, setTopic] = React.useState('hardware');
  const topics = [
    { id:'hardware', t:'Robot device' },
    { id:'sound',    t:'Sound or microphone' },
    { id:'wifi',     t:'Wi-Fi or pairing' },
    { id:'lessons',  t:'Lessons & courses' },
    { id:'account',  t:'Account & billing' },
    { id:'other',    t:'Something else' },
  ];
  return (
    <DvShell title="Contact support" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'18px 24px 0' }}>
        <div style={{ fontSize:13, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          We're a small team and we read every message. Most replies arrive within a day.
        </div>
      </div>

      {/* Quick channels */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="💬" title="Chat with us" body="Mon–Fri · 9 AM – 6 PM ET" right={<span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:RM.good }}><span style={{ width:6, height:6, borderRadius:3, background:RM.good }}/>Online now</span>}/>
          <DvRow icon="✉️" title="Email support" body="hello@robotbuddy.app · reply in ~1 day"/>
          <DvRow icon="📚" title="Help articles" body="Setup, sounds, accounts, more"/>
        </div>
      </div>

      {/* Form */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Or send us a note</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px' }}>
          <div style={{ fontSize:12, color:RM.ink3, fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:0.4 }}>What's it about?</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {topics.map(t=>{
              const sel = topic===t.id;
              return (
                <button key={t.id} onClick={(e)=>{e.stopPropagation(); setTopic(t.id);}} style={{
                  border: sel? `1.5px solid ${RM.accent}` : `1px solid ${RM.hair}`,
                  background: sel? '#E8F0FE' : RM.card, color: sel? RM.accent : RM.ink2,
                  borderRadius:8, padding:'7px 12px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                }}>{t.t}</button>
              );
            })}
          </div>

          <div style={{ marginTop:14, fontSize:12, color:RM.ink3, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:0.4 }}>Tell us what's happening</div>
          <div style={{ background:'#F8F8F5', border:`1px solid ${RM.hair}`, borderRadius:10, padding:'12px 12px', minHeight:90, fontSize:14, color:RM.ink3, lineHeight:1.5 }}>
            Robot's voice cuts out halfway through lessons. We've tried…
          </div>

          <div style={{ marginTop:10, fontSize:11, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
            We'll attach a small device report (battery, Wi-Fi strength, software version). No audio, no transcripts.
          </div>
        </div>
      </div>

      {/* What we have */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Will be attached</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', flexWrap:'wrap', gap:6 }}>
          {['Robot ROB-2A8F','Software v1.4.2','Wi-Fi: strong','Battery: 78%','iOS app v3.1'].map(t=>(
            <span key={t} style={{ background:'#EEF1F5', color:RM.ink2, fontSize:11, fontWeight:600, padding:'4px 9px', borderRadius:6 }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('rm_my_robot')}>Send to support</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_my_robot')}>Cancel</DvBigBtn>
      </div>
    </DvShell>
  );
}
