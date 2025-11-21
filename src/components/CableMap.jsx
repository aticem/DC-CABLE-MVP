import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import booleanIntersects from "@turf/boolean-intersects";
import bboxPolygon from "@turf/bbox-polygon";

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
    };
    map.on("zoom", update);
    update();
    return () => map.off("zoom", update);
  }, [map]);
  return null;
}

/* ---------- Box Selection ---------- */
function BoxSelection({ geoJsonRef, onSelect, onDeselect, ignoreNextClick }) {
  const map = useMap();
  const [box, setBox] = useState(null);
  const startRef = useRef(null);
  const modeRef = useRef("select");
  const boxRef = useRef(null);

  useEffect(() => {
    const container = map.getContainer();

    const onMouseDown = (e) => {
      if (e.button !== 0 && e.button !== 2) return;

      if (e.target.closest('.leaflet-control') || e.target.closest('.leaflet-popup')) return;

      e.preventDefault();
      startRef.current = map.mouseEventToContainerPoint(e);
      modeRef.current = e.button === 0 ? "select" : "deselect";
      boxRef.current = null;
      setBox(null);
    };

    const onMouseMove = (e) => {
      if (!startRef.current) return;

      const current = map.mouseEventToContainerPoint(e);
      const dx = current.x - startRef.current.x;
      const dy = current.y - startRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        const x = Math.min(startRef.current.x, current.x);
        const y = Math.min(startRef.current.y, current.y);
        const width = Math.abs(dx);
        const height = Math.abs(dy);
        const newBox = { x, y, width, height, mode: modeRef.current };
        setBox(newBox);
        boxRef.current = newBox;
      }
    };

    const onMouseUp = () => {
      if (!startRef.current) return;

      if (boxRef.current && geoJsonRef.current) {
        if (ignoreNextClick?.current !== undefined) {
          ignoreNextClick.current = true;
          setTimeout(() => {
            ignoreNextClick.current = false;
          }, 80);
        }

        const b = boxRef.current;
        const p1 = map.containerPointToLatLng([b.x, b.y]);
        const p2 = map.containerPointToLatLng([b.x + b.width, b.y + b.height]);
        const boxPoly = bboxPolygon([p1.lng, p1.lat, p2.lng, p2.lat]);

        const ids = [];
        geoJsonRef.current.eachLayer((layer) => {
          if (layer.feature && layer.feature.geometry && layer.feature.properties?._uuid) {
            if (booleanIntersects(boxPoly, layer.feature)) {
              ids.push(layer.feature.properties._uuid);
            }
          }
        });

        if (ids.length) {
          if (modeRef.current === "select") onSelect(ids);
          else onDeselect(ids);
        }
      }

      startRef.current = null;
      modeRef.current = "select";
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
  }, [map, geoJsonRef, onSelect, onDeselect, ignoreNextClick]);

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;
    container.classList.toggle('selection-active', Boolean(box)); // keep table hover disabled while selecting
    return () => container.classList.remove('selection-active');
  }, [box, map]);

  if (!box) return null;

  const isSelect = box.mode === "select";

  return (
    <div style={{
      position: 'absolute',
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      border: `2px solid ${isSelect ? '#22c55e' : '#dc2626'}`,
      backgroundColor: isSelect ? 'rgba(34, 197, 94, 0.2)' : 'rgba(220, 38, 38, 0.2)',
      zIndex: 2000,
      pointerEvents: 'none'
    }} />
  );
}

export default function CableMap({ data, plusMap, minusMap, selected, setSelected }) {
  const [, _force] = useState(false);
  const setIsDragging = (v) => _force(v);
  const geoJsonRef = useRef(null);
  const ignoreNextClick = useRef(false);

  /* yardımcılar */
  const addId = (uuid) => {
    if (!uuid) return;
    setSelected((prev) => {
      if (prev.has(uuid)) return prev;
      const next = new Set(prev);
      next.add(uuid);
      return next;
    });
  };

  const removeId = (uuid) => {
    if (!uuid) return;
    setSelected((prev) => {
      if (!prev.has(uuid)) return prev;
      const next = new Set(prev);
      next.delete(uuid);
      return next;
    });
  };

  const addIds = (ids) => {
    if (!ids?.length) return;
    setSelected((prev) => {
      let changed = false;
      const next = new Set(prev);
      ids.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const removeIds = (ids) => {
    if (!ids?.length) return;
    setSelected((prev) => {
      let changed = false;
      const next = new Set(prev);
      ids.forEach((id) => {
        if (next.has(id)) {
          next.delete(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const hasAny = (id) => {
    const p = plusMap[id], m = minusMap[id];
    return p != null || m != null;
  };

  /* stil */
  const style = (f) => {
    const id = f.properties?.string_id;
    const uuid = f.properties?._uuid;
    const isSel = selected.has(uuid);
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
    const uuid = feature.properties?._uuid;

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
      if (ignoreNextClick.current) return;
      if (e.originalEvent.button === 0) {
        addId(uuid);
        L.DomEvent.stopPropagation(e);
      }
    });

    layer.on("contextmenu", (e) => {
      if (ignoreNextClick.current) return;
      if (e.originalEvent.button === 2) {
        removeId(uuid);
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
      <BoxSelection
        geoJsonRef={geoJsonRef}
        onSelect={addIds}
        onDeselect={removeIds}
        ignoreNextClick={ignoreNextClick}
      />
      <ZoomHandler />
      <GeoJSON ref={geoJsonRef} data={data} style={style} onEachFeature={onEach} smoothFactor={1} />
    </MapContainer>
  );
}