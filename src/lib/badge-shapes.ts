import { MILESTONE_HOURS } from './milestones';

/**
 * What a badge is cut into. Everything is drawn in a square reaching 1 each way from the origin,
 * and is the same left to right, so a badge looks right seen from behind as it spins.
 */
export type BadgeShape = {
  /** SVG paths that together make up the outline. */
  silhouette: string[];
  detail:
    | {
        /** A raised face the same shape as the badge, this much smaller, leaving a rim round it. */
        kind: 'face';
        scale: number;
      }
    | {
        /** A round face, for outlines too busy to repeat. `double` adds a second ring inside it. */
        kind: 'disc';
        radius: number;
        double?: boolean;
      }
    | {
        /** A cut gem: facets round a flat table that holds the number. */
        kind: 'facets';
        facets: Facet[];
        table: string;
      }
    | {
        /** The silhouette's second path laid lighter over its first, with a disc in the middle. */
        kind: 'layers';
        disc: number;
      };
};

export type Facet = {
  path: string;
  /** How much it faces the light, from 1 for lit to -1 for in shadow. */
  light: number;
};

type Point = [number, number];

const TAU = Math.PI * 2;
/** Points round a curved outline. Divides by 8 and 12, so every shape's cusps land on one. */
const STEPS = 240;
/** Towards the top left, where the light on the facets comes from. */
const LIGHT: Point = [-0.5, -0.866];

/** `angle` is clockwise from straight up. */
function point(radius: number, angle: number): Point {
  return [radius * Math.sin(angle), -radius * Math.cos(angle)];
}

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

function path(points: Point[]) {
  return `M${points.map(([x, y]) => `${round(x)},${round(y)}`).join('L')}Z`;
}

/** An outline whose distance from the middle is given for each angle. */
function radial(radiusAt: (angle: number) => number) {
  return path(
    Array.from({ length: STEPS }, (_, i) => {
      const angle = (i / STEPS) * TAU;
      return point(radiusAt(angle), angle);
    }),
  );
}

function regular(sides: number, radius = 1, turn = 0) {
  return Array.from({ length: sides }, (_, i) => point(radius, (i / sides) * TAU + turn));
}

function star(points: number, inner: number, turn = 0, outer = 1) {
  return Array.from({ length: points * 2 }, (_, i) =>
    point(i % 2 === 1 ? inner : outer, (i / (points * 2)) * TAU + turn),
  );
}

/** A polygon with each corner cut back by `radius` and curved. */
function rounded(points: Point[], radius: number) {
  const count = points.length;
  const segments = points.map(([x, y], i) => {
    const toward = ([otherX, otherY]: Point) => {
      const length = Math.hypot(otherX - x, otherY - y);
      const share = Math.min(radius, length / 2) / length;
      return `${round(x + (otherX - x) * share)},${round(y + (otherY - y) * share)}`;
    };
    const from = toward(points[(i - 1 + count) % count]);
    const to = toward(points[(i + 1) % count]);
    return `${i === 0 ? 'M' : 'L'}${from}Q${round(x)},${round(y)} ${to}`;
  });
  return `${segments.join('')}Z`;
}

/** Circles of `radius` set `distance` out from the middle, merged into one outline. */
function lobes(count: number, distance: number, radius: number) {
  return radial((angle) => {
    let furthest = 0;
    for (let i = 0; i < count; i++) {
      const offset = angle - (i / count) * TAU;
      const across = distance * Math.sin(offset);
      if (Math.abs(across) < radius) {
        furthest = Math.max(furthest, distance * Math.cos(offset) + Math.sqrt(radius * radius - across * across));
      }
    }
    return furthest;
  });
}

/** Facets take turns being a touch brighter and darker, which is what makes a cut gem glitter. */
function facet(points: Point[], index: number): Facet {
  const x = points.reduce((sum, p) => sum + p[0], 0);
  const y = points.reduce((sum, p) => sum + p[1], 0);
  const length = Math.hypot(x, y) || 1;
  const facing = (x / length) * LIGHT[0] + (y / length) * LIGHT[1];
  return { path: path(points), light: facing + (index % 2 === 1 ? 0.12 : -0.12) };
}

const SHIELD =
  'M0,-.96C.3,-.8 .6,-.74 .84,-.74L.84,.05C.84,.5 .5,.8 0,.98C-.5,.8 -.84,.5 -.84,.05L-.84,-.74C-.6,-.74 -.3,-.8 0,-.96Z';
const CREST =
  'M-.84,-.9Q-.42,-.6 0,-.9Q.42,-.6 .84,-.9L.84,.1C.84,.55 .45,.82 0,.98C-.45,.82 -.84,.55 -.84,.1Z';

