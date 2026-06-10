import type { RootStackParamList } from '@/navigation/routes';

type LegacyNavigation = {
  navigate<RouteName extends keyof RootStackParamList>(route: RouteName): void;
};

export function legacyNavigate<RouteName extends keyof RootStackParamList>(
  nav: LegacyNavigation,
  route: RouteName,
): void {
  nav.navigate(route);
}
