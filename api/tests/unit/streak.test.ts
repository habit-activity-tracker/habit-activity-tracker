import { calculateStreak } from '../../src/services/streak.js';

describe('S2-F06-S deterministic streak', () => {
  const range = { startDate: '2026-11-01', endDate: '2026-11-30' };

  it('counts consecutive days ending today', () => {
    expect(calculateStreak(['2026-11-22', '2026-11-23', '2026-11-24'], '2026-11-24', range)).toBe(3);
  });

  it('ends at yesterday when today is not recorded', () => {
    expect(calculateStreak(['2026-11-22', '2026-11-23'], '2026-11-24', range)).toBe(2);
  });

  it('breaks at a missing day and returns zero when neither today nor yesterday exists', () => {
    expect(calculateStreak(['2026-11-22', '2026-11-24'], '2026-11-24', range)).toBe(1);
    expect(calculateStreak(['2026-11-21'], '2026-11-24', range)).toBe(0);
  });

  it('excludes future, out-of-period, and post-revision-end dates', () => {
    expect(calculateStreak(['2026-10-31', '2026-11-24', '2026-11-25'], '2026-11-24', range)).toBe(1);
    expect(calculateStreak(['2026-11-24'], '2026-11-24', { startDate: '2026-11-01', endDate: '2026-11-23' })).toBe(0);
  });
});
