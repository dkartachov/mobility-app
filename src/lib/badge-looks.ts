import { MILESTONE_HOURS } from './milestones';

export type BadgeLook = {
  /** Corner to corner; a single color is a flat fill. */
  fill: string[];
  /** The number drawn on it. */
  text: string;
  /** Bursts and halos around it when it's celebrated. */
  accent: string;
  /** An outline set in from the edge. */
  ring?: string;
  /** A band of light that sweeps across it every few seconds. */
  shine?: boolean;
  /** A soft pulsing glow behind it, in this color. */
  glow?: string;
  /** Glows in every color at once, turning slowly. Replaces `glow`. */
  prism?: boolean;
  /** Twinkling sparkles around it, in this color. */
  sparkles?: string;
};

export const PRISM_COLORS = ['#FF5F6D', '#FFC371', '#7CFFCB', '#5AC8FA', '#B57BFF'];

/**
 * One per milestone, in order, each a little more exciting than the last: plain muted colors
 * first, then rings, gradients, metals, and finally shine, glow and sparkles.
 */
const LOOKS: BadgeLook[] = [
  // Stone
  { fill: ['#9AA5A3'], text: '#FFFFFF', accent: '#9AA5A3' },
  // Sage
  { fill: ['#7FA08D'], text: '#FFFFFF', accent: '#7FA08D' },
  // Dusk blue
  { fill: ['#5F8FAD'], text: '#FFFFFF', accent: '#5F8FAD' },
  // Teal
  { fill: ['#0F8F82'], text: '#FFFFFF', accent: '#0F8F82' },
  // Cobalt
  { fill: ['#3B74C4'], ring: '#A9CBF2', text: '#FFFFFF', accent: '#3B74C4' },
  // Violet
  { fill: ['#7A5BC7'], ring: '#D3C6F7', text: '#FFFFFF', accent: '#7A5BC7' },
  // Lagoon
  { fill: ['#2BC0AE', '#2563EB'], text: '#FFFFFF', accent: '#2BA4C8' },
  // Sunset
  { fill: ['#F7A21B', '#E8457F'], text: '#FFFFFF', accent: '#F06D4F' },
  // Emerald
  { fill: ['#34D399', '#047857'], ring: '#BDF5DC', text: '#FFFFFF', accent: '#10B981' },
  // Bronze
  { fill: ['#F1B67A', '#B06A33', '#7A4119', '#C98545'], ring: '#FAD3A8', text: '#FFFFFF', accent: '#C98545' },
  // Silver
  {
    fill: ['#F6F8FA', '#B8C0C8', '#8A949E', '#DCE1E6'],
    ring: '#FFFFFF',
    text: '#2B3440',
    accent: '#A3ADB7',
    shine: true,
  },
  // Gold
  {
    fill: ['#FFE680', '#E2B007', '#A87A00', '#F2C94C'],
    ring: '#FFF3B0',
    text: '#4A3400',
    accent: '#E2B007',
    shine: true,
    glow: '#F2C94C',
  },
  // Ruby
  {
    fill: ['#FF7A95', '#C1121F', '#6A040F'],
    ring: '#FFC2CE',
    text: '#FFFFFF',
    accent: '#E5383B',
    shine: true,
    glow: '#FF4D6D',
  },
  // Sapphire
  {
    fill: ['#7DD3FC', '#1D4ED8', '#1E1B4B'],
    ring: '#BFDBFE',
    text: '#FFFFFF',
    accent: '#3B82F6',
    shine: true,
    glow: '#3B82F6',
    sparkles: '#93C5FD',
  },
  // Aurora
  {
    fill: ['#22D3EE', '#A855F7', '#EC4899'],
    ring: '#FFFFFF',
    text: '#FFFFFF',
    accent: '#A855F7',
    shine: true,
    glow: '#C084FC',
    sparkles: '#F0ABFC',
  },
  // Prism
  {
    fill: PRISM_COLORS,
    ring: '#FFFFFF',
    text: '#FFFFFF',
    accent: '#B57BFF',
    shine: true,
    prism: true,
    sparkles: '#FFD86B',
  },
];

/** Milestones added past the end of the list share the last, most exciting look. */
export function badgeLook(hours: number): BadgeLook {
  const index = MILESTONE_HOURS.indexOf(hours);
  return LOOKS[Math.min(Math.max(index, 0), LOOKS.length - 1)];
}
