import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvBigBtn from '@/components/DeviceBigBtn';
import CL from '../components/CL';
import COURSES from '../components/courses';

export default function BuyCoursePage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  const c = COURSES[2];
  const [plan, setPlan] = React.useState('library'); // 'library' | 'single'
  return (
    <DvShell title="Add Yummy Words" onBack={()=>go('cl_detail')}>
      <div style={{ padding:'14px 20px 0', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ background:'#FFF4D9', color:'#8A6A12', fontSize:11, fontWeight:700, padding:'4px 9px', borderRadius:999, display:'inline-flex', alignItems:'center', gap:6 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
          For parents only
        </div>
      </div>

      {/* Course summary tile */}
      <div style={{ padding:'14px 16px 0' }}>
        <div style={{ background:CL.card, border:`1px solid ${CL.hair}`, borderRadius:14, padding:'12px 12px', display:'flex', gap:12, alignItems:'center' }}>
          <div style={{ background:'#0E1116', borderRadius:10, padding:6, flexShrink:0 }}>
            <LCDFace emotion={c.lcd} size={64} accent={accent}/>
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:CL.ink }}>{c.title}</div>
            <div style={{ fontSize:12, color:CL.ink2, marginTop:2 }}>{c.lessons} lessons · {c.weeks} weeks</div>
          </div>
        </div>
      </div>

      {/* Plan picker */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:CL.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Choose a plan</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            { id:'library', tag:'Best for families', title:'All Courses', body:'Every course, now and future, on your Robot.', price:'$8.99', period:'/ month', cancel:'Cancel anytime · 7-day free trial' },
            { id:'single', tag:'One-time', title:'Just this course', body:'Yummy Words only, yours forever.', price:'$24', period:'one-time', cancel:'No subscription' },
          ].map(p=>{
            const sel = plan===p.id;
            return (
              <button key={p.id} onClick={(e)=>{e.stopPropagation(); setPlan(p.id);}} style={{
                background: sel ? '#E8F0FE' : CL.card, border: sel ? `2px solid ${CL.accent}` : `1px solid ${CL.hair}`,
                borderRadius:14, padding:'14px 14px', cursor:'pointer', textAlign:'left' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:CL.accent, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{p.tag}</div>
                    <div style={{ fontSize:15, fontWeight:600, color:CL.ink }}>{p.title}</div>
                    <div style={{ fontSize:12, color:CL.ink2, lineHeight:1.4, marginTop:2, textWrap:'pretty' }}>{p.body}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:18, fontWeight:700, color:CL.ink }}>{p.price}</div>
                    <div style={{ fontSize:11, color:CL.ink2 }}>{p.period}</div>
                  </div>
                </div>
                <div style={{ fontSize:11, color:CL.ink3, marginTop:8 }}>{p.cancel}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Promise */}
      <div style={{ padding:'18px 20px 0', fontSize:12, color:CL.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Your child <b style={{ color:CL.ink }}>never sees prices or buy buttons</b> — only courses you've added to Robot.
      </div>

      {/* CTA */}
      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_unlock_confirm')}>Confirm & continue</DvBigBtn>
        <button onClick={(e)=>{e.stopPropagation(); go('cl_detail');}} style={{ background:'transparent', border:'none', fontSize:14, color:CL.accent, fontFamily:'inherit', cursor:'pointer', fontWeight:500, padding:8 }}>Not now</button>
      </div>
    </DvShell>
  );
}
