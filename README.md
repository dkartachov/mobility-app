# Plie

A stretching and mobility app built with Expo (SDK 58) and Expo Router. iOS and Android only. All data lives on the device in SQLite, with [snapshot backups](#cloud-backups) to Supabase Storage.

## Structure

```
src/
  app/                 Routes (Expo Router)
    _layout.tsx        Root Stack + SQLite provider
    (tabs)/            Dashboard | Start (default tab) | Profile
    edit-profile.tsx   Modal
    new-goal.tsx       Modal
  components/          Shared UI
  constants/theme.ts   Colors (teal accent), spacing, radii
  db/                  Schema/migrations and typed queries per table
  lib/                 Date helpers, profile photo storage
papers/                Open-access sources for the flexibility test norms
```

Schema changes go in `src/db/schema.ts` as a new entry appended to `MIGRATIONS`.

Tests sit next to the code they cover (`*.test.ts(x)`). Database tests run real SQL against an in-memory database from `src/test-utils/sqlite.ts`, which uses Node's built-in `node:sqlite` (Node 22.13 or newer).

## Commands

```bash
npm start                               # dev server (needs the development build installed)
npx expo lint                           # lint
npx tsc --noEmit                        # typecheck
npm test                                # unit and component tests (Jest)
npx expo-doctor                         # check dependencies and config
npm run build:dev                       # new dev build after adding native packages
npm run build:preview                   # build to share by install link (APK)
npm run build:prod                      # store build (AAB)
npm run update:dev -- --message "..."   # over-the-air update; update:preview and update:prod for the others
```

### App variants

The development and production builds are separate apps ([Expo app variants](https://docs.expo.dev/tutorial/eas/multiple-app-variants/), set up in `app.config.ts`), so both can be installed on one device, each with its own data. Production builds an AAB for the store, so it can't be installed directly. The `preview` profile is the production app built as an APK with a shareable install link: same identifier and backup bucket, so it replaces production on a device, with its own update channel:

| Variant | `APP_VARIANT` | Name | Identifier | Scheme |
|---|---|---|---|---|
| Development | `development` | Plie (Dev) | `com.hogos.plie.dev` | `plie-dev` |
| Production | unset | Plie | `com.hogos.plie` | `plie` |

EAS builds get `APP_VARIANT` from their profile in `eas.json`, but `eas update` doesn't read `eas.json`, so an update published without the right `APP_VARIANT` won't match its builds' fingerprint. Use `npm start` and the `update:*` scripts, which set it. They use POSIX `VAR=value` syntax, so on Windows run them from Git Bash or WSL.

## Exercise reminders

Settings has a list of reminder times, each with its own days of the week and on/off switch. They're stored in the `reminders` table, so backups include them. `src/lib/reminders.ts` matches the scheduled local notifications to that table whenever it changes and whenever the app opens, with one weekly trigger per selected day. Reminders show while the app is open, and tapping one goes to the Start tab, except during a workout or flexibility test.

With no reminders set, pressing Done after a workout suggests adding one (`src/lib/reminder-prompt.ts`). "Don't ask again" is permanent; "Later" and going to Settings wait three workouts.

## Cloud backups

SQLite stays the only live database. `src/lib/backup.ts` uploads a copy of the whole file to a private Supabase Storage bucket, plus the profile photo: about 5 seconds after any change, and when the app opens or goes to the background if an earlier upload didn't finish. There's one snapshot per day with the last 7 kept, but the app only ever restores the latest. The older ones are a safety net for a bad change that got backed up: download one from the bucket in the Supabase dashboard if you ever need it. Before each upload the app runs SQLite's integrity check, so a damaged database is never backed up over a good one. Profile photos no kept snapshot can show are deleted after each backup. Postgres isn't used, so new tables and columns need no backup changes, and restoring an old snapshot runs the normal migrations.

Each variant has its own bucket, chosen from the installed app's ID (`BUCKETS` in `src/lib/backup.ts`), so development data stays out of production however the dev server was started. Inside a bucket, each user can only reach a folder named after their user ID (`supabase/setup.sql`):

| Variant | App ID | Bucket |
|---|---|---|
| Development | `com.hogos.plie.dev` | `backups-dev` |
| Production | `com.hogos.plie` | `backups-prod` |

The app opens on a login screen (`src/app/login.tsx`) until the phone is signed in, so nothing can be recorded that restoring a backup would then wipe. There are no passwords: Supabase emails a 6-digit code, and entering it signs in. A new email creates a user and a known one signs back into it. The user's ID names their folder, so the same email on a reinstalled or new phone reaches the same backups. Anyone who controls an inbox can reach that person's backups, so the email is effectively the password.

Right after signing in, the app restores the latest backup if there is one, behind a spinner, then shows "Welcome back" with the first name and any profile photo for 2 seconds before opening. Someone with no backup and no name on the phone is new: they fill in a short profile (first name, date of birth and sex at birth are required, since test scores compare against them), see "Welcome" and the app starts backing up. The name also goes to the user's Supabase account as `display_name`, for the dashboard; the app itself never reads it back. Sign out in Settings uploads a final backup, then erases the phone's data on the restart that follows, so the next person to sign in starts clean and signing back in restores everything. If that backup fails, the phone stays signed in with nothing removed. Only a phone with changes of its own that were never backed up (one that used an older build without signing in, or whose session ended) asks first: restore, or keep the phone's data, which replaces the backup. Once signed in, the session stays on the phone and renews itself, so the login screen doesn't come back and the app works offline. Backups are always on; Settings shows the last one, any error, and buttons to back up now or restore the latest. If Supabase ever ends the session for good (say, the user was deleted), the phone unlinks and returns to the login screen. Builds without Supabase settings, like Expo Go, skip the login screen.

The root layout gates the app with `Stack.Protected`. Expo Router shows any route not listed in the layout to everyone, so every new screen must be added there; `src/routes.test.ts` fails if one is missing.

The publishable key ships in the app, so anyone who extracts it can sign up with an inbox they control and upload to their own folder. They can't read or change anyone else's data (the policies check the folder against the user ID), but they could fill the bucket. Bucket limits (50 MB per file, binary only) and Supabase's email rate limits bound that; watch storage usage in the dashboard. If it's abused, the next step is gating sign-up behind invite codes (an Edge Function that trades a code for a session, with sign-ups turned off).

Separate buckets mean a bug that sent the dev build to the production bucket would still only reach that user's own folder there.

Settings showing the last backup and any error is also how you'd notice the free project being paused after a week of inactivity. The app keeps working locally if so; restore the project from the dashboard and backups resume. A fresh install can't sign in while the project is paused, though, so it stays on the login screen until then.

### Setup

1. Create a Supabase project.
2. Under Authentication:
   - Turn on new user sign-ups and the email provider, and leave anonymous sign-ins off.
   - In the "Magic Link" and "Confirm signup" email templates, include the code with `{{ .Token }}`. The app has no deep links, so a link alone can't sign anyone in. Existing emails get the first template, new ones the second.
   - Supabase's built-in email sender only delivers to members of your Supabase organization. To let friends sign in, set up custom SMTP (Resend, Postmark and SES have free tiers) or invite each friend to the organization.
3. Run `supabase/setup.sql` in the SQL editor.
4. Copy `.env.example` to `.env.local` and fill it in, for the dev server.
5. Add the same two values to EAS for builds and updates, once per variable and value:

   ```bash
   npx eas-cli@latest env:set --environment development --environment production --visibility plaintext --name EXPO_PUBLIC_SUPABASE_URL --value "..."
   ```

6. Make new builds with `npm run build:dev` and `npm run build:preview`, then sign in with your email. Use a different email for dev and prod, or the same: either way each variant has its own bucket.

## Mobility score and its sources

Each flexibility test result is scored against published data on healthy adults, so a score means the same thing as it would in a physio's clinic rather than an arbitrary scale.

### How a result is scored

1. Every test in `src/data/mobility-tests.ts` has a `norm`: the average result and standard deviation for men and for women at one or more ages. Between two ages they change in a straight line; younger than the first age and older than the last, they stay at that age's values. Knee to wall has seven age groups from its study. The other tests' studies give young adults' values and a change per decade, so their norms (`decliningNorm`) hold steady to 30 and change by that amount each decade until 80.
2. A result is compared with the norm for the person's sex (from their profile; both sexes averaged when it's not set or not male/female) and their age on the day of the test (no date of birth counts as the norm's youngest age).
3. The score is the percentile the result falls at, assuming results are normally distributed: `score = Φ((result − mean) / sd) × 100`. 50 is average, 84 is one standard deviation better than average.
4. Each side is scored on its own; a test scores the average of its sides, an area the average of its tests, and the overall score the average of its areas (`src/data/mobility-score.ts`). Area and overall scores are average scores, not percentiles themselves: scoring 84 on every test is rarer than 84% of people, since few people are one SD above average on everything.
5. Phone measurements are taken twice and saved as the average (`PHONE_READINGS` in `src/components/test-measurement.tsx`). If the two readings are further apart than measurement error explains 95% of the time (`maxReadingGap`: 1.96 × √2 × the test's measurement error, 17° for shoulder abduction and 7° for hip abduction), they aren't averaged: the app says how far apart they were and asks to measure again, with an option to use the average anyway. Distance tests are measured once: knee to wall already searches for the furthest position, and sit and reach takes the best of three like its norms.

### Changes between tests

Measuring the same person twice never gives quite the same result, so small score changes are mostly noise. Every test has a `measurementError`: its standard error of measurement, from studies that retested healthy adults (see the sources table below). A result's error in score points is that error times how steeply the score climbs at that result (`scoreError`), so the same error moves a score most near average and barely at either end. Errors are combined the same way as the scores, taking each measurement's error to be independent, so an area or overall score built from many measurements is steadier than any one test.

A change counts as real when it's bigger than 1.96 times the two scores' errors combined (`compareScores`), which measurement error alone would beat less than 5% of the time. Smaller changes show as "No real change" (or "Same" under the area bars), and real ones in points, such as "+12 pts". On the score screen and test results, tapping "No real change" explains why, with how many points measuring alone could have moved the score (`explainNoRealChange`).

The errors are from clinicians or researchers measuring, mostly retesting days to a week apart. Self-measuring with a phone probably adds some error, and averaging two readings takes some away, so the cut-off is a reasonable guide rather than exact.

Scores fall into bands by percentile (`scoreBand`), the same cut-offs used for clinical percentile norms. Area and overall scores use the same bands, which read as "average across the tests" rather than an exact share of people:

| Score | Band |
|---|---|
| 90–100 | Well above average |
| 75–90 | Above average |
| 25–75 | Average (the middle half of adults) |
| 10–25 | Below average |
| 0–10 | Well below average |

### Tests by area

Each test counts towards one area (its `area` in `src/data/mobility-tests.ts`). All areas count equally towards the overall score, so a test's share of the overall score depends on how many other tests are in its area.

| Area | Tests (movement) | Share of overall per test |
|---|---|---|
| Shoulders | Shoulder abduction (abduction), Shoulder external rotation (external rotation), Overhead reach (flexion) | 1/12 each |
| Hips | Hip external rotation, Hip internal rotation, Knee to chest (flexion), Hip abduction | 1/16 each |
| Hamstrings | Sit and reach (forward fold), Straight leg raise (leg raise) | 1/8 each |
| Ankles | Knee to wall (dorsiflexion) | 1/4 |

Every test except sit and reach is measured on both sides, and its score is the average of left and right.

### Norms per test

Evidence levels: **strong** is a large normative study of the same movement; **moderate** is the standard clinical value or a smaller study, where the full tables of a large study weren't available; **limited** is estimated from small studies, and should be replaced when better data turns up.

Averages are for adults up to 30, and the per-decade column is the change after that, except for knee to wall, which has its own age table below.

| Test | Average (men / women) | SD (men / women) | Per decade (men / women) | Evidence | Source |
|---|---|---|---|---|---|
| Knee to wall | 11.0 / 11.3 cm at 18–29 | 3.6 / 3.0 cm | By age group, see below | Strong | Weight-bearing lunge, big toe to wall; 899 adults in Canada, Spain and Iran, by seven age groups and sex [1]. Matches 400 young women in India (11.2 / 10.4 cm right / left) [2] |
| Shoulder abduction | 156° / 157° | 15° | −5° / −4° | Strong | Active, standing, inclinometer; 2404 adults without shoulder pain, by five-year age group and sex [3] |
| Shoulder external rotation | 62° / 72° | 16° | −3° / −4° | Moderate | Active, standing with the elbow at the side; same 2404 adults [3], but judged by eye to the nearest 5°, where the app measures it |
| Hip external rotation | 41.5° / 42.5° | 7.1° / 7.4° | −1.7° / −1.1° | Strong | Seated, with an examiner rotating the leg, as a partner does in the app; 987 adults aged 19–32 [10]. 151 adults aged about 22 measured much the same (43° / 40°) [4]. Decline from the US national health survey, 1683 adults aged 25–74 [7] |
| Hip internal rotation | 43° / 43.5° | 7.6° / 7.9° | −1° / −1° | Strong | Seated, with an examiner rotating the leg; 987 adults aged 19–32 [10]. 151 adults aged about 22 had a bigger gap between the sexes (41° / 47°) [4]. Decline from the US national health survey [7] |
| Sit and reach | −1.5 / +5 cm past the toes | 10 / 9.6 cm | −1.1 / −0.6 cm | Strong | Canadian Health Measures Survey 2016–17, a national sample, percentiles by five-year age group and sex [5] |
| Knee to chest | 130° / 134° | 7.8° / 8.2° | −1.5° / −1.2° | Strong | Supine hip flexion, 674 healthy people by age and sex [6]; SD and decline worked out from the study's raw data |
| Straight leg raise | 68.5° / 76.3° | 6.8° / 9.5° | 0° / 0° | Strong | Passive, lying on the back, stopping at firm resistance; 214 adults aged 20–79, by decade and sex, with no change with age [9]. A machine pushing to the most people could bear went 11–13° further [8] |
| Hip abduction | 41° / 40° | 8.3° / 7.4° | −1.8° / −0.9° | Strong | Active, lying on the back, goniometer; 987 adults aged 19–32 [10]. Decline from the US national health survey, measured the same way [7] |
| Overhead reach | 166° / 165° | 13° | −4° / −4° | Strong | Active flexion, inclinometer; 2404 adults without shoulder pain [3] |

Knee to wall by age group [1, table 1], mean ± SD in cm. Each group counts as its average age, so a 30-year-old is compared with values between the first two rows:

| Age group (average age) | Men | Women |
|---|---|---|
| 18–29 (25) | 11.0 ± 3.6 | 11.3 ± 3.0 |
| 30–39 (34) | 11.2 ± 3.8 | 11.4 ± 3.0 |
| 40–49 (44) | 11.0 ± 3.2 | 10.4 ± 2.7 |
| 50–59 (54) | 10.4 ± 3.6 | 9.5 ± 2.6 |
| 60–69 (64) | 9.5 ± 3.3 | 8.0 ± 2.6 |
| 70–79 (75) | 7.4 ± 2.3 | 6.5 ± 2.2 |
| 80+ (84) | 6.6 ± 2.0 | 5.7 ± 1.7 |

How the numbers were derived:

- **Knee to wall**: the study measured the dominant foot only, since it found no difference between feet. The app scores each foot against the same values.
- **Sit and reach**: the survey's flexometer puts the feet at the 26 cm mark, so its medians for ages 20–29 (24.5 cm men, 31.1 cm women) are 1.5 cm short of and 5.1 cm past the toes. Each sex's SD is its 10th–90th percentile spread divided by 2.563, which is how far apart those percentiles are in a normal distribution: 10.0 cm for men and 9.6 cm for women. The survey's percentiles fit a normal distribution closely (its 5th percentile for men is 8.8 cm; the normal model gives 8.2 cm).
- **Gill 2020 tests**: averages of the left and right sides for ages 20–29 (external rotation) or 20–44 (abduction, flexion), and the decline is the drop to ages 65–69 spread over the decades in between.
- **Knee to chest**: from the CDC study's raw data (`papers/cdc-normal-rom-dataset.xls`, both sides of everyone measured): 130.4° ± 7.8 for men and 133.8° ± 8.2 for women aged 20–44, and the decline is a straight line fitted to everyone aged 30–69.
- **Straight leg raise**: Youdas's averages over all ages, both sides (68.5 ± 6.8° men, 76.3 ± 9.5° women). Its decades differ by no more than chance (men 65–71°, women 74–78°), so there's no decline. Youdas stopped where the examiner felt firm resistance and the person agreed, which is the firm stretch the app asks for. Marshall & Siegler's machine went on to the most each person could bear (79.4 ± 17.8° men, 89.4 ± 12.4° women), so it measures stretch tolerance as well, which is why its spread is so much wider. Youdas recruited from a hospital fitness centre and left out people with a BMI of 30 or more, so its averages may be a little above the general population's.
- **Hip rotation and abduction**: Hallaçeli 2014's averages for men and women (41.5 ± 7.1° and 42.4 ± 7.4° external rotation, 42.9 ± 7.6° and 43.6 ± 7.9° internal rotation, both passive and seated; 40.9 ± 8.3° and 40.1 ± 7.4° abduction, active and lying on the back). Their study also measured passive abduction and active rotation, which differ from these by 5–6°, so the right column has to match how the app's test is done. Rotation lying face down is 3–10° more again [4].
- **Hip decline with age**: from Roach & Miles's tables by sex, race and age group [7, tables 4–7], the drop in the mean from ages 25–39 to 60–74 (about 32 to 67, so 3.5 decades), with white and Black adults averaged by group size. Men: external rotation 32.8° → 27.0°, internal rotation 33.7° → 30.0°, abduction 45.1° → 38.8°. Women: external rotation 35.1° → 31.1°, internal rotation 31.7° → 28.1°, abduction 42.7° → 39.4°. Their rotation was active and the app's is passive, so the decline is assumed to be the same number of degrees either way. Results were rounded to 5°, which blurs single results but not group averages.

### Measurement error per test

Standard error of measurement (`measurementError`), used to tell real changes from noise. Where studies differ, the larger error is used.

| Test | Error | Source |
|---|---|---|
| Knee to wall | 0.7 cm | Smallest real change of 1.9 cm for the same person measuring again, across 12 studies [11], divided by 1.96 × √2 |
| Shoulder abduction | 6.3° | Phone, standing, the same person measuring again [12] |
| Shoulder external rotation | 3.3° | Phone, standing, the same person measuring again [12] |
| Overhead reach | 2.7° | Phone, the same person measuring again [12] |
| Hip external rotation | 2.8° | Phone, seated, the same person measuring again [12] |
| Hip internal rotation | 3.4° | Phone, seated, the same person measuring again [12] |
| Knee to chest | 3.9° | Goniometer, retested a week apart [13]; 2.3° with a phone [12] |
| Hip abduction | 2.4° | Goniometer, retested a week apart [13] |
| Straight leg raise | 3.6° | Inclinometer on the thigh, retested 3 days apart [14] |
| Sit and reach | 1.6 cm | Retested 3 days apart [14] |

### Caveats

- The hip rotation, knee to chest and straight leg raise norms were measured by a clinician or a machine moving the joint for the person (passive range). Hip rotation is done the same way in the app, with a partner; knee to chest is pulled in with your own hands, and the straight leg raise with a towel or belt. Something that doesn't stretch is closest to a clinician's hand: an elastic band lets the leg drift a few degrees at the top. The shoulder, hip abduction, knee-to-wall and sit-and-reach norms were active, like the app. Where both were measured, active range is 5–6° less than passive [10].
- Results are assumed to be normally distributed. Some aren't: shoulder flexion piles up near 180°, so overhead reach can't score much above 86.
- Every test starts with the same warm-up (`src/data/test-warmup.ts`): a minute of marching, then about five minutes of dynamic moves for the ankles, hips, hamstrings and shoulders, with no static holds. A warm-up raises range of motion for a while, so doing the same one every time keeps results comparable from test to test. Most norms were measured without a warm-up, though, so scores may read slightly high against them.
- Norms for children and teenagers aren't modelled; anyone younger than a norm's youngest age is compared with that age.
- The hip rotation and abduction norms combine two studies: averages from adults aged 19–32 [10], and the decline with age from a US survey 1971–75 that stopped at 74 [7]. Past 74 the decline is carried on in a straight line.

Copies of the sources are in `papers/` (see its README).

### References

1. McBride S, et al. International normative values for the weight-bearing lunge test across age and sex in 899 healthy adults. *Musculoskelet Sci Pract*. 2026;82:103525. Open access (CC BY). [doi:10.1016/j.msksp.2026.103525](https://doi.org/10.1016/j.msksp.2026.103525)
2. Nambiar A, et al. Normative values of weight bearing lunge test among non-athlete females: a criterion based study. *RGUHS J Physiother*. 2024;4(1). [doi:10.26463/rjpt.4_1_4](https://doi.org/10.26463/rjpt.4_1_4)
3. Gill TK, et al. Shoulder range of movement in the general population: age and gender stratified normative data using a community-based cohort. *BMC Musculoskelet Disord*. 2020;21:676. [PMC7549223](https://pmc.ncbi.nlm.nih.gov/articles/PMC7549223/)
4. Han H, et al. Hip rotation range of motion in sitting and prone positions in healthy Japanese adults. *J Phys Ther Sci*. 2015;27(2):441–445. [PMC4339156](https://pmc.ncbi.nlm.nih.gov/articles/PMC4339156/)
5. Statistics Canada. Sit-and-reach percentile values by age group and sex, Canadian Health Measures Survey cycle 5 (2016–2017). *Health Reports*. 2019;30(10). [Table 3](https://www150.statcan.gc.ca/n1/pub/82-003-x/2019010/article/00002/tbl/tbl03-eng.htm)
6. Soucie JM, et al. Range of motion measurements: reference values and a database for comparison studies. *Haemophilia*. 2011;17(3):500–507. [PubMed 21070485](https://pubmed.ncbi.nlm.nih.gov/21070485/), [CDC tables](https://archive.cdc.gov/www_cdc_gov/ncbddd/jointrom/index.html), [raw data](https://web.archive.org/web/2019id_/https://www.cdc.gov/ncbddd/jointrom/documents/Normal-Dataset.xls) (the CDC's own download link is broken)
7. Roach KE, Miles TP. Normal hip and knee active range of motion: the relationship to age. *Phys Ther*. 1991;71(9):656–665. [PubMed 1881956](https://pubmed.ncbi.nlm.nih.gov/1881956/)
8. Marshall PWM, Siegler JC. Lower hamstring extensibility in men compared to women is explained by differences in stretch tolerance. *BMC Musculoskelet Disord*. 2014;15:223. [PMC4105123](https://pmc.ncbi.nlm.nih.gov/articles/PMC4105123/)
9. Youdas JW, et al. The influence of gender and age on hamstring muscle length in healthy adults. *J Orthop Sports Phys Ther*. 2005;35(4):246–252. [PubMed 15901126](https://pubmed.ncbi.nlm.nih.gov/15901126/)
10. Hallaçeli H, et al. Normal hip, knee and ankle range of motion in the Turkish population. *Acta Orthop Traumatol Turc*. 2014;48(1):37–42. Open access (CC BY-SA). [doi:10.3944/AOTT.2014.3113](https://doi.org/10.3944/AOTT.2014.3113)
11. Powden CJ, Hoch JM, Hoch MC. Reliability and minimal detectable change of the weight-bearing lunge test: a systematic review. *Man Ther*. 2015;20(4):524–532. [doi:10.1016/j.math.2015.01.004](https://doi.org/10.1016/j.math.2015.01.004) (figures from the abstract)
12. Keogh JWL, et al. Reliability and validity of clinically accessible smartphone applications to measure joint range of motion: a systematic review. *PLoS One*. 2019;14(5):e0215806. [PMC6505893](https://pmc.ncbi.nlm.nih.gov/articles/PMC6505893/). Its table 3 gives the errors of Shin et al. 2012 (shoulder) and Charlton et al. 2015 (hip)
13. Nussbaumer S, et al. Validity and test-retest reliability of manual goniometers for measuring passive hip range of motion in femoroacetabular impingement patients. *BMC Musculoskelet Disord*. 2010;11:194. [PMC2942800](https://pmc.ncbi.nlm.nih.gov/articles/PMC2942800/)
14. Liu H, et al. Psychometric properties of four common clinical tests for assessing hamstring flexibility in young adults. *Front Physiol*. 2022;13:911240. [PMC9240627](https://pmc.ncbi.nlm.nih.gov/articles/PMC9240627/)
