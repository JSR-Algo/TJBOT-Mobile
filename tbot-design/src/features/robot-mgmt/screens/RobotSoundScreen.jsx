import React from 'react';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import { RM } from '../components/styles';

export default function RobotSoundPage({ go }){
  const [vol, setVol] = React.useState(6);
  const [chime, setChime] = React.useState(true);
  const [quiet, setQuiet] = React.useState(true);
  const [voice, setVoice] = React.useState('warm');

  const Toggle = ({ on, onChange }) => (
    <button onClick={(e)=>{e.stopPropagation(); onChange(!on);}} style={{
      width:46, height:26, borderRadius:13, background: on? RM.good:'#D5D5D5', border:'none', position:'relative', cursor:'pointer', flexShrink:0,
    }}>
      <span style={{ position:'absolute', top:2, left: on? 22:2, width:22, height:22, borderRadius:11, background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,.15)', transition:'left .15s' }}/>
    </button>
  );

  return (
    <DvShell title="Sound & volume" onBack={()=>go('rm_my_robot')}>
      {/* Volume slider */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'18px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, color:RM.ink }}>Robot's voice volume</div>
            <div style={{ fontSize:24, fontWeight:700, color:RM.ink, letterSpacing:-0.4, fontVariantNumeric:'tabular-nums' }}>{vol}<span style={{ fontSize:14, color:RM.ink3, fontWeight:500 }}>/10</span></div>
          </div>
          {/* segmented level */}
          <div style={{ display:'flex', gap:5 }}>
            {Array.from({length:10}).map((_, i)=>(
              <button key={i} onClick={(e)=>{e.stopPropagation(); setVol(i+1);}} style={{
                flex:1, height:36, borderRadius:6, border:'none', cursor:'pointer',
                background: i < vol ? RM.accent : '#EEF1F5',
              }}/>
            ))}
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:11, color:RM.ink3 }}>
            <span>Quiet</span><span>Living-room</span><span>Loud</span>
          </div>
        </div>
      </div>

      {/* Voice picker */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Robot's voice</div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { id:'warm',  t:'Warm',  s:'Friendly · default' },
            { id:'calm',  t:'Calm',  s:'Slower, softer' },
            { id:'bright',t:'Bright',s:'A little playful' },
          ].map(v=>{
            const sel = voice===v.id;
            return (
              <button key={v.id} onClick={(e)=>{e.stopPropagation(); setVoice(v.id);}} style={{
                flex:1, background: sel?'#E8F0FE':RM.card, border: sel? `2px solid ${RM.accent}` : `1px solid ${RM.hair}`,
                borderRadius:12, padding:'10px 8px', cursor:'pointer', textAlign:'center', fontFamily:'inherit',
              }}>
                <div style={{ fontSize:14, fontWeight:600, color:RM.ink }}>{v.t}</div>
                <div style={{ fontSize:11, color:RM.ink2, marginTop:2 }}>{v.s}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Sounds</div>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔔" title="Soft chimes" body="When a lesson starts and ends" right={<Toggle on={chime} onChange={setChime}/>}/>
          <DvRow icon="🌙" title="Quiet hours" body="9:00 PM – 7:00 AM · half volume" right={<Toggle on={quiet} onChange={setQuiet}/>}/>
          <DvRow icon="▶️" title="Play test sound" body="A 2-second chime, at current volume"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 30px', fontSize:12, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Robot's voice changes apply on the next lesson. Test sound plays now.
      </div>
    </DvShell>
  );
}
