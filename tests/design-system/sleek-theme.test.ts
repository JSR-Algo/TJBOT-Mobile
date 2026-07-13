import {
  gardenColors,
  gardenGradient,
  parentColors,
  referenceColors,
} from '@/design-system/referenceTheme';

describe('Sleek warm theme', () => {
  it('keeps child, device, and parent surfaces on one cream and coral system', () => {
    expect(referenceColors.bg).toBe('#FAF5EB');
    expect(referenceColors.primary).toBe('#FF6B6B');
    expect(gardenColors.bg).toBe(referenceColors.bg);
    expect(gardenColors.coral).toBe(referenceColors.primary);
    expect(parentColors.bg).toBe(referenceColors.bg);
    expect(parentColors.accent).toBe(referenceColors.primary);
    expect(parentColors.line).toBe(referenceColors.line);
  });

  it('uses a subtle cream backdrop instead of the previous blue gradient', () => {
    expect(gardenGradient).toEqual(['#FAF5EB', '#F5ECDD']);
  });
});
