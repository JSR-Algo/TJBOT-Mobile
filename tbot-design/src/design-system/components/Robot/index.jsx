import React, { useEffect } from 'react';
import { useAnimations } from '@/design-system/animations/AnimationProvider.jsx';

// Robot character — soft sticker-puffy with expressive emotions.
// Drives emotion via props: idle | happy | greet | listen | think | speak | success | gentle | curious | sleep | sad | worry

export const ROBOT_EMOTES = [
  'idle','happy','greet','listen','think','speak','success','gentle','curious','sleep','sad','worry'
];

const ROBOT_KEYFRAMES = `
  @keyframes bot-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes bot-bob-strong { 0%,100%{transform:translateY(0) rotate(-1deg)} 50%{transform:translateY(-12px) rotate(1deg)} }
  @keyframes bot-tilt { 0%,100%{transform:rotate(-2deg)} 50%{transform:rotate(2deg)} }
  @keyframes bot-think { 0%,100%{transform:rotate(-3deg) translateY(0)} 50%{transform:rotate(3deg) translateY(-2px)} }
  @keyframes bot-blink { 0%,92%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
  @keyframes bot-mouth-talk { 0%,100%{transform:scaleY(1)} 25%{transform:scaleY(0.5)} 50%{transform:scaleY(1.2)} 75%{transform:scaleY(0.7)} }
  @keyframes bot-antenna { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
  @keyframes bot-glow { 0%,100%{opacity:.45;transform:scale(1)} 50%{opacity:.85;transform:scale(1.08)} }
  @keyframes bot-glow-soft { 0%,100%{opacity:.25;transform:scale(.98)} 50%{opacity:.55;transform:scale(1.04)} }
  @keyframes bot-pulse-ring { 0%{transform:scale(.85);opacity:.7} 100%{transform:scale(1.6);opacity:0} }
  @keyframes bot-think-dot { 0%,80%,100%{opacity:.2;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }
  @keyframes bot-spark { 0%{transform:scale(0) rotate(0);opacity:0} 30%{transform:scale(1.1) rotate(180deg);opacity:1} 100%{transform:scale(.6) rotate(360deg);opacity:0} }
  @keyframes wave-bar { 0%,100%{transform:scaleY(.3)} 50%{transform:scaleY(1)} }
  @keyframes zzz-float { 0%{transform:translate(0,0) scale(.7);opacity:0} 30%{opacity:1} 100%{transform:translate(20px,-30px) scale(1.1);opacity:0} }
  @keyframes ring-pulse { 0%{transform:scale(.9);opacity:.65} 100%{transform:scale(1.5);opacity:0} }
`;

