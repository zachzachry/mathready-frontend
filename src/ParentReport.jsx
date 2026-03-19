/**
 * ParentReport — printable fluency progress report for a single student.
 * Opened as a modal from the Dashboard Drills tab.
 *
 * Props
 *   studentId  {string}   student ID to fetch report for
 *   onClose    {function} close the modal
 */
import React, { useEffect, useState } from "react";
import { API, T } from "./shared/constants";

/* ── helpers ──────────────────────────────────────────────────── */
const OP_LABELS = {
  add: { label: "Addition",       icon: "➕" },
  sub: { label: "Subtraction",    icon: "➖" },
  mul: { label: "Multiplication", icon: "✖️" },
  div: { label: "Division",       icon: "➗" },
};

function AccBar({ pct, color }) {
  return (
    <div style={{ flex: 1, background: T.surfaceAlt, borderRadius: 99, height: 10, overflow: "hidden" }}>
      <div style={{
        width: `${pct ?? 0}%`, height: "100%",
        background: color, borderRadius: 99,
        transition: "width 0.6s ease",
      }} />
    </div>
  );
}

function opColor(pct) {
  if (pct === null || pct === undefined) return T.textMuted;
  if (pct >= 85) return T.success;
  if (pct >= 65) return T.warning;
  return T.danger;
}

function trendLabel(trend) {
  if (trend === "improving") return { icon: "📈", text: "Improving", color: T.success };
  if (trend === "declining") return { icon: "📉", text: "Needs attention", color: T.danger };
  return { icon: "➡️", text: "Steady", color: T.textSecondary };
}

function StarRow({ count }) {
  return (
    <span>
      {[1,2,3,4,5].map(n => (
        <span key={n} style={{ fontSize: "1rem", opacity: n <= count ? 1 : 0.2 }}>⭐</span>
      ))}
    </span>
  );
}

