import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

import {
  clipDuration,
  figureViewBox,
  FINGER,
  floorMarks,
  HEAD_RADIUS,
  keyframeTime,
  livePoseAt,
  poseAt,
  SCENE,
  solveFigure,
  solveFinger,
  travelAt,
  TORSO_SKIN,
  type FigureClip,
  type HandClip,
} from '@/lib/figure-rig';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

// The same fixed palette as the exercise photos, which don't change with the theme either. The
// figure gets darker toward the camera: the far limbs, then the body, then the near limbs, so a limb
// crossing the body still shows.
const COLORS = {
  background: '#E3EEEC',
  ground: '#D8E6E3',
  mat: '#D0E6E2',
  near: '#0B776C',
  body: '#0F8F82',
  far: '#7DC4BA',
  shadow: '#0B3B36',
  band: '#D9443B',
  scenery: '#BCD3CF',
  weight: '#3E4F4C',
};

const VIEW_BOX = `0 0 ${SCENE.width} ${SCENE.height}`;

/**
 * Loops a clip's time for as long as it's on screen, or holds its key pose if reduced motion is on.
 * While not `playing` it waits on its first frame, and starts from the beginning once it is.
 * While `paused` it freezes where it is, and carries on from that frame once it isn't.
 */
function useClipTime(clip: FigureClip | HandClip, playing: boolean, paused: boolean) {
  const reducedMotion = useReducedMotion();
  const time = useSharedValue(keyframeTime(clip, clip.stillFrame));

  useEffect(() => {
    time.set(reducedMotion ? keyframeTime(clip, clip.stillFrame) : 0);
  }, [clip, playing, reducedMotion, time]);

  useEffect(() => {
    if (reducedMotion || !playing || paused) return;
    const duration = clipDuration(clip);
    const easing = Easing.linear;
    // Runs on the UI thread, after the reset above, so it reads the frame a pause stopped on.
    scheduleOnUI(() => {
      const from = time.get() % duration;
      const loop = withRepeat(withSequence(withTiming(0, { duration: 0 }), withTiming(duration, { duration, easing })), -1, false);
      time.set(from === 0 ? loop : withSequence(withTiming(duration, { duration: duration - from, easing }), loop));
    });
    return () => cancelAnimation(time);
  }, [clip, playing, paused, reducedMotion, time]);

  return time;
}

type PlaybackProps = { playing?: boolean; paused?: boolean };

