import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";

/* ---------- Fit To Data ---------- */
function FitToData({ data }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    const layer = new L.GeoJSON(data);
    const b = layer.getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [40, 40] });
  }, [data, map]);
  return null;
}

/* ---------- MMB pan + context menü kapama ---------- */
function InteractionManager({ setIsDragging }) {
  const map = useMap();
  const mmbDragging = useRef(false);
  const last = useRef(null);

  useEffect(() => {
    const el = map.getContainer();
    const preventCtx = (e) => e.preventDefault();
    el.addEventListener("contextmenu", preventCtx);

    const down = (e) => {
      if (e.button === 1) {
        mmbDragging.current = true;
        last.current = { x: e.clientX, y: e.clientY };
        setIsDragging(true);
      }
    };
    const move = (e) => {
      if (mmbDragging.current && last.current) {
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        map.panBy([-dx, -dy], { animate: false });
      }
    };
    const up = () => {
      if (mmbDragging.current) {
        mmbDragging.current = false;
        last.current = null;
        setIsDragging(false);
      }
    };

    el.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      el.removeEventListener("contextmenu", preventCtx);
      el.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [map, setIsDragging]);

  return null;
}

/* ---------- Zoom Handler for Text Scaling ---------- */
function ZoomHandler() {
  const map = useMap();
  useEffect(() => {
    const update = () => {
      const zoom = map.getZoom();
      const size = 30 * Math.pow(2, zoom - 21);
      map.getContainer().style.setProperty('--label-font-size', `${size}px`);
    };
    map.on("zoom", update);
    update();
    return () => map.off("zoom", update);
  }, [map]);
  return null;
}

export default function CableMap({ data, plusMap, minusMap, selected, setSelected }) {
  const paintModeRef = useRef(null); // 'add' | 'erase' | null
  const [, _force] = useState(false);
  const setIsDragging = (v) => _force(v);

  /* yardımcılar */
  const addId = (id) => { 
    if (!id || selected.has(id)) return; 
    const s = new Set(selected); 
    s.add(id); 
    setSelected(s); 
  };
  
  const removeId = (id) => { 
    if (!id || !selected.has(id)) return; 
    const s = new Set(selected); 
    s.delete(id); 
    setSelected(s); 
  };

  const hasAny = (id) => {
    const p = plusMap[id], m = minusMap[id];
    return p != null || m != null;
  };

  /* stil */
  const style = (f) => {
    const id = f.properties?.string_id;
    const isSel = selected.has(id);
    const found = hasAny(id);
    let color = "#374151";
    let fillColor = "#374151";
    if (isSel && found) {
      color = "#22c55e";
      fillColor = "#22c55e";
    } else if (isSel && !found) {
      color = "#f59e0b";
      fillColor = "#f59e0b";
    }
    return { color, fillColor, weight: isSel ? 3 : 1, fillOpacity: isSel ? 0.8 : 0.6, pane: "overlayPane" };
  };

  /* layer event’leri */
  const onEach = (feature, layer) => {
    const id = feature.properties?.string_id || "No ID";

    // Calculate rotation angle
    let angle = 0;
    const geom = feature.geometry;
    let points = [];
    if (geom?.type === "Polygon" && geom.coordinates?.length > 0) {
      points = geom.coordinates[0];
    } else if (geom?.type === "LineString") {
      points = geom.coordinates;
    }

    if (points.length >= 2) {
      let maxLenSq = 0;
      let bestEdge = [points[0], points[1]];

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const lat = p1[1];
        const dx = (p2[0] - p1[0]) * Math.cos(lat * Math.PI / 180);
        const dy = p2[1] - p1[1];
        const lenSq = dx * dx + dy * dy;
        if (lenSq > maxLenSq) {
          maxLenSq = lenSq;
          bestEdge = [p1, p2];
        }
      }

      const [p1, p2] = bestEdge;
      const lat = p1[1];
      const dx = (p2[0] - p1[0]) * Math.cos(lat * Math.PI / 180);
      const dy = p2[1] - p1[1];
      angle = -1 * (Math.atan2(dy, dx) * 180) / Math.PI;
    }

    if (angle > 90) angle -= 180;
    if (angle < -90) angle += 180;

    layer.bindTooltip(
      `<div style="transform: rotate(${angle.toFixed(2)}deg); transform-origin: center;">${id}</div>`,
      { 
        permanent: true, 
        direction: "center", 
        className: "table-label" 
      }
    );

    layer.on("mousedown", (e) => {
      if (e.originalEvent.button === 0) {
        paintModeRef.current = "add";
        L.DomEvent.stopPropagation(e);
      }
    });

    layer.on("mouseup", (e) => {
      if (e.originalEvent.button === 0) {
        paintModeRef.current = null;
      }
    });

    layer.on("contextmenu", (e) => {
      if (e.originalEvent.button === 2) {
        paintModeRef.current = "erase";
        if (selected.has(id)) removeId(id);
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
      }
    });

    layer.on("mouseover", (e) => {
      if (paintModeRef.current === "add" && !selected.has(id)) addId(id);
      else if (paintModeRef.current === "erase" && e.originalEvent.buttons === 2 && selected.has(id)) removeId(id);
    });

    layer.on("click", (e) => {
      if (e.originalEvent.button === 0 && paintModeRef.current !== "add") {
        addId(id);
      }
      L.DomEvent.stopPropagation(e);
    });

    layer.on("contextmenu", (e) => {
      if (paintModeRef.current !== "erase" && selected.has(id)) {
        removeId(id);
      }
    });
  };

  /* Map-level: Global mouseup ile mod sıfırla */
  const MouseMode = () => {
    const map = useMap();
    useEffect(() => {
      map.dragging.disable();
      const up = () => { paintModeRef.current = null; };
      map.on("mouseup", up);
      map.on("contextmenu", (e) => L.DomEvent.preventDefault(e));

      map.on("mousedown", (e) => {
        if (e.originalEvent.button === 2) {
          paintModeRef.current = "erase";
        }
      });

      return () => {
        map.dragging.enable();
        map.off("mouseup", up);
        map.off("mousedown");
      };
    }, [map]);
    return null;
  };

  if (!data) return <div style={{ padding:16 }}>Loading map…</div>;

  return (
    <MapContainer
      style={{ height: "100%", width: "100%" }}
      preferCanvas={true}
      zoomControl={false}
      zoomSnap={0}
      zoomDelta={0.25}
      wheelPxPerZoomLevel={80}
      minZoom={2}
      maxZoom={22}
      doubleClickZoom={true}
      dragging={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxNativeZoom={19}
        maxZoom={22}
      />
      <FitToData data={data} />
      <InteractionManager setIsDragging={setIsDragging} />
      <MouseMode />
      <ZoomHandler />
      <GeoJSON data={data} style={style} onEachFeature={onEach} smoothFactor={0} key={`${selected.size}-${Object.keys(plusMap).length}`} />
    </MapContainer>
  );
}
