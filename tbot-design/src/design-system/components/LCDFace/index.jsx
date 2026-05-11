import React from 'react';

// LCD face + RobotDevice — minimal preview components used by mobile screens
// (device pairing, course library, robot management). Not a design-system page.
// Renders a simulated 320×240 LCD face inside a soft device shell.

export const LCD_STATES_LIST = [
  // Lifecycle
  { id:'boot',       title:'Booting',          group:'Lifecycle' },
  { id:'sleep',      title:'Sleeping',          group:'Lifecycle' },
  { id:'charging',   title:'Charging',          group:'Lifecycle' },
  { id:'paired',     title:'Just paired',       group:'Lifecycle' },
  // Conversation
  { id:'idle',       title:'Idle happy',        group:'Conversation' },
  { id:'looking',    title:'Looking at child',  group:'Conversation' },
  { id:'speaking',   title:'Speaking',          group:'Conversation' },
  { id:'listening',  title:'Listening',         group:'Conversation' },
  { id:'thinking',   title:'Thinking',          group:'Conversation' },
  // Feedback
  { id:'happy',      title:'Praise',            group:'Feedback' },
  { id:'celebrate',  title:'Celebrate',         group:'Feedback' },
  { id:'gentle',     title:'Gentle correction', group:'Feedback' },
  { id:'curious',    title:'Curious',           group:'Feedback' },
  // System
  { id:'wifi',       title:'Connecting Wi-Fi',  group:'System' },
  { id:'reconnect',  title:'Reconnecting',      group:'System' },
  { id:'offline',    title:'Offline',           group:'System' },
  { id:'lowbat',     title:'Low battery',       group:'System' },
  // Safety
  { id:'pause',      title:'Safety pause',      group:'Safety' },
  { id:'redirect',   title:'Gentle redirect',   group:'Safety' },
  { id:'parent',     title:'Parent only',       group:'Safety' },
];

