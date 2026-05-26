import PurchaseIntroScreen from './screens/PurchaseIntroScreen';
import HowItWorksScreen from './screens/HowItWorksScreen';
import IncludedScreen from './screens/IncludedScreen';
import BundleScreen from './screens/BundleScreen';
import SubscriptionsScreen from './screens/SubscriptionsScreen';
import PrivacyScreen from './screens/PrivacyScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import OrderConfirmScreen from './screens/OrderConfirmScreen';
import ShippingScreen from './screens/ShippingScreen';
import ArrivedScreen from './screens/ArrivedScreen';
import ActivateScreen from './screens/ActivateScreen';
import FirstCourseScreen from './screens/FirstCourseScreen';
import { STATES } from './states';

export const SCREEN_MAP = {
  pr_intro: PurchaseIntroScreen,
  pr_how: HowItWorksScreen,
  pr_included: IncludedScreen,
  pr_bundle: BundleScreen,
  pr_subs: SubscriptionsScreen,
  pr_privacy: PrivacyScreen,
  pr_checkout: CheckoutScreen,
  pr_confirm: OrderConfirmScreen,
  pr_shipping: ShippingScreen,
  pr_arrived: ArrivedScreen,
  pr_activate: ActivateScreen,
  pr_first_course: FirstCourseScreen,
};

export { STATES };
