// Pale-blue -> deep-blue sequential ramp for ET (mm), scaled to the actual
// min/max of whichever file is loaded (georaster reports these per band,
// so the scale adapts instead of assuming a fixed range).
export const ET_STOPS = [
  [0.94, 0.98, 1.0],
  [0.25, 0.55, 0.85],
  [0.02, 0.13, 0.35],
];

// Given a 3-stop [r,g,b] (0-1 each) ramp, returns a function mapping
// value -> [r,g,b] (0-255 each). Returning ints rather than a CSS string
// matters here - this runs on the per-pixel hot path when rasterizing a
// whole county to canvas, and string allocation/parsing per pixel adds up.
export function makeSequentialColorFn(stops) {
  return function colorFn(value, min, max) {
    const span = max - min || 1;
    const t = Math.max(0, Math.min(1, (value - min) / span));
    const segment = t < 0.5 ? 0 : 1;
    const localT = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
    const [r1, g1, b1] = stops[segment];
    const [r2, g2, b2] = stops[segment + 1];
    return [
      Math.round(255 * (r1 + (r2 - r1) * localT)),
      Math.round(255 * (g1 + (g2 - g1) * localT)),
      Math.round(255 * (b1 + (b2 - b1) * localT)),
    ];
  };
}

// CSS linear-gradient string for a legend swatch, built from the same
// stops used to render the data - so the legend can never drift out of
// sync with the actual color function.
export function stopsToCssGradient(stops) {
  const colors = stops.map(([r, g, b]) => `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`);
  return `linear-gradient(to right, ${colors.join(", ")})`;
}

export const etColorRgb = makeSequentialColorFn(ET_STOPS);

// Pale-yellow -> orange -> deep-red sequential ramp for climate variables -
// distinct from ET's blue and soil's tan/brown, and reasonably neutral
// across temperature/precipitation/radiation/etc. rather than tuned to one.
export const CLIMATE_STOPS = [
  [0.99, 0.96, 0.8],
  [0.94, 0.55, 0.2],
  [0.55, 0.05, 0.1],
];

export const climateColorRgb = makeSequentialColorFn(CLIMATE_STOPS);
