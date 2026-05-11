import React from 'react';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';

export default function LoginErrorPage({ go }){
  return (
    <OnbShell title="Sign in" onBack={()=>go('onb_login')}>
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:64, height:64, borderRadius:16, background:OB.dangerSoft, color:OB.danger,
          display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <div style={{ fontSize:20, fontWeight:600, letterSpacing:-0.3, color:OB.ink, textAlign:'center', marginBottom:6 }}>
          We couldn't sign you in
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5, textAlign:'center', maxWidth:300, textWrap:'pretty' }}>
          Email or password didn't match. Try again, or reset your password.
        </div>
      </div>

      <div style={{ padding:'24px 20px 0', display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ background:OB.card, border:`1px solid ${OB.danger}`, borderRadius:10, padding:'14px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={OB.danger} strokeWidth="2.4" strokeLinecap="round"><path d="M12 8v4M12 16h.01"/><circle cx="12" cy="12" r="10"/></svg>
          <input defaultValue="parent@example.com" style={{ flex:1, border:'none', outline:'none', fontFamily:'inherit', fontSize:15, background:'transparent', color:OB.ink }}/>
        </div>
        <div style={{ background:OB.card, border:`1px solid ${OB.danger}`, borderRadius:10, padding:'14px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={OB.danger} strokeWidth="2.4" strokeLinecap="round"><path d="M12 8v4M12 16h.01"/><circle cx="12" cy="12" r="10"/></svg>
          <input defaultValue="••••••••" type="password" style={{ flex:1, border:'none', outline:'none', fontFamily:'inherit', fontSize:15, background:'transparent', color:OB.ink }}/>
        </div>
        <div style={{ fontSize:13, color:OB.danger, padding:'4px 4px 0', display:'flex', alignItems:'center', gap:6 }}>
          Email or password is incorrect.
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <OnbBigBtn onClick={()=>go('onb_child')}>Try again</OnbBigBtn>
        <OnbBigBtn secondary onClick={()=>go('onb_login')}>Reset password</OnbBigBtn>
      </div>
    </OnbShell>
  );
}
