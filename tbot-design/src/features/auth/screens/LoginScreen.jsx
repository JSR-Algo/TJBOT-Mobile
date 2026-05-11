import React from 'react';
import OnbShell, { OB } from '@/components/OnbShell';
import OnbBigBtn from '@/components/OnbBigBtn';

export default function LoginPage({ go }){
  const [mode, setMode] = React.useState('signup');
  return (
    <OnbShell title="Parent account" onBack={()=>go('onb_mic')}>
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.3, color:OB.ink, marginBottom:6 }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </div>
        <div style={{ fontSize:14, color:OB.ink2, lineHeight:1.5 }}>
          We use your account to save progress and manage privacy.
        </div>
      </div>
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ display:'flex', background:'rgba(0,0,0,.06)', borderRadius:10, padding:3 }}>
          {[{id:'signup',label:'Sign up'},{id:'login',label:'Log in'}].map(t=>(
            <button key={t.id} onClick={(e)=>{e.stopPropagation(); setMode(t.id);}} style={{
              flex:1, padding:'9px 0', border:'none', borderRadius:8, fontFamily:'inherit', fontSize:14, fontWeight:600, cursor:'pointer',
              background: mode===t.id? '#fff':'transparent', color: mode===t.id? OB.ink : OB.ink2,
              boxShadow: mode===t.id? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:'20px 20px 0', display:'flex', flexDirection:'column', gap:10 }}>
        <button onClick={(e)=>{e.stopPropagation(); go('onb_child');}} style={{
          width:'100%', minHeight:48, borderRadius:10, border:`1px solid ${OB.hair}`, background:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer',
          fontFamily:'inherit', fontSize:15, fontWeight:500, color:OB.ink,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4c-.2 1.3-1 2.4-2 3.1v2.6h3.3c1.9-1.7 3-4.3 3-7.5z"/><path fill="#34A853" d="M12 22c2.7 0 5-1 6.6-2.4l-3.3-2.6c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.5-4H3.2v2.6C4.8 19.8 8.1 22 12 22z"/><path fill="#FBBC05" d="M6.5 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.2C2.4 8.8 2 10.4 2 12s.4 3.2 1.2 4.6L6.5 14z"/><path fill="#EA4335" d="M12 5.8c1.4 0 2.7.5 3.7 1.4l2.8-2.8C16.9 2.9 14.7 2 12 2 8.1 2 4.8 4.2 3.2 7.4L6.5 10c.8-2.3 3-4 5.5-4z"/></svg>
          Continue with Google
        </button>
        <button onClick={(e)=>{e.stopPropagation(); go('onb_child');}} style={{
          width:'100%', minHeight:48, borderRadius:10, border:'none', background:'#000',
          display:'flex', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer',
          fontFamily:'inherit', fontSize:15, fontWeight:500, color:'#fff',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M16.4 1.5c-1 .1-2.2.7-2.9 1.6-.6.7-1.1 1.8-1 2.9 1.1.1 2.2-.5 2.9-1.4.7-.8 1.1-1.9 1-3.1zm3.3 6.7c-.1.1-1.7 1-1.7 3 0 2.3 2 3.1 2.1 3.1 0 .1-.3 1.2-1.1 2.4-.6 1-1.3 2-2.4 2-1 0-1.4-.7-2.6-.7-1.3 0-1.7.7-2.6.7-1.1 0-1.9-1-2.6-2C7.5 14.7 6.4 11 7.7 8.5c.6-1.2 1.8-2 3.1-2 1 0 2 .7 2.6.7.6 0 1.7-.8 2.9-.7.5 0 2 .2 2.9 1.7z"/></svg>
          Continue with Apple
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 0', color:OB.ink3, fontSize:12 }}>
          <div style={{ flex:1, height:1, background:OB.hair }}/>or<div style={{ flex:1, height:1, background:OB.hair }}/>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <input placeholder="Email" style={{ width:'100%', padding:'14px 14px', border:`1px solid ${OB.hair}`, borderRadius:10, fontFamily:'inherit', fontSize:15, background:'#fff' }}/>
          <input placeholder="Password" type="password" style={{ width:'100%', padding:'14px 14px', border:`1px solid ${OB.hair}`, borderRadius:10, fontFamily:'inherit', fontSize:15, background:'#fff' }}/>
        </div>
      </div>

      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <OnbBigBtn onClick={()=>go(mode==='login' ? 'onb_login_error' : 'onb_child')}>{mode === 'signup' ? 'Create account' : 'Log in'}</OnbBigBtn>
        <div style={{ textAlign:'center', fontSize:11, color:OB.ink3, lineHeight:1.5 }}>
          By continuing you agree to our <span style={{ color:OB.accent }}>Terms</span> and <span style={{ color:OB.accent }}>Privacy Policy</span>.
        </div>
      </div>
    </OnbShell>
  );
}
