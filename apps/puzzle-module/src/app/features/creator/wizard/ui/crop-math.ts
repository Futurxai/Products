/**
 * Pure pan/zoom/crop-rectangle math for `ImageCropperComponent` —
 * split out from the component so it's testable without a DOM/canvas,
 * and because it's the part of a cropper that's actually easy to get
 * subtly wrong (off-by-one clamping, division by a stale scale, …).
 *
 * Model: the source image is rendered at `scale` (a multiplier on its
 * natural pixel size) and positioned so its top-left corner sits at
 * `(offsetX, offsetY)` relative to the square viewport's top-left
 * corner — both in viewport-pixel space. The viewport itself is a
 * fixed square window (`overflow: hidden`) the image is panned/zoomed
 * behind.
 */

export interface CropTransform {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The smallest scale at which the image still fully covers a `viewportSize` square — anything smaller would leave gaps. */
export function minCoverScale(imageWidth: number, imageHeight: number, viewportSize: number): number {
  return viewportSize / Math.min(imageWidth, imageHeight);
}

/** Keeps one axis's offset within the range that still fully covers the viewport at the given rendered image size on that axis. */
export function clampOffset(offset: number, renderedSize: number, viewportSize: number): number {
  const minOffset = Math.min(0, viewportSize - renderedSize);
  return clamp(offset, minOffset, 0);
}

/**
 * Clamps a full transform against an image's natural size and the
 * viewport — re-clamping both offsets after a scale change (e.g. after
 * zooming in, the previous offsets might no longer keep the image
 * covering the viewport and need to be pulled back in).
 */
export function clampTransform(
  transform: CropTransform,
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): CropTransform {
  const renderedWidth = imageWidth * transform.scale;
  const renderedHeight = imageHeight * transform.scale;
  return {
    scale: transform.scale,
    offsetX: clampOffset(transform.offsetX, renderedWidth, viewportSize),
    offsetY: clampOffset(transform.offsetY, renderedHeight, viewportSize),
  };
}

export interface SourceRect {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

/** The square region, in the *original image's* natural pixel coordinates, that the viewport is currently showing — what a canvas export should draw from. */
export function computeSourceRect(transform: CropTransform, viewportSize: number): SourceRect {
  return {
    // `(0 - x)` rather than `-x` — avoids producing -0 when offsetX/offsetY is exactly 0,
    // which is harmless for canvas drawing but needlessly fails strict equality in tests.
    x: (0 - transform.offsetX) / transform.scale,
    y: (0 - transform.offsetY) / transform.scale,
    size: viewportSize / transform.scale,
  };
}