export default function Robot({ emotion = 'idle', size = 220, color, accent }){
  const { register } = useAnimations();
  useEffect(() => { register('robot-styles', ROBOT_KEYFRAMES); }, [register]);

  const bodyColor = color || 'var(--bot-body)';
  const bodyDark = 'var(--bot-body-2)';
  const accentColor = accent || 'var(--coral)';

  // Emotion config
  const cfg = {
    idle:    { bodyAnim: 'bot-bob 3.6s ease-in-out infinite', mouth: 'smile-soft', eyes: 'open', cheek: true, antennaAnim: '', glow: 'soft' },
    happy:   { bodyAnim: 'bot-bob 2.4s ease-in-out infinite', mouth: 'smile', eyes: 'open', cheek: true, antennaAnim: 'bot-antenna 2s ease-in-out infinite', glow: 'soft' },
    greet:   { bodyAnim: 'bot-bob-strong 1.6s ease-in-out infinite', mouth: 'open-smile', eyes: 'open', cheek: true, antennaAnim: 'bot-antenna 1.4s ease-in-out infinite', glow: 'on', wave: true },
    listen:  { bodyAnim: 'bot-tilt 3s ease-in-out infinite', mouth: 'tiny', eyes: 'open', cheek: false, antennaAnim: 'bot-antenna 1.8s ease-in-out infinite', glow: 'on', ear: true },
    think:   { bodyAnim: 'bot-think 2.4s ease-in-out infinite', mouth: 'tiny', eyes: 'up', cheek: false, antennaAnim: '', glow: 'on', dots: true },
    speak:   { bodyAnim: 'bot-bob 2s ease-in-out infinite', mouth: 'talk', eyes: 'open', cheek: true, antennaAnim: 'bot-antenna 1.6s ease-in-out infinite', glow: 'on' },
    success: { bodyAnim: 'bot-bob-strong 0.9s ease-in-out infinite', mouth: 'big-smile', eyes: 'happy', cheek: true, antennaAnim: 'bot-antenna 0.8s ease-in-out infinite', glow: 'on', sparks: true },
    gentle:  { bodyAnim: 'bot-bob 3s ease-in-out infinite', mouth: 'smile-soft', eyes: 'gentle', cheek: true, antennaAnim: '', glow: 'soft' },
    curious: { bodyAnim: 'bot-tilt 3s ease-in-out infinite', mouth: 'tiny-o', eyes: 'curious', cheek: true, antennaAnim: 'bot-antenna 2s ease-in-out infinite', glow: 'soft' },
    sleep:   { bodyAnim: 'bot-bob 5s ease-in-out infinite', mouth: 'smile-soft', eyes: 'closed', cheek: false, antennaAnim: '', glow: 'off', zzz: true },
    sad:     { bodyAnim: '', mouth: 'frown-soft', eyes: 'gentle', cheek: false, antennaAnim: '', glow: 'off' },
    worry:   { bodyAnim: 'bot-tilt 4s ease-in-out infinite', mouth: 'flat', eyes: 'gentle', cheek: false, antennaAnim: '', glow: 'soft' },
  }[emotion] || {};

  const W = size, H = size * 1.05;

  return (
    <div style={{ width: W, height: H, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' }}>
      {/* glow */}
      {cfg.glow !== 'off' && (
        <div style={{
          position:'absolute', width: W*0.95, height: W*0.95, borderRadius:'50%',
          background:`radial-gradient(circle, ${accentColor}55 0%, ${accentColor}00 60%)`,
          animation: cfg.glow === 'on' ? 'bot-glow 2.4s ease-in-out infinite' : 'bot-glow-soft 4s ease-in-out infinite',
          pointerEvents:'none',
        }}/>
      )}
      {/* sparkles for success */}
      {cfg.sparks && [0,1,2,3,4,5].map(i=>(
        <div key={i} style={{
          position:'absolute',
          left: `${20 + (i*13)%70}%`, top: `${10 + (i*17)%70}%`,
          width: 14, height: 14,
          animation: `bot-spark 1.6s ease-out ${i*0.18}s infinite`,
          pointerEvents:'none',
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="var(--sun)"/></svg>
        </div>
      ))}
      {/* zzz */}
      {cfg.zzz && [0,1,2].map(i=>(
        <div key={i} style={{
          position:'absolute', right:'12%', top:'14%',
          fontFamily:'var(--display)', fontWeight:700, fontSize:22, color:'var(--ink-soft)',
          animation:`zzz-float 2.4s ease-out ${i*0.7}s infinite`,
        }}>z</div>
      ))}

      <div style={{
        position:'relative', width: W*0.78, height: W*0.86,
        animation: cfg.bodyAnim || 'none',
        transformOrigin:'center bottom',
      }}>
        {/* antenna */}
        <div style={{
          position:'absolute', left:'50%', top: -W*0.04, transform:'translateX(-50%)',
          transformOrigin:'bottom center',
          animation: cfg.antennaAnim || 'none',
        }}>
          <div style={{ width: 4, height: W*0.13, background:bodyDark, borderRadius:2, margin:'0 auto' }}/>
          <div style={{
            width: W*0.13, height: W*0.13, borderRadius:'50%',
            background: accentColor,
            boxShadow:`0 0 0 ${W*0.025}px ${accentColor}33, inset -${W*0.02}px -${W*0.02}px 0 rgba(0,0,0,.12)`,
            marginTop: -W*0.02,
          }}/>
        </div>

        {/* head */}
        <div style={{
          position:'absolute', inset: `${W*0.08}px 0 0 0`,
          height: W*0.78,
          borderRadius: '46% 46% 40% 40% / 50% 50% 44% 44%',
          background: `linear-gradient(180deg, ${bodyColor} 0%, ${bodyDark} 100%)`,
          boxShadow:`inset 0 -${W*0.05}px 0 rgba(0,0,0,.07), inset ${W*0.04}px ${W*0.04}px 0 rgba(255,255,255,.55), 0 ${W*0.03}px 0 var(--bot-shadow)`,
        }}>
          {/* face plate */}
          <div style={{
            position:'absolute', left:'12%', right:'12%', top:'18%', bottom:'22%',
            borderRadius: '38% 38% 34% 34% / 44% 44% 36% 36%',
            background:'rgba(43,33,64,0.06)',
          }}/>

          {/* ear blips when listening */}
          {cfg.ear && [0,1].map(i=>(
            <div key={i} style={{
              position:'absolute', top:'42%', [i?'right':'left']:-W*0.07,
              width:W*0.14, height:W*0.14, borderRadius:'50%',
              background:bodyDark,
              boxShadow:'inset 0 -3px 0 rgba(0,0,0,.1)'
            }}>
              <div style={{
                position:'absolute', inset:'25%', borderRadius:'50%',
                background:accentColor, animation:'bot-glow 1.2s ease-in-out infinite',
              }}/>
            </div>
          ))}

          {/* eyes */}
          <Eyes look={cfg.eyes} W={W}/>

          {/* cheeks */}
          {cfg.cheek && (
            <>
              <div style={cheekStyle(W,'left')}/>
              <div style={cheekStyle(W,'right')}/>
            </>
          )}

          {/* mouth */}
          <Mouth kind={cfg.mouth} W={W}/>

          {/* thinking dots */}
          {cfg.dots && (
            <div style={{ position:'absolute', right:-W*0.2, top:'8%', display:'flex', gap:4, padding:'8px 12px', background:'#fff', borderRadius:14, boxShadow:'0 4px 10px rgba(0,0,0,.08)'}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'var(--ink-soft)', animation:`bot-think-dot 1.4s ease-in-out ${i*0.18}s infinite`}}/>
              ))}
            </div>
          )}
        </div>

        {/* arm wave */}
        {cfg.wave && (
          <div style={{
            position:'absolute', right:-W*0.1, top: W*0.35,
            width: W*0.22, height: W*0.1, borderRadius: 999,
            background: bodyDark,
            transformOrigin:'left center',
            animation:'bot-tilt 0.6s ease-in-out infinite',
            boxShadow:'inset 0 -2px 0 rgba(0,0,0,.1)'
          }}/>
        )}
      </div>
    </div>
  );
}

