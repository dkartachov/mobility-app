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
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { clipDuration, keyframeTime, opacityAt, poseAt, SCENE, solveFigure, type FigureClip } from '@/lib/figure-rig';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The same fixed palette as the exercise photos, which don't change with the theme either.
const COLORS = { background: '#E3EEEC', ground: '#D8E6E3', mat: '#D0E6E2', near: '#0F8F82', far: '#7DC4BA' };

const VIEW_BOX = `0 0 ${SCENE.width} ${SCENE.height}`;
const HEAD_RADIUS = 30;

/** Loops a clip for as long as it's on screen, or holds its key pose if reduced motion is on. */
export function ExerciseFigure({ clip }: { clip: FigureClip }) {
  const reducedMotion = useReducedMotion();
  const time = useSharedValue(keyframeTime(clip, clip.stillFrame));

  useEffect(() => {
    if (reducedMotion) {
      time.set(keyframeTime(clip, clip.stillFrame));
      return;
    }
    const duration = clipDuration(clip);
    time.set(0);
    time.set(withRepeat(withTiming(duration, { duration, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(time);
  }, [clip, reducedMotion, time]);

  const figure = useDerivedValue(() => solveFigure(poseAt(clip, time.get()), clip.straightArms));

  const fade = useAnimatedStyle(() => ({ opacity: opacityAt(clip, time.get()) }));
  const nearArm = useAnimatedProps(() => ({ d: figure.get().nearArm }));
  const farArm = useAnimatedProps(() => ({ d: figure.get().farArm }));
  const nearLeg = useAnimatedProps(() => ({ d: figure.get().nearLeg }));
  const farLeg = useAnimatedProps(() => ({ d: figure.get().farLeg }));
  const torso = useAnimatedProps(() => ({ d: figure.get().torso }));
  const neck = useAnimatedProps(() => ({ d: figure.get().neck }));
  const head = useAnimatedProps(() => ({ cx: figure.get().headX, cy: figure.get().headY }));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Animated demonstration" style={styles.scene}>
      <Svg width="100%" height="100%" viewBox={VIEW_BOX} style={StyleSheet.absoluteFill}>
        <Rect width={SCENE.width} height={SCENE.height} fill={COLORS.background} />
        {clip.view === 'above' ? (
          <Ellipse cx={SCENE.width / 2} cy={SCENE.height / 2} rx={300} ry={235} fill={COLORS.mat} />
        ) : (
          <>
            <Rect y={SCENE.floorY + 10} width={SCENE.width} height={SCENE.height} fill={COLORS.ground} />
            <Rect x={120} y={SCENE.floorY} width={720} height={10} rx={5} fill={COLORS.mat} />
          </>
        )}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, fade]}>
        <Svg width="100%" height="100%" viewBox={VIEW_BOX}>
          <AnimatedPath animatedProps={farLeg} stroke={COLORS.far} strokeWidth={24} {...LIMB} />
          <AnimatedPath animatedProps={farArm} stroke={COLORS.far} strokeWidth={20} {...LIMB} />
          <AnimatedPath animatedProps={neck} stroke={COLORS.near} strokeWidth={22} {...LIMB} />
          <AnimatedPath animatedProps={torso} stroke={COLORS.near} strokeWidth={38} {...LIMB} />
          <AnimatedCircle animatedProps={head} r={HEAD_RADIUS} fill={COLORS.near} />
          <AnimatedPath animatedProps={nearLeg} stroke={COLORS.near} strokeWidth={26} {...LIMB} />
          <AnimatedPath animatedProps={nearArm} stroke={COLORS.near} strokeWidth={22} {...LIMB} />
        </Svg>
      </Animated.View>
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
