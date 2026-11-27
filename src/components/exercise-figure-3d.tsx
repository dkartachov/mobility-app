import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { figureSlotCount, frameAt, stageClip, trailedPart, type Clip3D, type FigureFrame, type Part } from '@/lib/rig3d';

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
  /** The screen is lit like an old LCD, with the reading in dark segments on it. */
  phone: { body: '#22302E', screen: '#8FB5AE', reading: '#13211F', band: '#3E4D4B' },
  tape: { strip: '#E9C46A', marks: '#5B4A1E' },
  dumbbell: { handle: '#3E4D4B', weight: '#22302E' },
  badge: { background: '#FFFFFF', text: '#0B3B36' },
};

/** How far the background shows around each part of the body, so limbs that cross stay apart. */
const OUTLINE = 4.5;
/** How far the background shows around a dumbbell. */
const DUMBBELL_OUTLINE = 3;
/** How thick the lines between a hand's fingers are. */
const FINGER_LINE = 1.8;
/** How thick the lines across the mat are under a figure the camera follows. */
const FLOOR_LINE = 4;

/**
 * The clip's phone, if it's on this slot's part right now: under the limb when it's on the far
 * side of it, or over it. The strap that holds it on goes over the limb and behind the phone, like
 * an armband, so it doesn't hide the reading.
 */
