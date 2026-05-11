import React from 'react';
import LCDFace from '@/design-system/components/LCDFace';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import { RM } from '../components/styles';

export default function RobotStoragePage({ go, tweaks }){
  const courses = [
    { t:'Hello Friends', s:'24 lessons · all downloaded', size:'420 MB', emo:'happy' },
    { t:'Animals', s:'18 lessons · all downloaded', size:'380 MB', emo:'curious' },
    { t:'Yummy Words', s:'20 lessons · syncing 12 of 20', size:'410 MB', emo:'thinking', syncing:true },
  ];
  const used = 1.21, total = 4.0;
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Courses on Robot" onBack={()=>go('rm_my_robot')}>
      {/* Storage gauge */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'16px 16px' }}>
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5 }}>Storage</div>
            <div style={{ fontSize:13, color:RM.ink2 }}><b style={{ color:RM.ink }}>{used} GB</b> of {total} GB used</div>
          </div>
          <div style={{ display:'flex', height:10, borderRadius:6, overflow:'hidden', background:'#EEF1F5' }}>
            <div style={{ width:'30%', background:'#9BC2EB' }}/>
            <div style={{ width:'27%', background:'#B8D4A6' }}/>
            <div style={{ width:'29%', background:'#E5C56F' }}/>
          </div>
          <div style={{ display:'flex', gap:14, marginTop:10, fontSize:11, color:RM.ink2 }}>
            <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#9BC2EB', marginRight:5 }}/>Hello Friends</span>
            <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#B8D4A6', marginRight:5 }}/>Animals</span>
            <span><span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#E5C56F', marginRight:5 }}/>Yummy Words</span>
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Installed</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {courses.map(c=>(
            <div key={c.t} style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'12px 12px', display:'flex', gap:12, alignItems:'center' }}>
              <div style={{ background:'#0E1116', borderRadius:8, padding:4, flexShrink:0 }}>
                <LCDFace emotion={c.emo} size={48} accent={accent}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>{c.t}</div>
                <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>{c.s}</div>
                {c.syncing && (
                  <div style={{ marginTop:6, height:4, borderRadius:2, background:'#EEF1F5', overflow:'hidden' }}>
                    <div style={{ width:'60%', height:'100%', background:RM.accent, borderRadius:2 }}/>
                  </div>
                )}
              </div>
              <div style={{ fontSize:11, color:RM.ink3, fontVariantNumeric:'tabular-nums' }}>{c.size}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔄" title="Sync now" body="Check for new lessons in your courses"/>
          <DvRow icon="📚" title="Browse Course Library" body="Add or remove courses" onClick={()=>go('cl_library')}/>
        </div>
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}
