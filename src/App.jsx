import { useState } from "react";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import "./App.css";

const DEFAULT_SELECTION = {
  dataType: "cdl",
  county: "Fresno",
  year: 2020,
  month: 7,
};

export default function App() {
  const [selection, setSelection] = useState(DEFAULT_SELECTION);

  return (
    <div className="app-layout">
      <Sidebar selection={selection} onChange={setSelection} />
      <MapView selection={selection} />
    </div>
  );
}