function cheekStyle(W, side){
  return {
    position:'absolute', top:'56%', [side]:'18%',
    width: W*0.11, height: W*0.07, borderRadius:'50%',
    background:'var(--bot-cheek)', opacity:.7,
    filter:'blur(1px)',
  };
}

function Eyes({ look, W }){
  // returns two eyes based on emotion
  const eyeBase = {
    position:'absolute', top:'34%',
    width: W*0.13, height: W*0.16,
    borderRadius:'50%',
    background:'var(--bot-eye)',
  };
  if (look === 'closed' || look === 'happy'){
    // arc eyes
    const path = look === 'closed' ? 'M2 8 Q12 2 22 8' : 'M2 12 Q12 2 22 12';
    return (
      <>
        <svg style={{ position:'absolute', left:'22%', top:'38%', width:W*0.13, height:W*0.13 }} viewBox="0 0 24 16">
          <path d={path} stroke="var(--bot-eye)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        </svg>
        <svg style={{ position:'absolute', right:'22%', top:'38%', width:W*0.13, height:W*0.13 }} viewBox="0 0 24 16">
          <path d={path} stroke="var(--bot-eye)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        </svg>
      </>
    );
  }
  if (look === 'gentle'){
    return (
      <>
        <div style={{ ...eyeBase, left:'22%', height: W*0.06, borderRadius:'50% 50% 50% 50% / 100% 100% 0 0', top:'42%' }}/>
        <div style={{ ...eyeBase, right:'22%', height: W*0.06, borderRadius:'50% 50% 50% 50% / 100% 100% 0 0', top:'42%' }}/>
      </>
    );
  }
  if (look === 'up' || look === 'curious'){
    return (
      <>
        <div style={{ ...eyeBase, left:'22%', animation: look==='curious'?'':'bot-blink 4s infinite' }}>
          <div style={{ position:'absolute', top: look==='up'?'8%':'18%', left: look==='curious'?'45%':'22%', width:'34%', height:'34%', borderRadius:'50%', background:'#fff'}}/>
        </div>
        <div style={{ ...eyeBase, right:'22%', animation: look==='curious'?'':'bot-blink 4s infinite' }}>
          <div style={{ position:'absolute', top: look==='up'?'8%':'18%', left: look==='curious'?'45%':'22%', width:'34%', height:'34%', borderRadius:'50%', background:'#fff'}}/>
        </div>
      </>
    );
  }
  // open
  return (
    <>
      <div style={{ ...eyeBase, left:'22%', animation:'bot-blink 4s infinite' }}>
        <div style={{ position:'absolute', top:'18%', left:'22%', width:'38%', height:'38%', borderRadius:'50%', background:'#fff'}}/>
      </div>
      <div style={{ ...eyeBase, right:'22%', animation:'bot-blink 4.2s infinite' }}>
        <div style={{ position:'absolute', top:'18%', left:'22%', width:'38%', height:'38%', borderRadius:'50%', background:'#fff'}}/>
      </div>
    </>
  );
}

