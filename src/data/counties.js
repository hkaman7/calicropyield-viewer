// California's 58 counties, matching the slugs used in the GCS bucket
// layout (counties/<County>/<dataset>/<year>/...), where the slug is the
// county name with spaces removed.
export const CALIFORNIA_COUNTIES = [
  "Alameda", "Alpine", "Amador", "Butte", "Calaveras", "Colusa",
  "Contra Costa", "Del Norte", "El Dorado", "Fresno", "Glenn", "Humboldt",
  "Imperial", "Inyo", "Kern", "Kings", "Lake", "Lassen", "Los Angeles",
  "Madera", "Marin", "Mariposa", "Mendocino", "Merced", "Modoc", "Mono",
  "Monterey", "Napa", "Nevada", "Orange", "Placer", "Plumas", "Riverside",
  "Sacramento", "San Benito", "San Bernardino", "San Diego",
  "San Francisco", "San Joaquin", "San Luis Obispo", "San Mateo",
  "Santa Barbara", "Santa Clara", "Santa Cruz", "Shasta", "Sierra",
  "Siskiyou", "Solano", "Sonoma", "Stanislaus", "Sutter", "Tehama",
  "Trinity", "Tulare", "Tuolumne", "Ventura", "Yolo", "Yuba",
];

// Known gap: these three counties don't have CDL data locally for
// 2008-2011/2013-2016 (present from 2017 onward). Everything else is
// complete. See upload_local_cdl.py in calicropyield-dev for details.
export const CDL_MISSING_EARLY_YEARS = new Set(["Siskiyou", "Mariposa", "Marin"]);
