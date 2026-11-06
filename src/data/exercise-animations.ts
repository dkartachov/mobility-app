import {
  BONES,
  solveJoint,
  type Bend,
  type Extremity,
  type FigureClip,
  type HandClip,
  type HandPose,
  type Keyframe,
  type Point,
  type Pose,
} from '@/lib/figure-rig';

/** A flat foot's ankle height and a wrist's height with the palm on the floor. */
const ANKLE_Y = 456;
const WRIST_Y = 448;

// --- Cat cow: hands and knees, the spine flowing between rounded and arched ---

const CAT_COW_BASE = {
  hip: [395, 356],
  nearHand: [510, 451, 0],
  farHand: [518, 451, 0],
  // Knees on the floor under the hips, shins and the tops of the feet flat behind.
  nearFoot: [295, 452, 180],
  farFoot: [303, 452, 180],
  torso: 25,
} satisfies Partial<Pose>;

const CAT: Pose = { ...CAT_COW_BASE, arch: 26, neck: -45 };
const COW: Pose = { ...CAT_COW_BASE, arch: -20, neck: 42 };

export const CAT_COW: FigureClip = {
  view: 'side',
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: COW },
    { ms: 1600, pose: CAT },
    { ms: 700, pose: CAT },
    { ms: 1600, pose: COW },
    { ms: 700, pose: COW },
  ],
};

// --- Squat to stand: feet stay planted, hands hold the toes from the fold down into the squat ---

const STS_NEAR_FOOT: Extremity = [460, ANKLE_Y, 0];
const STS_FAR_FOOT: Extremity = [470, ANKLE_Y, 0];

const STS_STAND: Pose = {
  hip: [462, 259],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [468, 282, -85],
  farHand: [478, 282, -85],
  nearFoot: STS_NEAR_FOOT,
  farFoot: STS_FAR_FOOT,
};

const STS_FOLD: Pose = {
  hip: [418, 277],
  torso: -18,
  arch: 20,
  neck: -65,
  nearHand: [497, 442, -35],
  farHand: [507, 442, -35],
  nearFoot: STS_NEAR_FOOT,
  farFoot: STS_FAR_FOOT,
};

const STS_SQUAT: Pose = {
  hip: [402, 404],
  torso: 58,
  arch: 8,
  neck: 72,
  nearHand: [497, 442, -35],
  farHand: [507, 442, -35],
  nearFoot: STS_NEAR_FOOT,
  farFoot: STS_FAR_FOOT,
};

export const SQUAT_TO_STAND: FigureClip = {
  view: 'side',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: STS_STAND },
    { ms: 1500, pose: STS_FOLD },
    { ms: 1400, pose: STS_SQUAT },
    { ms: 500, pose: STS_SQUAT },
    { ms: 1400, pose: STS_FOLD },
    { ms: 400, pose: STS_FOLD },
    { ms: 1400, pose: STS_SQUAT },
    { ms: 500, pose: STS_SQUAT },
    { ms: 1400, pose: STS_FOLD },
    { ms: 1500, pose: STS_STAND },
    { ms: 500, pose: STS_STAND },
  ],
};

// --- Inchworm: travels forward, so it fades out where it ends and back in where it started ---

const IW_START_X = 300;
const IW_END_X = 575;

const standingAt = (x: number): Pose => ({
  hip: [x + 2, 259],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [x + 8, 282, -85],
  farHand: [x + 18, 282, -85],
  nearFoot: [x, ANKLE_Y, 0],
  farFoot: [x + 10, ANKLE_Y, 0],
});

const IW_FOLD: Pose = {
  hip: [258, 277],
  torso: -35,
  arch: 18,
  neck: -60,
  nearHand: [375, WRIST_Y, 0],
  farHand: [385, WRIST_Y, 0],
  nearFoot: [IW_START_X, ANKLE_Y, 0],
  farFoot: [IW_START_X + 10, ANKLE_Y, 0],
};

// The hands walk out one at a time. The hips stay far enough from the feet to keep the legs long,
// and the heels peel up around the toes until the plank is on the balls of the feet.
const IW_OUT_1: Pose = {
  hip: [318, 270],
  torso: -30,
  arch: 15,
  neck: -50,
  nearHand: [450, WRIST_Y, 0],
  farHand: [385, WRIST_Y, 0],
  nearFoot: [303, 455, -6],
  farFoot: [313, 455, -6],
};

const IW_OUT_2: Pose = {
  hip: [377, 264],
  torso: -25,
  arch: 12,
  neck: -40,
  nearHand: [450, WRIST_Y, 0],
  farHand: [475, WRIST_Y, 0],
  nearFoot: [306, 444, -25],
  farFoot: [316, 444, -25],
};

const IW_OUT_3: Pose = {
  hip: [420, 272],
  torso: -20,
  arch: 9,
  neck: -30,
  nearHand: [530, WRIST_Y, 0],
  farHand: [475, WRIST_Y, 0],
  nearFoot: [316, 432, -48],
  farFoot: [326, 432, -48],
};

const IW_OUT_4: Pose = {
  hip: [464, 285],
  torso: -15,
  arch: 6,
  neck: -20,
  nearHand: [530, WRIST_Y, 0],
  farHand: [562, WRIST_Y, 0],
  nearFoot: [324, 424, -65],
  farFoot: [334, 424, -65],
};

const IW_OUT_5: Pose = {
  hip: [490, 320],
  torso: 5,
  arch: 2,
  neck: 0,
  nearHand: [620, WRIST_Y, 0],
  farHand: [562, WRIST_Y, 0],
  nearFoot: [328, 421, -70],
  farFoot: [338, 421, -70],
};

const IW_PLANK: Pose = {
  hip: [508, 349],
  torso: 23,
  arch: 0,
  neck: 15,
  nearHand: [620, WRIST_Y, 0],
  farHand: [630, WRIST_Y, 0],
  nearFoot: [328, 421, -70],
  farFoot: [338, 421, -70],
};

// Then the hands stay planted and the feet walk up to them, the hips rising to make room.
const IW_IN_1: Pose = {
  hip: [495, 315],
  torso: 0,
  arch: 4,
  neck: -10,
  nearHand: [620, WRIST_Y, 0],
  farHand: [630, WRIST_Y, 0],
  nearFoot: [400, 436, -40],
  farFoot: [338, 421, -70],
};

const IW_IN_2: Pose = {
  hip: [520, 280],
  torso: -20,
  arch: 9,
  neck: -30,
  nearHand: [620, WRIST_Y, 0],
  farHand: [630, WRIST_Y, 0],
  nearFoot: [400, 436, -40],
  farFoot: [428, 436, -40],
};

const IW_IN_3: Pose = {
  hip: [530, 272],
  torso: -25,
  arch: 12,
  neck: -40,
  nearHand: [620, WRIST_Y, 0],
  farHand: [630, WRIST_Y, 0],
  nearFoot: [490, 445, -25],
  farFoot: [428, 436, -40],
};

const IW_IN_4: Pose = {
  hip: [535, 272],
  torso: -27,
  arch: 14,
  neck: -45,
  nearHand: [620, WRIST_Y, 0],
  farHand: [630, WRIST_Y, 0],
  nearFoot: [490, 445, -25],
  farFoot: [525, 450, -15],
};

const IW_IN_5: Pose = {
  hip: [535, 272],
  torso: -27,
  arch: 16,
  neck: -50,
  nearHand: [620, WRIST_Y, 0],
  farHand: [630, WRIST_Y, 0],
  nearFoot: [575, 456, 0],
  farFoot: [525, 450, -15],
};

const IW_FOLD_END: Pose = {
  hip: [533, 277],
  torso: -25,
  arch: 18,
  neck: -60,
  nearHand: [620, WRIST_Y, 0],
  farHand: [630, WRIST_Y, 0],
  nearFoot: [575, 456, 0],
  farFoot: [585, 456, 0],
};

export const INCHWORM: FigureClip = {
  view: 'side',
  stillFrame: 8,
  fadeMs: 350,
  keyframes: [
    { ms: 0, pose: standingAt(IW_START_X) },
    { ms: 700, pose: standingAt(IW_START_X) },
    { ms: 1300, pose: IW_FOLD },
    { ms: 550, pose: IW_OUT_1, step: true },
    { ms: 550, pose: IW_OUT_2, step: true },
    { ms: 550, pose: IW_OUT_3, step: true },
    { ms: 550, pose: IW_OUT_4, step: true },
    { ms: 550, pose: IW_OUT_5, step: true },
    { ms: 550, pose: IW_PLANK, step: true },
    { ms: 600, pose: IW_PLANK },
    { ms: 550, pose: IW_IN_1, step: true },
    { ms: 550, pose: IW_IN_2, step: true },
    { ms: 550, pose: IW_IN_3, step: true },
    { ms: 550, pose: IW_IN_4, step: true },
    { ms: 550, pose: IW_IN_5, step: true },
    { ms: 550, pose: IW_FOLD_END, step: true },
    { ms: 1300, pose: standingAt(IW_END_X) },
    { ms: 700, pose: standingAt(IW_END_X) },
  ],
};

// --- Pigeon stretch: a hold, so it moves into the pose, stays there, and comes back out ---

const PIGEON_QUAD: Pose = {
  hip: [395, 356],
  torso: 25,
  arch: 0,
  neck: 15,
  nearHand: [510, 451, 0],
  farHand: [518, 451, 0],
  nearFoot: [295, 452, 180],
  farFoot: [303, 452, 180],
};

/** The front knee has come through toward the wrist, its shin angled across under the hips. */
const PIGEON_KNEE_THROUGH: Pose = {
  ...PIGEON_QUAD,
  hip: [420, 358],
  torso: 25,
  nearFoot: [425, 452, 200],
};

/** The back knee slides along the floor as the hips sink, so it never dips through it. */
const PIGEON_SLIDING_BACK: Pose = {
  hip: [418, 385],
  torso: 40,
  arch: 0,
  neck: 40,
  nearHand: [505, 451, 0],
  farHand: [513, 451, 0],
  nearFoot: [428, 452, 200],
  farFoot: [248, 452, 180],
};

const PIGEON_LEG_BACK: Pose = {
  hip: [410, 408],
  torso: 58,
  arch: 0,
  neck: 62,
  nearHand: [490, WRIST_Y, 0],
  farHand: [498, WRIST_Y, 0],
  nearFoot: [430, 452, 200],
  farFoot: [218, 452, 180],
};

const PIGEON_FOLDED: Pose = {
  hip: [410, 408],
  torso: 8,
  arch: 8,
  neck: -8,
  nearHand: [640, 452, 0],
  farHand: [650, 452, 0],
  nearFoot: [430, 452, 200],
  farFoot: [218, 452, 180],
};

export const PIGEON_STRETCH: FigureClip = {
  view: 'side',
  stillFrame: 5,
  keyframes: [
    { ms: 0, pose: PIGEON_QUAD },
    { ms: 1400, pose: PIGEON_KNEE_THROUGH, step: true },
    { ms: 700, pose: PIGEON_SLIDING_BACK },
    { ms: 700, pose: PIGEON_LEG_BACK },
    { ms: 700, pose: PIGEON_LEG_BACK },
    { ms: 1500, pose: PIGEON_FOLDED },
    { ms: 3500, pose: PIGEON_FOLDED },
    { ms: 1500, pose: PIGEON_LEG_BACK },
    { ms: 700, pose: PIGEON_SLIDING_BACK },
    { ms: 700, pose: PIGEON_KNEE_THROUGH },
    { ms: 1400, pose: PIGEON_QUAD, step: true },
    { ms: 500, pose: PIGEON_QUAD },
  ],
};

// --- Open book: seen from above, since the whole movement is a rotation about the spine ---

const OPEN_BOOK_BASE = {
  hip: [390, 270],
  torso: 0,
  arch: 0,
  // The floor arm stays reaching out in front; both knees stay stacked at 90°.
  farHand: [515, 418, -90],
  nearFoot: [290, 370, 180],
  farFoot: [290, 370, 180],
} satisfies Partial<Pose>;

const BOOK_CLOSED: Pose = { ...OPEN_BOOK_BASE, neck: 0, nearHand: [515, 418, -90] };
const BOOK_OPEN: Pose = { ...OPEN_BOOK_BASE, neck: 22, nearHand: [515, 122, 90] };

