import React from 'react';

// Domain barrels — each exports STATES (id/title/group rows) and SCREEN_MAP (id → component)
import { STATES as ONBOARDING_STATES, SCREEN_MAP as ONBOARDING_SCREEN_MAP } from '@/features/onboarding';
import { STATES as AUTH_STATES, SCREEN_MAP as AUTH_SCREEN_MAP } from '@/features/auth';
import { STATES as HOME_STATES, SCREEN_MAP as HOME_SCREEN_MAP } from '@/features/home';
import { STATES as COURSE_STATES, SCREEN_MAP as COURSE_SCREEN_MAP } from '@/features/course';
import { STATES as COURSE_LIB_STATES, SCREEN_MAP as COURSE_LIB_SCREEN_MAP } from '@/features/course-library';
import { STATES as PURCHASE_STATES, SCREEN_MAP as PURCHASE_SCREEN_MAP } from '@/features/purchase';
import { STATES as PARENT_STATES, SCREEN_MAP as PARENT_SCREEN_MAP } from '@/features/parent';
import { STATES as PROGRESS_STATES, SCREEN_MAP as PROGRESS_SCREEN_MAP } from '@/features/progress';
import { STATES as DEVICE_STATES, SCREEN_MAP as DEVICE_SCREEN_MAP } from '@/features/device';
import { STATES as ROBOT_MGMT_STATES, SCREEN_MAP as ROBOT_MGMT_SCREEN_MAP } from '@/features/robot-mgmt';
import { STATES as LESSON_STATES, SCREEN_MAP as LESSON_SCREEN_MAP } from '@/features/lesson-session';
import { STATES as FALLBACK_STATES, SCREEN_MAP as FALLBACK_SCREEN_MAP } from '@/features/fallback';

// Devtools
import IOSDevice from '@/devtools/IOSDevice';
import DesignCanvas, { DCSection, DCArtboard } from '@/devtools/DesignCanvas';
import NavMap from '@/devtools/NavMap';
import TweaksPanel, { TweakSection, TweakColor, TweakRadio, useTweaks } from '@/devtools/TweaksPanel';

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  view: 'canvas',
  robotColor: '#E8F4FF',
  accent: '#FF6F61',
}/*EDITMODE-END*/;

const ALL_STATES = [].concat(
  ONBOARDING_STATES,
  AUTH_STATES,
  HOME_STATES,
  COURSE_STATES,
  PROGRESS_STATES,
  PARENT_STATES,
  FALLBACK_STATES,
  DEVICE_STATES,
  ROBOT_MGMT_STATES,
  COURSE_LIB_STATES,
  PURCHASE_STATES,
  LESSON_STATES,
);

const ALL_SCREEN_MAP = {
  ...ONBOARDING_SCREEN_MAP,
  ...AUTH_SCREEN_MAP,
  ...HOME_SCREEN_MAP,
  ...COURSE_SCREEN_MAP,
  ...PROGRESS_SCREEN_MAP,
  ...PARENT_SCREEN_MAP,
  ...FALLBACK_SCREEN_MAP,
  ...DEVICE_SCREEN_MAP,
  ...ROBOT_MGMT_SCREEN_MAP,
  ...COURSE_LIB_SCREEN_MAP,
  ...PURCHASE_SCREEN_MAP,
  ...LESSON_SCREEN_MAP,
};

function PhoneShell({ children, label }) {
  return (
    <div style={{ position: 'relative' }} data-screen-label={label}>
      <IOSDevice width={390} height={844} dark={false}>
        {children}
      </IOSDevice>
    </div>
  );
}

