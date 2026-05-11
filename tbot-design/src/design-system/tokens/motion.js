export const motion = {
  animations: [
    { name: 'bot-bob',        duration: '3.6s', easing: 'ease-in-out', frames: [{ at: '0%,100%', transform: 'translateY(0)' }, { at: '50%', transform: 'translateY(-6px)' }] },
    { name: 'bot-bob-strong', duration: '1.6s', easing: 'ease-in-out', frames: [{ at: '0%,100%', transform: 'translateY(0) rotate(-1deg)' }, { at: '50%', transform: 'translateY(-12px) rotate(1deg)' }] },
    { name: 'bot-tilt',       duration: '0.6s', easing: 'ease-in-out', frames: [{ at: '0%,100%', transform: 'rotate(-2deg)' }, { at: '50%', transform: 'rotate(2deg)' }] },
    { name: 'bot-think',      duration: '2s',   easing: 'ease-in-out', frames: [{ at: '0%,100%', transform: 'rotate(-3deg) translateY(0)' }, { at: '50%', transform: 'rotate(3deg) translateY(-2px)' }] },
    { name: 'bot-blink',      duration: '4s',   easing: 'linear',      frames: [{ at: '0%,92%,100%', transform: 'scaleY(1)' }, { at: '95%', transform: 'scaleY(0.1)' }] },
    { name: 'bot-mouth-talk', duration: '0.45s', easing: 'ease-in-out', frames: [{ at: '0%,100%', transform: 'scaleY(1)' }, { at: '25%', transform: 'scaleY(0.5)' }, { at: '50%', transform: 'scaleY(1.2)' }, { at: '75%', transform: 'scaleY(0.7)' }] },
    { name: 'bot-antenna',    duration: '2s',   easing: 'ease-in-out', frames: [{ at: '0%,100%', transform: 'rotate(-4deg)' }, { at: '50%', transform: 'rotate(4deg)' }] },
    { name: 'bot-glow',       duration: '2.4s', easing: 'ease-in-out', frames: [{ at: '0%,100%', opacity: 0.45, transform: 'scale(1)' }, { at: '50%', opacity: 0.85, transform: 'scale(1.08)' }] },
    { name: 'bot-glow-soft',  duration: '4s',   easing: 'ease-in-out', frames: [{ at: '0%,100%', opacity: 0.25, transform: 'scale(0.98)' }, { at: '50%', opacity: 0.55, transform: 'scale(1.04)' }] },
    { name: 'bot-pulse-ring', duration: '1.2s', easing: 'ease-out',    frames: [{ at: '0%', transform: 'scale(0.85)', opacity: 0.7 }, { at: '100%', transform: 'scale(1.6)', opacity: 0 }] },
    { name: 'bot-think-dot',  duration: '1.4s', easing: 'ease-in-out', frames: [{ at: '0%,80%,100%', opacity: 0.2, transform: 'translateY(0)' }, { at: '40%', opacity: 1, transform: 'translateY(-3px)' }] },
    { name: 'bot-spark',      duration: '1.6s', easing: 'ease-out',    frames: [{ at: '0%', transform: 'scale(0) rotate(0)', opacity: 0 }, { at: '30%', transform: 'scale(1.1) rotate(180deg)', opacity: 1 }, { at: '100%', transform: 'scale(0.6) rotate(360deg)', opacity: 0 }] },
    { name: 'wave-bar',       duration: '1s',   easing: 'ease-in-out', frames: [{ at: '0%,100%', transform: 'scaleY(0.3)' }, { at: '50%', transform: 'scaleY(1)' }] },
    { name: 'zzz-float',      duration: '2.4s', easing: 'ease-out',    frames: [{ at: '0%', transform: 'translate(0,0) scale(0.7)', opacity: 0 }, { at: '30%', opacity: 1 }, { at: '100%', transform: 'translate(20px,-30px) scale(1.1)', opacity: 0 }] },
    { name: 'ring-pulse',     duration: '1s',   easing: 'ease-out',    frames: [{ at: '0%', transform: 'scale(0.9)', opacity: 0.65 }, { at: '100%', transform: 'scale(1.5)', opacity: 0 }] },
  ],
};

export default motion;