export const OPEN_BOOK: FigureClip = {
  view: 'above',
  straightArms: true,
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: BOOK_CLOSED },
    { ms: 500, pose: BOOK_CLOSED },
    { ms: 2200, pose: BOOK_OPEN },
    { ms: 900, pose: BOOK_OPEN },
    { ms: 2200, pose: BOOK_CLOSED },
  ],
};

// --- Shared starting points for the clips below ---

/** A straight arm's hand, at an angle around its shoulder, with y down as the scene has it. */
const armAt = (shoulder: Point, degrees: number, x = 0): Extremity => {
  const radians = (degrees * Math.PI) / 180;
  return [shoulder[0] + x + 148 * Math.cos(radians), shoulder[1] + 148 * Math.sin(radians), 0];
};

/** Hands and knees: knees under the hips, wrists under the shoulders. */
const ALL_FOURS: Pose = {
  hip: [395, 356],
  torso: 25,
  arch: 0,
  neck: 15,
  nearHand: [510, 451, 0],
  farHand: [518, 451, 0],
  nearFoot: [295, 452, 180],
  farFoot: [303, 452, 180],
};

/** Downward facing dog, hips high and heels down, set up to roll forward over the toes. */
const DOG: Pose = {
  hip: [407, 290],
  torso: -37,
  arch: 0,
  neck: -65,
  nearHand: [620, WRIST_Y, 0],
  farHand: [628, WRIST_Y, 0],
  nearFoot: [300, ANKLE_Y, 0],
  farFoot: [308, ANKLE_Y, 0],
};

const STANDING_TALL: Pose = {
  hip: [482, 259],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [488, 282, -85],
  farHand: [496, 282, -85],
  nearFoot: [480, ANKLE_Y, 0],
  farFoot: [488, ANKLE_Y, 0],
};
const STANDING_SHOULDER: Point = [482, 134];

/** Lying flat from above, head to the right, with the width of the shoulders facing the camera. */
const FACE_DOWN: Pose = {
  hip: [390, 270],
  torso: 0,
  arch: 0,
  neck: 0,
  nearHand: [515, 100, 90],
  farHand: [515, 440, -90],
  nearFoot: [191, 256, 180],
  farFoot: [191, 284, 180],
};

// --- Active pancake: seen from the front, so the wide legs show. The torso folds toward the camera ---

const PANCAKE_UP: Pose = {
  hip: [480, 425],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [440, 430, -90],
  farHand: [520, 430, -90],
  nearFoot: [270, 452, 110],
  farFoot: [690, 452, 70],
};
const PANCAKE_FOLDED: Pose = {
  ...PANCAKE_UP,
  torsoLength: 55,
  neckLength: 8,
  nearHand: [440, 495, -90],
  farHand: [520, 495, -90],
};

export const ACTIVE_PANCAKE: FigureClip = {
  view: 'above',
  widths: { shoulder: 30, hip: 14 },
  legBends: [-1, 1],
  armBends: [-1, 1],
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: PANCAKE_UP },
    { ms: 1600, pose: PANCAKE_FOLDED },
    { ms: 400, pose: PANCAKE_FOLDED },
    { ms: 1600, pose: PANCAKE_UP },
    { ms: 300, pose: PANCAKE_UP },
  ],
};

// --- Blackburn: from above, both straight arms sweep from the sides to overhead ---

const BLACKBURN_DOWN: Pose = { ...FACE_DOWN, nearHand: [367, 224, 0], farHand: [367, 316, 0] };
const BLACKBURN_UP: Pose = { ...FACE_DOWN, nearHand: [663, 238, 0], farHand: [663, 302, 0] };

export const BLACKBURN: FigureClip = {
  view: 'above',
  straightArms: true,
  widths: { shoulder: 20, hip: 14 },
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: BLACKBURN_DOWN },
    { ms: 2400, pose: BLACKBURN_UP, swing: true },
    { ms: 400, pose: BLACKBURN_UP },
    { ms: 2400, pose: BLACKBURN_DOWN, swing: true },
    { ms: 400, pose: BLACKBURN_DOWN },
  ],
};

// --- Downward dog to cobra: hands stay put, the body rolls through a plank, over the toes ---

const DOG_PLANK: Pose = {
  hip: [508, 349],
  torso: 23,
  arch: 0,
  neck: 15,
  nearHand: [620, WRIST_Y, 0],
  farHand: [628, WRIST_Y, 0],
  nearFoot: [328, 416, -70],
  farFoot: [336, 416, -70],
};
const COBRA: Pose = {
  hip: [579, 420],
  torso: 62,
  arch: -14,
  neck: 65,
  nearHand: [620, WRIST_Y, 0],
  farHand: [628, WRIST_Y, 0],
  nearFoot: [384, 452, -180],
  farFoot: [392, 452, -180],
};

export const DOWNWARD_FACING_DOG_TO_COBRA: FigureClip = {
  view: 'side',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: DOG },
    { ms: 1000, pose: DOG_PLANK, ease: 'in' },
    { ms: 1000, pose: COBRA, ease: 'out' },
    { ms: 500, pose: COBRA },
    { ms: 1000, pose: DOG_PLANK, ease: 'in' },
    { ms: 1000, pose: DOG, ease: 'out' },
    { ms: 400, pose: DOG },
  ],
};

// --- Bottom squat rotation: from the front, knees out, the arms trading floor for ceiling ---

const SQUAT_ROTATE_BASE = {
  hip: [480, 392],
  arch: 0,
  torsoLength: 100,
  nearFoot: [385, ANKLE_Y, 180],
  farFoot: [575, ANKLE_Y, 0],
} satisfies Partial<Pose>;

const SQUAT_ROTATE_NEAR_DOWN: Pose = {
  ...SQUAT_ROTATE_BASE,
  torso: 98,
  neck: 80,
  nearHand: [440, 440, 0],
  farHand: [510, 145, 0],
};
const SQUAT_ROTATE_FAR_DOWN: Pose = {
  ...SQUAT_ROTATE_BASE,
  torso: 82,
  neck: 100,
  nearHand: [450, 145, 0],
  farHand: [520, 440, 0],
};

export const BOTTOM_SQUAT_ROTATION: FigureClip = {
  view: 'side',
  straightArms: true,
  widths: { shoulder: 28, hip: 16 },
  legBends: [-1, 1],
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: SQUAT_ROTATE_NEAR_DOWN },
    { ms: 500, pose: SQUAT_ROTATE_NEAR_DOWN },
    { ms: 1800, pose: SQUAT_ROTATE_FAR_DOWN, swing: true },
    { ms: 500, pose: SQUAT_ROTATE_FAR_DOWN },
    { ms: 1800, pose: SQUAT_ROTATE_NEAR_DOWN, swing: true },
  ],
};

// --- Knight to hamstring: the back knee stays down as the hips shift back and the front leg straightens ---

const KNIGHT: Pose = {
  hip: [435, 367],
  torso: 82,
  arch: 0,
  neck: 85,
  nearHand: [510, 345, -30],
  farHand: [518, 345, -30],
  nearFoot: [530, ANKLE_Y, 0],
  farFoot: [290, 452, 180],
};
const KNIGHT_HAMSTRING: Pose = {
  hip: [365, 359],
  torso: 20,
  arch: 0,
  neck: 5,
  nearHand: [510, WRIST_Y, 0],
  farHand: [518, WRIST_Y, 0],
  nearFoot: [530, 448, 70],
  farFoot: [290, 452, 180],
};

export const KNIGHT_TO_HAMSTRING: FigureClip = {
  view: 'side',
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: KNIGHT },
    { ms: 1600, pose: KNIGHT_HAMSTRING },
    { ms: 600, pose: KNIGHT_HAMSTRING },
    { ms: 1600, pose: KNIGHT },
    { ms: 500, pose: KNIGHT },
  ],
};

// --- Three-legged dog: the dog holds while one straight leg at a time lifts behind ---

const DOG_NEAR_UP: Pose = { ...DOG, nearFoot: [235, 190, 130] };
const DOG_FAR_UP: Pose = { ...DOG, farFoot: [235, 190, 130] };

export const THREE_LEGGED_DOWNWARD_FACING_DOG: FigureClip = {
  view: 'side',
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: DOG },
    { ms: 1200, pose: DOG_NEAR_UP, swing: true },
    { ms: 400, pose: DOG_NEAR_UP },
    { ms: 1200, pose: DOG, swing: true },
    { ms: 1200, pose: DOG_FAR_UP, swing: true },
    { ms: 400, pose: DOG_FAR_UP },
    { ms: 1200, pose: DOG, swing: true },
    { ms: 200, pose: DOG },
  ],
};

// --- Cobra to prayer: the hips travel back through hands and knees to the heels ---

const PRAYER_COBRA: Pose = {
  hip: [537, 420],
  torso: 62,
  arch: -14,
  neck: 65,
  nearHand: [582, WRIST_Y, 0],
  farHand: [590, WRIST_Y, 0],
  nearFoot: [340, 452, 180],
  farFoot: [348, 452, 180],
};
const PRAYER_THROUGH: Pose = {
  hip: [460, 336],
  torso: 15,
  arch: 0,
  neck: 15,
  nearHand: [582, WRIST_Y, 0],
  farHand: [590, WRIST_Y, 0],
  nearFoot: [340, 452, 180],
  farFoot: [348, 452, 180],
};
const PRAYER: Pose = {
  hip: [370, 384],
  torso: -10,
  arch: 10,
  neck: -30,
  nearHand: [625, WRIST_Y, 0],
  farHand: [633, WRIST_Y, 0],
  nearFoot: [340, 452, 180],
  farFoot: [348, 452, 180],
};

export const COBRA_TO_PRAYER: FigureClip = {
  view: 'side',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: PRAYER_COBRA },
    { ms: 900, pose: PRAYER_THROUGH, ease: 'in' },
    { ms: 900, pose: PRAYER, ease: 'out' },
    { ms: 600, pose: PRAYER },
    { ms: 900, pose: PRAYER_THROUGH, ease: 'in' },
    { ms: 900, pose: PRAYER_COBRA, ease: 'out' },
    { ms: 500, pose: PRAYER_COBRA },
  ],
};

// --- Scap mobilization: arms stay locked straight while the chest sinks between the shoulder blades ---

const SCAP_HIGH: Pose = { ...ALL_FOURS, torso: 27, arch: 6, nearHand: [510, 440, 0], farHand: [518, 440, 0] };
const SCAP_LOW: Pose = { ...ALL_FOURS, torso: 17, arch: -10, nearHand: [510, 440, 0], farHand: [518, 440, 0] };

export const SCAP_MOBILIZATION: FigureClip = {
  view: 'side',
  straightArms: true,
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: SCAP_HIGH },
    { ms: 1300, pose: SCAP_LOW },
    { ms: 300, pose: SCAP_LOW },
    { ms: 1300, pose: SCAP_HIGH },
    { ms: 300, pose: SCAP_HIGH },
  ],
};

// --- Ankle mobilization: the back knee pivots on the floor as the front knee drives over the toes ---

const ANKLE_BACK: Pose = {
  hip: [405, 359],
  torso: 88,
  arch: 0,
  neck: 88,
  nearHand: [490, 330, -20],
  farHand: [498, 330, -20],
  nearFoot: [530, ANKLE_Y, 0],
  farFoot: [280, 452, 180],
};
const ANKLE_FORWARD: Pose = {
  ...ANKLE_BACK,
  hip: [445, 380],
  nearHand: [530, 345, -20],
  farHand: [538, 345, -20],
};

export const ANKLE_MOBILIZATION: FigureClip = {
  view: 'side',
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: ANKLE_BACK },
    { ms: 1200, pose: ANKLE_FORWARD },
    { ms: 300, pose: ANKLE_FORWARD },
    { ms: 1200, pose: ANKLE_BACK },
    { ms: 300, pose: ANKLE_BACK },
  ],
};

// --- Wrist rocks: hands and knees stay planted as the shoulders rock past the hands and back ---

const WRIST_FORWARD: Pose = { ...ALL_FOURS, hip: [432, 363], torso: 20, neck: 20 };
const WRIST_BACK: Pose = { ...ALL_FOURS, hip: [358, 363], torso: 24, neck: 25 };

