import React from 'react';
import Robot from '@/design-system/components/Robot';
import SpeechBubble from '@/design-system/components/SpeechBubble';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';

export default function LessonDetailPage({ go, robotProps }){
  return (
    <PageScroll bg="linear-gradient(180deg, var(--cream) 0%, var(--cream-2) 100%)">
      <PageHeader
        onBack={()=>go('unit')}
        subtitle="Lesson 3"
        title="How are you?"
      />
      <div style={{ padding:'8px 24px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <Robot emotion="greet" size={170} {...robotProps}/>
        <SpeechBubble>We'll learn to ask and answer "How are you?"</SpeechBubble>
      </div>

      {/* what's inside */}
      <div style={{ padding:'4px 24px 16px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>Today you'll practice</div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { icon:'👂', title:'Listen to Robot', n:5 },
            { icon:'🎤', title:'Say it back', n:5 },
            { icon:'🎮', title:'Play a word game', n:1 },
          ].map((a,i)=>(
            <div key={i} style={{
              background:'#fff', borderRadius:18, padding:'14px',
              display:'flex', alignItems:'center', gap:14,
              boxShadow:'0 2px 6px rgba(0,0,0,.05)',
            }}>
              <div style={{
                width:44, height:44, borderRadius:14, background:'var(--cream-2)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0
              }}>{a.icon}</div>
              <div style={{ flex:1, fontFamily:'var(--display)', fontWeight:700, fontSize:17, color:'var(--ink)' }}>{a.title}</div>
              <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>×{a.n}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'10px 24px 12px', display:'flex', alignItems:'center', justifyContent:'center', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>
          <span style={{fontSize:18}}>⏱️</span> ~5 min
        </div>
        <div style={{ width:4, height:4, background:'rgba(0,0,0,.2)', borderRadius:2 }}/>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>
          <span style={{fontSize:18}}>⭐</span> +20 stars
        </div>
      </div>

      <div style={{ padding:'8px 24px 30px' }}>
        <PrimaryCTA onClick={()=>go('lesson_ready')} color="var(--coral)" icon={<span style={{fontSize:26}}>▶</span>}>Start Lesson</PrimaryCTA>
      </div>
    </PageScroll>
  );
}
