/** Lifetime mobility-time milestones, in hours. Append to this list to add more. */
export const MILESTONE_HOURS = [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 125, 150, 175, 200];

export type MilestoneProgress = {
  /** The milestone already reached, or 0 before the first one. */
  previousHours: number;
  /** `null` once every milestone is reached. */
  nextHours: number | null;
  /** 0–1 progress from `previousHours` to `nextHours`. */
  progress: number;
};

/** Runs on the UI thread too, so animated progress bars can track milestones frame by frame. */
export function milestoneProgress(totalSeconds: number): MilestoneProgress {
  'worklet';
  const hours = totalSeconds / 3600;
  let previous = 0;
  for (let i = 0; i < MILESTONE_HOURS.length; i++) {
    const milestone = MILESTONE_HOURS[i];
    if (hours < milestone) {
      return { previousHours: previous, nextHours: milestone, progress: (hours - previous) / (milestone - previous) };
    }
    previous = milestone;
  }
  return { previousHours: previous, nextHours: null, progress: 1 };
}

/** The highest milestone passed when going from `fromSeconds` to `toSeconds`, if any. */
export function milestoneReached(fromSeconds: number, toSeconds: number): number | null {
  const passed = MILESTONE_HOURS.filter((hours) => fromSeconds < hours * 3600 && toSeconds >= hours * 3600);
  return passed.at(-1) ?? null;
}