export const WRIST_ROCKS: FigureClip = {
  view: 'side',
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: WRIST_FORWARD },
    { ms: 1500, pose: WRIST_BACK },
    { ms: 300, pose: WRIST_BACK },
    { ms: 1500, pose: WRIST_FORWARD },
    { ms: 300, pose: WRIST_FORWARD },
  ],
};

// --- Finger tendon glides: straight, hook fist, full fist, flat fist with straight fingers ---

const FINGER_STRAIGHT: HandPose = [0, 0, 0];
const FINGER_HOOK: HandPose = [0, 95, 85];
const FINGER_FULL_FIST: HandPose = [85, 95, 70];
const FINGER_FLAT_FIST: HandPose = [90, 0, 0];

export const FINGER_TENDON_GLIDES: HandClip = {
  view: 'hand',
  stillFrame: 3,
  keyframes: [
    { ms: 0, joints: FINGER_STRAIGHT },
    { ms: 1100, joints: FINGER_HOOK },
    { ms: 500, joints: FINGER_HOOK },
    { ms: 1100, joints: FINGER_FULL_FIST },
    { ms: 500, joints: FINGER_FULL_FIST },
    { ms: 1100, joints: FINGER_FLAT_FIST },
    { ms: 500, joints: FINGER_FLAT_FIST },
    { ms: 1100, joints: FINGER_STRAIGHT },
    { ms: 500, joints: FINGER_STRAIGHT },
  ],
};

// --- Floor angels: from above, arms slide from a goalpost shape to overhead ---

const ANGEL_BASE = {
  hip: [390, 270],
  torso: 0,
  arch: 0,
  neck: 0,
  nearFoot: [285, 256, 180],
  farFoot: [285, 284, 180],
  // Knees bent and pointing at the ceiling, so the legs look short from above.
  knees: [
    [315, 240],
    [315, 300],
  ],
} satisfies Partial<Pose>;

const ANGEL_GOALPOST: Pose = { ...ANGEL_BASE, nearHand: [590, 175, 0], farHand: [590, 365, 0] };
const ANGEL_OVERHEAD: Pose = { ...ANGEL_BASE, nearHand: [663, 230, 0], farHand: [663, 310, 0] };

export const FLOOR_ANGELS: FigureClip = {
  view: 'above',
  widths: { shoulder: 20, hip: 14 },
  armBends: [1, -1],
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: ANGEL_GOALPOST },
    { ms: 2000, pose: ANGEL_OVERHEAD },
    { ms: 300, pose: ANGEL_OVERHEAD },
    { ms: 2000, pose: ANGEL_GOALPOST },
    { ms: 300, pose: ANGEL_GOALPOST },
  ],
};

// --- 90 to 90 rotations: from the front, feet planted wide, both knees tip side to side ---

const ROTATIONS_BASE = {
  hip: [480, 400],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [400, 400, -90],
  farHand: [560, 400, -90],
  nearFoot: [370, 470, 180],
  farFoot: [590, 470, 0],
} satisfies Partial<Pose>;

const ROTATIONS_RIGHT: Pose = {
  ...ROTATIONS_BASE,
  knees: [
    [500, 400],
    [620, 430],
  ],
};
const ROTATIONS_UP: Pose = {
  ...ROTATIONS_BASE,
  knees: [
    [410, 320],
    [550, 320],
  ],
};
const ROTATIONS_LEFT: Pose = {
  ...ROTATIONS_BASE,
  knees: [
    [340, 430],
    [460, 400],
  ],
};

export const NINETY_TO_NINETY_ROTATIONS: FigureClip = {
  view: 'above',
  widths: { shoulder: 28, hip: 16 },
  armBends: [-1, 1],
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: ROTATIONS_RIGHT },
    { ms: 1000, pose: ROTATIONS_UP, ease: 'in' },
    { ms: 1000, pose: ROTATIONS_LEFT, ease: 'out' },
    { ms: 300, pose: ROTATIONS_LEFT },
    { ms: 1000, pose: ROTATIONS_UP, ease: 'in' },
    { ms: 1000, pose: ROTATIONS_RIGHT, ease: 'out' },
    { ms: 300, pose: ROTATIONS_RIGHT },
  ],
};

// --- Shoulder circles: a straight arm drawing a full circle, each way, with the body still ---

const circleAt = (degrees: number): Pose => ({ ...STANDING_TALL, nearHand: armAt(STANDING_SHOULDER, degrees) });
const CIRCLE_DOWN = circleAt(90);

export const SHOULDER_CIRCLES: FigureClip = {
  view: 'side',
  straightArms: true,
  zoom: 0.8,
  stillFrame: 3,
  keyframes: [
    { ms: 0, pose: CIRCLE_DOWN },
    { ms: 1800, pose: circleAt(0), swing: true, ease: 'in' },
    { ms: 900, pose: circleAt(-90), swing: true, ease: 'none' },
    { ms: 900, pose: circleAt(180), swing: true, ease: 'none' },
    { ms: 1800, pose: CIRCLE_DOWN, swing: true, ease: 'out' },
    { ms: 300, pose: CIRCLE_DOWN },
    { ms: 1800, pose: circleAt(180), swing: true, ease: 'in' },
    { ms: 900, pose: circleAt(-90), swing: true, ease: 'none' },
    { ms: 900, pose: circleAt(0), swing: true, ease: 'none' },
    { ms: 1800, pose: CIRCLE_DOWN, swing: true, ease: 'out' },
    { ms: 300, pose: CIRCLE_DOWN },
  ],
};

// --- Shoulder pass-throughs: from the side, where both straight arms' whole arc over the head shows ---

const passAt = (degrees: number): Pose => ({
  ...STANDING_TALL,
  nearHand: armAt(STANDING_SHOULDER, degrees),
  farHand: armAt(STANDING_SHOULDER, degrees, 8),
});
const PASS_FRONT = passAt(70);
const PASS_BEHIND = passAt(110);

export const SHOULDER_PASS_THROUGHS: FigureClip = {
  view: 'side',
  straightArms: true,
  zoom: 0.8,
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: PASS_FRONT },
    { ms: 1400, pose: passAt(0), swing: true, ease: 'in' },
    { ms: 800, pose: passAt(-90), swing: true, ease: 'none' },
    { ms: 800, pose: passAt(180), swing: true, ease: 'none' },
    { ms: 1200, pose: PASS_BEHIND, swing: true, ease: 'out' },
    { ms: 300, pose: PASS_BEHIND },
    { ms: 1200, pose: passAt(180), swing: true, ease: 'in' },
    { ms: 800, pose: passAt(-90), swing: true, ease: 'none' },
    { ms: 800, pose: passAt(0), swing: true, ease: 'none' },
    { ms: 1400, pose: PASS_FRONT, swing: true, ease: 'out' },
    { ms: 300, pose: PASS_FRONT },
  ],
};

// --- Hip circles: on all fours with the torso still, the lifted knee draws a circle, each way ---

const HIP_CIRCLE_STEPS = 12;

const hipCircleAt = (step: number): Pose => {
  const radians = (2 * Math.PI * (step / HIP_CIRCLE_STEPS)) - Math.PI / 2;
  const kneeX = 390 + 85 * Math.cos(radians);
  const kneeY = 385 - 45 * Math.sin(radians);
  return {
    ...ALL_FOURS,
    nearFoot: [kneeX - 70, kneeY + 25, 200],
    knees: [
      [kneeX, kneeY],
      [395, 456],
    ],
  };
};
const HIP_CIRCLE_START = hipCircleAt(0);

/** One full circle, in the given direction, from and back to where it starts. */
const hipCircle = (direction: 1 | -1): FigureClip['keyframes'] =>
  Array.from({ length: HIP_CIRCLE_STEPS }, (_, i) => {
    const last = i === HIP_CIRCLE_STEPS - 1;
    return {
      ms: i === 0 || last ? 600 : 300,
      pose: last ? HIP_CIRCLE_START : hipCircleAt(direction * (i + 1)),
      ease: i === 0 ? ('in' as const) : last ? ('out' as const) : ('none' as const),
    };
  });

export const HIP_CIRCLES: FigureClip = {
  view: 'side',
  stillFrame: 3,
  keyframes: [{ ms: 0, pose: HIP_CIRCLE_START }, ...hipCircle(1), ...hipCircle(-1)],
};

// --- Cossack squat: from the front, sinking over one bent leg while the other goes straight, toes up ---

const COSSACK_NEAR: Pose = {
  hip: [402, 405],
  torso: 92,
  arch: 0,
  neck: 90,
  nearHand: [388, 335, 0],
  farHand: [416, 335, 180],
  nearFoot: [348, ANKLE_Y, 180],
  farFoot: [612, 446, 90],
};
const COSSACK_MIDDLE: Pose = {
  hip: [480, 372],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [466, 300, 0],
  farHand: [494, 300, 180],
  nearFoot: [348, ANKLE_Y, 180],
  farFoot: [612, ANKLE_Y, 0],
};
const COSSACK_FAR: Pose = {
  hip: [558, 405],
  torso: 88,
  arch: 0,
  neck: 90,
  nearHand: [544, 335, 0],
  farHand: [572, 335, 180],
  nearFoot: [348, 446, 90],
  farFoot: [612, ANKLE_Y, 0],
};

export const COSSACK_SQUAT: FigureClip = {
  view: 'side',
  widths: { shoulder: 28, hip: 18 },
  legBends: [-1, 1],
  armBends: [1, -1],
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: COSSACK_NEAR },
    { ms: 1100, pose: COSSACK_MIDDLE, ease: 'in' },
    { ms: 1100, pose: COSSACK_FAR, ease: 'out' },
    { ms: 400, pose: COSSACK_FAR },
    { ms: 1100, pose: COSSACK_MIDDLE, ease: 'in' },
    { ms: 1100, pose: COSSACK_NEAR, ease: 'out' },
    { ms: 400, pose: COSSACK_NEAR },
  ],
};

// --- World's greatest stretch: long lunge, reach for the ceiling, back down, straighten the front leg ---

const WGS_LUNGE: Pose = {
  hip: [440, 390],
  torso: 32,
  arch: 0,
  neck: 15,
  nearHand: [540, WRIST_Y, 0],
  farHand: [548, WRIST_Y, 0],
  nearFoot: [560, ANKLE_Y, 0],
  farFoot: [250, 421, -70],
};
const WGS_REACH: Pose = { ...WGS_LUNGE, torso: 35, neck: 70, nearHand: [550, 172, 90] };
const WGS_STRAIGHT: Pose = { ...WGS_LUNGE, hip: [400, 350], torso: 10, neck: -10, nearFoot: [560, 450, 30] };

export const WORLDS_GREATEST_STRETCH: FigureClip = {
  view: 'side',
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: WGS_LUNGE },
    { ms: 1200, pose: WGS_REACH, swing: true },
    { ms: 500, pose: WGS_REACH },
    { ms: 1200, pose: WGS_LUNGE, swing: true },
    { ms: 200, pose: WGS_LUNGE },
    { ms: 1000, pose: WGS_STRAIGHT },
    { ms: 300, pose: WGS_STRAIGHT },
    { ms: 1000, pose: WGS_LUNGE },
    { ms: 200, pose: WGS_LUNGE },
  ],
};

// --- Frog rocks: from above, knees wide and fixed, the hips rock back toward the heels and forward ---

const FROG_BASE = {
  torso: 0,
  arch: 0,
  neck: 0,
  nearHand: [610, 200, 0],
  farHand: [610, 340, 0],
  nearFoot: [300, 160, 90],
  farFoot: [300, 380, -90],
  knees: [
    [400, 130],
    [400, 410],
  ],
} satisfies Partial<Pose>;

const FROG_BACK: Pose = { ...FROG_BASE, hip: [355, 270] };
const FROG_FORWARD: Pose = { ...FROG_BASE, hip: [420, 270] };

export const FROG_ROCKS: FigureClip = {
  view: 'above',
  widths: { shoulder: 24, hip: 18 },
  armBends: [1, -1],
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: FROG_BACK },
    { ms: 1500, pose: FROG_FORWARD },
    { ms: 300, pose: FROG_FORWARD },
    { ms: 1500, pose: FROG_BACK },
    { ms: 300, pose: FROG_BACK },
  ],
};

