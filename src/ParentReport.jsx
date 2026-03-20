/**
 * ParentReport — clean, parent-friendly fluency progress report.
 * Answers 3 questions: Is my kid on track? What to work on? Are they practicing enough?
 *
 * Props
 *   studentId  {string}            single student ID (for individual report)
 *   classId    {string}            class ID (for batch report — all students)
 *   onClose    {function}          close the modal
 */
import React, { useEffect, useState } from "react";
import { API, T } from "./shared/constants";

/* ── helpers ──────────────────────────────────────────────────── */
const OP_LABELS = { add: "Addition", sub: "Subtraction", mul: "Multiplication", div: "Division" };

function statusOf(level, pct) {
  if (level === undefined || level === null || (level <= 1 && (pct === null || pct === undefined)))
    return { label: "Not Started", color: T.textMuted, bg: T.surfaceAlt, icon: "○" };
  if (level >= 10) return { label: "Mastered", color: T.success, bg: "#ecfdf5", icon: "✅" };
  if (level >= 7)  return { label: "Almost There", color: "#0369a1", bg: "#eff6ff", icon: "🔵" };
  if (level >= 4)  return { label: "Developing", color: "#b45309", bg: "#fffbeb", icon: "🔶" };
  return { label: "Building Foundation", color: T.textSecondary, bg: T.surface, icon: "⚪" };
}

function trendIcon(trend) {
  if (trend === "improving") return { icon: "↑", text: "Improving", color: T.success };
  if (trend === "declining") return { icon: "↓", text: "Needs Attention", color: T.dangerText };
  return { icon: "→", text: "Steady", color: T.textSecondary };
}

function summaryLine(data) {
  const levels = data.currentLevels || {};
  const ops = data.opAvgs || {};
  const practiced = Object.entries(levels).filter(([k]) => ops[k] !== null && ops[k] !== undefined);
  if (practiced.length === 0) return "Your child has just started fluency practice. Encourage daily sessions to build momentum.";

  const mastered = practiced.filter(([, v]) => v >= 10);
  const almost = practiced.filter(([, v]) => v >= 7 && v < 10);
  const developing = practiced.filter(([, v]) => v >= 4 && v < 7);
  const early = practiced.filter(([, v]) => v < 4);

  const parts = [];
  if (mastered.length > 0) parts.push(`mastered ${mastered.map(([k]) => OP_LABELS[k].toLowerCase()).join(" and ")}`);
  if (almost.length > 0) parts.push(`nearly fluent in ${almost.map(([k]) => OP_LABELS[k].toLowerCase()).join(" and ")}`);
  if (developing.length > 0) parts.push(`developing ${developing.map(([k]) => OP_LABELS[k].toLowerCase()).join(" and ")}`);
  if (early.length > 0) parts.push(`building a foundation in ${early.map(([k]) => OP_LABELS[k].toLowerCase()).join(" and ")}`);

  return `${data.studentName} has ${parts.join(", and ")}.`;
}

/* ── print helper — opens a clean window with just the reports ── */
function printReports() {
  const scroll = document.querySelector("#parent-report-root .report-scroll");
  if (!scroll) return;

  const cards = scroll.querySelectorAll(".report-page");
  if (!cards.length) return;

  // Build HTML for each report card
  let cardsHtml = "";
  cards.forEach(card => {
    const clone = card.cloneNode(true);
    // Remove no-print elements
    clone.querySelectorAll(".report-no-print").forEach(el => el.remove());
    // Reset styles for print
    clone.style.cssText = "box-shadow:none;border-radius:0;border:none;margin:0 auto;max-width:100%;overflow:visible;";
    cardsHtml += clone.outerHTML;
  });

  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to print reports."); return; }

  win.document.write(`<!DOCTYPE html>
<html><head><title>MathReady — Fluency Reports</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; }
  .report-page { page-break-inside: avoid; }
  .report-page + .report-page { page-break-before: always; }
</style>
</head><body>${cardsHtml}</body></html>`);
  win.document.close();
  // Wait for content to render then print
  setTimeout(() => { win.print(); }, 400);
}

