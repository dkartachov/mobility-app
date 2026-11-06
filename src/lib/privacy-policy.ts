/**
 * The privacy policy shown in the app (Settings > Privacy policy). Keep it in step with what the
 * app actually stores; the same text is what the store listing links to.
 */

/** Fill in before release. */
export const DEVELOPER_NAME = 'Hogos';
export const CONTACT_EMAIL = 'pliemobility@gmail.com';
export const POLICY_UPDATED = '6 November 2026';

export type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export const PRIVACY_POLICY: PolicySection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      `Plie is a mobility and flexibility training app made by ${DEVELOPER_NAME}. To ask about your data, email ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: 'What Plie stores',
    bullets: [
      'Your account: the email address you sign in with. Plie emails you a one-time code each time you sign in, so it never stores a password.',
      'Your profile: first name, last name, date of birth, and sex at birth. Sex at birth is used to compare your flexibility results with published norms for healthy adults. You can also add a profile photo.',
      'Your training: workouts, flexibility test results and scores, goals, training days, and exercise reminder times.',
      'App settings: your theme and workout timeout choices.',
    ],
  },
  {
    heading: 'Motion sensors',
    paragraphs: [
      "During a flexibility test, Plie reads your phone's motion sensors to measure angles. Those readings are used live on your phone and are not saved. Only the test result is kept.",
    ],
  },
  {
    heading: 'Where your data is kept',
    bullets: [
      'On your phone: everything listed above is kept in the app\'s local database.',
      'In the cloud: when you are signed in, Plie backs up a copy of your app data and profile photo to Supabase, which provides the cloud storage and sign-in. A backup is made after changes, one per day, and the last seven days are kept. Each account can only reach its own backups.',
    ],
  },
  {
    heading: 'What Plie does not do',
    paragraphs: [
      'Plie has no ads and no analytics or tracking. It does not use your location, camera, microphone, or contacts, and it does not sell your data or share it with advertisers. Plie sends no push notifications: exercise reminders are scheduled on your phone.',
    ],
  },
  {
    heading: 'Who else handles your data',
    paragraphs: [
      'Supabase provides cloud storage and sign-in. Expo delivers app updates to your phone. Your data is not shared with anyone else.',
    ],
  },
  {
    heading: 'Health information',
    paragraphs: [
      'Plie is a fitness training app, not a medical device. Flexibility scores compare your results with published norms. They are not a diagnosis or medical advice. Talk to a health professional about pain or any health concern.',
    ],
  },
  {
    heading: 'Deleting your data',
    bullets: [
      'In the app: go to Settings, then Account, then Delete account. This deletes your sign-in account, all your cloud backups, and your profile photo from the cloud, and then erases the data on your phone.',
      `Without the app: email ${CONTACT_EMAIL} from the address you sign in with. We will delete your account and backups within 30 days.`,
      'Signing out keeps your backups, so signing in again on any phone brings your data back.',
      'Uninstalling Plie removes its data from your phone.',
    ],
  },
  {
    heading: 'Your choices',
    paragraphs: [
      `You can ask to see, correct, or delete your data at any time by emailing ${CONTACT_EMAIL}.`,
    ],
  },
  {
    heading: 'Children',
    paragraphs: [
      `Plie is not intended for children under 13, and we do not knowingly collect their information. If you think a child has given us information, email ${CONTACT_EMAIL} and we will delete it.`,
    ],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: [
      `If this policy changes, the date at the top changes too. This policy was last updated on ${POLICY_UPDATED}.`,
    ],
  },
];
