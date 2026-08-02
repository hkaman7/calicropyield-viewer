import { useEffect, useState } from "react";
import { CALIFORNIA_COUNTIES } from "../data/counties";
import { DATASET_INFO } from "../data/datasetInfo";
import { SOIL_VARIABLES } from "../data/soilVariables";
import { CLIMATE_VARIABLES } from "../data/climateVariables";
import CROP_CDL_CROSSWALK from "../data/cropCdlCrosswalk.json";
import { CDL_YEARS, ET_YEARS, LANDSAT_YEARS, CLIMATE_YEARS, MONTHS, cdlUrl, etUrl, landsatUrl, countySlug } from "../utils/gcsPaths";
import { fetchSoilVariable } from "../utils/soilRender";
import { fetchClimateVariable } from "../utils/climateRender";
import { downloadGridAsGeoTiff } from "../utils/geotiffExport";
import { daysInMonth, dayOfYearIndex, MONTH_NAMES } from "../utils/daymetCalendar";
import { FIELD_PROPERTY_LABELS } from "../data/boundaryLayers";
import { fetchYieldRows, uniqueSorted, filterRows, summarizeYield, downloadCsv } from "../utils/yieldData";
import CropCombobox from "./CropCombobox";

const YEARS_BY_TYPE = { cdl: CDL_YEARS, et: ET_YEARS, landsat: LANDSAT_YEARS, climate: CLIMATE_YEARS };
const HAS_VARIABLE = { soil: true, climate: true };
const HAS_YEAR = { cdl: true, et: true, landsat: true, climate: true, yield: true };

