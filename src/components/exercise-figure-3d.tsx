import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { frameAt, stageClip, trailedPart, type Clip3D, type FigureFrame, type Part } from '@/lib/rig3d';

import { useClipTime } from './exercise-figure';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The first engine's palette, plus an accent for the part of the body an exercise is about. */
const COLORS = {
  background: '#E3EEEC',
  mat: '#D0E6E2',
  near: '#0B776C',
  far: '#7DC4BA',
  shadow: '#0B3B36',
  accent: '#F08A4B',
  strap: '#D9443B',
  /** The sides of a piece of scenery: its top, then the side turned more toward the camera, then the other. */
  scenery: { light: '#C9DDD9', mid: '#B4CFCA', dark: '#A3C2BC' },
  phone: { body: '#22302E', screen: '#6F8F8A', band: '#3E4D4B' },
  tape: { strip: '#E9C46A', marks: '#5B4A1E' },
  badge: { background: '#FFFFFF', text: '#0B3B36' },
};

/** How far the background shows around each part of the body, so limbs that cross stay apart. */
const OUTLINE = 4.5;

/** One for each part of the body: the torso, the head and the four limbs. */
const SLOTS = [0, 1, 2, 3, 4, 5];

/**
 * The clip's phone, if it's on this slot's part right now: under the limb when it's on the far
 * side of it, or over it, with the strap that holds it on over both.
 */
function PhoneLayer({ frame, index, over }: { frame: SharedValue<FigureFrame>; index: number; over: boolean }) {
  const shown = (f: FigureFrame) => f.phone.part === f.slots[index].part && f.phone.over === over;
  const body = useAnimatedProps(() => {
    const f = frame.get();
    return { d: shown(f) ? f.phone.body : '' };
  });
  const screen = useAnimatedProps(() => {
    const f = frame.get();
    return { d: shown(f) ? f.phone.screen : '' };
  });
  const band = useAnimatedProps(() => {
    const f = frame.get();
    return { d: over && f.phone.part === f.slots[index].part ? f.phone.band : '' };
  });
  return (
    <>
      <AnimatedPath animatedProps={body} fill={COLORS.phone.body} stroke={COLORS.background} strokeWidth={2} strokeLinejoin="round" />
      <AnimatedPath animatedProps={screen} fill={COLORS.phone.screen} />
      {over && <AnimatedPath animatedProps={band} fill="none" stroke={COLORS.phone.band} strokeWidth={5} strokeLinecap="round" />}
    </>
  );
}

/**
 * Whichever part of the body is this far from the camera right now. The slots are drawn furthest
 * first, and the parts move between them as they pass in front of each other. Colors can't follow
 * them, so every slot has each color laid over the last: the far shade, the near shade let through
 * by how near the part is, and the accent, which is only drawn for a highlighted part. The clip's
 * trail goes under whichever slot holds the part it traces, and its phone with the part it's on.
 */
function Slot({
  frame,
  index,
  trail,
  trailed,
  phone,
}: {
  frame: SharedValue<FigureFrame>;
  index: number;
  trail: string;
  trailed?: Part;
  phone: boolean;
}) {
  const path = useAnimatedProps(() => ({ d: frame.get().slots[index].part === trailed ? trail : '' }));
  const outline = useAnimatedProps(() => ({ d: frame.get().slots[index].d }));
  const far = useAnimatedProps(() => {
    const slot = frame.get().slots[index];
    return { d: slot.accent ? '' : slot.d };
  });
  const near = useAnimatedProps(() => {
    const slot = frame.get().slots[index];
    return { d: slot.accent ? '' : slot.d, fillOpacity: slot.shade };
  });
  const accent = useAnimatedProps(() => {
    const slot = frame.get().slots[index];
    return { d: slot.accent ? slot.d : '' };
  });

  return (
    <>
      <AnimatedPath animatedProps={path} fill="none" stroke={COLORS.accent} strokeWidth={5} strokeDasharray="2 12" strokeLinecap="round" opacity={0.8} />
      {phone && <PhoneLayer frame={frame} index={index} over={false} />}
      <AnimatedPath animatedProps={outline} fill="none" stroke={COLORS.background} strokeWidth={2 * OUTLINE} strokeLinejoin="round" />
      <AnimatedPath animatedProps={far} fill={COLORS.far} />
      <AnimatedPath animatedProps={near} fill={COLORS.near} />
      <AnimatedPath animatedProps={accent} fill={COLORS.accent} />
      {phone && <PhoneLayer frame={frame} index={index} over />}
    </>
  );
}

/** Says a test needs a second person, who isn't drawn. */
function PartnerBadge() {
  return (
    <View style={styles.badge}>
      <SymbolView name={{ ios: 'person.2.fill', android: 'group' }} size={16} tintColor={COLORS.badge.text} />
      <Text style={styles.badgeText}>With a partner</Text>
    </View>
  );
}

/**
 * A clip for the 3D engine, drawn from its camera. Plays, pauses and holds still for reduced motion
 * exactly as `ExerciseFigure` does.
 */
export function ExerciseFigure3D({ clip, playing = true, paused = false }: { clip: Clip3D; playing?: boolean; paused?: boolean }) {
  const time = useClipTime(clip, playing, paused);
  const stage = useMemo(() => stageClip(clip), [clip]);
  const view = stage.view;

  const frame = useDerivedValue(() => frameAt(clip, view, time.get()));
  const shadow = useAnimatedProps(() => ({ d: frame.get().shadow }));
  const strap = useAnimatedProps(() => ({ d: frame.get().strap }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={clip.partner ? 'Animated demonstration, done with a partner' : 'Animated demonstration'}
      style={styles.scene}>
      <Svg width="100%" height="100%" viewBox={stage.viewBox}>
        {/* Outlined in its own color, which rounds its corners and gives it an edge when the camera is level with the floor. */}
        <Path d={stage.mat} fill={COLORS.mat} stroke={COLORS.mat} strokeWidth={10} strokeLinejoin="round" />
        <AnimatedPath animatedProps={shadow} fill={COLORS.shadow} opacity={0.14} />
        {/* Outlined in its own color, which closes the hairline gaps between the sides of a block. */}
        {stage.scenery.map((face, i) => (
          <Path key={i} d={face.d} fill={COLORS.scenery[face.tone]} stroke={COLORS.scenery[face.tone]} strokeWidth={2} strokeLinejoin="round" />
        ))}
        {stage.tape.strip !== '' && (
          <>
            <Path d={stage.tape.strip} fill={COLORS.tape.strip} stroke={COLORS.tape.strip} strokeWidth={1} strokeLinejoin="round" />
            <Path d={stage.tape.marks} stroke={COLORS.tape.marks} strokeWidth={1.5} />
          </>
        )}
        {SLOTS.map((index) => (
          <Slot key={index} frame={frame} index={index} trail={stage.trail} trailed={trailedPart(clip.trail)} phone={clip.phone !== undefined} />
        ))}
        {clip.strap && <AnimatedPath animatedProps={strap} fill="none" stroke={COLORS.strap} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />}
      </Svg>
      {clip.partner && <PartnerBadge />}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.background,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: COLORS.badge.background,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: 600,
    color: COLORS.badge.text,
  },
});
