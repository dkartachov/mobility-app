import { FLEXIBILITY_TESTS, METHOD_UNITS, TEST_STEPS } from './mobility-tests';

describe('FLEXIBILITY_TESTS', () => {
  it('has unique ids', () => {
    const ids = FLEXIBILITY_TESTS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a sensible range for every distance test', () => {
    for (const { method } of FLEXIBILITY_TESTS) {
      if (method.kind === 'distance') expect(method.min).toBeLessThan(method.max);
    }
  });

  it('has a unit for every measurement method', () => {
    for (const { method } of FLEXIBILITY_TESTS) expect(METHOD_UNITS[method.kind]).toBeDefined();
  });
});

describe('TEST_STEPS', () => {
  it('splits two-sided tests into left then right, in test order', () => {
    const expected = FLEXIBILITY_TESTS.flatMap((test) =>
      test.twoSided ? [`${test.id}:left`, `${test.id}:right`] : [`${test.id}:none`]
    );
    expect(TEST_STEPS.map(({ test, side }) => `${test.id}:${side ?? 'none'}`)).toEqual(expected);
  });
});
