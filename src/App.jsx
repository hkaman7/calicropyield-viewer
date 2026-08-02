import { useState } from "react";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import { CALIFORNIA_COUNTIES } from "./data/counties";
import "./App.css";

const KNOWN_COUNTIES = new Set(CALIFORNIA_COUNTIES);

const DEFAULT_SELECTION = {
  dataType: "cdl",
  county: "Monterey",
  year: 2020,
  month: 7,
  day: 15,
  variable: "soc0_100",
  crop: null,
};

export default function App() {
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [selectedField, setSelectedField] = useState(null);

  function handleCountyClick(county) {
    if (!county) return;
    setSelection((s) => ({ ...s, county }));
  }

  function handleFieldClick(fieldProps) {
    setSelectedField(fieldProps);
    // A field is inside exactly one county - clicking it should also make
    // that county the active selection, same as clicking the county
    // boundary itself, so the existing download/analysis controls
    // immediately target the right place. DWR's source data uses "****" as
    // a placeholder for redacted/unknown values in several fields
    // (confirmed: CLASS1, SUBCLASS1, CROPTYP1, and COUNTY itself all show
    // up as "****" on some records) - only trust COUNTY if it's actually
    // one of the 58 real county names, otherwise leave the existing
    // selection alone rather than sending the rest of the app fetching
    // gs://.../counties/****/....
    const county = fieldProps?.COUNTY?.replace(/\s+County$/i, "");
    if (county && KNOWN_COUNTIES.has(county)) {
      setSelection((s) => ({ ...s, county }));
    }
  }

  return (
    <div className="app-layout">
      <Sidebar
        selection={selection}
        onChange={setSelection}
        selectedField={selectedField}
        onClearSelectedField={() => setSelectedField(null)}
      />
      <MapView selection={selection} onCountyClick={handleCountyClick} onFieldClick={handleFieldClick} />
    </div>
  );
}
