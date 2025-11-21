import React from 'react';

export default function ProgressStats({ totalPlus, totalMinus, onReset, onExport, onSubmitDaily }) {
  return (
    <div style={{
      height: "60px", background: "#0f172a", display: "flex", alignItems: "center",
      padding: "0 24px", justifyContent: "space-between", color: "white",
      borderBottom: "1px solid #1e293b", zIndex: 2000, position: "relative"
    }}>
      {/* LEFT: Stats */}
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
         <div style={{
           display: "flex", alignItems: "center", gap: "8px",
           background: "#1e293b", padding: "6px 12px", borderRadius: "6px", border: "1px solid #334155", fontSize: "0.9rem", fontWeight: 600
         }}>
           <span style={{ color: "#94a3b8" }}>+ DC:</span>
           <span>{totalPlus.toFixed(2)} m</span>
         </div>
         <div style={{
           display: "flex", alignItems: "center", gap: "8px",
           background: "#1e293b", padding: "6px 12px", borderRadius: "6px", border: "1px solid #334155", fontSize: "0.9rem", fontWeight: 600
         }}>
           <span style={{ color: "#94a3b8" }}>- DC:</span>
           <span>{totalMinus.toFixed(2)} m</span>
         </div>
      </div>

      {/* CENTER: Title */}
      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", fontWeight: 700, fontSize: "1.25rem", letterSpacing: "0.5px" }}>
        DC Cable Pulling Progress Tracking
      </div>

      {/* RIGHT: Actions */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={onSubmitDaily}
          style={{
            background: "#3b82f6", color: "white", border: "none",
            padding: "6px 16px", borderRadius: "6px", cursor: "pointer",
            fontWeight: 600, fontSize: "0.9rem", transition: "all 0.2s"
          }}
        >
          Submit Daily Work
        </button>
        <button
          onClick={onExport}
          style={{
            background: "#10b981", color: "white", border: "none",
            padding: "6px 16px", borderRadius: "6px", cursor: "pointer",
            fontWeight: 600, fontSize: "0.9rem", transition: "all 0.2s"
          }}
        >
          Export
        </button>
        <button
          onClick={onReset}
          style={{
            background: "transparent", color: "#ef4444", border: "1px solid #ef4444",
            padding: "6px 16px", borderRadius: "6px", cursor: "pointer",
            fontWeight: 600, fontSize: "0.9rem", transition: "all 0.2s"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)"}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
