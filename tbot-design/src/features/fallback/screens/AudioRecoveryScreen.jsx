import React from 'react';

export default function AudioRecoveryPage({ go }){
  const Step = ({ n, title, body }) => (
    <div style={{ display:'flex', gap:14, padding:'12px 14px', borderBottom:`1px solid ${PA.hair}` }}>
      <div style={{
        width:28, height:28, borderRadius:'50%', background:'#EEF1F5', color:PA.ink,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        fontSize:13, fontWeight:600, fontVariantNumeric:'tabular-nums',
      }}>{n}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:500, color:PA.ink, marginBottom:2 }}>{title}</div>
        <div style={{ fontSize:13, color:PA.ink2, lineHeight:1.45 }}>{body}</div>
      </div>
    </div>
  );
  return (
    <ParentScroll title="Microphone access" onBack={()=>go('mic_missing')}>
      <div style={{ padding:'18px 20px 8px' }}>
        <div style={{ fontSize:18, fontWeight:600, letterSpacing:-0.2, color:PA.ink, marginBottom:6 }}>
          Microphone access is needed for speaking practice.
        </div>
        <div style={{ fontSize:14, color:PA.ink2, lineHeight:1.5 }}>
          The mic only turns on during a lesson. No recordings are saved. Follow these steps to enable it on this device.
        </div>
      </div>

      <div style={{ padding:'14px 16px 4px' }}>
        <div style={{ background:PA.card, border:`1px solid ${PA.hair}`, borderRadius:14, overflow:'hidden' }}>
          <Step n="1" title="Open device Settings" body="Leave the app and open Settings on this device."/>
          <Step n="2" title="Find Robot English" body="Scroll to find the Robot English app in your installed apps."/>
          <Step n="3" title="Allow Microphone" body="Toggle Microphone on. Then return to the app."/>
          <div style={{ padding:'12px 14px' }}>
            <div style={{ display:'flex', gap:14 }}>
              <div style={{ width:28, flexShrink:0 }}/>
              <div style={{ fontSize:13, color:PA.ink2, lineHeight:1.45 }}>
                We'll detect the change automatically and your child can keep going.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'12px 16px 0', display:'flex', flexDirection:'column', gap:10 }}>
        <button style={{
          width:'100%', minHeight:48, borderRadius:10, border:'none', background:PA.accent, color:'#fff',
          fontWeight:600, fontSize:15, cursor:'pointer', fontFamily:'inherit',
        }}>Open device Settings</button>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          width:'100%', minHeight:48, borderRadius:10, border:`1px solid ${PA.hair}`, background:PA.card, color:PA.ink,
          fontWeight:500, fontSize:15, cursor:'pointer', fontFamily:'inherit',
        }}>Back to play area</button>
      </div>

      <div style={{ padding:'16px 20px 36px', fontSize:12, color:PA.ink3, lineHeight:1.5 }}>
        No lesson transcript is shown in this version. Your child's voice is processed in real time and not stored.
      </div>
    </ParentScroll>
  );
}
