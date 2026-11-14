import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chip } from '@/components/chip';
import { Field, TextField } from '@/components/field';
import { FormScreen } from '@/components/form-screen';
import { IconBadge } from '@/components/icon-badge';
import { PageHeader } from '@/components/page-header';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { getExercise } from '@/data/exercises';
import { FLEXIBILITY_TESTS } from '@/data/mobility-tests';
import {
  EXERCISE_REASONS,
  MAX_FEEDBACK_LENGTH,
  sendFeedback,
  TEST_REASONS,
  type ExerciseReason,
  type Feedback,
  type TestReason,
} from '@/lib/feedback';

type Params = {
  /** Reports a problem with this exercise. */
  exerciseId?: string;
  /** Reports a problem with this flexibility test, with the side and reading on screen at the time. */
  testId?: string;
  side?: string;
  reading?: string;
};

/** What's being reported, if anything: general feedback has no subject. */
type Subject =
  | { kind: 'exercise'; id: string; name: string }
  | { kind: 'test'; id: string; name: string; side?: string; reading?: string };

function findSubject({ exerciseId, testId, side, reading }: Params): Subject | null {
  const exercise = getExercise(exerciseId);
  if (exercise) return { kind: 'exercise', id: exercise.id, name: exercise.name };
  const test = FLEXIBILITY_TESTS.find(({ id }) => id === testId);
  if (test) return { kind: 'test', id: test.id, name: test.name, side: side || undefined, reading: reading || undefined };
  return null;
}

function toFeedback(subject: Subject | null, reason: ExerciseReason | TestReason | null, message: string): Feedback {
  if (subject?.kind === 'exercise') {
    return {
      kind: 'exercise',
      exerciseId: subject.id,
      exerciseName: subject.name,
      reason: reason as ExerciseReason,
      message,
    };
  }
  if (subject?.kind === 'test') {
    return {
      kind: 'test',
      testId: subject.id,
      testName: subject.name,
      reason: reason as TestReason,
      ...(subject.side && { side: subject.side }),
      ...(subject.reading && { reading: subject.reading }),
      message,
    };
  }
  return { kind: 'general', message };
}

/**
 * General feedback, or a report about one exercise or flexibility test when opened with its id. A
 * modal, which dialogs can't show over on iOS, so errors and the thank-you show in the form itself.
 */
export default function FeedbackScreen() {
  const params = useLocalSearchParams<Params>();
  const [subject] = useState(() => findSubject(params));
  const [reason, setReason] = useState<ExerciseReason | TestReason | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasons = subject?.kind === 'test' ? TEST_REASONS : subject?.kind === 'exercise' ? EXERCISE_REASONS : [];
  const canSend = subject ? reason !== null : message.trim().length > 0;

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await sendFeedback(toFeedback(subject, reason, message));
      setSent(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <FormScreen>
        <View style={styles.sent}>
          <IconBadge name={{ ios: 'checkmark', android: 'check' }} size={72} />
          <ThemedText type="title" accessibilityRole="header" style={styles.centered}>
            Thanks!
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centered}>
            Your {subject ? 'report' : 'feedback'} was sent. If there&apos;s something to follow up on, you&apos;ll get
            a reply by email.
          </ThemedText>
        </View>
        <Button title="Done" onPress={() => router.back()} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      {subject ? (
        <PageHeader
          eyebrow="Report a problem"
          title={subject.name}
          subtitle={[
            subject.kind === 'test' ? subject.side : null,
            `What's wrong with this ${subject.kind}?`,
          ]
            .filter(Boolean)
            .join(' · ')}
        />
      ) : (
        <PageHeader
          title="Send feedback"
          subtitle="Ideas, bugs, anything you'd change. It goes straight to the developer."
        />
      )}

      {subject && (
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {reasons.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              selected={reason === option.id}
              onPress={() => setReason(option.id)}
            />
          ))}
        </View>
      )}

      {reason === 'pain' && (
        <Card style={styles.warning}>
          <IconBadge name={{ ios: 'exclamationmark.triangle.fill', android: 'warning' }} size={36} />
          <ThemedText type="small" style={styles.warningText}>
            {subject?.kind === 'test'
              ? 'Stop any test that hurts. Only move as far as a firm stretch, and see a professional if the pain stays.'
              : 'Stop any exercise that hurts. Skip it with the next button, and see a professional if the pain stays.'}
          </ThemedText>
        </Card>
      )}

      <Field label={subject ? 'Details (optional)' : 'Message'}>
        <TextField
          value={message}
          onChangeText={setMessage}
          placeholder={
            subject?.kind === 'test'
              ? 'Anything that would help, like what you measured and how'
              : subject
                ? 'Anything that would help, like which side or step'
                : 'What would you like to tell us?'
          }
          multiline
          maxLength={MAX_FEEDBACK_LENGTH}
          textAlignVertical="top"
          style={styles.message}
        />
      </Field>

      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}

      <Button title="Send" onPress={send} disabled={!canSend} loading={sending} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  warningText: {
    flex: 1,
  },
  message: {
    minHeight: 140,
  },
  sent: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.four,
  },
  centered: {
    textAlign: 'center',
  },
});
