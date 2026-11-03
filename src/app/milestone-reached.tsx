import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';

import { MilestoneReveal } from '@/components/milestone-reveal';
import { parseMilestoneHours } from '@/lib/milestones';

export default function MilestoneReachedScreen() {
  const { hours } = useLocalSearchParams<{ hours: string }>();
  const [done, setDone] = useState(false);

  // Going back does nothing here: Done is the way out.
  usePreventRemove(!done, () => {});
  // Runs after the re-render that lifts the prevention above, so this navigation isn't blocked.
  useEffect(() => {
    if (done) router.back();
  }, [done]);

  return <MilestoneReveal hours={parseMilestoneHours(hours)} onDone={() => setDone(true)} />;
}
