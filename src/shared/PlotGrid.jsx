// ── PlotGrid.jsx — Q1 Coordinate Grid (0–10 × 0–10) ─────────
// Props:
//   answer      : [x,y] | null   — correct answer (shown in review mode)
//   placed      : [x,y] | null   — student's placed point
//   onPlace     : fn([x,y])      — called when student taps/clicks a grid point
//   revealed    : bool           — show correct answer overlay (practice feedback)
//   readOnly    : bool           — no interaction (results view)
//   size        : number         — pixel size of the grid area (default 300)

import { useRef } from "react";

const TICKS  = 11;   // 0–10 inclusive
const LABELS = [0,1,2,3,4,5,6,7,8,9,10];

export default function PlotGrid({
  answer   = null,
  placed   = null,
  onPlace  = null,
  revealed = false,
  readOnly = false,
  size     = 300,
}) {
  const svgRef = useRef();

  // Layout constants derived from size
  const PAD_L  = 36;   // left padding for y-axis labels
  const PAD_B  = 30;   // bottom padding for x-axis labels
  const PAD_T  = 12;   // top padding
  const PAD_R  = 12;   // right padding
  const W      = size;
  const H      = size;
  const GRID_W = W - PAD_L - PAD_R;
  const GRID_H = H - PAD_T - PAD_B;
  const STEP   = GRID_W / 10;   // pixels per unit

  function gridToSvg(gx, gy) {
    return {
      x: PAD_L + gx * STEP,
      y: PAD_T + (10 - gy) * STEP,
    };
  }

  function svgToGrid(sx, sy) {
    const gx = Math.round((sx - PAD_L) / STEP);
    const gy = Math.round(10 - (sy - PAD_T) / STEP);
    return [
      Math.max(0, Math.min(10, gx)),
      Math.max(0, Math.min(10, gy)),
    ];
  }

  function handleClick(e) {
    if (readOnly || !onPlace) return;
    const svg  = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top)  * scaleY;
    const [gx, gy] = svgToGrid(sx, sy);
    if (gx < 0 || gx > 10 || gy < 0 || gy > 10) return;
    onPlace([gx, gy]);
  }

  // Determine point states
  const isCorrect = placed && answer && placed[0] === answer[0] && placed[1] === answer[1];

  return (
    <div style={{ display: "inline-block", userSelect: "none" }}>
      <svg
        ref={svgRef}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        onClick={handleClick}
        style={{
          cursor: readOnly ? "default" : "crosshair",
          maxWidth: "100%",
          touchAction: "none",
          display: "block",
        }}
        onTouchEnd={e => {
          if (readOnly || !onPlace) return;
          e.preventDefault();
          const t    = e.changedTouches[0];
          const svg  = svgRef.current;
          const rect = svg.getBoundingClientRect();
          const scaleX = W / rect.width;
          const scaleY = H / rect.height;
          const sx = (t.clientX - rect.left) * scaleX;
          const sy = (t.clientY - rect.top)  * scaleY;
          const [gx, gy] = svgToGrid(sx, sy);
          if (gx >= 0 && gx <= 10 && gy >= 0 && gy <= 10) onPlace([gx, gy]);
        }}
      >
        {/* Background */}
        <rect x={PAD_L} y={PAD_T} width={GRID_W} height={GRID_H} fill="#fafcff" stroke="#c8d3dd" strokeWidth="1"/>

        {/* Grid lines */}
        {LABELS.map(n => {
          const { x } = gridToSvg(n, 0);
          const { y } = gridToSvg(0, n);
          return (
            <g key={n}>
              {/* Vertical */}
              <line x1={x} y1={PAD_T} x2={x} y2={PAD_T + GRID_H}
                stroke={n === 0 ? "#888" : "#dde3e9"} strokeWidth={n === 0 ? 1.5 : 0.75}/>
              {/* Horizontal */}
              <line x1={PAD_L} y1={y} x2={PAD_L + GRID_W} y2={y}
                stroke={n === 0 ? "#888" : "#dde3e9"} strokeWidth={n === 0 ? 1.5 : 0.75}/>
            </g>
          );
        })}

        {/* Axis arrows */}
        <polygon points={`${PAD_L + GRID_W + 2},${PAD_T + GRID_H} ${PAD_L + GRID_W + 8},${PAD_T + GRID_H} ${PAD_L + GRID_W + 5},${PAD_T + GRID_H - 6}`} fill="#888"/>
        <polygon points={`${PAD_L},${PAD_T - 2} ${PAD_L},${PAD_T - 8} ${PAD_L + 6},${PAD_T - 5}`} fill="#888"/>

        {/* Axis labels */}
        {LABELS.map(n => {
          const { x } = gridToSvg(n, 0);
          const { y } = gridToSvg(0, n);
          return (
            <g key={`lbl${n}`}>
              {/* X axis */}
              <text x={x} y={PAD_T + GRID_H + 18} textAnchor="middle"
                fontSize="11" fill="#555" fontFamily="sans-serif">{n}</text>
              {/* Y axis (skip 0 on y to avoid overlap) */}
              {n > 0 && (
                <text x={PAD_L - 6} y={y + 4} textAnchor="end"
                  fontSize="11" fill="#555" fontFamily="sans-serif">{n}</text>
              )}
            </g>
          );
        })}

        {/* X axis label */}
        <text x={PAD_L + GRID_W / 2} y={H - 2} textAnchor="middle"
          fontSize="11" fill="#888" fontFamily="sans-serif" fontStyle="italic">x</text>
        {/* Y axis label */}
        <text x={8} y={PAD_T + GRID_H / 2} textAnchor="middle"
          fontSize="11" fill="#888" fontFamily="sans-serif" fontStyle="italic"
          transform={`rotate(-90, 8, ${PAD_T + GRID_H / 2})`}>y</text>

        {/* Snap target dots (subtle) — only shown when interactive */}
        {!readOnly && LABELS.map(gx =>
          LABELS.map(gy => {
            const p = gridToSvg(gx, gy);
            return (
              <circle key={`${gx},${gy}`} cx={p.x} cy={p.y} r="3"
                fill="transparent" stroke="#b3cde8" strokeWidth="0.5"/>
            );
          })
        )}

        {/* Correct answer point (shown when revealed) */}
        {revealed && answer && (() => {
          const p = gridToSvg(answer[0], answer[1]);
          return (
            <g>
              <circle cx={p.x} cy={p.y} r="10" fill="#1a6e2e" opacity="0.18"/>
              <circle cx={p.x} cy={p.y} r="6"  fill="#1a6e2e"/>
              <text x={p.x + 10} y={p.y - 8} fontSize="10" fill="#1a6e2e" fontWeight="bold" fontFamily="sans-serif">
                ({answer[0]}, {answer[1]})
              </text>
            </g>
          );
        })()}

        {/* Student's placed point */}
        {placed && (() => {
          const p = gridToSvg(placed[0], placed[1]);
          const color = !revealed ? "#003865"
                      : isCorrect ? "#1a6e2e"
                      : "#8b1a1a";
          return (
            <g>
              <circle cx={p.x} cy={p.y} r="10" fill={color} opacity="0.15"/>
              <circle cx={p.x} cy={p.y} r="6"  fill={color} stroke="#fff" strokeWidth="1.5"/>
              {/* Crosshair lines */}
              <line x1={p.x - 12} y1={p.y} x2={p.x + 12} y2={p.y} stroke={color} strokeWidth="1" opacity="0.5"/>
              <line x1={p.x} y1={p.y - 12} x2={p.x} y2={p.y + 12} stroke={color} strokeWidth="1" opacity="0.5"/>
              {/* Only show coordinates after submission, not while answering */}
              {(revealed || readOnly) && (
                <text x={p.x + 10} y={p.y - 8} fontSize="10" fill={color} fontWeight="bold" fontFamily="sans-serif">
                  ({placed[0]}, {placed[1]})
                </text>
              )}
            </g>
          );
        })()}
      </svg>

      {/* Status label below grid */}
      {!readOnly && (
        <div style={{ fontSize: "0.72rem", color: "#888", marginTop: "4px", textAlign: "center" }}>
          {placed
            ? "Point placed — tap another point to move it"
            : "Tap or click a grid point to place your answer"}
        </div>
      )}
    </div>
  );
}
