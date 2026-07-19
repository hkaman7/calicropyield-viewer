const NO_DATA = -9999;

// TIFF field type codes.
const SHORT = 3;
const LONG = 4;
const ASCII = 2;
const DOUBLE = 12;

const TIFF_HEADER_SIZE = 8;
const IFD_ENTRY_SIZE = 12;

/**
 * Hand-rolled single-band, single-strip, uncompressed float32 GeoTIFF
 * encoder (EPSG:4326). Full county soil rasters are tens of millions of
 * pixels, and going through a general-purpose writer library that
 * allocates a fresh ArrayBuffer+DataView per pixel (e.g. geotiff.js'
 * writeArrayBuffer) took well over a minute for Fresno - long enough that
 * it never fired a download at all in testing. This version does the NaN
 * -> nodata substitution in one pass and then bulk-copies the typed
 * array's bytes directly into the file (assumes a little-endian host,
 * true for essentially all consumer/laptop hardware), so it finishes in
 * well under a second for the same raster.
 */
function encodeGeoTiff({ data, width, height, xmin, ymax, pixelWidth, pixelHeight, noDataValue = NO_DATA }) {
  const pixels = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    pixels[i] = Number.isNaN(v) ? noDataValue : v;
  }
  const pixelBytes = new Uint8Array(pixels.buffer);

  const nodataAscii = `${noDataValue}\0`;
  const nodataLen = nodataAscii.length; // includes the null terminator, per TIFF ASCII convention
  const nodataLenPadded = nodataLen + (nodataLen % 2);

  const geoKeys = [
    [1024, 0, 1, 2], // GTModelTypeGeoKey = Geographic
    [1025, 0, 1, 1], // GTRasterTypeGeoKey = PixelIsArea
    [2048, 0, 1, 4326], // GeographicTypeGeoKey = WGS 84
  ];
  const geoKeyDirCount = 4 + geoKeys.length * 4; // header shorts + 4 shorts per key
  const geoKeyDirLen = geoKeyDirCount * 2;

  const modelPixelScaleLen = 24; // 3 doubles
  const modelTiepointLen = 48; // 6 doubles

  const TAGS = [256, 257, 258, 259, 262, 273, 277, 278, 279, 284, 339, 33550, 33922, 34735, 42113];
  const ifdSize = 2 + TAGS.length * IFD_ENTRY_SIZE + 4;
  const ifdStart = TIFF_HEADER_SIZE;

  let cursor = ifdStart + ifdSize;
  const modelPixelScaleOffset = cursor; cursor += modelPixelScaleLen;
  const modelTiepointOffset = cursor; cursor += modelTiepointLen;
  const geoKeyDirOffset = cursor; cursor += geoKeyDirLen;
  const nodataOffset = cursor; cursor += nodataLenPadded;
  if (cursor % 2 !== 0) cursor += 1;
  const stripOffset = cursor;
  const stripByteCount = pixelBytes.length;

  const buffer = new ArrayBuffer(stripOffset + stripByteCount);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x49; bytes[1] = 0x49; // "II" - little-endian
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdStart, true);

  let p = ifdStart;
  view.setUint16(p, TAGS.length, true);
  p += 2;

  function writeEntry(tag, type, count, value) {
    view.setUint16(p, tag, true);
    view.setUint16(p + 2, type, true);
    view.setUint32(p + 4, count, true);
    if (type === SHORT && count === 1) {
      view.setUint16(p + 8, value, true);
      view.setUint16(p + 10, 0, true);
    } else {
      view.setUint32(p + 8, value, true);
    }
    p += 12;
  }

  writeEntry(256, LONG, 1, width); // ImageWidth
  writeEntry(257, LONG, 1, height); // ImageLength
  writeEntry(258, SHORT, 1, 32); // BitsPerSample
  writeEntry(259, SHORT, 1, 1); // Compression = none
  writeEntry(262, SHORT, 1, 1); // PhotometricInterpretation = BlackIsZero
  writeEntry(273, LONG, 1, stripOffset); // StripOffsets
  writeEntry(277, SHORT, 1, 1); // SamplesPerPixel
  writeEntry(278, LONG, 1, height); // RowsPerStrip (single strip)
  writeEntry(279, LONG, 1, stripByteCount); // StripByteCounts
  writeEntry(284, SHORT, 1, 1); // PlanarConfiguration
  writeEntry(339, SHORT, 1, 3); // SampleFormat = IEEE float
  writeEntry(33550, DOUBLE, 3, modelPixelScaleOffset); // ModelPixelScaleTag
  writeEntry(33922, DOUBLE, 6, modelTiepointOffset); // ModelTiepointTag
  writeEntry(34735, SHORT, geoKeyDirCount, geoKeyDirOffset); // GeoKeyDirectoryTag
  writeEntry(42113, ASCII, nodataLen, nodataOffset); // GDAL_NODATA

  view.setUint32(p, 0, true); // no next IFD

  view.setFloat64(modelPixelScaleOffset, pixelWidth, true);
  view.setFloat64(modelPixelScaleOffset + 8, pixelHeight, true);
  view.setFloat64(modelPixelScaleOffset + 16, 0, true);

  // Raster (0,0) -> model space (xmin, ymax): top-left corner of the raster.
  for (const [i, v] of [[0, 0], [8, 0], [16, 0], [24, xmin], [32, ymax], [40, 0]]) {
    view.setFloat64(modelTiepointOffset + i, v, true);
  }

  let gp = geoKeyDirOffset;
  for (const v of [1, 1, 0, geoKeys.length]) {
    view.setUint16(gp, v, true);
    gp += 2;
  }
  for (const [keyId, loc, count, value] of geoKeys) {
    for (const v of [keyId, loc, count, value]) {
      view.setUint16(gp, v, true);
      gp += 2;
    }
  }

  for (let i = 0; i < nodataAscii.length; i++) {
    bytes[nodataOffset + i] = nodataAscii.charCodeAt(i);
  }

  bytes.set(pixelBytes, stripOffset);

  return buffer;
}

/**
 * Encodes a soil or climate variable's raw grid (as returned by
 * fetchSoilVariable/fetchClimateVariable) as a GeoTIFF and triggers a
 * browser download. Done entirely client-side - the source is a per-county
 * Zarr store and GitHub Pages has no backend to do this conversion
 * server-side, so we re-encode the already-fetched Zarr chunks in-browser
 * instead of shipping people a raw .zarr folder.
 */
export async function downloadGridAsGeoTiff(filename, { data, width, height, xmin, xmax, ymin, ymax }) {
  const arrayBuffer = encodeGeoTiff({
    data,
    width,
    height,
    xmin,
    ymax,
    pixelWidth: (xmax - xmin) / width,
    pixelHeight: (ymax - ymin) / height,
  });

  const blob = new Blob([arrayBuffer], { type: "image/tiff" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
