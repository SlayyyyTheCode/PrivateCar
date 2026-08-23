import type { BodyShape } from '../core/listing';

/**
 * The car's silhouette, as pure 2D maths.
 *
 * Kept free of three.js so the outline can be rasterised and inspected on its
 * own — the profile is what decides whether the model reads as a car or as a
 * stack of boxes, so it is worth being able to look at in isolation.
 *
 * Coordinates are metres in side view: +x towards the nose, +y up, ground at 0.
 */

export type Vec2 = [number, number];

export interface CarDimensions {
  length: number;
  width: number;
  /** Height of the beltline — where the metal stops and the glass starts. */
  beltlineY: number;
  /** Top of the roof. */
  roofY: number;
  /** Height of the bonnet at the base of the windscreen. */
  bonnetY: number;
  /** Where the windscreen meets the bonnet, and where the roof ends at the back. */
  windscreenBaseX: number;
  roofFrontX: number;
  roofRearX: number;
  /** Where the rear screen meets the boot. */
  bootX: number;
  bootY: number;
  wheelRadius: number;
  /** Wheel arch radius — always a little larger than the wheel. */
  archRadius: number;
  frontAxleX: number;
  rearAxleX: number;
  groundClearance: number;
  /** How far the greenhouse narrows relative to the body, as a fraction. */
  tumblehome: number;
}

/**
 * Proportions per body type, in metres.
 *
 * These are the numbers that distinguish a coupe from an MPV: how long the
 * cabin is, how fast the roof falls away, how high the car sits.
 */
export const CAR_DIMENSIONS: Record<BodyShape, CarDimensions> = {
  sedan: {
    length: 4.6, width: 1.82, beltlineY: 1.02, roofY: 1.46, bonnetY: 0.84,
    windscreenBaseX: 0.62, roofFrontX: -0.12, roofRearX: -0.96, bootX: -1.66, bootY: 1.06,
    wheelRadius: 0.33, archRadius: 0.42, frontAxleX: 1.36, rearAxleX: -1.34,
    groundClearance: 0.14, tumblehome: 0.86,
  },
  coupe: {
    length: 4.5, width: 1.88, beltlineY: 0.94, roofY: 1.38, bonnetY: 0.78,
    windscreenBaseX: 0.5, roofFrontX: -0.3, roofRearX: -0.95, bootX: -1.72, bootY: 1.08,
    wheelRadius: 0.35, archRadius: 0.44, frontAxleX: 1.4, rearAxleX: -1.32,
    groundClearance: 0.1, tumblehome: 0.84,
  },
  hatchback: {
    length: 4.0, width: 1.76, beltlineY: 1.0, roofY: 1.48, bonnetY: 0.82,
    windscreenBaseX: 0.46, roofFrontX: -0.18, roofRearX: -1.28, bootX: -1.74, bootY: 1.3,
    wheelRadius: 0.31, archRadius: 0.4, frontAxleX: 1.2, rearAxleX: -1.16,
    groundClearance: 0.14, tumblehome: 0.87,
  },
  wagon: {
    length: 4.75, width: 1.82, beltlineY: 1.02, roofY: 1.5, bonnetY: 0.84,
    windscreenBaseX: 0.56, roofFrontX: -0.16, roofRearX: -1.86, bootX: -2.16, bootY: 1.42,
    wheelRadius: 0.33, archRadius: 0.42, frontAxleX: 1.42, rearAxleX: -1.4,
    groundClearance: 0.14, tumblehome: 0.87,
  },
  suv: {
    length: 4.65, width: 1.94, beltlineY: 1.3, roofY: 1.86, bonnetY: 1.12,
    windscreenBaseX: 0.56, roofFrontX: -0.08, roofRearX: -1.72, bootX: -2.04, bootY: 1.74,
    wheelRadius: 0.39, archRadius: 0.5, frontAxleX: 1.42, rearAxleX: -1.38,
    groundClearance: 0.3, tumblehome: 0.9,
  },
  mpv: {
    length: 4.8, width: 1.9, beltlineY: 1.24, roofY: 1.9, bonnetY: 1.0,
    windscreenBaseX: 0.92, roofFrontX: 0.24, roofRearX: -1.94, bootX: -2.22, bootY: 1.8,
    wheelRadius: 0.36, archRadius: 0.47, frontAxleX: 1.48, rearAxleX: -1.36,
    groundClearance: 0.24, tumblehome: 0.92,
  },
};

