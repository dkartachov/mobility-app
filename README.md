# Mobility

A stretching and mobility app built with Expo (SDK 58) and Expo Router. iOS and Android only. All data is stored on the device in SQLite; there is no backend.

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
```

Schema changes go in `src/db/schema.ts` as a new entry appended to `MIGRATIONS`.

Tests sit next to the code they cover (`*.test.ts(x)`). Database tests run real SQL against an in-memory database from `src/test-utils/sqlite.ts`, which uses Node's built-in `node:sqlite` (Node 22.13 or newer).

## Commands

```bash
npx expo start                          # dev server (needs the development build installed)
npx expo lint                           # lint
npx tsc --noEmit                        # typecheck
npm test                                # unit and component tests (Jest)
npx expo-doctor                         # check dependencies and config
npx eas-cli@latest build --profile development   # new dev build after adding native packages
npx eas-cli@latest update               # ship an over-the-air update
```

## Mobility score and its sources

Each flexibility test result is scored against published data on healthy adults, so a score means the same thing as it would in a physio's clinic rather than an arbitrary scale.

### How a result is scored

1. Every test in `src/data/mobility-tests.ts` has a `norm`: the average result for men and for women up to age 30, the standard deviation, and how much the average changes per decade after 30, for each sex.
2. A result is compared with the average for the person's sex (from their profile; both sexes averaged when it's not set or not male/female) and their age on the day of the test (ages over 80 count as 80; no date of birth counts as under 30).
3. The score is the percentile the result falls at, assuming results are normally distributed: `score = Φ((result − expected) / sd) × 100`. 50 is average, 84 is one standard deviation better than average.
4. Each side is scored on its own; a test scores the average of its sides, an area the average of its tests, and the overall score the average of its areas (`src/data/mobility-score.ts`).

Scores fall into bands by percentile (`scoreBand`), the same cut-offs used for clinical percentile norms:

| Score | Band |
|---|---|
| 90–100 | Well above average |
| 75–90 | Above average |
| 25–75 | Average (the middle half of adults) |
| 10–25 | Below average |
| 0–10 | Well below average |

### Norms per test

Evidence levels: **strong** is a large normative study of the same movement; **moderate** is the standard clinical value or a smaller study, where the full tables of a large study weren't available; **limited** is estimated from small studies, and should be replaced when better data turns up.

Averages are for adults up to 30; the last column is the change per decade after that.

| Test | Average (men / women) | SD | Per decade (men / women) | Evidence | Source |
|---|---|---|---|---|---|
| Knee to wall | 11 / 10.5 cm | 3 cm | −0.5 / −0.5 cm | Moderate | 10–12 cm (SD 2.7–3) in healthy young adults [1, 2]; men slightly further, larger decline from 60 [1]. The 899-adult norms [1] are paywalled, so their exact tables aren't used yet |
| Thoracic rotation | 42° / 42° | 10° | −2° / −2° | Limited | Lumbar-locked rotation of about 30–50° in young adults, ≥50° counted as unrestricted [3, 4] |
| Shoulder abduction | 156° / 157° | 15° | −5° / −4° | Strong | Active, standing, inclinometer; 2404 adults without shoulder pain, by five-year age group and sex [5] |
| Shoulder external rotation | 62° / 72° | 16° | −3° / −4° | Strong | Active, standing with the elbow at the side; same 2404 adults [5], though judged by eye to the nearest 5° |
| Hip external rotation | 43° / 40° | 8° | −1.5° / −1.5° | Strong | Seated, with an examiner rotating the leg, as a partner does in the app; 151 adults aged about 22 [6]; small decline with age [9] |
| Hip internal rotation | 41° / 47° | 8.5° | −1.5° / −1.5° | Strong | Seated, with an examiner rotating the leg; 151 adults aged about 22 [6] |
| Sit and reach | −1.5 / +5 cm past the toes | 10 cm | −1.1 / −0.6 cm | Strong | Canadian Health Measures Survey 2016–17, a national sample, percentiles by five-year age group and sex [7] |
| Knee to chest | 130° / 134° | 10° | −1.3° / −1.2° | Strong | Supine hip flexion, 674 healthy people by age and sex [8]; SD estimated from the published 95% intervals |
| Hip abduction | 42° / 42° | 10° | −1° / −1° | Moderate | About 45° is the standard clinical value [10]; the US national health survey (1892 people) found only 3–5° less from young to old adults [9]. Its full tables are paywalled |
| Overhead reach | 166° / 165° | 13° | −4° / −4° | Strong | Active flexion, inclinometer; 2404 adults without shoulder pain [5] |

How the numbers were derived:

- **Sit and reach**: the survey's flexometer puts the feet at the 26 cm mark, so its medians for ages 20–29 (24.5 cm men, 31.1 cm women) are 1.5 cm short of and 5.1 cm past the toes. The SD is the 10th–90th percentile spread divided by 2.563, which is how far apart those percentiles are in a normal distribution. The survey's percentiles fit a normal distribution closely (its 5th percentile for men is 8.8 cm; the normal model gives 8.2 cm).
- **Gill 2020 tests**: averages of the left and right sides for ages 20–29 (external rotation) or 20–44 (abduction, flexion), and the decline is the drop to ages 65–69 spread over the decades in between.
- **Knee to chest**: averages for ages 20–44, and the decline is the drop to ages 45–69.
- **Hip rotation**: averages of the left and right sides in the sitting columns of Han 2015. The study also measured lying face down, where rotation is 3–10° more, so the two positions can't be swapped without changing the norms.

### Caveats

- The hip rotation and knee to chest norms were measured by a clinician moving the joint for the person (passive range). Hip rotation is done the same way in the app, with a partner, and knee to chest is pulled in with your own hands. The shoulder, hip abduction and sit-and-reach norms were active, like the app.
- Results are assumed to be normally distributed. Some aren't: shoulder flexion piles up near 180°, so overhead reach can't score much above 86.
- Norms for children and teenagers aren't modelled; anyone under 30 is compared with adults up to 30.

### Better data wanted

These sources would make tests' norms stronger, but their tables weren't freely available. Any of them can usually be found through a university or public library, by interlibrary loan, or by asking the authors (ResearchGate's "Request full-text" button works well).

| Test | What's missing | Source to get | What it would change |
|---|---|---|---|
| Knee to wall | The age- and sex-specific means, SDs and percentiles | McBride et al. 2026 [1], [doi:10.1016/j.msksp.2026.103525](https://doi.org/10.1016/j.msksp.2026.103525) | Moderate → strong: exact averages for seven age groups, and the real decline after 60 instead of an even −0.5 cm a decade |
| Hip abduction | The table of active abduction by age group, sex and race | Roach & Miles 1991 [9], [doi:10.1093/ptj/71.9.656](https://doi.org/10.1093/ptj/71.9.656) | Moderate → strong: the measured average and SD instead of the clinical 45° and an estimated SD |
| Hip external and internal rotation | Active rotation by age group (the same paper's tables) | Roach & Miles 1991 [9] | A measured age decline instead of the estimated −1.5° a decade, and active rather than passive values |
| Knee to chest | Standard deviations | CDC normal joint range of motion dataset [8]. The raw-data download (`Normal-Dataset.xls`) and its "Data Description and Sample Tables" PDF are linked from the CDC page but no longer download; try the [Wayback Machine](https://web.archive.org/web/2020/https://www.cdc.gov/ncbddd/jointrom/index.html) or the paper's own tables | Exact SDs instead of ones estimated from the confidence intervals |
| Thoracic rotation | Any large normative study | None known yet. Johnson et al. 2012 [3] is the most-cited but is a reliability study of a small sample | Would need a new source; worth searching again for "lumbar-locked rotation normative" now and then |

### References

1. McBride, et al. International normative values for the weight-bearing lunge test across age and sex in 899 healthy adults. *Musculoskelet Sci Pract*. 2026;82:103525. [PubMed 41723909](https://pubmed.ncbi.nlm.nih.gov/41723909/)
2. Normative values of the weight bearing lunge test among non-athlete females: a criterion based study. *Res J Pharm Technol*. [ResearchGate](https://www.researchgate.net/publication/380359469_Normative_Values_of_Weight_Bearing_Lunge_Test_among_Non-Athlete_Females_-_A_Criterion_Based_Study)
3. Johnson KD, et al. Reliability of thoracic spine rotation range-of-motion measurements in healthy adults. *J Athl Train*. 2012;47(1):52–60. [PubMed 22488230](https://pubmed.ncbi.nlm.nih.gov/22488230/)
4. Shin & Yoo. Lumbar-locked thoracic rotation groups in young active adults. [PMC11612942](https://pmc.ncbi.nlm.nih.gov/articles/PMC11612942/)
5. Gill TK, et al. Shoulder range of movement in the general population: age and gender stratified normative data using a community-based cohort. *BMC Musculoskelet Disord*. 2020;21:676. [PMC7549223](https://pmc.ncbi.nlm.nih.gov/articles/PMC7549223/)
6. Han H, et al. Hip rotation range of motion in sitting and prone positions in healthy Japanese adults. *J Phys Ther Sci*. 2015;27(2):441–445. [PMC4339156](https://pmc.ncbi.nlm.nih.gov/articles/PMC4339156/)
7. Statistics Canada. Sit-and-reach percentile values by age group and sex, Canadian Health Measures Survey cycle 5 (2016–2017). *Health Reports*. 2019;30(10). [Table 3](https://www150.statcan.gc.ca/n1/pub/82-003-x/2019010/article/00002/tbl/tbl03-eng.htm)
8. Soucie JM, et al. Range of motion measurements: reference values and a database for comparison studies. *Haemophilia*. 2011;17(3):500–507. [PubMed 21070485](https://pubmed.ncbi.nlm.nih.gov/21070485/), [CDC tables](https://archive.cdc.gov/www_cdc_gov/ncbddd/jointrom/index.html)
9. Roach KE, Miles TP. Normal hip and knee active range of motion: the relationship to age. *Phys Ther*. 1991;71(9):656–665. [PubMed 1881956](https://pubmed.ncbi.nlm.nih.gov/1881956/)
10. Hip range of motion norms (AAOS). [achievable.me summary](https://achievable.me/define/hip-rom-norms/)