export default function Sidebar({ selection, onChange, selectedField, onClearSelectedField }) {
  const { dataType, county, year, month, day, variable, crop } = selection;
  const info = DATASET_INFO[dataType];
  const soilVariable = SOIL_VARIABLES.find((v) => v.key === variable);
  const climateVariable = CLIMATE_VARIABLES.find((v) => v.key === variable);
  const [downloadState, setDownloadState] = useState("idle"); // idle | working | error

  const [yieldRows, setYieldRows] = useState(null);
  const [yieldLoadError, setYieldLoadError] = useState(null);
  const [limitDownloadToYear, setLimitDownloadToYear] = useState(false);

  // Fetched once, lazily, the first time yield mode is used - the parquet
  // is tiny (~80 KB) so there's no need for per-selection re-fetching, the
  // whole table is filtered client-side.
  useEffect(() => {
    if (dataType !== "yield" || yieldRows || yieldLoadError) return;
    fetchYieldRows()
      .then(setYieldRows)
      .catch((err) => setYieldLoadError(err.message || String(err)));
  }, [dataType, yieldRows, yieldLoadError]);

  const yieldCrops = yieldRows ? uniqueSorted(yieldRows, "crop") : [];
  const yieldYears = yieldRows ? uniqueSorted(yieldRows, "year") : [];

  // Once the real year range is known, snap an out-of-range year (e.g. the
  // app's default of 2020 is fine, but a leftover CDL/ET year like 2024
  // wouldn't be) onto the last available yield year.
  useEffect(() => {
    if (dataType === "yield" && yieldYears.length > 0 && !yieldYears.includes(year)) {
      update({ year: yieldYears[yieldYears.length - 1] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataType, yieldYears.length]);

  function update(patch) {
    onChange({ ...selection, ...patch });
  }

  function handleDataTypeChange(newType) {
    const patch = { dataType: newType };

    if (HAS_YEAR[newType] && newType !== "yield") {
      const validYears = YEARS_BY_TYPE[newType];
      if (!validYears.includes(year)) patch.year = validYears[validYears.length - 1];
    }

    if (HAS_VARIABLE[newType]) {
      const list = newType === "soil" ? SOIL_VARIABLES : CLIMATE_VARIABLES;
      if (!list.some((v) => v.key === variable)) patch.variable = list[0].key;
    }

    if (newType === "climate") {
      const effectiveYear = patch.year ?? year;
      const effectiveMonth = month ?? 1;
      patch.month = effectiveMonth;
      patch.day = Math.min(day ?? 1, daysInMonth(effectiveYear, effectiveMonth));
    }

    if (newType !== "yield") patch.crop = null;

    update(patch);
  }

  const cropCdlMatch = crop ? CROP_CDL_CROSSWALK[crop] : null;
  const countyCropRows = yieldRows && crop ? filterRows(yieldRows, { county, crop }) : [];
  const yieldSummary = summarizeYield(countyCropRows);

  function handleYieldDownload() {
    if (!yieldRows) return;
    const rows = filterRows(yieldRows, { county, crop, year: limitDownloadToYear ? year : null });
    const parts = [countySlug(county), "yield", crop ? crop.replace(/[^A-Za-z0-9]+/g, "_") : "all-crops"];
    if (limitDownloadToYear) parts.push(String(year));
    else parts.push("all-years");
    downloadCsv(`${parts.join("_")}.csv`, rows);
  }

  function handleYearChange(newYear) {
    const patch = { year: newYear };
    if (dataType === "climate") patch.day = Math.min(day, daysInMonth(newYear, month));
    update(patch);
  }

  function handleMonthChange(newMonth) {
    const patch = { month: newMonth };
    if (dataType === "climate") patch.day = Math.min(day, daysInMonth(year, newMonth));
    update(patch);
  }

  async function handleGridDownload() {
    setDownloadState("working");
    try {
      let result;
      let filename;
      if (dataType === "soil") {
        result = await fetchSoilVariable(county, variable);
        filename = `${countySlug(county)}_soil_${variable}.tif`;
      } else {
        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        result = await fetchClimateVariable(county, year, variable, dayOfYearIndex(year, month, day));
        filename = `${countySlug(county)}_climate_${variable}_${year}${mm}${dd}.tif`;
      }
      await downloadGridAsGeoTiff(filename, result);
      setDownloadState("idle");
    } catch (err) {
      console.error(err);
      setDownloadState("error");
    }
  }

  return (
    <aside className="sidebar">
      <h1>CaliCropYield Viewer</h1>
      <p className="subtitle">California Crop Yield Benchmark dataset explorer</p>

      <label className="field">
        <span>Data type</span>
        <select value={dataType} onChange={(e) => handleDataTypeChange(e.target.value)}>
          <option value="landsat">Satellite Imagery (Landsat)</option>
          <option value="cdl">Cropland Data Layer (CDL)</option>
          <option value="et">Evapotranspiration (ET)</option>
          <option value="soil">Soil (gNATSGO)</option>
          <option value="climate">Climate (Daymet)</option>
          <option value="yield">Crop Yield (CDFA)</option>
        </select>
      </label>

      <label className="field">
        <span>County</span>
        <select value={county} onChange={(e) => update({ county: e.target.value })}>
          {CALIFORNIA_COUNTIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      {HAS_YEAR[dataType] && dataType !== "yield" && (
        <label className="field">
          <span>Year</span>
          <select value={year} onChange={(e) => handleYearChange(Number(e.target.value))}>
            {YEARS_BY_TYPE[dataType].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      )}

      {dataType === "yield" && (
        <>
          <label className="field">
            <span>Year (for CDL field map below)</span>
            <select
              value={year}
              onChange={(e) => update({ year: Number(e.target.value) })}
              disabled={yieldYears.length === 0}
            >
              {(yieldYears.length > 0 ? yieldYears : [year]).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Crop</span>
            <CropCombobox
              crops={yieldCrops}
              value={crop}
              onChange={(newCrop) => update({ crop: newCrop })}
              placeholder={yieldRows ? "Type a crop name…" : "Loading crops…"}
            />
          </label>

          {crop && cropCdlMatch && cropCdlMatch.cdlCodes.length === 0 && (
            <p className="yield-note">
              CDL doesn't classify {crop.toLowerCase()} as its own class, so no field outline can be
              shown on the map for it{cropCdlMatch.note ? ` (${cropCdlMatch.note})` : ""}.
            </p>
          )}
          {crop && cropCdlMatch && cropCdlMatch.cdlCodes.length > 0 && (
            <p className="yield-note">
              Highlighting CDL "{cropCdlMatch.cdlNames.join('", "')}" fields for {year}.
            </p>
          )}
        </>
      )}

      {HAS_VARIABLE[dataType] && (
        <label className="field">
          <span>Variable</span>
          <select value={variable} onChange={(e) => update({ variable: e.target.value })}>
            {(dataType === "soil" ? SOIL_VARIABLES : CLIMATE_VARIABLES).map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </label>
      )}

      {(dataType === "et" || dataType === "landsat" || dataType === "climate") && (
        <label className="field">
          <span>Month</span>
          <select value={month} onChange={(e) => handleMonthChange(Number(e.target.value))}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{dataType === "climate" ? MONTH_NAMES[m - 1] : String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </label>
      )}

      {dataType === "climate" && (
        <label className="field">
          <span>Day</span>
          <select value={day} onChange={(e) => update({ day: Number(e.target.value) })}>
            {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      )}

      {dataType === "cdl" && (
        <a className="download-btn" href={cdlUrl(county, year)} download target="_blank" rel="noreferrer">
          Download GeoTIFF
        </a>
      )}
      {dataType === "landsat" && (
        <a className="download-btn" href={landsatUrl(county, year, month)} download target="_blank" rel="noreferrer">
          Download GeoTIFF
        </a>
      )}
      {dataType === "et" && (
        <a className="download-btn" href={etUrl(county, year, month)} download target="_blank" rel="noreferrer">
          Download GeoTIFF
        </a>
      )}
      {(dataType === "soil" || dataType === "climate") && (
        <button
          type="button"
          className="download-btn"
          onClick={handleGridDownload}
          disabled={downloadState === "working"}
        >
          {downloadState === "working" ? "Preparing GeoTIFF…" : "Download GeoTIFF"}
        </button>
      )}
      {(dataType === "soil" || dataType === "climate") && downloadState === "error" && (
        <p className="download-error">Could not prepare the GeoTIFF. Please try again.</p>
      )}

      {dataType === "yield" && (
        <>
          <label className="field yield-download-scope">
            <input
              type="checkbox"
              checked={limitDownloadToYear}
              onChange={(e) => setLimitDownloadToYear(e.target.checked)}
            />
            <span>Limit download to {year} only (unchecked = all years)</span>
          </label>
          <button type="button" className="download-btn" onClick={handleYieldDownload} disabled={!yieldRows}>
            {yieldRows ? "Download yield data (CSV)" : "Loading…"}
          </button>
          {yieldLoadError && <p className="download-error">Could not load yield data: {yieldLoadError}</p>}
        </>
      )}

      {dataType === "yield" && crop && yieldSummary && (
        <div className="yield-report">
          <div className="yield-report-header">{crop} — {county} County, all years</div>
          <div className="yield-report-stats">
            <div>
              <span className="yield-report-stat-value">{yieldSummary.avg.toFixed(2)}</span>
              <span className="yield-report-stat-label">avg t/ha</span>
            </div>
            <div>
              <span className="yield-report-stat-value">{yieldSummary.min.toFixed(2)}</span>
              <span className="yield-report-stat-label">min t/ha</span>
            </div>
            <div>
              <span className="yield-report-stat-value">{yieldSummary.max.toFixed(2)}</span>
              <span className="yield-report-stat-label">max t/ha</span>
            </div>
            <div>
              <span className="yield-report-stat-value">{yieldSummary.count}</span>
              <span className="yield-report-stat-label">years reported</span>
            </div>
          </div>
          <table className="yield-report-table">
            <thead>
              <tr><th>Year</th><th>t/ha</th></tr>
            </thead>
            <tbody>
              {yieldSummary.byYear.map((r) => (
                <tr key={r.year} className={r.contains_flagged_outlier ? "flagged" : ""}>
                  <td>{r.year}</td>
                  <td>{r.yield_t_per_ha.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {dataType === "yield" && crop && yieldRows && !yieldSummary && (
        <p className="yield-note">No yield records for {crop.toLowerCase()} in {county} County.</p>
      )}

      {selectedField && (
        <div className="selected-field">
          <div className="selected-field-header">
            <span>Selected field</span>
            <button type="button" className="selected-field-clear" onClick={onClearSelectedField}>
              Clear
            </button>
          </div>
          <dl className="dataset-info">
            {Object.entries(FIELD_PROPERTY_LABELS)
              .filter(([key]) => selectedField[key] !== undefined && selectedField[key] !== null && selectedField[key] !== "")
              .map(([key, label]) => (
                <div key={key} className="selected-field-row">
                  <dt>{label}</dt>
                  <dd>{selectedField[key]}</dd>
                </div>
              ))}
          </dl>
          <p className="selected-field-note">
            Click "County" or the field itself on the map to change the selection above. Field-level
            downloads (clipped to just this field's boundary) aren't available yet - the county
            selection has been updated to match this field so the download controls above target it.
          </p>
        </div>
      )}

      <dl className="dataset-info">
        <dt>Source</dt>
        <dd>{info.source}</dd>
        <dt>Description</dt>
        <dd>{info.description}</dd>
        {dataType === "soil" && soilVariable && (
          <>
            <dt>Selected variable</dt>
            <dd>{soilVariable.description}</dd>
          </>
        )}
        {dataType === "climate" && climateVariable && (
          <>
            <dt>Selected variable</dt>
            <dd>{climateVariable.description}</dd>
          </>
        )}
        <dt>Spatial resolution</dt>
        <dd>{info.resolution}</dd>
        <dt>Coordinate reference system</dt>
        <dd>{info.crs}</dd>
        <dt>Coverage</dt>
        <dd>{info.coverage}</dd>
      </dl>
    </aside>
  );
}
