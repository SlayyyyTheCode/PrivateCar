import { describe, expect, it } from 'vitest';
import {
  CAR_DIMENSIONS,
  bodyOutline,
  glassOutline,
  greenhouseOutline,
  offsetInward,
  tyreProfile,
  wheelPlacements,
  type Vec2,
} from '../../src/ui/carProfile';
import type { BodyShape } from '../../src/core/listing';

const SHAPES = Object.keys(CAR_DIMENSIONS) as BodyShape[];

function pointInPolygon([x, y]: Vec2, polygon: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const bounds = (points: Vec2[]) => ({
  minX: Math.min(...points.map((p) => p[0])),
  maxX: Math.max(...points.map((p) => p[0])),
  minY: Math.min(...points.map((p) => p[1])),
  maxY: Math.max(...points.map((p) => p[1])),
});

describe.each(SHAPES)('car profile — %s', (shape) => {
  const d = CAR_DIMENSIONS[shape];

  it('produces a closed outline that fits the stated length', () => {
    const body = bodyOutline(shape);
    expect(body.length).toBeGreaterThan(30);

    const box = bounds(body);
    expect(box.maxX - box.minX).toBeCloseTo(d.length, 1);
    expect(box.minY).toBeGreaterThanOrEqual(0);
  });

  it('leaves room for the wheels inside the arches', () => {
    // The arch is centred on the axle, so it only clears the tyre if it is the
    // larger radius. Centre it on the sill instead and the tyre stands proud.
    for (const wheel of wheelPlacements(shape)) {
      expect(d.archRadius).toBeGreaterThan(wheel.radius);
    }
  });

  it('sits the bonnet below the beltline, and the beltline below the roof', () => {
    expect(d.bonnetY).toBeLessThan(d.beltlineY);
    expect(d.beltlineY).toBeLessThan(d.roofY);
  });

  it('keeps the rear screen ahead of the tail', () => {
    expect(d.bootX).toBeGreaterThan(-d.length / 2);
  });

  it('keeps every pane of glass inside the greenhouse', () => {
    const greenhouse = greenhouseOutline(shape);
    for (const point of glassOutline(shape)) {
      expect(pointInPolygon(point, greenhouse)).toBe(true);
    }
  });

  it('narrows the greenhouse relative to the body', () => {
    expect(d.tumblehome).toBeGreaterThan(0.7);
    expect(d.tumblehome).toBeLessThan(1);
  });
});

describe('body shapes are actually distinguishable', () => {
  it('makes an SUV taller than a sedan, and a coupe lower than both', () => {
    expect(CAR_DIMENSIONS.suv.roofY).toBeGreaterThan(CAR_DIMENSIONS.sedan.roofY);
    expect(CAR_DIMENSIONS.coupe.roofY).toBeLessThan(CAR_DIMENSIONS.sedan.roofY);
    expect(CAR_DIMENSIONS.suv.groundClearance).toBeGreaterThan(CAR_DIMENSIONS.coupe.groundClearance);
  });

  it('gives a wagon a longer roof than a sedan', () => {
    const roofLength = (s: BodyShape) => CAR_DIMENSIONS[s].roofFrontX - CAR_DIMENSIONS[s].roofRearX;
    expect(roofLength('wagon')).toBeGreaterThan(roofLength('sedan'));
    expect(roofLength('coupe')).toBeLessThan(roofLength('sedan'));
  });

  it('makes a hatchback the shortest car', () => {
    for (const shape of SHAPES.filter((s) => s !== 'hatchback')) {
      expect(CAR_DIMENSIONS.hatchback.length).toBeLessThan(CAR_DIMENSIONS[shape].length);
    }
  });
});

describe('offsetInward', () => {
  it('shrinks a square towards its centre', () => {
    const square: Vec2[] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    const inset = offsetInward(square, 0.5);
    const box = bounds(inset);
    expect(box.minX).toBeCloseTo(0.5, 5);
    expect(box.maxX).toBeCloseTo(1.5, 5);
    expect(box.minY).toBeCloseTo(0.5, 5);
    expect(box.maxY).toBeCloseTo(1.5, 5);
  });

  it('gives the same result whichever way the polygon winds', () => {
    const square: Vec2[] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    const forward = bounds(offsetInward(square, 0.4));
    const reversed = bounds(offsetInward([...square].reverse(), 0.4));
    expect(forward).toEqual(reversed);
  });
});

describe('tyreProfile', () => {
  it('runs from the rim out to the tread and back', () => {
    const profile = tyreProfile(0.34);
    const radii = profile.map((p) => p[0]);
    expect(Math.max(...radii)).toBeCloseTo(0.34, 6);
    expect(Math.min(...radii)).toBeLessThan(0.34);
    // Symmetric about the wheel centre line.
    expect(profile[0][1]).toBeCloseTo(-profile[profile.length - 1][1], 6);
  });
});
