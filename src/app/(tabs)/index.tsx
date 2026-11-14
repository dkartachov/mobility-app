import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { StartTile } from '@/components/start-tile';
import { ThemedText } from '@/components/themed-text';
import { Elevation, Radius, Spacing } from '@/constants/theme';
import { EXERCISES } from '@/data/exercises';
import { scoreAreaLabel } from '@/data/mobility-score';
import { useLastSession } from '@/db/sessions';
import { useFocusPlan } from '@/hooks/use-focus-plan';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, formatRecentDay } from '@/lib/dates';
import { useColorScheme } from '@/lib/theme-preference';
import { DAILY_MINUTES } from '@/lib/workout';

/** From this hour the wind-down routine takes the large tile, and the focus routine before it. */
const EVENING_HOUR = 18;

const LENGTHS = `${DAILY_MINUTES[0]}–${DAILY_MINUTES[DAILY_MINUTES.length - 1]} min`;

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < EVENING_HOUR) return 'Good afternoon';
  return 'Good evening';
}

export default function StartScreen() {
  const lastSession = useLastSession();
  const { areas, tests } = useFocusPlan();
  const hour = new Date().getHours();
  const subtitle = lastSession
    ? `Last session ${formatRecentDay(lastSession.date)} · ${formatDuration(lastSession.durationSeconds)}`
    : 'Pick a routine or browse exercises.';

  const focusReady = areas.length > 0;
  const focus = {
    title: 'Focus',
    subtitle: focusReady ? areas.map(scoreAreaLabel).join(' · ') : 'Take a test to find your focus areas',
    image: require('@/assets/images/focus.jpg'),
    onPress: () => router.push('/focus'),
    // Without a test there's nothing to focus on yet, so it opens the routine's screen to explain.
    onStart: focusReady
      ? (minutes: number) =>
          router.push({
            pathname: '/workout',
            params: { minutes, routine: 'focus', areas: areas.join(','), tests: tests.join(',') },
          })
      : undefined,
  };
  const windDown = {
    title: 'Wind down',
    subtitle: 'Gentle stretches to end the day',
    image: require('@/assets/images/wind-down.jpg'),
    onPress: () => router.push('/wind-down'),
    onStart: (minutes: number) => router.push({ pathname: '/workout', params: { minutes, routine: 'wind-down' } }),
  };
  const [featured, other] = hour >= EVENING_HOUR ? [windDown, focus] : [focus, windDown];

  return (
    <Screen eyebrow={greeting(hour)} title="Ready to move?" subtitle={subtitle} gap={Spacing.three}>
      <StartTile
        title={featured.title}
        subtitle={featured.subtitle}
        tag={LENGTHS}
        image={featured.image}
        onPress={featured.onPress}
        minutes={DAILY_MINUTES}
        onStart={featured.onStart}
        style={styles.featured}
      />
      <View style={styles.row}>
        <StartTile
          compact
          title={other.title}
          subtitle={other.subtitle}
          image={other.image}
          onPress={other.onPress}
          style={styles.half}
        />
        <StartTile
          compact
          title="Daily"
          subtitle="A quick guided routine"
          image={require('@/assets/images/daily.jpg')}
          onPress={() => router.push('/daily')}
          style={styles.half}
        />
      </View>
      <LibraryRow />
    </Screen>
  );
}

/** Opens the library to browse, with search and filters there if wanted. */
function LibraryRow() {
  const theme = useTheme();
  const scheme = useColorScheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Library. Browse ${EXERCISES.length} exercises`}
      onPress={() => router.push('/library')}
      style={[styles.library, { backgroundColor: theme.backgroundElement }, Elevation[scheme]]}>
      <Icon name={{ ios: 'books.vertical', android: 'menu_book' }} color="tint" size={18} />
      <ThemedText themeColor="textSecondary" style={styles.libraryText}>
        Browse {EXERCISES.length} exercises
      </ThemedText>
      <Icon name={{ ios: 'chevron.right', android: 'chevron_right' }} color="textSecondary" size={16} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // The tiles split the height below the header, so the screen fits without scrolling.
  // Only on very small screens do the minimums push it into scrolling.
  featured: {
    flex: 3,
    height: undefined,
    minHeight: 220,
  },
  row: {
    flex: 2,
    minHeight: 150,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  half: {
    flex: 1,
    height: undefined,
  },
  library: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoAndHalf,
    paddingHorizontal: Spacing.threeAndHalf,
    paddingVertical: Spacing.three,
    borderRadius: Radius.full,
  },
  libraryText: {
    flex: 1,
  },
});