// --- Active straight leg raise: lying on the back, head to the left, so the knee would bend upward ---

const LEG_RAISE_DOWN: Pose = {
  hip: [440, 446],
  torso: 180,
  arch: 0,
  neck: 172,
  nearHand: [462, 450, 0],
  farHand: [462, 450, 0],
  nearFoot: [639, 448, 90],
  farFoot: [639, 448, 90],
};
const LEG_RAISE_UP: Pose = { ...LEG_RAISE_DOWN, nearFoot: [522, 264, 155] };

export const ACTIVE_STRAIGHT_LEG_RAISE: FigureClip = {
  view: 'side',
  armBends: [1, 1],
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: LEG_RAISE_DOWN },
    { ms: 1600, pose: LEG_RAISE_UP, swing: true },
    { ms: 300, pose: LEG_RAISE_UP },
    { ms: 1600, pose: LEG_RAISE_DOWN, swing: true },
    { ms: 300, pose: LEG_RAISE_DOWN },
  ],
};

// --- Elephant walk: folded with hands on the floor, one knee bends as the other leg straightens ---

const ELEPHANT_NEAR_BENT: Pose = {
  hip: [430, 264],
  torso: -25,
  arch: 16,
  neck: -55,
  nearHand: [535, WRIST_Y, 0],
  farHand: [543, WRIST_Y, 0],
  nearFoot: [462, 426, -50],
  farFoot: [470, ANKLE_Y, 0],
};
const ELEPHANT_FAR_BENT: Pose = { ...ELEPHANT_NEAR_BENT, nearFoot: [462, ANKLE_Y, 0], farFoot: [470, 426, -50] };

export const ELEPHANT_WALK: FigureClip = {
  view: 'side',
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: ELEPHANT_NEAR_BENT },
    { ms: 1100, pose: ELEPHANT_FAR_BENT },
    { ms: 200, pose: ELEPHANT_FAR_BENT },
    { ms: 1100, pose: ELEPHANT_NEAR_BENT },
    { ms: 200, pose: ELEPHANT_NEAR_BENT },
  ],
};

// --- Leg swings: standing tall on the far leg, the near leg swings from the hip, just clearing the floor ---

const legSwing = (degrees: number): Pose => {
  const radians = (degrees * Math.PI) / 180;
  const [hipX, hipY] = STANDING_TALL.hip;
  return {
    ...STANDING_TALL,
    nearFoot: [hipX + 196 * Math.cos(radians), hipY + 196 * Math.sin(radians), 90 - degrees],
  };
};
const LEG_SWING_BACK = legSwing(125);
const LEG_SWING_PASSING = legSwing(80);
const LEG_SWING_FORWARD = legSwing(35);

// --- Horse stance: from the front, feet wide, sinking from standing into the squat and holding ---

const HORSE_UP: Pose = {
  hip: [480, 284],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [432, 296, -95],
  farHand: [528, 296, -85],
  nearFoot: [360, ANKLE_Y, 180],
  farFoot: [600, ANKLE_Y, 0],
  knees: [
    [411, 370],
    [549, 370],
  ],
};
const HORSE_DOWN: Pose = {
  ...HORSE_UP,
  hip: [480, 372],
  nearHand: [384, 352, -90],
  farHand: [576, 352, -90],
  knees: [
    [372, 358],
    [588, 358],
  ],
};

export const HORSE_STANCE: FigureClip = {
  view: 'side',
  widths: { shoulder: 28, hip: 18 },
  armBends: [-1, 1],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: HORSE_UP },
    { ms: 500, pose: HORSE_UP },
    { ms: 1800, pose: HORSE_DOWN },
    { ms: 4000, pose: HORSE_DOWN },
    { ms: 1600, pose: HORSE_UP },
  ],
};

// --- Belly down foot splay: from above, face down; the knees bend, then the shins fall out to the sides ---

const SPLAY_BASE = {
  hip: [390, 270],
  torso: 0,
  arch: 0,
  neck: 0,
  nearHand: [590, 175, 0],
  farHand: [590, 365, 0],
} satisfies Partial<Pose>;

const SPLAY_FLAT: Pose = {
  ...SPLAY_BASE,
  // The far foot's -180 is the same as 180, but turns it out the short way to -110.
  nearFoot: [191, 258, 180],
  farFoot: [191, 282, -180],
  knees: [
    [291, 259],
    [291, 281],
  ],
};
/** Shins pointing straight up at the camera, so only the feet show past the knees. */
const SPLAY_BENT: Pose = {
  ...SPLAY_BASE,
  nearFoot: [294, 258, 180],
  farFoot: [294, 282, -180],
  knees: [
    [292, 262],
    [292, 278],
  ],
};
const SPLAY_OUT: Pose = {
  ...SPLAY_BENT,
  nearFoot: [262, 196, 110],
  farFoot: [262, 344, -110],
};

export const BELLY_DOWN_FOOT_SPLAY: FigureClip = {
  view: 'above',
  widths: { shoulder: 20, hip: 14 },
  armBends: [1, -1],
  stillFrame: 3,
  keyframes: [
    { ms: 0, pose: SPLAY_FLAT },
    { ms: 1200, pose: SPLAY_BENT },
    { ms: 300, pose: SPLAY_BENT },
    { ms: 1800, pose: SPLAY_OUT },
    { ms: 3500, pose: SPLAY_OUT },
    { ms: 1500, pose: SPLAY_BENT },
    { ms: 1200, pose: SPLAY_FLAT },
    { ms: 500, pose: SPLAY_FLAT },
  ],
};

// --- Lying windshield wiper hold: from above, on the back, both knees fall to one side, then the other ---

const WIPER_BASE = {
  hip: [390, 270],
  torso: 0,
  arch: 0,
  neck: 0,
  nearHand: [505, 103, 94],
  farHand: [505, 437, -94],
  nearFoot: [262, 228, 180],
  farFoot: [262, 312, 180],
} satisfies Partial<Pose>;

/** Knees pointing at the ceiling, so the legs look short from above. */
const WIPER_UP: Pose = {
  ...WIPER_BASE,
  knees: [
    [325, 240],
    [325, 300],
  ],
};
const WIPER_DOWN_FAR: Pose = {
  ...WIPER_BASE,
  knees: [
    [310, 316],
    [342, 372],
  ],
};
const WIPER_DOWN_NEAR: Pose = {
  ...WIPER_BASE,
  knees: [
    [342, 168],
    [310, 224],
  ],
};

export const LYING_WINDSHIELD_WIPER_HOLD: FigureClip = {
  view: 'above',
  widths: { shoulder: 20, hip: 14 },
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: WIPER_UP },
    { ms: 1600, pose: WIPER_DOWN_FAR },
    { ms: 3000, pose: WIPER_DOWN_FAR },
    { ms: 1600, pose: WIPER_UP },
    { ms: 1600, pose: WIPER_DOWN_NEAR },
    { ms: 3000, pose: WIPER_DOWN_NEAR },
    { ms: 1600, pose: WIPER_UP },
    { ms: 400, pose: WIPER_UP },
  ],
};

// --- Back lying reverse pigeon: from above, knee held over the hip; the band swings the shin out to the side ---

const REVERSE_PIGEON_BASE = {
  hip: [390, 270],
  torso: 0,
  arch: 0,
  neck: 0,
  farHand: [505, 437, -94],
  farFoot: [190, 284, 180],
  // The thigh points up at the camera, leaning a little toward the chest.
  knees: [
    [458, 244],
    [290, 284],
  ],
} satisfies Partial<Pose>;

/** Shin level with the floor, pointing down along the body toward the other foot. */
const REVERSE_PIGEON_IN: Pose = { ...REVERSE_PIGEON_BASE, nearHand: [565, 185, 40], nearFoot: [366, 206, 150] };
const REVERSE_PIGEON_TURNING: Pose = { ...REVERSE_PIGEON_BASE, nearHand: [592, 160, 50], nearFoot: [395, 162, 140] };
const REVERSE_PIGEON_OUT: Pose = { ...REVERSE_PIGEON_BASE, nearHand: [610, 140, 60], nearFoot: [440, 142, 135] };

export const BACK_LYING_REVERSE_PIGEON: FigureClip = {
  view: 'above',
  widths: { shoulder: 20, hip: 14 },
  armBends: [1, -1],
  band: ['nearHand', 'nearFoot'],
  stillFrame: 3,
  keyframes: [
    { ms: 0, pose: REVERSE_PIGEON_IN },
    { ms: 500, pose: REVERSE_PIGEON_IN },
    { ms: 1000, pose: REVERSE_PIGEON_TURNING, ease: 'in' },
    { ms: 1000, pose: REVERSE_PIGEON_OUT, ease: 'out' },
    { ms: 3500, pose: REVERSE_PIGEON_OUT },
    { ms: 1000, pose: REVERSE_PIGEON_TURNING, ease: 'in' },
    { ms: 1000, pose: REVERSE_PIGEON_IN, ease: 'out' },
  ],
};

// --- Thread the needle: on all fours, one arm reaches for the ceiling, then threads under the other ---

/**
 * The hips sit back toward the heels, the knees closed past 90° but not sitting down. The planted
 * hand stays out ahead of the shoulder the whole time, leaving room under its armpit.
 */
const NEEDLE_REACH: Pose = {
  ...ALL_FOURS,
  hip: [338, 374],
  torso: 15,
  neck: 60,
  nearHand: [466, 192, 92],
  farHand: [560, WRIST_Y, 0],
};
/** Sweeping past the mat on the way under, already turning to point into the screen. */
const NEEDLE_PASSING: Pose = {
  ...NEEDLE_REACH,
  torso: 0,
  arch: 4,
  neck: -10,
  armLengths: [0.55, 1],
  nearHand: [510, 440, -55],
};
/**
 * The shoulder and the side of the head come down to rest on the mat, with the threaded arm lying
 * flat under the planted arm's armpit, pointing straight into the screen and out of sight. The
 * chest has turned, so the planted arm points partly into the screen too.
 */
const NEEDLE_THREAD: Pose = {
  ...NEEDLE_REACH,
  torso: -26,
  arch: 8,
  neck: -10,
  armLengths: [0.13, 0.76],
  nearHand: [440, 444, -120],
};

export const THREAD_THE_NEEDLE: FigureClip = {
  view: 'side',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: NEEDLE_REACH },
    { ms: 1300, pose: NEEDLE_PASSING, swing: true, ease: 'in' },
    { ms: 900, pose: NEEDLE_THREAD, swing: true, ease: 'out' },
    { ms: 900, pose: NEEDLE_THREAD },
    { ms: 900, pose: NEEDLE_PASSING, swing: true, ease: 'in' },
    { ms: 1300, pose: NEEDLE_REACH, swing: true, ease: 'out' },
    { ms: 600, pose: NEEDLE_REACH },
  ],
};

// --- Reverse scorpion: from above, face down in a T; one bent leg at a time reaches across the body ---

const SCORPION_BASE = { ...FACE_DOWN, nearHand: [515, 102, 90], farHand: [515, 438, -90] } satisfies Pose;

const SCORPION_FLAT: Pose = {
  ...SCORPION_BASE,
  nearFoot: [191, 256, 180],
  farFoot: [191, 284, 180],
  knees: [
    [290, 256],
    [290, 284],
  ],
};
/** The knee bends and the foot rises toward the ceiling, on its way over. */
const SCORPION_NEAR_RISING: Pose = {
  ...SCORPION_FLAT,
  nearFoot: [282, 270, 240],
  knees: [
    [292, 246],
    [290, 284],
  ],
};
/** The foot crosses over the other leg toward the opposite hand, the hip lifting with it. */
const SCORPION_NEAR_ACROSS: Pose = {
  ...SCORPION_FLAT,
  nearFoot: [350, 340, 300],
  knees: [
    [296, 236],
    [290, 284],
  ],
};
const SCORPION_FAR_RISING: Pose = {
  ...SCORPION_FLAT,
  farFoot: [282, 270, 120],
  knees: [
    [290, 256],
    [292, 294],
  ],
};
const SCORPION_FAR_ACROSS: Pose = {
  ...SCORPION_FLAT,
  farFoot: [350, 200, 60],
  knees: [
    [290, 256],
    [296, 304],
  ],
};

