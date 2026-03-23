/**
 * TestParentReport — clean, parent-friendly report based on TEST scores (not fluency drills).
 *
 * Props
 *   session      {object}   the specific test session being viewed
 *   fullStudent  {object}   { name, sessions: [...all sessions...] }
 *   stds         {array}    [[std, {correct, total}], ...] for the current session
 *   className    {string}
 *   teacherName  {string}
 *   onClose      {function}
 */
import React from "react";
import { T } from "./shared/constants";

/* ── helpers ──────────────────────────────────────────────────── */
function letterGrade(pct) {
  if (pct >= 90) return { letter: "A", color: T.success };
  if (pct >= 80) return { letter: "B", color: "#0369a1" };
  if (pct >= 70) return { letter: "C", color: T.warning };
  if (pct >= 60) return { letter: "D", color: "#ea580c" };
  return { letter: "F", color: T.dangerText };
}

function trendOf(sessions) {
  if (!sessions || sessions.length < 2) return null;
  const scores = sessions.map(s => s.pct);
  const last  = scores[scores.length - 1];
  const prior = scores.slice(0, -1).reduce((a, b) => a + b, 0) / (scores.length - 1);
  if (last > prior + 4) return { label: "Improving",        icon: "↑", color: T.success };
  if (last < prior - 4) return { label: "Needs Attention",  icon: "↓", color: T.dangerText };
  return           { label: "Steady",           icon: "→", color: T.textSecondary };
}

function actionTip(stds) {
  const weak = stds.filter(([, v]) => Math.round((v.correct / v.total) * 100) < 70);
  if (weak.length === 0) return "Your child is performing well across all tested standards. Keep encouraging daily practice and review to maintain these results.";
  const stdList = weak.map(([s]) => s).join(", ");
  return `Focus extra practice on ${stdList}. Try reviewing homework together for these topics, and ask their teacher for specific resources or practice worksheets.`;
}

function summaryLine(name, pct, sessions) {
  const trend = trendOf(sessions);
  const grade = letterGrade(pct);
  let base = `${name} scored ${pct}% (${grade.letter}) on this assessment`;
  if (!trend) return base + ".";
  if (trend.label === "Improving") return base + ` and has been showing consistent improvement across recent tests.`;
  if (trend.label === "Needs Attention") return base + `. Scores have dipped recently — this is a good time to check in with their teacher.`;
  return base + ` and is performing consistently across recent assessments.`;
}

