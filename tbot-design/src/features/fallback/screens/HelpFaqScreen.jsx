import React from 'react';

export default function HelpFaqPage({ go }){
  const faqs = [
    { q:'Is my child\'s voice recorded?', a:'No. Voice is processed in real time and not stored. We don\'t keep audio or transcripts.' },
    { q:'Why does the app need a microphone?', a:'Speaking practice is the core of Robot English. The mic only turns on during a lesson.' },
    { q:'My child is shy — will the robot wait?', a:'Yes. The robot uses gentle prompts and never penalizes silence. Children can pause anytime.' },
    { q:'How long is a lesson?', a:'About 5–8 minutes. You can change the lesson length in Parent Settings.' },
    { q:'Can my child play offline?', a:'Voice lessons need a connection. Review games for known words work offline.' },
    { q:'How do I cancel my subscription?', a:'Open Parent Space → Settings → Subscription → Manage billing.' },
  ];
  const [open, setOpen] = React.useState(0);
  return (
    <ParentScroll title="Help & FAQ" onBack={()=>go('parent_summary')}>
      <div style={{ padding:'14px 16px 4px' }}>
        <input placeholder="Search help…" style={{
          width:'100%', padding:'12px 14px', border:`1px solid ${PA.hair}`, borderRadius:10,
          background:PA.card, fontSize:15, fontFamily:'inherit', color:PA.ink,
        }}/>
      </div>
      <div style={{ padding:'12px 16px' }}>
        <div style={{ background:PA.card, borderRadius:14, border:`1px solid ${PA.hair}`, overflow:'hidden' }}>
          {faqs.map((f, i)=>{
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderBottom: i===faqs.length-1? 'none' : `1px solid ${PA.hair}` }}>
                <button onClick={()=>setOpen(isOpen? -1 : i)} style={{
                  width:'100%', textAlign:'left', background:'transparent', border:'none',
                  padding:'14px 14px', display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer',
                }}>
                  <span style={{ flex:1, fontSize:15, fontWeight:500, color:PA.ink, lineHeight:1.35, fontFamily:'inherit' }}>{f.q}</span>
                  <span style={{ fontSize:14, color:PA.ink3, marginTop:1, transform: isOpen? 'rotate(180deg)':'none', transition:'transform .15s' }}>⌄</span>
                </button>
                {isOpen && (
                  <div style={{ padding:'0 14px 14px', fontSize:14, color:PA.ink2, lineHeight:1.5 }}>{f.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <PRowGroup header="Still need help?">
        <PRow icon="✉" label="Contact support" chevron/>
        <PRow icon="📄" label="Open user guide" chevron isLast/>
      </PRowGroup>
      <div style={{ height:24 }}/>
    </ParentScroll>
  );
}
