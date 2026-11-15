import { Canvas, DashPathEffect, Fill, Group, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { interpolateColor, useDerivedValue, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { frameAt, stageClip, type Clip3D, type FigureFrame } from '@/lib/rig3d';

import { useClipTime } from './exercise-figure';

/** The first engine's palette, plus an accent for the part of the body an exercise is about. */
const COLORS = {
  background: '#E3EEEC',
  mat: '#D0E6E2',
  near: '#0B776C',
  far: '#7DC4BA',
  shadow: '#0B3B36',
  accent: '#F08A4B',
};

/** How far the background shows around each part of the body, so limbs that cross stay apart. */
const OUTLINE = 4.5;

/** One for each part of the body: the torso, the head and the four limbs. */
const SLOTS = [0, 1, 2, 3, 4, 5];

/** A path the rig traced, or an empty one if it traced nothing. Runs on the UI thread every frame. */
function toPath(d: string): SkPath {
  'worklet';
  return (d === '' ? null : Skia.Path.MakeFromSVGString(d)) ?? Skia.Path.Make();
}

/**
 * Whichever part of the body is this far from the camera right now. The slots are drawn furthest
 * first, and the parts move between them as they pass in front of each other, taking their shade
 * with them: the far color through to the near one by how near the part is, or the accent.
 */
function Slot({ frame, index }: { frame: SharedValue<FigureFrame>; index: number }) {
  const path = useDerivedValue(() => toPath(frame.get().slots[index].d));
  const color = useDerivedValue(() => {
    const slot = frame.get().slots[index];
    return slot.accent ? COLORS.accent : interpolateColor(slot.shade, [0, 1], [COLORS.far, COLORS.near]);
  });

  return (
    <>
      <Path path={path} style="stroke" strokeWidth={2 * OUTLINE} strokeJoin="round" color={COLORS.background} />
      <Path path={path} color={color} />
    </>
  );
}

/**
 * A clip for the 3D engine, drawn from its camera with Skia. Plays, pauses and holds still for
 * reduced motion exactly as `ExerciseFigure` does.
 */
export function ExerciseFigure3D({ clip, playing = true, paused = false }: { clip: Clip3D; playing?: boolean; paused?: boolean }) {
  const time = useClipTime(clip, playing, paused);
  const stage = useMemo(() => stageClip(clip), [clip]);
  const view = stage.view;

  // The rig draws in its own units, framed by the stage's view box. The canvas is the same shape,
  // so one scale fits the box to whatever size the canvas is laid out at.
  const [boxX, boxY, boxWidth] = useMemo(() => stage.viewBox.split(' ').map(Number), [stage.viewBox]);
  const size = useSharedValue({ width: 0, height: 0 });
  const transform = useDerivedValue(() => [{ scale: size.get().width / boxWidth }, { translateX: -boxX }, { translateY: -boxY }]);

  const mat = useMemo(() => toPath(stage.mat), [stage.mat]);
  const trail = useMemo(() => (stage.trail === '' ? null : toPath(stage.trail)), [stage.trail]);

  const frame = useDerivedValue(() => frameAt(clip, view, time.get()));
  const shadow = useDerivedValue(() => toPath(frame.get().shadow));

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Animated demonstration" style={styles.scene}>
      {/* Opaque, as it paints every pixel, which lets Android draw it the cheapest way. */}
      <Canvas style={StyleSheet.absoluteFill} onSize={size} opaque>
        <Fill color={COLORS.background} />
        <Group transform={transform}>
          {/* Outlined in its own color, which rounds its corners and gives it an edge when the camera is level with the floor. */}
          <Path path={mat} color={COLORS.mat} />
          <Path path={mat} style="stroke" strokeWidth={10} strokeJoin="round" color={COLORS.mat} />
          <Path path={shadow} color={COLORS.shadow} opacity={0.14} />
          {trail && (
            <Path path={trail} style="stroke" strokeWidth={5} strokeCap="round" color={COLORS.accent} opacity={0.8}>
              <DashPathEffect intervals={[2, 12]} />
            </Path>
          )}
          {SLOTS.map((index) => (
            <Slot key={index} frame={frame} index={index} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.background,
  },
});
