/**
 * Synthesizes the app's sound effects into assets/sounds. Run with `node scripts/make-sounds.mjs`
 * after changing a recipe below, then listen to the result: nothing here can check how it sounds.
 *
 * Everything is a bell in C major, so the sounds read as one family.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

const NOTE = {
  C5: 523.25,
  D5: 587.33,
  Eb5: 622.25,
  E5: 659.25,
  G5: 783.99,
  A5: 880,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  G6: 1567.98,
  C7: 2093,
};

/** Bell-like partials: [frequency ratio, level, decay ratio]. */
const BELL = [
  [1, 1, 1],
  [2, 0.18, 0.5],
  [2.76, 0.11, 0.33],
];
/** Rounder and duller than the bell, for sounds that shouldn't feel like a reward. */
const SOFT = [
  [1, 1, 1],
  [2, 0.06, 0.5],
];

/** A note has rung out once it's this far below its starting level, quiet enough to end the file on. */
const RING_OUT = 0.003;
const ATTACK_SECONDS = 0.004;

const voicesOf = (detune) => (detune ? [1, 2 ** (detune / 1200)] : [1]);

/**
 * One struck note, which rings until it has died away. `decay` is the seconds it takes the
 * fundamental to fall to about a third; `detune` adds a second voice that many cents sharp, which
 * makes the note shimmer.
 */
function note({ freq, at = 0, decay = 0.3, level = 1, partials = BELL, detune = 0 }) {
  const voices = voicesOf(detune);
  return {
    end: at + decay * Math.log(1 / RING_OUT),
    addTo(samples) {
      const start = Math.round(at * SAMPLE_RATE);
      for (let i = start; i < samples.length; i++) {
        const t = (i - start) / SAMPLE_RATE;
        // A short ramp in, so the note starts without a click.
        const ramp = Math.min(1, t / ATTACK_SECONDS);
        let value = 0;
        for (const voice of voices) {
          for (const [ratio, partialLevel, decayRatio] of partials) {
            value += partialLevel * Math.exp(-t / (decay * decayRatio)) * Math.sin(2 * Math.PI * freq * ratio * voice * t);
          }
        }
        samples[i] += (level * ramp * value) / voices.length;
      }
    },
  };
}

/** A held tone that grows from silence at `from` to full at `to`, then lets go. The opposite of a struck note. */
function swell({ freq, from, to, level = 1, detune = 0, release = 0.12 }) {
  const voices = voicesOf(detune);
  return {
    end: to + release,
    addTo(samples) {
      const start = Math.round(from * SAMPLE_RATE);
      const end = Math.min(samples.length, Math.round((to + release) * SAMPLE_RATE));
      for (let i = start; i < end; i++) {
        const t = i / SAMPLE_RATE;
        // Slow to start and quickest at the end, so it pulls towards whatever comes next.
        const envelope = t < to ? ((t - from) / (to - from)) ** 2.5 : 1 - (t - to) / release;
        let value = 0;
        for (const voice of voices) value += Math.sin(2 * Math.PI * freq * voice * t);
        samples[i] += (level * envelope * value) / voices.length;
      }
    },
  };
}

/** A soft pop: a short tone that slides up from `from` to `to` as it dies away. */
function pop({ from, to, at = 0, glide = 0.06, decay = 0.05, level = 1 }) {
  return {
    end: at + decay * Math.log(1 / RING_OUT),
    addTo(samples) {
      const start = Math.round(at * SAMPLE_RATE);
      let phase = 0;
      for (let i = start; i < samples.length; i++) {
        const t = (i - start) / SAMPLE_RATE;
        const freq = from + (to - from) * Math.min(1, t / glide);
        phase += (2 * Math.PI * freq) / SAMPLE_RATE;
        samples[i] += level * Math.min(1, t / ATTACK_SECONDS) * Math.exp(-t / decay) * Math.sin(phase);
      }
    },
  };
}

/** Mixes the parts into one sound, exactly as long as its last part takes to die away. */
function render(parts) {
  const seconds = Math.max(...parts.map((part) => part.end));
  const samples = new Float64Array(Math.round(seconds * SAMPLE_RATE));
  for (const part of parts) part.addTo(samples);
  // Whatever is left at the end is all but silent already; this only stops it ending on a click.
  const fade = Math.round(0.05 * SAMPLE_RATE);
  for (let i = 0; i < fade; i++) samples[samples.length - 1 - i] *= i / fade;
  return samples;
}

/** 16-bit mono WAV, with the loudest sample at `peak` (1 is as loud as a file can be). */
function writeWav(name, samples, peak) {
  const loudest = samples.reduce((max, s) => Math.max(max, Math.abs(s)), 0);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples.length * 2, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(samples.length * 2, 40);
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round((s / loudest) * peak * 32767), i * 2));
  writeFileSync(join(OUT_DIR, name), Buffer.concat([header, data]));
  console.log(`${name}  ${(samples.length / SAMPLE_RATE).toFixed(2)}s  ${Math.round((44 + data.length) / 1024)} KB`);
}

