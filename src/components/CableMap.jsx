import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, Marker } from "react-leaflet";
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
function BoxSelection({ geoJsonRef, mc4LayerRef, onSelect, onDeselect, onToggleMc4Bulk, modeRef: activeModeRef }) {
  const map = useMap();
  const [box, setBox] = useState(null);
  const startRef = useRef(null);
  const modeRef = useRef(null); // 'select' | 'deselect'
  const boxRef = useRef(null);

  useEffect(() => {
    const container = map.getContainer();

    const onMouseDown = (e) => {
      const modes = activeModeRef?.current || {};
      if (!modes.dc && !modes.mc4) return;
      
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

      if (boxRef.current && (geoJsonRef.current || mc4LayerRef?.current)) {
        const modes = activeModeRef?.current || {};
        if (!modes.dc && !modes.mc4) return;

        const b = boxRef.current;
        const p1 = map.containerPointToLatLng([b.x, b.y]);
        const p2 = map.containerPointToLatLng([b.x + b.width, b.y + b.height]);
        const bounds = L.latLngBounds(p1, p2);

        if (modes.dc && geoJsonRef.current) {
          const ids = [];
          geoJsonRef.current.eachLayer((layer) => {
            if (layer.feature && layer.feature.properties?.string_id) {
              if (bounds.intersects(layer.getBounds())) {
                ids.push(layer.feature.properties.string_id);
              }
            }
          });

          if (ids.length) {
            if (modeRef.current === 'select') onSelect(ids);
            else onDeselect(ids);
          }
        }

        if (modes.mc4 && mc4LayerRef?.current && onToggleMc4Bulk) {
          const targets = [];
          mc4LayerRef.current.eachLayer((layer) => {
            const props = layer.feature?.properties;
            if (props?.id && props?.position) {
              if (bounds.intersects(layer.getBounds())) {
                targets.push(props);
              }
            }
          });

          if (targets.length) {
            const value = modeRef.current === 'select';
            onToggleMc4Bulk(targets, value);
          }
        }
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
  }, [map, geoJsonRef, mc4LayerRef, onSelect, onDeselect, onToggleMc4Bulk]);

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

/* ---------- MC4 Helper ---------- */
const getTableEndpoints = (feature) => {
  if (!feature.geometry || feature.geometry.type !== 'Polygon') return null;
  const coords = feature.geometry.coordinates[0]; // Ring
  if (coords.length < 4) return null; 

  // Calculate all edge lengths
  const edges = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i+1];
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    const lenSq = dx*dx + dy*dy;
    edges.push({ i, lenSq, p1, p2 });
  }

  // Sort by length (ascending)
  edges.sort((a, b) => a.lenSq - b.lenSq);

  // Take the two shortest edges
  const short1 = edges[0];
  const short2 = edges[1];

  // Calculate midpoints [lat, lng]
  // GeoJSON is [lng, lat], Leaflet wants [lat, lng]
  const m1 = [(short1.p1[1] + short1.p2[1]) / 2, (short1.p1[0] + short1.p2[0]) / 2];
  const m2 = [(short2.p1[1] + short2.p2[1]) / 2, (short2.p1[0] + short2.p2[0]) / 2];

  // Push the points slightly inward so the squares remain inside the table polygon
  const center = [(m1[0] + m2[0]) / 2, (m1[1] + m2[1]) / 2];
  const factor = 0.2;
  const m1In = [m1[0] + (center[0] - m1[0]) * factor, m1[1] + (center[1] - m1[1]) * factor];
  const m2In = [m2[0] + (center[0] - m2[0]) * factor, m2[1] + (center[1] - m2[1]) * factor];

  return { start: m1In, end: m2In };
};

// Helper to create a small square polygon around a point
const createSquare = (center, size) => {
  const [lat, lng] = center;
  // Convert degrees to meters roughly (1 deg lat ~ 111km)
  // We want ~0.5m size. 0.5m is approx 0.0000045 degrees.
  // Let's use a fixed small degree value for simplicity as projection varies.
  // 0.000005 is roughly 0.5m.
  const d = size / 2;
  
  // Return coordinates for a square polygon
  return [
    [lat - d, lng - d],
    [lat + d, lng - d],
    [lat + d, lng + d],
    [lat - d, lng + d]
  ];
};

export default function CableMap({ data, backgroundData, textData, invPointsData, plusMap, minusMap, selected, setSelected, mc4Status, onToggleMc4, activeModes }) {
  const [, _force] = useState(false);
  const setIsDragging = (v) => _force(v);
  const geoJsonRef = useRef(null);
  const [processedTextData, setProcessedTextData] = useState(null);
  const [highlightedInverters, setHighlightedInverters] = useState(new Set());
  const [inverterColors, setInverterColors] = useState({});

  // Store mode selections in ref for event handlers
  const modeRef = useRef(activeModes);
  useEffect(() => { modeRef.current = activeModes; }, [activeModes]);

  const highlightedInvertersRef = useRef(highlightedInverters);
  useEffect(() => { highlightedInvertersRef.current = highlightedInverters; }, [highlightedInverters]);

  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // Generate MC4 GeoJSON features
  const mc4Features = React.useMemo(() => {
    if (!data) return null;
    const features = [];
    data.features.forEach(f => {
      const id = f.properties?.string_id;
      if (!id) return;
      const endpoints = getTableEndpoints(f);
      if (!endpoints) return;

      // Create square polygons (approx 0.000012 degrees ~ 1.2m)
      const size = 0.000012;
      
      features.push({
        type: "Feature",
        properties: { id, position: 'start' },
        geometry: {
          type: "Polygon",
          coordinates: [createSquare(endpoints.start, size).map(p => [p[1], p[0]])] // Swap back to [lng, lat] for GeoJSON
        }
      });

      features.push({
        type: "Feature",
        properties: { id, position: 'end' },
        geometry: {
          type: "Polygon",
          coordinates: [createSquare(endpoints.end, size).map(p => [p[1], p[0]])]
        }
      });
    });
    return { type: "FeatureCollection", features };
  }, [data]);

  // Ref for MC4 layer to update styles / order
  const mc4LayerRef = useRef(null);

  // Derived key so MC4 GeoJSON re-renders when status changes
  const mc4StatusKey = React.useMemo(() => {
    if (!mc4Status) return 'mc4-empty';
    const parts = Object.entries(mc4Status).map(([id, status]) => {
      const start = status?.start ? '1' : '0';
      const end = status?.end ? '1' : '0';
      return `${id}:${start}${end}`;
    });
    return `mc4-${parts.sort().join('|')}`;
  }, [mc4Status]);

  // Style helper for MC4 squares
  const mc4Style = React.useCallback((feature) => {
    const { id, position } = feature.properties || {};
    const installed = mc4Status?.[id]?.[position];
    const color = installed ? '#ef4444' : '#1f2937';
    return {
      color,
      fillColor: color,
      weight: 1,
      fillOpacity: 1,
      pane: 'markerPane'
    };
  }, [mc4Status]);

  // Keep MC4 layer above tables for reliable clicks
  useEffect(() => {
    if (mc4LayerRef.current) {
      mc4LayerRef.current.bringToFront();
    }
  }, [mc4Features, mc4Status]);

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

  const bulkToggleMc4 = (targets, value) => {
    if (!targets || !targets.length) return;
    targets.forEach(({ id, position }) => {
      onToggleMc4(id, position, value);
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

    // Check for inverter highlight
    let isHighlighted = false;
    let highlightColor = "#06b6d4"; // Default Cyan

    if (id && highlightedInverters.size > 0) {
      for (const inv of highlightedInverters) {
        const normalizedInv = inv.replace(/\s+/g, "");
        // Match exact inverter prefix (e.g. "TX6-INV2-") to avoid matching "TX6-INV21"
        if (id.startsWith(normalizedInv + "-")) {
          isHighlighted = true;
          highlightColor = inverterColors[inv] || "#06b6d4";
          break;
        }
      }
    }

    // If selected, prefer highlight color if available, else green. If not selected, gray.
    const finalColor = isSel 
      ? (isHighlighted ? highlightColor : "#22c55e") 
      : "#374151";

    return { 
      color: finalColor, 
      fillColor: finalColor, 
      weight: isSel ? 3 : 1, 
      fillOpacity: isSel ? 0.8 : 0.6, 
      pane: "overlayPane" 
    };
  };

  const backgroundStyle = (feature) => {
    return {
      color: "#0b0b0b",
      weight: 2.5,
      opacity: 0.95,
      lineCap: "round",
      lineJoin: "round",
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

    const marker = L.marker(latlng, {
      icon: L.divIcon({
        className: 'bg-transparent custom-text-label',
        html: `<div style="
          transform: rotate(${angle}deg); 
          white-space: nowrap; 
          color: #fbbf24; 
          font-weight: bold; 
          font-size: var(--label-font-size);
          text-shadow: 0px 0px 2px #000;
          cursor: pointer;
        ">${label}</div>`
      })
    });

    marker.on('click', (e) => {
      const modes = modeRef.current || {};
      if (!modes.dc) return;
      L.DomEvent.stopPropagation(e);
      
      const isCurrentlyHighlighted = highlightedInvertersRef.current.has(label);
      
      // Find matching IDs
      const normalizedInv = label.replace(/\s+/g, "");
      const idsToToggle = [];
      const currentData = dataRef.current;
      if (currentData && currentData.features) {
          currentData.features.forEach(f => {
              const fid = f.properties?.string_id;
              if (fid && fid.startsWith(normalizedInv + "-")) {
                  idsToToggle.push(fid);
              }
          });
      }

      if (isCurrentlyHighlighted) {
          // Remove
          setHighlightedInverters(prev => {
              const next = new Set(prev);
              next.delete(label);
              return next;
          });
          setInverterColors(prev => {
              const next = {...prev};
              delete next[label];
              return next;
          });
          removeIds(idsToToggle);
      } else {
          // Add
          setHighlightedInverters(prev => {
              const next = new Set(prev);
              next.add(label);
              return next;
          });
          const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
          setInverterColors(prev => ({...prev, [label]: randomColor}));
          addIds(idsToToggle);
      }
    });

    return marker;
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

        // Handle tooltip visibility for highlighted items
        const id = feature.properties?.string_id;
        let isHighlighted = false;
        if (id && highlightedInverters.size > 0) {
          for (const inv of highlightedInverters) {
            const normalizedInv = inv.replace(/\s+/g, "");
            // Match exact inverter prefix (e.g. "TX6-INV2-")
            if (id.startsWith(normalizedInv + "-")) {
              isHighlighted = true;
              break;
            }
          }
        }

        const tooltip = layer.getTooltip();
        if (tooltip) {
            const content = tooltip.getContent();
            const isPermanent = tooltip.options.permanent;
            
            if (isHighlighted && !isPermanent) {
                layer.unbindTooltip();
                layer.bindTooltip(content, { permanent: true, direction: "center", className: "table-label" });
            } else if (!isHighlighted && isPermanent) {
                layer.unbindTooltip();
                layer.bindTooltip(content, { permanent: false, direction: "center", className: "table-label" });
                layer.closeTooltip();
            }
        }
      }
    });
  }, [selected, plusMap, minusMap, highlightedInverters]);

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
      const modes = modeRef.current || {};
      if (!modes.dc) return;

      if (e.originalEvent.button === 0) {
        addId(id);
        L.DomEvent.stopPropagation(e);
      }
    });

    layer.on("contextmenu", (e) => {
      const modes = modeRef.current || {};
      if (!modes.dc) return;

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
      style={{ height: "100%", width: "100%", background: "#ffffff" }}
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
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors &copy; CARTO"
        maxNativeZoom={19}
        maxZoom={22}
      />
      <FitToData data={data} />
      <InteractionManager setIsDragging={setIsDragging} />
      <MouseMode />
      <BoxSelection
        geoJsonRef={geoJsonRef}
        mc4LayerRef={mc4LayerRef}
        onSelect={addIds}
        onDeselect={removeIds}
        onToggleMc4Bulk={bulkToggleMc4}
        modeRef={modeRef}
      />
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
      {mc4Features && (
        <GeoJSON
          key={mc4StatusKey}
          ref={mc4LayerRef}
          data={mc4Features}
          style={mc4Style}
          bubblingMouseEvents={false}
          onEachFeature={(feature, layer) => {
            layer.on('click', (e) => {
              const modes = modeRef.current || {};
              if (!modes.mc4) return;

              L.DomEvent.stopPropagation(e);
              if (e.originalEvent) {
                e.originalEvent.preventDefault();
                e.originalEvent.stopPropagation();
              }
              const { id, position } = feature.properties;
              onToggleMc4(id, position, true);
            });

            layer.on('contextmenu', (e) => {
              const modes = modeRef.current || {};
              if (!modes.mc4) return;

              L.DomEvent.preventDefault(e);
              L.DomEvent.stopPropagation(e);
              const { id, position } = feature.properties;
              onToggleMc4(id, position, false);
            });
          }}
        />
      )}
    </MapContainer>
    </>
  );
}

