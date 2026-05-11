import React from 'react';
import LCDFace, { LCD_STATES_LIST } from '@/design-system/components/LCDFace';
import { DV } from '@/components/Device-tokens';

export default function LCDLibraryPage({ tweaks, robotProps }){
  const accent = tweaks?.accent || '#FF6F61';
  const groups = ['Conversation','Feedback','System','Safety','Lifecycle'];
  const groupColors = {
    Conversation:'#6FC1FF', Feedback:'#7BD389', System:'#E8A33C', Safety:'#9B8FB8', Lifecycle:'#FF6F61',
  };
  return (
    <div style={{ height:'100%', overflow:'auto', background:DV.bg, color:DV.ink,
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif', WebkitFontSmoothing:'antialiased' }}>
      {/* Header */}
      <div style={{ padding:'56px 20px 18px', borderBottom:`1px solid ${DV.hair}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>Robot · LCD face system</div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.4, lineHeight:1.15, color:DV.ink, textWrap:'pretty' }}>
          20 faces, one warm character.
        </div>
        <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.5, marginTop:6, textWrap:'pretty' }}>
          Designed for a 3.2&quot; / 320×240 LCD. Bold features, no small text, readable at 1–2 m. No anger, no red Xs, no scary warnings.
        </div>
      </div>

      {/* Design rules strip */}
      <div style={{ padding:'14px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { t:'Eyes carry feeling', b:'Shape changes do most of the work — happy arcs, soft circles, droopy curves.' },
          { t:'Cheeks = warmth', b:'Soft coral cheeks appear in friendly states, hide in serious ones.' },
          { t:'Color cues, not text', b:'Coral = listen, green = heard, yellow = wait, lavender = pause.' },
          { t:'Animation tells state', b:'Bob, blink, tilt, ring-pulse — each motion has one meaning.' },
        ].map((r,i)=>(
          <div key={i} style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:10, padding:'10px 12px' }}>
            <div style={{ fontSize:12, fontWeight:600, color:DV.ink }}>{r.t}</div>
            <div style={{ fontSize:11, color:DV.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{r.b}</div>
          </div>
        ))}
      </div>

      {/* Face grid by group */}
      {groups.map(g=>{
        const items = LCD_STATES_LIST.filter(s=>s.group===g);
        if (!items.length) return null;
        return (
          <div key={g} style={{ padding:'22px 16px 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 4px 10px' }}>
              <span style={{ width:10, height:10, borderRadius:5, background:groupColors[g] }}/>
              <div style={{ fontSize:11, fontWeight:700, color:DV.ink2, textTransform:'uppercase', letterSpacing:0.6 }}>{g}</div>
              <div style={{ flex:1, height:1, background:DV.hair }}/>
              <div style={{ fontSize:11, color:DV.ink3 }}>{items.length}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:10 }}>
              {items.map(s => (
                <div key={s.id} style={{ background:DV.card, borderRadius:14, border:`1px solid ${DV.hair}`, overflow:'hidden' }}>
                  <div style={{ background:'#0E1116' }}>
                    <LCDFace emotion={s.id} size={300} accent={accent}/>
                  </div>
                  <div style={{ padding:'12px 14px 14px' }}>
                    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                      <div style={{ fontSize:15, fontWeight:600, color:DV.ink }}>{s.label}</div>
                      <div style={{ fontSize:10, fontFamily:'ui-monospace, monospace', color:DV.ink3 }}>{s.id}</div>
                    </div>
                    <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:groupColors[g], background: groupColors[g]+'22', padding:'3px 7px', borderRadius:8, textTransform:'uppercase', letterSpacing:0.4 }}>{g}</span>
                    </div>
                    <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.45, textWrap:'pretty', marginBottom:6 }}>
                      <b style={{ color:DV.ink }}>Animation.</b> {s.anim}
                    </div>
                    <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.45, textWrap:'pretty' }}>
                      <b style={{ color:DV.ink }}>Use.</b> {s.use}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Anti-patterns */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink2, textTransform:'uppercase', letterSpacing:0.6, padding:'4px 4px 8px' }}>Never do this</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {[
            { t:'No red Xs', b:'Use a soft "almost!" face with a kind smile. Wrong is part of learning.' },
            { t:'No furrowed-brow anger', b:'Robot is patient. Even off-topic redirects use a friendly tilt.' },
            { t:'No alarming warnings', b:'Safety pause uses lavender glow + shield-check, not red flashes.' },
            { t:'No tiny text on the LCD', b:'Anything text-shaped must be 24&nbsp;px+ at 1× and a known glyph (z, !, %).' },
          ].map((r,i,a)=>(
            <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none', alignItems:'flex-start' }}>
              <div style={{ width:22, height:22, borderRadius:6, background:'#F4E5DF', color:'#C0392B', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:700, fontSize:14 }}>×</div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:DV.ink }}>{r.t}</div>
                <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }} dangerouslySetInnerHTML={{__html:r.b}}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height:40 }}/>
    </div>
  );
}