export const REVERSE_SCORPION: FigureClip = {
  view: 'above',
  straightArms: true,
  widths: { shoulder: 20, hip: 14 },
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: SCORPION_FLAT },
    { ms: 800, pose: SCORPION_NEAR_RISING, ease: 'in' },
    { ms: 800, pose: SCORPION_NEAR_ACROSS, ease: 'out' },
    { ms: 500, pose: SCORPION_NEAR_ACROSS },
    { ms: 800, pose: SCORPION_NEAR_RISING, ease: 'in' },
    { ms: 800, pose: SCORPION_FLAT, ease: 'out' },
    { ms: 300, pose: SCORPION_FLAT },
    { ms: 800, pose: SCORPION_FAR_RISING, ease: 'in' },
    { ms: 800, pose: SCORPION_FAR_ACROSS, ease: 'out' },
    { ms: 500, pose: SCORPION_FAR_ACROSS },
    { ms: 800, pose: SCORPION_FAR_RISING, ease: 'in' },
    { ms: 800, pose: SCORPION_FLAT, ease: 'out' },
    { ms: 300, pose: SCORPION_FLAT },
  ],
};

export const LEG_SWINGS: FigureClip = {
  view: 'side',
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: LEG_SWING_BACK },
    { ms: 800, pose: LEG_SWING_PASSING, swing: true, ease: 'in' },
    { ms: 800, pose: LEG_SWING_FORWARD, swing: true, ease: 'out' },
    { ms: 800, pose: LEG_SWING_PASSING, swing: true, ease: 'in' },
    { ms: 800, pose: LEG_SWING_BACK, swing: true, ease: 'out' },
  ],
};

// --- Marching: standing tall, knees lifting to hip height in turn, arms swinging opposite ---

/**
 * A hand on a nearly straight arm at this angle from the shoulder, in screen degrees (90 is down).
 * `x` nudges the far arm's arc over, like `armAt`, while keeping the hand in reach.
 */
const swingingHand = (degrees: number, x = 0): Extremity => {
  const radians = (degrees * Math.PI) / 180;
  const [shoulderX, shoulderY] = STANDING_SHOULDER;
  return [shoulderX + x + 140 * Math.cos(radians), shoulderY + 140 * Math.sin(radians), -degrees];
};
/** A foot lifted with the thigh level in front and the shin hanging under the knee. */
const liftedFoot = (x = 0): Extremity => [STANDING_TALL.hip[0] + 92 + x, STANDING_TALL.hip[1] + 112, -15];

const MARCH_STAND: Pose = {
  ...STANDING_TALL,
  nearHand: swingingHand(90),
  farHand: swingingHand(90, 8),
};
const MARCH_NEAR_UP: Pose = {
  ...STANDING_TALL,
  nearFoot: liftedFoot(),
  nearHand: swingingHand(115),
  farHand: swingingHand(60, 8),
};
const MARCH_FAR_UP: Pose = {
  ...STANDING_TALL,
  farFoot: liftedFoot(8),
  nearHand: swingingHand(60),
  farHand: swingingHand(115, 8),
};

export const MARCHING: FigureClip = {
  view: 'side',
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: MARCH_STAND },
    { ms: 450, pose: MARCH_NEAR_UP, swing: true },
    { ms: 450, pose: MARCH_STAND, swing: true },
    { ms: 450, pose: MARCH_FAR_UP, swing: true },
    { ms: 450, pose: MARCH_STAND, swing: true },
  ],
};

// ===== Flexibility tests: each shows the start position, the move into the measurement, and back =====

// --- Knee to wall: lunging at a wall, the front knee drives forward to touch it with the heel down ---

/** The front toes sit this far from the wall, about the average result. */
const KTW_FRONT_FOOT: Extremity = [500, ANKLE_Y, 0];
const KTW_BACK_FOOT: Extremity = [360, 446, -15];

const KTW_BACK: Pose = {
  hip: [455, 290],
  torso: 85,
  arch: 0,
  neck: 85,
  nearHand: [562, 230, 80],
  farHand: [556, 238, 80],
  nearFoot: KTW_FRONT_FOOT,
  farFoot: KTW_BACK_FOOT,
};
const KTW_TOUCHING: Pose = { ...KTW_BACK, hip: [461, 342], torso: 82 };

export const KNEE_TO_WALL: FigureClip = {
  view: 'side',
  scenery: [{ x: 570, y: 40, width: 40, height: 430 }],
  zoom: 1.3,
  focus: [490, 290],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: KTW_BACK },
    { ms: 400, pose: KTW_BACK },
    { ms: 1300, pose: KTW_TOUCHING },
    { ms: 800, pose: KTW_TOUCHING },
    { ms: 1300, pose: KTW_BACK },
  ],
};

// --- Shared by the standing shoulder tests: from the front, so an arm moving out to the side shows ---

const STANDING_FRONT: Omit<Pose, 'nearHand' | 'farHand'> = {
  hip: [480, 259],
  torso: 90,
  arch: 0,
  neck: 90,
  nearFoot: [450, ANKLE_Y, 180],
  farFoot: [510, ANKLE_Y, 0],
};
const STANDING_FRONT_WIDTHS = { shoulder: 28, hip: 16 };
/** Where the shoulders sit with `STANDING_FRONT_WIDTHS`, near on the left. */
const FRONT_NEAR_SHOULDER: Point = [452, 134];
const FRONT_FAR_SHOULDER: Point = [508, 134];

// --- Shoulder abduction: a straight arm rises out to the side and on overhead ---

const abductionAt = (degrees: number): Pose => ({
  ...STANDING_FRONT,
  nearHand: armAt(FRONT_NEAR_SHOULDER, degrees),
  farHand: armAt(FRONT_FAR_SHOULDER, 85),
});
const ABDUCTION_DOWN = abductionAt(95);
const ABDUCTION_OUT = abductionAt(180);
const ABDUCTION_UP = abductionAt(260);

export const SHOULDER_ABDUCTION: FigureClip = {
  view: 'side',
  straightArms: true,
  widths: STANDING_FRONT_WIDTHS,
  legBends: [-1, 1],
  zoom: 1.35,
  focus: [450, 120],
  stillFrame: 3,
  keyframes: [
    { ms: 0, pose: ABDUCTION_DOWN },
    { ms: 400, pose: ABDUCTION_DOWN },
    { ms: 1100, pose: ABDUCTION_OUT, swing: true, ease: 'in' },
    { ms: 1100, pose: ABDUCTION_UP, swing: true, ease: 'out' },
    { ms: 700, pose: ABDUCTION_UP },
    { ms: 1100, pose: ABDUCTION_OUT, swing: true, ease: 'in' },
    { ms: 1100, pose: ABDUCTION_DOWN, swing: true, ease: 'out' },
  ],
};

// --- Shoulder external rotation: from the front, the forearm swings from pointing at the camera out to the side ---

/** The near elbow tucked in at the side, bent to 90°. */
const ER_ELBOW: Point = [450, 209];
const FAR_ELBOW_HANGING: Point = [510, 209];

/** The forearm turned this far out from pointing straight ahead, so it looks shorter the closer it is to 0. */
const externalRotationAt = (degrees: number): Pose => ({
  ...STANDING_FRONT,
  nearHand: [ER_ELBOW[0] - 75 * Math.sin((degrees * Math.PI) / 180), ER_ELBOW[1], 180],
  farHand: [511, 284, -90],
  elbows: [ER_ELBOW, FAR_ELBOW_HANGING],
});
const ER_AHEAD = externalRotationAt(15);
const ER_OUT = externalRotationAt(65);

export const SHOULDER_EXTERNAL_ROTATION: FigureClip = {
  view: 'side',
  widths: STANDING_FRONT_WIDTHS,
  legBends: [-1, 1],
  zoom: 1.8,
  focus: [455, 175],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: ER_AHEAD },
    { ms: 500, pose: ER_AHEAD },
    { ms: 1500, pose: ER_OUT },
    { ms: 900, pose: ER_OUT },
    { ms: 1500, pose: ER_AHEAD },
  ],
};

// --- Seated hip rotation: from the front, on the edge of a table, the shin swings like a pendulum ---

const TABLE: FigureClip['scenery'] = [
  { x: 320, y: 312, width: 320, height: 16 },
  { x: 336, y: 328, width: 14, height: 142 },
  { x: 610, y: 328, width: 14, height: 142 },
];
/** The thighs point at the camera along the table, so the knees sit just under the hips. */
const SEATED_KNEES: readonly [Point, Point] = [
  [458, 312],
  [502, 312],
];

/** The near shin swung this far from hanging straight down, positive toward the other leg. */
const shinAt = (degrees: number): Extremity => {
  const radians = (degrees * Math.PI) / 180;
  const [kneeX, kneeY] = SEATED_KNEES[0];
  return [kneeX + 100 * Math.sin(radians), kneeY + 100 * Math.cos(radians), degrees - 90];
};

const SEATED: Pose = {
  hip: [480, 300],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [410, 300, -90],
  farHand: [550, 300, -90],
  nearFoot: shinAt(0),
  farFoot: [502, 412, -90],
  knees: SEATED_KNEES,
};
/** For external rotation the other foot tucks back under the table, out of the way. */
const SEATED_TUCKED: Pose = { ...SEATED, farFoot: [502, 372, -90] };

const seatedRotation = (start: Pose, degrees: number): FigureClip => {
  const rotated: Pose = { ...start, nearFoot: shinAt(degrees) };
  return {
    view: 'side',
    widths: STANDING_FRONT_WIDTHS,
    armBends: [-1, 1],
    scenery: TABLE,
    zoom: 1.3,
    focus: [480, 300],
    stillFrame: 2,
    keyframes: [
      { ms: 0, pose: start },
      { ms: 500, pose: start },
      { ms: 1800, pose: rotated },
      { ms: 1500, pose: rotated },
      { ms: 1800, pose: start },
    ],
  };
};

export const HIP_EXTERNAL_ROTATION = seatedRotation(SEATED_TUCKED, 40);
export const HIP_INTERNAL_ROTATION = seatedRotation(SEATED, -40);

// --- Sit and reach: legs straight with the feet against a box, folding to reach along its top ---

const SIT_REACH_UP: Pose = {
  hip: [380, 446],
  torso: 92,
  arch: 0,
  neck: 90,
  nearHand: [460, 434, -10],
  farHand: [468, 434, -10],
  nearFoot: [579, 446, 90],
  farFoot: [579, 446, 90],
};
const SIT_REACH_FOLDED: Pose = {
  ...SIT_REACH_UP,
  torso: 28,
  arch: 8,
  neck: 5,
  nearHand: [628, 388, 0],
  farHand: [636, 388, 0],
};

export const SIT_AND_REACH: FigureClip = {
  view: 'side',
  scenery: [{ x: 592, y: 398, width: 110, height: 72 }],
  zoom: 1.5,
  focus: [520, 370],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: SIT_REACH_UP },
    { ms: 400, pose: SIT_REACH_UP },
    { ms: 1800, pose: SIT_REACH_FOLDED },
    { ms: 2000, pose: SIT_REACH_FOLDED },
    { ms: 1600, pose: SIT_REACH_UP },
  ],
};

// --- Knee to chest: lying on the back, head to the left, both hands pull one knee in ---

/** Holding the shin just below the knee, elbows out to the sides. */
const KNEE_TO_CHEST_IN: Pose = {
  ...LEG_RAISE_DOWN,
  nearHand: [398, 372, -20],
  farHand: [404, 376, -20],
  nearFoot: [470, 403, 30],
};

export const KNEE_TO_CHEST: FigureClip = {
  view: 'side',
  armBends: [1, 1],
  zoom: 1.7,
  focus: [455, 385],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: LEG_RAISE_DOWN },
    { ms: 400, pose: LEG_RAISE_DOWN },
    { ms: 1500, pose: KNEE_TO_CHEST_IN },
    { ms: 1500, pose: KNEE_TO_CHEST_IN },
    { ms: 1500, pose: LEG_RAISE_DOWN },
  ],
};

// --- Straight leg raise: the same, but a strap around the foot pulls the straight leg up ---

