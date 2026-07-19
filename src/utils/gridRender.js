/**
 * Rasterizes a flat, row-major (data, width, height, xmin, xmax, ymin, ymax)
 * grid - the shape both fetchSoilVariable() and fetchClimateVariable()
 * return - onto a canvas using the given value -> [r,g,b] color function.
 * Shared so soil and climate don't each reimplement the same min/max scan +
 * per-pixel color loop. Returns { canvas, bounds, min, max } where bounds is
 * a [[south, west], [north, east]] pair suitable for L.imageOverlay.
 */
export function continuousGridToCanvas({ data, width, height, xmin, xmax, ymin, ymax }, colorFn) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  const out = imageData.data;

  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (!Number.isNaN(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }

  let idx = 0;
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    if (Number.isNaN(value)) {
      out[idx + 3] = 0;
    } else {
      const [r, g, b] = colorFn(value, min, max);
      out[idx] = r;
      out[idx + 1] = g;
      out[idx + 2] = b;
      out[idx + 3] = 255;
    }
    idx += 4;
  }
  ctx.putImageData(imageData, 0, 0);

  return { canvas, bounds: [[ymin, xmin], [ymax, xmax]], min, max };
}