const TABLE = 0.62;

function octagonCut(): BadgeShape {
  const outer = regular(8, 1, Math.PI / 8);
  const table = regular(8, TABLE, Math.PI / 8);
  const facets = outer.map((_, i) => {
    const next = (i + 1) % 8;
    return facet([outer[i], outer[next], table[next], table[i]], i);
  });
  return { silhouette: [path(outer)], detail: { kind: 'facets', facets, table: path(table) } };
}

function brilliantCut(): BadgeShape {
  const outer = regular(12);
  const table = regular(6, TABLE);
  const facets: Facet[] = [];
  for (let i = 0; i < 6; i++) {
    // A kite out to each corner of the table, and a triangle filling in between two of them.
    facets.push(facet([table[i], outer[(2 * i + 11) % 12], outer[2 * i], outer[2 * i + 1]], facets.length));
    facets.push(facet([table[i], outer[2 * i + 1], table[(i + 1) % 6]], facets.length));
  }
  return { silhouette: [path(outer)], detail: { kind: 'facets', facets, table: path(table) } };
}

/** Sixteen points round a seal, the four compass ones longest and every other one shorter. */
function compassSeal() {
  return path(
    Array.from({ length: 32 }, (_, i) => point(i % 2 === 1 ? 0.84 : i % 4 === 0 ? 1 : 0.93, (i / 32) * TAU)),
  );
}

/**
 * One per milestone, in order, each more elaborate than the last: simple forms first, then
 * scalloped edges, crests and rosettes, medallion seals, cut gems and finally layered stars.
 * They keep step with the looks in `badge-looks.ts`.
 */
const SHAPES: BadgeShape[] = [
  // Circle
  { silhouette: [radial(() => 1)], detail: { kind: 'face', scale: 0.82 } },
  // Squircle
  {
    silhouette: [radial((angle) => 0.86 / (Math.cos(angle) ** 4 + Math.sin(angle) ** 4) ** 0.25)],
    detail: { kind: 'face', scale: 0.82 },
  },
  // Rounded hexagon
  { silhouette: [rounded(regular(6), 0.24)], detail: { kind: 'face', scale: 0.82 } },
  // Shield
  { silhouette: [SHIELD], detail: { kind: 'face', scale: 0.82 } },
  // Soft scallop
  { silhouette: [radial((angle) => 0.94 + 0.06 * Math.cos(8 * angle))], detail: { kind: 'face', scale: 0.83 } },
  // Bottle cap
  {
    silhouette: [radial((angle) => 0.89 + 0.11 * Math.abs(Math.cos(6 * angle)) ** 0.7)],
    detail: { kind: 'disc', radius: 0.74 },
  },
  // Quatrefoil
  { silhouette: [lobes(4, 0.42, 0.58)], detail: { kind: 'face', scale: 0.8 } },
  // Crest
  { silhouette: [CREST], detail: { kind: 'face', scale: 0.82 } },
  // Petal star
  {
    silhouette: [radial((angle) => 1 - 0.22 * Math.abs(Math.sin(3 * angle)) ** 0.75)],
    detail: { kind: 'disc', radius: 0.64 },
  },
  // 12-point seal
  { silhouette: [path(star(12, 0.86))], detail: { kind: 'disc', radius: 0.74 } },
  // Compass seal
  { silhouette: [compassSeal()], detail: { kind: 'disc', radius: 0.72 } },
  // 24-point seal
  { silhouette: [path(star(24, 0.9))], detail: { kind: 'disc', radius: 0.78, double: true } },
  octagonCut(),
  brilliantCut(),
  // Double star
  {
    silhouette: [path(star(8, 0.62)), path(star(8, 0.58, Math.PI / 8, 0.8))],
    detail: { kind: 'layers', disc: 0.56 },
  },
  // Sunburst
  {
    silhouette: [path(star(12, 0.6)), path(star(12, 0.68, Math.PI / 12, 0.84))],
    detail: { kind: 'layers', disc: 0.6 },
  },
];

/** Milestones added past the end of the list share the last, most elaborate shape. */
export function badgeShape(hours: number): BadgeShape {
  const index = MILESTONE_HOURS.indexOf(hours);
  return SHAPES[Math.min(Math.max(index, 0), SHAPES.length - 1)];
}

/**
 * How much smaller to draw a badge's number so it stays inside the middle of its shape. Three
 * digits are the widest, and land on the shapes with the least room.
 */
export function badgeNumberScale(hours: number) {
  return hours >= 100 ? 0.82 : 1;
}
