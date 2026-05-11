import React from 'react';
import DvShell from '@/components/DeviceShell';
import DvRow from '@/components/DeviceRow';
import { RM } from '../components/styles';

export default function RobotWifiPage({ go }){
  const [showOthers, setShowOthers] = React.useState(false);
  return (
    <DvShell title="Wi-Fi" onBack={()=>go('rm_my_robot')}>
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'18px 18px',
          display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:54, height:54, borderRadius:14, background:'#E6F4EE', color:RM.good, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 8.5a14 14 0 0120 0M5 12a10 10 0 0114 0M8 15.5a6 6 0 018 0M12 19h.01"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, color:RM.ink3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Connected to</div>
            <div style={{ fontSize:18, fontWeight:600, color:RM.ink, marginTop:2 }}>Casa-Familia</div>
            <div style={{ fontSize:12, color:RM.ink2, marginTop:2 }}>Strong signal · 5 GHz</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📡" title="Signal strength" body="Excellent · −48 dBm"/>
          <DvRow icon="⚡" title="Speed" body="Plenty for lessons"/>
          <DvRow icon="🌐" title="Robot's IP" body="192.168.1.42"/>
        </div>
      </div>

      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🔄" title="Switch network" body="Pick a different Wi-Fi" onClick={()=>setShowOthers(s=>!s)}/>
          <DvRow icon="🔑" title="Update password" body="If your Wi-Fi password changed"/>
          <DvRow icon="📲" title="Forget this network"/>
        </div>
      </div>

      {showOthers && (
        <div style={{ padding:'18px 16px 0' }}>
          <div style={{ fontSize:11, fontWeight:700, color:RM.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Other networks nearby</div>
          <div style={{ background:RM.card, border:`1px solid ${RM.hair}`, borderRadius:14, padding:'4px 4px' }}>
            {[['Casa-Guest','—'],['Linden 3B','—'],['Verizon-7K2','—']].map(([n,s])=>(
              <DvRow key={n} icon="📶" title={n} body={s}/>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding:'18px 16px 0', fontSize:12, color:RM.ink2, lineHeight:1.5, textWrap:'pretty' }}>
        Robot needs Wi-Fi only during lessons. It doesn't browse, stream, or talk to anyone outside our service.
      </div>

      <div style={{ height:30 }}/>
    </DvShell>
  );
}
