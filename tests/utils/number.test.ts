import { toFiniteNumber, toNonNegativeNumber } from '@/utils/number';

describe('toFiniteNumber', () => {
  it('passes finite numbers through', () => {
    expect(toFiniteNumber(0)).toBe(0);
    expect(toFiniteNumber(42)).toBe(42);
    expect(toFiniteNumber(-7)).toBe(-7);
    expect(toFiniteNumber(3.5)).toBe(3.5);
  });

  it('coerces numeric strings', () => {
    expect(toFiniteNumber('12')).toBe(12);
    expect(toFiniteNumber('-4.5')).toBe(-4.5);
  });

  it('falls back for null / undefined / non-numeric / NaN / Infinity', () => {
    expect(toFiniteNumber(null)).toBe(0);
    expect(toFiniteNumber(undefined)).toBe(0);
    expect(toFiniteNumber('n/a')).toBe(0);
    expect(toFiniteNumber('')).toBe(0);
    expect(toFiniteNumber({})).toBe(0);
    expect(toFiniteNumber(NaN)).toBe(0);
    expect(toFiniteNumber(Infinity)).toBe(0);
    expect(toFiniteNumber(-Infinity)).toBe(0);
  });

  it('honors a custom fallback', () => {
    expect(toFiniteNumber('x', 5)).toBe(5);
    expect(toFiniteNumber(undefined, -1)).toBe(-1);
  });
});

describe('toNonNegativeNumber', () => {
  it('passes non-negative numbers through', () => {
    expect(toNonNegativeNumber(0)).toBe(0);
    expect(toNonNegativeNumber(9)).toBe(9);
    expect(toNonNegativeNumber('3')).toBe(3);
  });

  it('clamps negatives and non-numeric to the fallback', () => {
    expect(toNonNegativeNumber(-1)).toBe(0);
    expect(toNonNegativeNumber('-8')).toBe(0);
    expect(toNonNegativeNumber('n/a')).toBe(0);
    expect(toNonNegativeNumber(NaN)).toBe(0);
    expect(toNonNegativeNumber(-2, 10)).toBe(10);
  });
});
