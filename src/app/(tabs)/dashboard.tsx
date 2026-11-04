import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { MilestoneBar } from '@/components/milestone-bar';
import { ScoreChangePill } from '@/components/pill';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { ScoreBars } from '@/components/score-bars';
import { ScoreRing } from '@/components/score-ring';
import { ThemedText } from '@/components/themed-text';
import { WeekStrip } from '@/components/week-strip';
import { Radius, Spacing } from '@/constants/theme';
import { NO_AREA_SCORES } from '@/data/mobility-score';
import { useMobilityScore } from '@/db/mobility-tests';
import { useProfile } from '@/db/profile';
import { useStats, useWeekDays } from '@/db/sessions';
import { formatDuration, todayKey } from '@/lib/dates';
import { milestoneProgress } from '@/lib/milestones';
import { markCelebrated, wasCelebrated } from '@/lib/training-celebration';
import { useTheme } from '@/hooks/use-theme';

/** Matches the side padding of `Screen`. */
const SCREEN_PADDING = Spacing.screen;
const TILE_GAP = Spacing.three;
const TILE_PADDING = Spacing.three;
/** Lets the tab finish appearing before the cards animate. */
const ANIMATION_DELAY_MS = 200;
/** The cards' entrance: each starts this long after the one before. */
const STAGGER_MS = 60;
const ENTER_MS = 400;

export default function DashboardScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const stats = useStats();
  const weekDays = useWeekDays();
  const profile = useProfile();
  const score = useMobilityScore();
  // Fills its half-width tile, whatever the size of the phone.
  const ringSize = (width - SCREEN_PADDING * 2 - TILE_GAP) / 2 - TILE_PADDING * 2;
  const scoreDelta = score?.changes?.overall ?? null;

  // Native tabs all mount when the app loads, with Start showing. Waiting for the first time this
  // tab is opened means the cards' animations play when they can be seen.
  const [opened, setOpened] = useState(false);
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setOpened(true);
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  // Plays on the first look at the Dashboard after training today, which can be well after the
  // session. Until then today's dot waits empty, since this tab stays mounted in the background.
  // Read from the week rather than `stats` so it matches the dots, whichever query updates first.
  const today = todayKey();
  const trainedToday = weekDays?.some((day) => day.date === today && day.trained) ?? false;
  const celebration = trainedToday && !wasCelebrated(today) ? (focused ? 'play' : 'pending') : undefined;
  useEffect(() => {
    if (celebration === 'play') markCelebrated(today);
  }, [celebration, today]);

  if (!stats || !opened) return null;

  const trainedAllWeek = weekDays?.every((day) => day.trained) ?? false;
  const trainingMessage = trainedAllWeek
    ? 'You trained all week!'
    : stats.trainedToday
      ? 'You trained today. Nice work!'
      : stats.sessionCount > 0
        ? "You haven't trained yet today."
        : 'Complete a session to get started.';

  return (
    <Screen
      eyebrow={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
      title={profile?.firstName ? `Hi, ${profile.firstName}` : 'Dashboard'}
      gap={Spacing.three}>
      <Animated.View entering={enterCard(0)}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Training days. ${trainingMessage}`}
          onPress={() => router.push('/training-days')}>
          <Card
            style={[
              styles.trainingCard,
              trainedAllWeek && {
                borderWidth: 1,
                borderColor: `${theme.trained}80`,
                boxShadow: `0 0 16px ${theme.trained}59`,
              },
            ]}>
            <View style={styles.trainingHeader}>
              <ThemedText type="smallBold" style={styles.trainingMessage}>
                {trainingMessage}
              </ThemedText>
              <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="textSecondary" size={14} />
            </View>
            {weekDays && <WeekStrip days={weekDays} celebration={celebration} delayMs={ANIMATION_DELAY_MS + 150} />}
          </Card>
        </PressableScale>
      </Animated.View>

      {/* Equal widths; time stays short while score grows taller to fit its ring and bars. */}
      <View style={styles.tileRow}>
        <DashboardTile
          order={1}
          label="Mobility time"
          accessibilityLabel={`Mobility time, ${formatDuration(stats.totalSeconds)}`}
          onPress={() => router.push('/mobility-time')}>
          <View style={styles.timeBody}>
            <ThemedText type="stat" numberOfLines={1} adjustsFontSizeToFit>
              {formatDuration(stats.totalSeconds)}
            </ThemedText>
          </View>
          <MilestoneBar
            totalSeconds={stats.totalSeconds}
            animateFromSeconds={milestoneProgress(stats.totalSeconds).previousHours * 3600}
            delayMs={ANIMATION_DELAY_MS}
          />
        </DashboardTile>

        <DashboardTile
          order={2}
          label="Score"
          accessibilityLabel={`Mobility score${score?.overall == null ? '' : ` ${Math.round(score.overall)}`}`}
          onPress={() => router.push('/mobility-score')}>
          <View style={styles.scoreBody}>
            <ScoreRing score={score?.overall ?? null} size={ringSize} thickness={12} delayMs={ANIMATION_DELAY_MS} />
            {scoreDelta !== null && <ScoreChangePill change={scoreDelta} />}
          </View>
          {score === null ? (
            // Before any test the bars would all be empty, so the space says what fills them instead.
            <View style={[styles.firstTest, { backgroundColor: theme.tintSoft }]}>
              <Icon name={{ ios: 'figure.flexibility', android: 'self_improvement' }} color="tint" size={22} />
              <ThemedText type="smallBold" themeColor="tint" style={styles.firstTestText}>
                Take your first test
              </ThemedText>
            </View>
          ) : (
            <ScoreBars scores={score?.areas ?? NO_AREA_SCORES} delayMs={ANIMATION_DELAY_MS} barHeight={72} barsOnly />
          )}
        </DashboardTile>
      </View>
    </Screen>
  );
}

type DashboardTileProps = {
  /** Position in the dashboard's staggered entrance. */
  order: number;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  /** The main visual, then a footer. The tile is as tall as its content. */
  children: ReactNode;
};

/** Tappable card with a label and chevron along the top. */
function DashboardTile({ order, label, accessibilityLabel, onPress, children }: DashboardTileProps) {
  return (
    <Animated.View entering={enterCard(order)} style={styles.tile}>
      <PressableScale accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}>
        <Card style={styles.tileCard}>
          <View style={styles.tileHeader}>
            <ThemedText type="eyebrow" themeColor="textSecondary" numberOfLines={1} style={styles.tileLabel}>
              {label}
            </ThemedText>
            <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="textSecondary" size={14} />
          </View>
          {children}
        </Card>
      </PressableScale>
    </Animated.View>
  );
}

/** Slides each card up into place a little after the one before it. Skipped when reduce motion is on. */
function enterCard(order: number) {
  return FadeInDown.delay(order * STAGGER_MS)
    .duration(ENTER_MS)
    .easing(Easing.out(Easing.cubic));
}

const styles = StyleSheet.create({
  trainingCard: {
    gap: Spacing.twoAndHalf,
  },
  trainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  trainingMessage: {
    flex: 1,
  },
  // Top-aligned so each tile keeps its own height: score stays tall, time stays short.
  tileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: TILE_GAP,
  },
  tile: {
    flex: 1,
  },
  tileCard: {
    gap: Spacing.three,
    padding: TILE_PADDING,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tileLabel: {
    flex: 1,
  },
  scoreBody: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  firstTest: {
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.twoAndHalf,
    borderRadius: Radius.medium,
  },
  firstTestText: {
    textAlign: 'center',
  },
  timeBody: {
    gap: Spacing.two,
  },
});
