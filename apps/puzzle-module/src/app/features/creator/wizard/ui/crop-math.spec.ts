import { clamp, clampOffset, clampTransform, computeSourceRect, minCoverScale } from './crop-math';

describe('clamp', () => {
  it('passes a value through unchanged when already in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to the min/max bounds', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('minCoverScale', () => {
  it('scales so the short edge exactly fills the viewport', () => {
    expect(minCoverScale(2000, 1000, 280)).toBeCloseTo(280 / 1000);
    expect(minCoverScale(1000, 2000, 280)).toBeCloseTo(280 / 1000);
  });

  it('handles an already-square image', () => {
    expect(minCoverScale(500, 500, 280)).toBeCloseTo(280 / 500);
  });
});

describe('clampOffset', () => {
  it('is exactly 0 when the rendered size exactly matches the viewport (no pan range)', () => {
    expect(clampOffset(50, 280, 280)).toBe(0);
    expect(clampOffset(-50, 280, 280)).toBe(0);
  });

  it('allows panning up to the full slack when the image is larger than the viewport', () => {
    // rendered 400 in a 280 viewport -> 120px of slack, offset range [-120, 0]
    expect(clampOffset(0, 400, 280)).toBe(0);
    expect(clampOffset(-120, 400, 280)).toBe(-120);
    expect(clampOffset(-200, 400, 280)).toBe(-120);
    expect(clampOffset(50, 400, 280)).toBe(0);
  });
});

describe('clampTransform', () => {
  it('re-clamps offsets against the new rendered size after a scale change', () => {
    // A 1000x1000 image at scale 0.28 renders at 280x280 (exactly covering a 280 viewport) — no pan range.
    const atMinScale = clampTransform({ offsetX: -50, offsetY: -50, scale: 0.28 }, 1000, 1000, 280);
    expect(atMinScale.offsetX).toBe(0);
    expect(atMinScale.offsetY).toBe(0);

    // Zoomed in to scale 0.5 -> renders at 500x500, 220px of slack per axis.
    const zoomedIn = clampTransform({ offsetX: -50, offsetY: -300, scale: 0.5 }, 1000, 1000, 280);
    expect(zoomedIn.offsetX).toBe(-50); // within range, untouched
    expect(zoomedIn.offsetY).toBe(-220); // pulled back into range
  });
});

describe('computeSourceRect', () => {
  it('maps the viewport window back to the original image at scale 1 with no offset', () => {
    const rect = computeSourceRect({ offsetX: 0, offsetY: 0, scale: 1 }, 280);
    expect(rect).toEqual({ x: 0, y: 0, size: 280 });
  });

  it('accounts for zoom — a smaller source region is shown at higher scale', () => {
    const rect = computeSourceRect({ offsetX: 0, offsetY: 0, scale: 2 }, 280);
    expect(rect.size).toBeCloseTo(140);
  });

  it('accounts for pan offset, converting viewport-space back to image-space', () => {
    const rect = computeSourceRect({ offsetX: -100, offsetY: -50, scale: 1 }, 280);
    expect(rect.x).toBeCloseTo(100);
    expect(rect.y).toBeCloseTo(50);
  });
});