/* ── print helper ─────────────────────────────────────────────── */
function printReport() {
  const el = document.getElementById("test-parent-report-card");
  if (!el) return;
  const clone = el.cloneNode(true);
  clone.style.cssText = "box-shadow:none;border-radius:0;border:none;margin:0 auto;max-width:100%;overflow:visible;";
  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to print."); return; }
  win.document.write(`<!DOCTYPE html>
<html><head><title>MathReady — Test Report</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#fff; }
</style>
</head><body>${clone.outerHTML}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

/* ── main component ───────────────────────────────────────────── */
export default function TestParentReport({ session, fullStudent, stds, className, teacherName, onClose }) {
  const name     = session.studentName || session.name || fullStudent?.name || "Student";
  const pct      = session.pct ?? 0;
  const score    = session.score ?? 0;
  const total    = session.total ?? 0;
  const dateStr  = session.submitted
    ? new Date(session.submitted.replace(",", "")).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const sessions  = fullStudent?.sessions || [];
  const trend     = trendOf(sessions);
  const grade     = letterGrade(pct);
  const summary   = summaryLine(name, pct, sessions);
  const tip       = actionTip(stds);

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "1rem", overflowY: "auto",
      }}
    >
      <div style={{ maxWidth: 640, width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem", padding: "1rem 0" }}>

        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff" }}>Test Score Report</div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={printReport} style={{
              background: T.teal, border: "none", borderRadius: 8,
              color: "#fff", fontWeight: 700, fontSize: "0.78rem",
              padding: "0.45rem 1rem", cursor: "pointer",
            }}>
              🖨️ Print
            </button>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
              color: "#fff", fontWeight: 700, fontSize: "0.9rem",
              padding: "0.45rem 0.75rem", cursor: "pointer",
            }}>
              ✕
            </button>
          </div>
        </div>

        {/* Report card */}
        <div id="test-parent-report-card" style={{
          background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12,
          fontFamily: T.font, overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            background: T.midnight, color: "#fff",
            padding: "1rem 1.5rem",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: "0.55rem", letterSpacing: "0.14em", color: T.tealMuted, fontWeight: 700, marginBottom: 2 }}>
                MATHREADY — TEST SCORE REPORT
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.1 }}>{name}</div>
              <div style={{ fontSize: "0.72rem", color: T.tealMuted, marginTop: 2 }}>
                {className}{teacherName ? ` · ${teacherName}` : ""} &nbsp;·&nbsp; {dateStr}
              </div>
            </div>
            {trend && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 12px",
              }}>
                <span style={{ fontSize: "1.1rem", color: trend.color }}>{trend.icon}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: trend.color }}>{trend.label}</span>
              </div>
            )}
          </div>

          <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Summary sentence */}
            <div style={{
              fontSize: "0.88rem", color: T.text, lineHeight: 1.6,
              borderLeft: `3px solid ${T.teal}`, paddingLeft: "0.75rem",
            }}>
              {summary}
            </div>

            {/* Score card */}
            <div style={{
              display: "flex", alignItems: "center", gap: "1.5rem",
              background: T.surface, borderRadius: 10, padding: "1rem 1.25rem",
              border: `1px solid ${T.border}`,
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", fontWeight: 900, lineHeight: 1, color: grade.color }}>{grade.letter}</div>
                <div style={{ fontSize: "0.6rem", color: T.textMuted, marginTop: 2 }}>GRADE</div>
              </div>
              <div style={{ width: 1, height: 48, background: T.border }} />
              <div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: grade.color }}>{pct}%</div>
                <div style={{ fontSize: "0.72rem", color: T.textSecondary }}>{score} out of {total} correct</div>
              </div>
              {sessions.length >= 2 && (
                <>
                  <div style={{ width: 1, height: 48, background: T.border }} />
                  <div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: T.textSecondary, marginBottom: 4 }}>TEST HISTORY</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                      {sessions.slice(-5).map((sess, i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 6,
                            background: sess.pct === pct && sess.submitted === session.submitted ? grade.color : (sess.pct >= 80 ? T.successBg : sess.pct >= 60 ? T.warningBg : T.dangerBg),
                            border: `1px solid ${sess.pct === pct && sess.submitted === session.submitted ? grade.color : T.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <span style={{ fontSize: "0.58rem", fontWeight: 700, color: T.text }}>{sess.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.55rem", color: T.textMuted, marginTop: 3 }}>Last {Math.min(5, sessions.length)} tests</div>
                  </div>
                </>
              )}
            </div>

            {/* Standard mastery */}
            {stds.length > 0 && (
              <div>
                <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: T.textSecondary, marginBottom: "0.5rem" }}>
                  STANDARD-BY-STANDARD BREAKDOWN
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "0.4rem" }}>
                  {stds.map(([std, v]) => {
                    const sp = Math.round((v.correct / v.total) * 100);
                    const bg  = sp >= 80 ? T.successBg  : sp >= 60 ? T.warningBg  : T.dangerBg;
                    const bd  = sp >= 80 ? T.successBd  : sp >= 60 ? T.warningBd  : T.dangerBd;
                    const col = sp >= 80 ? T.success     : sp >= 60 ? T.warning     : T.dangerText;
                    return (
                      <div key={std} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: "0.55rem 0.75rem" }}>
                        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: T.textSecondary }}>{std}</div>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: col }}>{sp}%</div>
                        <div style={{ fontSize: "0.58rem", color: T.textMuted }}>{v.correct}/{v.total} correct</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action tip */}
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
                <div style={{ fontSize: "0.78rem", color: "#78350f", lineHeight: 1.5 }}>{tip}</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ fontSize: "0.62rem", color: T.textMuted, lineHeight: 1.5, borderTop: `1px solid ${T.border}`, paddingTop: "0.6rem" }}>
              <strong style={{ color: T.textSecondary }}>About this report:</strong> Scores reflect the number of questions answered correctly on the assigned assessment.
              Standards marked below 70% may benefit from targeted review. Contact your child's teacher with any questions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