/* ── Week dots (7 circles, filled = practiced) ──────────────── */
function WeekDots({ days }) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {labels.map((lbl, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{
            width: 20, height: 20, borderRadius: "50%",
            background: i < days ? T.teal : T.surfaceAlt,
            border: `2px solid ${i < days ? T.teal : T.border}`,
          }} />
          <span style={{ fontSize: "0.5rem", color: T.textMuted, fontWeight: 600 }}>{lbl}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Single report card ─────────────────────────────────────── */
function ReportCard({ data }) {
  const t = trendIcon(data.trend);
  const summary = summaryLine(data);

  return (
    <div className="report-page" style={{
      background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12,
      maxWidth: 640, width: "100%", fontFamily: T.font,
      overflow: "hidden", marginBottom: "1rem",
    }}>
      {/* Header */}
      <div style={{
        background: T.midnight, color: "#fff",
        padding: "1rem 1.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: "0.55rem", letterSpacing: "0.14em", color: T.tealMuted, fontWeight: 700, marginBottom: 2 }}>
            MATHREADY — FLUENCY REPORT
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.1 }}>{data.studentName}</div>
          <div style={{ fontSize: "0.72rem", color: T.tealMuted, marginTop: 2 }}>
            {data.className} &nbsp;·&nbsp; {data.generatedOn}
          </div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px",
        }}>
          <span style={{ fontSize: "1.1rem", color: t.color }}>{t.icon}</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: t.color }}>{t.text}</span>
        </div>
      </div>

      <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Summary sentence */}
        <div style={{
          fontSize: "0.88rem", color: T.text, lineHeight: 1.6,
          borderLeft: `3px solid ${T.teal}`, paddingLeft: "0.75rem",
        }}>
          {summary}
        </div>

        {/* Operation status grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {["add", "sub", "mul", "div"].map(op => {
            const level = data.currentLevels?.[op] ?? 1;
            const pct = data.opAvgs?.[op];
            const st = statusOf(level, pct);
            return (
              <div key={op} style={{
                background: st.bg, borderRadius: 8, padding: "0.65rem 0.85rem",
                display: "flex", alignItems: "center", gap: "0.6rem",
              }}>
                <span style={{ fontSize: "1rem" }}>{st.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: T.midnight }}>{OP_LABELS[op]}</div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 600, color: st.color }}>{st.label}</div>
                  {data.gradeContext?.[op] && pct !== null && pct !== undefined && (
                    <div style={{ fontSize: "0.58rem", color: T.textMuted, marginTop: 1 }}>Current: {data.gradeContext[op]}</div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  {pct !== null && pct !== undefined && (
                    <div style={{ fontSize: "0.8rem", fontWeight: 800, color: st.color }}>{pct}%</div>
                  )}
                  {pct !== null && pct !== undefined && (
                    <div style={{ fontSize: "0.55rem", color: T.textMuted }}>Level {level}/10</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Practice consistency */}
        <div style={{
          background: T.surface, borderRadius: 10, padding: "0.85rem 1rem",
          border: `1px solid ${T.border}`,
        }}>
          <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: T.textSecondary, marginBottom: "0.5rem" }}>
            PRACTICE THIS WEEK
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <WeekDots days={data.daysThisWeek ?? 0} />
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: "1.3rem", fontWeight: 800,
                color: (data.daysThisWeek ?? 0) >= 5 ? T.success : (data.daysThisWeek ?? 0) >= 3 ? T.warning : T.dangerText,
              }}>
                {data.daysThisWeek ?? 0} of 7 days
              </div>
              <div style={{ fontSize: "0.62rem", color: T.textMuted }}>
                {data.totalSessions} total sessions &nbsp;·&nbsp; {data.streakDays > 1 ? `${data.streakDays}-day streak` : "No active streak"}
              </div>
            </div>
          </div>
        </div>

        {/* Action item */}
        {data.actionItem && (
          <div style={{
            background: "#fffbeb", border: `1px solid ${T.warningBd}`,
            borderRadius: 10, padding: "0.85rem 1rem",
            display: "flex", gap: "0.6rem", alignItems: "flex-start",
          }}>
            <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>💡</span>
            <div>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "#92400e", marginBottom: 2 }}>
                HOW TO HELP AT HOME
              </div>
              <div style={{ fontSize: "0.78rem", color: "#78350f", lineHeight: 1.5 }}>
                {data.actionItem}
              </div>
            </div>
          </div>
        )}

        {/* Research note */}
        <div style={{ fontSize: "0.62rem", color: T.textMuted, lineHeight: 1.5, borderTop: `1px solid ${T.border}`, paddingTop: "0.6rem" }}>
          <strong style={{ color: T.textSecondary }}>About this report:</strong> Each drill is 3 minutes.
          Research shows daily practice is the most effective way to build automatic recall of math facts.
          Aim for 5–7 sessions per week for best results.
        </div>
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────── */
export default function ParentReport({ studentId, classId, onClose }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId && !classId) return;
    setLoading(true);
    setError(null);

    if (classId) {
      // Batch mode — fetch all reports for a class
      fetch(`${API}/fluency/report/class/${classId}`)
        .then(r => { if (!r.ok) throw new Error("No data found"); return r.json(); })
        .then(d => { setReports(d.reports || []); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });
    } else {
      // Single student
      fetch(`${API}/fluency/report/${studentId}`)
        .then(r => { if (!r.ok) throw new Error("No data found"); return r.json(); })
        .then(d => { setReports([d]); setLoading(false); })
        .catch(e => { setError(e.message); setLoading(false); });
    }
  }, [studentId, classId]);

  return (
    <div
      id="parent-report-root"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div className="report-scroll" style={{
        maxHeight: "94vh", overflowY: "auto",
        display: "flex", flexDirection: "column", alignItems: "center",
        width: "100%", padding: "1rem 0",
      }}>
        {/* Controls bar */}
        <div className="report-no-print" style={{
          maxWidth: 640, width: "100%", marginBottom: "0.75rem",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>
            {loading ? "Loading…" : `${reports.length} report${reports.length !== 1 ? "s" : ""}`}
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {!loading && reports.length > 0 && (
              <button
                onClick={() => printReports()}
                style={{
                  background: T.teal, border: "none", borderRadius: 8,
                  color: "#fff", fontWeight: 700, fontSize: "0.78rem",
                  padding: "0.45rem 1rem", cursor: "pointer",
                }}
              >
                🖨️ Print {reports.length > 1 ? `All (${reports.length})` : ""}
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
                color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                padding: "0.45rem 0.75rem", cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div style={{
            background: "#fff", borderRadius: 12, padding: "2.5rem",
            textAlign: "center", maxWidth: 640, width: "100%",
          }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>📭</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: T.textSecondary }}>No drill data found</div>
            <div style={{ fontSize: "0.78rem", color: T.textMuted, marginTop: 4 }}>
              This student hasn't completed any fluency drill sessions yet.
            </div>
          </div>
        )}

        {/* Report cards */}
        {!loading && reports.map((r, i) => <ReportCard key={r.studentId || i} data={r} />)}
      </div>
    </div>
  );
}
