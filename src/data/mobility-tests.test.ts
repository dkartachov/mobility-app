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

describe('forward fold hint', () => {
  const hint = hintFor('forward-fold');

  it('uses default hand sizes when none are entered', () => {
    // Palms flat at or below -(handLength - 1), fingers flat at or below -(fingerLength - 2).
    expect(hint(-(DEFAULT_BODY.handLength - 1), NO_BODY)).toBe('Palms flat on the floor');
    expect(hint(-(DEFAULT_BODY.handLength - 2), NO_BODY)).toBe('Fingers flat on the floor');
    expect(hint(-(DEFAULT_BODY.fingerLength - 2), NO_BODY)).toBe('Fingers flat on the floor');
    expect(hint(-1, NO_BODY)).toBe('Fingertips touch the floor');
    expect(hint(0, NO_BODY)).toBe('Fingertips touch the floor');
    expect(hint(10, NO_BODY)).toBe('Fingertips at the ankles');
    expect(hint(40, NO_BODY)).toBe('Fingertips at the shins');
  });

  it("uses the person's own hand length", () => {
    const body = { ...NO_BODY, handLength: 21 };
    expect(hint(-19, NO_BODY)).toBe('Palms flat on the floor');
    expect(hint(-19, body)).toBe('Fingers flat on the floor');
    expect(hint(-20, body)).toBe('Palms flat on the floor');
  });
});

describe('butterfly hint', () => {
  const hint = hintFor('butterfly');

  it('describes knee height with landmarks', () => {
    expect(hint(0, NO_BODY)).toBe('Knee on the floor');
    expect(hint(2, NO_BODY)).toBe('Knee on the floor');
    expect(hint(12, NO_BODY)).toBe('About a fist high');
    expect(hint(DEFAULT_BODY.handSpan + 5, NO_BODY)).toBe('About a hand-span high');
    expect(hint(DEFAULT_BODY.handSpan + 6, NO_BODY)).toBe('Higher than a hand-span');
  });

  it("uses the person's own hand span", () => {
    expect(hint(28, NO_BODY)).toBe('Higher than a hand-span');
    expect(hint(28, { ...NO_BODY, handSpan: 23 })).toBe('About a hand-span high');
  });
});
