export const DATASET_INFO = {
  landsat: {
    label: "Satellite Imagery (Landsat)",
    source: "USGS Landsat Collection 2 Level-2 Surface Reflectance (TM/ETM+/OLI, harmonized)",
    description:
      "Monthly true-color composite (bands harmonized to a single 6-band scheme across the Landsat 5/7/8/9 time series, so the same rendering works for any year).",
    resolution: "30 m",
    crs: "EPSG:4326 (WGS 84)",
    coverage: "2008-2023 (2012 unavailable). Complete for all 58 counties.",
  },
  cdl: {
    label: "Cropland Data Layer (CDL)",
    source: "USDA National Agricultural Statistics Service (NASS)",
    description:
      "Annual, satellite-derived land cover and crop-type classification for U.S. agricultural land.",
    resolution: "30 m",
    crs: "EPSG:4326 (WGS 84)",
    coverage: "2008-2024 (2012 unavailable). Complete for all 58 counties.",
  },
  et: {
    label: "Evapotranspiration (ET)",
    source: "OpenET - eeMETRIC model, GRIDMET-forced, monthly composites",
    description:
      "Monthly actual evapotranspiration estimates derived from satellite remote sensing and surface energy balance modeling.",
    resolution: "30 m",
    crs: "EPSG:4326 (WGS 84)",
    coverage: "2008-2023 (2012 unavailable). Complete for all 58 counties.",
    unit: "mm",
  },
  irrigation: {
    label: "Irrigation",
    source: "UMT/Climate/IrrMapper_RF/v1_2 (Google Earth Engine)",
    description:
      "Binary irrigated/not-irrigated classification, pixel-aligned to each county's CDL grid. Downloadable through the calicropyield package - not yet browsable in this map viewer.",
    resolution: "30 m",
    crs: "EPSG:4326 (WGS 84)",
    coverage: "2008-2023 (2012 unavailable). Complete for all 58 counties.",
  },
  soil: {
    label: "Soil (gNATSGO)",
    source: "USDA NRCS gridded National Soil Survey Geographic Database (gNATSGO)",
    description:
      "Soil properties and USDA productivity/capability ratings, composited from SSURGO/STATSGO2/RSS soil surveys.",
    resolution: "30 m",
    crs: "EPSG:4326 (WGS 84)",
    coverage: "2020 vintage (static - soil surveys are not resampled annually).",
  },
  yield: {
    label: "Crop Yield (CDFA)",
    source: "CDFA county agricultural commissioner crop reports, cleaned and merged by crop group",
    description:
      "Annual county-level crop yield (tons/hectare), aggregated per crop group from raw commodity-level reports. Pick a crop to see its CDL field locations for the selected year and a yield history across all available years.",
    resolution: "County-level (tabular, not gridded)",
    crs: "N/A (county aggregates, not a raster)",
    coverage: "2008-2022 (2012 unavailable).",
  },
  climate: {
    label: "Climate (Daymet)",
    source: "Oak Ridge National Laboratory DAAC - Daymet V4, daily surface weather data",
    description:
      "Daily gridded surface weather estimates (temperature, precipitation, radiation, humidity, snow, day length) interpolated from ground observation stations.",
    resolution: "1 km",
    crs: "EPSG:4326 (WGS 84)",
    coverage:
      "2008-2022 (2012 unavailable), one day per view. Leap years keep Feb 29 and drop Dec 31 to stay on Daymet's fixed 365-day calendar. Kern has no climate data - its source backup is corrupted and could not be recovered; re-fetching directly from Daymet is currently blocked by an upstream service change.",
  },
};
