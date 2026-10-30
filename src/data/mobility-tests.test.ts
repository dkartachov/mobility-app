import {
  DEFAULT_BODY,
  FLEXIBILITY_TESTS,
  METHOD_UNITS,
  TEST_STEPS,
  type BodyMeasurements,
  type FlexibilityTest,
} from './mobility-tests';

const NO_BODY: BodyMeasurements = { handLength: null, fingerLength: null, handSpan: null };

function hintFor(id: string) {
  const test = FLEXIBILITY_TESTS.find((t) => t.id === id) as FlexibilityTest;
  if (test.method.kind !== 'distance' || !test.method.hint) throw new Error(`${id} has no hint`);
  return test.method.hint;
}

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

describe('sit and reach hint', () => {
  const hint = hintFor('sit-and-reach');

  it('uses default hand sizes when none are entered', () => {
    expect(hint(-20, NO_BODY)).toBe('Fingertips at the shins');
    expect(hint(-5, NO_BODY)).toBe('Fingertips at the tops of your feet');
    expect(hint(0, NO_BODY)).toBe('Fingertips at your toes');
    expect(hint(DEFAULT_BODY.fingerLength, NO_BODY)).toBe('Fingers past your toes');
    expect(hint(DEFAULT_BODY.fingerLength + 1, NO_BODY)).toBe('Palms past your toes');
    expect(hint(DEFAULT_BODY.handLength, NO_BODY)).toBe('Palms past your toes');
    expect(hint(DEFAULT_BODY.handLength + 1, NO_BODY)).toBe('Wrists past your toes');
  });

  it("uses the person's own hand length", () => {
    const body = { ...NO_BODY, handLength: 21 };
    expect(hint(20, NO_BODY)).toBe('Wrists past your toes');
    expect(hint(20, body)).toBe('Palms past your toes');
  });
});
