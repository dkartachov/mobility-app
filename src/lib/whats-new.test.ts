import Storage from 'expo-sqlite/kv-store';

import { getUnseenNotes, markWhatsNewSeen } from './whats-new';

const releases = [
  { id: 3, notes: ['Dark charts'] },
  { id: 2, notes: ['Hip test', 'Faster sync'] },
  { id: 1, notes: ['Reminders'] },
];

describe("what's new", () => {
  beforeEach(() => Storage.clearSync());

  it('shows only the latest release on a phone that has never shown any', () => {
    expect(getUnseenNotes(releases)).toEqual(['Dark charts']);
  });

  it('shows every release since the last one seen, newest first', () => {
    Storage.setItemSync('whatsNew.lastSeen', '1');

    expect(getUnseenNotes(releases)).toEqual(['Dark charts', 'Hip test', 'Faster sync']);
  });

  it('shows nothing once the latest release is seen', () => {
    markWhatsNewSeen(releases);

    expect(Storage.getItemSync('whatsNew.lastSeen')).toBe('3');
    expect(getUnseenNotes(releases)).toEqual([]);
  });

  it('copes with releases listed out of order', () => {
    Storage.setItemSync('whatsNew.lastSeen', '1');

    expect(getUnseenNotes([releases[2], releases[0], releases[1]])).toEqual(['Dark charts', 'Hip test', 'Faster sync']);
  });
});
