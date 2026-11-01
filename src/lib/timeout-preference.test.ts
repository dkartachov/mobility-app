import Storage from 'expo-sqlite/kv-store';

import { DEFAULT_TIMEOUT_SECONDS, formatTimeoutLength, getTimeoutSeconds, setTimeoutSeconds } from './timeout-preference';

describe('timeout length', () => {
  it('defaults to 30 seconds', () => {
    expect(DEFAULT_TIMEOUT_SECONDS).toBe(30);
    expect(getTimeoutSeconds()).toBe(30);
  });

  it('saves the chosen length', () => {
    setTimeoutSeconds(60);

    expect(getTimeoutSeconds()).toBe(60);
    expect(Storage.getItemSync('timeoutSeconds')).toBe('60');
  });

  it.each([
    [15, '15 s'],
    [90, '90 s'],
    [60, '1 min'],
    [120, '2 min'],
  ])('labels %i seconds as %s', (seconds, label) => {
    expect(formatTimeoutLength(seconds)).toBe(label);
  });
});
