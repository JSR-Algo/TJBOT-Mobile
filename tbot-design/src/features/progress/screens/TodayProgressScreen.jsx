import React from 'react';
import Robot from '@/design-system/components/Robot';
import PageScroll from '@/design-system/components/PageScroll';
import PageHeader from '@/design-system/components/PageHeader';
import PrimaryCTA from '@/design-system/components/PrimaryCTA';

// shared chip (used only by this screen)
function StatChip({ icon, value, label, color='var(--coral)' }){
  return (
    <div style={{
      background:'#fff', borderRadius:24, padding:'18px 16px',
      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
      boxShadow:'0 2px 6px rgba(0,0,0,.05)',
      flex:1, minWidth:0,
    }}>
      <div style={{ width:48, height:48, borderRadius:16, background:color, color:'#fff',
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, marginBottom:4 }}>{icon}</div>
      <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:30, color:'var(--ink)', lineHeight:1 }}>{value}</div>
      <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:12, color:'var(--ink-soft)', textAlign:'center', textWrap:'pretty' }}>{label}</div>
    </div>
  );
}

export default function TodayProgressPage({ go, robotProps }){
  return (
    <PageScroll>
      <PageHeader
        onBack={()=>go('home_hub_idle')}
        subtitle="Today"
        title="You practiced speaking!"
      />
      <div style={{ padding:'4px 24px 14px', display:'flex', justifyContent:'center' }}>
        <Robot emotion="happy" size={170} {...robotProps}/>
      </div>
      <div style={{ padding:'4px 18px 14px', display:'flex', gap:10 }}>
        <StatChip icon="🎤" value="8" label="speaking turns" color="var(--coral)"/>
        <StatChip icon="📚" value="1" label="lesson done" color="var(--mint)"/>
        <StatChip icon="⭐" value="12" label="stars today" color="var(--sun)"/>
      </div>
      <div style={{ padding:'4px 18px 14px' }}>
        <div style={{ background:'#fff', borderRadius:22, padding:'16px 18px', boxShadow:'0 2px 6px rgba(0,0,0,.05)' }}>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:16, color:'var(--ink)', marginBottom:10 }}>This week</div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:8, height:90 }}>
            {['M','T','W','T','F','S','S'].map((d,i)=>{
              const v = [0.4,0.7,0.5,0.9,0.6,0,0][i];
              const today = i===3;
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <div style={{
                    width:'70%', height: v? `${v*100}%`:8,
                    background: today? 'var(--coral)': v? 'var(--mint)':'rgba(0,0,0,.06)',
                    borderRadius:8,
                  }}/>
                  <div style={{ fontFamily:'var(--body)', fontWeight:700, fontSize:12, color: today?'var(--coral)':'var(--ink-soft)' }}>{d}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:10, fontFamily:'var(--body)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>
            🔥 5-day streak — nice!
          </div>
        </div>
      </div>
      <div style={{ padding:'8px 24px 28px', display:'flex', flexDirection:'column', gap:10 }}>
        <PrimaryCTA onClick={()=>go('home_hub_idle')} color="var(--coral)">Back home</PrimaryCTA>
      </div>
    </PageScroll>
  );
}
