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

/* ---------- Zoom Handler for Text Scaling & Visibility ---------- */
function ZoomHandler() {
  const map = useMap();
  useEffect(() => {
    const update = () => {
      const zoom = map.getZoom();
      const size = 30 * Math.pow(2, zoom - 21);
      const container = map.getContainer();
      
      // Font size scaling
      container.style.setProperty('--label-font-size', `${size}px`);
      
      // Visibility toggle (Zoom < 17 hides labels)
      if (zoom < 17) {
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

export default function CableMap({ data, backgroundData, textData, invPointsData, plusMap, minusMap, selected, setSelected }) {
  const [, _force] = useState(false);
  const setIsDragging = (v) => _force(v);
  const geoJsonRef = useRef(null);
  const [processedTextData, setProcessedTextData] = useState(null);

  /* ---------- Text Alignment Logic ---------- */
  useEffect(() => {
    if (!textData || !invPointsData) {
      setProcessedTextData(textData);
      return;
    }

    const newTextData = JSON.parse(JSON.stringify(textData));
    const invFeatures = invPointsData.features;

    // Helper to get center of a LineString/Polygon
    const getCenter = (coords) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      coords.forEach(p => {
        const [x, y] = p;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      });
      return [(minX + maxX) / 2, (minY + maxY) / 2];
    };

    // Helper to calculate angle of longest segment
    const getAngle = (coords) => {
      if (coords.length < 2) return 0;
      let maxLenSq = 0;
      let bestEdge = [coords[0], coords[1]];

      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const lenSq = dx * dx + dy * dy;
        if (lenSq > maxLenSq) {
          maxLenSq = lenSq;
          bestEdge = [p1, p2];
        }
      }

      const [p1, p2] = bestEdge;
      // Simple atan2 for angle in degrees
      // Note: GeoJSON is [lng, lat]. 
      // For map rotation, we usually want angle relative to East (0) or North.
      // Leaflet rotation is usually clockwise from North or counter-clockwise from East?
      // CSS rotate is clockwise.
      // Math.atan2(dy, dx) gives angle from X axis (East) counter-clockwise.
      // We need to adjust for aspect ratio if we want true geographic angle, 
      // but for small features, simple dx/dy is often "good enough" for alignment 
      // if we just want to match the line.
      // Let's use the same logic as onEachText but simplified.
      
      const lat = p1[1];
      // Adjust dx for latitude to get roughly correct visual angle
      const dxAdj = (p2[0] - p1[0]) * Math.cos(lat * Math.PI / 180);
      const dyAdj = p2[1] - p1[1];
      
      let angle = Math.atan2(dyAdj, dxAdj) * 180 / Math.PI;
      
      // Normalize to -90 to 90 for readability (so text isn't upside down)
      if (angle > 90) angle -= 180;
      if (angle < -90) angle += 180;
      
      // Invert for CSS rotation (which is clockwise) vs Math (counter-clockwise)
      return -angle; 
    };

    newTextData.features.forEach(textFeature => {
      const tCoords = textFeature.geometry.coordinates; // [lng, lat]
      
      let minDistSq = Infinity;
      let bestInv = null;
      let bestCenter = null;

      // Find nearest inv_point
      for (const inv of invFeatures) {
        const iCoords = inv.geometry.coordinates;
        const center = getCenter(iCoords);
        
        const dx = center[0] - tCoords[0];
        const dy = center[1] - tCoords[1];
        const distSq = dx*dx + dy*dy;

        if (distSq < minDistSq) {
          minDistSq = distSq;
          bestInv = inv;
          bestCenter = center;
        }
      }

      // Threshold: only snap if reasonably close (e.g. ~0.0005 degrees is roughly 50m, adjust as needed)
      // 0.000001 is very close. Let's say 0.0001 (approx 10m).
      if (bestInv && minDistSq < 0.000001) { 
        // Snap position
        textFeature.geometry.coordinates = bestCenter;
        
        // Snap rotation
        textFeature.properties.angle = getAngle(bestInv.geometry.coordinates);
      }
    });

    setProcessedTextData(newTextData);
  }, [textData, invPointsData]);

  /* yardımcılar */
  const addIds = (ids) => {
    setSelected(prev => {
      const s = new Set(prev);
      let changed = false;
      ids.forEach(id => {
        if (!s.has(id)) {
          s.add(id);
          changed = true;
        }
      });
      return changed ? s : prev;
    });
  };

  const removeIds = (ids) => {
    setSelected(prev => {
      const s = new Set(prev);
      let changed = false;
      ids.forEach(id => {
        if (s.has(id)) {
          s.delete(id);
          changed = true;
        }
      });
      return changed ? s : prev;
    });
  };

  const addId = (id) => { 
    if (!id) return; 
    setSelected(prev => {
      if (prev.has(id)) return prev;
      const s = new Set(prev);
      s.add(id);
      return s;
    });
  };
  
  const removeId = (id) => { 
    if (!id) return; 
    setSelected(prev => {
      if (!prev.has(id)) return prev;
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  };

  const isSelected = (id) => selected.has(id);

  const hasAny = (id) => {
    const p = plusMap[id], m = minusMap[id];
    return p != null || m != null;
  };

  /* stil */
  const style = (f) => {
    const id = f.properties?.string_id;
    const isSel = isSelected(id);
    const has = hasAny(id);

    const color = isSel ? "#22c55e" : "#374151";
    const fillColor = isSel ? "#22c55e" : "#374151";

    return { color, fillColor, weight: isSel ? 3 : 1, fillOpacity: isSel ? 0.8 : 0.6, pane: "overlayPane" };
  };

  const backgroundStyle = (feature) => {
    const rainbow = ["#FF69B4", "#FFA52C", "#FFFF41", "#008018", "#0000F9", "#86007D"];
    // Use geometry if properties are empty to ensure uniqueness
    const str = (feature?.properties && Object.keys(feature.properties).length > 0) 
      ? JSON.stringify(feature.properties) 
      : JSON.stringify(feature?.geometry || Math.random());
      
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = rainbow[Math.abs(hash) % rainbow.length];

    return {
      color: color,
      weight: 2,
      opacity: 0.8,
      interactive: false
    };
  };

  const invPointsStyle = {
    color: "#ef4444", // red-500
    weight: 4,
    opacity: 1,
    interactive: false
  };

  const textStyle = {
    color: "transparent",
    weight: 0,
    fillOpacity: 0,
    interactive: false
  };

  const pointToLayerText = (feature, latlng) => {
    const props = feature.properties || {};
    const label = props.Text || props.text || props.Name || props.name || props.string_id || props.id || "";
    const angle = props.Rotation || props.angle || 0;

    return L.marker(latlng, {
      icon: L.divIcon({
        className: 'bg-transparent custom-text-label',
        html: `<div style="
          transform: rotate(${angle}deg); 
          white-space: nowrap; 
          color: #fbbf24; 
          font-weight: bold; 
          font-size: var(--label-font-size);
          text-shadow: 0px 0px 2px #000;
        ">${label}</div>`
      })
    });
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
        permanent: false, 
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

  const onEachBackground = (feature, layer) => {
    // Just lines, no labels
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
    <>
    <style>{`
      .hide-labels .custom-text-label,
      .hide-labels .table-label {
        opacity: 0 !important;
        pointer-events: none;
        transition: opacity 0.2s;
      }
    `}</style>
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
      {backgroundData && (
        <GeoJSON 
          data={backgroundData} 
          style={backgroundStyle} 
          onEachFeature={onEachBackground} 
        />
      )}
      {invPointsData && (
        <GeoJSON 
          data={invPointsData} 
          style={invPointsStyle} 
          interactive={false}
        />
      )}
      {processedTextData && (
        <GeoJSON 
          data={processedTextData} 
          style={textStyle} 
          pointToLayer={pointToLayerText}
        />
      )}
      <GeoJSON ref={geoJsonRef} data={data} style={style} onEachFeature={onEach} smoothFactor={1} />
    </MapContainer>
    </>
  );
}