function PhoneLayer({ frame, index, over }: { frame: SharedValue<FigureFrame>; index: number; over: boolean }) {
  const shown = (f: FigureFrame) => {
    'worklet';
    return !f.slots[index].hand && f.phone.part === f.slots[index].part && f.phone.over === over;
  };
  const body = useAnimatedProps(() => {
    const f = frame.get();
    return { d: shown(f) ? f.phone.body : '' };
  });
  const screen = useAnimatedProps(() => {
    const f = frame.get();
    return { d: shown(f) ? f.phone.screen : '' };
  });
  const reading = useAnimatedProps(() => {
    const f = frame.get();
    return { d: shown(f) ? f.phone.reading : '' };
  });
  const band = useAnimatedProps(() => {
    const f = frame.get();
    return { d: over && !f.slots[index].hand && f.phone.part === f.slots[index].part ? f.phone.band : '' };
  });
  return (
    <>
      {over && <AnimatedPath animatedProps={band} fill="none" stroke={COLORS.phone.band} strokeWidth={5} strokeLinecap="round" />}
      <AnimatedPath animatedProps={body} fill={COLORS.phone.body} stroke={COLORS.background} strokeWidth={2} strokeLinejoin="round" />
      <AnimatedPath animatedProps={screen} fill={COLORS.phone.screen} />
      <AnimatedPath animatedProps={reading} fill="none" stroke={COLORS.phone.reading} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

/**
 * The half of a dumbbell on one side of the hand holding it, if this slot is that hand's arm: the
 * far half under the arm (`under`), the near one over it (`over`). Outlined in the background color,
 * like the body. Where the far half is in front of the upper arm, it goes over the arm instead
 * (`raised`), with the forearm and hand drawn again over it in the arm's colors.
 */
function DumbbellLayer({ frame, index, stage }: { frame: SharedValue<FigureFrame>; index: number; stage: 'under' | 'raised' | 'over' }) {
  const dumbbellOf = (f: FigureFrame) => {
    'worklet';
    const slot = f.slots[index];
    if (slot.hand || (slot.part !== 'rightArm' && slot.part !== 'leftArm')) return null;
    return f.dumbbells[slot.part];
  };
  const half = (f: FigureFrame) => {
    'worklet';
    const dumbbell = dumbbellOf(f);
    if (!dumbbell) return null;
    if (stage === 'over') return dumbbell.over;
    return (stage === 'raised') === dumbbell.raised ? dumbbell.under : null;
  };
  const handle = useAnimatedProps(() => ({ d: half(frame.get())?.handle ?? '' }));
  const weight = useAnimatedProps(() => ({ d: half(frame.get())?.weight ?? '' }));
  const cover = (f: FigureFrame) => {
    'worklet';
    return stage === 'raised' ? (dumbbellOf(f)?.cover ?? '') : '';
  };
  const far = useAnimatedProps(() => {
    const f = frame.get();
    return { d: f.slots[index].accent ? '' : cover(f) };
  });
  const near = useAnimatedProps(() => {
    const f = frame.get();
    return { d: f.slots[index].accent ? '' : cover(f), fillOpacity: f.slots[index].shade };
  });
  const accent = useAnimatedProps(() => {
    const f = frame.get();
    return { d: f.slots[index].accent ? cover(f) : '' };
  });
  return (
    <>
      <AnimatedPath animatedProps={handle} fill={COLORS.dumbbell.handle} stroke={COLORS.background} strokeWidth={DUMBBELL_OUTLINE} />
      <AnimatedPath animatedProps={weight} fill={COLORS.dumbbell.weight} stroke={COLORS.background} strokeWidth={DUMBBELL_OUTLINE} strokeLinejoin="round" />
      {stage === 'raised' && (
        <>
          <AnimatedPath animatedProps={far} fill={COLORS.far} />
          <AnimatedPath animatedProps={near} fill={COLORS.near} />
          <AnimatedPath animatedProps={accent} fill={COLORS.accent} />
        </>
      )}
    </>
  );
}

/**
 * Whichever part of the body is this far from the camera right now. The slots are drawn furthest
 * first, and the parts move between them as they pass in front of each other. Colors can't follow
 * them, so every slot has each color laid over the last: the far shade, the near shade let through
 * by how near the part is, and the accent, which is only drawn for a highlighted part. A hand with
 * a thumb has the lines between its fingers stroked over it, and a hand holding a dumbbell has a
 * half of it either side. The clip's
 * trail goes under whichever slot holds the part it traces, and its phone with the part it's on. The
 * back of a band goes under the slot the frame says (`bandSlot`): a mini band under the legs it's round.
 */
function Slot({
  frame,
  index,
  trail,
  trailed,
  phone,
  dumbbells,
  bands,
}: {
  frame: SharedValue<FigureFrame>;
  index: number;
  trail: string;
  trailed?: Part;
  phone: boolean;
  dumbbells: boolean;
  bands: boolean;
}) {
  const path = useAnimatedProps(() => {
    const slot = frame.get().slots[index];
    return { d: slot.part === trailed && !slot.hand ? trail : '' };
  });
  const band = useAnimatedProps(() => {
    const f = frame.get();
    return { d: f.bandSlot === index ? f.bandBehind : '' };
  });
  const outline = useAnimatedProps(() => ({ d: frame.get().slots[index].outline }));
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
  const fingers = useAnimatedProps(() => ({ d: frame.get().slots[index].fingers }));

  return (
    <>
      {bands && <AnimatedPath animatedProps={band} fill="none" stroke={COLORS.strap} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />}
      <AnimatedPath animatedProps={path} fill="none" stroke={COLORS.accent} strokeWidth={5} strokeDasharray="2 12" strokeLinecap="round" opacity={0.8} />
      {phone && <PhoneLayer frame={frame} index={index} over={false} />}
      {dumbbells && <DumbbellLayer frame={frame} index={index} stage="under" />}
      <AnimatedPath animatedProps={outline} fill="none" stroke={COLORS.background} strokeWidth={2 * OUTLINE} strokeLinejoin="round" />
      <AnimatedPath animatedProps={far} fill={COLORS.far} />
      <AnimatedPath animatedProps={near} fill={COLORS.near} />
      <AnimatedPath animatedProps={accent} fill={COLORS.accent} />
      <AnimatedPath animatedProps={fingers} fill="none" stroke={COLORS.background} strokeWidth={FINGER_LINE} strokeLinecap="round" />
      {dumbbells && <DumbbellLayer frame={frame} index={index} stage="raised" />}
      {dumbbells && <DumbbellLayer frame={frame} index={index} stage="over" />}
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
  // One for each part of the body, and each hand or thumb the clip draws on its own.
  const slots = useMemo(() => Array.from({ length: figureSlotCount(clip) }, (_, index) => index), [clip]);

  const frame = useDerivedValue(() => frameAt(clip, view, time.get()));
  const shadow = useAnimatedProps(() => ({ d: frame.get().shadow }));
  const strap = useAnimatedProps(() => ({ d: frame.get().strap }));
  const floor = useAnimatedProps(() => ({ d: frame.get().floor }));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={clip.partner ? 'Animated demonstration, done with a partner' : 'Animated demonstration'}
      style={styles.scene}>
      <Svg width="100%" height="100%" viewBox={stage.viewBox}>
        {/* Outlined in its own color, which rounds its corners and gives it an edge when the camera is level with the floor. */}
        <Path d={stage.mat} fill={COLORS.mat} stroke={COLORS.mat} strokeWidth={10} strokeLinejoin="round" />
        {/* Under a figure the camera follows, lines across the mat slide by as it goes. */}
        {clip.follow && <AnimatedPath animatedProps={floor} fill="none" stroke={COLORS.scenery.mid} strokeWidth={FLOOR_LINE} strokeLinecap="round" />}
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
        {slots.map((index) => (
          <Slot key={index} frame={frame} index={index} trail={stage.trail} trailed={trailedPart(clip.trail)} phone={clip.phone !== undefined} dumbbells={clip.dumbbells !== undefined} bands={clip.miniBand !== undefined || clip.handBand !== undefined} />
        ))}
        {(clip.strap || clip.miniBand || clip.handBand) && <AnimatedPath animatedProps={strap} fill="none" stroke={COLORS.strap} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />}
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