const STRAP_DOWN: Pose = { ...LEG_RAISE_DOWN, nearHand: [420, 405, 0], farHand: [426, 409, 0] };
const STRAP_UP: Pose = { ...LEG_RAISE_UP, nearHand: [392, 340, 60], farHand: [398, 344, 60] };

export const STRAIGHT_LEG_RAISE: FigureClip = {
  view: 'side',
  armBends: [1, 1],
  band: ['nearHand', 'nearFoot'],
  zoom: 1.6,
  focus: [455, 360],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: STRAP_DOWN },
    { ms: 400, pose: STRAP_DOWN },
    { ms: 1700, pose: STRAP_UP, swing: true },
    { ms: 1500, pose: STRAP_UP },
    { ms: 1700, pose: STRAP_DOWN, swing: true },
  ],
};

// --- Hip abduction: from above, lying on the back, one straight leg slides out to the side ---

const ABDUCTION_FLAT: Pose = {
  hip: [390, 270],
  torso: 0,
  arch: 0,
  neck: 0,
  // Arms angled out a little, so they don't lie over the legs.
  nearHand: [380, 205, 180],
  farHand: [380, 335, 180],
  // A hair short of full reach, so the straight legs don't kink at the knee.
  nearFoot: [190.1, 256, 180],
  farFoot: [190.1, 284, 180],
};
/** Swung 40° out around its hip, which sits at [390, 256]. */
const ABDUCTION_WIDE: Pose = { ...ABDUCTION_FLAT, nearFoot: [236.9, 127.5, 140] };

export const HIP_ABDUCTION: FigureClip = {
  view: 'above',
  straightArms: true,
  widths: { shoulder: 20, hip: 14 },
  zoom: 1.4,
  focus: [380, 240],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: ABDUCTION_FLAT },
    { ms: 400, pose: ABDUCTION_FLAT },
    { ms: 1600, pose: ABDUCTION_WIDE, swing: true },
    { ms: 900, pose: ABDUCTION_WIDE },
    { ms: 1600, pose: ABDUCTION_FLAT, swing: true },
  ],
};

// --- Overhead reach: lying on the back with knees bent, a straight arm lowers from the ceiling to overhead ---

const LYING_SHOULDER: Point = [315, 446];

const overheadAt = (degrees: number): Pose => ({
  hip: [440, 446],
  torso: 180,
  arch: 0,
  neck: 172,
  nearHand: armAt(LYING_SHOULDER, degrees),
  farHand: armAt(LYING_SHOULDER, 3),
  nearFoot: [560, ANKLE_Y, 0],
  farFoot: [568, ANKLE_Y, 0],
});
const OVERHEAD_UP = overheadAt(270);
const OVERHEAD_DOWN = overheadAt(185);

export const OVERHEAD_REACH: FigureClip = {
  view: 'side',
  straightArms: true,
  zoom: 1.6,
  focus: [330, 360],
  stillFrame: 2,
  keyframes: [
    { ms: 0, pose: OVERHEAD_UP },
    { ms: 400, pose: OVERHEAD_UP },
    { ms: 1800, pose: OVERHEAD_DOWN, swing: true },
    { ms: 900, pose: OVERHEAD_DOWN },
    { ms: 1800, pose: OVERHEAD_UP, swing: true },
  ],
};

// ===== Passive stretches: each moves from a start position into the stretch, holds it, and comes back out =====

const flipEase = (ease: Keyframe['ease']): Keyframe['ease'] => (ease === 'in' ? 'out' : ease === 'out' ? 'in' : ease);

/**
 * Pauses on `start`, moves through `moves` into the stretch, holds it, then retraces the same moves
 * back out to `start`, so the loop closes. The still frame is the stretch itself.
 */
const intoHold = (start: Pose, moves: readonly Keyframe[], holdMs = 3500): Pick<FigureClip, 'keyframes' | 'stillFrame'> => {
  const stretch = moves[moves.length - 1].pose;
  const back = moves
    .map((move, i) => ({ ...move, ease: flipEase(move.ease), pose: i === 0 ? start : moves[i - 1].pose }))
    .reverse();
  return {
    stillFrame: moves.length + 1,
    keyframes: [{ ms: 0, pose: start }, { ms: 500, pose: start }, ...moves, { ms: holdMs, pose: stretch }, ...back],
  };
};

/** Where a knee goes for a leg from this hip to this ankle, for poses that place their knees. */
const kneeOf = (hip: Point, foot: Extremity, bend: Bend = 1): Point =>
  solveJoint(hip, [foot[0], foot[1]], BONES.thigh, BONES.shin, bend);

/** Zoomed in on someone lying on their back, head to the left. */
const LYING_CAMERA = { zoom: 1.5, focus: [440, 380] } satisfies Partial<FigureClip>;

// --- Seated pike stretch: legs straight together, folding forward to reach the toes ---

const PIKE_FOLDED: Pose = {
  ...SIT_REACH_UP,
  torso: 35,
  arch: 12,
  neck: -10,
  nearHand: [586, 412, -80],
  farHand: [592, 414, -80],
};

export const SEATED_PIKE_STRETCH: FigureClip = {
  view: 'side',
  ...intoHold(SIT_REACH_UP, [{ ms: 1800, pose: PIKE_FOLDED }]),
};

// --- The Breakdancer: from the front, one leg long, the other foot against its inner thigh, folding toward the long leg ---

const BREAKDANCER_SIT: Pose = {
  ...PANCAKE_UP,
  nearHand: [440, 430, -90],
  farHand: [520, 430, -90],
  farFoot: [505, 452, 180],
  knees: [
    [368, 438.5],
    [590, 425],
  ],
};
const BREAKDANCER_FOLDED: Pose = {
  ...BREAKDANCER_SIT,
  torso: 150,
  torsoLength: 110,
  arch: 0,
  neck: 165,
  nearHand: [285, 440, 180],
  farHand: [300, 432, 180],
};

export const THE_BREAKDANCER: FigureClip = {
  view: 'above',
  straightArms: true,
  widths: { shoulder: 30, hip: 14 },
  ...intoHold(BREAKDANCER_SIT, [{ ms: 1800, pose: BREAKDANCER_FOLDED }]),
};

// --- Pancake: the active pancake's fold, held at the bottom ---

export const PANCAKE: FigureClip = {
  view: 'above',
  widths: { shoulder: 30, hip: 14 },
  legBends: [-1, 1],
  armBends: [-1, 1],
  ...intoHold(PANCAKE_UP, [{ ms: 2000, pose: PANCAKE_FOLDED }]),
};

// --- Butterfly: from the front, soles together, the knees lowering out to the sides as the chest leans in ---

const BUTTERFLY_UP: Pose = {
  hip: [480, 425],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [468, 448, -60],
  farHand: [492, 448, -120],
  nearFoot: [445, 455, 0],
  farFoot: [515, 455, 180],
  knees: [
    [415, 365],
    [545, 365],
  ],
};
const BUTTERFLY_DOWN: Pose = {
  ...BUTTERFLY_UP,
  torsoLength: 95,
  neckLength: 30,
  knees: [
    [365, 440],
    [595, 440],
  ],
};

export const BUTTERFLY: FigureClip = {
  view: 'above',
  widths: { shoulder: 30, hip: 14 },
  armBends: [-1, 1],
  ...intoHold(BUTTERFLY_UP, [{ ms: 2000, pose: BUTTERFLY_DOWN }]),
};

// --- 90 to 90: from the front, both knees drop to one side, then the chest leans over the front shin ---

/** Folding out over the front shin, on the figure's right, the straight arms reaching along it, as in the Breakdancer. */
const NINETY_LEAN: Pose = {
  ...ROTATIONS_LEFT,
  torso: 150,
  torsoLength: 110,
  neck: 165,
  nearHand: [330, 445, 180],
  farHand: [345, 437, 180],
};

export const NINETY_TO_NINETY: FigureClip = {
  view: 'above',
  straightArms: true,
  widths: { shoulder: 28, hip: 16 },
  ...intoHold(ROTATIONS_UP, [
    { ms: 1400, pose: ROTATIONS_LEFT },
    { ms: 1400, pose: NINETY_LEAN },
  ]),
};

// --- Bottom squat: from the front, sinking from standing into a deep squat, elbows pushing the knees out ---

const SQUAT_STAND: Pose = {
  hip: [480, 270],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [440, 290, -95],
  farHand: [520, 290, -85],
  nearFoot: [395, ANKLE_Y, 180],
  farFoot: [565, ANKLE_Y, 0],
};
/** The arms hang loose in front, between the knees. */
const SQUAT_BOTTOM: Pose = {
  ...SQUAT_STAND,
  hip: [480, 400],
  torsoLength: 100,
  nearHand: [458, 445, -90],
  farHand: [502, 445, -90],
};

export const BOTTOM_SQUAT: FigureClip = {
  view: 'side',
  widths: { shoulder: 28, hip: 16 },
  legBends: [-1, 1],
  armBends: [1, -1],
  ...intoHold(SQUAT_STAND, [{ ms: 2000, pose: SQUAT_BOTTOM }]),
};

// --- Resting Cossack squat: from a wide stance, sinking over one leg and resting at the bottom ---

const COSSACK_STAND: Pose = {
  ...COSSACK_MIDDLE,
  hip: [480, 300],
  nearHand: [466, 228, 0],
  farHand: [494, 228, 180],
};

export const RESTING_COSSACK_SQUAT: FigureClip = {
  view: 'side',
  widths: { shoulder: 28, hip: 18 },
  legBends: [-1, 1],
  armBends: [1, -1],
  ...intoHold(COSSACK_STAND, [{ ms: 2000, pose: COSSACK_NEAR }]),
};

// --- Half kneeling frog: from above on all fours, one leg slides out straight to the side, then the hips rock back ---

const HALF_FROG_BASE = {
  torso: 0,
  arch: 0,
  neck: 0,
  // Arms pointing down at the floor look short from above.
  nearHand: [540, 240, 0],
  farHand: [540, 300, 0],
  farFoot: [315, 288, 180],
} satisfies Partial<Pose>;

const HALF_FROG_ALL_FOURS: Pose = {
  ...HALF_FROG_BASE,
  hip: [400, 270],
  nearFoot: [315, 252, 180],
  knees: [
    [405, 252],
    [405, 288],
  ],
};
const HALF_FROG_LEG_OUT: Pose = {
  ...HALF_FROG_BASE,
  hip: [400, 270],
  nearFoot: [400, 75, 90],
  knees: [
    [400, 163.5],
    [405, 288],
  ],
};
const HALF_FROG_BACK: Pose = {
  ...HALF_FROG_LEG_OUT,
  hip: [330, 270],
  knees: [
    [365, 163.5],
    [405, 288],
  ],
};

export const HALF_KNEELING_FROG_STRETCH: FigureClip = {
  view: 'above',
  straightArms: true,
  widths: { shoulder: 24, hip: 18 },
  ...intoHold(HALF_FROG_ALL_FOURS, [
    { ms: 1500, pose: HALF_FROG_LEG_OUT, step: true },
    { ms: 1800, pose: HALF_FROG_BACK },
  ]),
};

// --- Prayer pose: from sitting on the heels, folding forward with the arms reaching out long ---

const SITTING_ON_HEELS: Pose = {
  hip: [362, 392],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [430, 395, -20],
  farHand: [438, 395, -20],
  nearFoot: [340, 452, 180],
  farFoot: [348, 452, 180],
};

export const PRAYER_POSE: FigureClip = {
  view: 'side',
  ...intoHold(SITTING_ON_HEELS, [{ ms: 2000, pose: PRAYER, swing: true }]),
};

// --- Puppy pose: from all fours, the hands walk forward and the chest melts down, hips over the knees ---

const PUPPY_WALKING: Pose = {
  ...ALL_FOURS,
  torso: 15,
  nearHand: [590, WRIST_Y, 0],
  farHand: [598, WRIST_Y, 0],
};
const PUPPY: Pose = {
  ...ALL_FOURS,
  torso: -22,
  arch: -6,
  neck: -20,
  nearHand: [645, WRIST_Y, 0],
  farHand: [653, WRIST_Y, 0],
};

