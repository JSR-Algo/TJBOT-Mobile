// Physical Robot LCD face system — designed for a 3.2" / 320×240 LCD.
// Bold facial expressions readable from 1-2m. NO small text. High contrast.
// Drives via emotion prop: idle, happy, listen, think, speak, success,
// celebrate, gentle, sleep, error, mic_off, charging, paired, heart.
// Uses pure SVG so it scales crisply at any preview size.

const LCD_W = 320, LCD_H = 240;

function LCDFace({ emotion='idle', size=320, bg='#0E1116', accent='#FF6F61', skin='#E8F4FF' }){
  // All faces drawn in 320x240 viewBox, scaled by `size`.
  const scale = size / LCD_W;
  const eyes = (kind, accentEye) => {
    const cx1=110, cx2=210, cy=120, r=28;
    const c = accentEye || '#0E1116'; // dark eyes on light skin face? we draw face panel as bg
    // We draw eyes as colored shapes on the LCD bg directly (no face circle).
    if (kind==='dot')      return (<g><circle cx={cx1} cy={cy} r="14" fill={skin}/><circle cx={cx2} cy={cy} r="14" fill={skin}/></g>);
    if (kind==='happy')    return (<g><path d={`M${cx1-22} ${cy+4} Q${cx1} ${cy-22} ${cx1+22} ${cy+4}`} stroke={skin} strokeWidth="9" fill="none" strokeLinecap="round"/><path d={`M${cx2-22} ${cy+4} Q${cx2} ${cy-22} ${cx2+22} ${cy+4}`} stroke={skin} strokeWidth="9" fill="none" strokeLinecap="round"/></g>);
    if (kind==='closed')   return (<g><path d={`M${cx1-24} ${cy} Q${cx1} ${cy+10} ${cx1+24} ${cy}`} stroke={skin} strokeWidth="8" fill="none" strokeLinecap="round"/><path d={`M${cx2-24} ${cy} Q${cx2} ${cy+10} ${cx2+24} ${cy}`} stroke={skin} strokeWidth="8" fill="none" strokeLinecap="round"/></g>);
    if (kind==='wide')     return (<g><circle cx={cx1} cy={cy} r="30" fill={skin}/><circle cx={cx2} cy={cy} r="30" fill={skin}/><circle cx={cx1+6} cy={cy-4} r="8" fill={bg}/><circle cx={cx2+6} cy={cy-4} r="8" fill={bg}/></g>);
    if (kind==='up')       return (<g><circle cx={cx1} cy={cy-6} r="22" fill={skin}/><circle cx={cx2} cy={cy-6} r="22" fill={skin}/><circle cx={cx1+2} cy={cy-12} r="6" fill={bg}/><circle cx={cx2+2} cy={cy-12} r="6" fill={bg}/></g>);
    if (kind==='heart')    return (<g><path transform={`translate(${cx1-22} ${cy-22}) scale(.85)`} d="M26 8 C20 -2, 4 0, 4 14 C4 28, 26 42, 26 42 C26 42, 48 28, 48 14 C48 0, 32 -2, 26 8 Z" fill="#FF5470"/><path transform={`translate(${cx2-22} ${cy-22}) scale(.85)`} d="M26 8 C20 -2, 4 0, 4 14 C4 28, 26 42, 26 42 C26 42, 48 28, 48 14 C48 0, 32 -2, 26 8 Z" fill="#FF5470"/></g>);
    if (kind==='cross')    return (<g><path d={`M${cx1-18} ${cy-14} l36 28 M${cx1+18} ${cy-14} l-36 28`} stroke={skin} strokeWidth="9" strokeLinecap="round"/><path d={`M${cx2-18} ${cy-14} l36 28 M${cx2+18} ${cy-14} l-36 28`} stroke={skin} strokeWidth="9" strokeLinecap="round"/></g>);
    if (kind==='look')     return (<g><circle cx={cx1} cy={cy} r="24" fill={skin}/><circle cx={cx2} cy={cy} r="24" fill={skin}/><circle cx={cx1+8} cy={cy} r="9" fill={bg}><animate attributeName="cx" values={`${cx1+8};${cx1-6};${cx1+8}`} dur="3.6s" repeatCount="indefinite"/></circle><circle cx={cx2+8} cy={cy} r="9" fill={bg}><animate attributeName="cx" values={`${cx2+8};${cx2-6};${cx2+8}`} dur="3.6s" repeatCount="indefinite"/></circle></g>);
    if (kind==='blinking') return (<g><circle cx={cx1} cy={cy} r="22" fill={skin}><animate attributeName="ry" values="22;2;22;22;22" keyTimes="0;0.05;0.1;0.7;1" dur="3.4s" repeatCount="indefinite"/></circle><circle cx={cx2} cy={cy} r="22" fill={skin}><animate attributeName="ry" values="22;2;22;22;22" keyTimes="0;0.05;0.1;0.7;1" dur="3.4s" repeatCount="indefinite"/></circle><circle cx={cx1+5} cy={cy-3} r="7" fill={bg}/><circle cx={cx2+5} cy={cy-3} r="7" fill={bg}/></g>);
    if (kind==='droopy')   return (<g><path d={`M${cx1-22} ${cy-4} Q${cx1} ${cy+18} ${cx1+22} ${cy-4}`} stroke={skin} strokeWidth="9" fill="none" strokeLinecap="round"/><path d={`M${cx2-22} ${cy-4} Q${cx2} ${cy+18} ${cx2+22} ${cy-4}`} stroke={skin} strokeWidth="9" fill="none" strokeLinecap="round"/></g>);
    if (kind==='boot')     return (<g><circle cx={cx1} cy={cy} r="6" fill={skin}><animate attributeName="r" values="2;14;2" dur="1.2s" repeatCount="indefinite"/></circle><circle cx={cx2} cy={cy} r="6" fill={skin}><animate attributeName="r" values="2;14;2" begin="0.15s" dur="1.2s" repeatCount="indefinite"/></circle></g>);
    if (kind==='dim')      return (<g opacity="0.55"><circle cx={cx1} cy={cy} r="20" fill={skin}/><circle cx={cx2} cy={cy} r="20" fill={skin}/></g>);
    // open round
    return (<g><circle cx={cx1} cy={cy} r="22" fill={skin}/><circle cx={cx2} cy={cy} r="22" fill={skin}/><circle cx={cx1+5} cy={cy-3} r="7" fill={bg}/><circle cx={cx2+5} cy={cy-3} r="7" fill={bg}/></g>);
  };

  const mouth = (kind) => {
    const cx=160, cy=180;
    if (kind==='smile')     return (<path d={`M${cx-32} ${cy-6} Q${cx} ${cy+22} ${cx+32} ${cy-6}`} stroke={skin} strokeWidth="10" fill="none" strokeLinecap="round"/>);
    if (kind==='big')       return (<path d={`M${cx-44} ${cy-10} Q${cx} ${cy+34} ${cx+44} ${cy-10}`} stroke={skin} strokeWidth="11" fill={skin} strokeLinecap="round" strokeLinejoin="round"/>);
    if (kind==='tinyo')     return (<circle cx={cx} cy={cy-2} r="9" fill={skin}/>);
    if (kind==='o')         return (<ellipse cx={cx} cy={cy-2} rx="14" ry="18" fill={skin}/>);
    if (kind==='line')      return (<rect x={cx-22} y={cy-3} width="44" height="6" rx="3" fill={skin}/>);
    if (kind==='frown')     return (<path d={`M${cx-28} ${cy+10} Q${cx} ${cy-12} ${cx+28} ${cy+10}`} stroke={skin} strokeWidth="9" fill="none" strokeLinecap="round"/>);
    if (kind==='zigzag')    return (<path d={`M${cx-30} ${cy} l10 -8 l10 8 l10 -8 l10 8 l10 -8`} stroke={skin} strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>);
    if (kind==='wave')      return (<g><path strokeLinecap="round" stroke={skin} strokeWidth="9" fill="none"><animate attributeName="d" dur="0.7s" repeatCount="indefinite" values={`M${cx-40} ${cy} L${cx-24} ${cy-12} L${cx-8} ${cy+10} L${cx+8} ${cy-14} L${cx+24} ${cy+8} L${cx+40} ${cy};M${cx-40} ${cy} L${cx-24} ${cy+8} L${cx-8} ${cy-14} L${cx+8} ${cy+12} L${cx+24} ${cy-10} L${cx+40} ${cy};M${cx-40} ${cy} L${cx-24} ${cy-12} L${cx-8} ${cy+10} L${cx+8} ${cy-14} L${cx+24} ${cy+8} L${cx+40} ${cy}`}/></path></g>);
    if (kind==='dots')      return (<g><circle cx={cx-20} cy={cy} r="5" fill={skin}><animate attributeName="r" values="3;7;3" dur="1.2s" repeatCount="indefinite"/></circle><circle cx={cx} cy={cy} r="5" fill={skin}><animate attributeName="r" values="3;7;3" begin="0.2s" dur="1.2s" repeatCount="indefinite"/></circle><circle cx={cx+20} cy={cy} r="5" fill={skin}><animate attributeName="r" values="3;7;3" begin="0.4s" dur="1.2s" repeatCount="indefinite"/></circle></g>);
    if (kind==='soft')      return (<path d={`M${cx-18} ${cy-2} Q${cx} ${cy+6} ${cx+18} ${cy-2}`} stroke={skin} strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.85"/>);
    return (<path d={`M${cx-24} ${cy-2} Q${cx} ${cy+10} ${cx+24} ${cy-2}`} stroke={skin} strokeWidth="9" fill="none" strokeLinecap="round"/>);
  };

  const cheeks = (color=accent) => (
    <g opacity="0.85">
      <ellipse cx="78"  cy="160" rx="18" ry="11" fill={color}/>
      <ellipse cx="242" cy="160" rx="18" ry="11" fill={color}/>
    </g>
  );

  const browLine = (y=78, tilt=0) => (
    <g>
      <path d={`M${88-(tilt)} ${y} L${132+(tilt)} ${y+6}`} stroke={skin} strokeWidth="8" strokeLinecap="round"/>
      <path d={`M${188+(tilt)} ${y+6} L${232-(tilt)} ${y}`} stroke={skin} strokeWidth="8" strokeLinecap="round"/>
    </g>
  );

  // Glow ring around the face area (a chrome edge) — readable from far.
  const ring = (color, dashed=false, opacity=0.9) => (
    <rect x="6" y="6" width={LCD_W-12} height={LCD_H-12} rx="22"
      fill="none" stroke={color} strokeWidth="4" strokeDasharray={dashed?'10 8':'none'} opacity={opacity}/>
  );

  // Per-state composition + animation class.
  const cfg = {
    idle:     { eye:'open',  mou:'smile',     cheek:true,  ring:false, brow:null, anim:'lcd-bob 3.5s ease-in-out infinite' },
    happy:    { eye:'happy', mou:'big',       cheek:true,  ring:false, brow:null, anim:'lcd-bob 2.6s ease-in-out infinite' },
    listen:   { eye:'open',  mou:'tinyo',     cheek:false, ring:'pulse', ringColor:accent, brow:null, anim:'lcd-tilt 3s ease-in-out infinite' },
    think:    { eye:'up',    mou:'line',      cheek:false, ring:false, brow:null, anim:'lcd-think 2.4s ease-in-out infinite', dots:true },
    speak:    { eye:'open',  mou:'o',         cheek:true,  ring:'pulse', ringColor:'#FFD66E', brow:null, anim:'lcd-talk 0.9s ease-in-out infinite' },
    success:  { eye:'happy', mou:'big',       cheek:true,  ring:'glow',  ringColor:'#7BD389', brow:null, anim:'lcd-bob 1.0s ease-in-out infinite', sparks:true },
    celebrate:{ eye:'happy', mou:'big',       cheek:true,  ring:'glow',  ringColor:accent, brow:null, anim:'lcd-bob-strong .9s ease-in-out infinite', confetti:true },
    gentle:   { eye:'closed',mou:'smile',     cheek:true,  ring:false, brow:null, anim:'lcd-bob 4s ease-in-out infinite' },
    sleep:    { eye:'closed',mou:'line',      cheek:false, ring:false, brow:null, anim:'lcd-bob 6s ease-in-out infinite', zzz:true },
    error:    { eye:'cross', mou:'frown',     cheek:false, ring:'glow', ringColor:'#E66D5A', brow:null, anim:'' },
    mic_off:  { eye:'open',  mou:'line',      cheek:false, ring:'glow', ringColor:'#E66D5A', brow:'down', anim:'', micOff:true },
    charging: { eye:'closed',mou:'smile',     cheek:false, ring:false, brow:null, anim:'lcd-bob 5s ease-in-out infinite', battery:true },
    paired:   { eye:'happy', mou:'smile',     cheek:true,  ring:'glow', ringColor:'#6FC1FF', brow:null, anim:'lcd-bob 2.2s ease-in-out infinite', bt:true },
    heart:    { eye:'heart', mou:'smile',     cheek:true,  ring:false, brow:null, anim:'lcd-bob 2.6s ease-in-out infinite' },
    confused: { eye:'open',  mou:'zigzag',    cheek:false, ring:false, brow:'asym', anim:'lcd-tilt 3.5s ease-in-out infinite' },
    // ── 20-state spec ──
    boot:        { eye:'boot',     mou:'line',  cheek:false, ring:'pulse', ringColor:'#6FC1FF', brow:null, anim:'' },
    look:        { eye:'look',     mou:'soft',  cheek:true,  ring:false,   brow:null, anim:'lcd-bob 4s ease-in-out infinite' },
    child_speak: { eye:'wide',     mou:'tinyo', cheek:true,  ring:'pulse', ringColor:'#7BD389', brow:null, anim:'lcd-bob 1.6s ease-in-out infinite', earBars:true },
    try_again:   { eye:'open',     mou:'soft',  cheek:true,  ring:false,   brow:null, anim:'lcd-bob 3s ease-in-out infinite', loopArrow:true },
    didnt_hear:  { eye:'up',       mou:'soft',  cheek:false, ring:false,   brow:'asym', anim:'lcd-tilt 3s ease-in-out infinite', earCue:true },
    waiting:     { eye:'blinking', mou:'soft',  cheek:false, ring:false,   brow:null, anim:'lcd-bob 5s ease-in-out infinite' },
    interrupt:   { eye:'open',     mou:'tinyo', cheek:false, ring:false,   brow:null, anim:'', pause:true },
    redirect:    { eye:'open',     mou:'soft',  cheek:true,  ring:false,   brow:null, anim:'lcd-tilt 3.2s ease-in-out infinite', returnArrow:true },
    reconnect:   { eye:'closed',   mou:'soft',  cheek:false, ring:'pulse', ringColor:'#FFD66E', brow:null, anim:'lcd-bob 2.4s ease-in-out infinite', wifiTry:true },
    low_batt:    { eye:'droopy',   mou:'soft',  cheek:false, ring:false,   brow:null, anim:'lcd-bob 5s ease-in-out infinite', battLow:true },
    safety:      { eye:'closed',   mou:'line',  cheek:false, ring:'glow',  ringColor:'#9B8FB8', brow:null, anim:'', shield:true },
  }[emotion] || {};

  return (
    <div style={{ width:size, height: size*(LCD_H/LCD_W), position:'relative' }}>
      <svg viewBox={`0 0 ${LCD_W} ${LCD_H}`} width={size} height={size*(LCD_H/LCD_W)}
        style={{ display:'block', background:bg, borderRadius: 14*scale }}>
        {/* subtle scanline-free LCD; just solid bg — readable from far */}
        <g style={{ animation: cfg.anim, transformOrigin:'160px 130px' }}>
          {cfg.brow==='down' && (<g><path d="M88 78 L132 92" stroke={skin} strokeWidth="8" strokeLinecap="round"/><path d="M232 78 L188 92" stroke={skin} strokeWidth="8" strokeLinecap="round"/></g>)}
          {cfg.brow==='asym' && (<g><path d="M88 90 L132 78" stroke={skin} strokeWidth="8" strokeLinecap="round"/><path d="M188 80 L232 86" stroke={skin} strokeWidth="8" strokeLinecap="round"/></g>)}
          {eyes(cfg.eye)}
          {cfg.cheek && cheeks(accent)}
          {mouth(cfg.mou)}
          {cfg.dots && (
            <g>
              <circle cx="240" cy="60" r="6" fill={skin} opacity="0.4"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.4s" repeatCount="indefinite"/></circle>
              <circle cx="260" cy="50" r="8" fill={skin} opacity="0.6"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.4s" begin="0.2s" repeatCount="indefinite"/></circle>
              <circle cx="284" cy="38" r="11" fill={skin}><animate attributeName="opacity" values="0.6;1;0.6" dur="1.4s" begin="0.4s" repeatCount="indefinite"/></circle>
            </g>
          )}
          {cfg.zzz && (
            <g>
              <text x="244" y="64" fontSize="26" fontWeight="800" fill={skin} fontFamily="-apple-system,sans-serif" opacity="0.85">z</text>
              <text x="262" y="44" fontSize="20" fontWeight="800" fill={skin} fontFamily="-apple-system,sans-serif" opacity="0.6">z</text>
            </g>
          )}
          {cfg.sparks && [0,1,2,3,4].map(i=>{
            const x = 30 + i*60, y = 40 + (i%2)*8;
            return <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill="#FFD66E">
                <animate attributeName="opacity" values="0;1;0" dur="1.2s" begin={`${i*0.15}s`} repeatCount="indefinite"/>
              </path>
            </g>;
          })}
          {cfg.confetti && [0,1,2,3,4,5,6,7].map(i=>{
            const x = 20 + i*36, y = 30 + (i%3)*8;
            const c = ['#FF6F61','#FFD66E','#7BD389','#6FC1FF','#FF5470'][i%5];
            return <rect key={i} x={x} y={y} width="8" height="14" rx="2" fill={c}>
              <animate attributeName="y" values={`${y};${y+30};${y}`} dur="1.6s" begin={`${i*0.1}s`} repeatCount="indefinite"/>
              <animateTransform attributeName="transform" type="rotate" from={`0 ${x+4} ${y+7}`} to={`360 ${x+4} ${y+7}`} dur="1.6s" repeatCount="indefinite"/>
            </rect>;
          })}
          {cfg.micOff && (
            <g transform="translate(160 198)">
              <path d="M-30 -14 L30 14" stroke="#E66D5A" strokeWidth="6" strokeLinecap="round"/>
              <rect x="-10" y="-18" width="20" height="26" rx="10" fill="none" stroke={skin} strokeWidth="5"/>
            </g>
          )}
          {cfg.battery && (
            <g transform="translate(108 30)">
              <rect x="0" y="0" width="104" height="32" rx="6" fill="none" stroke={skin} strokeWidth="4"/>
              <rect x="104" y="10" width="6" height="12" rx="2" fill={skin}/>
              <rect x="6" y="6" width="60" height="20" rx="3" fill="#7BD389">
                <animate attributeName="width" values="20;90;20" dur="2.4s" repeatCount="indefinite"/>
              </rect>
            </g>
          )}
          {cfg.earBars && (
            <g>
              {[0,1,2,3].map(i=>(
                <rect key={'l'+i} x={20+i*10} y="180" width="6" height="20" rx="3" fill="#7BD389">
                  <animate attributeName="height" values="6;30;6" dur="0.5s" begin={`${i*0.1}s`} repeatCount="indefinite"/>
                  <animate attributeName="y" values="190;176;190" dur="0.5s" begin={`${i*0.1}s`} repeatCount="indefinite"/>
                </rect>
              ))}
              {[0,1,2,3].map(i=>(
                <rect key={'r'+i} x={262+i*10} y="180" width="6" height="20" rx="3" fill="#7BD389">
                  <animate attributeName="height" values="6;30;6" dur="0.5s" begin={`${i*0.1}s`} repeatCount="indefinite"/>
                  <animate attributeName="y" values="190;176;190" dur="0.5s" begin={`${i*0.1}s`} repeatCount="indefinite"/>
                </rect>
              ))}
            </g>
          )}
          {cfg.loopArrow && (
            <g transform="translate(160 38)" opacity="0.85">
              <path d="M-18 -2 a18 14 0 1 1 18 14" fill="none" stroke={skin} strokeWidth="4" strokeLinecap="round"/>
              <path d="M2 10 l-4 6 l8 -2" fill="none" stroke={skin} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          )}
          {cfg.earCue && (
            <g transform="translate(254 60)" opacity="0.85">
              <path d="M-10 6 q6 -16 18 -10" fill="none" stroke={skin} strokeWidth="4" strokeLinecap="round"/>
              <circle cx="14" cy="-2" r="3" fill={skin}/>
              <circle cx="22" cy="-6" r="2" fill={skin}/>
            </g>
          )}
          {cfg.pause && (
            <g transform="translate(160 60)">
              <rect x="-12" y="-12" width="8" height="24" rx="2" fill={skin}/>
              <rect x="4" y="-12" width="8" height="24" rx="2" fill={skin}/>
            </g>
          )}
          {cfg.returnArrow && (
            <g transform="translate(80 50)" opacity="0.85">
              <path d="M0 0 l-12 -8 l0 16 z" fill={skin}/>
              <path d="M-12 0 H30" stroke={skin} strokeWidth="4" strokeLinecap="round"/>
              <path d="M30 0 q14 0 14 14" fill="none" stroke={skin} strokeWidth="4" strokeLinecap="round"/>
            </g>
          )}
          {cfg.wifiTry && (
            <g transform="translate(160 36)">
              {[3,2,1].map((s,i)=>(
                <path key={i} d={`M${-12*s} ${4*s} a${12*s} ${12*s} 0 0 1 ${24*s} 0`}
                  fill="none" stroke="#FFD66E" strokeWidth="4" strokeLinecap="round" opacity="0.6">
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.6s" begin={`${i*0.2}s`} repeatCount="indefinite"/>
                </path>
              ))}
              <circle cx="0" cy="6" r="3" fill="#FFD66E"/>
            </g>
          )}
          {cfg.battLow && (
            <g transform="translate(108 30)">
              <rect x="0" y="0" width="104" height="32" rx="6" fill="none" stroke={skin} strokeWidth="4"/>
              <rect x="104" y="10" width="6" height="12" rx="2" fill={skin}/>
              <rect x="6" y="6" width="14" height="20" rx="3" fill="#E8A33C">
                <animate attributeName="opacity" values="1;0.4;1" dur="1.6s" repeatCount="indefinite"/>
              </rect>
            </g>
          )}
          {cfg.shield && (
            <g transform="translate(160 38)">
              <path d="M0 -12 L14 -6 L14 8 Q14 18 0 22 Q-14 18 -14 8 L-14 -6 Z" fill="none" stroke="#C9C0DA" strokeWidth="4" strokeLinejoin="round"/>
              <path d="M-6 4 L-2 8 L8 -4" fill="none" stroke="#C9C0DA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          )}
          {cfg.bt && (
            <g transform="translate(146 28)">
              <path d="M14 0 L14 28 L24 22 L4 8 L24 -2 L14 4" fill="none" stroke="#6FC1FF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          )}
        </g>
        {cfg.ring==='pulse' && (
          <g>
            {ring(cfg.ringColor, false, 0.9)}
            <rect x="6" y="6" width={LCD_W-12} height={LCD_H-12} rx="22" fill="none"
              stroke={cfg.ringColor} strokeWidth="4" opacity="0.5">
              <animate attributeName="opacity" values="0.7;0;0.7" dur="1.6s" repeatCount="indefinite"/>
            </rect>
          </g>
        )}
        {cfg.ring==='glow' && ring(cfg.ringColor, false, 0.95)}
      </svg>
      <style>{`
        @keyframes lcd-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes lcd-bob-strong { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-8px) rotate(2deg)} }
        @keyframes lcd-tilt { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
        @keyframes lcd-think { 0%,100%{transform:rotate(-3deg) translateY(0)} 50%{transform:rotate(3deg) translateY(-2px)} }
        @keyframes lcd-talk { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
      `}</style>
    </div>
  );
}

// 20-state spec with animation notes + usage context.
const LCD_STATES_LIST = [
  { id:'boot',         label:'Booting',           group:'Lifecycle', anim:'Pulsing eye dots grow & shrink; soft blue ring breathing.', use:'On power-on or wake from sleep, before connect.' },
  { id:'idle',         label:'Idle happy',        group:'Conversation', anim:'Slow gentle bob, rounded smile, soft cheeks.', use:'Default resting face when nothing is happening.' },
  { id:'look',         label:'Looking at child',  group:'Conversation', anim:'Pupils slowly track left-right; gentle bob.', use:'Right after greeting, while waiting for child attention.' },
  { id:'speak',        label:'Robot speaking',    group:'Conversation', anim:'Mouth opens to "O", tiny vertical bob in sync with TTS.', use:'Robot is delivering the prompt or hint.' },
  { id:'listen',       label:'Robot listening',   group:'Conversation', anim:'Coral ring breathes; tiny tilt; mouth becomes a small attentive "o".', use:'Mic is open, waiting for the child to speak.' },
  { id:'child_speak',  label:'Child speaking',    group:'Conversation', anim:'Eyes widen, green ring pulses; ear bars on both sides bounce.', use:'Voice activity detected — Robot mirrors that it heard them start.' },
  { id:'think',        label:'Thinking',          group:'Conversation', anim:'Eyes look up; three dots pop top-right; tilt rocks back.', use:'Brief processing pause before reply.' },
  { id:'success',      label:'Success',           group:'Feedback', anim:'Big smile, happy-arc eyes, sparkles drift up, green glow ring.', use:'Got the word. Single-word win, no fireworks.' },
  { id:'celebrate',    label:'Celebration',       group:'Feedback', anim:'Strong bob, confetti rain, accent glow ring, big mouth.', use:'End of lesson, milestone unlock.' },
  { id:'gentle',       label:'Gentle correction', group:'Feedback', anim:'Eyes softly closed (almost a wink), small soft smile, no glow.', use:'"Almost!" — kind, never punitive.' },
  { id:'try_again',    label:'Try again',         group:'Feedback', anim:'Soft smile, looped arrow above the head; gentle bob.', use:'Inviting another attempt; pairs with "Let\'s try together".' },
  { id:'didnt_hear',   label:'Didn\'t hear',      group:'Feedback', anim:'Looks up + ear cue near the speaker, tiny tilt.', use:'No audio detected after listen window — invites repeat.' },
  { id:'waiting',      label:'Silence / waiting', group:'Conversation', anim:'Slow blink every ~3.5s, soft mouth.', use:'Long silence, before nudging the child.' },
  { id:'interrupt',    label:'Interrupted',       group:'Conversation', anim:'Mouth shrinks to small "o"; pause icon hovers above; no bob.', use:'Child spoke over Robot — yields gracefully.' },
  { id:'redirect',     label:'Off-topic redirect',group:'Safety',    anim:'Soft tilt, return-arrow above, friendly smile.', use:'Steers conversation back to the lesson.' },
  { id:'reconnect',    label:'Reconnecting Wi-Fi',group:'System',    anim:'Eyes closed peacefully; yellow ring breathes; wifi arcs fade in & out.', use:'Network blip — reads as "I\'m trying", not broken.' },
  { id:'mic_off',      label:'Mic issue',         group:'System',    anim:'Soft brow-down, mic icon with diagonal line. No harshness.', use:'Permission missing or hardware mute.' },
  { id:'low_batt',     label:'Low battery',       group:'System',    anim:'Slightly droopy eyes, amber battery sliver fades.', use:'<15% — friendly heads-up, never alarming.' },
  { id:'charging',     label:'Charging',          group:'System',    anim:'Eyes closed, smile, battery fills repeatedly.', use:'On the dock or cable.' },
  { id:'sleep',        label:'Sleep mode',        group:'Lifecycle', anim:'Eyes closed, slow long bob, "z z" drift up.', use:'Quiet hours, idle timeout, or manual sleep.' },
  { id:'safety',       label:'Safety pause',      group:'Safety',    anim:'Eyes closed peacefully; lavender glow ring; small shield with check.', use:'Asks for a grown-up — calm, serious, never alarming.' },
];

// ──────────────────────────────────────────────────
// Physical Robot device frame (3D-ish front view)
// ──────────────────────────────────────────────────
function RobotDevice({ emotion='idle', size=260, accent='#FF6F61', name }){
  const W = size, H = size * 1.25;
  return (
    <div style={{ width:W, height:H, position:'relative' }}>
      <svg viewBox="0 0 200 250" width={W} height={H} style={{ display:'block' }}>
        {/* shadow */}
        <ellipse cx="100" cy="240" rx="68" ry="6" fill="rgba(0,0,0,0.18)"/>
        {/* body */}
        <rect x="20" y="40" width="160" height="180" rx="38" fill="#F4ECDF" stroke="#1A1A1F" strokeWidth="2"/>
        <rect x="20" y="40" width="160" height="180" rx="38" fill="url(#bodyShade)" opacity="0.35"/>
        <defs>
          <linearGradient id="bodyShade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#fff"/>
            <stop offset="1" stopColor="#000"/>
          </linearGradient>
        </defs>
        {/* antenna */}
        <line x1="100" y1="40" x2="100" y2="14" stroke="#1A1A1F" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="100" cy="10" r="7" fill={accent} stroke="#1A1A1F" strokeWidth="2"/>
        {/* ears (speakers) */}
        <circle cx="22" cy="100" r="14" fill="#F4ECDF" stroke="#1A1A1F" strokeWidth="2"/>
        <circle cx="22" cy="100" r="6" fill="#1A1A1F"/>
        <circle cx="178" cy="100" r="14" fill="#F4ECDF" stroke="#1A1A1F" strokeWidth="2"/>
        <circle cx="178" cy="100" r="6" fill="#1A1A1F"/>
        {/* face screen bezel */}
        <rect x="34" y="56" width="132" height="100" rx="14" fill="#1A1A1F"/>
      </svg>
      {/* LCD overlay */}
      <div style={{ position:'absolute', left: (34/200)*W, top: (56/250)*H, width:(132/200)*W, height:(100/250)*H,
        borderRadius: (14/200)*W, overflow:'hidden' }}>
        <LCDFace emotion={emotion} size={(132/200)*W} accent={accent}/>
      </div>
      {/* base detail */}
      <svg viewBox="0 0 200 250" width={W} height={H} style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {/* mic pill */}
        <rect x="80" y="172" width="40" height="10" rx="5" fill="#1A1A1F" opacity="0.55"/>
        {/* power button */}
        <circle cx="100" cy="200" r="9" fill="#fff" stroke="#1A1A1F" strokeWidth="2"/>
        <circle cx="100" cy="200" r="3" fill={accent}/>
      </svg>
      {name && (
        <div style={{ position:'absolute', bottom:-26, left:0, right:0, textAlign:'center',
          fontFamily:'var(--display)', fontWeight:700, fontSize:13, color:'var(--ink-soft)' }}>{name}</div>
      )}
    </div>
  );
}

Object.assign(window, { LCDFace, RobotDevice, LCD_STATES_LIST });
