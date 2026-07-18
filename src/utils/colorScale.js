// Continuous brown -> yellow -> green ramp for ET (mm), scaled to the
// actual min/max of whichever file is loaded (georaster reports these per
// band, so the scale adapts instead of assuming a fixed range).
const STOPS = [
  [0.65, 0.44, 0.24],
  [1.0, 0.85, 0.3],
  [0.13, 0.55, 0.13],
];

// Returns [r, g, b] (0-255 each) rather than a CSS string - this is on the
// per-pixel hot path when rasterizing a whole county to canvas, so it
// avoids string allocation/parsing overhead.
export function etColorRgb(value, min, max) {
  const span = max - min || 1;
  const t = Math.max(0, Math.min(1, (value - min) / span));
  const segment = t < 0.5 ? 0 : 1;
  const localT = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const [r1, g1, b1] = STOPS[segment];
  const [r2, g2, b2] = STOPS[segment + 1];
  return [
    Math.round(255 * (r1 + (r2 - r1) * localT)),
    Math.round(255 * (g1 + (g2 - g1) * localT)),
    Math.round(255 * (b1 + (b2 - b1) * localT)),
  ];
}
