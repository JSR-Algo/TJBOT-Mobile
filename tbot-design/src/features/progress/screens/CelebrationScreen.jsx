import React from 'react';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function CelebrationPage({ go, robotProps }){
  return (
    <PageScroll bg="linear-gradient(180deg, var(--sun) 0%, #FFD9B0 50%, var(--cream-2) 100%)">
      {/* confetti */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        {Array.from({length:24}).map((_,i)=>{
          const colors = ['var(--coral)','var(--mint)','var(--sky)','#fff','var(--plum)'];
          return (
            <div key={i} style={{
              position:'absolute',
              left:`${(i*37)%100}%`, top:`${(i*17)%80}%`,
              width: 10+(i%3)*4, height: 14+(i%4)*3,
              background: colors[i%colors.length],
              borderRadius: i%2? 4: 50,
              transform:`rotate(${i*23}deg)`,
              animation:`bot-bob ${1.6+(i%5)*0.3}s ease-in-out ${(i*0.07)%1.2}s infinite`,
              opacity:.85,
            }}/>
          );
        })}
      </div>

      <div style={{ position:'relative', padding:'80px 24px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:'var(--t-hero)', color:'var(--ink)', textAlign:'center', lineHeight:1, textShadow:'0 2px 0 rgba(255,255,255,.3)' }}>You did it!</div>
        <Robot emotion="success" size={240} accent="var(--coral)" {...robotProps}/>
        <div style={{
          background:'rgba(255,255,255,.85)', backdropFilter:'blur(8px)',
          padding:'14px 22px', borderRadius:22,
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, color:'var(--ink)',
          textAlign:'center', maxWidth:300, lineHeight:1.3,
        }}>
          You finished today's lesson.<br/>Great effort speaking out loud!
        </div>

        {/* sticker reward */}
        <div style={{
          marginTop:6, background:'#fff', borderRadius:24, padding:'14px 18px',
          display:'flex', alignItems:'center', gap:14, boxShadow:'0 4px 0 rgba(0,0,0,.06), 0 12px 26px rgba(0,0,0,.08)'
        }}>
          <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--coral-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36 }}>🌟</div>
          <div>
            <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1 }}>New sticker</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:18, color:'var(--ink)' }}>Brave Speaker</div>
          </div>
        </div>
      </div>

      <div style={{ position:'relative', padding:'24px 24px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('home_hub_idle')} color="var(--coral)">Back to Robot Home</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('review_needed');}} style={{
          background:'rgba(255,255,255,.7)', border:'none', color:'var(--ink)',
          minHeight:56, borderRadius:'var(--r-button)',
          fontFamily:'var(--display)', fontWeight:700, fontSize:18, cursor:'pointer'
        }}>Practice review words</button>
      </div>
    </PageScroll>
  );
}
