import React from 'react';
import { PR } from '../components/tokens';
import PRStepTab from '../components/PRStepTab';

export default function CheckoutPage({ go }){
  return (
    <DvShell title="Checkout" onBack={()=>go('pr_privacy')}>
      <div style={{ padding:'18px 24px 0' }}>
        <PRStepTab step={2} total={3}/>
      </div>

      {/* Order summary */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Your order</div>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'14px 14px' }}>
          {[
            { t:'Robot device + Hello Friends course', s:'Includes dock & cable', p:'$149.00' },
            { t:'All Courses · monthly', s:'7-day free trial · cancel anytime', p:'$0.00' },
            { t:'Shipping', s:'Free · arrives in 3–5 business days', p:'Free' },
          ].map((r, i, a)=>(
            <div key={r.t} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom: i<a.length-1?`1px solid ${PR.hair}`:'none' }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:PR.ink }}>{r.t}</div>
                <div style={{ fontSize:11, color:PR.ink2, marginTop:2 }}>{r.s}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:PR.ink, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{r.p}</div>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', paddingTop:10, marginTop:6, borderTop:`1px solid ${PR.hair}` }}>
            <div style={{ fontSize:14, fontWeight:700, color:PR.ink }}>Today's total</div>
            <div style={{ fontSize:20, fontWeight:700, color:PR.ink, letterSpacing:-0.3 }}>$149.00</div>
          </div>
          <div style={{ fontSize:11, color:PR.ink2, marginTop:6, lineHeight:1.5, textWrap:'pretty' }}>
            Subscription begins after free trial. We email a reminder 2 days before.
          </div>
        </div>
      </div>

      {/* Ship to */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Ship to</div>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'14px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:PR.ink }}>Sarah Chen</div>
            <div style={{ fontSize:12, color:PR.ink2, marginTop:2, lineHeight:1.5 }}>247 Linden St · Apt 3B<br/>Brooklyn, NY 11215</div>
          </div>
          <button onClick={(e)=>e.stopPropagation()} style={{ background:'transparent', border:'none', color:PR.accent, fontWeight:600, fontSize:13, fontFamily:'inherit', cursor:'pointer' }}>Edit</button>
        </div>
      </div>

      {/* Payment */}
      <div style={{ padding:'18px 16px 0' }}>
        <div style={{ fontSize:11, fontWeight:700, color:PR.ink3, textTransform:'uppercase', letterSpacing:0.5, padding:'4px 4px 8px' }}>Payment</div>
        <div style={{ background:PR.card, border:`1px solid ${PR.hair}`, borderRadius:14, padding:'4px 4px' }}>
          <DvRow icon="🍎" title="Apple Pay" body="Touch ID · default" right={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PR.accent} strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill={PR.accent}/></svg>}/>
          <DvRow icon="💳" title="Card ending 4421" body="Visa · expires 12/27"/>
        </div>
      </div>

      <div style={{ padding:'18px 20px 6px', fontSize:11, color:PR.ink3, lineHeight:1.5, textWrap:'pretty', textAlign:'center' }}>
        30-day return · 2-year warranty · no auto-renew without notice
      </div>

      <div style={{ padding:'10px 20px 30px', display:'flex', flexDirection:'column', gap:10 }}>
        <DvBigBtn onClick={()=>go('pr_confirm')}>Place order · $149.00</DvBigBtn>
      </div>
    </DvShell>
  );
}
