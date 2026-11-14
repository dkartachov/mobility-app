/**
 * Feedback and exercise reports, emailed to the developer by the `send-feedback` Edge Function.
 * Only signed-in users can send: the function checks the session, and the email's Reply-To is the
 * user's address. Phones used offline, and builds without Supabase settings, don't offer it.
 */
import * as Application from 'expo-application';
import { Platform } from 'react-native';

import { useAuthState } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/** What can be wrong with an exercise. The ids match `REASONS` in the Edge Function. */
export const FEEDBACK_REASONS = [
  { id: 'pain', label: 'Caused pain' },
  { id: 'unclear', label: 'Instructions unclear' },
  { id: 'video', label: "Video doesn't match" },
  { id: 'too_hard', label: 'Too hard' },
  { id: 'too_easy', label: 'Too easy' },
  { id: 'other', label: 'Other' },
] as const;

export type FeedbackReason = (typeof FEEDBACK_REASONS)[number]['id'];

/** Longest message the Edge Function keeps. */
export const MAX_FEEDBACK_LENGTH = 2000;

export type Feedback =
  | { kind: 'general'; message: string }
  | { kind: 'exercise'; exerciseId: string; exerciseName: string; reason: FeedbackReason; message?: string };

/** Whether this phone can send feedback right now: Supabase is set up and someone is signed in. */
export function useCanSendFeedback() {
  const { signedIn } = useAuthState();
  return supabase !== null && signedIn === true;
}

function appVersion() {
  const version = Application.nativeApplicationVersion ?? 'unknown';
  const build = Application.nativeBuildVersion;
  return build ? `${version} (${build})` : version;
}

/** Sends the feedback, throwing with a message to show if it didn't go. */
export async function sendFeedback(feedback: Feedback) {
  if (!supabase) throw new Error("Feedback isn't set up in this build");
  const { error } = await supabase.functions.invoke('send-feedback', {
    body: {
      ...feedback,
      message: feedback.message?.trim().slice(0, MAX_FEEDBACK_LENGTH),
      appVersion: appVersion(),
      variant: Application.applicationId ?? 'unknown',
      platform: `${Platform.OS} ${Platform.Version}`,
    },
  });
  if (error) throw new Error("Couldn't send your feedback. Check your connection and try again.");
}
