import cdlLegend from "../data/cdlLegend.json";
import { etColorRgb } from "./colorScale";

// Precomputed RGB lookup table for CDL crop codes 0-255 - avoids a legend
// object lookup + hex parse per pixel.
const CDL_LUT = new Uint8Array(256 * 3);
for (let code = 0; code < 256; code++) {
  const entry = cdlLegend[String(code)];
  if (entry) {
    const hex = entry.color;
    CDL_LUT[code * 3] = parseInt(hex.slice(0, 2), 16);
    CDL_LUT[code * 3 + 1] = parseInt(hex.slice(2, 4), 16);
    CDL_LUT[code * 3 + 2] = parseInt(hex.slice(4, 6), 16);
  }
}

/**
 * Rasterizes a single-band georaster onto a canvas, applying the given
 * dataType's color scheme, and returns { canvas, bounds } where bounds is a
 * [[south, west], [north, east]] pair suitable for L.imageOverlay. Assumes
 * the georaster is already in plain lat/lng (EPSG:4326) - true for every
 * file this app reads - so no reprojection/warping is needed, just a
 * straight per-pixel color mapping.
 */
export function rasterToCanvas(georaster, dataType) {
  const { width, height } = georaster;
  const band = georaster.values[0];
  const min = georaster.mins?.[0];
  const max = georaster.maxs?.[0];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  let idx = 0;
  for (let row = 0; row < height; row++) {
    const rowData = band[row];
    for (let col = 0; col < width; col++) {
      const value = rowData[col];
      if (dataType === "cdl") {
        if (value === 0 || value == null) {
          data[idx + 3] = 0;
        } else {
          data[idx] = CDL_LUT[value * 3];
          data[idx + 1] = CDL_LUT[value * 3 + 1];
          data[idx + 2] = CDL_LUT[value * 3 + 2];
          data[idx + 3] = 255;
        }
      } else if (value == null || Number.isNaN(value)) {
        data[idx + 3] = 0;
      } else {
        const [r, g, b] = etColorRgb(value, min, max);
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 255;
      }
      idx += 4;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  const bounds = [
    [georaster.ymin, georaster.xmin],
    [georaster.ymax, georaster.xmax],
  ];
  return { canvas, bounds };
}
