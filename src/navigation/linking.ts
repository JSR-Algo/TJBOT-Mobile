import type { LinkingOptions } from '@react-navigation/native';
import { Linking } from 'react-native';
import { Config } from '../config';
import { getInitialNotificationUrl } from '../services/notifications/deepLink';
import { PRODUCTION_LINKING_ROUTE_ENTRIES } from './featureRegistry';
import { ROUTES } from './routes';
import type { RootStackParamList } from './routes';

type NotificationsModule = Parameters<typeof getInitialNotificationUrl>[0];

const SHOULD_LOAD_NATIVE_NOTIFICATIONS = !Config.QA_MODE || process.env.NODE_ENV === 'test';
const Notifications: NotificationsModule | null = SHOULD_LOAD_NATIVE_NOTIFICATIONS

  ? require('expo-notifications')
  : null;

type RouteLinkingScreens = Partial<Record<keyof RootStackParamList, string>>;

function slugRouteName(route: string): string {
  return route
    .replace(/Screen$/, '')
    .replace(/Overlay$/, '-overlay')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

export const NAVIGATION_LINKING_SCREENS = Object.fromEntries(
  PRODUCTION_LINKING_ROUTE_ENTRIES.map(entry => [entry.screen.name, `${entry.owner}/${slugRouteName(entry.screen.name)}`] as const),
) as RouteLinkingScreens;

const ROUTE_NAMES_BY_LINK_PATH = new Map<string, keyof RootStackParamList>(
  Object.entries(NAVIGATION_LINKING_SCREENS).map(([routeName, path]) => [path, routeName as keyof RootStackParamList]),
);

export type NavigationDeepLinkTarget<RouteName extends keyof RootStackParamList = keyof RootStackParamList> = {
  readonly name: RouteName;
  readonly params?: RootStackParamList[RouteName];
};

type NavigationLinkingConfig = LinkingOptions<RootStackParamList> & {
  readonly getInitialURL: () => Promise<string | null>;
  readonly config: { readonly screens: RouteLinkingScreens };
};

export const NAVIGATION_LINKING_CONFIG: NavigationLinkingConfig = {
  prefixes: ['TJBot://', 'tjbot://'],
  getInitialURL: async () => {
    const url = await Linking.getInitialURL();
    if (url) return parentReportTargetForDeepLinkUrl(url) ? null : url;
    if (!Notifications) return null;
    const notificationUrl = await getInitialNotificationUrl(Notifications);
    return notificationUrl && parentReportTargetForDeepLinkUrl(notificationUrl) ? null : notificationUrl;
  },
  config: {
    screens: NAVIGATION_LINKING_SCREENS,
  },
};

export function routeNameForDeepLinkUrl(url: string): keyof RootStackParamList | null {
  return navigationTargetForDeepLinkUrl(url)?.name ?? null;
}

export function navigationTargetForDeepLinkUrl(url: string): NavigationDeepLinkTarget | null {
  const parentReportTarget = parentReportTargetForDeepLinkUrl(url);
  if (parentReportTarget) {
    return {
      name: ROUTES.ParentSessionReportScreen,
      params: parentReportTarget,
    };
  }
  const normalizedPath = normalizedPathForUrl(url);
  if (!normalizedPath) return null;
  const routeName = ROUTE_NAMES_BY_LINK_PATH.get(normalizedPath);
  if (routeName) return { name: routeName };

  return notificationTargetForPath(normalizedPath);
}

export type ParentReportDeepLinkTarget = {
  readonly childId: string;
  readonly sessionId: string;
};

export function parentReportTargetForDeepLinkUrl(url: string): ParentReportDeepLinkTarget | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol.toLowerCase() !== 'tjbot:'
    || parsed.hostname !== 'parent'
    || parsed.port
    || parsed.username
    || parsed.password
    || parsed.search
    || parsed.hash) return null;
  const match = /^\/children\/([^/]+)\/sessions\/([^/]+)\/report$/.exec(parsed.pathname);
  if (!match) return null;
  try {
    return { childId: decodeURIComponent(match[1]), sessionId: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

export function shouldHandleDeepLinkManually(url: string): boolean {
  if (parentReportTargetForDeepLinkUrl(url)) return true;
  const normalizedPath = normalizedPathForUrl(url);
  return normalizedPath !== null
    && !ROUTE_NAMES_BY_LINK_PATH.has(normalizedPath)
    && notificationTargetForPath(normalizedPath) !== null;
}

function normalizedPathForUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostPath = parsed.host ? `${parsed.host}${parsed.pathname}` : parsed.pathname;
  return hostPath.replace(/^\/+/, '').replace(/\/+$/, '');
}

function notificationTargetForPath(path: string): NavigationDeepLinkTarget | null {
  const [section, firstSegment, secondSegment, thirdSegment] = path.split('/');

  if (section === 'device' && firstSegment && secondSegment === 'summary' && thirdSegment) {
    return {
      name: ROUTES.ParentSummaryScreen,
      params: {
        deviceId: decodeURIComponent(firstSegment),
        summaryDate: decodeURIComponent(thirdSegment),
      },
    };
  }

  if (section === 'device' && firstSegment && !secondSegment) {
    return {
      name: ROUTES.DeviceOverviewScreen,
      params: { deviceId: decodeURIComponent(firstSegment) },
    };
  }

  if (section === 'settings' && firstSegment === 'account' && !secondSegment) {
    return { name: ROUTES.ParentSettingsScreen };
  }

  if (section === 'settings' && firstSegment === 'data-privacy' && !secondSegment) {
    return { name: ROUTES.ParentAccountPrivacyScreen };
  }

  return null;
}
