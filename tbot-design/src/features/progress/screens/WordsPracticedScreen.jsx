import React from 'react';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

export default function WordsPracticedPage({ go, robotProps }){
  const stronger = [
    { w:'Hello', icon:'👋' },
    { w:'Cat',   icon:'🐱' },
    { w:'Happy', icon:'😊' },
  ];
  const visiting = [
    { w:'Friend', icon:'👫' },
    { w:'Dog',    icon:'🐶' },
  ];
  const Tile = ({ w, icon, strong }) => (
    <div style={{
      background:'#fff', borderRadius:20, padding:'14px',
      display:'flex', flexDirection:'column', gap:4, alignItems:'flex-start',
      boxShadow:'0 2px 6px rgba(0,0,0,.05)',
    }}>
      <div style={{ fontSize:34 }}>{icon}</div>
      <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:20, color:'var(--ink)' }}>{w}</div>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
        {strong ? (
          <>
            <div style={{ display:'flex', gap:2 }}>
              {[0,1,2].map(i=> <div key={i} style={{ width:14, height:6, borderRadius:3, background: i<2?'var(--mint)':'rgba(0,0,0,.1)'}}/>)}
            </div>
            <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'#1F8A5B' }}>stronger</span>
          </>
        ) : (
          <>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--sun)' }}/>
            <span style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:11, color:'#A06900' }}>visit again</span>
          </>
        )}
      </div>
    </div>
  );
  return (
    <PageScroll>
      <PageHeader onBack={()=>go('today_progress')} subtitle="Today" title="Words Practiced"/>
      <div style={{ padding:'0 24px 8px', display:'flex', alignItems:'center', gap:12 }}>
        <Robot emotion="happy" size={80} {...robotProps}/>
        <div style={{ background:'#fff', borderRadius:18, padding:'10px 14px', flex:1, fontFamily:'var(--display)', fontWeight:700, fontSize:14, color:'var(--ink)', boxShadow:'0 2px 6px rgba(0,0,0,.05)', textWrap:'pretty', lineHeight:1.3 }}>
          These words got stronger today.
        </div>
      </div>
      <div style={{ padding:'14px 18px 8px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>Stronger 💪</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {stronger.map(t=> <Tile key={t.w} {...t} strong/>)}
        </div>
      </div>
      <div style={{ padding:'14px 18px 14px' }}>
        <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:1.2, marginBottom:8 }}>Visit again soon 🌱</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {visiting.map(t=> <Tile key={t.w} {...t}/>)}
        </div>
      </div>
      <div style={{ padding:'10px 24px 28px' }}>
        <PrimaryCTA onClick={()=>go('review_needed')} color="var(--sun)">Practice 2 words</PrimaryCTA>
      </div>
    </PageScroll>
  );
}
