// Public GCS bucket populated by the download scripts in
// calicropyield-dev/dataset/download_county_dataset/scripts (download_cdl.py
// equivalent -> upload_local_cdl.py, and download_et.py). Layout:
//   counties/<CountySlug>/<dataset>/<year>/<file>
export const BUCKET_BASE_URL = "https://storage.googleapis.com/california-crop-yield-benchmark";

export function countySlug(countyName) {
  return countyName.replace(/\s+/g, "");
}

export function cdlUrl(county, year) {
  const slug = countySlug(county);
  return `${BUCKET_BASE_URL}/counties/${slug}/cdl/${year}/${slug}_${year}.tif`;
}

export function etUrl(county, year, month) {
  const slug = countySlug(county);
  const mm = String(month).padStart(2, "0");
  return `${BUCKET_BASE_URL}/counties/${slug}/et/${year}/${slug}_ET_${year}_${mm}.tif`;
}

// Soil (gNATSGO) is a static per-county Zarr store, not a per-year GeoTIFF -
// "2020" is the fixed vintage of the source data, not a selectable year.
export const SOIL_VINTAGE = "2020";

export function soilZarrUrl(county) {
  const slug = countySlug(county);
  return `${BUCKET_BASE_URL}/counties/${slug}/soil/${SOIL_VINTAGE}/${slug}_soil.zarr`;
}

export function climateZarrUrl(county, year) {
  const slug = countySlug(county);
  return `${BUCKET_BASE_URL}/counties/${slug}/climate/${year}/DayMet_${slug}_${year}.zarr`;
}

// CDL: 2008-2024, skipping 2012 (no CA CDL coverage that year).
export const CDL_YEARS = [2008, 2009, 2010, 2011, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

// ET: 2008-2023, skipping 2012. Download is still filling in as of this
// writing (see project status) - some county/year/month combinations may
// not exist yet; the map view surfaces that as a "not available" message
// rather than failing silently.
export const ET_YEARS = [2008, 2009, 2010, 2011, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023];

// Climate (Daymet): 2008-2023, skipping 2012 - same range as ET.
export const CLIMATE_YEARS = ET_YEARS;

export const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