export default function LCDFace({ emotion='idle', size=300, accent='#FF6F61' }) {
  // Stylised 4:3 LCD face. Eyes + mouth + ring; some states add overlays.
  const W = size, H = Math.round(size * 0.75);
  const cx = W/2, cy = H/2;
  const skin = '#FFE3B0';
  const ink = '#1A1A1F';

  // Per-state config
  const cfg = (() => {
    switch(emotion){
      case 'boot':      return { eye:'closed', mouth:'flat',   ring:'pulse',  bg:'#0E1116' };
      case 'sleep':     return { eye:'closed', mouth:'flat',   ring:null,     bg:'#0A0C10' };
      case 'charging':  return { eye:'half',   mouth:'smile',  ring:'pulse',  bg:'#0E1116', icon:'bolt' };
      case 'paired':    return { eye:'open',   mouth:'smile',  ring:'spark',  bg:'#0E1116' };
      case 'looking':   return { eye:'wide',   mouth:'smile',  ring:null,     bg:'#0E1116' };
      case 'speaking':  return { eye:'open',   mouth:'wave',   ring:null,     bg:'#0E1116' };
      case 'listening': return { eye:'open',   mouth:'oh',     ring:'glow',   bg:'#0E1116' };
      case 'thinking':  return { eye:'side',   mouth:'flat',   ring:'dots',   bg:'#0E1116' };
      case 'happy':     return { eye:'happy',  mouth:'bigsmile',ring:'spark', bg:'#0E1116' };
      case 'celebrate': return { eye:'happy',  mouth:'bigsmile',ring:'sparks',bg:'#0E1116' };
      case 'gentle':    return { eye:'soft',   mouth:'wobble', ring:null,     bg:'#0E1116' };
      case 'curious':   return { eye:'wide',   mouth:'oh',     ring:null,     bg:'#0E1116' };
      case 'wifi':      return { eye:'half',   mouth:'flat',   ring:'pulse',  bg:'#0E1116', icon:'wifi' };
      case 'reconnect': return { eye:'half',   mouth:'flat',   ring:'pulse',  bg:'#0E1116', icon:'wifi' };
      case 'offline':   return { eye:'closed', mouth:'flat',   ring:null,     bg:'#0E1116', icon:'wifioff' };
      case 'lowbat':    return { eye:'half',   mouth:'flat',   ring:null,     bg:'#0E1116', icon:'lowbat' };
      case 'pause':     return { eye:'closed', mouth:'flat',   ring:null,     bg:'#0E1116' };
      case 'redirect':  return { eye:'soft',   mouth:'smile',  ring:null,     bg:'#0E1116' };
      case 'parent':    return { eye:'half',   mouth:'flat',   ring:null,     bg:'#0E1116' };
      case 'idle':
      default:          return { eye:'open',   mouth:'smile',  ring:null,     bg:'#0E1116' };
    }
  })();

  // Eye renderer
  const eyeR = 14 * (size/300);
  const eyeY = cy - 8;
  const eyeOff = 38 * (size/300);
  const renderEye = (sign) => {
    const x = cx + sign*eyeOff;
    if (cfg.eye === 'closed') return <line key={sign} x1={x-eyeR} y1={eyeY} x2={x+eyeR} y2={eyeY} stroke={skin} strokeWidth={5} strokeLinecap="round"/>;
    if (cfg.eye === 'half')   return <path key={sign} d={`M ${x-eyeR} ${eyeY} a ${eyeR} ${eyeR} 0 0 1 ${eyeR*2} 0`} fill={skin} />;
    if (cfg.eye === 'happy')  return <path key={sign} d={`M ${x-eyeR} ${eyeY+4} q ${eyeR} -${eyeR*1.4} ${eyeR*2} 0`} stroke={skin} strokeWidth={5} fill="none" strokeLinecap="round"/>;
    if (cfg.eye === 'wide')   return <circle key={sign} cx={x} cy={eyeY} r={eyeR*1.15} fill={skin}/>;
    if (cfg.eye === 'soft')   return <circle key={sign} cx={x} cy={eyeY} r={eyeR*0.85} fill={skin}/>;
    if (cfg.eye === 'side')   return <circle key={sign} cx={x + sign*4} cy={eyeY} r={eyeR} fill={skin}/>;
    return <circle key={sign} cx={x} cy={eyeY} r={eyeR} fill={skin}/>;
  };

  // Mouth renderer
  const mY = cy + 32 * (size/300);
  const mW = 56 * (size/300);
  const renderMouth = () => {
    if (cfg.mouth === 'smile')     return <path d={`M ${cx-mW/2} ${mY} q ${mW/2} ${mW*0.35} ${mW} 0`} stroke={skin} strokeWidth={6} fill="none" strokeLinecap="round"/>;
    if (cfg.mouth === 'bigsmile')  return <path d={`M ${cx-mW/2} ${mY-4} q ${mW/2} ${mW*0.6} ${mW} 0`} stroke={skin} strokeWidth={7} fill="none" strokeLinecap="round"/>;
    if (cfg.mouth === 'wobble')    return <path d={`M ${cx-mW/2} ${mY} q ${mW/4} -6 ${mW/2} 0 t ${mW/2} 0`} stroke={skin} strokeWidth={5} fill="none" strokeLinecap="round"/>;
    if (cfg.mouth === 'oh')        return <ellipse cx={cx} cy={mY+4} rx={12 * (size/300)} ry={14 * (size/300)} fill={skin}/>;
    if (cfg.mouth === 'wave') {
      const yMid = mY+4;
      return <path d={`M ${cx-mW/2} ${yMid} q ${mW/8} -8 ${mW/4} 0 t ${mW/4} 0 t ${mW/4} 0 t ${mW/4} 0`} stroke={skin} strokeWidth={6} fill="none" strokeLinecap="round">
        <animate attributeName="d" values={
          `M ${cx-mW/2} ${yMid} q ${mW/8} -8 ${mW/4} 0 t ${mW/4} 0 t ${mW/4} 0 t ${mW/4} 0;
           M ${cx-mW/2} ${yMid} q ${mW/8} 8 ${mW/4} 0 t ${mW/4} 0 t ${mW/4} 0 t ${mW/4} 0;
           M ${cx-mW/2} ${yMid} q ${mW/8} -8 ${mW/4} 0 t ${mW/4} 0 t ${mW/4} 0 t ${mW/4} 0`
        } dur="0.8s" repeatCount="indefinite"/>
      </path>;
    }
    return <line x1={cx-mW/3} y1={mY} x2={cx+mW/3} y2={mY} stroke={skin} strokeWidth={5} strokeLinecap="round"/>;
  };

  // Ring renderer (animated halo)
  const ringR = Math.min(W,H)*0.46;
  const renderRing = () => {
    if (cfg.ring === 'pulse')   return <circle cx={cx} cy={cy} r={ringR} fill="none" stroke={accent} strokeWidth={3} opacity={0.7}>
      <animate attributeName="r" values={`${ringR-4};${ringR+6};${ringR-4}`} dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
    </circle>;
    if (cfg.ring === 'glow')    return <circle cx={cx} cy={cy} r={ringR} fill="none" stroke={accent} strokeWidth={4} opacity={0.5}>
      <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.4s" repeatCount="indefinite"/>
    </circle>;
    if (cfg.ring === 'spark')   return <circle cx={cx} cy={cy} r={ringR} fill="none" stroke={accent} strokeWidth={3} strokeDasharray="6 8" opacity={0.7}>
      <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="6s" repeatCount="indefinite"/>
    </circle>;
    if (cfg.ring === 'sparks')  return <g>
      {[0,72,144,216,288].map(a=>{
        const rad = a*Math.PI/180;
        const sx = cx + Math.cos(rad)*ringR;
        const sy = cy + Math.sin(rad)*ringR;
        return <circle key={a} cx={sx} cy={sy} r={3} fill={accent}>
          <animate attributeName="r" values="2;5;2" dur="0.9s" begin={`${a/360}s`} repeatCount="indefinite"/>
        </circle>;
      })}
    </g>;
    if (cfg.ring === 'dots')    return <g>
      {[0,1,2].map(i=>(
        <circle key={i} cx={cx + (i-1)*14} cy={cy + ringR*0.85} r={3.5} fill={skin} opacity={0.7}>
          <animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" begin={`${i*0.2}s`} repeatCount="indefinite"/>
        </circle>
      ))}
    </g>;
    return null;
  };

  // Optional icon overlay (top-right of LCD)
  const renderIcon = () => {
    if (!cfg.icon) return null;
    const ix = W - 26, iy = 22;
    if (cfg.icon === 'bolt') return <path d={`M ${ix-4} ${iy-8} L ${ix+2} ${iy-1} L ${ix-1} ${iy-1} L ${ix+4} ${iy+8} L ${ix-2} ${iy+1} L ${ix+1} ${iy+1} Z`} fill="#FFD66B"/>;
    if (cfg.icon === 'wifi') return <g stroke={accent} strokeWidth={2} fill="none" strokeLinecap="round">
      <path d={`M ${ix-10} ${iy-2} q 10 -10 20 0`}/>
      <path d={`M ${ix-6} ${iy+2} q 6 -6 12 0`}/>
      <circle cx={ix} cy={iy+7} r={1.5} fill={accent}/>
    </g>;
    if (cfg.icon === 'wifioff') return <g stroke="#888" strokeWidth={2} fill="none" strokeLinecap="round">
      <path d={`M ${ix-10} ${iy-2} q 10 -10 20 0`} opacity={0.5}/>
      <line x1={ix-10} y1={iy-9} x2={ix+10} y2={iy+9} stroke="#FF6F61"/>
    </g>;
    if (cfg.icon === 'lowbat') return <g>
      <rect x={ix-12} y={iy-5} width={20} height={10} rx={2} fill="none" stroke="#FF6F61" strokeWidth={2}/>
      <rect x={ix+8} y={iy-2} width={3} height={4} fill="#FF6F61"/>
      <rect x={ix-10} y={iy-3} width={4} height={6} fill="#FF6F61"/>
    </g>;
    return null;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display:'block', borderRadius:8 }}>
      <rect x={0} y={0} width={W} height={H} fill={cfg.bg}/>
      {/* faint screen scanlines */}
      <rect x={0} y={0} width={W} height={H} fill="url(#lcd-scan)" opacity={0.12} pointerEvents="none"/>
      <defs>
        <pattern id="lcd-scan" width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="1" fill="#fff" opacity={0.04}/>
        </pattern>
      </defs>
      {renderRing()}
      {renderEye(-1)}
      {renderEye(1)}
      {renderMouth()}
      {renderIcon()}
    </svg>
  );
}

