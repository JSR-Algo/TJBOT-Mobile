import React from 'react';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';

export default function MicAskPage({ go }){
  const [showSheet, setShowSheet] = React.useState(false);
  return (
    <OnbShell title="Microphone" onBack={()=>go('onb_trust')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:96, height:96, borderRadius:24, background:OB.card, border:`1px solid ${OB.hair}`,
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18, color:OB.ink }}>
          <svg width="40" height="48" viewBox="0 0 24 28" fill="none">
            <rect x="8" y="2" width="8" height="14" rx="4" fill="currentColor"/>
            <path d="M5 12 a7 7 0 0 0 14 0 M12 19 v5 M8 24 h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
          </svg>
        </div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:OB.ink, textAlign:'center', marginBottom:8 }}>
          Robot needs the mic to listen
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5, textAlign:'center', maxWidth:320, textWrap:'pretty' }}>
          The next screen is your phone's permission prompt. Tap <b>Allow</b> so your child can speak to Robot.
        </div>
      </div>
      <div style={{ padding:'24px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
        {[
          'Used only during a lesson',
          'No recording is saved',
          'You can revoke it anytime in Settings',
        ].map((t,i)=>(
          <div key={i} style={{ background:OB.card, border:`1px solid ${OB.hair}`, borderRadius:12, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, fontSize:14, color:OB.ink }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F8A5B" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12l5 5 9-10"/></svg>
            {t}
          </div>
        ))}
      </div>
      <div style={{ padding:'22px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <OnbBigBtn onClick={()=>setShowSheet(true)}>Continue</OnbBigBtn>
        <OnbBigBtn secondary onClick={()=>go('onb_login')}>Not now</OnbBigBtn>
      </div>

      {showSheet && (
        <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:10 }}>
          <div style={{ width:280, background:'rgba(244,244,247,.96)', borderRadius:14, overflow:'hidden', backdropFilter:'blur(20px)' }}>
            <div style={{ padding:'20px 18px 16px', textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:600, color:'#000', marginBottom:6 }}>"Robot" Would Like to Access the Microphone</div>
              <div style={{ fontSize:13, color:'#3a3a3c', lineHeight:1.4 }}>So your child can speak with Robot during voice lessons.</div>
            </div>
            <div style={{ display:'flex', borderTop:'0.5px solid rgba(0,0,0,.18)' }}>
              <button onClick={(e)=>{e.stopPropagation(); setShowSheet(false); go('onb_login');}} style={{
                flex:1, padding:'12px 0', border:'none', borderRight:'0.5px solid rgba(0,0,0,.18)', background:'transparent',
                color:'#0a84ff', fontFamily:'inherit', fontSize:16, fontWeight:400, cursor:'pointer',
              }}>Don't Allow</button>
              <button onClick={(e)=>{e.stopPropagation(); setShowSheet(false); go('onb_login');}} style={{
                flex:1, padding:'12px 0', border:'none', background:'transparent',
                color:'#0a84ff', fontFamily:'inherit', fontSize:16, fontWeight:600, cursor:'pointer',
              }}>Allow</button>
            </div>
          </div>
        </div>
      )}
    </OnbShell>
  );
}
