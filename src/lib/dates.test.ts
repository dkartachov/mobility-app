import { addDays, ageFromDateKey, daysBetween, formatDuration, fromDateKey, toDateKey, todayKey } from './dates';

describe('date keys', () => {
  it('formats local dates as zero-padded YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
  });

  it('round-trips through fromDateKey as local midnight', () => {
    const date = fromDateKey('2026-03-09');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 2, 9, 0]);
    expect(toDateKey(date)).toBe('2026-03-09');
  });

  it('uses the current local day for todayKey', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 28, 23, 30) });
    expect(todayKey()).toBe('2026-10-28');
    jest.useRealTimers();
  });
});

describe('addDays', () => {
  it('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('daysBetween', () => {
  it('counts whole calendar days in either direction', () => {
    expect(daysBetween('2026-10-01', '2026-10-01')).toBe(0);
    expect(daysBetween('2026-10-01', '2026-10-31')).toBe(30);
    expect(daysBetween('2026-10-31', '2026-10-01')).toBe(-30);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0m'],
    [59, '0m'],
    [45 * 60, '45m'],
    [3600, '1h'],
    [2 * 3600 + 15 * 60 + 30, '2h 15m'],
  ])('formats %i seconds as %s', (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });
});

describe('ageFromDateKey', () => {
  afterEach(() => jest.useRealTimers());

  it('only counts a year once the birthday has passed', () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 28) });
    expect(ageFromDateKey('2000-10-27')).toBe(26);
    expect(ageFromDateKey('2000-10-28')).toBe(26);
    expect(ageFromDateKey('2000-10-29')).toBe(25);
    expect(ageFromDateKey('2000-11-01')).toBe(25);
  });

  it('gives the age on another day', () => {
    expect(ageFromDateKey('2000-10-28', '2010-10-27')).toBe(9);
    expect(ageFromDateKey('2000-10-28', '2010-10-28')).toBe(10);
  });
});