export function RobotDevice({ emotion='idle', size=200, accent='#FF6F61', name }) {
  // Soft puffy device shell with inset LCD face. Size = device width.
  const w = size;
  const h = Math.round(size * 1.05);
  const lcdW = Math.round(w * 0.78);
  const lcdH = Math.round(lcdW * 0.75);
  return (
    <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{
        width:w, height:h, borderRadius: w*0.22,
        background:'linear-gradient(160deg,#F5EFE6 0%,#E8DFD0 100%)',
        boxShadow:'inset 0 -8px 16px rgba(0,0,0,0.08), 0 8px 18px rgba(80,60,30,0.12)',
        position:'relative', display:'flex', alignItems:'center', justifyContent:'center'
      }}>
        {/* ear/antenna nubs */}
        <div style={{ position:'absolute', top:-6, left:w*0.18, width:w*0.14, height:w*0.14, borderRadius:'50%',
          background:'linear-gradient(160deg,#F5EFE6,#D9CDB8)', boxShadow:'inset 0 -3px 6px rgba(0,0,0,0.08)' }}/>
        <div style={{ position:'absolute', top:-6, right:w*0.18, width:w*0.14, height:w*0.14, borderRadius:'50%',
          background:'linear-gradient(160deg,#F5EFE6,#D9CDB8)', boxShadow:'inset 0 -3px 6px rgba(0,0,0,0.08)' }}/>
        {/* LCD bezel */}
        <div style={{
          width:lcdW, height:lcdH, borderRadius: w*0.10,
          background:'#1A1A1F', padding: w*0.018,
          boxShadow:'inset 0 2px 4px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.5)'
        }}>
          <div style={{ width:'100%', height:'100%', borderRadius: w*0.08, overflow:'hidden', background:'#0E1116' }}>
            <LCDFace emotion={emotion} size={lcdW - w*0.036} accent={accent}/>
          </div>
        </div>
        {/* speaker dots at bottom */}
        <div style={{ position:'absolute', bottom:w*0.06, left:'50%', transform:'translateX(-50%)', display:'flex', gap:5 }}>
          {[0,1,2,3,4].map(i=><div key={i} style={{ width:4, height:4, borderRadius:'50%', background:'rgba(0,0,0,0.18)' }}/>)}
        </div>
      </div>
      {name && <div style={{ fontSize:13, color:'#5A5A66', fontWeight:500 }}>{name}</div>}
    </div>
  );
}
