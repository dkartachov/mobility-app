import type { ImageSource } from 'expo-image';

export type Exercise = {
  id: string;
  name: string;
  /** Quick summary of the muscles and areas of the body the exercise works. */
  stimulus: string;
  instructions: string[];
  photo?: ImageSource;
  /** Always held for 1 minute in generated workouts, never 2. */
  oneMinuteOnly?: boolean;
  /** Done on each side in turn: 1 minute per side, 2 minutes in total. */
  twoSided?: boolean;
};

const ALL_EXERCISES: Exercise[] = [
  {
    id: '90-to-90',
    name: '90 to 90',
    stimulus: 'Hip rotation, glutes and deep hip rotators',
    instructions: [
      'Sit with both legs bent at 90°, one in front and one to the side',
      'Sit tall and lean forward over your front shin',
      'Hold, then switch sides',
    ],
  },
  {
    id: 'butterfly',
    name: 'Butterfly',
    stimulus: 'Inner thighs, groin and hips',
    instructions: [
      'Sit with the soles of your feet together, heels pulled in',
      'Sit tall and let your knees relax toward the floor',
      'Lean forward for a deeper stretch',
    ],
  },
  {
    id: 'bottom-squat',
    name: 'Bottom squat',
    stimulus: 'Ankles, hips, inner thighs and lower back',
    instructions: [
      'Stand with feet shoulder-width apart, toes slightly out',
      'Squat as low as you can, heels down and chest up',
      'Push your knees out with your elbows and hold',
    ],
  },
  {
    id: 'downward-facing-dog',
    name: 'Downward facing dog',
    stimulus: 'Hamstrings, calves, back and shoulders',
    instructions: [
      'Start on your hands and knees',
      'Lift your hips up and back into an upside-down V',
      'Push the floor away, let your heels sink and hold',
    ],
    photo: require('@/assets/images/exercises/downward-dog.jpg'),
    oneMinuteOnly: true,
  },
  {
    id: 'the-sagittarius',
    name: 'The Sagittarius',
    stimulus: 'Butt, back, thorax and pectorals',
    instructions: [
      'Bend hip and knee to 90 degrees',
      'Hold your knee in place, and keep your opposite leg straight and in-line with your torso',
      'Relax your opposite arm, and place the back of your hand on the ground',
    ],
    twoSided: true,
  },
  {
    id: 'half-kneeling-frog-stretch',
    name: 'Half kneeling frog stretch',
    stimulus: 'Inner thigh, groin and hip',
    instructions: [
      'On hands and knees, straighten one leg out to the side',
      'Rock your hips back until you feel it in the inner thigh',
      'Rock back and forth or hold, then switch sides',
    ],
    twoSided: true,
  },
  {
    id: 'pec-stretch-on-the-ground',
    name: 'Pec stretch on the ground',
    stimulus: 'Chest and front of the shoulder',
    instructions: [
      'Lie face down with one arm out to the side, palm down',
      'Push with your other hand to roll toward the outstretched arm',
      'Hold, then switch arms',
    ],
    twoSided: true,
  },
];

/** All exercises, ordered alphabetically by name. */
export const EXERCISES = [...ALL_EXERCISES].sort((a, b) =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }),
);

export function getExercise(id: string | undefined) {
  return EXERCISES.find((exercise) => exercise.id === id);
}

export function searchExercises(query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return EXERCISES;
  return EXERCISES.filter((exercise) => exercise.name.toLowerCase().includes(needle));
}
