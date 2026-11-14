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
import { FEEDBACK_REASONS, MAX_FEEDBACK_LENGTH, sendFeedback, type FeedbackReason } from '@/lib/feedback';

/**
 * General feedback, or a report about one exercise when opened with `exerciseId`. A modal, which
 * dialogs can't show over on iOS, so errors and the thank-you show in the form itself.
 */
export default function FeedbackScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const exercise = getExercise(exerciseId);
  const [reason, setReason] = useState<FeedbackReason | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = exercise ? reason !== null : message.trim().length > 0;

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await sendFeedback(
        exercise
          ? { kind: 'exercise', exerciseId: exercise.id, exerciseName: exercise.name, reason: reason!, message }
          : { kind: 'general', message }
      );
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
            Your {exercise ? 'report' : 'feedback'} was sent. If there&apos;s something to follow up on, you&apos;ll get
            a reply by email.
          </ThemedText>
        </View>
        <Button title="Done" onPress={() => router.back()} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      {exercise ? (
        <PageHeader eyebrow="Report a problem" title={exercise.name} subtitle="What's wrong with this exercise?" />
      ) : (
        <PageHeader
          title="Send feedback"
          subtitle="Ideas, bugs, anything you'd change. It goes straight to the developer."
        />
      )}

      {exercise && (
        <View accessibilityRole="radiogroup" style={styles.chips}>
          {FEEDBACK_REASONS.map((option) => (
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
            Stop any exercise that hurts. Skip it with the next button, and see a professional if the pain stays.
          </ThemedText>
        </Card>
      )}

      <Field label={exercise ? 'Details (optional)' : 'Message'}>
        <TextField
          value={message}
          onChangeText={setMessage}
          placeholder={exercise ? 'Anything that would help, like which side or step' : 'What would you like to tell us?'}
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