mkdirSync(OUT_DIR, { recursive: true });

// A hold or a timeout ended: a single bell. The "switch sides" voice comes in 0.9 s after it starts
// (see SWITCH_SIDES_DELAY_MS), so it mustn't ring much longer than that.
writeWav('ding.wav', render([note({ freq: NOTE.C6, decay: 0.26, detune: 5 })]), 0.8);

// A timeout ran out: two plain notes stepping down, soft and short. It only has to say "back to
// it", so it's duller and quieter than the bells, and falls rather than rises to stay unexciting.
writeWav(
  'timeout-over.wav',
  render([
    note({ freq: NOTE.C6, decay: 0.09, partials: SOFT }),
    note({ freq: NOTE.G5, at: 0.16, decay: 0.16, partials: SOFT }),
  ]),
  0.6
);

// Today's dot fills in on the Dashboard: a pop as it lands, then two faint notes for its sparkles,
// which burst 180 ms later (see week-strip.tsx).
writeWav(
  'day-complete.wav',
  render([
    pop({ from: 420, to: 880 }),
    note({ freq: NOTE.E6, at: 0.18, decay: 0.16, level: 0.3, partials: SOFT }),
    note({ freq: NOTE.G6, at: 0.26, decay: 0.22, level: 0.28, partials: SOFT }),
  ]),
  0.6
);

// The phone has zeroed and is ready to measure: one neutral blip, neither good nor bad.
writeWav('measure-zeroed.wav', render([note({ freq: NOTE.G5, decay: 0.07, partials: SOFT })]), 0.6);

// A reading was taken: two rising notes, landing on the ding's own pitch.
writeWav(
  'measure-captured.wav',
  render([note({ freq: NOTE.G5, decay: 0.09 }), note({ freq: NOTE.C6, at: 0.11, decay: 0.22 })]),
  0.75
);

// The readings disagree: two falling notes a minor third apart, duller and lower than a success.
writeWav(
  'measure-retry.wav',
  render([
    note({ freq: NOTE.Eb5, decay: 0.1, partials: SOFT }),
    note({ freq: NOTE.C5, at: 0.15, decay: 0.2, partials: SOFT }),
  ]),
  0.7
);

// The last hold of a workout ended: three notes climbing the chord, the top one left to ring.
writeWav(
  'workout-complete.wav',
  render([
    note({ freq: NOTE.E5, decay: 0.25, level: 0.8 }),
    note({ freq: NOTE.G5, at: 0.13, decay: 0.3, level: 0.9 }),
    note({ freq: NOTE.C6, at: 0.26, decay: 0.55, detune: 6 }),
  ]),
  0.8
);

// A milestone badge spins in. These must match SPIN_MS and SPIN_TURNS in milestone-reveal.tsx.
const SPIN_SECONDS = 3;
const SPIN_HALF_TURNS = 10;
// The spin eases out (cubic), so the badge shows a face in quick succession at first, then ever
// slower. A soft note marks each face and climbs the scale; the last face is the landing itself,
// which milestone.wav plays.
const SPIN_SCALE = [NOTE.C5, NOTE.D5, NOTE.E5, NOTE.G5, NOTE.A5, NOTE.C6, NOTE.D6, NOTE.E6, NOTE.G6];
const spinFaces = SPIN_SCALE.map((freq, i) => {
  const turned = (i + 1) / SPIN_HALF_TURNS;
  const at = SPIN_SECONDS * (1 - (1 - turned) ** (1 / 3));
  return note({ freq, at, decay: 0.07 + 0.012 * i, level: 0.35 + 0.05 * i, partials: SOFT });
});
// Under the notes a chord swells up to the landing, filling the slow last turn.
const spinSwell = [NOTE.C5, NOTE.G5, NOTE.C6].map((freq, i) =>
  swell({ freq, from: 0.2, to: SPIN_SECONDS, level: 0.5 - 0.1 * i, detune: 7 })
);
// Quieter than the landing, so the chime is the loudest moment.
writeWav('milestone-spin.wav', render([...spinFaces, ...spinSwell]), 0.45);

// The badge lands: a quick roll up two octaves over a low note, shimmering as it rings out.
writeWav(
  'milestone.wav',
  render([
    note({ freq: NOTE.C5, decay: 1.0, level: 0.5, partials: SOFT }),
    note({ freq: NOTE.C6, decay: 0.9, level: 0.8, detune: 8 }),
    note({ freq: NOTE.E6, at: 0.07, decay: 0.9, level: 0.7, detune: 8 }),
    note({ freq: NOTE.G6, at: 0.14, decay: 0.95, level: 0.65, detune: 8 }),
    note({ freq: NOTE.C7, at: 0.21, decay: 1.0, level: 0.6, detune: 10 }),
  ]),
  0.8
);
