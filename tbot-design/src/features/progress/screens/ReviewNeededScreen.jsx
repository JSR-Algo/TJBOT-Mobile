import React from 'react';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import SpeechBubble from '@/design-system/components/SpeechBubble';

export default function ReviewNeededPage({ go, robotProps }){
  const words = [
    { w:'Friend',  icon:'👫', when:'2 days ago' },
    { w:'Dog',     icon:'🐶', when:'3 days ago' },
    { w:'Morning', icon:'🌅', when:'5 days ago' },
  ];
  return (
    <PageScroll bg="linear-gradient(180deg, #FFE6BD 0%, var(--cream) 60%)">
      <PageHeader onBack={()=>go('home_hub_idle')} subtitle="A friendly nudge" title="Let's visit again"/>
      <div style={{ padding:'0 24px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <Robot emotion="curious" size={120} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>3 words miss you!</SpeechBubble>
      </div>
      <div style={{ padding:'4px 18px 16px', display:'flex', flexDirection:'column', gap:10 }}>
        {words.map(w=>(
          <div key={w.w} style={{
            background:'#fff', borderRadius:20, padding:'14px',
            display:'flex', alignItems:'center', gap:14,
            boxShadow:'0 2px 6px rgba(0,0,0,.05)',
          }}>
            <div style={{ width:54, height:54, borderRadius:18, background:'var(--cream-2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>{w.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:20, color:'var(--ink)' }}>{w.w}</div>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2, fontFamily:'var(--body)', fontWeight:700, fontSize:12, color:'var(--ink-soft)' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--sun)' }}/> Last seen {w.when}
              </div>
            </div>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--sun)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🌱</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'10px 24px 28px', display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--sun)" icon={<span style={{fontSize:26}}>▶</span>}>Practice together</PrimaryCTA>
        <button onClick={(e)=>{e.stopPropagation(); go('home_hub_idle');}} style={{
          background:'transparent', border:'none', color:'var(--ink-soft)',
          fontFamily:'var(--body)', fontWeight:700, fontSize:16, cursor:'pointer'
        }}>Maybe later</button>
      </div>
    </PageScroll>
  );
}
