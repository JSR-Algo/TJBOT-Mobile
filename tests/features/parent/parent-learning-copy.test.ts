import { parentReportCategoryLabel, parentResponseClassLabel, parentSessionStateLabel } from '@/features/parent/parentLearningCopy';

it('localizes every parent report interpolation key in Vietnamese', () => {
  expect(parentSessionStateLabel('COMPLETED', 'vi')).toBe('Đã hoàn tất');
  expect(parentSessionStateLabel('FAILED', 'vi')).toBe('Chưa hoàn thành');
  expect(parentResponseClassLabel('MATCH', 'vi')).toBe('Khớp');
  expect(parentReportCategoryLabel('Presented', 'vi')).toBe('Đã giới thiệu');
  expect(parentReportCategoryLabel('Attempted', 'vi')).toBe('Đã thử');
  expect(parentReportCategoryLabel('Accepted', 'vi')).toBe('Đã trả lời phù hợp');
  expect(parentReportCategoryLabel('Needs review', 'vi')).toBe('Cần ôn lại');
});

it('keeps the English parent report labels explicit', () => {
  expect(parentSessionStateLabel('COMPLETED', 'en')).toBe('Completed');
  expect(parentSessionStateLabel('FAILED', 'en')).toBe("Didn't finish");
  expect(parentResponseClassLabel('MATCH', 'en')).toBe('Match');
});

it.each([
  ['ASSIGNED', 'Preparing', 'Đang chuẩn bị'],
  ['PRELOADING', 'Preparing', 'Đang chuẩn bị'],
  ['PREPARING', 'Preparing', 'Đang chuẩn bị'],
  ['READY', 'Preparing', 'Đang chuẩn bị'],
  ['RUNNING', 'In progress', 'Đang tiến hành'],
  ['ENTRANCE', 'Robot entrance', 'Robot đang xuất hiện'],
  ['TEACHING', 'Teaching', 'Đang hướng dẫn'],
  ['LISTENING', 'Listening', 'Đang nghe'],
  ['THINKING', 'Thinking', 'Đang suy nghĩ'],
  ['TEACH', 'Teaching', 'Đang hướng dẫn'],
  ['LISTEN', 'Listening', 'Đang nghe'],
  ['THINK', 'Thinking', 'Đang suy nghĩ'],
  ['FEEDBACK', 'Feedback', 'Đang phản hồi'],
])('localizes live state %s with the same copy as Parent Today', (state, english, vietnamese) => {
  expect(parentSessionStateLabel(state, 'en')).toBe(english);
  expect(parentSessionStateLabel(state, 'vi')).toBe(vietnamese);
});
