import { useQuery } from '@tanstack/react-query';
import { getHomeHub } from '@/services/api/home.api';

export type HomeVariant = 'idle' | 'greeting' | 'daily_available' | 'completed_today' | 'mic_needed' | 'offline';

export interface HomeStateCfg {
  emotion: 'idle' | 'happy' | 'greet' | 'listen' | 'think' | 'speak' | 'success' | 'gentle' | 'curious' | 'sleep' | 'sad' | 'worry';
  accent: string;
  chip: { text: string; color: string } | null;
  ctaLabel: string;
  ctaIcon: string;
  ctaColor: string;
  ctaTarget: string;
  ctaEnabled: boolean;
  reviewBadge: number | null;
  courseBadge: number | null;
  dimSecondary?: boolean;
  forceGreet?: boolean;
}

const CFG: Record<HomeVariant, HomeStateCfg> = {
  idle: {
    emotion: 'happy', accent: '#FFC857',
    chip: null,
    ctaLabel: "Start Today's Lesson", ctaIcon: '▶', ctaColor: '#FF6F61',
    ctaTarget: 'LessonReadyScreen', ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
  },
  greeting: {
    emotion: 'greet', accent: '#FF6F61',
    chip: null,
    ctaLabel: "Start Today's Lesson", ctaIcon: '▶', ctaColor: '#FF6F61',
    ctaTarget: 'LessonReadyScreen', ctaEnabled: true,
    reviewBadge: null, courseBadge: null, forceGreet: true,
  },
  daily_available: {
    emotion: 'curious', accent: '#FF6F61',
    chip: { text: "Today's lesson is ready!", color: '#FF6F61' },
    ctaLabel: "Start Today's Lesson", ctaIcon: '▶', ctaColor: '#FF6F61',
    ctaTarget: 'LessonReadyScreen', ctaEnabled: true,
    reviewBadge: 3, courseBadge: null,
  },
  completed_today: {
    emotion: 'success', accent: '#6CE2B6',
    chip: { text: "Done for today — great job!", color: '#6CE2B6' },
    ctaLabel: "See what you did today", ctaIcon: '★', ctaColor: '#6CE2B6',
    ctaTarget: 'TodayProgressScreen', ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
  },
  mic_needed: {
    emotion: 'gentle', accent: '#FFC857',
    chip: { text: "Robot needs the mic to play", color: '#FFC857' },
    ctaLabel: "Turn on the microphone", ctaIcon: '🎤', ctaColor: '#FF6F61',
    ctaTarget: 'AudioRecoveryScreen', ctaEnabled: true,
    reviewBadge: null, courseBadge: null, dimSecondary: true,
  },
  offline: {
    emotion: 'sleep', accent: '#9AA9B5',
    chip: { text: "Reconnecting…", color: '#9AA9B5' },
    ctaLabel: "Try again", ctaIcon: '↻', ctaColor: '#7B8896',
    ctaTarget: 'ReconnectingOverlay', ctaEnabled: true,
    reviewBadge: null, courseBadge: null, dimSecondary: true,
  },
};

export function useHomeState() {
  const { data, isLoading } = useQuery({
    queryKey: ['home', 'hub'],
    queryFn: getHomeHub,
    staleTime: 30_000,
  });
  const variant: HomeVariant = (data?.variant as HomeVariant) ?? 'daily_available';
  return { variant, cfg: CFG[variant], data, isLoading };
}