export const PUPPY_POSE: FigureClip = {
  view: 'side',
  ...intoHold(ALL_FOURS, [
    { ms: 1000, pose: PUPPY_WALKING, step: true },
    { ms: 1600, pose: PUPPY },
  ]),
};

// --- Downward facing dog: from the knees with the toes tucked, the hips lift up and back ---

const DOG_KNEES_DOWN: Pose = {
  hip: [400, 356],
  torso: 5,
  arch: 0,
  neck: 0,
  nearHand: [620, WRIST_Y, 0],
  farHand: [628, WRIST_Y, 0],
  nearFoot: [300, 436, -28],
  farFoot: [308, 436, -28],
};

export const DOWNWARD_FACING_DOG: FigureClip = {
  view: 'side',
  ...intoHold(DOG_KNEES_DOWN, [{ ms: 2000, pose: DOG }]),
};

// --- Frog stretch: from above on all fours, the knees slide out wide, then the hips sink back ---

const FROG_ALL_FOURS: Pose = {
  ...FROG_BASE,
  hip: [420, 270],
  nearFoot: [330, 245, 180],
  // -180 rather than 180, so the foot turns out the short way to -90 instead of spinning round.
  farFoot: [330, 295, -180],
  knees: [
    [420, 245],
    [420, 295],
  ],
};

export const FROG_STRETCH: FigureClip = {
  view: 'above',
  widths: { shoulder: 24, hip: 18 },
  armBends: [1, -1],
  ...intoHold(FROG_ALL_FOURS, [
    { ms: 1600, pose: FROG_FORWARD, step: true },
    { ms: 1600, pose: FROG_BACK },
  ]),
};

// --- Knight stretch: the back knee stays planted as the hips shift forward ---

/** The back knee on the floor, with its shin lying flat behind it. */
const BACK_KNEE: Point = [390, 456];

const KNIGHT_UPRIGHT: Pose = { ...KNIGHT, knees: [kneeOf(KNIGHT.hip, KNIGHT.nearFoot), BACK_KNEE] };
const KNIGHT_FORWARD_HIP: Point = [460, 385];
const KNIGHT_FORWARD: Pose = {
  ...KNIGHT,
  hip: KNIGHT_FORWARD_HIP,
  nearHand: [540, 362, -30],
  farHand: [548, 362, -30],
  knees: [kneeOf(KNIGHT_FORWARD_HIP, KNIGHT.nearFoot), BACK_KNEE],
};

export const KNIGHT_STRETCH: FigureClip = {
  view: 'side',
  ...intoHold(KNIGHT_UPRIGHT, [{ ms: 1800, pose: KNIGHT_FORWARD }]),
};

// --- Lizard pose: from the knight, the front foot steps out past the hands and the hips sink low ---

const LIZARD_HIP: Point = [470, 400];
const LIZARD_FRONT_FOOT: Extremity = [575, ANKLE_Y, 0];
const LIZARD: Pose = {
  hip: LIZARD_HIP,
  torso: 12,
  arch: 0,
  neck: 5,
  nearHand: [690, WRIST_Y, 0],
  farHand: [698, WRIST_Y, 0],
  nearFoot: LIZARD_FRONT_FOOT,
  farFoot: KNIGHT.farFoot,
  knees: [kneeOf(LIZARD_HIP, LIZARD_FRONT_FOOT), BACK_KNEE],
};

export const LIZARD_POSE: FigureClip = {
  view: 'side',
  ...intoHold(KNIGHT_UPRIGHT, [{ ms: 2000, pose: LIZARD, step: true }]),
};

// --- Half-twisted lizard: from the lizard, the back foot comes up and the near hand reaches back to hold it ---

const TWISTED_LIZARD: Pose = {
  ...LIZARD,
  torso: 45,
  arch: 0,
  neck: 110,
  nearHand: [432, 380, 100],
  farHand: [600, WRIST_Y, 0],
  farFoot: [430, 382, 100],
};

export const HALF_TWISTED_LIZARD: FigureClip = {
  view: 'side',
  ...intoHold(KNIGHT_UPRIGHT, [
    { ms: 2000, pose: LIZARD, step: true },
    { ms: 1800, pose: TWISTED_LIZARD },
  ]),
};

// --- Couch stretch: back to a wall with that shin up against it, the chest lifting from the floor to upright ---

const COUCH_KNEE: Point = [262, 456];
const COUCH_FRONT_FOOT: Extremity = [500, ANKLE_Y, 0];
const COUCH_LEAN_HIP: Point = [330, 382];
const COUCH_UP_HIP: Point = [338, 391];

const COUCH_LEAN: Pose = {
  hip: COUCH_LEAN_HIP,
  torso: 35,
  arch: 0,
  neck: 20,
  nearHand: [470, WRIST_Y, 0],
  farHand: [478, WRIST_Y, 0],
  nearFoot: COUCH_FRONT_FOOT,
  // The top of the back foot rests on the wall, toes pointing up.
  farFoot: [262, 356, 90],
  knees: [kneeOf(COUCH_LEAN_HIP, COUCH_FRONT_FOOT), COUCH_KNEE],
};
const COUCH_UP: Pose = {
  ...COUCH_LEAN,
  hip: COUCH_UP_HIP,
  torso: 92,
  neck: 90,
  nearHand: [440, 360, -30],
  farHand: [448, 360, -30],
  knees: [kneeOf(COUCH_UP_HIP, COUCH_FRONT_FOOT), COUCH_KNEE],
};

export const COUCH_STRETCH: FigureClip = {
  view: 'side',
  scenery: [{ x: 210, y: 40, width: 40, height: 430 }],
  ...intoHold(COUCH_LEAN, [{ ms: 2000, pose: COUCH_UP }]),
};

// --- Standing forward fold: hinging from standing until the head and arms hang ---

const FORWARD_FOLD: Pose = {
  ...STANDING_TALL,
  hip: [440, 277],
  torso: -18,
  arch: 20,
  neck: -75,
  nearHand: [505, 440, -100],
  farHand: [513, 440, -100],
};

export const STANDING_FORWARD_FOLD: FigureClip = {
  view: 'side',
  ...intoHold(STANDING_TALL, [{ ms: 2000, pose: FORWARD_FOLD }]),
};

// --- Pyramid stretch: feet a long step apart, legs straight, hinging over the front leg ---

const PYRAMID_UP: Pose = {
  hip: [470, 285],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [475, 305, -90],
  farHand: [483, 305, -90],
  nearFoot: [570, ANKLE_Y, 0],
  farFoot: [375, ANKLE_Y, -10],
};
const PYRAMID_FOLDED: Pose = {
  ...PYRAMID_UP,
  hip: [465, 290],
  torso: -8,
  arch: 6,
  neck: -40,
  nearHand: [585, 440, -60],
  farHand: [593, 440, -60],
};

export const PYRAMID_STRETCH: FigureClip = {
  view: 'side',
  ...intoHold(PYRAMID_UP, [{ ms: 2000, pose: PYRAMID_FOLDED }]),
};

// --- Lying hamstring stretch: the straight leg raise's band pull, held at the top ---

export const LYING_HAMSTRING_STRETCH: FigureClip = {
  view: 'side',
  armBends: [1, 1],
  band: ['nearHand', 'nearFoot'],
  ...LYING_CAMERA,
  ...intoHold(STRAP_DOWN, [{ ms: 1800, pose: STRAP_UP, swing: true }]),
};

// --- Lying knee hug: the knee to chest test's pull, held ---

export const LYING_KNEE_HUG: FigureClip = {
  view: 'side',
  armBends: [1, 1],
  ...LYING_CAMERA,
  ...intoHold(LEG_RAISE_DOWN, [{ ms: 1600, pose: KNEE_TO_CHEST_IN }]),
};

// --- Happy baby: lying on the back, the knees come up toward the armpits and the hands hold the feet ---

const HAPPY_BABY_START: Pose = {
  ...LEG_RAISE_DOWN,
  nearFoot: [560, ANKLE_Y, 0],
  farFoot: [568, ANKLE_Y, 0],
};
const HAPPY_BABY_HOLD: Pose = {
  ...LEG_RAISE_DOWN,
  nearHand: [372, 318, 0],
  farHand: [380, 318, 0],
  nearFoot: [372, 300, 0],
  farFoot: [380, 300, 0],
  // The knees open out past the chest toward the armpits, so the thighs look short from the side.
  knees: [
    [372, 395],
    [380, 395],
  ],
};

export const HAPPY_BABY: FigureClip = {
  view: 'side',
  armBends: [1, 1],
  ...LYING_CAMERA,
  ...intoHold(
    {
      ...HAPPY_BABY_START,
      knees: [kneeOf(LEG_RAISE_DOWN.hip, HAPPY_BABY_START.nearFoot), kneeOf(LEG_RAISE_DOWN.hip, HAPPY_BABY_START.farFoot)],
    },
    [{ ms: 2000, pose: HAPPY_BABY_HOLD }]
  ),
};

// --- Figure four: lying on the back, one ankle crosses over the other knee, then that leg pulls in ---

const FIGURE_FOUR_HIP: Point = [440, 446];
const FIGURE_FOUR_FAR_FOOT: Extremity = [568, ANKLE_Y, 0];
const FIGURE_FOUR_FAR_KNEE = kneeOf(FIGURE_FOUR_HIP, FIGURE_FOUR_FAR_FOOT);

const FIGURE_FOUR_START: Pose = {
  ...HAPPY_BABY_START,
  knees: [kneeOf(FIGURE_FOUR_HIP, HAPPY_BABY_START.nearFoot), FIGURE_FOUR_FAR_KNEE],
};
/** The near ankle rests across the far knee, the near knee opening toward the camera. */
const FIGURE_FOUR_CROSSED: Pose = {
  ...FIGURE_FOUR_START,
  nearFoot: [FIGURE_FOUR_FAR_KNEE[0] + 8, FIGURE_FOUR_FAR_KNEE[1] + 4, 0],
  knees: [[505, 420], FIGURE_FOUR_FAR_KNEE],
};
const FIGURE_FOUR_PULLED_FOOT: Extremity = [470, 330, 0];
const FIGURE_FOUR_PULLED_KNEE = kneeOf(FIGURE_FOUR_HIP, FIGURE_FOUR_PULLED_FOOT);
const FIGURE_FOUR_PULLED: Pose = {
  ...FIGURE_FOUR_START,
  nearHand: [410, 392, -20],
  farHand: [416, 396, -20],
  nearFoot: [FIGURE_FOUR_PULLED_KNEE[0] + 18, FIGURE_FOUR_PULLED_KNEE[1] + 2, 0],
  farFoot: FIGURE_FOUR_PULLED_FOOT,
  knees: [[470, 395], FIGURE_FOUR_PULLED_KNEE],
};

export const FIGURE_FOUR_STRETCH: FigureClip = {
  view: 'side',
  armBends: [1, 1],
  ...LYING_CAMERA,
  ...intoHold(FIGURE_FOUR_START, [
    { ms: 1400, pose: FIGURE_FOUR_CROSSED },
    { ms: 1600, pose: FIGURE_FOUR_PULLED },
  ]),
};

// --- The Sagittarius: from above, lying on the side, the top knee comes up to 90° and the bottom arm opens out ---

const SAGITTARIUS_BASE = {
  hip: [390, 270],
  torso: 0,
  arch: 0,
  neck: 0,
  nearFoot: [190.1, 270, 180],
} satisfies Partial<Pose>;

const SAGITTARIUS_FLAT: Pose = {
  ...SAGITTARIUS_BASE,
  nearHand: [400, 262, 180],
  farHand: [400, 278, 180],
  farFoot: [190.1, 270, 180],
  knees: [
    [290, 270],
    [290, 270],
  ],
};
const SAGITTARIUS_KNEE_UP: Pose = {
  ...SAGITTARIUS_BASE,
  nearHand: [412, 176, 0],
  farHand: [412, 172, 0],
  farFoot: [300, 170, 180],
  knees: [
    [290, 270],
    [400, 170],
  ],
};
const SAGITTARIUS_OPEN: Pose = { ...SAGITTARIUS_KNEE_UP, nearHand: [515, 418, -90] };

