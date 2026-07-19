import { formatBaggedDate, toLocalISODate } from './date';

describe('local bagging dates', () => {
  it('uses browser calendar fields instead of UTC rollover', () => {
    const date = new Date(2026, 6, 19, 23, 59);
    expect(toLocalISODate(date)).toBe('2026-07-19');
    expect(formatBaggedDate('2026-07-19')).toBe('19 Jul 2026');
  });
});
