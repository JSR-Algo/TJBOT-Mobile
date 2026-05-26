import { FEATURE_NAVIGATION_REGISTRY } from './featureRegistry';
import type { RootStackParamList } from './routes';
import type { FeatureRootBranch, FeatureRouteOwner, FeatureStackScreen } from './types';

export type FeatureRouteBucket = 'stackScreens' | 'modalScreens' | 'tabScreen';

export type FeatureRouteEntry = {
  readonly owner: FeatureRouteOwner;
  readonly rootBranch: FeatureRootBranch;
  readonly bucket: FeatureRouteBucket;
  readonly screen: FeatureStackScreen;
};

function stackEntries(
  owner: FeatureRouteOwner,
  rootBranch: FeatureRootBranch,
  bucket: FeatureRouteBucket,
  screens: readonly FeatureStackScreen[],
): readonly FeatureRouteEntry[] {
  return screens.map(screen => ({ owner, rootBranch, bucket, screen }));
}

export const FEATURE_ROUTE_ENTRIES: readonly FeatureRouteEntry[] = FEATURE_NAVIGATION_REGISTRY.flatMap(feature => [
  ...stackEntries(
    feature.owner,
    feature.rootBranch,
    'stackScreens',
    feature.stackScreens.filter(screen => screen.name !== feature.tabScreen?.name),
  ),
  ...stackEntries(feature.owner, feature.rootBranch, 'modalScreens', feature.modalScreens),
  ...(feature.tabScreen
    ? [{ owner: feature.owner, rootBranch: feature.rootBranch, bucket: 'tabScreen', screen: feature.tabScreen } as const]
    : []),
]);

export const FEATURE_ROUTE_SCREENS: readonly FeatureStackScreen[] = FEATURE_ROUTE_ENTRIES.map(entry => entry.screen);

export const FEATURE_ROUTE_OWNER_ENTRIES: readonly (readonly [keyof RootStackParamList, FeatureRouteOwner])[] =
  FEATURE_ROUTE_ENTRIES.map(entry => [entry.screen.name, entry.owner] as const);
