import { describe, expect, it } from 'vitest';
import { jaggedRect, slantedRect, slantOffset, toSvgPoints } from '@/theme/shapes';

const inside = (w: number, h: number) => ([x, y]: readonly [number, number]) =>
  x >= 0 && x <= w && y >= 0 && y <= h;

describe('slantOffset', () => {
  it('is the horizontal run of the slant over the box height', () => {
    expect(slantOffset(200, 100, -8)).toBeCloseTo(100 * Math.tan((8 * Math.PI) / 180), 5);
  });
  it('is the same for opposite angles and 0 when the skew is 0', () => {
    expect(slantOffset(200, 100, 8)).toBeCloseTo(slantOffset(200, 100, -8), 5);
    expect(slantOffset(200, 100, 0)).toBe(0);
  });
  it('clamps to half the width', () => {
    expect(slantOffset(10, 100, -60)).toBe(5);
  });
  it('matches the offset used by slantedRect', () => {
    expect(slantedRect(200, 100, -8)[0][0]).toBeCloseTo(slantOffset(200, 100, -8), 5);
  });
});

describe('slantedRect', () => {
  it('returns a 4-point parallelogram inside the box', () => {
    const pts = slantedRect(200, 40, -8);
    expect(pts).toHaveLength(4);
    expect(pts.every(inside(200, 40))).toBe(true);
  });
  it('is a plain rectangle when the skew is 0', () => {
    expect(slantedRect(100, 20, 0)).toEqual([[0, 0], [100, 0], [100, 20], [0, 20]]);
  });
  it('clamps the slant offset to half the width on extreme angles', () => {
    const pts = slantedRect(10, 100, -60);
    expect(pts.every(inside(10, 100))).toBe(true);
  });
});

describe('jaggedRect', () => {
  it('keeps every point inside the box', () => {
    expect(jaggedRect(300, 30, 12, 6).every(inside(300, 30))).toBe(true);
  });
  it('has 2 top corners plus 2 points per tooth on the bottom edge plus 1 closing point', () => {
    expect(jaggedRect(300, 30, 12, 6)).toHaveLength(2 + 12 * 2 + 1);
  });
});

describe('toSvgPoints', () => {
  it('serializes points with one decimal', () => {
    expect(toSvgPoints([[0, 0], [10.25, 5]])).toBe('0.0,0.0 10.3,5.0');
  });
});
