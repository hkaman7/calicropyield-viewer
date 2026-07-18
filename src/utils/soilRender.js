import * as zarr from "zarrita";
import { soilZarrUrl } from "./gcsPaths";

// Pale tan -> brown -> dark brown ramp for continuous soil variables -
// distinct from ET's blue and CDL's crop-legend colors.
const CONTINUOUS_STOPS = [
  [0.98, 0.92, 0.78],
  [0.65, 0.45, 0.2],
  [0.25, 0.15, 0.05],
];

function continuousColorRgb(value, min, max) {
  const span = max - min || 1;
  const t = Math.max(0, Math.min(1, (value - min) / span));
  const segment = t < 0.5 ? 0 : 1;
  const localT = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const [r1, g1, b1] = CONTINUOUS_STOPS[segment];
  const [r2, g2, b2] = CONTINUOUS_STOPS[segment + 1];
  return [
    Math.round(255 * (r1 + (r2 - r1) * localT)),
    Math.round(255 * (g1 + (g2 - g1) * localT)),
    Math.round(255 * (b1 + (b2 - b1) * localT)),
  ];
}

// Fixed qualitative palette for categorical variables (niccdcd/iccdcd/
// flodfreqdcd), indexed by integer code.
const CATEGORICAL_PALETTE = [
  [0x1f, 0x77, 0xb4],
  [0xff, 0x7f, 0x0e],
  [0x2c, 0xa0, 0x2c],
  [0xd6, 0x27, 0x28],
  [0x94, 0x67, 0xbd],
  [0x8c, 0x56, 0x4b],
  [0xe3, 0x77, 0xc2],
  [0x7f, 0x7f, 0x7f],
];

/**
 * Fetches one variable's full 2D array plus its x/y coordinates from a
 * county's soil Zarr store. Returns a flat, row-major {data, width,
 * height, xmin, xmax, ymin, ymax, categories} - categories is the
 * code->label list for categorical variables, or null for continuous ones.
 */
export async function fetchSoilVariable(county, variableKey) {
  const store = new zarr.FetchStore(soilZarrUrl(county));
  const group = await zarr.open(store, { kind: "group" });

  const arr = await zarr.open(group.resolve(variableKey), { kind: "array" });
  const xArr = await zarr.open(group.resolve("x"), { kind: "array" });
  const yArr = await zarr.open(group.resolve("y"), { kind: "array" });

  const [{ data, shape }, xResult, yResult] = await Promise.all([
    zarr.get(arr),
    zarr.get(xArr),
    zarr.get(yArr),
  ]);
  const xData = xResult.data;
  const yData = yResult.data;

  return {
    data,
    width: shape[1],
    height: shape[0],
    xmin: xData[0],
    xmax: xData[xData.length - 1],
    ymin: yData[yData.length - 1],
    ymax: yData[0],
    categories: arr.attrs.categories ?? null,
  };
}

/** Rasterizes a fetchSoilVariable() result onto a canvas, returning
 * { canvas, bounds } like rasterToCanvas() does for CDL/ET. */
export function soilToCanvas({ data, width, height, xmin, xmax, ymin, ymax, categories }) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  const out = imageData.data;

  let min = Infinity;
  let max = -Infinity;
  if (!categories) {
    for (let i = 0; i < data.length; i++) {
      const v = data[i];
      if (!Number.isNaN(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }

  let idx = 0;
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (Number.isNaN(value)) {
      out[idx + 3] = 0;
    } else if (categories) {
      const code = Math.round(value);
      const [r, g, b] = CATEGORICAL_PALETTE[code % CATEGORICAL_PALETTE.length];
      out[idx] = r;
      out[idx + 1] = g;
      out[idx + 2] = b;
      out[idx + 3] = 255;
    } else {
      const [r, g, b] = continuousColorRgb(value, min, max);
      out[idx] = r;
      out[idx + 1] = g;
      out[idx + 2] = b;
      out[idx + 3] = 255;
    }
    idx += 4;
  }
  ctx.putImageData(imageData, 0, 0);

  return { canvas, bounds: [[ymin, xmin], [ymax, xmax]] };
}
