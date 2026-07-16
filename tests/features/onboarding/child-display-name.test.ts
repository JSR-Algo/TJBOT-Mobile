import {
  CHILD_DISPLAY_NAME_MAX_LENGTH,
  normalizeChildDisplayName,
} from '@/features/onboarding/childDisplayName';

describe('normalizeChildDisplayName', () => {
  it('trims and collapses whitespace in a custom display name', () => {
    expect(normalizeChildDisplayName('  Bé   Bông  ', 'Bạn Gấu trúc')).toBe('Bé Bông');
  });

  it('uses the buddy suggestion when the input is empty', () => {
    expect(normalizeChildDisplayName('   ', 'Bạn Gấu trúc')).toBe('Bạn Gấu trúc');
  });

  it('limits the saved name to the backend maximum', () => {
    expect(normalizeChildDisplayName('a'.repeat(70), 'Bạn Gấu trúc')).toHaveLength(
      CHILD_DISPLAY_NAME_MAX_LENGTH,
    );
  });
});
