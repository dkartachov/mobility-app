import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { WorkoutPlayer } from '@/components/workout-player';
import { getExercise } from '@/data/exercises';

// The figure runs its own animation loop, and the cues play sounds and speech.
jest.mock('@/components/exercise-video', () => ({ ExerciseVideo: () => null }));
jest.mock('@/hooks/use-workout-cues', () => ({ useWorkoutCues: () => undefined }));
jest.mock('expo-keep-awake', () => ({ useKeepAwake: () => undefined }));

const butterfly = getExercise('butterfly')!;
const steps = [{ exercise: butterfly, durationSeconds: 60 }];

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

async function renderPlayer(onReport?: jest.Mock) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <WorkoutPlayer
        steps={steps}
        bufferMs={5000}
        completeLabel="Complete workout"
        onComplete={jest.fn()}
        onBack={jest.fn()}
        onReport={onReport}
      />
    </SafeAreaProvider>
  );
}

describe('workout player report button', () => {
  it('pauses the workout and reports the exercise on screen', async () => {
    const onReport = jest.fn();
    await renderPlayer(onReport);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Report a problem with this exercise' }));

    expect(onReport).toHaveBeenCalledWith(butterfly);
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
  });

  it("isn't shown where feedback can't be sent", async () => {
    await renderPlayer();

    expect(screen.queryByRole('button', { name: 'Report a problem with this exercise' })).toBeNull();
  });
});
