import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHomeHub, HOME_BACKEND_CONTRACT_AVAILABLE } from '@/services/api/home.api';
import { getDemoBadgeState } from '@/config/investorDemo';
import { ROUTES } from '@/navigation/routes';
import type { RootStackParamList } from '@/navigation/routes';

export type HomeVariant =
  | 'idle'
  | 'greeting'
  | 'empty'
  | 'daily_available'
  | 'completed_today'
  | 'streak_lost'
  | 'mic_needed'
  | 'offline'
  | 'offline_24h'
  | 'paused'
  | 'quiet_hours'
  | 'zero_child'
  | 'multiple_children'
  | 'unpaired_robot'
  | 'error';

export interface HomeStateCfg {
  emotion: 'idle' | 'happy' | 'greet' | 'listen' | 'think' | 'speak' | 'success' | 'gentle' | 'curious' | 'sleep' | 'sad' | 'worry';
  accent: string;
  chip: { text: string; color: string } | null;
  ctaLabel: string;
  ctaIcon: string;
  ctaColor: string;
  ctaTarget: keyof RootStackParamList;
  ctaEnabled: boolean;
  reviewBadge: number | null;
  courseBadge: number | null;
  dimSecondary?: boolean;
  forceGreet?: boolean;
  quickActions: ReadonlyArray<{ target: keyof RootStackParamList; label: string }>;
}

const SAFE_QUICK_ACTIONS: ReadonlyArray<{ target: keyof RootStackParamList; label: string }> = [
  { target: ROUTES.CourseLibraryScreen, label: 'Browse courses' },
  { target: ROUTES.TodayProgressScreen, label: "Today's progress" },
];

