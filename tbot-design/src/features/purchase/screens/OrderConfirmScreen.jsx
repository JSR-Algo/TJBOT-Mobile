import React from 'react';
import { PR } from '../components/tokens';
import RobotHero from '../components/RobotHero';

export default function OrderConfirmPage({ go, tweaks }){
  const accent = tweaks?.accent || '#FF6F61';
  return (
    <DvShell title="Order placed">
      <div style={{ padding:'30px 24px 0', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#E6F4EE', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={PR.good} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>
        </div>
        <div style={{ marginTop:18, fontSize:26, fontWeight:600, color:PR.ink, letterSpacing:-0.4, textAlign:'center', textWrap:'pretty', lineHeight:1.15 }}>
          Thank you, Sarah
        </div>
        <div style={{ marginTop:8, fontSize:14, color:PR.ink2, textAlign:'center', maxWidth:300, lineHeight:1.5, textWrap:'pretty' }}>
          Robot is on its way. We'll send a setup nudge when it arrives — no rush.
        </div>
      </div>

      {/* Order tile */}
      <div style={{ padding:'24px 16px 0' }}>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', gap:12, alignItems:'center' }}>
          <RobotHero size={84} accent={accent} halo={false}/>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5 }}>Order #TB-48217</div>
            <div style={{ fontSize:14, fontWeight:600, color:PR.ink, marginTop:3 }}>Robot · Cream</div>
            <div style={{ fontSize:12, color:PR.ink2, marginTop:2 }}>Hello Friends starter course</div>
            <div style={{ fontSize:12, color:PR.ink2 }}>$149.00 · paid with Apple Pay</div>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Next</div>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="📦" title="Today" body="We're packing your order"/>
          <DvRow icon="🚚" title="Tue – Thu" body="Arrives at 247 Linden St · free shipping"/>
          <DvRow icon="🤖" title="When it arrives" body="Open the app — we'll guide setup in 5 minutes"/>
        </div>
      </div>

      <div style={{ padding:'20px 16px 0' }}>
        <div style={{ background:PR.warm, borderRadius:12, padding:'12px 14px', fontSize:12, color:PR.ink2, lineHeight:1.5, textWrap:'pretty' }}>
          We just emailed your receipt to <b style={{ color:PR.ink }}>sarah@example.com</b>.
        </div>
      </div>

      <div style={{ padding:'20px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_shipping')}>Track delivery</DvBigBtn>
        <DvBigBtn secondary onClick={()=>go('dv_home')}>Back to home</DvBigBtn>
      </div>
    </DvShell>
  );
}
