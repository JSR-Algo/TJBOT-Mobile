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