/** Samples a quadratic Bézier, which is what gives the body its curves. */
function quad(from: Vec2, control: Vec2, to: Vec2, segments = 10): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 1; i <= segments; i += 1) {
    const t = i / segments;
    const u = 1 - t;
    points.push([
      u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
      u * u * from[1] + 2 * u * t * control[1] + t * t * to[1],
    ]);
  }
  return points;
}

/** Half-circle over a wheel, travelling in +x, which cuts the wheel arch. */
function arch(centreX: number, centreY: number, radius: number, segments = 16): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = Math.PI - (i / segments) * Math.PI;
    points.push([centreX + Math.cos(angle) * radius, centreY + Math.sin(angle) * radius]);
  }
  return points;
}

/**
 * Sill, then up the arch lip, over the wheel, and back down to the sill.
 *
 * The arch has to be centred on the axle, not on the sill — centre it on the
 * sill and the top of the tyre stands proud of the bodywork.
 */
function wheelArch(axleX: number, wheelCentreY: number, archRadius: number, sill: number): Vec2[] {
  return [
    [axleX - archRadius, sill],
    [axleX - archRadius, wheelCentreY],
    ...arch(axleX, wheelCentreY, archRadius),
    [axleX + archRadius, sill],
  ];
}

/**
 * The lower body: everything below the glass.
 *
 * Runs along the underside from tail to nose, arching over each wheel, up over
 * the nose and along the bonnet, then steps up to the beltline and runs back to
 * the tail. The step from bonnet to beltline is what stops the side view
 * reading as one flat slab.
 */
export function bodyOutline(shape: BodyShape): Vec2[] {
  const d = CAR_DIMENSIONS[shape];
  const nose = d.length / 2;
  const tail = -d.length / 2;
  const sill = d.groundClearance;
  const belt = d.beltlineY;
  const axleY = d.wheelRadius;

  const points: Vec2[] = [[tail + 0.14, sill]];

  // Underside, forwards, arching over each wheel.
  points.push(...wheelArch(d.rearAxleX, axleY, d.archRadius, sill));
  points.push(...wheelArch(d.frontAxleX, axleY, d.archRadius, sill));
  points.push([nose - 0.14, sill]);

  // Front bumper and nose.
  points.push(...quad([nose - 0.14, sill], [nose + 0.03, sill + 0.08], [nose, sill + 0.34]));
  points.push(...quad([nose, sill + 0.34], [nose + 0.02, d.bonnetY - 0.04], [nose - 0.3, d.bonnetY]));

  // Bonnet, running back and rising gently to the base of the windscreen.
  points.push(...quad(
    [nose - 0.3, d.bonnetY],
    [(nose + d.windscreenBaseX) / 2, d.bonnetY + 0.05],
    [d.windscreenBaseX, d.bonnetY + 0.1],
  ));

  // Cowl: the step up from bonnet height to the beltline.
  points.push(...quad(
    [d.windscreenBaseX, d.bonnetY + 0.1],
    [d.windscreenBaseX - 0.08, belt - 0.02],
    [d.windscreenBaseX - 0.16, belt],
  ));

  // Beltline back to the boot, then down the tail.
  points.push([d.bootX, belt]);
  points.push(...quad([d.bootX, belt], [tail + 0.05, belt], [tail, belt - 0.26]));
  points.push(...quad([tail, belt - 0.26], [tail - 0.02, sill + 0.12], [tail + 0.14, sill]));

  return points;
}

/**
 * The greenhouse: windscreen, roof and rear screen.
 *
 * Extruded narrower than the body, which is the tumblehome every real car has
 * and one of the strongest cues that this is not a box.
 */
export function greenhouseOutline(shape: BodyShape): Vec2[] {
  const d = CAR_DIMENSIONS[shape];
  const belt = d.beltlineY;
  // Start at the cowl so the windscreen springs from the bonnet, not mid-door.
  const base: Vec2 = [d.windscreenBaseX - 0.16, belt];

  const points: Vec2[] = [base];

  points.push(...quad(base, [d.roofFrontX + 0.34, d.roofY - 0.08], [d.roofFrontX, d.roofY]));
  points.push(...quad(
    [d.roofFrontX, d.roofY],
    [(d.roofFrontX + d.roofRearX) / 2, d.roofY + 0.025],
    [d.roofRearX, d.roofY],
  ));
  points.push(...quad([d.roofRearX, d.roofY], [d.bootX + 0.3, d.bootY + 0.16], [d.bootX, d.bootY]));
  points.push([d.bootX, belt]);

  return points;
}

