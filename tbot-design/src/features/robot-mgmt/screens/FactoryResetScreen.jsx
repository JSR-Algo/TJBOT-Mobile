import React from 'react';
import { RobotDevice } from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import DvBigBtn from '@/components/DeviceBigBtn';
import { RM } from '../components/styles';

export default function FactoryResetPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const [step, setStep] = React.useState('warning'); // warning | gate | confirm
  const [target] = React.useState(() => 100 + Math.floor(Math.random()*900));
  const [val, setVal] = React.useState('');
  const [shake, setShake] = React.useState(false);

  if (step === 'warning') {
    return (
      <DvShell title="Factory reset" onBack={()=>go('rm_my_robot')}>
        <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'#FBE6E2', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={RM.danger} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 17v.01"/><circle cx="12" cy="12" r="9"/></svg>
          </div>
          <div style={{ marginTop:18, fontSize:24, fontWeight:600, color:RM.ink, letterSpacing:-0.4, textAlign:'center' }}>
            This will erase your Robot
          </div>
          <div style={{ marginTop:8, fontSize:14, color:RM.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
            Use this only if you're giving Robot to someone else, or troubleshooting with our support team.
          </div>
        </div>

        <div style={{ padding:'24px 16px 0' }}>
          <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
            <DvRow icon="🤖" title="Robot will forget your Wi-Fi" body="And the pairing with this app"/>
            <DvRow icon="📚" title="Courses will be removed" body="They stay in your library and re-download anytime"/>
            <DvRow icon="🌱" title="Your child's progress is safe" body="Stored in your account, not on the device"/>
            <DvRow icon="🔄" title="Robot will restart" body="Setup takes about 5 minutes"/>
          </div>
        </div>

        <div style={{ padding:'18px 16px 0' }}>
          <div style={{ background:'#FBE6E2', borderRadius:12, padding:'12px 14px', fontSize:13, color:'#7B2A1F', lineHeight:1.5, textWrap:'pretty' }}>
            <b>Have you tried smaller fixes?</b> Restarting Robot or rejoining Wi-Fi often solves the problem without erasing anything.
          </div>
        </div>

        <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
          <DvBigBtn secondary onClick={()=>go('rm_offline_help')}>Try smaller fixes first</DvBigBtn>
          <DvBigBtn danger onClick={()=>setStep('gate')}>I understand · continue</DvBigBtn>
        </div>
      </DvShell>
    );
  }

  if (step === 'gate') {
    const onPress = (k)=>{
      if (k==='back') return setVal(v=>v.slice(0,-1));
      const next = (val + k).slice(0,3);
      setVal(next);
      if (next.length === 3) {
        if (parseInt(next,10) === target) setTimeout(()=>setStep('confirm'), 200);
        else { setShake(true); setTimeout(()=>{ setShake(false); setVal(''); }, 350); }
      }
    };
    return (
      <DvShell title="Parent gate" onBack={()=>setStep('warning')}>
        <div style={{ padding:'40px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
          <div style={{ fontSize:13, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Type this number</div>
          <div style={{ marginTop:14, fontSize:60, fontWeight:700, color:RM.ink, letterSpacing:1, fontVariantNumeric:'tabular-nums' }}>{target}</div>
          <div style={{ marginTop:24, display:'flex', gap:10, animation: shake? 'rm-shake 0.32s' : 'none' }}>
            {[0,1,2].map(i=>(
              <div key={i} style={{ width:46, height:56, borderRadius:10, background:RM.card,
                border:`2px solid ${val.length>i ? RM.accent : RM.hair}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, fontWeight:700, color:RM.ink, fontVariantNumeric:'tabular-nums' }}>
                {val[i] || ''}
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, fontSize:13, color: shake? RM.danger : RM.ink2, height:18 }}>
            {shake ? "Doesn't match. Try again." : 'This is just to keep little hands out.'}
          </div>
        </div>
        <div style={{ padding:'30px 24px 30px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10 }}>
            {[1,2,3,4,5,6,7,8,9,'',0,'back'].map((k, i)=>{
              if (k==='') return <div key={i}/>;
              const isBack = k==='back';
              return (
                <button key={i} onClick={(e)=>{e.stopPropagation(); onPress(isBack?'back':String(k));}} style={{
                  height:54, borderRadius:12, border:`1px solid ${RM.hair}`, background:RM.card,
                  fontSize:isBack?14:22, fontWeight:600, color:isBack?RM.ink2:RM.ink, cursor:'pointer', fontFamily:'inherit',
                }}>{isBack ? '⌫' : k}</button>
              );
            })}
          </div>
        </div>
        <style>{`@keyframes rm-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
      </DvShell>
    );
  }

  // confirm
  return (
    <DvShell title="Last check" onBack={()=>setStep('warning')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <RobotDevice emotion="gentle" size={150} accent={accent}/>
        <div style={{ marginTop:18, fontSize:22, fontWeight:600, color:RM.ink, letterSpacing:-0.3, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Erase Robot ROB-2A8F?
        </div>
        <div style={{ marginTop:8, fontSize:13, color:RM.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Robot will sleep, forget Wi-Fi, and need to be paired again.
        </div>
      </div>
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🛡️" title="Account & progress kept" body="Sign in again to restore everything"/>
          <DvRow icon="⏱️" title="Takes about 90 seconds"/>
        </div>
      </div>
      <div style={{ padding:'30px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn danger onClick={()=>go('rm_my_robot')}>Yes, erase Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('rm_my_robot')}>Cancel</DvBigBtn>
      </div>
    </DvShell>
  );
}
