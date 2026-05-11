import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import { DV } from '@/components/Device-tokens';

export default function LCDLessonTurnPage({ tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const turn = [
    { id:'speak',       label:'1 · Robot speaks',       caption:'Mouth opens, gentle bob.',          words:'"Say… apple."',        ms:'~1.4 s' },
    { id:'listen',      label:'2 · Robot listens',      caption:'Coral ring breathes, mic open.',     words:'(silence — ear up)',    ms:'~3.0 s' },
    { id:'child_speak', label:'3 · Child speaks',       caption:'Green ring + ear bars bounce.',      words:'"Apple!"',              ms:'~1.2 s' },
    { id:'think',       label:'4 · Robot thinks',       caption:'Eyes look up, three dots pop.',      words:'(processing)',          ms:'~0.4 s' },
    { id:'success',     label:'5 · Robot celebrates',   caption:'Sparkles + green glow + big smile.', words:'"Yes! Apple!"',         ms:'~1.6 s' },
  ];
  return (
    <div style={{ height:'100%', overflow:'auto', background:DV.bg, color:DV.ink,
      fontFamily:'-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif' }}>
      <div style={{ padding:'56px 20px 16px', borderBottom:`1px solid ${DV.hair}` }}>
        <div style={{ fontSize:11, fontWeight:700, color:accent, textTransform:'uppercase', letterSpacing:0.6, marginBottom:6 }}>One lesson turn</div>
        <div style={{ fontSize:22, fontWeight:600, letterSpacing:-0.4, lineHeight:1.15 }}>
          Robot speaks → listens → child speaks → thinks → celebrates.
        </div>
        <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.5, marginTop:6, textWrap:'pretty' }}>
          The whole loop is about 8 seconds. Each face is unmistakable from across a room.
        </div>
      </div>

      {/* Timeline header */}
      <div style={{ padding:'18px 16px 8px' }}>
        <div style={{ position:'relative', height:24, marginBottom:14 }}>
          <div style={{ position:'absolute', top:11, left:0, right:0, height:2, background:DV.hair }}/>
          <div style={{ position:'absolute', top:11, left:0, width:'100%', height:2,
            background:`linear-gradient(90deg, #FFD66E 0%, ${accent} 25%, #7BD389 50%, #6FC1FF 70%, #7BD389 100%)`, borderRadius:2 }}/>
          {turn.map((t,i)=>(
            <div key={t.id} style={{ position:'absolute', top:0, left:`${(i/(turn.length-1))*100}%`, transform:'translateX(-50%)' }}>
              <div style={{ width:14, height:14, borderRadius:7, background:'#fff', border:`2px solid ${DV.ink}`, boxShadow:'0 1px 0 rgba(0,0,0,.04)' }}/>
            </div>
          ))}
        </div>
      </div>

      {/* Filmstrip */}
      <div style={{ padding:'4px 16px 0', display:'flex', flexDirection:'column', gap:14 }}>
        {turn.map((t,i)=>(
          <div key={t.id} style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, overflow:'hidden' }}>
            <div style={{ background:'#0E1116', position:'relative' }}>
              <LCDFace emotion={t.id} size={300} accent={accent}/>
              <div style={{ position:'absolute', top:8, left:10, fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', textTransform:'uppercase', letterSpacing:0.6, fontFamily:'ui-monospace, monospace' }}>frame · {i+1}/{turn.length}</div>
              <div style={{ position:'absolute', top:8, right:10, fontSize:10, fontWeight:700, color:'rgba(255,255,255,.6)', fontFamily:'ui-monospace, monospace' }}>{t.ms}</div>
            </div>
            <div style={{ padding:'12px 14px 14px' }}>
              <div style={{ fontSize:14, fontWeight:600, color:DV.ink }}>{t.label}</div>
              <div style={{ fontSize:13, color:DV.ink2, lineHeight:1.4, marginTop:3, textWrap:'pretty' }}>{t.caption}</div>
              <div style={{ marginTop:8, padding:'8px 10px', background:'#F5F5F2', borderRadius:8, fontSize:13, color:DV.ink, fontStyle:'italic', lineHeight:1.3 }}>{t.words}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Transitions notes */}
      <div style={{ padding:'22px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink2, textTransform:'uppercase', letterSpacing:0.6, padding:'4px 4px 8px' }}>Transitions</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {[
            { t:'speak → listen', b:'Mouth shrinks O → o; ring fades from yellow to coral over 200 ms.' },
            { t:'listen → child_speak', b:'Eyes pop wider; ring color + ear bars come in together within 100 ms of voice activity.' },
            { t:'child_speak → think', b:'Ear bars stop, eyes flick up, three dots pop in over 250 ms.' },
            { t:'think → success', b:'Eyes blend think→happy arcs; sparkles & green ring rise; mouth opens to big.' },
            { t:'didn\'t_hear / try_again', b:'Branch from listen if no audio after ~3 s — never punitive.' },
          ].map((r,i,a)=>(
            <div key={i} style={{ padding:'10px 12px', borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none' }}>
              <div style={{ fontSize:13, fontWeight:600, color:DV.ink, fontFamily:'ui-monospace, monospace' }}>{r.t}</div>
              <div style={{ fontSize:12, color:DV.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{r.b}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height:40 }}/>
    </div>
  );
}
