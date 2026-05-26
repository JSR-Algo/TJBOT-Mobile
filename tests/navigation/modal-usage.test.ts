import {
  FEATURE_NAVIGATION_REGISTRY,
  PROTECTED_MODAL_SCREENS,
  PROTECTED_STACK_SCREENS,
} from '@/navigation/featureRegistry';
import { ROUTES } from '@/navigation/routes';

describe('modal navigation usage', () => {
  it('registers modal routes only through feature modal registries', () => {
    const modalRouteNames = PROTECTED_MODAL_SCREENS.map(screen => screen.name);
    const protectedStackRouteNames = PROTECTED_STACK_SCREENS.map(screen => screen.name);

    for (const modalRouteName of modalRouteNames) {
      expect(protectedStackRouteNames).not.toContain(modalRouteName);
    }
  });

  it('requires feature modal metadata to explicitly declare modal role', () => {
    const modalScreens = FEATURE_NAVIGATION_REGISTRY.flatMap(feature => feature.modalScreens);
    const missingExplicitModalRole = modalScreens
      .filter(screen => screen.role !== 'modal' && screen.role !== 'modal-entry')
      .map(screen => screen.name);

    expect(missingExplicitModalRole).toEqual([]);
  });

  it('marks purchase flow entry as an explicit modal entry route', () => {
    const purchaseFeature = FEATURE_NAVIGATION_REGISTRY.find(feature => feature.owner === 'purchase');
    const purchaseIntro = purchaseFeature?.modalScreens.find(screen => screen.name === ROUTES.PurchaseIntroScreen);

    expect(purchaseIntro?.role).toBe('modal-entry');
  });

  it('registers purchase flow through the feature modal registry', () => {
    const purchaseFeature = FEATURE_NAVIGATION_REGISTRY.find(feature => feature.owner === 'purchase');
    const purchaseModalRoutes = purchaseFeature?.modalScreens.map(screen => screen.name) ?? [];
    const purchaseStackRoutes = purchaseFeature?.stackScreens.map(screen => screen.name) ?? [];

    expect(purchaseModalRoutes).toEqual([
      ROUTES.PurchaseIntroScreen,
      ROUTES.HowItWorksScreen,
      ROUTES.IncludedScreen,
      ROUTES.BundleScreen,
      ROUTES.SubscriptionsScreen,
      ROUTES.PrivacyScreen,
      ROUTES.CheckoutScreen,
      ROUTES.OrderConfirmScreen,
      ROUTES.ShippingScreen,
      ROUTES.ArrivedScreen,
      ROUTES.ActivateScreen,
      ROUTES.FirstCourseScreen,
    ]);
    expect(purchaseStackRoutes).toEqual([]);
  });
});
