import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import { PR } from '../components/tokens';
import PRStepTab from '../components/PRStepTab';
import PRChip from '../components/PRChip';

export default function FirstCoursePage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="One more step">
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={2} total={3}/>
      </div>
      <div style={{ padding:'24px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ background:'#0E1116', borderRadius:14, padding:8 }}>
          <LCDFace emotion="happy" size={150} accent={accent}/>
        </div>
        <div style={{ marginTop:14 }}><PRChip color={PR.good} bg="#E6F4EE">Robot · activated</PRChip></div>
        <div style={{ marginTop:14, fontSize:24, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textAlign:'center', textWrap:'pretty', lineHeight:1.2 }}>
          Add your first course
        </div>
        <div style={{ marginTop:8, fontSize:13, color:PR.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Hello Friends comes free with your Robot. We'll send it to the device now.
        </div>
      </div>

      {/* Free starter card */}
      <div style={{ padding:'22px 16px 0' }}>
        <div style={{ background:PR.card, border:`2px solid ${PR.accent}`, borderRadius:14, padding:'14px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
          <div style={{ background:'#0E1116', borderRadius:10, padding:6, flexShrink:0 }}>
            <LCDFace emotion="happy" size={64} accent={accent}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
              <PRChip color={PR.good} bg="#E6F4EE">Free with Robot</PRChip>
              <span style={{ fontSize:11, color:PR.ink3 }}>Ages 4–6</span>
            </div>
            <div style={{ fontSize:15, fontWeight:600, color:PR.ink }}>Hello Friends</div>
            <div style={{ fontSize:12, color:PR.ink2, marginTop:3, lineHeight:1.4, textWrap:'pretty' }}>
              Greetings, names, family, and feelings. 24 lessons of warm play.
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:8 }}>
              {['Greetings','Names','Family','Feelings'].map(t=>(
                <span key={t} style={{ background:'#EEF1F5', color:PR.ink2, fontSize:10, fontWeight:600, padding:'3px 7px', borderRadius:6 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:PR.warm, borderRadius:12, padding:'12px 14px', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
          Browse more courses anytime in <b style={{ color:PR.ink }}>Course Library</b>.
        </div>
      </div>

      <div style={{ padding:'24px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('cl_added')}>Send Hello Friends to Robot</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('cl_library')}>Explore the library first</DvBigBtn>
      </div>
    </DvShell>
  );
}
