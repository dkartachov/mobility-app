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
  /** Moved through continuously rather than held still. Passive otherwise. */
  active?: boolean;
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
  {
    id: 'resting-cossack-squat',
    name: 'Resting Cossack squat',
    stimulus: 'Inner thighs, groin, hips and ankles',
    instructions: [
      'Stand with your feet wide apart',
      'Sink down over one leg, keeping that heel down, and straighten the other leg with toes pointing up',
      'Relax into the bottom position, then switch sides',
    ],
    twoSided: true,
  },
  {
    id: 'v-sit',
    name: 'V sit',
    stimulus: 'Inner thighs, hamstrings and lower back',
    instructions: [
      'Sit with your legs straight and spread as wide as is comfortable',
      'Sit tall, then walk your hands forward between your legs',
      'Relax and let your chest sink toward the floor',
    ],
  },
  {
    id: 'active-v-sit',
    name: 'Active V sit',
    stimulus: 'Inner thighs, hamstrings, lower back and hip flexors',
    instructions: [
      'Sit with your legs straight and spread as wide as is comfortable',
      'Fold forward as far as you can, then sit back up tall',
      'Keep moving in and out of the stretch, going a little deeper each time',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'half-spinal-twist',
    name: 'Half spinal twist',
    stimulus: 'Spine, obliques, glutes and outer hip',
    instructions: [
      'Sit with one leg straight, cross the other foot over it and plant it beside the knee',
      'Hug the bent knee with the opposite arm and sit tall',
      'Twist toward the bent knee and hold, then switch sides',
    ],
    twoSided: true,
  },
  {
    id: 'the-breakdancer',
    name: 'The Breakdancer',
    stimulus: 'Hamstrings, calves, inner thigh and lower back',
    instructions: [
      'Sit with one leg extended flat on the floor',
      'Bend the other leg and press its foot against the inner thigh of the extended leg',
      'Roll forward and grab the foot of the extended leg, then hold and switch sides',
    ],
    twoSided: true,
  },
  {
    id: 'thread-the-needle',
    name: 'Thread the needle',
    stimulus: 'Upper back, thoracic rotation and shoulders',
    instructions: [
      'Start on your hands and knees',
      'Reach one arm up toward the ceiling, following it with your eyes',
      'Sweep it down and thread it under your other arm, then repeat and switch sides',
    ],
    twoSided: true,
    active: true,
  },
  {
    id: 'reverse-scorpion',
    name: 'Reverse scorpion',
    stimulus: 'Hip flexors, lower back, chest and obliques',
    instructions: [
      'Lie face down with your arms out to the sides',
      'Bend one knee and bring that foot across your body toward the opposite hand',
      'Bring it back and repeat with the other leg, keeping your chest down, and keep alternating',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'blackburn',
    name: 'Blackburn',
    stimulus: 'Upper back, shoulder blades and rotator cuff',
    instructions: [
      'Lie face down with your forehead just off the floor',
      'Lift your arms off the floor, thumbs up, and squeeze your shoulder blades together',
      'Keeping them lifted, sweep your arms slowly from by your sides up overhead and back',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'manual-extensor-forearm-stretch',
    name: 'Manual extensor forearm stretch',
    stimulus: 'Forearm extensors and wrist',
    instructions: [
      'Hold one arm out straight in front of you, palm down',
      'Use the other hand to gently bend the wrist down, fingers toward you',
      'Hold, then switch arms',
    ],
    twoSided: true,
  },
  {
    id: 'downward-facing-dog-to-cobra',
    name: 'Downward facing dog to cobra',
    stimulus: 'Hamstrings, calves, spine, abs and shoulders',
    instructions: [
      'Start in downward facing dog',
      'Lower your hips and roll forward into cobra, chest up and arms straight',
      'Push back into downward facing dog and keep flowing between the two',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'squat-to-stand',
    name: 'Squat to stand',
    stimulus: 'Hamstrings, hips, ankles and lower back',
    instructions: [
      'Stand with feet shoulder-width apart and fold forward to grab your toes',
      'Keeping hold of your toes, drop into a deep squat with your chest up',
      'Straighten your legs back up and keep alternating',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'bottom-squat-rotation',
    name: 'Bottom squat rotation',
    stimulus: 'Thoracic rotation, hips, ankles and shoulders',
    instructions: [
      'Sit in a deep bottom squat, heels down',
      'Put one hand on the floor and reach the other arm up toward the ceiling, rotating your chest',
      'Bring it back down and alternate sides',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'half-twisted-lizard',
    name: 'Half-twisted lizard',
    stimulus: 'Hip flexors, groin, thoracic rotation and quads',
    instructions: [
      'From a low lunge, put both hands inside your front foot and drop your back knee',
      'Bend your back knee and reach back with the opposite hand to grab that foot',
      'Pull the foot toward your glute, twist open and hold, then switch sides',
    ],
    twoSided: true,
  },
  {
    id: 'pigeon-stretch',
    name: 'Pigeon stretch',
    stimulus: 'Glutes, deep hip rotators and hip flexors',
    instructions: [
      'From hands and knees, bring one knee forward behind your wrist with the shin angled across',
      'Slide the other leg straight back',
      'Square your hips, fold forward over your front shin and hold, then switch sides',
    ],
    twoSided: true,
  },
  {
    id: 'prayer-pose',
    name: 'Prayer pose',
    stimulus: 'Lats, shoulders, lower back and hips',
    instructions: [
      'Kneel and sit back onto your heels, knees apart',
      'Fold forward and reach your arms out long in front of you',
      'Let your forehead and chest sink toward the floor and hold',
    ],
  },
  {
    id: 'crossed-prayer',
    name: 'Crossed prayer',
    stimulus: 'Lats, side of the torso and shoulders',
    instructions: [
      'Start in prayer pose, arms out long in front of you',
      'Cross one arm over the other and walk both hands toward the side of the top arm',
      'Sink your hips back and hold, then switch sides',
    ],
    twoSided: true,
  },
  {
    id: 'knight-stretch',
    name: 'Knight stretch',
    stimulus: 'Hip flexors and quads',
    instructions: [
      'Kneel on one knee with the other foot planted in front, both knees at 90°',
      'Squeeze the glute of the back leg and tuck your pelvis under',
      'Shift your hips forward and hold, then switch sides',
    ],
    twoSided: true,
  },
  {
    id: 'knight-to-hamstring',
    name: 'Knight to hamstring',
    stimulus: 'Hip flexors, quads and hamstrings',
    instructions: [
      'Start in the knight stretch, one knee down and the other foot in front',
      'Shift your hips back and straighten the front leg, folding over it with a flat back',
      'Return to the knight stretch and keep moving between the two, then switch sides',
    ],
    twoSided: true,
    active: true,
  },
  {
    id: '90-to-90-rotation',
    name: '90 to 90 rotation',
    stimulus: 'Hip rotation, glutes, deep hip rotators and thoracic rotation',
    instructions: [
      'Sit in the 90 to 90 position, both legs bent at 90°',
      'Rotate your knees over to the other side to switch the 90 to 90',
      'At each end, rotate your chest and reach to touch the floor as close as you can',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'three-legged-downward-facing-dog',
    name: 'Three legged downward facing dog',
    stimulus: 'Hamstrings, calves, hip flexors and shoulders',
    instructions: [
      'Start in downward facing dog',
      'Lift one leg up behind you as high as you can, keeping your hips level',
      'Lower it and lift the other leg, and keep alternating',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'cobra-to-prayer',
    name: 'Cobra to prayer',
    stimulus: 'Spine, abs, hip flexors, lats and shoulders',
    instructions: [
      'Lie face down and push up into cobra, chest up and arms straight',
      'Push your hips back onto your heels into prayer pose',
      'Flow back into cobra and keep alternating',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'scap-mobilization',
    name: 'Scap mobilization',
    stimulus: 'Shoulder blades, upper back and chest',
    instructions: [
      'Start on your hands and knees, arms straight',
      'Let your chest sink down between your shoulder blades',
      'Push the floor away to lift your chest back up, and keep repeating',
    ],
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'ankle-mobilization',
    name: 'Ankle mobilization',
    stimulus: 'Ankles and calves',
    instructions: [
      'Kneel on one knee with the other foot planted in front',
      'Drive the front knee forward over the toes, keeping the heel down',
      'Bring it back and keep rocking back and forth, then switch sides',
    ],
    twoSided: true,
    active: true,
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
