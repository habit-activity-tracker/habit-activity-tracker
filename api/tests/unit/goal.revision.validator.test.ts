import { validateGoalRevision } from '../../src/validators/goal.js';

describe('S2-F04-R: validateGoalRevision', () => {
  const startDate = '2026-11-01';

  it('TEST-S2-02a / AC-S2-02: accepts valid revision payload', () => {
    const result = validateGoalRevision({ target: 200, end_date: '2026-12-15' }, startDate);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value).toEqual({ target: 200, end_date: '2026-12-15' });
    }
  });

  it('TEST-S2-02a / AC-S2-02: rejects non-positive targets', () => {
    const zeroResult = validateGoalRevision({ target: 0, end_date: '2026-12-15' }, startDate);
    expect(zeroResult.valid).toBe(false);
    if (!zeroResult.valid) {
      expect(zeroResult.details.target).toBeDefined();
    }

    const negativeResult = validateGoalRevision({ target: -10, end_date: '2026-12-15' }, startDate);
    expect(negativeResult.valid).toBe(false);
    if (!negativeResult.valid) {
      expect(negativeResult.details.target).toBeDefined();
    }
  });

  it('TEST-S2-02a / AC-S2-02: rejects non-numeric targets', () => {
    const result = validateGoalRevision({ target: '100', end_date: '2026-12-15' }, startDate);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.details.target).toBeDefined();
    }
  });

  it('TEST-S2-03 / AC-S2-03: rejects end_date earlier than start_date', () => {
    const result = validateGoalRevision({ target: 200, end_date: '2026-10-31' }, startDate);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.details.end_date).toBeDefined();
    }
  });

  it('TEST-S2-03 / AC-S2-03: rejects malformed date and extraneous fields', () => {
    const malformedDate = validateGoalRevision({ target: 200, end_date: 'invalid-date' }, startDate);
    expect(malformedDate.valid).toBe(false);

    const extraneous = validateGoalRevision({ target: 200, end_date: '2026-12-15', start_date: '2026-11-05' }, startDate);
    expect(extraneous.valid).toBe(false);
    if (!extraneous.valid) {
      expect(extraneous.details.start_date).toBeDefined();
    }
  });
});
