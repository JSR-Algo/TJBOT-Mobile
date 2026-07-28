import PurchaseIntroScreen from './screens/PurchaseIntroScreen';
import HowItWorksScreen from './screens/HowItWorksScreen';
import BundleScreen from './screens/BundleScreen';
import IncludedScreen from './screens/IncludedScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import OrderConfirmScreen from './screens/OrderConfirmScreen';
import ShippingScreen from './screens/ShippingScreen';
import ArrivedScreen from './screens/ArrivedScreen';
import ActivateScreen from './screens/ActivateScreen';
import FirstCourseScreen from './screens/FirstCourseScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import SubscriptionsScreen from './screens/SubscriptionsScreen';
import { MVP_SCOPE_HIDDEN } from '@/navigation/mvpProductionRoutes';
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

// Commerce / shipping theater — deferred past parent MVP hardware loop.
export const PURCHASE_MODAL_SCREENS = defineFeatureScreens([
  { name: ROUTES.PurchaseIntroScreen, component: PurchaseIntroScreen, role: 'modal-entry', backTarget: ROUTES.DeviceHomeScreen, stateMachineId: 'pr_intro', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.HowItWorksScreen, component: HowItWorksScreen, role: 'modal', backTarget: ROUTES.PurchaseIntroScreen, stateMachineId: 'pr_how', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.IncludedScreen, component: IncludedScreen, role: 'modal', backTarget: ROUTES.HowItWorksScreen, stateMachineId: 'pr_included', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.BundleScreen, component: BundleScreen, role: 'modal', backTarget: ROUTES.IncludedScreen, stateMachineId: 'pr_bundle', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.SubscriptionsScreen, component: SubscriptionsScreen, role: 'modal', backTarget: ROUTES.BundleScreen, stateMachineId: 'pr_subs', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.PrivacyScreen, component: PrivacyScreen, role: 'modal', backTarget: ROUTES.SubscriptionsScreen, stateMachineId: 'pr_privacy', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.CheckoutScreen, component: CheckoutScreen, role: 'modal', backTarget: ROUTES.PrivacyScreen, stateMachineId: 'pr_checkout', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.OrderConfirmScreen, component: OrderConfirmScreen, role: 'modal', backTarget: ROUTES.CheckoutScreen, stateMachineId: 'pr_confirm', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.ShippingScreen, component: ShippingScreen, role: 'modal', backTarget: ROUTES.OrderConfirmScreen, stateMachineId: 'pr_shipping', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.ArrivedScreen, component: ArrivedScreen, role: 'modal', backTarget: ROUTES.ShippingScreen, stateMachineId: 'pr_arrived', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.ActivateScreen, component: ActivateScreen, role: 'modal', backTarget: ROUTES.ArrivedScreen, stateMachineId: 'pr_activate', ...MVP_SCOPE_HIDDEN },
  { name: ROUTES.FirstCourseScreen, component: FirstCourseScreen, role: 'modal', backTarget: ROUTES.ActivateScreen, stateMachineId: 'pr_first_course', ...MVP_SCOPE_HIDDEN },
]);

export const PURCHASE_NAVIGATION = {
  owner: 'purchase',
  rootBranch: 'protected',
  stackScreens: [],
  modalScreens: PURCHASE_MODAL_SCREENS,
} as const satisfies FeatureNavigationConfig;
