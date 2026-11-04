import type { Exercise } from '@/data/exercises';

import { filterLibrary, hasLibraryFilters, NO_LIBRARY_FILTERS, toggleLibraryFilter } from './library-filters';

function exercise(id: string, fields: Partial<Exercise>): Exercise {
  return { id, name: id, stimulus: '', position: 'standing', instructions: [], active: false, ...fields } as Exercise;
}

const standing = exercise('standing', { position: 'standing' });
const seatedBand = exercise('seated band', { position: 'seated', equipment: ['band'], active: true });
const eitherWall = exercise('either wall', { position: 'either', equipment: ['wall'] });
const ALL = [standing, seatedBand, eitherWall];

describe('filterLibrary', () => {
  it('shows everything with nothing selected', () => {
    expect(filterLibrary(ALL, NO_LIBRARY_FILTERS)).toEqual(ALL);
  });

  it('lets exercises done either way match any position', () => {
    expect(filterLibrary(ALL, { ...NO_LIBRARY_FILTERS, positions: ['seated'] })).toEqual([seatedBand, eitherWall]);
  });

  it('matches any selected equipment the exercise uses', () => {
    expect(filterLibrary(ALL, { ...NO_LIBRARY_FILTERS, equipment: ['band', 'wall'] })).toEqual([seatedBand, eitherWall]);
  });

  it('needs a match in every group with a selection', () => {
    expect(filterLibrary(ALL, { positions: ['seated'], equipment: [], types: ['passive'] })).toEqual([eitherWall]);
  });
});

describe('toggleLibraryFilter', () => {
  it('selects, then unselects, leaving the other groups alone', () => {
    const selected = toggleLibraryFilter(NO_LIBRARY_FILTERS, 'types', 'active');
    expect(selected).toEqual({ ...NO_LIBRARY_FILTERS, types: ['active'] });
    expect(hasLibraryFilters(selected)).toBe(true);

    const unselected = toggleLibraryFilter(selected, 'types', 'active');
    expect(unselected).toEqual(NO_LIBRARY_FILTERS);
    expect(hasLibraryFilters(unselected)).toBe(false);
  });
});
