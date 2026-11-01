import type { Extremity, FigureClip, Pose } from '@/lib/figure-rig';

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
