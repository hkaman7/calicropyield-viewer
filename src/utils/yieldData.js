import { asyncBufferFromUrl, parquetReadObjects } from "hyparquet";
import { BUCKET_BASE_URL } from "./gcsPaths";

// County/crop/year yield observations, cleaned and merged from CDFA county
// ag commissioner crop reports - see calicropyield-viewer's sibling repos'
// yield/clean/ALL_YEARS_yield_merged.csv (source) for how this was built.
// This is the file explicitly designated as the one to use for crop-based
// county-level yield lookups (the by-county detail file, with per-commodity
// acreage/production/price, is a separate richer-but-unmerged dataset at
// yield/county_crop_yield_detail.parquet, not used by the viewer yet).
export const YIELD_PARQUET_URL = `${BUCKET_BASE_URL}/yield/county_crop_yield.parquet`;

// hyparquet decodes INT64 columns (year, n_subtypes_merged) as BigInt to
// avoid silent precision loss on huge values - but these are small year/
// count values, and a BigInt breaks `===` against the app's plain-Number
// selection state (e.g. `row.year === selection.year` is always false) and
// throws inside Array.sort's default comparator ("Cannot convert a BigInt
// value to a number") if used directly in arithmetic. Safe to coerce here.
function normalizeRow(row) {
  return { ...row, year: Number(row.year), n_subtypes_merged: Number(row.n_subtypes_merged) };
}

let yieldRowsPromise = null;
export function fetchYieldRows() {
  if (!yieldRowsPromise) {
    yieldRowsPromise = asyncBufferFromUrl({ url: YIELD_PARQUET_URL })
      .then((file) => parquetReadObjects({ file }))
      .then((rows) => rows.map(normalizeRow));
  }
  return yieldRowsPromise;
}

export function uniqueSorted(rows, key) {
  return [...new Set(rows.map((r) => r[key]))].sort();
}

export function filterRows(rows, { county, crop, year } = {}) {
  return rows.filter(
    (r) =>
      (!county || r.county === county) &&
      (!crop || r.crop === crop) &&
      (year == null || r.year === year)
  );
}

// Summary for a single county+crop's full history - the "report box" shown
// when a specific crop is selected in yield mode.
export function summarizeYield(rows) {
  if (rows.length === 0) return null;
  const values = rows.map((r) => r.yield_t_per_ha);
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: rows.length,
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    byYear: [...rows].sort((a, b) => a.year - b.year),
  };
}

function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  return lines.join("\n");
}

export function downloadCsv(filename, rows) {
  const blob = new Blob([rowsToCsv(rows)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
