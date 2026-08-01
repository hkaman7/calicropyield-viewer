import { useEffect, useRef, useState } from "react";

const MAX_SUGGESTIONS = 12;

// Ranks target against query: exact/prefix/substring match first, then
// falls back to a subsequence check (query's letters appear in order,
// possibly with gaps) so typos or partial memory of a crop's name ("tang"
// for "TANGERINES & MANDARINS", "wallnut" for "WALNUTS") still surface
// something - the "flexibility of similarity" the crop list needed instead
// of an exact-match-only dropdown.
function matchScore(query, target) {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (!q) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 70;

  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length ? 40 : -1;
}

export default function CropCombobox({ crops, value, onChange, placeholder }) {
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => {
    setQuery(value ?? "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
        setQuery(value ?? "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const suggestions = query.trim()
    ? crops
        .map((crop) => ({ crop, score: matchScore(query, crop) }))
        .filter((s) => s.score >= 0)
        .sort((a, b) => b.score - a.score || a.crop.localeCompare(b.crop))
        .slice(0, MAX_SUGGESTIONS)
        .map((s) => s.crop)
    : crops.slice(0, MAX_SUGGESTIONS);

  function commit(crop) {
    setQuery(crop);
    setOpen(false);
    onChange(crop);
  }

  function clear() {
    setQuery("");
    onChange(null);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlight]) commit(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery(value ?? "");
    }
  }

  return (
    <div className="crop-combobox" ref={rootRef}>
      <div className="crop-combobox-input-row">
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button type="button" className="crop-combobox-clear" onClick={clear} aria-label="Clear crop selection">
            ×
          </button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="crop-combobox-list">
          {suggestions.map((crop, i) => (
            <li
              key={crop}
              className={i === highlight ? "active" : ""}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(crop);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {crop}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
