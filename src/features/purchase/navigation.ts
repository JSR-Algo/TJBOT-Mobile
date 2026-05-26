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
import { ROUTES } from '@/navigation/routes';
import type { FeatureNavigationConfig } from '@/navigation/types';
import { defineFeatureScreens } from '@/navigation/types';

export const PURCHASE_MODAL_SCREENS = defineFeatureScreens([
  { name: ROUTES.PurchaseIntroScreen, component: PurchaseIntroScreen, role: 'modal-entry', backTarget: ROUTES.DeviceHomeScreen, stateMachineId: 'pr_intro' },
  { name: ROUTES.HowItWorksScreen, component: HowItWorksScreen, role: 'modal', backTarget: ROUTES.PurchaseIntroScreen, stateMachineId: 'pr_how' },
  { name: ROUTES.IncludedScreen, component: IncludedScreen, role: 'modal', backTarget: ROUTES.HowItWorksScreen, stateMachineId: 'pr_included' },
  { name: ROUTES.BundleScreen, component: BundleScreen, role: 'modal', backTarget: ROUTES.IncludedScreen, stateMachineId: 'pr_bundle' },
  { name: ROUTES.SubscriptionsScreen, component: SubscriptionsScreen, role: 'modal', backTarget: ROUTES.BundleScreen, stateMachineId: 'pr_subs' },
  { name: ROUTES.PrivacyScreen, component: PrivacyScreen, role: 'modal', backTarget: ROUTES.SubscriptionsScreen, stateMachineId: 'pr_privacy' },
  { name: ROUTES.CheckoutScreen, component: CheckoutScreen, role: 'modal', backTarget: ROUTES.PrivacyScreen, stateMachineId: 'pr_checkout' },
  { name: ROUTES.OrderConfirmScreen, component: OrderConfirmScreen, role: 'modal', backTarget: ROUTES.CheckoutScreen, stateMachineId: 'pr_confirm' },
  { name: ROUTES.ShippingScreen, component: ShippingScreen, role: 'modal', backTarget: ROUTES.OrderConfirmScreen, stateMachineId: 'pr_shipping' },
  { name: ROUTES.ArrivedScreen, component: ArrivedScreen, role: 'modal', backTarget: ROUTES.ShippingScreen, stateMachineId: 'pr_arrived' },
  { name: ROUTES.ActivateScreen, component: ActivateScreen, role: 'modal', backTarget: ROUTES.ArrivedScreen, stateMachineId: 'pr_activate' },
  { name: ROUTES.FirstCourseScreen, component: FirstCourseScreen, role: 'modal', backTarget: ROUTES.ActivateScreen, stateMachineId: 'pr_first_course' },
]);

export const PURCHASE_NAVIGATION = {
  owner: 'purchase',
  rootBranch: 'protected',
  stackScreens: [],
  modalScreens: PURCHASE_MODAL_SCREENS,
} as const satisfies FeatureNavigationConfig;
