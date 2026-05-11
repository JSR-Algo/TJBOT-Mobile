import React from 'react';
import DvShell from '@/components/DeviceShell';
import { DV } from '@/components/Device-tokens';

export default function PairWifiPage({ go }){
  return (
    <DvShell title="Connect to Wi-Fi" onBack={()=>go('dv_pair_code')}>
      <div style={{ padding:'18px 20px 0' }}>
        <div style={{ background:'#EEF1F5', borderRadius:12, padding:'12px 14px', fontSize:13, color:DV.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          <b style={{ color:DV.ink }}>Why Wi-Fi?</b> Robot uses your home Wi-Fi to fetch lessons and run voice. Without it, lessons can't play.
        </div>
      </div>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:DV.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Networks nearby</div>
        <div style={{ background:DV.card, border:`1px solid ${DV.hair}`, borderRadius:12, overflow:'hidden' }}>
          {[
            { name:'Casa-Familia', strength:3, sel:true, lock:true },
            { name:'Casa-Familia-5G', strength:3, lock:true },
            { name:'Vecino', strength:2, lock:true },
            { name:'BT-Hub-7', strength:1, lock:true },
          ].map((n,i,a)=>(
            <button key={n.name} onClick={(e)=>{e.stopPropagation(); go('dv_pair_wifi_pw');}} style={{
              width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 14px',
              background: n.sel? '#E8F0FE':'transparent', border:'none',
              borderBottom: i<a.length-1? `1px solid ${DV.hair}`:'none', cursor:'pointer', textAlign:'left',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={DV.ink} strokeWidth="1.6" strokeLinecap="round">
                <path d="M5 12.55a11 11 0 0114 0" opacity={n.strength>=2?1:0.25}/>
                <path d="M8.5 16.5a7 7 0 017 0" opacity={n.strength>=1?1:0.25}/>
                <path d="M12 20l.01 0"/>
                <path d="M2 8.82a15 15 0 0120 0" opacity={n.strength>=3?1:0.25}/>
              </svg>
              <div style={{ flex:1, fontSize:15, color:DV.ink }}>{n.name}</div>
              {n.lock && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={DV.ink3} strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding:'12px 20px 0' }}>
        <button style={{ background:'transparent', border:'none', fontSize:14, color:DV.accent, fontFamily:'inherit', cursor:'pointer', fontWeight:500, padding:6 }}>Other network…</button>
      </div>
      <div style={{ height:30 }}/>
    </DvShell>
  );
}
