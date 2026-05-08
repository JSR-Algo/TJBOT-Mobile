/* Shared UI components for TBOT screens.
   All screens are built into 390x844 iPhone-sized canvases. */

// Phone wrapper with cream background
function TBPhone({ children, bg = 'var(--tb-cream)', dark = false, status = true, indicator = true, statusDark = false, persona = 'parent' }) {
  return (
    <div className="tb" data-persona={persona} style={{
      width: 390, height: 844, position: 'relative',
      background: bg, overflow: 'hidden',
      borderRadius: 0,
      fontFamily: 'var(--tb-font-child)',
    }}>
      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 120, height: 34, borderRadius: 24, background: '#000', zIndex: 50,
      }}/>
      {/* Status bar */}
      {status && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 54, zIndex: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 30px 0',
          color: statusDark ? '#fff' : '#000',
          fontFamily: '-apple-system, system-ui',
          fontWeight: 600, fontSize: 15,
        }}>
          <span>9:41</span>
          <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="0.6" fill="currentColor"/><rect x="4.5" y="5" width="3" height="6" rx="0.6" fill="currentColor"/><rect x="9" y="2.5" width="3" height="8.5" rx="0.6" fill="currentColor"/><rect x="13.5" y="0" width="3" height="11" rx="0.6" fill="currentColor"/></svg>
            <svg width="24" height="11" viewBox="0 0 24 11"><rect x="0.5" y="0.5" width="20" height="10" rx="3" stroke="currentColor" fill="none" opacity=".4"/><rect x="2" y="2" width="17" height="7" rx="1.6" fill="currentColor"/></svg>
          </span>
        </div>
      )}
      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, paddingTop: status ? 54 : 0, paddingBottom: indicator ? 34 : 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      {/* Home indicator */}
      {indicator && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          width: 134, height: 5, borderRadius: 100, background: 'rgba(0,0,0,.3)', zIndex: 60,
        }}/>
      )}
    </div>
  );
}

// Big primary button — child screens
function TBBigBtn({ children, color = 'var(--tb-coral)', textColor = '#fff', onClick, style, icon }) {
  return (
    <button className="tb-tap" onClick={onClick} style={{
      border: 'none', cursor: 'pointer',
      background: color, color: textColor,
      borderRadius: 9999, padding: '20px 28px',
      fontFamily: 'var(--tb-font-child)', fontWeight: 800, fontSize: 20,
      letterSpacing: -0.2, minHeight: 64,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      boxShadow: color === 'var(--tb-coral)' ? 'var(--tb-shadow-coral)' : 'var(--tb-shadow-md)',
      ...style,
    }}>
      {icon}{children}
    </button>
  );
}

