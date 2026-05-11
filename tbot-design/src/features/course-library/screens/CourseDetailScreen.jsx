import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import CL from '../components/CL';
import COURSES from '../components/courses';
import CLChip from '../components/CLChip';

export default function CourseDetailPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const c = COURSES[2]; // "Yummy Words" — not_installed (best for showing add CTA)
  return (
    <DvShell title="Course details" onBack={()=>go('cl_library')}>
      {/* Hero */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, overflow:'hidden' }}>
          <div style={{ background:'#0E1116', padding:'18px 16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <LCDFace emotion={c.lcd} size={140} accent={accent}/>
          </div>
          <div style={{ padding:'14px 14px 16px' }}>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
              <CLChip state={c.state}/>
              <div style={{ fontSize:11, color:CL.ink3 }}>Ages {c.ages} · {c.level}</div>
            </div>
            <div style={{ fontSize:20, fontWeight:600, color:CL.ink, letterSpacing:-0.2 }}>{c.title}</div>
            <div style={{ fontSize:13, color:CL.ink2, marginTop:6, lineHeight:1.5, textWrap:'pretty' }}>{c.blurb}</div>
          </div>
        </div>
      </div>

      {/* What Robot teaches */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>What Robot will teach</div>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'4px 4px' }}>
          {c.teaches.map((t, i, a)=>(
            <div key={t} style={{ display:'flex', gap:12, alignItems:'center', padding:'12px 14px',
              borderBottom: i<a.length-1? `1px solid ${CL.hair}`:'none' }}>
              <div style={{ width:28, height:28, borderRadius:8, background:'#EEF1F5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14 }}>
                {['🗣️','🎯','💛','🔢'][i % 4]}
              </div>
              <div style={{ fontSize:14, color:CL.ink }}>{t}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding:'20px 16px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {[
          { v:c.lessons, l:'Lessons' },
          { v:`${c.weeks}w`, l:'Pace' },
          { v:'4 min', l:'Per day' },
        ].map(s=>(
          <div key={s.l} style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:700, color:CL.ink }}>{s.v}</div>
            <div style={{ fontSize:11, color:CL.ink2, marginTop:2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* What it's NOT */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:'#F8F6F1', borderRadius:12, padding:'12px 14px', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          <b style={{ color:CL.ink }}>A note for parents.</b> This course is gentle daily play, not a test. We don't promise quick results — we focus on warm, repeated practice.
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_buy')}>Add to Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('cl_library')}>Back to library</DvBigBtn>
      </div>
    </DvShell>
  );
}
