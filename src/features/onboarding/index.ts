import ChildProfileScreen from './screens/ChildProfileScreen';
import MicAskScreen from './screens/MicAskScreen';
import ParentConsentScreen from './screens/ParentConsentScreen';
import FirstLessonEntryScreen from './screens/FirstLessonEntryScreen';

export { STATES } from './states';

export const SCREEN_MAP = {
  onb_coppa:           ParentConsentScreen,
  onb_child:           ChildProfileScreen,
  onb_mic:             MicAskScreen,
  onb_first_lesson:    FirstLessonEntryScreen,
};