function Mouth({ kind, W }){
  const base = { position:'absolute', left:'50%', top:'68%', transform:'translateX(-50%)' };
  if (kind === 'smile' || kind === 'smile-soft'){
    return (
      <svg style={{ ...base, width:W*0.32, height:W*0.16 }} viewBox="0 0 32 16">
        <path d={kind==='smile'?'M3 4 Q16 16 29 4':'M5 5 Q16 11 27 5'} stroke="var(--bot-eye)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      </svg>
    );
  }
  if (kind === 'big-smile'){
    return (
      <svg style={{ ...base, width:W*0.36, height:W*0.2 }} viewBox="0 0 36 20">
        <path d="M3 3 Q18 22 33 3 Q18 14 3 3 Z" fill="var(--bot-eye)"/>
        <path d="M9 8 Q18 16 27 8" stroke="var(--coral)" strokeWidth="2" fill="var(--coral)" opacity=".55"/>
      </svg>
    );
  }
  if (kind === 'open-smile'){
    return (
      <svg style={{ ...base, width:W*0.3, height:W*0.18 }} viewBox="0 0 30 18">
        <path d="M3 3 Q15 18 27 3 Q15 12 3 3 Z" fill="var(--bot-eye)"/>
      </svg>
    );
  }
  if (kind === 'talk'){
    return (
      <div style={{ ...base, width:W*0.18, height:W*0.1, background:'var(--bot-eye)', borderRadius:'50%', animation:'bot-mouth-talk 0.45s ease-in-out infinite', transformOrigin:'center'}}/>
    );
  }
  if (kind === 'tiny'){
    return (
      <svg style={{ ...base, width:W*0.18, height:W*0.06 }} viewBox="0 0 18 6">
        <path d="M3 3 Q9 6 15 3" stroke="var(--bot-eye)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </svg>
    );
  }
  if (kind === 'tiny-o'){
    return <div style={{ ...base, width:W*0.08, height:W*0.08, background:'var(--bot-eye)', borderRadius:'50%' }}/>;
  }
  if (kind === 'flat'){
    return <div style={{ ...base, width:W*0.18, height:3, background:'var(--bot-eye)', borderRadius:2 }}/>;
  }
  if (kind === 'frown-soft'){
    return (
      <svg style={{ ...base, width:W*0.22, height:W*0.1 }} viewBox="0 0 22 10">
        <path d="M3 7 Q11 2 19 7" stroke="var(--bot-eye)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </svg>
    );
  }
  return null;
}
