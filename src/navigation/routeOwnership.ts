import type { RootStackParamList } from './routes';
import { FEATURE_ROUTE_OWNER_ENTRIES } from './featureRouteEntries';
import type { FeatureRouteOwner } from './types';
export type { FeatureRouteOwner } from './types';

export const ROUTE_OWNER_ENTRIES = FEATURE_ROUTE_OWNER_ENTRIES;

export const ROUTE_OWNERS = Object.fromEntries(ROUTE_OWNER_ENTRIES) as Record<
  keyof RootStackParamList,
  FeatureRouteOwner
>;