// Mic button — central listening control. State controls visuals.
function TBMicButton({ state = 'idle', size = 130, onClick }) {
  // states: idle, listening, thinking, speaking, replay
  const ringColor = {
    idle: 'var(--tb-coral)',
    listening: 'var(--tb-coral)',
    thinking: 'var(--tb-sky)',
    speaking: 'var(--tb-mint)',
    replay: 'var(--tb-peach)',
  }[state];

  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%',
      border: 'none', cursor: 'pointer',
      background: ringColor, color: '#fff',
      position: 'relative',
      boxShadow: `0 12px 30px ${ringColor === 'var(--tb-coral)' ? 'rgba(232,124,90,.45)' : 'rgba(42,31,24,.18)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'transform .18s',
    }}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(.96)'}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {/* Pulse rings — only when listening */}
      {state === 'listening' && (
        <>
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `3px solid ${ringColor}`, animation: 'tb-pulse-ring 1.6s ease-out infinite',
          }}/>
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `3px solid ${ringColor}`, animation: 'tb-pulse-ring 1.6s ease-out .8s infinite',
          }}/>
        </>
      )}
      {/* Mic icon, or waveform */}
      {state === 'listening' ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 38 }}>
          {[0,1,2,3,4].map(i => (
            <span key={i} style={{
              width: 6, background: '#fff', borderRadius: 3, height: '100%',
              transformOrigin: 'center',
              animation: `tb-wave 0.7s ease-in-out ${i * 0.1}s infinite`,
            }}/>
          ))}
        </div>
      ) : state === 'thinking' ? (
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              width: 10, height: 10, borderRadius: 5, background: '#fff',
              animation: `tb-bounce 0.9s ease-in-out ${i * 0.15}s infinite`,
            }}/>
          ))}
        </div>
      ) : state === 'speaking' ? (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
          <path d="M11 5L6 9H2v6h4l5 4V5z" fill="#fff"/>
          <path d="M15.5 8.5a4 4 0 010 7"/>
          <path d="M18.5 5.5a8 8 0 010 13"/>
        </svg>
      ) : state === 'replay' ? (
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 109-9"/>
          <path d="M3 4v5h5"/>
        </svg>
      ) : (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#fff">
          <rect x="9" y="3" width="6" height="13" rx="3"/>
          <path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

// Speech bubble from robot
function TBBubble({ children, color = '#fff', textColor = 'var(--tb-ink)', tail = 'bl', style }) {
  return (
    <div style={{
      background: color, color: textColor,
      borderRadius: 24, padding: '16px 20px',
      fontFamily: 'var(--tb-font-child)', fontWeight: 600, fontSize: 17, lineHeight: 1.35,
      boxShadow: 'var(--tb-shadow-sm)', position: 'relative',
      maxWidth: '100%',
      ...style,
    }}>
      {children}
      {/* tail */}
      <svg width="18" height="14" viewBox="0 0 18 14" style={{
        position: 'absolute',
        bottom: -8, [tail === 'bl' ? 'left' : 'right']: 22,
        transform: tail === 'br' ? 'scaleX(-1)' : '',
      }}>
        <path d="M2 0 Q4 12 16 12 L0 12 Z" fill={color}/>
      </svg>
    </div>
  );
}

// Lesson card
function TBLessonCard({ title, subtitle, accent = 'var(--tb-coral)', emoji = '👋', state = 'available', progress = 0, onClick }) {
  const isLocked = state === 'locked';
  const isDone = state === 'done';
  return (
    <button onClick={onClick} disabled={isLocked} style={{
      width: '100%', textAlign: 'left',
      background: '#fff', borderRadius: 24, padding: 18,
      border: 'none', cursor: isLocked ? 'default' : 'pointer',
      display: 'flex', alignItems: 'center', gap: 16,
      boxShadow: 'var(--tb-shadow-md)',
      opacity: isLocked ? 0.55 : 1,
      fontFamily: 'var(--tb-font-child)',
      transition: 'transform .15s',
    }}
    onMouseDown={e => !isLocked && (e.currentTarget.style.transform = 'scale(.98)')}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: isDone ? 'var(--tb-mint-soft)' : `color-mix(in srgb, ${accent} 18%, white)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, flexShrink: 0,
      }}>
        {isDone ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--tb-mint)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        ) : isLocked ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--tb-ink-mute)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
        ) : emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--tb-ink)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--tb-ink-mute)' }}>{subtitle}</div>
        {progress > 0 && progress < 100 && (
          <div className="tb-progress" style={{ marginTop: 8, height: 6 }}>
            <i style={{ width: `${progress}%`, background: accent }}/>
          </div>
        )}
      </div>
      {!isLocked && !isDone && (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--tb-ink-mute)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M9 6l6 6-6 6"/>
        </svg>
      )}
    </button>
  );
}

// Confetti — pure CSS
function TBConfetti({ count = 24 }) {
  const colors = ['#E87C5A','#F2A65A','#7AC9A0','#5A8FB5','#FFD66E','#A88BE8','#F47B96'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 1.5;
        const dur = 2.4 + Math.random() * 1.6;
        const c = colors[i % colors.length];
        const size = 8 + Math.random() * 8;
        return (
          <span key={i} style={{
            position: 'absolute', top: -20, left: `${left}%`,
            width: size, height: size * 1.6,
            background: c, borderRadius: 2,
            animation: `tb-confetti-fall ${dur}s ease-in ${delay}s infinite`,
          }}/>
        );
      })}
    </div>
  );
}

// Sparkle layer
function TBSparkles({ count = 8 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => {
        const left = 10 + Math.random() * 80;
        const top = 30 + Math.random() * 50;
        const delay = Math.random() * 2;
        const size = 8 + Math.random() * 12;
        return (
          <span key={i} style={{
            position: 'absolute', left: `${left}%`, top: `${top}%`,
            color: ['#FFD66E','#E87C5A','#A88BE8','#7AC9A0'][i % 4],
            fontSize: size, animation: `tb-sparkle-rise 2.4s ease-out ${delay}s infinite`,
          }}>✦</span>
        );
      })}
    </div>
  );
}

