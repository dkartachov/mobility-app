import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
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
  keyframeTime,
  opacityAt,
  poseAt,
  SCENE,
  solveFigure,
  solveFinger,
  type FigureClip,
  type HandClip,
} from '@/lib/figure-rig';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The same fixed palette as the exercise photos, which don't change with the theme either.
const COLORS = { background: '#E3EEEC', ground: '#D8E6E3', mat: '#D0E6E2', near: '#0F8F82', far: '#7DC4BA', band: '#D9443B', scenery: '#BCD3CF', weight: '#3E4F4C' };

const VIEW_BOX = `0 0 ${SCENE.width} ${SCENE.height}`;
const HEAD_RADIUS = 30;

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

  const figure = useDerivedValue(() => solveFigure(poseAt(clip, time.get()), clip));

  const fade = useAnimatedStyle(() => ({ opacity: opacityAt(clip, time.get()) }));
  const nearArm = useAnimatedProps(() => ({ d: figure.get().nearArm }));
  const farArm = useAnimatedProps(() => ({ d: figure.get().farArm }));
  const nearLeg = useAnimatedProps(() => ({ d: figure.get().nearLeg }));
  const farLeg = useAnimatedProps(() => ({ d: figure.get().farLeg }));
  const torso = useAnimatedProps(() => ({ d: figure.get().torso }));
  const neck = useAnimatedProps(() => ({ d: figure.get().neck }));
  const head = useAnimatedProps(() => ({ cx: figure.get().headX, cy: figure.get().headY }));
  const band = useAnimatedProps(() => ({ d: figure.get().band }));
  const dumbbellHandles = useAnimatedProps(() => ({ d: figure.get().dumbbellHandles }));
  const dumbbellPlates = useAnimatedProps(() => ({ d: figure.get().dumbbellPlates }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Animated demonstration" style={styles.scene}>
      {/* In the figure's own frame, so the floor and scenery line up with it however the camera moves. */}
      <Svg width="100%" height="100%" viewBox={viewBox} style={StyleSheet.absoluteFill}>
        {clip.view === 'above' ? (
          <Ellipse cx={SCENE.width / 2} cy={SCENE.height / 2} rx={300} ry={235} fill={COLORS.mat} />
        ) : (
          <>
            {/* Wider and deeper than the scene, so it still reaches the edges when the camera pulls back. */}
            <Rect x={-SCENE.width} y={SCENE.floorY + 10} width={SCENE.width * 3} height={SCENE.height} fill={COLORS.ground} />
            <Rect x={120} y={SCENE.floorY} width={720} height={10} rx={5} fill={COLORS.mat} />
          </>
        )}
        {clip.scenery?.map((item, i) => (
          <Rect key={i} {...item} rx={4} fill={COLORS.scenery} />
        ))}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, fade]}>
        <Svg width="100%" height="100%" viewBox={viewBox}>
          <AnimatedPath animatedProps={farLeg} stroke={COLORS.far} strokeWidth={24} {...LIMB} />
          <AnimatedPath animatedProps={farArm} stroke={COLORS.far} strokeWidth={20} {...LIMB} />
          <AnimatedPath animatedProps={neck} stroke={COLORS.near} strokeWidth={22} {...LIMB} />
          <AnimatedPath animatedProps={torso} stroke={COLORS.near} strokeWidth={38} {...LIMB} />
          <AnimatedCircle animatedProps={head} r={HEAD_RADIUS} fill={COLORS.near} />
          <AnimatedPath animatedProps={nearLeg} stroke={COLORS.near} strokeWidth={26} {...LIMB} />
          {clip.outlineNearArm && (
            <AnimatedPath animatedProps={nearArm} stroke={COLORS.background} strokeWidth={32} {...LIMB} />
          )}
          <AnimatedPath animatedProps={nearArm} stroke={COLORS.near} strokeWidth={22} {...LIMB} />
          {(clip.band || clip.miniBand) && <AnimatedPath animatedProps={band} stroke={COLORS.band} strokeWidth={10} {...LIMB} />}
          {clip.dumbbells && (
            <>
              <AnimatedPath animatedProps={dumbbellHandles} stroke={COLORS.weight} strokeWidth={8} {...LIMB} />
              <AnimatedPath animatedProps={dumbbellPlates} stroke={COLORS.weight} strokeWidth={28} {...LIMB} />
            </>
          )}
        </Svg>
      </Animated.View>
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