/** Pillar thickness left between the glass and the edge of the greenhouse. */
const PILLAR = 0.12;

function signedArea(points: Vec2[]): number {
  let total = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    total += (points[j][0] - points[i][0]) * (points[j][1] + points[i][1]);
  }
  return total / 2;
}

/**
 * Shrinks a polygon inwards by a fixed distance, mitring at the corners.
 *
 * Used to cut the glass out of the greenhouse. Offsetting properly matters:
 * scaling the outline about its centre instead thins the pillars unevenly and
 * lets the glass escape past the windscreen and rear screen entirely.
 */
export function offsetInward(points: Vec2[], distance: number): Vec2[] {
  const ring = signedArea(points) > 0 ? points : [...points].reverse();
  const count = ring.length;

  const result: Vec2[] = [];
  for (let i = 0; i < count; i += 1) {
    const prev = ring[(i - 1 + count) % count];
    const here = ring[i];
    const next = ring[(i + 1) % count];

    // Interior lies to the left of each directed edge on a counter-clockwise ring.
    const leftNormal = (from: Vec2, to: Vec2): Vec2 => {
      const dx = to[0] - from[0];
      const dy = to[1] - from[1];
      const length = Math.hypot(dx, dy) || 1;
      return [-dy / length, dx / length];
    };

    const a = leftNormal(prev, here);
    const b = leftNormal(here, next);

    let mx = a[0] + b[0];
    let my = a[1] + b[1];
    const mlen = Math.hypot(mx, my);
    if (mlen < 1e-6) continue; // a spike; dropping it is better than a blow-up
    mx /= mlen;
    my /= mlen;

    // Lengthen the step at sharp corners, but never runaway: an unclamped miter
    // throws a spike out of the windscreen corner.
    const miter = Math.min(1.6, 1 / Math.max(0.4, mx * a[0] + my * a[1]));
    result.push([here[0] + mx * distance * miter, here[1] + my * distance * miter]);
  }

  // Mitring can still push a vertex back out through a neighbouring edge on a
  // narrow cabin. Anything that escaped is not part of the inset shape.
  return result.filter((point) => pointInPolygon(point, ring));
}

function pointInPolygon([x, y]: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * The side glass: the greenhouse, pulled in by a pillar's width.
 *
 * The inset is then clamped into the cabin's inner box. Mitring alone can leave
 * an edge that crosses back out near the top of the windscreen, which shows up
 * as a shard of glass poking through the A-pillar.
 */
export function glassOutline(shape: BodyShape): Vec2[] {
  const d = CAR_DIMENSIONS[shape];
  const inset = offsetInward(greenhouseOutline(shape), PILLAR);

  const minX = d.bootX + PILLAR;
  const maxX = d.windscreenBaseX - 0.16 - PILLAR * 0.4;
  const minY = d.beltlineY + PILLAR * 0.4;
  const maxY = d.roofY - PILLAR * 0.9;

  return inset.map(([x, y]) => [
    Math.min(maxX, Math.max(minX, x)),
    Math.min(maxY, Math.max(minY, y)),
  ]);
}

export interface WheelPlacement {
  x: number;
  radius: number;
}

export function wheelPlacements(shape: BodyShape): WheelPlacement[] {
  const d = CAR_DIMENSIONS[shape];
  return [
    { x: d.frontAxleX, radius: d.wheelRadius },
    { x: d.rearAxleX, radius: d.wheelRadius },
  ];
}

/** Tyre cross-section for a lathe: [radius, offset along the axle]. */
export function tyreProfile(radius: number, halfWidth = 0.11): Vec2[] {
  const rim = radius * 0.62;
  const shoulder = radius * 0.12;
  return [
    [rim, -halfWidth],
    [radius - shoulder, -halfWidth],
    [radius - shoulder * 0.35, -halfWidth + shoulder * 0.45],
    [radius, -halfWidth + shoulder],
    [radius, halfWidth - shoulder],
    [radius - shoulder * 0.35, halfWidth - shoulder * 0.45],
    [radius - shoulder, halfWidth],
    [rim, halfWidth],
  ];
}