const CFG: Record<HomeVariant, HomeStateCfg> = {
  idle: {
    emotion: 'happy', accent: '#FFC857',
    chip: null,
    ctaLabel: 'View progress', ctaIcon: '↗', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.TodayProgressScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  greeting: {
    emotion: 'greet', accent: '#FF6F61',
    chip: null,
    ctaLabel: 'View progress', ctaIcon: '↗', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.TodayProgressScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null, forceGreet: true,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  empty: {
    emotion: 'gentle', accent: '#FFC857',
    chip: { text: 'No progress yet', color: '#FFC857' },
    ctaLabel: 'Browse courses', ctaIcon: '→', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.CourseLibraryScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  daily_available: {
    emotion: 'curious', accent: '#FF6F61',
    chip: { text: 'Progress is ready to review', color: '#FF6F61' },
    ctaLabel: 'View progress', ctaIcon: '↗', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.TodayProgressScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  completed_today: {
    emotion: 'success', accent: '#6CE2B6',
    chip: { text: "Done for today — great job!", color: '#6CE2B6' },
    ctaLabel: "See what you did today", ctaIcon: '★', ctaColor: '#6CE2B6',
    ctaTarget: ROUTES.TodayProgressScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  streak_lost: {
    emotion: 'gentle', accent: '#FFC857',
    chip: { text: "Let's start a fresh streak today", color: '#FFC857' },
    ctaLabel: 'View progress', ctaIcon: '↗', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.TodayProgressScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  mic_needed: {
    emotion: 'gentle', accent: '#FFC857',
    chip: { text: "Robot needs the mic to play", color: '#FFC857' },
    ctaLabel: "Turn on the microphone", ctaIcon: '🎤', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.HomeHubScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null, dimSecondary: true,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  offline: {
    emotion: 'sleep', accent: '#9AA9B5',
    chip: { text: "We're reconnecting…", color: '#9AA9B5' },
    ctaLabel: "Try again", ctaIcon: '↻', ctaColor: '#7B8896',
    ctaTarget: ROUTES.HomeHubScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null, dimSecondary: true,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  offline_24h: {
    emotion: 'sad', accent: '#9AA9B5',
    chip: { text: "Robot last seen yesterday", color: '#9AA9B5' },
    ctaLabel: "Help with the robot", ctaIcon: '↻', ctaColor: '#7B8896',
    ctaTarget: ROUTES.HomeHubScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null, dimSecondary: true,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  paused: {
    emotion: 'gentle', accent: '#FFC857',
    chip: { text: "A grown-up paused the robot", color: '#FFC857' },
    ctaLabel: "Tell a grown-up", ctaIcon: '⏸', ctaColor: '#7B8896',
    ctaTarget: ROUTES.HomeHubScreen, ctaEnabled: false,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  quiet_hours: {
    emotion: 'sleep', accent: '#7B8896',
    chip: { text: "Quiet hours are on right now", color: '#7B8896' },
    ctaLabel: "Try again later", ctaIcon: '🌙', ctaColor: '#7B8896',
    ctaTarget: ROUTES.HomeHubScreen, ctaEnabled: false,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  zero_child: {
    emotion: 'gentle', accent: '#FFC857',
    chip: { text: "Add a child to begin", color: '#FFC857' },
    ctaLabel: "Set up a child", ctaIcon: '👶', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.ParentSummaryScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  multiple_children: {
    emotion: 'greet', accent: '#FFC857',
    chip: { text: "Who's playing today?", color: '#FFC857' },
    ctaLabel: "Pick a child", ctaIcon: '👋', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.HomeHubScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  unpaired_robot: {
    emotion: 'curious', accent: '#FFC857',
    chip: { text: "Let's wake up the robot", color: '#FFC857' },
    ctaLabel: "Set up the robot", ctaIcon: '🤖', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.DeviceOverviewScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
  error: {
    emotion: 'worry', accent: '#FF6F61',
    chip: { text: "Something went sideways", color: '#FF6F61' },
    ctaLabel: "Retry Home", ctaIcon: '↻', ctaColor: '#FF6F61',
    ctaTarget: ROUTES.HomeHubScreen, ctaEnabled: true,
    reviewBadge: null, courseBadge: null,
    quickActions: SAFE_QUICK_ACTIONS,
  },
};

export interface DeriveHomeStateInput {
  now?: string;
  children?: ReadonlyArray<{ id: string; name: string }>;
  selectedChildId?: string;
  isError?: boolean;
  hub?: {
    childName: string | null;
    streakDays: number;
    todayMinutes: number;
    nextLessonId: string | null;
    variant?: string;
    robot?: {
      paired: boolean;
      online: boolean;
      lastSeenAt?: string;
      paused?: boolean;
      quietHoursActive?: boolean;
    };
  };
}

export interface DerivedHomeState {
  variant: HomeVariant | string;
  cfg: HomeStateCfg;
  showChildSelector: boolean;
  children: ReadonlyArray<{ id: string; name: string }>;
}

const OFFLINE_24H_MS = 24 * 60 * 60 * 1000;

export function deriveHomeState(input: DeriveHomeStateInput): DerivedHomeState {
  const children = input.children ?? [];

  if (input.isError) {
    return { variant: 'error', cfg: CFG.error, showChildSelector: false, children };
  }

  if (children.length === 0) {
    return { variant: 'zero_child', cfg: CFG.zero_child, showChildSelector: false, children };
  }

  if (children.length > 1 && !input.selectedChildId) {
    return { variant: 'multiple_children', cfg: CFG.multiple_children, showChildSelector: true, children };
  }

  const hub = input.hub;
  const robot = hub?.robot;

  if (robot && !robot.paired) {
    return { variant: 'unpaired_robot', cfg: CFG.unpaired_robot, showChildSelector: false, children };
  }

  if (robot?.paused) {
    return { variant: 'paused', cfg: CFG.paused, showChildSelector: false, children };
  }

  if (robot?.quietHoursActive) {
    return { variant: 'quiet_hours', cfg: CFG.quiet_hours, showChildSelector: false, children };
  }

  if (robot && robot.paired && !robot.online) {
    const lastSeenAt = robot.lastSeenAt;
    const nowMs = input.now ? Date.parse(input.now) : Date.now();
    const lastSeenMs = lastSeenAt ? Date.parse(lastSeenAt) : NaN;
    const stale = Number.isFinite(lastSeenMs) && nowMs - lastSeenMs >= OFFLINE_24H_MS;
    if (stale) {
      return { variant: 'offline_24h', cfg: CFG.offline_24h, showChildSelector: false, children };
    }
    return { variant: 'offline', cfg: CFG.offline, showChildSelector: false, children };
  }

  if (hub?.variant === 'streak_lost') {
    return { variant: 'streak_lost', cfg: CFG.streak_lost, showChildSelector: false, children };
  }

  if (hub?.variant === 'completed_today') {
    return { variant: 'completed_today', cfg: CFG.completed_today, showChildSelector: false, children };
  }

  if (hub?.nextLessonId) {
    return { variant: 'daily_available', cfg: CFG.daily_available, showChildSelector: false, children };
  }

  return { variant: 'idle', cfg: CFG.idle, showChildSelector: false, children };
}

export type HomeContentMode = 'loading' | 'unavailable' | 'error' | 'live';

export function useHomeState() {
  const [selectedChildId, setSelectedChildId] = useState<string>();
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['home', 'hub', selectedChildId ?? 'unselected'],
    queryFn: () => getHomeHub(selectedChildId),
    enabled: HOME_BACKEND_CONTRACT_AVAILABLE,
    staleTime: 30_000,
  });
  const homeContractAvailable = Boolean(HOME_BACKEND_CONTRACT_AVAILABLE);
  const contentMode: HomeContentMode = !homeContractAvailable
    ? 'unavailable'
    : isError
      ? 'error'
      : data
        ? 'live'
        : isLoading
          ? 'loading'
          : 'unavailable';
  const raw = data?.variant;
  const variant: HomeVariant = contentMode === 'error'
    ? 'error'
    : raw && raw in CFG
      ? raw as HomeVariant
      : 'idle';

  return {
    variant,
    cfg: CFG[variant],
    data,
    isLoading,
    isError,
    homeContractAvailable,
    contentMode,
    demoBadge: getDemoBadgeState(),
    refetch,
    selectChild: setSelectedChildId,
  };
}