export function ExerciseFigure({ clip, playing = true, paused = false }: { clip: FigureClip } & PlaybackProps) {
  const time = useClipTime(clip, playing, paused);
  const viewBox = figureViewBox(clip);

  // Only the side profile has its drawn body so far. Seen from the front or from above, the figure
  // is still the plain one: round lines along its bones, moving exactly as the clip says.
  const shaped = clip.view === 'side' && !clip.widths;

  // Reduced motion holds the clip's key pose exactly as it was drawn, without a breath in it.
  const reducedMotion = useReducedMotion();
  const figure = useDerivedValue(() =>
    solveFigure(shaped && !reducedMotion ? livePoseAt(clip, time.get()) : poseAt(clip, time.get()), clip)
  );

  const marks = useAnimatedProps(() => ({ d: clip.follow ? floorMarks(travelAt(clip, time.get())) : '' }));
  const shadow = useAnimatedProps(() => ({ cx: figure.get().shadowX, rx: figure.get().shadowRadius }));
  const nearArm = useAnimatedProps(() => ({ d: shaped ? figure.get().shapes.nearArm : figure.get().nearArm }));
  const farArm = useAnimatedProps(() => ({ d: shaped ? figure.get().shapes.farArm : figure.get().farArm }));
  const nearLeg = useAnimatedProps(() => ({ d: shaped ? figure.get().shapes.nearLeg : figure.get().nearLeg }));
  const farLeg = useAnimatedProps(() => ({ d: shaped ? figure.get().shapes.farLeg : figure.get().farLeg }));
  const torso = useAnimatedProps(() => ({ d: shaped ? figure.get().shapes.torso : figure.get().torso }));
  const neck = useAnimatedProps(() => ({ d: figure.get().neck }));
  const head = useAnimatedProps(() => ({ cx: figure.get().headX, cy: figure.get().headY }));
  const nose = useAnimatedProps(() => ({ d: figure.get().shapes.nose }));
  const band = useAnimatedProps(() => ({ d: figure.get().band }));
  const dumbbellHandles = useAnimatedProps(() => ({ d: figure.get().dumbbellHandles }));
  const dumbbellPlates = useAnimatedProps(() => ({ d: figure.get().dumbbellPlates }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Animated demonstration" style={styles.scene}>
      <Svg width="100%" height="100%" viewBox={viewBox}>
        {clip.view === 'above' ? (
          <Ellipse cx={SCENE.width / 2} cy={SCENE.height / 2} rx={300} ry={235} fill={COLORS.mat} />
        ) : (
          <>
            {/* Wider and deeper than the scene, so it still reaches the edges when the camera pulls back. */}
            <Rect x={-SCENE.width} y={SCENE.floorY + 10} width={SCENE.width * 3} height={SCENE.height} fill={COLORS.ground} />
            {/* A mat has ends, so a figure travelling along the floor gets one that never runs out. */}
            <Rect x={clip.follow ? -SCENE.width : 120} y={SCENE.floorY} width={clip.follow ? SCENE.width * 3 : 720} height={10} rx={5} fill={COLORS.mat} />
            {clip.follow && <AnimatedPath animatedProps={marks} stroke={COLORS.scenery} strokeWidth={6} {...LIMB} />}
          </>
        )}
        {clip.scenery?.map((item, i) => (
          <Rect key={i} {...item} rx={4} fill={COLORS.scenery} />
        ))}
        {shaped ? (
          <>
            <AnimatedEllipse animatedProps={shadow} cy={SCENE.floorY + 6} ry={7} fill={COLORS.shadow} opacity={0.14} />
            <AnimatedPath animatedProps={farLeg} fill={COLORS.far} />
            <AnimatedPath animatedProps={farArm} fill={COLORS.far} />
            <AnimatedPath animatedProps={neck} stroke={COLORS.body} strokeWidth={22} {...LIMB} />
            {/* Outlined in its own color, which rounds its corners and fills it out to its full size. */}
            <AnimatedPath animatedProps={torso} fill={COLORS.body} stroke={COLORS.body} strokeWidth={2 * TORSO_SKIN} strokeLinejoin="round" />
            <AnimatedCircle animatedProps={head} r={HEAD_RADIUS} fill={COLORS.body} />
            <AnimatedPath animatedProps={nose} fill={COLORS.body} />
            <AnimatedPath animatedProps={nearLeg} fill={COLORS.near} />
            {clip.outlineNearArm && (
              <AnimatedPath animatedProps={nearArm} fill={COLORS.background} stroke={COLORS.background} strokeWidth={10} />
            )}
            <AnimatedPath animatedProps={nearArm} fill={COLORS.near} />
          </>
        ) : (
          <>
            <AnimatedPath animatedProps={farLeg} stroke={COLORS.far} strokeWidth={24} {...LIMB} />
            <AnimatedPath animatedProps={farArm} stroke={COLORS.far} strokeWidth={20} {...LIMB} />
            <AnimatedPath animatedProps={neck} stroke={COLORS.body} strokeWidth={22} {...LIMB} />
            <AnimatedPath animatedProps={torso} stroke={COLORS.body} strokeWidth={38} {...LIMB} />
            <AnimatedCircle animatedProps={head} r={HEAD_RADIUS} fill={COLORS.body} />
            <AnimatedPath animatedProps={nearLeg} stroke={COLORS.body} strokeWidth={26} {...LIMB} />
            {clip.outlineNearArm && (
              <AnimatedPath animatedProps={nearArm} stroke={COLORS.background} strokeWidth={32} {...LIMB} />
            )}
            <AnimatedPath animatedProps={nearArm} stroke={COLORS.body} strokeWidth={22} {...LIMB} />
          </>
        )}
        {(clip.band || clip.miniBand) && <AnimatedPath animatedProps={band} stroke={COLORS.band} strokeWidth={10} {...LIMB} />}
        {clip.dumbbells && (
          <>
            <AnimatedPath animatedProps={dumbbellHandles} stroke={COLORS.weight} strokeWidth={8} {...LIMB} />
            <AnimatedPath animatedProps={dumbbellPlates} stroke={COLORS.weight} strokeWidth={28} {...LIMB} />
          </>
        )}
      </Svg>
    </View>
  );
}

/** A single finger up close, as this exercise is all in the hand. */
export function ExerciseHand({ clip, playing = true, paused = false }: { clip: HandClip } & PlaybackProps) {
  const time = useClipTime(clip, playing, paused);
  const finger = useAnimatedProps(() => ({ d: solveFinger(clip, time.get()) }));
  const [wristX, wristY] = FINGER.wrist;
  const [knuckleX, knuckleY] = FINGER.knuckle;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Animated demonstration" style={styles.scene}>
      <Svg width="100%" height="100%" viewBox={VIEW_BOX}>
        <Rect width={SCENE.width} height={SCENE.height} fill={COLORS.background} />
        <Line x1={wristX} y1={SCENE.height + 30} x2={wristX} y2={wristY} stroke={COLORS.far} strokeWidth={64} />
        <Line x1={wristX} y1={wristY} x2={knuckleX} y2={knuckleY} stroke={COLORS.near} strokeWidth={56} strokeLinecap="round" />
        <AnimatedPath animatedProps={finger} stroke={COLORS.near} strokeWidth={34} {...LIMB} />
      </Svg>
    </View>
  );
}

const LIMB = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const styles = StyleSheet.create({
  scene: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.background,
  },
});
