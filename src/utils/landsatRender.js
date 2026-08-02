// Landsat Collection 2 Level-2 surface reflectance scale/offset (USGS):
// reflectance = DN * SCALE + OFFSET. Bands are harmonized across the whole
// TM/ETM+/OLI time series to a single 6-band order (no thermal band 6):
// SR_B1=Blue, SR_B2=Green, SR_B3=Red, SR_B4=NIR, SR_B5=SWIR1, SR_B7=SWIR2.
const SR_SCALE = 0.0000275;
const SR_OFFSET = -0.2;

const RED_BAND = 2;
const GREEN_BAND = 1;
const BLUE_BAND = 0;

// Fixed (not per-image) stretch so colors stay visually consistent across
// different counties/months, rather than each image re-normalizing to its
// own min/max. Reflectance for typical land cover here sits well under 0.2;
// the gamma brightens midtones so a true-color composite isn't too dark
// (raw linear reflectance renders quite dim - confirmed via a Python/
// matplotlib preview against a real file before choosing these values).
const STRETCH_MIN = 0.0;
const STRETCH_MAX = 0.2;
const GAMMA = 0.8;

function toByte(reflectance) {
  const t = Math.max(0, Math.min(1, (reflectance - STRETCH_MIN) / (STRETCH_MAX - STRETCH_MIN)));
  return Math.round(255 * t ** GAMMA);
}

/**
 * Rasterizes a 6-band Landsat surface-reflectance georaster as a true-color
 * (R=SR_B3, G=SR_B2, B=SR_B1) canvas. Returns { canvas, bounds } - no
 * min/max, since (unlike ET/climate) this isn't a single continuous
 * variable with a meaningful legend.
 */
export function landsatToCanvas(georaster) {
  const { width, height, values } = georaster;
  const redBand = values[RED_BAND];
  const greenBand = values[GREEN_BAND];
  const blueBand = values[BLUE_BAND];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  let idx = 0;
  for (let row = 0; row < height; row++) {
    const rRow = redBand[row];
    const gRow = greenBand[row];
    const bRow = blueBand[row];
    for (let col = 0; col < width; col++) {
      const rDn = rRow[col];
      if (rDn == null || Number.isNaN(rDn)) {
        data[idx + 3] = 0;
      } else {
        data[idx] = toByte(rDn * SR_SCALE + SR_OFFSET);
        data[idx + 1] = toByte(gRow[col] * SR_SCALE + SR_OFFSET);
        data[idx + 2] = toByte(bRow[col] * SR_SCALE + SR_OFFSET);
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