// Avatar tile
function TBAvatar({ kind = 'fox', selected = false, onClick, size = 84 }) {
  const map = {
    fox: { bg: '#F2A65A', emoji: '🦊' },
    bear: { bg: '#C99466', emoji: '🐻' },
    panda: { bg: '#E8E2D8', emoji: '🐼' },
    bunny: { bg: '#F5D4DE', emoji: '🐰' },
    cat: { bg: '#FBD9B2', emoji: '🐱' },
    owl: { bg: '#A88BE8', emoji: '🦉' },
    dino: { bg: '#9DD4A8', emoji: '🦖' },
    frog: { bg: '#7AC9A0', emoji: '🐸' },
    octopus: { bg: '#7BC9D9', emoji: '🐙' },
  };
  const m = map[kind] || map.fox;
  return (
    <button onClick={onClick} style={{
      width: size, height: size, borderRadius: 24,
      background: m.bg, border: selected ? '4px solid var(--tb-coral)' : '4px solid transparent',
      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.5, padding: 0, transition: 'transform .15s',
      boxShadow: selected ? 'var(--tb-shadow-coral)' : 'var(--tb-shadow-sm)',
    }}>{m.emoji}</button>
  );
}

// Sticker badge
function TBSticker({ icon = '⭐', label, color = 'var(--tb-yellow)', size = 88, locked = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: locked ? 'var(--tb-cream-3)' : color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.5,
        boxShadow: locked ? 'none' : 'inset 0 -6px 0 rgba(0,0,0,.08), 0 6px 14px rgba(232,124,90,.18)',
        filter: locked ? 'grayscale(1) opacity(.5)' : 'none',
      }}>{locked ? '🔒' : icon}</div>
      {label && <div style={{ fontSize: 12, fontWeight: 700, color: locked ? 'var(--tb-ink-mute)' : 'var(--tb-ink)', textAlign: 'center' }}>{label}</div>}
    </div>
  );
}

// Topbar with back chevron
function TBTopbar({ title, onBack, right, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px 8px 8px', minHeight: 48, ...style,
    }}>
      <button onClick={onBack} className="tb-tap" style={{
        width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--tb-ink)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
      </button>
      <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--tb-ink)', flex: 1, textAlign: 'center' }}>{title}</div>
      <div style={{ width: 44, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

// Generic icon
function TBIcon({ name, size = 22, color = 'currentColor' }) {
  const paths = {
    home: <><path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7h-6v7H5a2 2 0 01-2-2V11z"/></>,
    star: <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
    play: <path d="M5 3l16 9-16 9V3z" fill={color}/>,
    pause: <><rect x="6" y="4" width="4" height="16" rx="1" fill={color}/><rect x="14" y="4" width="4" height="16" rx="1" fill={color}/></>,
    close: <path d="M6 6l12 12M18 6L6 18"/>,
    check: <path d="M5 13l4 4L19 7"/>,
    book: <path d="M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4V4zM20 4h-7a3 3 0 00-3 3v13a2 2 0 012-2h8V4z"/>,
    heart: <path d="M20 8.5a5.5 5.5 0 00-9.5-3.8L10 5l-.5-.3A5.5 5.5 0 004 8.5c0 6 8 11.5 8 11.5s8-5.5 8-11.5z"/>,
    lock: <><rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></>,
    bell: <><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></>,
    headphones: <><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1v-7h3v5zM3 19a2 2 0 002 2h1v-7H3v5z"/></>,
    menu: <><path d="M3 6h18M3 12h18M3 18h18"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

// Tab bar (parent space)
function TBParentTabBar({ active = 'home' }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'progress', label: 'Progress', icon: 'star' },
    { id: 'time', label: 'Screen Time', icon: 'bell' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around',
      background: '#fff', borderTop: '1px solid rgba(20,30,40,.06)',
      padding: '8px 8px 0',
    }}>
      {tabs.map(t => (
        <div key={t.id} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '8px 12px',
          color: active === t.id ? 'var(--tb-sky)' : 'var(--tb-parent-mute)',
          fontFamily: 'var(--tb-font-parent)', fontWeight: 600, fontSize: 11,
        }}>
          <TBIcon name={t.icon} size={22} color={active === t.id ? 'var(--tb-sky)' : 'var(--tb-parent-mute)'}/>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { TBPhone, TBBigBtn, TBMicButton, TBBubble, TBLessonCard, TBConfetti, TBSparkles, TBAvatar, TBSticker, TBTopbar, TBIcon, TBParentTabBar });
