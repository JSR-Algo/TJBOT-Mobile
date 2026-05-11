import React from 'react';
import Robot from '@/design-system/components/Robot';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';

export default function ReviewEntryPage({ go, robotProps }){
  const words = ['Hello','Hi','Friend','Happy'];
  return (
    <PageScroll bg="linear-gradient(180deg, #FFE6BD 0%, var(--cream) 60%)">
      <PageHeader
        onBack={()=>go('home_hub_idle')}
        subtitle="Quick review"
        title="Words to revisit"
      />
      <div style={{ padding:'4px 24px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <Robot emotion="curious" size={170} accent="var(--sun)" {...robotProps}/>
        <SpeechBubble>4 words want to say hi again!</SpeechBubble>
      </div>

      <div style={{ padding:'10px 24px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {words.map((w,i)=>(
          <div key={w} style={{
            background:'#fff', borderRadius:20, padding:'18px 16px',
            display:'flex', flexDirection:'column', gap:6,
            boxShadow:'0 2px 6px rgba(0,0,0,.05)',
          }}>
            <div style={{ fontSize:34 }}>{['👋','🙋','👫','😊'][i]}</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, color:'var(--ink)' }}>{w}</div>
            <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'var(--body)', fontWeight:700, fontSize:12, color:'var(--ink-soft)' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--sun)'}}/> Practice
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding:'10px 24px 30px' }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--sun)" icon={<span style={{fontSize:26}}>▶</span>}>Start Review</PrimaryCTA>
      </div>
    </PageScroll>
  );
}
