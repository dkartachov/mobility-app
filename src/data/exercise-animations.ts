import type { Extremity, FigureClip, HandClip, HandPose, Point, Pose } from '@/lib/figure-rig';

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

// --- Active V-sit: seen from the front, so the wide legs show. The torso folds toward the camera ---

const V_SIT_UP: Pose = {
  hip: [480, 425],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [440, 430, -90],
  farHand: [520, 430, -90],
  nearFoot: [270, 452, 110],
  farFoot: [690, 452, 70],
};
const V_SIT_FOLDED: Pose = {
  ...V_SIT_UP,
  torsoLength: 55,
  neck: -90,
  nearHand: [440, 495, -90],
  farHand: [520, 495, -90],
};

export const ACTIVE_V_SIT: FigureClip = {
  view: 'above',
  widths: { shoulder: 30, hip: 14 },
  legBends: [-1, 1],
  armBends: [-1, 1],
  stillFrame: 1,
  keyframes: [
    { ms: 0, pose: V_SIT_UP },
    { ms: 1600, pose: V_SIT_FOLDED },
    { ms: 400, pose: V_SIT_FOLDED },
    { ms: 1600, pose: V_SIT_UP },
    { ms: 300, pose: V_SIT_UP },
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

// --- Windshield wipers: from the front, feet planted wide, both knees tip side to side ---

const WIPERS_BASE = {
  hip: [480, 400],
  torso: 90,
  arch: 0,
  neck: 90,
  nearHand: [400, 400, -90],
  farHand: [560, 400, -90],
  nearFoot: [370, 470, 180],
  farFoot: [590, 470, 0],
} satisfies Partial<Pose>;

const WIPERS_RIGHT: Pose = {
  ...WIPERS_BASE,
  knees: [
    [500, 400],
    [620, 430],
  ],
};
const WIPERS_UP: Pose = {
  ...WIPERS_BASE,
  knees: [
    [410, 320],
    [550, 320],
  ],
};
const WIPERS_LEFT: Pose = {
  ...WIPERS_BASE,
  knees: [
    [340, 430],
    [460, 400],
  ],
};

export const WINDSHIELD_WIPERS: FigureClip = {
  view: 'above',
  widths: { shoulder: 28, hip: 16 },
  armBends: [-1, 1],
  stillFrame: 0,
  keyframes: [
    { ms: 0, pose: WIPERS_RIGHT },
    { ms: 1000, pose: WIPERS_UP, ease: 'in' },
    { ms: 1000, pose: WIPERS_LEFT, ease: 'out' },
    { ms: 300, pose: WIPERS_LEFT },
    { ms: 1000, pose: WIPERS_UP, ease: 'in' },
    { ms: 1000, pose: WIPERS_RIGHT, ease: 'out' },
    { ms: 300, pose: WIPERS_RIGHT },
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
