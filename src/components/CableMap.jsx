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
      const container = map.getContainer();
      container.style.setProperty('--label-font-size', `${size}px`);
      
      // Hide labels if zoom is too far out to improve performance
      if (zoom < 18) {
         container.classList.add('hide-labels');
      } else {
         container.classList.remove('hide-labels');
      }
    };
    map.on("zoom", update);
    update();
    return () => map.off("zoom", update);
  }, [map]);
  return null;
}

/* ---------- Box Selection ---------- */
function BoxSelection({ geoJsonRef, onSelect, onDeselect }) {
  const map = useMap();
  const [box, setBox] = useState(null);
  const startRef = useRef(null);
  const modeRef = useRef(null); // 'select' | 'deselect'
  const boxRef = useRef(null);

  useEffect(() => {
    const container = map.getContainer();

    const onMouseDown = (e) => {
      // Left (0) or Right (2)
      if (e.button !== 0 && e.button !== 2) return;
      
      startRef.current = map.mouseEventToContainerPoint(e);
      modeRef.current = e.button === 0 ? 'select' : 'deselect';
      boxRef.current = null;
      setBox(null);
    };

    const onMouseMove = (e) => {
      if (!startRef.current) return;

      const current = map.mouseEventToContainerPoint(e);
      const dx = current.x - startRef.current.x;
      const dy = current.y - startRef.current.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        const x = Math.min(startRef.current.x, current.x);
        const y = Math.min(startRef.current.y, current.y);
        const width = Math.abs(dx);
        const height = Math.abs(dy);
        
        const newBox = { x, y, width, height, mode: modeRef.current };
        setBox(newBox);
        boxRef.current = newBox;
      }
    };

    const onMouseUp = (e) => {
      if (!startRef.current) return;

      if (boxRef.current && geoJsonRef.current) {
        const b = boxRef.current;
        const p1 = map.containerPointToLatLng([b.x, b.y]);
        const p2 = map.containerPointToLatLng([b.x + b.width, b.y + b.height]);
        const bounds = L.latLngBounds(p1, p2);

        const ids = [];
        geoJsonRef.current.eachLayer((layer) => {
          if (layer.feature && layer.feature.properties?.string_id) {
             if (bounds.intersects(layer.getBounds())) {
               ids.push(layer.feature.properties.string_id);
             }
          }
        });

        if (modeRef.current === 'select') onSelect(ids);
        else onDeselect(ids);
      }

      startRef.current = null;
      modeRef.current = null;
      boxRef.current = null;
      setBox(null);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [map, geoJsonRef, onSelect, onDeselect]);

  if (!box) return null;

  return (
    <div style={{
      position: 'absolute',
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      border: `2px solid ${box.mode === 'select' ? '#22c55e' : '#ef4444'}`,
      backgroundColor: box.mode === 'select' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
      zIndex: 2000,
      pointerEvents: 'none'
    }} />
  );
}

export default function CableMap({ data, plusMap, minusMap, selected, setSelected }) {
  const [, _force] = useState(false);
  const setIsDragging = (v) => _force(v);
  const geoJsonRef = useRef(null);

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

  const addIds = (ids) => {
    const s = new Set(selected);
    let changed = false;
    ids.forEach(id => {
      if (!s.has(id)) {
        s.add(id);
        changed = true;
      }
    });
    if (changed) setSelected(s);
  };

  const removeIds = (ids) => {
    const s = new Set(selected);
    let changed = false;
    ids.forEach(id => {
      if (s.has(id)) {
        s.delete(id);
        changed = true;
      }
    });
    if (changed) setSelected(s);
  };

  const hasAny = (id) => {
    const p = plusMap[id], m = minusMap[id];
    return p != null || m != null;
  };

  /* stil */
  const style = (f) => {
    const id = f.properties?.string_id;
    const isSel = selected.has(id);
    let color = "#374151";
    let fillColor = "#374151";
    if (isSel) {
      color = "#22c55e";
      fillColor = "#22c55e";
    }
    return { color, fillColor, weight: isSel ? 3 : 1, fillOpacity: isSel ? 0.8 : 0.6, pane: "overlayPane" };
  };

  // Update styles imperatively when selection changes
  useEffect(() => {
    if (!geoJsonRef.current) return;
    geoJsonRef.current.eachLayer((layer) => {
      const feature = layer.feature;
      if (feature) {
        const newStyle = style(feature);
        layer.setStyle(newStyle);
        if (newStyle.weight === 3) {
            layer.bringToFront();
        }
      }
    });
  }, [selected, plusMap, minusMap]);

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

    layer.on("click", (e) => {
      if (e.originalEvent.button === 0) {
        addId(id);
        L.DomEvent.stopPropagation(e);
      }
    });

    layer.on("contextmenu", (e) => {
      if (e.originalEvent.button === 2) {
        removeId(id);
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
      }
    });
  };

  /* Map-level: Global mouseup ile mod sıfırla */
  const MouseMode = () => {
    const map = useMap();
    useEffect(() => {
      // Ensure dragging is disabled (fix for previous component cleanup re-enabling it)
      map.dragging.disable();
      
      const preventCtx = (e) => L.DomEvent.preventDefault(e);
      map.on("contextmenu", preventCtx);
      return () => {
        map.off("contextmenu", preventCtx);
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
      <BoxSelection geoJsonRef={geoJsonRef} onSelect={addIds} onDeselect={removeIds} />
      <ZoomHandler />
      <GeoJSON ref={geoJsonRef} data={data} style={style} onEachFeature={onEach} smoothFactor={1} />
    </MapContainer>
  );
}