export const THE_SAGITTARIUS: FigureClip = {
  view: 'above',
  straightArms: true,
  ...intoHold(SAGITTARIUS_FLAT, [
    { ms: 1500, pose: SAGITTARIUS_KNEE_UP },
    { ms: 2000, pose: SAGITTARIUS_OPEN, swing: true },
  ]),
};

// --- Half spinal twist: one leg long, the other foot planted across it; the arm hugs the knee and the chest turns ---

const SPINAL_TWIST_SIT: Pose = {
  ...SIT_REACH_UP,
  nearHand: [395, WRIST_Y, 0],
  farHand: [403, WRIST_Y, 0],
  farFoot: [480, ANKLE_Y, 0],
};
const SPINAL_TWIST: Pose = {
  ...SPINAL_TWIST_SIT,
  torso: 96,
  neck: 115,
  nearHand: [455, 375, -90],
  farHand: [300, WRIST_Y, 180],
};

export const HALF_SPINAL_TWIST: FigureClip = {
  view: 'side',
  ...intoHold(SPINAL_TWIST_SIT, [{ ms: 1800, pose: SPINAL_TWIST }]),
};

// --- Seated straddle side bend: from the front, leaning sideways over one leg with the other arm overhead ---

/** A touch narrower than the pancake, as tipping the hips sideways moves them away from the near foot. */
const STRADDLE_UP: Pose = { ...PANCAKE_UP, nearFoot: [275, 452, 110], farFoot: [685, 452, 70] };
/**
 * Bending toward the far leg, so the arm reaching overhead is the near one, drawn in front of the
 * head rather than disappearing behind it.
 */
const STRADDLE_SIDE_BEND: Pose = {
  ...STRADDLE_UP,
  torso: 55,
  arch: 8,
  neck: 45,
  nearHand: [655, 228, 30],
  farHand: [630, 445, -90],
};

export const SEATED_STRADDLE_SIDE_BEND: FigureClip = {
  view: 'above',
  widths: { shoulder: 30, hip: 14 },
  legBends: [-1, 1],
  armBends: [-1, 1],
  ...intoHold(STRADDLE_UP, [{ ms: 2000, pose: STRADDLE_SIDE_BEND, swing: true }]),
};

// --- Pec stretch on the ground: from above, face down with one arm out; the other side rolls over it ---

const PEC_ARMS = { nearHand: [515, 102, 90], farHand: [520, 350, -60], neck: 0 } satisfies Partial<Pose>;
const PEC_FLAT: Pose = { ...SCORPION_FLAT, ...PEC_ARMS };
const PEC_ROLLING: Pose = { ...SCORPION_FAR_RISING, ...PEC_ARMS };
const PEC_ROLLED: Pose = { ...SCORPION_FAR_ACROSS, ...PEC_ARMS, neck: -20 };

export const PEC_STRETCH_ON_THE_GROUND: FigureClip = {
  view: 'above',
  widths: { shoulder: 20, hip: 14 },
  armBends: [1, -1],
  ...intoHold(PEC_FLAT, [
    { ms: 900, pose: PEC_ROLLING, ease: 'in' },
    { ms: 900, pose: PEC_ROLLED, ease: 'out' },
  ]),
};

// --- Sleeper stretch: from above, lying on the side; the top hand presses the bottom forearm down toward the feet ---

const SLEEPER_BASE = {
  hip: [390, 270],
  torso: 0,
  arch: 0,
  neck: 0,
  nearFoot: [250, 215, 180],
  farFoot: [256, 211, 180],
  // Knees bent a little in front, stacked one on the other.
  knees: [
    [340, 185],
    [345, 181],
  ],
} satisfies Partial<Pose>;

/** The bottom forearm points up at the camera, so it looks short from above. */
const SLEEPER_START: Pose = {
  ...SLEEPER_BASE,
  nearHand: [515, 186, 90],
  farHand: [508, 184, 180],
  elbows: [
    [515, 195],
    [472, 220],
  ],
};
const SLEEPER_PRESSED: Pose = {
  ...SLEEPER_BASE,
  nearHand: [440, 195, 180],
  farHand: [452, 202, 180],
  elbows: [
    [515, 195],
    [478, 252],
  ],
};

export const SLEEPER_STRETCH: FigureClip = {
  view: 'above',
  ...intoHold(SLEEPER_START, [{ ms: 1800, pose: SLEEPER_PRESSED }]),
};

// --- Shared by the standing arm stretches: from the front, arms hanging with the elbows placed ---

const ARMS_HANGING: Pose = {
  ...STANDING_FRONT,
  nearHand: [451, 284, -90],
  farHand: [511, 284, -90],
  elbows: [
    [450, 209],
    [510, 209],
  ],
};
const STANDING_FRONT_CLIP = {
  view: 'side',
  widths: STANDING_FRONT_WIDTHS,
  legBends: [-1, 1],
  zoom: 1.3,
  focus: [480, 190],
} satisfies Partial<FigureClip>;

// --- Cross-body shoulder stretch: one straight arm across the chest, the other forearm pulling it in ---

const CROSS_BODY: Pose = {
  ...STANDING_FRONT,
  // Pointing partly into the screen across the chest, so the straight arm looks short.
  nearHand: [552, 150, 10],
  farHand: [500, 156, 150],
  elbows: [
    [502, 142],
    [542, 212],
  ],
};

export const CROSS_BODY_SHOULDER_STRETCH: FigureClip = {
  ...STANDING_FRONT_CLIP,
  ...intoHold(ARMS_HANGING, [{ ms: 1800, pose: CROSS_BODY }]),
};

// --- Overhead triceps stretch: from behind, one hand drops behind the head and the other pulls that elbow in ---

const TRICEPS_ARM_UP: Pose = {
  ...ARMS_HANGING,
  nearHand: [482, 112, -60],
  elbows: [
    [445, 60],
    [510, 209],
  ],
};
const TRICEPS_PULL: Pose = {
  ...TRICEPS_ARM_UP,
  farHand: [452, 52, 180],
  elbows: [
    [445, 60],
    [525, 72],
  ],
};

export const OVERHEAD_TRICEPS_STRETCH: FigureClip = {
  ...STANDING_FRONT_CLIP,
  ...intoHold(ARMS_HANGING, [
    { ms: 1500, pose: TRICEPS_ARM_UP },
    { ms: 1200, pose: TRICEPS_PULL },
  ]),
};

// --- Neck side stretch: the head tilts toward one shoulder, that hand resting on it, the other arm reaching down ---

const NECK_TILTED: Pose = {
  ...ARMS_HANGING,
  neck: 125,
  nearHand: [470, 66, 0],
  farHand: [520, 298, -90],
  elbows: [
    [395, 88],
    [514, 214],
  ],
};

export const NECK_SIDE_STRETCH: FigureClip = {
  ...STANDING_FRONT_CLIP,
  ...intoHold(ARMS_HANGING, [{ ms: 1800, pose: NECK_TILTED }]),
};

// --- Cow face arms: from behind, the top hand drops down the neck and the bottom hand climbs the back to meet it ---

/**
 * Both elbows point well out, the top one high over the head and the bottom one low at the side,
 * so their shapes still show where the forearms pass behind the head and across the back.
 */
const COW_FACE: Pose = {
  ...ARMS_HANGING,
  nearHand: [482, 150, 60],
  farHand: [486, 112, -110],
  elbows: [
    [428, 218],
    [538, 58],
  ],
};

export const COW_FACE_ARMS: FigureClip = {
  ...STANDING_FRONT_CLIP,
  outlineNearArm: true,
  zoom: 1.7,
  focus: [480, 155],
  ...intoHold(ARMS_HANGING, [{ ms: 2000, pose: COW_FACE }]),
};

// --- Behind the back chest opener: hands linked behind, the straight arms lift away from the back ---

const chestOpenerAt = (degrees: number): Pose => ({
  ...STANDING_TALL,
  nearHand: armAt(STANDING_SHOULDER, degrees),
  farHand: armAt(STANDING_SHOULDER, degrees, 8),
});
const CHEST_OPENER_LIFTED: Pose = { ...chestOpenerAt(130), arch: -6, neck: 95 };

export const BEHIND_THE_BACK_CHEST_OPENER: FigureClip = {
  view: 'side',
  straightArms: true,
  zoom: 1.2,
  focus: [480, 230],
  ...intoHold(chestOpenerAt(95), [
    { ms: 1000, pose: chestOpenerAt(110), swing: true },
    { ms: 1500, pose: CHEST_OPENER_LIFTED, swing: true },
  ]),
};

// --- Reverse tabletop: from sitting with the hands behind, the hips lift until the body is flat ---

const TABLETOP_SIT: Pose = {
  hip: [390, 446],
  torso: 115,
  arch: 0,
  neck: 105,
  nearHand: [330, WRIST_Y, 0],
  farHand: [338, WRIST_Y, 0],
  nearFoot: [550, ANKLE_Y, 0],
  farFoot: [558, ANKLE_Y, 0],
};
const TABLETOP: Pose = { ...TABLETOP_SIT, hip: [455, 345], torso: 170, neck: 180 };

export const REVERSE_TABLETOP: FigureClip = {
  view: 'side',
  ...intoHold(TABLETOP_SIT, [{ ms: 1800, pose: TABLETOP }]),
};

// --- Seated shoulder extension: legs long, hands planted behind, the hips slide forward away from them ---

const SHOULDER_EXTENSION_START: Pose = {
  hip: [370, 446],
  torso: 100,
  arch: 0,
  neck: 95,
  nearHand: [330, WRIST_Y, 180],
  farHand: [338, WRIST_Y, 180],
  nearFoot: [569.9, 446, 90],
  farFoot: [569.9, 446, 90],
};
const SHOULDER_EXTENSION: Pose = {
  ...SHOULDER_EXTENSION_START,
  hip: [405, 446],
  torso: 92,
  neck: 90,
  nearFoot: [604.9, 446, 90],
  farFoot: [604.9, 446, 90],
};

export const SEATED_SHOULDER_EXTENSION: FigureClip = {
  view: 'side',
  zoom: 1.4,
  focus: [450, 370],
  ...intoHold(SHOULDER_EXTENSION_START, [{ ms: 1800, pose: SHOULDER_EXTENSION }]),
};

// --- Kneeling wrist stretches: on all fours with the fingers pointing back at the knees, the hips shift back ---

const FINGERS_BACK: Pose = { ...ALL_FOURS, nearHand: [510, 451, 180], farHand: [518, 451, 180] };

export const KNEELING_WRIST_STRETCH: FigureClip = {
  view: 'side',
  ...intoHold(FINGERS_BACK, [{ ms: 1800, pose: { ...FINGERS_BACK, hip: [358, 363], torso: 24, neck: 25 } }]),
};

/** The same, on the backs of the hands, so it leans back less. */
export const REVERSE_PRAYER: FigureClip = {
  view: 'side',
  ...intoHold(FINGERS_BACK, [{ ms: 1800, pose: { ...FINGERS_BACK, hip: [372, 362], torso: 24, neck: 22 } }]),
};

// --- Manual forearm stretches: one arm held out straight, the other hand bending its wrist down ---

const FOREARM_CAMERA = { view: 'side', zoom: 1.5, focus: [560, 180] } satisfies Partial<FigureClip>;

const FOREARM_REACH: Pose = { ...STANDING_TALL, nearHand: [628, 138, 0], farHand: [600, 160, -20] };

/** The other hand presses on the back of the hand, palm down. */
export const MANUAL_EXTENSOR_FOREARM_STRETCH: FigureClip = {
  ...FOREARM_CAMERA,
  ...intoHold(STANDING_TALL, [
    { ms: 1200, pose: FOREARM_REACH, swing: true },
    { ms: 1200, pose: { ...FOREARM_REACH, nearHand: [628, 138, -100], farHand: [628, 124, -100] } },
  ]),
};

/** The other hand pulls the fingers down and back from underneath, palm up. */
export const MANUAL_FLEXOR_FOREARM_STRETCH: FigureClip = {
  ...FOREARM_CAMERA,
  ...intoHold(STANDING_TALL, [
    { ms: 1200, pose: FOREARM_REACH, swing: true },
    { ms: 1200, pose: { ...FOREARM_REACH, nearHand: [628, 138, -110], farHand: [622, 165, 160] } },
  ]),
};