function CanvasView({ tweaks }) {
  const robotProps = { color: tweaks.robotColor, accent: tweaks.accent };
  const groups = {};
  ALL_STATES.forEach((s) => { (groups[s.group] = groups[s.group] || []).push(s); });

  const Frame = ({ id }) => {
    const Comp = ALL_SCREEN_MAP[id];
    if (!Comp) {
      return (
        <div style={{ width: 390, height: 844, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
          {id}
        </div>
      );
    }
    return (
      <div style={{ width: 390, height: 844, overflow: 'hidden', borderRadius: 0, position: 'relative', background: '#000' }}>
        <Comp go={() => {}} robotProps={robotProps} tweaks={tweaks} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, pointerEvents: 'none', display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between', fontFamily: '-apple-system, system-ui', fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
          <span>9:41</span>
          <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" rx="0.7" fill="currentColor" /><rect x="4.5" y="5" width="3" height="6" rx="0.7" fill="currentColor" /><rect x="9" y="2.5" width="3" height="8.5" rx="0.7" fill="currentColor" /><rect x="13.5" y="0" width="3" height="11" rx="0.7" fill="currentColor" /></svg>
            <svg width="22" height="11" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" fill="none" opacity=".4" /><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" /></svg>
          </span>
        </div>
      </div>
    );
  };

  return (
    <DesignCanvas>
      {Object.entries(groups).map(([gname, items]) => (
        <DCSection key={gname} id={gname} title={gname} subtitle={`${items.length} state${items.length > 1 ? 's' : ''}`}>
          {items.map((s) => (
            <DCArtboard key={s.id} id={s.id} label={`${String(ALL_STATES.indexOf(s) + 1).padStart(2, '0')} · ${s.title}`} width={390} height={844}>
              <Frame id={s.id} />
            </DCArtboard>
          ))}
        </DCSection>
      ))}
    </DesignCanvas>
  );
}

function PrototypeView({ tweaks }) {
  const [screen, setScreen] = React.useState(ALL_STATES[0]?.id || 'home');
  const robotProps = { color: tweaks.robotColor, accent: tweaks.accent };
  const Comp = ALL_SCREEN_MAP[screen] || ALL_SCREEN_MAP[ALL_STATES[0]?.id];
  // Route alias resolver — protects against undeclared targets surfaced in user-flow review.
  // `home` is dispatched at runtime to one of 6 home_hub_* variants; default for now.
  const ROUTE_ALIASES = { home: 'home_hub_default' };
  const go = (id) => {
    const resolved = ROUTE_ALIASES[id] || id;
    if (!ALL_SCREEN_MAP[resolved]) {
      console.warn(`[router] unknown route '${id}' (resolved=${resolved}) — falling back to home`);
      setScreen('home_hub_default');
      return;
    }
    setScreen(resolved);
  };

  return (
    <div className="proto-stage">
      <div style={{ position: 'fixed', left: 16, top: 16, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '90vh', overflow: 'auto', zIndex: 50, background: 'rgba(255,255,255,.85)', backdropFilter: 'blur(8px)', padding: 10, borderRadius: 14, boxShadow: '0 4px 14px rgba(0,0,0,.08)', maxWidth: 180 }}>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13, color: '#5C4F77', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 8px' }}>Jump to</div>
        {ALL_STATES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScreen(s.id)}
            style={{
              border: 'none',
              background: screen === s.id ? 'var(--coral)' : 'transparent',
              color: screen === s.id ? '#fff' : '#2B2140',
              padding: '6px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--body)',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            {s.title}
          </button>
        ))}
      </div>

      <PhoneShell label={screen}>
        {Comp ? <Comp go={go} robotProps={robotProps} tweaks={tweaks} /> : null}
      </PhoneShell>
    </div>
  );
}

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <>
      <div className="proto-pill">
        <button className={t.view === 'canvas' ? 'on' : ''} onClick={() => setTweak('view', 'canvas')}>All Frames</button>
        <button className={t.view === 'proto' ? 'on' : ''} onClick={() => setTweak('view', 'proto')}>Interactive</button>
        <button className={t.view === 'map' ? 'on' : ''} onClick={() => setTweak('view', 'map')}>Nav Map</button>
      </div>

      {t.view === 'map'
        ? <NavMap />
        : t.view === 'canvas'
          ? <CanvasView tweaks={t} />
          : <PrototypeView tweaks={t} />}

      <TweaksPanel title="Tweaks">
        <TweakSection title="Robot">
          <TweakColor label="Body" value={t.robotColor} onChange={(v) => setTweak('robotColor', v)} options={['#E8F4FF', '#FFE2D6', '#E2F7E5', '#F0E5FA', '#FFF3CC']} />
          <TweakColor label="Accent" value={t.accent} onChange={(v) => setTweak('accent', v)} options={['#FF6F61', '#6FC1FF', '#6CE2B6', '#FFC857', '#B080F0']} />
        </TweakSection>
        <TweakSection title="View">
          <TweakRadio label="Mode" value={t.view} onChange={(v) => setTweak('view', v)} options={[{ value: 'canvas', label: 'Canvas' }, { value: 'proto', label: 'Prototype' }]} />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}
