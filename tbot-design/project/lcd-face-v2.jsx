// LCD Face System v2 — premium redesign for the physical Robot's
// 3.2" / 320×240 landscape LCD. Three style directions + the chosen
// "Soft Companion" production face used everywhere else.
//
// Design principles:
//  • Eyes are the entire emotional language. Mouth is small support.
//  • Skin "lives" on midnight black — cyan/aqua/amber/mint/violet glows.
//  • One state changes one or two elements. Same character, new mood.
//  • Animations are slow & confident. Nothing flashes.
//  • Glows are layered: ambient bg → ring → cheeks → eye specular.

(function(){
  // ─────────────────────────────────────────────────────────
  // Premium LCD palette
  // ─────────────────────────────────────────────────────────
  const P = {
    // Background tiers (deep midnight w/ subtle cool cast)
    bg0:   '#070A12',   // deepest base
    bg1:   '#0E1320',   // panel
    bg2:   '#141A2C',   // elevated

    // State accents (high contrast on bg0)
    aqua:  '#5EE9FF',   // listening / attention
    cyan:  '#7EE7FF',   // soft active
    mint:  '#7CF1B5',   // success / good
    amber: '#FFC36A',   // attention / low batt
    coral: '#FF8A6E',   // child speech, warm
    violet:'#A99CFF',   // thinking
    blue:  '#7CB7FF',   // booting / waking
    skin:  '#EAF5FF',   // eye/mouth fill
    skinSoft:'#C8DCF0',
    helper:'#D4C7FF',   // grown-up / safety
  };

  // ─────────────────────────────────────────────────────────
  // Three style directions, each rendering the same emotion.
  // Used in the comparison page only.
  // ─────────────────────────────────────────────────────────
  // ── Direction A: Soft Companion ──
  // Pill-shaped glowing eyes, warm cheeks, calm rounded mouth.
  function FaceA({ emotion='idle', size=320, label }){
    const W=320, H=240;
    const eyes = (kind) => {
      // Soft pill eyes with inner specular highlight
      if (kind==='happy')   return (<g>
        <path d="M82 122 Q110 92 138 122" stroke={P.skin} strokeWidth="14" strokeLinecap="round" fill="none"/>
        <path d="M182 122 Q210 92 238 122" stroke={P.skin} strokeWidth="14" strokeLinecap="round" fill="none"/>
      </g>);
      if (kind==='think')   return (<g>
        <rect x="86" y="100" width="48" height="44" rx="22" fill={P.skin}/>
        <rect x="86" y="100" width="48" height="44" rx="22" fill={P.violet} opacity=".25"/>
        <rect x="186" y="100" width="48" height="44" rx="22" fill={P.skin}/>
        <rect x="186" y="100" width="48" height="44" rx="22" fill={P.violet} opacity=".25"/>
        <ellipse cx="106" cy="112" rx="6" ry="3" fill="#fff" opacity=".7"/>
        <ellipse cx="206" cy="112" rx="6" ry="3" fill="#fff" opacity=".7"/>
      </g>);
      if (kind==='success') return (<g>
        <path d="M82 130 Q110 96 138 130" stroke={P.mint} strokeWidth="14" strokeLinecap="round" fill="none"/>
        <path d="M182 130 Q210 96 238 130" stroke={P.mint} strokeWidth="14" strokeLinecap="round" fill="none"/>
      </g>);
      if (kind==='listen')  return (<g>
        <rect x="86" y="98" width="48" height="48" rx="24" fill={P.skin}/>
        <rect x="186" y="98" width="48" height="48" rx="24" fill={P.skin}/>
        <ellipse cx="106" cy="112" rx="7" ry="4" fill="#fff" opacity=".75"/>
        <ellipse cx="206" cy="112" rx="7" ry="4" fill="#fff" opacity=".75"/>
      </g>);
      if (kind==='retry')   return (<g>
        <path d="M82 124 Q110 110 138 124" stroke={P.skin} strokeWidth="13" strokeLinecap="round" fill="none"/>
        <path d="M182 124 Q210 110 238 124" stroke={P.skin} strokeWidth="13" strokeLinecap="round" fill="none"/>
      </g>);
      // idle / speak — pill eyes, slightly taller for warmth
      return (<g>
        <rect x="86" y="96" width="48" height="52" rx="24" fill={P.skin}/>
        <rect x="186" y="96" width="48" height="52" rx="24" fill={P.skin}/>
        <ellipse cx="106" cy="110" rx="7" ry="4" fill="#fff" opacity=".75"/>
        <ellipse cx="206" cy="110" rx="7" ry="4" fill="#fff" opacity=".75"/>
      </g>);
    };
    const mouth = (kind) => {
      if (kind==='success' || kind==='happy')
        return <path d="M132 184 Q160 208 188 184" stroke={P.mint} strokeWidth="10" strokeLinecap="round" fill="none"/>;
      if (kind==='speak')
        return <ellipse cx="160" cy="186" rx="14" ry="11" fill={P.skin}/>;
      if (kind==='listen')
        return <circle cx="160" cy="186" r="6" fill={P.skinSoft}/>;
      if (kind==='think')
        return <rect x="146" y="184" width="28" height="6" rx="3" fill={P.skinSoft}/>;
      if (kind==='retry')
        return <path d="M138 188 Q160 200 182 188" stroke={P.skinSoft} strokeWidth="8" strokeLinecap="round" fill="none"/>;
      return <path d="M138 184 Q160 196 182 184" stroke={P.skin} strokeWidth="10" strokeLinecap="round" fill="none"/>;
    };
    // ambient — radial bg glow tinted by emotion
    const tint = emotion==='listen'?P.aqua:emotion==='success'?P.mint:emotion==='think'?P.violet:emotion==='retry'?P.amber:P.cyan;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={size} height={size*H/W} style={{ display:'block', background:P.bg0, borderRadius:14 }}>
        <defs>
          <radialGradient id={'aGl'+emotion} cx="50%" cy="60%" r="60%">
            <stop offset="0%" stopColor={tint} stopOpacity="0.18"/>
            <stop offset="60%" stopColor={tint} stopOpacity="0.04"/>
            <stop offset="100%" stopColor={tint} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill={`url(#aGl${emotion})`}/>
        {/* warm cheeks */}
        {(emotion==='idle'||emotion==='success'||emotion==='happy'||emotion==='speak') && (
          <g opacity=".55">
            <circle cx="58" cy="158" r="14" fill={P.coral}/>
            <circle cx="262" cy="158" r="14" fill={P.coral}/>
          </g>
        )}
        {eyes(emotion)}
        {mouth(emotion)}
        {label && <text x="160" y="226" fontSize="11" fill={P.skinSoft} opacity=".55" textAnchor="middle" fontFamily="ui-monospace,Menlo">A · {label}</text>}
      </svg>
    );
  }

  // ── Direction B: Smart AI Buddy ──
  // Geometric eyes built from luminous arcs. Sleek, futuristic.
  function FaceB({ emotion='idle', size=320, label }){
    const W=320, H=240;
    // Eye = 3 concentric arcs + a bright core scanline
    const eye = (cx, cy, mode) => {
      const arc = (r, op) => (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={P.aqua} strokeWidth="2.5" opacity={op}/>
      );
      if (mode==='think') return (<g opacity=".95">
        {arc(28, .35)}{arc(20, .55)}
        <path d={`M${cx-12} ${cy} a12 12 0 0 1 24 0`} stroke={P.violet} strokeWidth="3" strokeLinecap="round" fill="none"/>
        <circle cx={cx} cy={cy} r="3" fill={P.violet}/>
      </g>);
      if (mode==='success') return (<g>
        {arc(30, .6)}{arc(22, .85)}
        <path d={`M${cx-14} ${cy} q14 -16 28 0`} stroke={P.mint} strokeWidth="4" strokeLinecap="round" fill="none"/>
      </g>);
      if (mode==='listen') return (<g>
        {arc(32, .55)}{arc(24, .8)}
        <rect x={cx-2} y={cy-12} width="4" height="24" rx="2" fill={P.aqua}>
          <animate attributeName="height" values="6;26;6" dur="1.2s" repeatCount="indefinite"/>
          <animate attributeName="y" values={`${cy-3};${cy-13};${cy-3}`} dur="1.2s" repeatCount="indefinite"/>
        </rect>
      </g>);
      if (mode==='retry') return (<g opacity=".9">
        {arc(28, .5)}
        <path d={`M${cx-14} ${cy+2} q14 -10 28 0`} stroke={P.amber} strokeWidth="3" strokeLinecap="round" fill="none"/>
      </g>);
      // idle / speak — full eye: outer ring + inner core + scanline
      return (<g>
        {arc(32, .55)}{arc(24, .8)}
        <circle cx={cx} cy={cy} r="14" fill={P.aqua} opacity=".35"/>
        <line x1={cx-10} y1={cy} x2={cx+10} y2={cy} stroke={P.aqua} strokeWidth="3" strokeLinecap="round"/>
      </g>);
    };
    const mouth = (mode) => {
      // Subtle horizontal waveform line
      if (mode==='speak') return (
        <g>
          {[0,1,2,3,4,5,6].map(i=>{
            const x = 110 + i*15; const h = [4,10,18,12,20,8,4][i];
            return <rect key={i} x={x} y={196-h/2} width="3" height={h} rx="1.5" fill={P.aqua}/>;
          })}
        </g>
      );
      if (mode==='listen' || mode==='retry')
        return <line x1="138" y1="196" x2="182" y2="196" stroke={P.cyan} strokeWidth="2" opacity=".6"/>;
      if (mode==='success')
        return <path d="M132 192 Q160 210 188 192" stroke={P.mint} strokeWidth="3" strokeLinecap="round" fill="none"/>;
      if (mode==='think')
        return <line x1="146" y1="196" x2="174" y2="196" stroke={P.violet} strokeWidth="2.5"/>;
      return <line x1="140" y1="196" x2="180" y2="196" stroke={P.skinSoft} strokeWidth="2"/>;
    };
    const tint = emotion==='think'?P.violet:emotion==='success'?P.mint:emotion==='retry'?P.amber:P.aqua;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={size} height={size*H/W} style={{ display:'block', background:P.bg0, borderRadius:14 }}>
        <defs>
          <radialGradient id={'bGl'+emotion} cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor={tint} stopOpacity="0.22"/>
            <stop offset="100%" stopColor={tint} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#bGl${emotion})`}/>
        {/* sleek baseline */}
        <line x1="20" y1="220" x2="300" y2="220" stroke={P.aqua} strokeWidth="1" opacity=".15"/>
        {eye(110, 120, emotion)}
        {eye(210, 120, emotion)}
        {mouth(emotion)}
        {label && <text x="160" y="232" fontSize="11" fill={P.aqua} opacity=".5" textAnchor="middle" fontFamily="ui-monospace,Menlo">B · {label}</text>}
      </svg>
    );
  }

  // ── Direction C: Playful Learning Friend ──
  // Bigger, more elastic round eyes, brighter palette, micro decorations.
  function FaceC({ emotion='idle', size=320, label }){
    const W=320, H=240;
    const eye = (cx, cy, mode) => {
      if (mode==='success' || mode==='happy') return (<g>
        <path d={`M${cx-26} ${cy+6} Q${cx} ${cy-26} ${cx+26} ${cy+6}`} stroke={P.skin} strokeWidth="13" strokeLinecap="round" fill="none"/>
      </g>);
      if (mode==='think') return (<g>
        <circle cx={cx} cy={cy-4} r="22" fill={P.skin}/>
        <circle cx={cx+4} cy={cy-12} r="6" fill={P.bg0}/>
      </g>);
      if (mode==='listen') return (<g>
        <circle cx={cx} cy={cy} r="26" fill={P.skin}/>
        <circle cx={cx+4} cy={cy-3} r="9" fill={P.bg0}/>
        <circle cx={cx+8} cy={cy-7} r="3" fill="#fff"/>
      </g>);
      if (mode==='retry') return (<g>
        <path d={`M${cx-22} ${cy} Q${cx} ${cy+10} ${cx+22} ${cy}`} stroke={P.skin} strokeWidth="11" strokeLinecap="round" fill="none"/>
      </g>);
      return (<g>
        <circle cx={cx} cy={cy} r="24" fill={P.skin}/>
        <circle cx={cx+4} cy={cy-2} r="8" fill={P.bg0}/>
        <circle cx={cx+8} cy={cy-6} r="3" fill="#fff"/>
      </g>);
    };
    const mouth = (mode) => {
      if (mode==='success'||mode==='happy') return <path d="M124 184 Q160 218 196 184" stroke={P.mint} strokeWidth="13" strokeLinecap="round" fill={P.mint} fillOpacity=".15"/>;
      if (mode==='speak') return <ellipse cx="160" cy="190" rx="18" ry="14" fill={P.skin}/>;
      if (mode==='listen') return <circle cx="160" cy="190" r="8" fill={P.skin}/>;
      if (mode==='think') return <rect x="142" y="186" width="36" height="6" rx="3" fill={P.skinSoft}/>;
      if (mode==='retry') return <path d="M134 192 Q160 204 186 192" stroke={P.amber} strokeWidth="9" strokeLinecap="round" fill="none"/>;
      return <path d="M132 184 Q160 200 188 184" stroke={P.skin} strokeWidth="11" strokeLinecap="round" fill="none"/>;
    };
    const tint = emotion==='success'?P.mint:emotion==='think'?P.violet:emotion==='listen'?P.aqua:P.amber;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={size} height={size*H/W} style={{ display:'block', background:P.bg0, borderRadius:14 }}>
        <defs>
          <radialGradient id={'cGl'+emotion} cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={tint} stopOpacity="0.28"/>
            <stop offset="100%" stopColor={tint} stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#cGl${emotion})`}/>
        {/* always-on chubby cheeks */}
        <circle cx="56" cy="160" r="16" fill={P.coral} opacity=".75"/>
        <circle cx="264" cy="160" r="16" fill={P.coral} opacity=".75"/>
        {/* decorative mini star top-right when success */}
        {emotion==='success' && (
          <g transform="translate(280 36)">
            <path d="M0 -10 L3 -3 L10 0 L3 3 L0 10 L-3 3 L-10 0 L-3 -3 Z" fill={P.amber}/>
          </g>
        )}
        {emotion==='think' && (
          <g>
            <circle cx="244" cy="48" r="3" fill={P.violet} opacity=".5"/>
            <circle cx="262" cy="40" r="4" fill={P.violet} opacity=".75"/>
            <circle cx="284" cy="30" r="6" fill={P.violet}/>
          </g>
        )}
        {eye(110, 120, emotion)}
        {eye(210, 120, emotion)}
        {mouth(emotion)}
        {label && <text x="160" y="226" fontSize="11" fill={P.skinSoft} opacity=".55" textAnchor="middle" fontFamily="ui-monospace,Menlo">C · {label}</text>}
      </svg>
    );
  }

  // ─────────────────────────────────────────────────────────
  // The chosen production face: Direction A — Soft Companion.
  // Expanded to all 25 spec states. Renders the ambient bg
  // glow, ring, eyes, mouth, cheeks, brow, and tiny icon.
  // Driven by an `emotion` key — see EMOTION_MAP below.
  // ─────────────────────────────────────────────────────────
  const W = 320, H = 240;

  function _eyes(kind, color){
    const c = color || P.skin;
    if (kind==='pill') return (
      <g>
        <rect x="86" y="96" width="48" height="52" rx="24" fill={c}/>
        <rect x="186" y="96" width="48" height="52" rx="24" fill={c}/>
        <ellipse cx="106" cy="110" rx="7" ry="4" fill="#fff" opacity=".75"/>
        <ellipse cx="206" cy="110" rx="7" ry="4" fill="#fff" opacity=".75"/>
      </g>
    );
    if (kind==='pill-attentive') return (
      <g>
        <rect x="86" y="92" width="48" height="56" rx="24" fill={c}/>
        <rect x="186" y="92" width="48" height="56" rx="24" fill={c}/>
        <ellipse cx="108" cy="106" rx="9" ry="5" fill="#fff" opacity=".85"/>
        <ellipse cx="208" cy="106" rx="9" ry="5" fill="#fff" opacity=".85"/>
      </g>
    );
    if (kind==='happy-arc') return (
      <g>
        <path d="M82 124 Q110 92 138 124" stroke={c} strokeWidth="14" strokeLinecap="round" fill="none"/>
        <path d="M182 124 Q210 92 238 124" stroke={c} strokeWidth="14" strokeLinecap="round" fill="none"/>
      </g>
    );
    if (kind==='closed') return (
      <g>
        <path d="M82 122 Q110 134 138 122" stroke={c} strokeWidth="10" strokeLinecap="round" fill="none"/>
        <path d="M182 122 Q210 134 238 122" stroke={c} strokeWidth="10" strokeLinecap="round" fill="none"/>
      </g>
    );
    if (kind==='blink') return (
      <g>
        <rect x="86" y="96" width="48" height="52" rx="24" fill={c}>
          <animate attributeName="height" values="52;6;52;52;52" keyTimes="0;0.05;0.1;0.7;1" dur="3.6s" repeatCount="indefinite"/>
          <animate attributeName="y" values="96;120;96;96;96" keyTimes="0;0.05;0.1;0.7;1" dur="3.6s" repeatCount="indefinite"/>
        </rect>
        <rect x="186" y="96" width="48" height="52" rx="24" fill={c}>
          <animate attributeName="height" values="52;6;52;52;52" keyTimes="0;0.05;0.1;0.7;1" dur="3.6s" repeatCount="indefinite"/>
          <animate attributeName="y" values="96;120;96;96;96" keyTimes="0;0.05;0.1;0.7;1" dur="3.6s" repeatCount="indefinite"/>
        </rect>
        <ellipse cx="106" cy="110" rx="7" ry="4" fill="#fff" opacity=".75"/>
        <ellipse cx="206" cy="110" rx="7" ry="4" fill="#fff" opacity=".75"/>
      </g>
    );
    if (kind==='up') return (
      <g>
        <rect x="86" y="86" width="48" height="48" rx="24" fill={c}/>
        <rect x="186" y="86" width="48" height="48" rx="24" fill={c}/>
        <ellipse cx="108" cy="96" rx="7" ry="4" fill="#fff" opacity=".8"/>
        <ellipse cx="208" cy="96" rx="7" ry="4" fill="#fff" opacity=".8"/>
      </g>
    );
    if (kind==='look') return (
      <g>
        <rect x="86" y="96" width="48" height="52" rx="24" fill={c}/>
        <rect x="186" y="96" width="48" height="52" rx="24" fill={c}/>
        <ellipse cx="108" cy="110" rx="9" ry="5" fill="#fff" opacity=".9">
          <animate attributeName="cx" values="108;100;108" dur="3.4s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="208" cy="110" rx="9" ry="5" fill="#fff" opacity=".9">
          <animate attributeName="cx" values="208;200;208" dur="3.4s" repeatCount="indefinite"/>
        </ellipse>
      </g>
    );
    if (kind==='droopy') return (
      <g>
        <path d="M82 116 Q110 138 138 116" stroke={c} strokeWidth="12" strokeLinecap="round" fill="none"/>
        <path d="M182 116 Q210 138 238 116" stroke={c} strokeWidth="12" strokeLinecap="round" fill="none"/>
      </g>
    );
    if (kind==='boot') return (
      <g>
        <rect x="86" y="118" width="48" height="8" rx="4" fill={c}>
          <animate attributeName="height" values="6;52;6" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="y" values="118;96;118" dur="1.4s" repeatCount="indefinite"/>
        </rect>
        <rect x="186" y="118" width="48" height="8" rx="4" fill={c}>
          <animate attributeName="height" values="6;52;6" begin="0.15s" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="y" values="118;96;118" begin="0.15s" dur="1.4s" repeatCount="indefinite"/>
        </rect>
      </g>
    );
    if (kind==='dot') return (
      <g>
        <circle cx="110" cy="122" r="6" fill={c}/>
        <circle cx="210" cy="122" r="6" fill={c}/>
      </g>
    );
    return _eyes('pill', c);
  }

  function _mouth(kind, color){
    const c = color || P.skin;
    if (kind==='smile')   return <path d="M138 184 Q160 196 182 184" stroke={c} strokeWidth="10" strokeLinecap="round" fill="none"/>;
    if (kind==='big')     return <path d="M128 180 Q160 212 192 180" stroke={c} strokeWidth="11" strokeLinecap="round" fill={c} fillOpacity=".15"/>;
    if (kind==='soft')    return <path d="M144 186 Q160 192 176 186" stroke={c} strokeWidth="7" strokeLinecap="round" fill="none" opacity=".85"/>;
    if (kind==='line')    return <rect x="142" y="184" width="36" height="6" rx="3" fill={c} opacity=".75"/>;
    if (kind==='tinyo')   return <circle cx="160" cy="186" r="6" fill={c}/>;
    if (kind==='o')       return <ellipse cx="160" cy="186" rx="14" ry="11" fill={c}/>;
    if (kind==='wave-w')  return (
      <g>
        {[0,1,2,3,4,5,6,7].map(i=>{
          const x = 108 + i*14;
          const base = [6,14,22,12,18,28,12,6][i];
          return <rect key={i} x={x} y={184-base/2} width="3" height={base} rx="1.5" fill={c}>
            <animate attributeName="height" values={`${base*0.4};${base*1.2};${base*0.4}`} begin={`${i*0.04}s`} dur="0.55s" repeatCount="indefinite"/>
            <animate attributeName="y" values={`${184-base*0.2};${184-base*0.6};${184-base*0.2}`} begin={`${i*0.04}s`} dur="0.55s" repeatCount="indefinite"/>
          </rect>;
        })}
      </g>
    );
    if (kind==='wave-s')  return (
      <g>
        {[0,1,2,3,4,5].map(i=>{
          const x = 118 + i*16;
          const base = [4,10,16,8,14,4][i];
          return <rect key={i} x={x} y={184-base/2} width="3" height={base} rx="1.5" fill={c} opacity=".85">
            <animate attributeName="height" values={`${base*0.5};${base};${base*0.5}`} begin={`${i*0.05}s`} dur="0.7s" repeatCount="indefinite"/>
            <animate attributeName="y" values={`${184-base*0.25};${184-base*0.5};${184-base*0.25}`} begin={`${i*0.05}s`} dur="0.7s" repeatCount="indefinite"/>
          </rect>;
        })}
      </g>
    );
    if (kind==='wave-c')  return (
      <g>
        {[0,1,2,3,4].map(i=>{
          const x = 132 + i*14;
          const base = [4,12,18,10,4][i];
          return <rect key={i} x={x} y={196-base/2} width="3" height={base} rx="1.5" fill={P.mint}>
            <animate attributeName="height" values={`${base};${base*1.6};${base}`} begin={`${i*0.05}s`} dur="0.4s" repeatCount="indefinite"/>
            <animate attributeName="y" values={`${196-base*0.5};${196-base*0.8};${196-base*0.5}`} begin={`${i*0.05}s`} dur="0.4s" repeatCount="indefinite"/>
          </rect>;
        })}
      </g>
    );
    return <path d="M140 184 Q160 192 180 184" stroke={c} strokeWidth="9" strokeLinecap="round" fill="none"/>;
  }

  function _cheeks(visible, color){
    if (!visible) return null;
    return (
      <g opacity=".6">
        <circle cx="58" cy="158" r="14" fill={color || P.coral}/>
        <circle cx="262" cy="158" r="14" fill={color || P.coral}/>
      </g>
    );
  }

  // Tiny semantic icons — used sparingly.
  function _icon(kind){
    const c = P.skin, soft = P.skinSoft;
    if (kind==='wifi') return (
      <g transform="translate(160 38)">
        {[3,2,1].map((s,i)=>(
          <path key={i} d={`M${-9*s} ${4*s} a${9*s} ${9*s} 0 0 1 ${18*s} 0`} stroke={P.amber} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".55">
            <animate attributeName="opacity" values=".2;1;.2" begin={`${i*0.18}s`} dur="1.6s" repeatCount="indefinite"/>
          </path>
        ))}
        <circle cx="0" cy="6" r="2.5" fill={P.amber}/>
      </g>
    );
    if (kind==='mic-off') return (
      <g transform="translate(160 38)">
        <rect x="-7" y="-12" width="14" height="20" rx="7" fill="none" stroke={c} strokeWidth="3"/>
        <path d="M-12 -8 L12 12" stroke={P.amber} strokeWidth="3" strokeLinecap="round"/>
      </g>
    );
    if (kind==='battery') return (
      <g transform="translate(140 30)">
        <rect x="0" y="0" width="40" height="16" rx="3" fill="none" stroke={c} strokeWidth="2"/>
        <rect x="40" y="5" width="3" height="6" rx="1" fill={c}/>
        <rect x="2" y="2" width="20" height="12" rx="1.5" fill={P.mint}>
          <animate attributeName="width" values="6;34;6" dur="2.6s" repeatCount="indefinite"/>
        </rect>
      </g>
    );
    if (kind==='battery-low') return (
      <g transform="translate(140 30)">
        <rect x="0" y="0" width="40" height="16" rx="3" fill="none" stroke={c} strokeWidth="2"/>
        <rect x="40" y="5" width="3" height="6" rx="1" fill={c}/>
        <rect x="2" y="2" width="6" height="12" rx="1.5" fill={P.amber}>
          <animate attributeName="opacity" values="1;.4;1" dur="1.8s" repeatCount="indefinite"/>
        </rect>
      </g>
    );
    if (kind==='shield') return (
      <g transform="translate(160 36)">
        <path d="M0 -12 L13 -6 L13 6 Q13 16 0 22 Q-13 16 -13 6 L-13 -6 Z" fill="none" stroke={P.helper} strokeWidth="3" strokeLinejoin="round"/>
        <path d="M-5 4 L-1 8 L7 -2" fill="none" stroke={P.helper} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
    );
    if (kind==='helper') return (
      <g transform="translate(160 38)" opacity=".95">
        {/* parent figure silhouette */}
        <circle cx="0" cy="-6" r="4" fill={P.helper}/>
        <path d="M-7 6 Q-7 -2 0 -2 Q7 -2 7 6 Z" fill={P.helper}/>
      </g>
    );
    if (kind==='book') return (
      <g transform="translate(160 36)">
        <path d="M-12 -8 Q0 -12 12 -8 L12 8 Q0 4 -12 8 Z" fill="none" stroke={P.mint} strokeWidth="2.5" strokeLinejoin="round"/>
        <line x1="0" y1="-10" x2="0" y2="6" stroke={P.mint} strokeWidth="2"/>
      </g>
    );
    if (kind==='star') return (
      <g transform="translate(160 36)">
        <path d="M0 -12 L3.5 -3.5 L12 -2 L5.5 4 L7 12 L0 8 L-7 12 L-5.5 4 L-12 -2 L-3.5 -3.5 Z" fill={P.amber}/>
      </g>
    );
    if (kind==='compass') return (
      <g transform="translate(160 36)">
        <circle cx="0" cy="0" r="11" fill="none" stroke={P.amber} strokeWidth="2"/>
        <path d="M0 -7 L4 0 L0 7 L-4 0 Z" fill={P.amber}/>
      </g>
    );
    if (kind==='question') return (
      <g transform="translate(160 38)">
        <circle cx="0" cy="0" r="2" fill={P.amber} opacity=".4"/>
        <circle cx="0" cy="0" r="4" fill={P.amber} opacity=".7"/>
        <circle cx="0" cy="0" r="6" fill="none" stroke={P.amber} strokeWidth="1.5" opacity=".5"/>
      </g>
    );
    if (kind==='retry-loop') return (
      <g transform="translate(160 36)" opacity=".9">
        <path d="M-12 0 a12 10 0 1 1 4 9" stroke={P.amber} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M-8 9 L-12 5 L-12 11" stroke={P.amber} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </g>
    );
    if (kind==='zzz') return (
      <g>
        <text x="246" y="60" fontSize="22" fontWeight="800" fill={P.skinSoft} fontFamily="-apple-system,sans-serif" opacity=".7">z</text>
        <text x="266" y="42" fontSize="16" fontWeight="800" fill={P.skinSoft} fontFamily="-apple-system,sans-serif" opacity=".5">z</text>
      </g>
    );
    if (kind==='sparkles') return (
      <g>
        {[[40,40,1],[280,46,1.1],[36,180,0.8],[280,180,0.9],[160,30,1.2]].map(([x,y,s],i)=>(
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill={P.mint}>
              <animate attributeName="opacity" values="0;1;0" begin={`${i*0.18}s`} dur="1.2s" repeatCount="indefinite"/>
            </path>
          </g>
        ))}
      </g>
    );
    if (kind==='confetti') return (
      <g>
        {[0,1,2,3,4,5,6,7].map(i=>{
          const colors = [P.mint, P.amber, P.aqua, P.coral, P.violet];
          const x = 32 + i*36, y = 26 + (i%3)*8;
          const c = colors[i%colors.length];
          return <rect key={i} x={x} y={y} width="6" height="10" rx="1.5" fill={c}>
            <animate attributeName="y" values={`${y};${y+22};${y}`} dur="1.6s" begin={`${i*0.08}s`} repeatCount="indefinite"/>
          </rect>;
        })}
      </g>
    );
    if (kind==='orbit') return (
      <g transform="translate(160 36)">
        <circle cx="0" cy="0" r="11" fill="none" stroke={P.violet} strokeWidth="1.5" opacity=".4"/>
        <circle cx="11" cy="0" r="2.5" fill={P.violet}>
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="1.6s" repeatCount="indefinite"/>
        </circle>
      </g>
    );
    if (kind==='pause') return (
      <g transform="translate(160 38)">
        <rect x="-8" y="-8" width="5" height="16" rx="1.5" fill={P.skinSoft}/>
        <rect x="3" y="-8" width="5" height="16" rx="1.5" fill={P.skinSoft}/>
      </g>
    );
    return null;
  }

  function _ring(kind, color){
    if (!kind) return null;
    const c = color || P.aqua;
    if (kind==='pulse') return (
      <g>
        <rect x="6" y="6" width={W-12} height={H-12} rx="22" fill="none" stroke={c} strokeWidth="3.5" opacity=".95"/>
        <rect x="6" y="6" width={W-12} height={H-12} rx="22" fill="none" stroke={c} strokeWidth="3.5">
          <animate attributeName="opacity" values=".7;0;.7" dur="1.8s" repeatCount="indefinite"/>
        </rect>
      </g>
    );
    if (kind==='glow') return (
      <rect x="6" y="6" width={W-12} height={H-12} rx="22" fill="none" stroke={c} strokeWidth="3.5" opacity=".95"/>
    );
    if (kind==='breathing') return (
      <rect x="6" y="6" width={W-12} height={H-12} rx="22" fill="none" stroke={c} strokeWidth="3" opacity=".7">
        <animate attributeName="opacity" values=".25;.85;.25" dur="3.6s" repeatCount="indefinite"/>
      </rect>
    );
    if (kind==='thin') return (
      <rect x="6" y="6" width={W-12} height={H-12} rx="22" fill="none" stroke={c} strokeWidth="1.5" opacity=".4"/>
    );
    return null;
  }

  // The 25 production states. Each is a recipe.
  const E = {
    boot:        { eyes:'boot',         mouth:'line',   ring:'pulse',     ringC:P.blue,   bg:P.blue,   ambient:.18, anim:'' },
    idle:        { eyes:'pill',         mouth:'smile',  ring:'breathing', ringC:P.cyan,   bg:P.cyan,   ambient:.10, cheeks:true,  anim:'softBob 4.2s ease-in-out infinite' },
    look:        { eyes:'look',         mouth:'soft',   ring:'thin',      ringC:P.cyan,   bg:P.cyan,   ambient:.12, cheeks:true,  anim:'softBob 4.5s ease-in-out infinite' },
    speak_word:  { eyes:'pill',         mouth:'wave-w', ring:'glow',      ringC:P.cyan,   bg:P.cyan,   ambient:.20, cheeks:true,  anim:'speakBob 0.8s ease-in-out infinite' },
    speak_sent:  { eyes:'blink',        mouth:'wave-s', ring:'glow',      ringC:P.cyan,   bg:P.cyan,   ambient:.18, anim:'speakBob 0.9s ease-in-out infinite' },
    listen:      { eyes:'pill-attentive', mouth:'tinyo', ring:'pulse',   ringC:P.aqua,   bg:P.aqua,   ambient:.22, anim:'softBob 3s ease-in-out infinite' },
    child_speak: { eyes:'pill-attentive', mouth:'wave-c', ring:'pulse',  ringC:P.mint,   bg:P.mint,   ambient:.20, anim:'softBob 1.6s ease-in-out infinite' },
    think:       { eyes:'up',           mouth:'line',   ring:'thin',      ringC:P.violet, bg:P.violet, ambient:.16, icon:'orbit', anim:'thinkTilt 2.4s ease-in-out infinite' },
    success:     { eyes:'happy-arc',    mouth:'big',    ring:'glow',      ringC:P.mint,   bg:P.mint,   ambient:.24, cheeks:true,  icon:'sparkles', anim:'softBob 1s ease-in-out infinite' },
    celebrate:   { eyes:'happy-arc',    mouth:'big',    ring:'glow',      ringC:P.mint,   bg:P.mint,   ambient:.30, cheeks:true,  icon:'confetti', anim:'celBob 0.9s ease-in-out infinite' },
    retry:       { eyes:'pill',         mouth:'soft',   ring:'thin',      ringC:P.amber,  bg:P.amber,  ambient:.10, cheeks:true,  icon:'retry-loop', anim:'softBob 3s ease-in-out infinite' },
    didnt_hear:  { eyes:'up',           mouth:'soft',   ring:'thin',      ringC:P.amber,  bg:P.amber,  ambient:.12, icon:'question', anim:'thinkTilt 3s ease-in-out infinite' },
    silence:     { eyes:'blink',        mouth:'soft',   ring:'breathing', ringC:P.aqua,   bg:P.aqua,   ambient:.10, anim:'softBob 5.2s ease-in-out infinite' },
    interrupt:   { eyes:'pill',         mouth:'tinyo',  ring:'thin',      ringC:P.cyan,   bg:P.cyan,   ambient:.10, icon:'pause', anim:'' },
    review:      { eyes:'pill',         mouth:'smile',  ring:'glow',      ringC:P.mint,   bg:P.mint,   ambient:.12, cheeks:true,  icon:'book', anim:'softBob 3.5s ease-in-out infinite' },
    redirect:    { eyes:'pill',         mouth:'soft',   ring:'thin',      ringC:P.amber,  bg:P.amber,  ambient:.10, cheeks:true,  icon:'compass', anim:'softTilt 3.2s ease-in-out infinite' },
    course_ready:{ eyes:'pill',         mouth:'smile',  ring:'glow',      ringC:P.mint,   bg:P.mint,   ambient:.16, cheeks:true,  icon:'star', anim:'softBob 3s ease-in-out infinite' },
    syncing:     { eyes:'closed',       mouth:'soft',   ring:'breathing', ringC:P.violet, bg:P.violet, ambient:.14, icon:'orbit', anim:'softBob 4s ease-in-out infinite' },
    locked:      { eyes:'pill',         mouth:'line',   ring:'thin',      ringC:P.helper, bg:P.helper, ambient:.10, icon:'helper', anim:'softBob 4s ease-in-out infinite' },
    reconnect:   { eyes:'closed',       mouth:'soft',   ring:'breathing', ringC:P.amber,  bg:P.amber,  ambient:.10, icon:'wifi', anim:'softBob 3.4s ease-in-out infinite' },
    mic_off:     { eyes:'pill',         mouth:'line',   ring:'glow',      ringC:P.amber,  bg:P.amber,  ambient:.10, icon:'mic-off', anim:'' },
    low_batt:    { eyes:'droopy',       mouth:'soft',   ring:'thin',      ringC:P.amber,  bg:P.amber,  ambient:.08, icon:'battery-low', anim:'softBob 5s ease-in-out infinite' },
    charging:    { eyes:'closed',       mouth:'smile',  ring:'breathing', ringC:P.mint,   bg:P.mint,   ambient:.12, icon:'battery', anim:'softBob 5s ease-in-out infinite' },
    sleep:       { eyes:'closed',       mouth:'line',   ring:null,                                bg:P.bg0,    ambient:0,   icon:'zzz', anim:'softBob 6s ease-in-out infinite' },
    safety:      { eyes:'closed',       mouth:'line',   ring:'glow',      ringC:P.helper, bg:P.helper, ambient:.14, icon:'shield', anim:'' },
  };

  // The 25 spec states with metadata.
  const STATES_V2 = [
    { id:'boot',         num:1,  label:'Wake / Boot',         group:'Lifecycle',    anim:'Eyes rise from darkness like dawn, soft blue ring breathes once, then settles.', audio:'Two-note startup chime, low → high.', feel:'Premium hardware booting up. Trust.' , when:'On power-on or wake from sleep.' },
    { id:'idle',         num:2,  label:'Idle Ready',          group:'Lifecycle',    anim:'Slow 4s breathing glow, cheek warmth, blink every ~6s.', audio:'Silent.',                       feel:'Patient companion, ready when you are.', when:'Default rest face between turns.' },
    { id:'look',         num:3,  label:'Attention',           group:'Conversation', anim:'Pupils slowly track left↔right, slight forward lean.', audio:'Silent.',                          feel:'"I see you." Eye contact.',           when:'After greeting, scanning for child.' },
    { id:'speak_word',   num:4,  label:'Robot speaking · word',     group:'Conversation', anim:'8-bar waveform syncs to TTS phonemes, micro head bob.', audio:'Robot voice: "Apple."',     feel:'Clear teaching voice, easy to mimic.', when:'Saying the target word once, alone.' },
    { id:'speak_sent',   num:5,  label:'Robot speaking · sentence', group:'Conversation', anim:'Wider waveform, natural blink mid-sentence, slow bob.', audio:'Robot voice: "I like apples."', feel:'Conversational, friendly teacher.',  when:'Modeling full target sentence.' },
    { id:'listen',       num:6,  label:'Listening',           group:'Conversation', anim:'Aqua ring pulses 1.6s, eyes open wide, mouth a tiny dot.', audio:'Soft "listening" tone (~440Hz, 80ms).', feel:'"Your turn now." Calm invitation.', when:'Mic open, waiting for child to speak.' },
    { id:'child_speak',  num:7,  label:'Child voice detected',group:'Conversation', anim:'Mint ring pulses faster, mint waveform rises near mouth, eyes go attentive.', audio:'Silent — Robot is listening.', feel:'"You\'re being heard." Rewarding even before judgment.', when:'VAD detected ≥ 200ms of speech.' },
    { id:'think',        num:8,  label:'Thinking',            group:'Conversation', anim:'Eyes look up, violet orbit dot circles 1.6s, slight tilt rocks.', audio:'Silent.',                  feel:'A friend considering, not a spinner.', when:'~600–1500ms latency between child end and reply.' },
    { id:'success',      num:9,  label:'Success',             group:'Feedback',     anim:'Eyes arc into smile, cheeks brighten, 5 mint sparkles drift up over 800ms.', audio:'Soft positive chime + "Yes!" or "Great!"', feel:'Earned, warm, not loud.', when:'Correct answer on a single turn.' },
    { id:'celebrate',    num:10, label:'Big celebration',     group:'Feedback',     anim:'Stronger bob, mint ring glow, controlled confetti rain (~2s), then settles to idle.', audio:'Two-note flourish + "You did it!"', feel:'Lesson-end joy, still composed.',  when:'End of lesson or milestone unlock.' },
    { id:'retry',        num:11, label:'Gentle retry',        group:'Feedback',     anim:'Slight head tilt (3°), soft amber loop arrow above, eyes stay warm.', audio:'"Let\'s try together!" — soft tone.', feel:'Encouraging, never disappointed.',  when:'After a missed attempt.' },
    { id:'didnt_hear',   num:12, label:"Didn't hear clearly", group:'Feedback',     anim:'Eyes look up + soft ear tilt; small amber question shimmer.', audio:'"Hmm, can you say it again?"',   feel:'Curious, no blame.',                  when:'Listen window timed out without confident audio.' },
    { id:'silence',      num:13, label:'Silence / waiting',   group:'Conversation', anim:'Slow blink every 3s, breathing aqua ring stays soft.', audio:'Silent until 8s, then gentle "Take your time."', feel:'Patience, no pressure.',     when:'>3s of silence after listen window opens.' },
    { id:'interrupt',    num:14, label:'Interrupted',         group:'Conversation', anim:'Waveform stops mid-frame, mouth shrinks to dot, pause icon hovers, transitions to listen in 200ms.', audio:'Robot voice fades 150ms.', feel:'Robot yields gracefully.',  when:'Child voice detected while Robot is speaking.' },
    { id:'review',       num:15, label:'Review suggested',    group:'Feedback',     anim:'Calm smile, small mint book glyph rises 8px, breathing ring.', audio:'"Want to make this stronger? Let\'s practice."', feel:'Invitation, not remediation.', when:'Word due for review (spaced repetition).' },
    { id:'redirect',     num:16, label:'Off-topic redirect',  group:'Safety',       anim:'Soft tilt, amber compass icon spins 90° once, returns to neutral.', audio:'"Let\'s come back to our lesson."', feel:'Calm guidance, friendly.',     when:'Child speech off-topic for 2+ turns.' },
    { id:'course_ready', num:17, label:'Course ready',        group:'Lifecycle',    anim:'Mint ring glow, amber star above, idle smile.', audio:'"Ready when you are!"',                feel:'Lesson is loaded, anticipation.',     when:'New lesson sent from app and synced.' },
    { id:'syncing',      num:18, label:'Course syncing',      group:'System',       anim:'Eyes closed peacefully, violet orbit dot circles, breathing ring.', audio:'Silent.',                feel:'Working calmly, premium.',           when:'Downloading or updating course content.' },
    { id:'locked',       num:19, label:'Course locked',       group:'Safety',       anim:'Neutral smile, helper silhouette glyph rises gently, lavender thin ring.', audio:'"Ask a grown-up to help."', feel:'Calm, no pressure, no upsell.',  when:'Child taps a lesson without parent unlock.' },
    { id:'reconnect',    num:20, label:'Reconnecting Wi-Fi',  group:'System',       anim:'Eyes closed peacefully, amber wifi arcs fade in/out 1.6s, breathing ring.', audio:'Silent.',          feel:'"I\'m trying" — never broken.',     when:'Network blip during a lesson.' },
    { id:'mic_off',      num:21, label:'Microphone issue',    group:'System',       anim:'Soft brow-down, mic-with-slash glyph pulses gently, amber thin ring.', audio:'Silent until parent app prompts.', feel:'Concerned, calm, parent-aware.', when:'Mic permission missing or hardware mute.' },
    { id:'low_batt',     num:22, label:'Low battery',         group:'System',       anim:'Slightly droopy eyes, dim ambient, amber battery sliver fades 1.8s.', audio:'"I\'m getting sleepy. Can you charge me?"', feel:'Friendly heads-up.',  when:'Battery below 15%.' },
    { id:'charging',     num:23, label:'Charging',            group:'System',       anim:'Eyes closed, smile, mint battery fills repeatedly, breathing.', audio:'Silent.',                       feel:'Peaceful, restoring.',                when:'On dock or USB charging.' },
    { id:'sleep',        num:24, label:'Sleep',               group:'Lifecycle',    anim:'Eyes closed, slow long bob (6s), tiny "z z" drift up.', audio:'Silent.',                        feel:'Quiet rest, dim glow only.',          when:'Quiet hours or 10min idle timeout.' },
    { id:'safety',       num:25, label:'Safety pause',        group:'Safety',       anim:'Eyes closed peacefully, lavender glow ring, shield-with-check rises.', audio:'"Let\'s pause and find a grown-up."', feel:'Protective, never alarming.', when:'Trigger phrase or extended off-topic.' },
  ];

  // The Face V2 component (production).
  function FaceV2({ emotion='idle', size=320 }){
    const cfg = E[emotion] || E.idle;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width={size} height={size*H/W} style={{ display:'block', background:P.bg0, borderRadius:14 }}>
        <defs>
          <radialGradient id={'amb-'+emotion} cx="50%" cy="55%" r="65%">
            <stop offset="0%" stopColor={cfg.bg} stopOpacity={cfg.ambient}/>
            <stop offset="65%" stopColor={cfg.bg} stopOpacity={cfg.ambient*0.3}/>
            <stop offset="100%" stopColor={cfg.bg} stopOpacity="0"/>
          </radialGradient>
          {/* subtle vignette to make corners feel deep */}
          <radialGradient id="vignette" cx="50%" cy="50%" r="80%">
            <stop offset="60%" stopColor="#000" stopOpacity="0"/>
            <stop offset="100%" stopColor="#000" stopOpacity=".55"/>
          </radialGradient>
        </defs>
        {/* ambient bg */}
        <rect width={W} height={H} fill={`url(#amb-${emotion})`}/>
        {/* the alive layer */}
        <g style={{ animation: cfg.anim, transformOrigin: '160px 130px' }}>
          {_cheeks(cfg.cheeks, P.coral)}
          {_eyes(cfg.eyes)}
          {_mouth(cfg.mouth)}
          {cfg.icon && _icon(cfg.icon)}
        </g>
        {/* ring */}
        {_ring(cfg.ring, cfg.ringC)}
        {/* vignette on top */}
        <rect width={W} height={H} fill="url(#vignette)" pointerEvents="none"/>
        <style>{`
          @keyframes softBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
          @keyframes speakBob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
          @keyframes celBob { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-6px) rotate(1deg)} }
          @keyframes thinkTilt { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
          @keyframes softTilt { 0%,100%{transform:rotate(-1.5deg)} 50%{transform:rotate(1.5deg)} }
        `}</style>
      </svg>
    );
  }

  Object.assign(window, {
    FaceA, FaceB, FaceC, FaceV2,
    LCD_PALETTE: P,
    STATES_V2,
  });
})();
