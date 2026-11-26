# Plie

A stretching and mobility app built with Expo (SDK 58) and Expo Router. iOS and Android only. All data lives on the device in SQLite, with [snapshot backups](#cloud-backups) to Supabase Storage.

## Structure

```
src/
  app/                 Routes (Expo Router)
    _layout.tsx        Root Stack + SQLite provider
    (tabs)/            Dashboard | Start (default tab) | Profile
    edit-profile.tsx   Modal
    new-goal.tsx       Modal
  components/          Shared UI
  constants/theme.ts   Colors (teal accent), spacing, radii
  db/                  Schema/migrations and typed queries per table
  lib/                 Date helpers, profile photo storage
papers/                Open-access sources for the flexibility test norms
```

Schema changes go in `src/db/schema.ts` as a new entry appended to `MIGRATIONS`.

Tests sit next to the code they cover (`*.test.ts(x)`). Database tests run real SQL against an in-memory database from `src/test-utils/sqlite.ts`, which uses Node's built-in `node:sqlite` (Node 22.13 or newer).

## Commands

```bash
npm start                               # dev server (needs the development build installed)
npx expo lint                           # lint
npx tsc --noEmit                        # typecheck
npm test                                # unit and component tests (Jest)
npx expo-doctor                         # check dependencies and config
npm run build:dev                       # new dev build after adding native packages
npm run build:preview                   # build to share by install link (APK)
npm run build:prod                      # store build (AAB)
npm run update:dev -- --message "..."   # over-the-air update; update:preview and update:prod for the others
```

### App variants

The development and production builds are separate apps ([Expo app variants](https://docs.expo.dev/tutorial/eas/multiple-app-variants/), set up in `app.config.ts`), so both can be installed on one device, each with its own data. Production builds an AAB for the store, so it can't be installed directly. The `preview` profile is the production app built as an APK with a shareable install link: same identifier and backup bucket, so it replaces production on a device, with its own update channel:

| Variant | `APP_VARIANT` | Name | Identifier | Scheme |
|---|---|---|---|---|
| Development | `development` | Plie (Dev) | `com.hogos.plie.dev` | `plie-dev` |
| Production | unset | Plie | `com.hogos.plie` | `plie` |

EAS builds get `APP_VARIANT` from their profile in `eas.json`, but `eas update` doesn't read `eas.json`, so an update published without the right `APP_VARIANT` won't match its builds' fingerprint. Use `npm start` and the `update:*` scripts, which set it. They use POSIX `VAR=value` syntax, so on Windows run them from Git Bash or WSL.

## Exercise animations

Exercises are demonstrated by a looping animated figure. The animation engine is being rebuilt, and both engines run side by side while exercises move over one at a time. `ExerciseVideo` (`src/components/exercise-video.tsx`) picks the engine from the clip's `view`: `'3d'` is the new engine, anything else the old one.

| | Old engine | New engine |
|---|---|---|
| Rig | `src/lib/figure-rig.ts` | `src/lib/rig3d.ts` |
| Clips | `src/data/exercise-animations.ts` | `src/data/exercise-animations-3d.ts` |
| Drawing | `src/components/exercise-figure.tsx` | `src/components/exercise-figure-3d.tsx` |
| Tests | `src/lib/figure-rig.test.ts` | `src/lib/rig3d.test.ts` |

**Every new clip goes in the new engine.** The old engine stays only until its clips have moved over.

### Why a new engine

The old engine poses a flat figure in screen coordinates. Anything moving toward or away from the camera has to be faked (`armLengths`, hand-placed `knees` and `elbows`, `widths`), so rotations read as limbs changing length, limbs crossing the body blend into it, and the figure is small in the frame. The new engine poses a skeleton in three dimensions and draws it from a camera each clip chooses.

### How the new engine works

- **Poses are joint angles**, in anatomical terms: `rightArm: { elbow: 90, rotate: 65 }`, `spine: { flex: 70 }`, `rightLeg: { flex: 30, knee: 45 }`. Moving between keyframes turns joints, so hands and feet travel on arcs by themselves. The `Pose3` type in `rig3d.ts` documents every angle and its direction.
- **Pins** hold a wrist or ankle at a spot in the room (hands and feet planted on the floor); the elbow or knee is solved so the bones keep their length. Pin a limb in every pose of a clip or in none.
- **Shoulders shrug.** An arm's `shrug` lifts its shoulder toward the ear, swinging it up on the collarbone and carrying the arm with it, or drops it with a negative angle, pinned arm or not. A shoulder rises a little as its arm goes overhead and drops as its hand reaches for the floor (neck side stretch). The line across the top of the torso runs between the shoulders, so it tips with them. An arm's `protract` slides the shoulder blade round the ribs the same way, swinging the shoulder toward the chest's front, or back toward the spine with a negative angle: on all fours with the arms straight, pulling the blades in sinks the chest between the shoulders and pushing the floor away lifts it (scap mobilization).
- **The room**: x points the way an unturned figure faces, y is up from the floor at 0, z is out to the figure's right. Lengths match the old scene (the head's radius is 30, a shin 100).
- **The camera** is per clip: `yaw` 0 looks at the figure's right side, 90 at its front, 180 at its left; `pitch` 0 is level with the floor, 90 looks straight down. The frame is fitted to the whole movement, so the figure fills it; `fit: 'upper'` frames from the pelvis up, `fit: 'lower'` the pelvis and legs, `fit: 'head'` the head and upper chest with whatever of the arms comes up there (neck side stretch; an arm hanging down the side runs out of the frame) (knee to wall, where the arms on the wall are left out of the frame), and `fit: 'hands'` closes in on the wrists and fingers of hands that have them (finger tendon glides).
- **Draw order** is by depth every frame, and parts are shaded darker the nearer they are, with a background-colored outline so crossing limbs stay apart. The head is ordered against the part of a limb right beside it rather than the limb's average depth, so a head dropping between the arms (cat cow) stays behind the near arm. Limbs go over or under the torso the same way, by where they overlap it: the side of the body the shoulder or hip is on, unless part of the limb comes out clear of the torso's surface further out (an arm across the chest). Passing the middle of the torso isn't enough, or a far thigh lifting forward (marching) flips over the hips partway up. Averages put the high chest in front of a whole leg below it when the camera looks down, which tucked a leg swinging back behind the hips. Square to the camera (a figure seen straight from the front), arms go over the torso and legs under the hips. A clip can name limbs that stay over the torso regardless (`over`): the 90 to 90 rotations do for both legs, whose thighs come off the front of the hips toward the camera and lie out to the side without ever coming clear of them. Turn the camera a little toward the arm or leg that moves if the still one should tuck behind its shoulder or hip, as the shoulder tests do. The head goes over the torso unless the neck points well away from the camera; by average depth, a body lying away from the camera (overhead reach) covered the head and the neck showed through it. Two limbs on the same side of the torso that overlap go by which is in front where they cross, too: hands holding a raised shin (knee to chest) are in front of it there, though the leg lifted toward a camera above it is nearer on average. Where a hand moving to its target would really pass behind a limb, the order follows that, so route it around with a keyframe (knee to chest opens the hands either side of the knee before closing them on the shin). Where two limbs stay against each other, which is nearer is too close to call and they swap places from frame to frame, so a clip can say (`behind: [['rightArm', 'rightLeg']]` draws the first behind the second whenever both are on the same side of the torso): the bottom squat rotation does, to keep both arms in front of the legs. Pairing a limb with the torso keeps it on that side all the way through: `['leftLeg', 'torso']` keeps the Breakdancer's bent leg, which comes off the far hip, under the pelvis though its raised thigh would otherwise come over it, and `['torso', 'head']` keeps the head over the neck seen from behind and above (hip circles), where the back of the head covers the base of the neck though the head's middle is further away. Limbs that really change sides partway through take `behind` on the pose instead, which holds on the way from that pose to the next: in squat to stand the arms hang outside the thighs and end up inside the knees, so the poses from halfway into the fold on say so, and the change comes while the hands are swinging forward clear of the legs. Put such a change where the two limbs are well apart on screen, never where they overlap. The bottom squat names its thighs in `over`, so they stay over the hips standing as well as squatting rather than coming over them partway down, and its arms are `behind`-ordered in front of the thighs, so the elbows show pressing on the knees. Limbs are ordered whole, so an arm that goes behind a knee takes its hand with it; `holds: [{ hand: 'rightHand', limb: 'rightLeg' }]` draws that hand again on its own, over the limb it holds (squat to stand, where the fingers hook over the toes). With `forearm: true` the forearm is drawn again with it, for an arm hooked round another: in the cross-body shoulder stretch the right arm rests in the crook of the left elbow, the left upper arm behind it and the forearm in front, so `behind: [['leftArm', 'rightArm']]` puts the left arm behind and its forearm and hand come over the right arm. A hand resting on the body, reached round from the far side of it, works the same way: `handsOnBody: ['leftHand']` keeps that arm behind the torso the whole way, its shoulder end under the shoulder blade, and draws its forearm and hand again over the torso and legs (Blackburn, where the hands start and end on the lower back). Ordered whole, the far arm comes over the back with its hand, shoulder end and all, and jumps behind the body partway through the sweep. A `behind` pair can name the head as well, and then holds whichever side of the body the limb is on: in the neck side stretch the hand rests on top of the head with its elbow out behind it, so `['rightArm', 'head']` keeps the arm behind the head and `holds: [{ hand: 'rightHand', limb: 'head' }]` draws the hand again over it. With the elbow straight out to the side the forearm crossed the face instead: the head is big next to the arms.
- **Scenery** (`scenery`) is blocks with their sides square to the room, each from one corner to the opposite one: a wall, a box, a table top and its legs. They're drawn behind the figure, over the mat and the shadows, so pick a camera that looks past the figure at them, not through them. For a wall or box the figure faces, that means from a little behind (knee to wall and sit and reach use a negative `yaw`). Scenery doesn't change the frame, so a wall can run off the top of it; the mat reaches under anything standing on the floor. Blocks are drawn far side first along whichever axis separates them, not by the distance to their middles, which put a table's front legs over its top.
- **A strap** (`strap: 'rightFoot'`) loops around the ball of a foot with an end in each hand, drawn over the figure. Pin both hands, and keep them the same distance from the foot in every pose so the strap doesn't stretch (`strapHeldAt` in the clips file does this for the straight leg raise). `strap: { foot: 'rightFoot', hand: 'rightHand' }` puts both ends in one hand instead, for pulling a foot out to the side (back lying reverse pigeon); pin that hand. The loop goes in a half circle around the side of the foot away from the hand, standing clear of the foot so it's drawn around it and not across it. It stands in for a band there: it's drawn the same, and doesn't stretch.
- **A mini band** (`miniBand: 'ankles'` or `'knees'`) is a loop pulled tight around both ankles, or both knees: a half circle around the outside of each leg and two strands across the gap, square to the legs and standing clear of them so it's drawn around them, not across them. It's drawn in the strap's color, the strand in front over the legs and the one behind under them, where it shows only between them (seated hip internal rotation). It stretches with the legs, so nothing needs pinning for it.
- **A band held between the hands** (`handBand: true`) is a towel or band held taut from one hand to the other (shoulder pass-throughs). The hands have to keep the same distance apart for it to look taut, since it doesn't stretch. It runs through the middle of each fist and sticks out past it, and that whole line is drawn under the figure, so the hands look closed around it. While the band is in front of the shoulders, the part between the hands is drawn again over the figure, stopping at each hand's outline, so it crosses the body but still goes under the hands. Behind the shoulders the body hides that part. Put the change where the band is clear of the body, overhead for pass-throughs.
- **What a test is measured with** goes where its instructions put it. `phone` holds it in a hand, in line with the forearm (`bone: 2`), or straps it to the upper arm or thigh (`bone: 0`) or forearm or shin (`bone: 1`), `at` that far along from the shoulder or hip, on the limb's `front`, `back`, `outside` or `inside`. The front of a leg is the kneecap's side, of an arm the side the elbow folds toward; a straight limb takes the body's front. A strapped phone has a strap around the limb behind it, like an armband, and on the far side of the limb it goes under it. Its screen shows the reading in seven-segment digits: how far the phone has turned since the clip's first pose, plus `startReading` (90 for overhead reach, which starts with the arm at the ceiling), so it reads the angle the test measures. `tape` lays a tape measure flat from one point to another, on the floor or a block's top, and the frame takes it in. Every flexibility test measured by angle has a phone, every one measured by distance a tape (`rig3d.test.ts` checks).
- **Thumbs**: a hand is a plain round shape, the same either way up, so a hand pin can say which way the palm faces (`palm`), and the hand gets a thumb on the side it's really on. Sticking out of the hand, it's part of the hand's outline; turned toward the camera it's drawn again over the hand with its own outline, and turned away the hand hides it. Such a hand also has thin lines between its fingers, splitting it into four. They're spread across the hand's width, so they turn with it: apart with the back of the hand or the palm to the camera, closing up as it turns edge on, and gone once the fingers are one behind the other. Give `palm` in every pose or none, and turn it with the forearm (it faces the thigh with the arm hanging, the thumb forward). Only use it where which way the palm faces is what the exercise is about: it's what tells the manual extensor (palm down, thumb hidden) and flexor (palm up, thumb showing) forearm stretches apart.
- **Fingers**: an arm's `fingers` (`{ knuckle, middle, tip }`, degrees of bend at each joint toward the palm) draws a hand with fingers that bend in place of the plain round one, at a real hand's size (`HAND` in `rig3d.ts`, about twice the plain hand's length), so use it with `fit: 'hands'`. The four fingers bend together, as one, and the hand is wide across the knuckles and thin from palm to back, so look at it along the knuckles, from the thumb's or the little finger's side, where the fingers are one behind the other and every bend shows in profile. The fingers bend toward the palm: an arm posed by its angles has the palm facing in, so palms facing each other keep the elbows at the shoulders' width; pin the hand with a `palm` to put it anywhere (finger tendon glides holds the hands up either side of the head, palms in, so the curled fingers stay clear of the face). A pinned hand without a `palm` has no fingers to bend.
- **Dumbbells**: `dumbbells: ['rightHand', 'leftHand']` puts a light dumbbell in each of those hands, its handle across the palm from the thumb's side to the little finger's, so it turns with the hand (Cuban rotation). The hand has to know which way its palm faces: an arm posed by its angles does (in toward the body hanging, turning with the arm from there), and a pinned hand needs its `palm`. It's drawn with its arm, the half beyond the fist further from the camera under the arm and the nearer half over it. The far half is behind the hand and forearm but can be in front of the upper arm (the forearm turned toward the camera halfway round in Cuban rotation): then it goes over the arm, and the forearm and hand are drawn again over it, rather than the weight vanishing into the bicep.
- **A camera that follows**: `follow: true` moves the camera along the room with the figure, keeping the pelvis where it started on screen, for an exercise that travels (inchworm). The mat runs right across the frame, with lines across it that slide by as the figure goes; they're spaced so a whole number fit into the clip's journey, so they're back in place as it loops. The clip loops on screen: its last pose is its first one moved along the room (`shiftedPose`), and the frame is fitted to the figure as the camera sees it.
- **A partner** isn't drawn. `partner: true` puts a "With a partner" badge over the animation instead (the seated hip rotations).
- **Teaching cues**: `highlight` draws the parts the exercise is about in the accent color; `trail` draws the path one hand or foot takes as a dotted line, which helps for rotations and sweeps. It's drawn just under the limb making it, so it shows over the rest of the body behind that limb (the standing leg in leg swings).

### Rules we've settled on

- **Joint angles stay true to the exercise.** If the instructions say the elbow is at 90°, the clip says 90°. When an angle doesn't read well on screen, change the camera, not the angle.
- **Pick the camera that makes the movement readable**, not a default side view. Rotations around a limb read best where the turn sweeps across the screen; the shoulder external rotation test uses `{ yaw: 78, pitch: 40, fit: 'upper' }`.
- **The face has no eyes**, only a nose, and the nose is only drawn where it's needed to tell which way the figure faces:
  - On a face turned toward the camera, it's a line cut into the face: down the bridge, around the tip, and into the nostril on the far side, like a hand-drawn three-quarter nose.
  - In profile (where it would stick out more than 2 units past the head) and from behind, the head is a plain circle. The body already shows which way the figure faces.
  - `nose: false` leaves the head plain all the way through, for a clip where a face turning toward the camera partway through only distracts (open book).
  - `nose: 'drawIn'` draws the nose in down the bridge as a face turning from profile toward the camera brings it inside the head, rather than all at once (pec stretch on the ground). Only for a face that turns: on one held near profile, or tipped down toward the camera, the nose would stay cut short.
- **Highlight the working body part** in every clip, and add a `trail` when the movement is a sweep or rotation.
- **No clipping.** Before handing a clip over, watch it frame by frame from start to finish and fix every place where one part of the body is drawn over another that is really in front of it, or where two parts swap places partway through, even for a frame or two: an elbow over the knee it's behind, a far shoulder over the chest, a hand under the foot it holds, a nose that comes and goes. Print the draw order through the clip (`frameAt(clip, view, t).slots`) every 10ms to find the swaps, since they're easy to miss in stills. Fix it in the pose or the camera first: keep limbs that aren't meant to touch clear of each other on screen, and pick a camera where the layering is simple (straight from the front for a symmetrical squat). Use `over`, `behind` and `holds` for what's left, and add a test that the order holds.
- **Clips loop**: the last keyframe is the first pose again.

### Moving an exercise to the new engine

1. Write the clip in `src/data/exercise-animations-3d.ts`, named after the old one with a `_3D` suffix.
2. Point the exercise's `animation` at it (in `src/data/exercises.ts`, `mobility-tests.ts` or `test-warmup.ts`). Leave the old clip in `exercise-animations.ts` until the new one has been checked on a device, so switching back is a one-line change. Delete the old clip after that.
3. If it's a library exercise, redraw its photo, the still image on its tile in the library, from the new clip, so the tile matches the animation:

   ```bash
   node scripts/render-exercise-photo.mjs CAT_COW_3D assets/images/exercises/cat-cow.png
   ```

   It draws the clip's still frame (`stillFrame`) at 960x540, the way the app draws the figure but without the highlight, over the existing file. The still frame is also what shows when reduced motion is on, so make it the pose that best shows the exercise. Redraw the photo whenever a clip's still frame or camera changes. Keep the file name: a new name with the same image bytes doesn't arrive by over-the-air update.
4. `rig3d.test.ts` picks up every 3D clip used by an exercise and holds it to the same checks: bones never stretch, pinned hands and feet don't slip, nothing goes through the floor, the clip loops, its still frame exists, and everything it shows stays in frame. Add a test for what matters in that exercise (for example, the knees stay planted in cat cow; the elbow stays at the side in shoulder external rotation).
5. Go through the clip for clipping and fix all of it (see "No clipping" above) before handing it over.
6. Check it on a phone before merging, and update the list below.

Tip: the rig is plain TypeScript, so frames can be checked without a device. Import `rig3d.ts` and the clip in Node 22 or newer (`node --experimental-strip-types`, after replacing the `@/` import with a relative path), then write `stageClip(clip)` and `frameAt(clip, view, time)` out as SVG paths in an HTML page and screenshot it in a browser.

### Not in the new engine yet

These block some clips from moving over (see the list below):

- stretchy bands
- the breathing and the head trailing the body that the old engine adds to side views
- a camera that moves during a clip, and phase labels ("hold", "exhale")
- a limb drawn half in front of the torso and half behind it, beyond a forearm resting on the body (`handsOnBody`): limbs are otherwise ordered as a whole, so thread the needle will need limbs split

### Migration status

Moved to the new engine:

| Exercise | Where | Clip |
|---|---|---|
| Cat cow | Library | `CAT_COW_3D` |
| Shoulder external rotation | Flexibility test | `SHOULDER_EXTERNAL_ROTATION_3D` |
| Shoulder abduction | Flexibility test | `SHOULDER_ABDUCTION_3D` |
| Hip abduction | Flexibility test | `HIP_ABDUCTION_3D` |
| Overhead reach | Flexibility test | `OVERHEAD_REACH_3D` |
| Knee to wall | Flexibility test | `KNEE_TO_WALL_3D` |
| Hip external rotation | Flexibility test | `HIP_EXTERNAL_ROTATION_3D` |
| Hip internal rotation | Flexibility test | `HIP_INTERNAL_ROTATION_3D` |
| Sit and reach | Flexibility test | `SIT_AND_REACH_3D` |
| Knee to chest | Flexibility test | `KNEE_TO_CHEST_3D` |
| Straight leg raise | Flexibility test | `STRAIGHT_LEG_RAISE_3D` |
| Marching | Warm-up | `MARCHING_3D` |
| Leg swings | Warm-up | `LEG_SWINGS_3D` |
| 90 to 90 | Library | `NINETY_TO_NINETY_3D` |
| 90 to 90 rotations | Library | `NINETY_TO_NINETY_ROTATIONS_3D` |
| 90 to 90 side foot lifts | Library | `NINETY_TO_NINETY_SIDE_FOOT_LIFTS_3D` |
| Pancake | Library | `PANCAKE_3D` |
| Active pancake | Library | `ACTIVE_PANCAKE_3D` |
| Active straight leg raise | Library | `ACTIVE_STRAIGHT_LEG_RAISE_3D` |
| Ankle mobilization | Library | `ANKLE_MOBILIZATION_3D` |
| Behind the back chest opener | Library | `BEHIND_THE_BACK_CHEST_OPENER_3D` |
| Back lying reverse pigeon | Library | `BACK_LYING_REVERSE_PIGEON_3D` |
| Belly down foot splay | Library | `BELLY_DOWN_FOOT_SPLAY_3D` |
| Bottom squat | Library | `BOTTOM_SQUAT_3D` |
| Bottom squat rotation | Library | `BOTTOM_SQUAT_ROTATION_3D` |
| Squat to stand | Library | `SQUAT_TO_STAND_3D` |
| Cossack squat | Library, warm-up | `COSSACK_SQUAT_3D` |
| Resting Cossack squat | Library | `RESTING_COSSACK_SQUAT_3D` |
| Blackburn | Library | `BLACKBURN_3D` |
| Butterfly | Library | `BUTTERFLY_3D` |
| Cobra to prayer | Library | `COBRA_TO_PRAYER_3D` |
| Downward facing dog | Library | `DOWNWARD_FACING_DOG_3D` |
| Prayer pose | Library | `PRAYER_POSE_3D` |
| Puppy pose | Library | `PUPPY_POSE_3D` |
| Lying knee hug | Library | `LYING_KNEE_HUG_3D` |
| Lying hamstring stretch | Library | `LYING_HAMSTRING_STRETCH_3D` |
| Seated pike stretch | Library | `SEATED_PIKE_STRETCH_3D` |
| Three legged downward facing dog | Library | `THREE_LEGGED_DOWNWARD_FACING_DOG_3D` |
| Standing forward fold | Library | `STANDING_FORWARD_FOLD_3D` |
| Kneeling wrist stretch | Library | `KNEELING_WRIST_STRETCH_3D` |
| Floor angels | Library | `FLOOR_ANGELS_3D` |
| Reverse tabletop | Library | `REVERSE_TABLETOP_3D` |
| Knight stretch | Library | `KNIGHT_STRETCH_3D` |
| Horse stance | Library | `HORSE_STANCE_3D` |
| Lying windshield wiper hold | Library | `LYING_WINDSHIELD_WIPER_HOLD_3D` |
| Frog stretch | Library | `FROG_STRETCH_3D` |
| Frog rocks | Library | `FROG_ROCKS_3D` |
| Knight to hamstring | Library | `KNIGHT_TO_HAMSTRING_3D` |
| Couch stretch | Library | `COUCH_STRETCH_3D` |
| Pyramid stretch | Library | `PYRAMID_STRETCH_3D` |
| Wrist rocks | Library | `WRIST_ROCKS_3D` |
| Elephant walk | Library | `ELEPHANT_WALK_3D` |
| Seated straddle side bend | Library | `SEATED_STRADDLE_SIDE_BEND_3D` |
| Seated shoulder extension | Library | `SEATED_SHOULDER_EXTENSION_3D` |
| Half kneeling frog stretch | Library | `HALF_KNEELING_FROG_STRETCH_3D` |
| Neck side stretch | Library | `NECK_SIDE_STRETCH_3D` |
| Cross-body shoulder stretch | Library | `CROSS_BODY_SHOULDER_STRETCH_3D` |
| Overhead triceps stretch | Library | `OVERHEAD_TRICEPS_STRETCH_3D` |
| Cow face arms | Library | `COW_FACE_ARMS_3D` |
| Pigeon stretch | Library | `PIGEON_STRETCH_3D` |
| Hip circles | Library | `HIP_CIRCLES_3D` |
| The Breakdancer | Library | `THE_BREAKDANCER_3D` |
| Scap mobilization | Library | `SCAP_MOBILIZATION_3D` |
| Lizard pose | Library | `LIZARD_POSE_3D` |
| Figure four stretch | Library | `FIGURE_FOUR_STRETCH_3D` |
| Manual extensor forearm stretch | Library | `MANUAL_EXTENSOR_FOREARM_STRETCH_3D` |
| Manual flexor forearm stretch | Library | `MANUAL_FLEXOR_FOREARM_STRETCH_3D` |
| Downward facing dog to cobra | Library | `DOWNWARD_FACING_DOG_TO_COBRA_3D` |
| Finger tendon glides | Library | `FINGER_TENDON_GLIDES_3D` |
| Cuban rotation | Library | `CUBAN_ROTATION_3D` |
| Half spinal twist | Library | `HALF_SPINAL_TWIST_3D` |
| Half-twisted lizard | Library | `HALF_TWISTED_LIZARD_3D` |
| Open book | Library | `OPEN_BOOK_3D` |
| Inchworm | Warm-up | `INCHWORM_3D` |
| Pec stretch on the ground | Library | `PEC_STRETCH_ON_THE_GROUND_3D` |
| Reverse clamshells | Library | `REVERSE_CLAMSHELLS_3D` |
| Reverse scorpion | Library | `REVERSE_SCORPION_3D` |
| Seated hip internal rotation | Library | `SEATED_HIP_INTERNAL_ROTATION_3D` |
| Shoulder pass-throughs | Library | `SHOULDER_PASS_THROUGHS_3D` |

Still on the old engine (clip names in `exercise-animations.ts`). Where a clip needs something the new engine doesn't have yet, it's noted.

All ten flexibility tests are on the new engine. The last six to move (knee to wall, the two seated hip rotations, sit and reach, knee to chest and straight leg raise) haven't been checked on a device yet, so their old clips are still in `exercise-animations.ts`; delete them once they have. The same goes for the three 90 to 90 clips in the library (`NINETY_TO_NINETY_ROTATIONS` has to stay either way: windshield wipers with knee lift is built on it), and for the two pancake clips (`PANCAKE_UP` has to stay either way: the seated straddle side bend is built on it), and for the active straight leg raise, ankle mobilization, the behind the back chest opener, back lying reverse pigeon, belly down foot splay, the five squats (bottom squat, bottom squat rotation, squat to stand, Cossack squat and resting Cossack squat), Blackburn, butterfly, cobra to prayer, downward facing dog, prayer pose, puppy pose, lying knee hug, lying hamstring stretch, seated pike stretch, three legged downward facing dog, standing forward fold, kneeling wrist stretch, floor angels, reverse tabletop, knight stretch, horse stance, the lying windshield wiper hold, frog stretch, frog rocks, knight to hamstring, couch stretch, pyramid stretch, wrist rocks, elephant walk, the seated straddle side bend, seated shoulder extension, the half kneeling frog stretch, the neck side stretch, the cross-body shoulder stretch, the overhead triceps stretch, cow face arms, the pigeon stretch, hip circles, the Breakdancer, scap mobilization, the lizard pose, the figure four stretch, the two manual forearm stretches, downward facing dog to cobra, Cuban rotation, the half spinal twist, the half-twisted lizard, open book, inchworm, the pec stretch on the ground, reverse clamshells, reverse scorpion, seated hip internal rotation, shoulder pass-throughs and finger tendon glides (`FINGER_TENDON_GLIDES` is still checked by `figure-rig.test.ts` and `exercise-video.test.tsx` until then).

Library (`src/data/exercises.ts`):

| Exercise | Clip | Needs |
|---|---|---|
| Side-lying external rotation | `SIDE_LYING_EXTERNAL_ROTATION` | dumbbell |
| Sleeper stretch | `SLEEPER_STRETCH` | |
| The Sagittarius | `THE_SAGITTARIUS` | |
| Thread the needle | `THREAD_THE_NEEDLE` | limbs split in front of and behind the torso |
| Windshield wipers with knee lift | `WINDSHIELD_WIPERS_WITH_KNEE_LIFT` | |
| World's greatest stretch | `WORLDS_GREATEST_STRETCH` | |

## Exercise reminders

Settings has a list of reminder times, each with its own days of the week and on/off switch. They're stored in the `reminders` table, so backups include them. `src/lib/reminders.ts` matches the scheduled local notifications to that table whenever it changes and whenever the app opens, with one weekly trigger per selected day. Reminders show while the app is open, and tapping one goes to the Start tab, except during a workout or flexibility test.

With no reminders set, pressing Done after a workout suggests adding one (`src/lib/reminder-prompt.ts`). "Don't ask again" is permanent; "Later" and going to Settings wait three workouts.

## Cloud backups

SQLite stays the only live database. `src/lib/backup.ts` uploads a copy of the whole file to a private Supabase Storage bucket, plus the profile photo: about 5 seconds after any change, and when the app opens or goes to the background if an earlier upload didn't finish. There's one snapshot per day with the last 7 kept, but the app only ever restores the latest. The older ones are a safety net for a bad change that got backed up: download one from the bucket in the Supabase dashboard if you ever need it. Before each upload the app runs SQLite's integrity check, so a damaged database is never backed up over a good one. Profile photos no kept snapshot can show are deleted after each backup. Postgres isn't used, so new tables and columns need no backup changes, and restoring an old snapshot runs the normal migrations.

Each variant has its own bucket, chosen from the installed app's ID (`BUCKETS` in `src/lib/backup.ts`), so development data stays out of production however the dev server was started. Inside a bucket, each user can only reach a folder named after their user ID (`supabase/setup.sql`):

| Variant | App ID | Bucket |
|---|---|---|
| Development | `com.hogos.plie.dev` | `backups-dev` |
| Production | `com.hogos.plie` | `backups-prod` |

The app opens on a login screen (`src/app/login.tsx`) until the phone is signed in, so nothing can be recorded that restoring a backup would then wipe. There are no passwords: Supabase emails a 6-digit code, and entering it signs in. A new email creates a user and a known one signs back into it. The user's ID names their folder, so the same email on a reinstalled or new phone reaches the same backups. Anyone who controls an inbox can reach that person's backups, so the email is effectively the password.

Right after signing in, the app restores the latest backup if there is one, behind a spinner, then shows "Welcome back" with the first name and any profile photo for 2 seconds before opening. Someone with no backup and no name on the phone is new: they fill in a short profile (first name, date of birth and sex at birth are required, since test scores compare against them), see "Welcome" and the app starts backing up. The name also goes to the user's Supabase account as `display_name`, for the dashboard; the app itself never reads it back. Sign out in Settings uploads a final backup, then erases the phone's data on the restart that follows, so the next person to sign in starts clean and signing back in restores everything. If that backup fails, the phone stays signed in with nothing removed. Only a phone with changes of its own that were never backed up (one that used an older build without signing in, or whose session ended) asks first: restore, or keep the phone's data, which replaces the backup. Once signed in, the session stays on the phone and renews itself, so the login screen doesn't come back and the app works offline. Backups are always on; Settings shows the last one, any error, and buttons to back up now or restore the latest. If Supabase ever ends the session for good (say, the user was deleted), the phone unlinks and returns to the login screen. Builds without Supabase settings, like Expo Go, skip the login screen.

The root layout gates the app with `Stack.Protected`. Expo Router shows any route not listed in the layout to everyone, so every new screen must be added there; `src/routes.test.ts` fails if one is missing.

The publishable key ships in the app, so anyone who extracts it can sign up with an inbox they control and upload to their own folder. They can't read or change anyone else's data (the policies check the folder against the user ID), but they could fill the bucket. Bucket limits (50 MB per file, binary only) and Supabase's email rate limits bound that; watch storage usage in the dashboard. If it's abused, the next step is gating sign-up behind invite codes (an Edge Function that trades a code for a session, with sign-ups turned off).

Separate buckets mean a bug that sent the dev build to the production bucket would still only reach that user's own folder there.

Settings showing the last backup and any error is also how you'd notice the free project being paused after a week of inactivity. The app keeps working locally if so; restore the project from the dashboard and backups resume. A fresh install can't sign in while the project is paused, though, so it stays on the login screen until then.

### Setup

1. Create a Supabase project.
2. Under Authentication:
   - Turn on new user sign-ups and the email provider, and leave anonymous sign-ins off.
   - In the "Magic Link" and "Confirm signup" email templates, include the code with `{{ .Token }}`. The app has no deep links, so a link alone can't sign anyone in. Existing emails get the first template, new ones the second.
   - Supabase's built-in email sender only delivers to members of your Supabase organization. To let friends sign in, set up custom SMTP (Resend, Postmark and SES have free tiers) or invite each friend to the organization.
3. Run `supabase/setup.sql` in the SQL editor.
4. Copy `.env.example` to `.env.local` and fill it in, for the dev server.
5. Add the same two values to EAS for builds and updates, once per variable and value:

   ```bash
   npx eas-cli@latest env:set --environment development --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL --value "..."
   ```

6. Make new builds with `npm run build:dev` and `npm run build:preview`, then sign in with your email. Use a different email for dev and prod, or the same: either way each variant has its own bucket.

## Feedback

Signed-in users can send feedback from Settings (About, Send feedback), and report a problem from a flag button in two places: with an exercise during a workout or warm-up, which pauses it first, and with a flexibility test while measuring, in the header. All three open `src/app/feedback.tsx`. A report picks a reason with optional details. Exercises offer caused pain, instructions unclear, video doesn't match, too hard, too easy and other. Tests offer measurement seems wrong, phone measuring didn't work, instructions unclear, can't get into position, caused pain, video doesn't match and other, and the email also gives the side and the reading on screen. General feedback is a message. Phones used offline, and builds without Supabase settings, don't show any of these buttons.

The app calls the `send-feedback` Edge Function, which checks the session and emails the report to your Gmail inbox, with the user's email as Reply-To so you can answer them directly. The SMTP settings under Authentication only send Auth emails (the sign-in codes), so the function connects to Gmail itself, on port 465: Edge Functions can't connect out on 25 or 587. Gmail allows about 500 emails a day.

To set it up, with a Gmail [app password](https://myaccount.google.com/apppasswords) (the same kind the Auth SMTP settings use):

```bash
supabase secrets set GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
supabase functions deploy send-feedback
```

Then send yourself one from Settings to check it arrives. If it doesn't, the function's logs in the Supabase dashboard say why.

## Mobility score and its sources

Each flexibility test result is scored against published data on healthy adults, so a score means the same thing as it would in a physio's clinic rather than an arbitrary scale.

### How a result is scored

1. Every test in `src/data/mobility-tests.ts` has a `norm`: the average result and standard deviation for men and for women at one or more ages. Between two ages they change in a straight line; younger than the first age and older than the last, they stay at that age's values. Knee to wall has seven age groups from its study. The other tests' studies give young adults' values and a change per decade, so their norms (`decliningNorm`) hold steady to 30 and change by that amount each decade until 80.
2. A result is compared with the norm for the person's sex (from their profile; both sexes averaged when it's not set or not male/female) and their age on the day of the test (no date of birth counts as the norm's youngest age).
3. The score is the percentile the result falls at, assuming results are normally distributed: `score = Φ((result − mean) / sd) × 100`. 50 is average, 84 is one standard deviation better than average.
4. Each side is scored on its own; a test scores the average of its sides, an area the average of its tests, and the overall score the average of its areas (`src/data/mobility-score.ts`). Area and overall scores are average scores, not percentiles themselves: scoring 84 on every test is rarer than 84% of people, since few people are one SD above average on everything.
5. Phone measurements are taken twice and saved as the average (`PHONE_READINGS` in `src/components/test-measurement.tsx`). If the two readings are further apart than measurement error explains 95% of the time (`maxReadingGap`: 1.96 × √2 × the test's measurement error, 17° for shoulder abduction and 7° for hip abduction), they aren't averaged: the app says how far apart they were and asks to measure again, with an option to use the average anyway. Distance tests are measured once: knee to wall already searches for the furthest position, and sit and reach takes the best of three like its norms.

### Changes between tests

Measuring the same person twice never gives quite the same result, so small score changes are mostly noise. Every test has a `measurementError`: its standard error of measurement, from studies that retested healthy adults (see the sources table below). A result's error in score points is that error times how steeply the score climbs at that result (`scoreError`), so the same error moves a score most near average and barely at either end. Errors are combined the same way as the scores, taking each measurement's error to be independent, so an area or overall score built from many measurements is steadier than any one test.

A change counts as real when it's bigger than 1.96 times the two scores' errors combined (`compareScores`), which measurement error alone would beat less than 5% of the time. Smaller changes show as "No real change" (or "Same" under the area bars), and real ones in points, such as "+12 pts". On the score screen and test results, tapping "No real change" explains why, with how many points measuring alone could have moved the score (`explainNoRealChange`).

The errors are from clinicians or researchers measuring, mostly retesting days to a week apart. Self-measuring with a phone probably adds some error, and averaging two readings takes some away, so the cut-off is a reasonable guide rather than exact.

Scores fall into bands by percentile (`scoreBand`), the same cut-offs used for clinical percentile norms. Area and overall scores use the same bands, which read as "average across the tests" rather than an exact share of people:

| Score | Band |
|---|---|
| 90–100 | Well above average |
| 75–90 | Above average |
| 25–75 | Average (the middle half of adults) |
| 10–25 | Below average |
| 0–10 | Well below average |

### Tests by area

Each test counts towards one area (its `area` in `src/data/mobility-tests.ts`). All areas count equally towards the overall score, so a test's share of the overall score depends on how many other tests are in its area.

| Area | Tests (movement) | Share of overall per test |
|---|---|---|
| Shoulders | Shoulder abduction (abduction), Shoulder external rotation (external rotation), Overhead reach (flexion) | 1/12 each |
| Hips | Hip external rotation, Hip internal rotation, Knee to chest (flexion), Hip abduction | 1/16 each |
| Hamstrings | Sit and reach (forward fold), Straight leg raise (leg raise) | 1/8 each |
| Ankles | Knee to wall (dorsiflexion) | 1/4 |

Every test except sit and reach is measured on both sides, and its score is the average of left and right.

### Norms per test

Evidence levels: **strong** is a large normative study of the same movement; **moderate** is the standard clinical value or a smaller study, where the full tables of a large study weren't available; **limited** is estimated from small studies, and should be replaced when better data turns up.

Averages are for adults up to 30, and the per-decade column is the change after that, except for knee to wall, which has its own age table below.

| Test | Average (men / women) | SD (men / women) | Per decade (men / women) | Evidence | Source |
|---|---|---|---|---|---|
| Knee to wall | 11.0 / 11.3 cm at 18–29 | 3.6 / 3.0 cm | By age group, see below | Strong | Weight-bearing lunge, big toe to wall; 899 adults in Canada, Spain and Iran, by seven age groups and sex [1]. Matches 400 young women in India (11.2 / 10.4 cm right / left) [2] |
| Shoulder abduction | 156° / 157° | 15° | −5° / −4° | Strong | Active, standing, inclinometer; 2404 adults without shoulder pain, by five-year age group and sex [3] |
| Shoulder external rotation | 62° / 72° | 16° | −3° / −4° | Moderate | Active, standing with the elbow at the side; same 2404 adults [3], but judged by eye to the nearest 5°, where the app measures it |
| Hip external rotation | 41.5° / 42.5° | 7.1° / 7.4° | −1.7° / −1.1° | Strong | Seated, with an examiner rotating the leg, as a partner does in the app; 987 adults aged 19–32 [10]. 151 adults aged about 22 measured much the same (43° / 40°) [4]. Decline from the US national health survey, 1683 adults aged 25–74 [7] |
| Hip internal rotation | 43° / 43.5° | 7.6° / 7.9° | −1° / −1° | Strong | Seated, with an examiner rotating the leg; 987 adults aged 19–32 [10]. 151 adults aged about 22 had a bigger gap between the sexes (41° / 47°) [4]. Decline from the US national health survey [7] |
| Sit and reach | −1.5 / +5 cm past the toes | 10 / 9.6 cm | −1.1 / −0.6 cm | Strong | Canadian Health Measures Survey 2016–17, a national sample, percentiles by five-year age group and sex [5] |
| Knee to chest | 130° / 134° | 7.8° / 8.2° | −1.5° / −1.2° | Strong | Supine hip flexion, 674 healthy people by age and sex [6]; SD and decline worked out from the study's raw data |
| Straight leg raise | 68.5° / 76.3° | 6.8° / 9.5° | 0° / 0° | Strong | Passive, lying on the back, stopping at firm resistance; 214 adults aged 20–79, by decade and sex, with no change with age [9]. A machine pushing to the most people could bear went 11–13° further [8] |
| Hip abduction | 41° / 40° | 8.3° / 7.4° | −1.8° / −0.9° | Strong | Active, lying on the back, goniometer; 987 adults aged 19–32 [10]. Decline from the US national health survey, measured the same way [7] |
| Overhead reach | 166° / 165° | 13° | −4° / −4° | Strong | Active flexion, inclinometer; 2404 adults without shoulder pain [3] |

Knee to wall by age group [1, table 1], mean ± SD in cm. Each group counts as its average age, so a 30-year-old is compared with values between the first two rows:

| Age group (average age) | Men | Women |
|---|---|---|
| 18–29 (25) | 11.0 ± 3.6 | 11.3 ± 3.0 |
| 30–39 (34) | 11.2 ± 3.8 | 11.4 ± 3.0 |
| 40–49 (44) | 11.0 ± 3.2 | 10.4 ± 2.7 |
| 50–59 (54) | 10.4 ± 3.6 | 9.5 ± 2.6 |
| 60–69 (64) | 9.5 ± 3.3 | 8.0 ± 2.6 |
| 70–79 (75) | 7.4 ± 2.3 | 6.5 ± 2.2 |
| 80+ (84) | 6.6 ± 2.0 | 5.7 ± 1.7 |

How the numbers were derived:

- **Knee to wall**: the study measured the dominant foot only, since it found no difference between feet. The app scores each foot against the same values.
- **Sit and reach**: the survey's flexometer puts the feet at the 26 cm mark, so its medians for ages 20–29 (24.5 cm men, 31.1 cm women) are 1.5 cm short of and 5.1 cm past the toes. Each sex's SD is its 10th–90th percentile spread divided by 2.563, which is how far apart those percentiles are in a normal distribution: 10.0 cm for men and 9.6 cm for women. The survey's percentiles fit a normal distribution closely (its 5th percentile for men is 8.8 cm; the normal model gives 8.2 cm).
- **Gill 2020 tests**: averages of the left and right sides for ages 20–29 (external rotation) or 20–44 (abduction, flexion), and the decline is the drop to ages 65–69 spread over the decades in between.
- **Knee to chest**: from the CDC study's raw data (`papers/cdc-normal-rom-dataset.xls`, both sides of everyone measured): 130.4° ± 7.8 for men and 133.8° ± 8.2 for women aged 20–44, and the decline is a straight line fitted to everyone aged 30–69.
- **Straight leg raise**: Youdas's averages over all ages, both sides (68.5 ± 6.8° men, 76.3 ± 9.5° women). Its decades differ by no more than chance (men 65–71°, women 74–78°), so there's no decline. Youdas stopped where the examiner felt firm resistance and the person agreed, which is the firm stretch the app asks for. Marshall & Siegler's machine went on to the most each person could bear (79.4 ± 17.8° men, 89.4 ± 12.4° women), so it measures stretch tolerance as well, which is why its spread is so much wider. Youdas recruited from a hospital fitness centre and left out people with a BMI of 30 or more, so its averages may be a little above the general population's.
- **Hip rotation and abduction**: Hallaçeli 2014's averages for men and women (41.5 ± 7.1° and 42.4 ± 7.4° external rotation, 42.9 ± 7.6° and 43.6 ± 7.9° internal rotation, both passive and seated; 40.9 ± 8.3° and 40.1 ± 7.4° abduction, active and lying on the back). Their study also measured passive abduction and active rotation, which differ from these by 5–6°, so the right column has to match how the app's test is done. Rotation lying face down is 3–10° more again [4].
- **Hip decline with age**: from Roach & Miles's tables by sex, race and age group [7, tables 4–7], the drop in the mean from ages 25–39 to 60–74 (about 32 to 67, so 3.5 decades), with white and Black adults averaged by group size. Men: external rotation 32.8° → 27.0°, internal rotation 33.7° → 30.0°, abduction 45.1° → 38.8°. Women: external rotation 35.1° → 31.1°, internal rotation 31.7° → 28.1°, abduction 42.7° → 39.4°. Their rotation was active and the app's is passive, so the decline is assumed to be the same number of degrees either way. Results were rounded to 5°, which blurs single results but not group averages.

### Measurement error per test

Standard error of measurement (`measurementError`), used to tell real changes from noise. Where studies differ, the larger error is used.

| Test | Error | Source |
|---|---|---|
| Knee to wall | 0.7 cm | Smallest real change of 1.9 cm for the same person measuring again, across 12 studies [11], divided by 1.96 × √2 |
| Shoulder abduction | 6.3° | Phone, standing, the same person measuring again [12] |
| Shoulder external rotation | 3.3° | Phone, standing, the same person measuring again [12] |
| Overhead reach | 2.7° | Phone, the same person measuring again [12] |
| Hip external rotation | 2.8° | Phone, seated, the same person measuring again [12] |
| Hip internal rotation | 3.4° | Phone, seated, the same person measuring again [12] |
| Knee to chest | 3.9° | Goniometer, retested a week apart [13]; 2.3° with a phone [12] |
| Hip abduction | 2.4° | Goniometer, retested a week apart [13] |
| Straight leg raise | 3.6° | Inclinometer on the thigh, retested 3 days apart [14] |
| Sit and reach | 1.6 cm | Retested 3 days apart [14] |

### Caveats

- The hip rotation, knee to chest and straight leg raise norms were measured by a clinician or a machine moving the joint for the person (passive range). Hip rotation is done the same way in the app, with a partner; knee to chest is pulled in with your own hands, and the straight leg raise with a towel or belt. Something that doesn't stretch is closest to a clinician's hand: an elastic band lets the leg drift a few degrees at the top. The shoulder, hip abduction, knee-to-wall and sit-and-reach norms were active, like the app. Where both were measured, active range is 5–6° less than passive [10].
- Results are assumed to be normally distributed. Some aren't: shoulder flexion piles up near 180°, so overhead reach can't score much above 86.
- Every test starts with the same warm-up (`src/data/test-warmup.ts`): a minute of marching, then about five minutes of dynamic moves for the ankles, hips, hamstrings and shoulders, with no static holds. A warm-up raises range of motion for a while, so doing the same one every time keeps results comparable from test to test. Most norms were measured without a warm-up, though, so scores may read slightly high against them.
- Norms for children and teenagers aren't modelled; anyone younger than a norm's youngest age is compared with that age.
- The hip rotation and abduction norms combine two studies: averages from adults aged 19–32 [10], and the decline with age from a US survey 1971–75 that stopped at 74 [7]. Past 74 the decline is carried on in a straight line.

Copies of the sources are in `papers/` (see its README).

### References

1. McBride S, et al. International normative values for the weight-bearing lunge test across age and sex in 899 healthy adults. *Musculoskelet Sci Pract*. 2026;82:103525. Open access (CC BY). [doi:10.1016/j.msksp.2026.103525](https://doi.org/10.1016/j.msksp.2026.103525)
2. Nambiar A, et al. Normative values of weight bearing lunge test among non-athlete females: a criterion based study. *RGUHS J Physiother*. 2024;4(1). [doi:10.26463/rjpt.4_1_4](https://doi.org/10.26463/rjpt.4_1_4)
3. Gill TK, et al. Shoulder range of movement in the general population: age and gender stratified normative data using a community-based cohort. *BMC Musculoskelet Disord*. 2020;21:676. [PMC7549223](https://pmc.ncbi.nlm.nih.gov/articles/PMC7549223/)
4. Han H, et al. Hip rotation range of motion in sitting and prone positions in healthy Japanese adults. *J Phys Ther Sci*. 2015;27(2):441–445. [PMC4339156](https://pmc.ncbi.nlm.nih.gov/articles/PMC4339156/)
5. Statistics Canada. Sit-and-reach percentile values by age group and sex, Canadian Health Measures Survey cycle 5 (2016–2017). *Health Reports*. 2019;30(10). [Table 3](https://www150.statcan.gc.ca/n1/pub/82-003-x/2019010/article/00002/tbl/tbl03-eng.htm)
6. Soucie JM, et al. Range of motion measurements: reference values and a database for comparison studies. *Haemophilia*. 2011;17(3):500–507. [PubMed 21070485](https://pubmed.ncbi.nlm.nih.gov/21070485/), [CDC tables](https://archive.cdc.gov/www_cdc_gov/ncbddd/jointrom/index.html), [raw data](https://web.archive.org/web/2019id_/https://www.cdc.gov/ncbddd/jointrom/documents/Normal-Dataset.xls) (the CDC's own download link is broken)
7. Roach KE, Miles TP. Normal hip and knee active range of motion: the relationship to age. *Phys Ther*. 1991;71(9):656–665. [PubMed 1881956](https://pubmed.ncbi.nlm.nih.gov/1881956/)
8. Marshall PWM, Siegler JC. Lower hamstring extensibility in men compared to women is explained by differences in stretch tolerance. *BMC Musculoskelet Disord*. 2014;15:223. [PMC4105123](https://pmc.ncbi.nlm.nih.gov/articles/PMC4105123/)
9. Youdas JW, et al. The influence of gender and age on hamstring muscle length in healthy adults. *J Orthop Sports Phys Ther*. 2005;35(4):246–252. [PubMed 15901126](https://pubmed.ncbi.nlm.nih.gov/15901126/)
10. Hallaçeli H, et al. Normal hip, knee and ankle range of motion in the Turkish population. *Acta Orthop Traumatol Turc*. 2014;48(1):37–42. Open access (CC BY-SA). [doi:10.3944/AOTT.2014.3113](https://doi.org/10.3944/AOTT.2014.3113)
11. Powden CJ, Hoch JM, Hoch MC. Reliability and minimal detectable change of the weight-bearing lunge test: a systematic review. *Man Ther*. 2015;20(4):524–532. [doi:10.1016/j.math.2015.01.004](https://doi.org/10.1016/j.math.2015.01.004) (figures from the abstract)
12. Keogh JWL, et al. Reliability and validity of clinically accessible smartphone applications to measure joint range of motion: a systematic review. *PLoS One*. 2019;14(5):e0215806. [PMC6505893](https://pmc.ncbi.nlm.nih.gov/articles/PMC6505893/). Its table 3 gives the errors of Shin et al. 2012 (shoulder) and Charlton et al. 2015 (hip)
13. Nussbaumer S, et al. Validity and test-retest reliability of manual goniometers for measuring passive hip range of motion in femoroacetabular impingement patients. *BMC Musculoskelet Disord*. 2010;11:194. [PMC2942800](https://pmc.ncbi.nlm.nih.gov/articles/PMC2942800/)
14. Liu H, et al. Psychometric properties of four common clinical tests for assessing hamstring flexibility in young adults. *Front Physiol*. 2022;13:911240. [PMC9240627](https://pmc.ncbi.nlm.nih.gov/articles/PMC9240627/)
