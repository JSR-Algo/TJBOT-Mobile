import React from 'react';
import Robot from '@/design-system/components/Robot';
import ScreenShell from '@/components/ScreenShell';

export default function SplashPage({ go, robotProps }){
  React.useEffect(()=>{ const t = setTimeout(()=>go('onb_welcome'), 1700); return ()=>clearTimeout(t); }, []);
  return (
    <ScreenShell bg="linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)">
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:18 }}>
        <div style={{ animation:'splash-pop .9s cubic-bezier(.2,.8,.2,1)' }}>
          <Robot emotion="happy" size={220} {...robotProps}/>
        </div>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:48, color:'var(--ink)', letterSpacing:-0.5, animation:'splash-fade .6s ease .35s both' }}>Robot</div>
        <div style={{ fontFamily:'var(--body)', fontWeight:600, fontSize:15, color:'var(--ink-soft)', animation:'splash-fade .6s ease .55s both' }}>Voice English for kids</div>
      </div>
      <style>{`
        @keyframes splash-pop { 0% { transform:scale(.6); opacity:0 } 60% { transform:scale(1.06) } 100% { transform:scale(1); opacity:1 } }
        @keyframes splash-fade { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:none } }
      `}</style>
    </ScreenShell>
  );
}
