import React from 'react';

export default function ProgressStats({ totalPlus, totalMinus, mc4Stats, activeModes, onToggleMode, onReset, onExport, onSubmitDaily }) {
  const mc4Total = mc4Stats?.total || 0;
  const mc4Completed = mc4Stats?.completed || 0;
  const mc4Remaining = mc4Total - mc4Completed;
  const mc4Percent = mc4Total > 0 ? ((mc4Completed / mc4Total) * 100).toFixed(1) : 0;

  const statBoxStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#1e293b",
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid #334155",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#e2e8f0"
  };

  const buttonStyle = {
    background: "#1e2433",
    color: "#e2e8f0",
    border: "1px solid #334155",
    padding: "8px 18px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
    transition: "background 0.2s, border 0.2s, color 0.2s"
  };

  const handleButtonHover = (e, hovering) => {
    e.currentTarget.style.background = hovering ? "#273349" : "#1e2433";
  };

  return (
    <div style={{
      display: "flex", flexDirection: "column", width: "100%", zIndex: 2000, position: "relative"
    }}>
      {/* Top Row: DC Stats & Controls */}
      <div style={{
        height: "60px", background: "#0f172a", display: "flex", alignItems: "center",
        padding: "0 24px", justifyContent: "space-between", color: "white",
        borderBottom: "1px solid #1e293b", position: "relative"
      }}>
        {/* LEFT: DC Mode + Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: activeModes?.dc ? "#ffffff" : "#94a3b8",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            minWidth: "150px"
          }}>
            <input
              type="checkbox"
              checked={!!activeModes?.dc}
              onChange={() => onToggleMode("dc")}
              style={{ width: "16px", height: "16px", accentColor: "#22c55e", cursor: "pointer" }}
            />
            DC Cable
          </label>

          <div style={statBoxStyle}>
            <span style={{ color: "#94a3b8" }}>+ DC Cable:</span>
            <span>{totalPlus.toFixed(2)} m</span>
          </div>
          <div style={statBoxStyle}>
            <span style={{ color: "#94a3b8" }}>- DC Cable:</span>
            <span>{totalMinus.toFixed(2)} m</span>
          </div>
        </div>

        {/* CENTER TITLE */}
        <div style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          fontWeight: 700,
          fontSize: "1.1rem",
          letterSpacing: "0.5px"
        }}>
          DC Cable and MC4 Installation Progress Tracking
        </div>

        {/* RIGHT: Actions */}
        <div style={{ display: "flex", gap: "12px" }}>
        <button
          onClick={onSubmitDaily}
            style={{ ...buttonStyle }}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
        >
          Submit Daily Work
        </button>
        <button
          onClick={onExport}
            style={{ ...buttonStyle }}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
        >
          Export
        </button>
        <button
          onClick={onReset}
            style={{ ...buttonStyle }}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
        >
          Reset All
        </button>
      </div>
      </div>

      {/* Bottom Row: MC4 Stats */}
      <div style={{
        height: "40px", background: "#0f172a", display: "flex", alignItems: "center",
        padding: "0 24px", justifyContent: "space-between", color: "white",
        borderBottom: "1px solid #334155", fontSize: "0.9rem"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <label style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: activeModes?.mc4 ? "#ffffff" : "#94a3b8",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
            minWidth: "180px"
          }}>
            <input
              type="checkbox"
              checked={!!activeModes?.mc4}
              onChange={() => onToggleMode("mc4")}
              style={{ width: "16px", height: "16px", accentColor: "#3b82f6", cursor: "pointer" }}
            />
            MC4
          </label>

          <div style={statBoxStyle}>
            <span style={{ color: "#94a3b8" }}>Total:</span>
            <span>{mc4Total}</span>
          </div>
          <div style={statBoxStyle}>
            <span style={{ color: "#94a3b8" }}>Completed:</span>
            <span style={{ color: "#22c55e" }}>{mc4Completed}</span>
            <span style={{ color: "#94a3b8" }}>({mc4Percent}%)</span>
          </div>
          <div style={statBoxStyle}>
            <span style={{ color: "#94a3b8" }}>Remaining:</span>
            <span style={{ color: "#ef4444" }}>{mc4Remaining}</span>
          </div>
        </div>

        <div />
      </div>
    </div>
  );
}
