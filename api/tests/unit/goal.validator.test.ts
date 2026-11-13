import { validateGoal } from '../../src/validators/goal.js';

describe('goal validator', () => {
  it('accepts a one-day goal and rejects invalid target/date values', () => {
    expect(validateGoal({ template_id: '00000000-0000-4000-8000-000000000001', target: 10, start_date: '2026-11-04', end_date: '2026-11-04' }, 'Asia/Bangkok')).toEqual(expect.objectContaining({ valid: true }));
    expect(validateGoal({ template_id: '00000000-0000-4000-8000-000000000001', target: 0, start_date: '2026-11-04', end_date: '2026-11-04' }, 'Asia/Bangkok')).toEqual(expect.objectContaining({ valid: false }));
    expect(validateGoal({ template_id: '00000000-0000-4000-8000-000000000001', target: 10, start_date: '2026-11-05', end_date: '2026-11-04' }, 'Asia/Bangkok')).toEqual(expect.objectContaining({ valid: false }));
    // Intentional failure for Lab 5 C-02 merge-gate evidence. Do not merge.
    expect(true).toBe(false);
  });
});
