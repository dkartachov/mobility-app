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
    photo: require('@/assets/images/exercises/90-to-90.png'),
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
    photo: require('@/assets/images/exercises/butterfly.png'),
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
    photo: require('@/assets/images/exercises/bottom-squat.png'),
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
    photo: require('@/assets/images/exercises/the-sagittarius.png'),
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
    photo: require('@/assets/images/exercises/half-kneeling-frog-stretch.png'),
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
    photo: require('@/assets/images/exercises/pec-stretch-on-the-ground.png'),
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
    photo: require('@/assets/images/exercises/resting-cossack-squat.png'),
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
    photo: require('@/assets/images/exercises/v-sit.png'),
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
    photo: require('@/assets/images/exercises/active-v-sit.png'),
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
    photo: require('@/assets/images/exercises/half-spinal-twist.png'),
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
    photo: require('@/assets/images/exercises/the-breakdancer.png'),
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
    photo: require('@/assets/images/exercises/thread-the-needle.png'),
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
    photo: require('@/assets/images/exercises/reverse-scorpion.png'),
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
    photo: require('@/assets/images/exercises/blackburn.png'),
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
    photo: require('@/assets/images/exercises/manual-extensor-forearm-stretch.png'),
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
    photo: require('@/assets/images/exercises/downward-facing-dog-to-cobra.png'),
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
    photo: require('@/assets/images/exercises/squat-to-stand.png'),
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
    photo: require('@/assets/images/exercises/bottom-squat-rotation.png'),
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
    photo: require('@/assets/images/exercises/half-twisted-lizard.png'),
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
    photo: require('@/assets/images/exercises/pigeon-stretch.png'),
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
    photo: require('@/assets/images/exercises/prayer-pose.png'),
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
    photo: require('@/assets/images/exercises/crossed-prayer.png'),
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
    photo: require('@/assets/images/exercises/knight-stretch.png'),
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
    photo: require('@/assets/images/exercises/knight-to-hamstring.png'),
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
    photo: require('@/assets/images/exercises/90-to-90-rotation.png'),
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
    photo: require('@/assets/images/exercises/three-legged-downward-facing-dog.png'),
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
    photo: require('@/assets/images/exercises/cobra-to-prayer.png'),
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
    photo: require('@/assets/images/exercises/scap-mobilization.png'),
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
    photo: require('@/assets/images/exercises/ankle-mobilization.png'),
    twoSided: true,
    active: true,
  },
  {
    id: 'manual-flexor-forearm-stretch',
    name: 'Manual flexor forearm stretch',
    stimulus: 'Forearm flexors, wrist and fingers',
    instructions: [
      'Hold one arm out straight in front of you, palm up',
      'Use the other hand to gently pull the fingers down and back toward you',
      'Hold, then switch arms',
    ],
    photo: require('@/assets/images/exercises/manual-flexor-forearm-stretch.png'),
    twoSided: true,
  },
  {
    id: 'kneeling-wrist-stretch',
    name: 'Kneeling wrist stretch',
    stimulus: 'Forearm flexors, wrists and palms',
    instructions: [
      'Kneel and place your palms flat on the floor, fingers pointing back toward your knees',
      'Keep your arms straight and slowly shift your weight back toward your heels',
      'Stop when you feel it in your forearms and hold',
    ],
    photo: require('@/assets/images/exercises/kneeling-wrist-stretch.png'),
  },
  {
    id: 'reverse-prayer',
    name: 'Reverse prayer',
    stimulus: 'Forearm extensors, wrists and front of the shoulders',
    instructions: [
      'Kneel and place the backs of your hands on the floor, fingers pointing toward your knees',
      'Keep your arms straight and gently lean back',
      'Hold, keeping your shoulders relaxed',
    ],
    photo: require('@/assets/images/exercises/reverse-prayer.png'),
  },
  {
    id: 'wrist-rocks',
    name: 'Wrist rocks',
    stimulus: 'Wrists, forearms and fingers',
    instructions: [
      'Start on your hands and knees, hands under your shoulders',
      'Rock your shoulders forward past your hands, then back toward your heels',
      'Keep rocking, now and then turning your hands to point sideways or backward',
    ],
    photo: require('@/assets/images/exercises/wrist-rocks.png'),
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'finger-tendon-glides',
    name: 'Finger tendon glides',
    stimulus: 'Finger tendons, finger joints and forearms',
    instructions: [
      'Hold both hands up with fingers straight',
      'Move slowly through a hook fist, a full fist, then a flat fist with straight fingers',
      'Open back to straight fingers and keep cycling through the positions',
    ],
    photo: require('@/assets/images/exercises/finger-tendon-glides.png'),
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'sleeper-stretch',
    name: 'Sleeper stretch',
    stimulus: 'Back of the shoulder and rotator cuff',
    instructions: [
      'Lie on your side with your bottom arm out in front at shoulder height, elbow bent to 90°',
      'Use your top hand to gently press the bottom forearm down toward the floor',
      'Hold without forcing it, then switch sides',
    ],
    photo: require('@/assets/images/exercises/sleeper-stretch.png'),
    twoSided: true,
  },
  {
    id: 'puppy-pose',
    name: 'Puppy pose',
    stimulus: 'Upper back, lats, chest and shoulders',
    instructions: [
      'Start on your hands and knees, hips over your knees',
      'Walk your hands forward and let your chest melt toward the floor',
      'Keep your hips high, rest your forehead down and hold',
    ],
    photo: require('@/assets/images/exercises/puppy-pose.png'),
  },
  {
    id: 'floor-angels',
    name: 'Floor angels',
    stimulus: 'Upper back, shoulder blades, chest and shoulders',
    instructions: [
      'Lie on your back with knees bent and arms in a goalpost shape on the floor',
      'Slowly slide your arms up overhead, keeping the backs of your hands and elbows on the floor',
      'Slide them back down and keep repeating',
    ],
    photo: require('@/assets/images/exercises/floor-angels.png'),
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'open-book',
    name: 'Open book',
    stimulus: 'Thoracic rotation, chest and shoulders',
    instructions: [
      'Lie on your side with knees bent to 90° and arms straight out in front, palms together',
      'Keep your knees down and sweep your top arm over to the other side, following it with your eyes',
      'Bring it back and keep repeating, then switch sides',
    ],
    photo: require('@/assets/images/exercises/open-book.png'),
    twoSided: true,
    active: true,
  },
  {
    id: 'cat-cow',
    name: 'Cat cow',
    stimulus: 'Spine, upper back and abs',
    instructions: [
      'Start on your hands and knees',
      'Round your back up toward the ceiling, tucking your chin',
      'Let your belly drop and lift your chest and gaze, and keep flowing between the two',
    ],
    photo: require('@/assets/images/exercises/cat-cow.png'),
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'frog-stretch',
    name: 'Frog stretch',
    stimulus: 'Inner thighs, groin and hip rotation',
    instructions: [
      'On hands and knees, slide your knees out wide with your shins parallel and feet turned out',
      'Lower onto your forearms and let your hips sink back toward your heels',
      'Keep your hips in line with your knees and hold',
    ],
    photo: require('@/assets/images/exercises/frog-stretch.png'),
  },
  {
    id: 'lizard-pose',
    name: 'Lizard pose',
    stimulus: 'Hip flexors, groin, inner thigh and hamstrings',
    instructions: [
      'From a low lunge, step your front foot out to the side of your hands and drop your back knee',
      'Lower onto your forearms if you can, keeping your front knee pointing out',
      'Let your hips sink and hold, then switch sides',
    ],
    photo: require('@/assets/images/exercises/lizard-pose.png'),
    twoSided: true,
  },
  {
    id: 'windshield-wipers',
    name: 'Windshield wipers',
    stimulus: 'Hip rotation, glutes and lower back',
    instructions: [
      'Sit with your knees bent, feet wider than your hips, and lean back on your hands',
      'Drop both knees to one side, letting the back knee turn in toward the floor',
      'Bring them back up and over to the other side, and keep alternating',
    ],
    photo: require('@/assets/images/exercises/windshield-wipers.png'),
    active: true,
    oneMinuteOnly: true,
  },
  {
    id: 'seated-straddle-side-bend',
    name: 'Seated straddle side bend',
    stimulus: 'Lats, obliques, inner thighs and hamstrings',
    instructions: [
      'Sit with your legs straight and spread as wide as is comfortable',
      'Turn your chest forward and lean sideways over one leg, reaching the opposite arm overhead',
      'Hold, then switch sides',
    ],
    photo: require('@/assets/images/exercises/seated-straddle-side-bend.png'),
    twoSided: true,
  },
  {
    id: 'neck-side-stretch',
    name: 'Neck side stretch',
    stimulus: 'Side of the neck and upper traps',
    instructions: [
      'Sit or stand tall with your shoulders relaxed',
      'Tilt one ear toward your shoulder and rest that hand gently on your head',
      'Reach the other hand toward the floor and hold, then switch sides',
    ],
    photo: require('@/assets/images/exercises/neck-side-stretch.png'),
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
