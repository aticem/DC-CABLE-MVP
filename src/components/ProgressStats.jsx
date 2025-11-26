import React from 'react';

export default function ProgressStats({
  totalPlus,
  totalMinus,
  totalFieldLength,
  mc4Stats,
  activeModes,
  onToggleMode,
  onReset,
  onExport,
  onSubmitDaily,
  onUndoSelection,
  onRedoSelection
}) {
  const mc4Total = mc4Stats?.total || 0;
  const mc4Completed = mc4Stats?.completed || 0;
  const mc4Remaining = mc4Total - mc4Completed;
  const mc4Percent = mc4Total > 0 ? ((mc4Completed / mc4Total) * 100).toFixed(1) : 0;
  const dcCompleted = totalPlus + totalMinus;
  const dcPercent = totalFieldLength > 0 ? ((dcCompleted / totalFieldLength) * 100).toFixed(1) : 0;
  const headerTextColor = "#f8fafc";

  const statBoxStyle = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "#0b2644",
    padding: "4px 12px",
    borderRadius: "6px",
    border: "1px solid #123963",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#f8fafc",
    boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
  };

  const buttonStyle = {
    background: "#0b2644",
    color: "#e2e8f0",
    border: "1px solid #123963",
    padding: "8px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "background 0.2s, transform 0.1s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  };

  return (
    <>
    <style>{`
      .tooltip-btn {
        position: relative;
      }
      .tooltip-btn::after {
        content: attr(data-tip);
        position: absolute;
        bottom: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        color: #f8fafc;
        font-size: 0.65rem;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0s linear;
      }
      .tooltip-btn:hover::after {
        opacity: 1;
      }
    `}</style>
    <div style={{
      display: "flex", flexDirection: "column", width: "100%", zIndex: 2000, position: "relative",
      background: "#f8fafc", borderBottom: "1px solid #e2e8f0"
    }}>
      {/* Top Row: DC Stats & Controls */}
      <div style={{
        height: "60px",
        background: "#0d2948",
        display: "grid",
        gridTemplateColumns: "minmax(220px, auto) 1fr auto",
        alignItems: "center",
        padding: "0 24px",
        color: "#f8fafc",
        borderBottom: "1px solid #0d2948",
        gap: "16px"
      }}>
        {/* LEFT: DC Mode + Stats */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            color: headerTextColor,
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            width: "auto",
            minWidth: "0"
          }}>
            <input
              type="checkbox"
              checked={!!activeModes?.dc}
              onChange={() => onToggleMode("dc")}
              style={{ width: "14px", height: "14px", accentColor: "#22c55e", cursor: "pointer" }}
            />
            DC Cable
          </label>

          <div style={statBoxStyle}>
            <span style={{ color: headerTextColor }}>∑:</span>
            <span>{totalFieldLength.toFixed(2)} m</span>
          </div>
          <div style={{ ...statBoxStyle, flexDirection: "column", alignItems: "flex-start", fontSize: "0.7rem" }}>
            <span style={{ color: headerTextColor }}>+ DC Cable: {totalPlus.toFixed(2)} m</span>
            <span style={{ color: headerTextColor }}>- DC Cable: {totalMinus.toFixed(2)} m</span>
          </div>
          <div style={statBoxStyle}>
            <span style={{ color: headerTextColor }}>Done:</span>
            <span style={{ color: "#16a34a" }}>{dcCompleted.toFixed(2)} m ({dcPercent}%)</span>
          </div>
          <div style={statBoxStyle}>
            <span style={{ color: headerTextColor }}>Remaining:</span>
            <span style={{ color: "#dc2626" }}>{(totalFieldLength - dcCompleted).toFixed(2)} m</span>
          </div>
        </div>

        {/* CENTER TITLE */}
        <div style={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: "0.9rem",
          letterSpacing: "0.25px",
          color: headerTextColor,
          alignSelf: "center",
          paddingTop: "0",
          transform: "translateY(10px)"
        }}>
          DC Cable and MC4 Installation Progress Tracking
        </div>

        {/* RIGHT: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", alignSelf: "center" }}>
          <button
            onClick={onSubmitDaily}
            className="tooltip-btn"
            data-tip="Submit Daily Work"
            style={{ ...buttonStyle, width: "44px", height: "44px", borderRadius: "12px", fontSize: "1.3rem" }}
          >
            👇
          </button>
          <button
            onClick={onExport}
            className="tooltip-btn"
            data-tip="Export Excel"
            style={{ ...buttonStyle, width: "44px", height: "44px", borderRadius: "12px", fontSize: "1.3rem" }}
          >
            ⤓
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <button
              onClick={onReset}
              style={{ ...buttonStyle, width: "60px", height: "32px", borderRadius: "8px", fontSize: "0.8rem" }}
            >
              Reset
            </button>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={onRedoSelection}
                className="tooltip-btn"
                data-tip="Redo"
                style={{ ...buttonStyle, width: "32px", height: "32px", borderRadius: "8px", fontSize: "0.9rem" }}
              >
                ↷
              </button>
              <button
                onClick={onUndoSelection}
                className="tooltip-btn"
                data-tip="Undo"
                style={{ ...buttonStyle, width: "32px", height: "32px", borderRadius: "8px", fontSize: "0.9rem" }}
              >
                ↶
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: MC4 Stats */}
      <div style={{
        height: "40px", background: "#0d2948", display: "flex", alignItems: "center",
        padding: "0 24px", justifyContent: "flex-start", color: "#f8fafc",
        borderBottom: "1px solid #0d2948", fontSize: "0.9rem", gap: "10px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            color: headerTextColor,
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            width: "auto",
            minWidth: "0"
          }}>
            <input
              type="checkbox"
              checked={!!activeModes?.mc4}
              onChange={() => onToggleMode("mc4")}
              style={{ width: "14px", height: "14px", accentColor: "#3b82f6", cursor: "pointer" }}
            />
            MC4
          </label>

          <div style={statBoxStyle}>
            <span style={{ color: headerTextColor }}>∑:</span>
            <span>{mc4Total}</span>
          </div>
          <div style={statBoxStyle}>
            <span style={{ color: headerTextColor }}>Done:</span>
            <span style={{ color: "#16a34a" }}>{mc4Completed} ({mc4Percent}%)</span>
          </div>
          <div style={statBoxStyle}>
            <span style={{ color: headerTextColor }}>Remaining:</span>
            <span style={{ color: "#dc2626" }}>{mc4Remaining}</span>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
