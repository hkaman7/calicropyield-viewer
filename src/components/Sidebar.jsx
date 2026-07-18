import { CALIFORNIA_COUNTIES } from "../data/counties";
import { DATASET_INFO } from "../data/datasetInfo";
import { CDL_YEARS, ET_YEARS, MONTHS, cdlUrl, etUrl } from "../utils/gcsPaths";

export default function Sidebar({ selection, onChange }) {
  const { dataType, county, year, month } = selection;
  const years = dataType === "cdl" ? CDL_YEARS : ET_YEARS;
  const downloadUrl = dataType === "cdl" ? cdlUrl(county, year) : etUrl(county, year, month);
  const downloadName = downloadUrl.split("/").pop();
  const info = DATASET_INFO[dataType];

  function update(patch) {
    onChange({ ...selection, ...patch });
  }

  return (
    <aside className="sidebar">
      <h1>CaliCropYield Viewer</h1>
      <p className="subtitle">California Crop Yield Benchmark dataset explorer</p>

      <label className="field">
        <span>Data type</span>
        <select value={dataType} onChange={(e) => update({ dataType: e.target.value })}>
          <option value="cdl">Cropland Data Layer (CDL)</option>
          <option value="et">Evapotranspiration (ET)</option>
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

      <label className="field">
        <span>Year</span>
        <select value={year} onChange={(e) => update({ year: Number(e.target.value) })}>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </label>

      {dataType === "et" && (
        <label className="field">
          <span>Month</span>
          <select value={month} onChange={(e) => update({ month: Number(e.target.value) })}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </label>
      )}

      <a className="download-btn" href={downloadUrl} download={downloadName} target="_blank" rel="noreferrer">
        Download GeoTIFF
      </a>

      <dl className="dataset-info">
        <dt>Source</dt>
        <dd>{info.source}</dd>
        <dt>Description</dt>
        <dd>{info.description}</dd>
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
