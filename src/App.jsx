import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import useDailyLog from "./hooks/useDailyLog";
import { useChartExport } from "./hooks/useChartExport";
import SubmitModal from "./components/SubmitModal";
import ConfirmationModal from "./components/ConfirmationModal";
import ProgressStats from "./components/ProgressStats";
import CableMap from "./components/CableMap";

/* ---------- ID normalizasyonu ---------- */
const normalizeId = (s) => {
  if (!s) return "";
  return String(s)
    .replace(/\uFEFF/g, "")              // BOM
    .replace(/[\u200B-\u200D]/g, "")     // zero-width
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\b(SUBS?|TX|INV|STR)0+(\d+)\b/g, (_, p1, p2) => `${p1}${p2}`); // STR07->STR7
};

export default function App() {
  const [data, setData] = useState(null);
  const [backgroundData, setBackgroundData] = useState(null);
  const [textData, setTextData] = useState(null);
  const [invPointsData, setInvPointsData] = useState(null);
  const [plusMap, setPlusMap] = useState({});
  const [minusMap, setMinusMap] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [err, setErr] = useState("");

  const [totalPlus, setTotalPlus] = useState(0);
  const [totalMinus, setTotalMinus] = useState(0);

  // MC4 State
  const [mc4Status, setMc4Status] = useState({}); // { "tableId": { start: bool, end: bool } }
  const [mc4Stats, setMc4Stats] = useState({ total: 0, completed: 0 });

  // Modals
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  // Hooks
  const { dailyLog, addRecord, resetLog } = useDailyLog();
  const { exportToExcel } = useChartExport();

  /* GeoJSON yükle + ID normalize */
  useEffect(() => {
    // Load main data
    fetch("/tables.geojson", { cache: "no-store" })
      .then((r) => r.text())
      .then((txt) => {
        let json;
        try { json = JSON.parse(txt); }
        catch { setErr("GeoJSON 404/HTML. public/tables.geojson yolunu kontrol et."); return; }
        if (Array.isArray(json.features)) {
          let tableCount = 0;
          json.features.forEach((f) => {
            const rawId = f?.properties?.string_id || f?.properties?.text;
            f.properties.string_id = normalizeId(rawId);
            if (f.properties.string_id) tableCount++;

            if (f.geometry?.type === "LineString" && Array.isArray(f.geometry.coordinates)) {
              const coords = f.geometry.coordinates;
              if (coords.length >= 4) {
                const first = coords[0];
                const last = coords[coords.length - 1];
                if (first[0] === last[0] && first[1] === last[1]) {
                  f.geometry.type = "Polygon";
                  f.geometry.coordinates = [coords];
                }
              }
            }
          });
          setMc4Stats(prev => ({ ...prev, total: tableCount * 2 }));
        }
        setData(json);
      })
      .catch((e) => setErr("GeoJSON yüklenemedi: " + e.message));

    // Load background data (lines.geojson)
    fetch("/lines.geojson", { cache: "no-store" })
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((json) => {
        if (json) setBackgroundData(json);
      })
      .catch((e) => console.log("Background GeoJSON (lines.geojson) not found or invalid", e));

    // Load text GeoJSON (texts.geojson)
    fetch("/texts.geojson", { cache: "no-store" })
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((json) => {
        if (json) setTextData(json);
      })
      .catch((e) => console.log("Text GeoJSON (texts.geojson) not found or invalid", e));

    // Load inv_points GeoJSON (inv_points.geojson)
    fetch("/inv_points.geojson", { cache: "no-store" })
      .then((r) => {
        if (r.ok) return r.json();
        return null;
      })
      .then((json) => {
        if (json) setInvPointsData(json);
      })
      .catch((e) => console.log("Inv Points GeoJSON (inv_points.geojson) not found or invalid", e));
  }, []);

  /* CSV yükle (ID + LENGTH) */
  useEffect(() => {
    fetch("/strings.csv", { cache: "no-store" })
      .then((r) => r.text())
      .then((csvText) => {
        const p = Papa.parse(csvText, { header: true, skipEmptyLines: true });
        const rows = p.data || [];

        const plus = {};
        const minus = {};

        rows.forEach(row => {
          const rawId = row["ID"];
          const id = normalizeId(rawId);
          const len = parseFloat(row["LENGTH"]);

          if (!id || isNaN(len)) return;

          if (len > 0) {
            plus[id] = len;
          } else if (len < 0) {
            minus[id] = Math.abs(len);
          }
        });

        setPlusMap(plus);
        setMinusMap(minus);
      })
      .catch(e => console.error("CSV load error:", e));
  }, []);

  /* toplamlar */
  useEffect(() => {
    let sumP = 0, sumM = 0;
    selected.forEach((id) => {
      const p = plusMap[id], m = minusMap[id];
      if (p != null) sumP += p;
      if (m != null) sumM += m;
    });
    setTotalPlus(sumP);
    setTotalMinus(sumM);
  }, [selected, plusMap, minusMap]);

  const handleDailySubmit = (record) => {
    addRecord(record);
    setSelected(new Set()); // Clear selection after submit
  };

  const handleResetAll = () => {
    resetLog();
    setSelected(new Set());
    setIsResetOpen(false);
  };

  const toggleMc4 = (tableId, position) => {
    setMc4Status(prev => {
      const currentTable = prev[tableId] || { start: false, end: false };
      const newTable = { ...currentTable, [position]: !currentTable[position] };
      return { ...prev, [tableId]: newTable };
    });
  };

  useEffect(() => {
    let completed = 0;
    Object.values(mc4Status).forEach(status => {
      if (status.start) completed++;
      if (status.end) completed++;
    });
    setMc4Stats(prev => ({ ...prev, completed }));
  }, [mc4Status]);

  if (err) return <div style={{ padding:16, color:"#b91c1c", background:"#fee2e2" }}>❌ {err}</div>;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0b1020" }}>
      <ProgressStats
        totalPlus={totalPlus}
        totalMinus={totalMinus}
        mc4Stats={mc4Stats}
        onReset={() => setIsResetOpen(true)}
        onExport={exportToExcel}
        onSubmitDaily={() => setIsSubmitOpen(true)}
      />

      <div style={{ flex: 1, position: "relative" }}>
        <CableMap 
          data={data} 
          backgroundData={backgroundData}
          textData={textData}
          invPointsData={invPointsData}
          plusMap={plusMap} 
          minusMap={minusMap} 
          selected={selected} 
          setSelected={setSelected}
          mc4Status={mc4Status}
          onToggleMc4={toggleMc4}
        />
      </div>

      {/* Hidden Canvas for Chart Generation */}
      <canvas id="dailyChart" width="800" height="400" style={{ display: 'none' }}></canvas>

      <SubmitModal 
        isOpen={isSubmitOpen} 
        onClose={() => setIsSubmitOpen(false)} 
        onSubmit={handleDailySubmit}
        dailyLength={totalPlus + totalMinus}
      />

      <ConfirmationModal 
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={handleResetAll}
        title="Reset All Data"
        message="Are you sure you want to delete all daily logs and clear the current selection? This action cannot be undone."
      />
    </div>
  );
}