/* ── mini accuracy bar chart for recent sessions ─────────────── */
function SessionChart({ sessions }) {
  if (!sessions || sessions.length === 0) return null;
  const maxH = 56;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: maxH + 20 }}>
      {sessions.map((s, i) => {
        const h = Math.max(4, Math.round((s.pct / 100) * maxH));
        const c = s.pct >= 85 ? T.success : s.pct >= 65 ? T.warning : T.danger;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ fontSize: "0.55rem", color: T.textMuted, fontWeight: 700 }}>{s.pct}%</div>
            <div title={s.submitted} style={{
              width: 18, height: h, background: c, borderRadius: "3px 3px 0 0",
              transition: "height 0.4s ease",
            }} />
            <div style={{ fontSize: "0.5rem", color: T.textMuted }}>
              {s.stars ? "⭐".repeat(s.stars) : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── print styles injected once ──────────────────────────────── */
(function injectPrintStyles() {
  if (document.getElementById("parent-report-print")) return;
  const s = document.createElement("style");
  s.id = "parent-report-print";
  s.textContent = `
    @media print {
      body > *:not(#parent-report-root) { display: none !important; }
      #parent-report-root { position: static !important; }
      .report-no-print { display: none !important; }
      .report-card { box-shadow: none !important; max-width: 100% !important; }
    }
  `;
  document.head.appendChild(s);
})();

/* ── main component ──────────────────────────────────────────── */
export default function ParentReport({ studentId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    fetch(`${API}/fluency/report/${studentId}`)
      .then(r => { if (!r.ok) throw new Error("No data found"); return r.json(); })
      .then(d  => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [studentId]);

  /* ── backdrop ─────────────────────────────────────────────── */
  return (
    <div
      id="parent-report-root"
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(15,23,42,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        className="report-card"
        style={{
          background: "#fff", borderRadius: 16,
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          width: "100%", maxWidth: 680,
          maxHeight: "92vh", overflowY: "auto",
          fontFamily: T.font,
        }}
      >
        {/* ── header bar ─────────────────────────────────────── */}
        <div style={{
          background: T.midnight, color: T.white,
          padding: "1.25rem 1.5rem",
          borderRadius: "16px 16px 0 0",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        }}>
          <div>
            <div style={{ fontSize: "0.65rem", letterSpacing: "0.14em", color: T.tealMuted, fontWeight: 700, marginBottom: 4 }}>
              MATHREADY — FLUENCY PROGRESS REPORT
            </div>
            {loading
              ? <div style={{ fontSize: "1.3rem", fontWeight: 800 }}>Loading…</div>
              : error
                ? <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fca5a5" }}>Could not load report</div>
                : (
                  <>
                    <div style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.1 }}>{data.studentName}</div>
                    <div style={{ fontSize: "0.8rem", color: T.tealMuted, marginTop: 3 }}>
                      {data.className} &nbsp;·&nbsp; Generated {data.generatedOn}
                    </div>
                  </>
                )
            }
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }} className="report-no-print">
            {!loading && !error && (
              <button
                onClick={() => window.print()}
                style={{
                  background: T.teal, border: "none", borderRadius: 8,
                  color: T.white, fontWeight: 700, fontSize: "0.8rem",
                  padding: "0.5rem 1rem", cursor: "pointer",
                }}
              >
                🖨️ Print
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 8,
                color: T.white, fontWeight: 700, fontSize: "0.9rem",
                padding: "0.5rem 0.75rem", cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── body ───────────────────────────────────────────── */}
        {loading && (
          <div style={{ padding: "3rem", textAlign: "center", color: T.textMuted }}>Loading report…</div>
        )}
        {error && (
          <div style={{ padding: "3rem", textAlign: "center", color: T.danger }}>
            {error}. This student may not have any drill sessions yet.
          </div>
        )}

        {data && !loading && (
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* ── Overall summary cards ─────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
              {[
                { label: "Total Drills",      value: data.totalSessions,                 icon: "🎯" },
                { label: "Average Accuracy",  value: `${data.avgAccuracy}%`,             icon: "📊" },
                { label: "Stars Earned",      value: data.totalStars,                    icon: "⭐" },
                { label: "Practice Streak",   value: `${data.streakDays} day${data.streakDays !== 1 ? "s" : ""}`, icon: "🔥" },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{
                  background: T.surface, borderRadius: 10,
                  border: `1px solid ${T.border}`,
                  padding: "0.85rem 1rem",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "1.4rem" }}>{icon}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: T.midnight, lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: T.textMuted, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* ── Trend + speed ────────────────────────────── */}
            <div style={{
              background: T.surface, borderRadius: 10,
              border: `1px solid ${T.border}`, padding: "1rem 1.25rem",
              display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center",
            }}>
              {(() => { const t = trendLabel(data.trend); return (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: "0.58rem", letterSpacing: "0.1em", color: T.textMuted, fontWeight: 700 }}>PROGRESS TREND</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: t.color }}>{t.text}</div>
                  </div>
                </div>
              );})()}
              {data.avgPPM && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>⚡</span>
                  <div>
                    <div style={{ fontSize: "0.58rem", letterSpacing: "0.1em", color: T.textMuted, fontWeight: 700 }}>AVG SPEED</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: T.midnight }}>{data.avgPPM} problems/min</div>
                  </div>
                </div>
              )}
              {data.sessionsPerWeek !== null && data.sessionsPerWeek !== undefined && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>📅</span>
                  <div>
                    <div style={{ fontSize: "0.58rem", letterSpacing: "0.1em", color: T.textMuted, fontWeight: 700 }}>SESSIONS / WEEK</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: T.midnight }}>{data.sessionsPerWeek}×</div>
                  </div>
                </div>
              )}
              {data.personalBests?.bestAccuracy > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.3rem" }}>🏆</span>
                  <div>
                    <div style={{ fontSize: "0.58rem", letterSpacing: "0.1em", color: T.textMuted, fontWeight: 700 }}>PERSONAL BEST</div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: T.midnight }}>
                      {data.personalBests.bestAccuracy}%
                      {data.personalBests.bestPPM > 0 && <span style={{color:T.textSecondary,fontWeight:600}}> · {data.personalBests.bestPPM} p/m</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Operation breakdown ───────────────────────── */}
            <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
              <div style={{
                padding: "0.65rem 1.25rem", borderBottom: `1px solid ${T.border}`,
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: T.textSecondary,
              }}>
                SKILL BREAKDOWN
              </div>
              <div style={{ padding: "0.75rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {["add", "sub", "mul", "div"].map(op => {
                  const pct   = data.opAvgs?.[op];
                  const level = data.currentLevels?.[op] ?? 1;
                  const grade = data.gradeContext?.[op] ?? "";
                  const cfg   = OP_LABELS[op];
                  const color = opColor(pct);
                  return (
                    <div key={op}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: 5 }}>
                        <span style={{ fontSize: "0.85rem", width: 20 }}>{cfg.icon}</span>
                        <span style={{ fontWeight: 700, fontSize: "0.82rem", color: T.midnight, width: 110 }}>{cfg.label}</span>
                        <AccBar pct={pct} color={color} />
                        <span style={{ width: 38, textAlign: "right", fontWeight: 800, fontSize: "0.82rem", color: pct !== null ? color : T.textMuted }}>
                          {pct !== null && pct !== undefined ? `${pct}%` : "—"}
                        </span>
                        <span style={{
                          background: T.surfaceAlt, border: `1px solid ${T.border}`,
                          borderRadius: 6, padding: "1px 7px",
                          fontSize: "0.65rem", fontWeight: 700, color: T.textSecondary,
                          whiteSpace: "nowrap",
                        }}>
                          Level {level}
                        </span>
                      </div>
                      <div style={{ paddingLeft: 20, fontSize: "0.68rem", color: T.textMuted }}>{grade}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: "0.6rem 1.25rem", borderTop: `1px solid ${T.border}`, background: T.surfaceAlt }}>
                <div style={{ fontSize: "0.62rem", color: T.textMuted, lineHeight: 1.5 }}>
                  <strong style={{ color: T.textSecondary }}>How to read this:</strong> Accuracy % is based on all drill sessions.
                  Level (1–10) reflects how challenging the problems have become — higher is better.
                  {!Object.values(data.opAvgs ?? {}).some(v => v !== null) && (
                    <span style={{ color: T.warning, marginLeft: 4 }}>
                      Operation accuracy will populate after new drill sessions are completed.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Recent sessions chart ─────────────────────── */}
            {data.recentSessions?.length > 0 && (
              <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, overflow: "hidden" }}>
                <div style={{
                  padding: "0.65rem 1.25rem", borderBottom: `1px solid ${T.border}`,
                  fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: T.textSecondary,
                }}>
                  RECENT SESSIONS — ACCURACY HISTORY
                </div>
                <div style={{ padding: "1rem 1.25rem", display: "flex", alignItems: "flex-end", gap: "0.5rem", flexWrap: "wrap" }}>
                  <SessionChart sessions={data.recentSessions} />
                  <div style={{ fontSize: "0.62rem", color: T.textMuted, marginLeft: "auto", alignSelf: "center" }}>
                    Last {data.recentSessions.length} sessions
                  </div>
                </div>
              </div>
            )}

            {/* ── Parent message ────────────────────────────── */}
            <div style={{
              background: "#fffbeb", border: `1px solid ${T.warningBd}`,
              borderRadius: 10, padding: "1rem 1.25rem",
              fontSize: "0.78rem", color: "#78350f", lineHeight: 1.6,
            }}>
              <strong>For Parents:</strong> This report shows your child's math fact fluency practice.
              Regular drill sessions (3 minutes each) build the automatic recall needed for
              higher-level math. Aim for <strong>3–5 sessions per week</strong> for best results.
              {data.streakDays >= 3 && (
                <span> 🔥 <strong>{data.studentName}</strong> is on a <strong>{data.streakDays}-day</strong> streak — keep it going!</span>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
