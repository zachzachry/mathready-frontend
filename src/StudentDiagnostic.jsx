/**
 * StudentDiagnostic — teacher-facing diagnostic modal for a single student.
 * Shows: diagnosis (skill gap vs engagement), standard mastery map,
 * engagement signals, session history, recommended action.
 */
import React, { useEffect, useState } from "react";
import { API, T } from "./shared/constants";

const DIAG_CONFIG = {
  on_track:   { color: "#2e7d32", bg: "#e8f5e9", bd: "#a5d6a7", icon: "✅", label: "On Track" },
  skill_gap:  { color: "#1565c0", bg: "#e3f2fd", bd: "#90caf9", icon: "📚", label: "Skill Gap" },
  engagement: { color: "#e65100", bg: "#fff3e0", bd: "#ffcc80", icon: "💤", label: "Engagement Concern" },
  mixed:      { color: "#7b1fa2", bg: "#f3e5f5", bd: "#ce93d8", icon: "⚠️", label: "Mixed" },
  watch:      { color: "#78909c", bg: "#eceff1", bd: "#b0bec5", icon: "👁", label: "Monitor" },
  no_data:    { color: "#9e9e9e", bg: "#f5f5f5", bd: "#e0e0e0", icon: "—",  label: "No Data" },
};

function pctColor(p) {
  if (p >= 80) return T.success;
  if (p >= 60) return "#b45309";
  return "#c62828";
}

function pctBg(p) {
  if (p >= 80) return "#e8f5e9";
  if (p >= 60) return "#fffbeb";
  return "#ffebee";
}

export default function StudentDiagnostic({ studentId, studentName, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    fetch(`${API}/sessions/student/${encodeURIComponent(studentId)}/diagnosis`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [studentId]);

  const cfg = data ? (DIAG_CONFIG[data.diagnosis] || DIAG_CONFIG.watch) : DIAG_CONFIG.no_data;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
      <div style={{ background:"#fff", borderRadius:"8px", width:"100%", maxWidth:"720px", maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 12px 48px rgba(0,0,0,.3)" }}>

        {/* Header */}
        <div style={{ background:T.midnight, color:"#fff", padding:"1rem 1.25rem", display:"flex", alignItems:"center", gap:"1rem", flexShrink:0 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:"0.6rem", opacity:.6, letterSpacing:"0.14em" }}>STUDENT DIAGNOSTIC</div>
            <div style={{ fontSize:"1.05rem", fontWeight:700 }}>{studentName}</div>
          </div>
          {data && data.diagnosis !== "no_data" && (
            <div style={{ background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.bd}`, borderRadius:"4px", padding:"0.35rem 0.75rem", fontSize:"0.78rem", fontWeight:700 }}>
              {cfg.icon} {cfg.label}
            </div>
          )}
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none", color:"#fff", borderRadius:"4px", padding:"6px 12px", cursor:"pointer", fontSize:"0.8rem" }}>✕ Close</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"1.25rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
          {loading && <div style={{ textAlign:"center", color:T.textSecondary, padding:"3rem" }}>Loading diagnostic…</div>}

          {!loading && (!data || data.diagnosis === "no_data") && (
            <div style={{ textAlign:"center", color:T.textSecondary, padding:"3rem" }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>📋</div>
              <div style={{ fontWeight:600 }}>No test sessions yet</div>
              <div style={{ fontSize:"0.82rem", marginTop:"4px" }}>Diagnosis is available after the student completes at least one assigned test.</div>
            </div>
          )}

          {!loading && data && data.diagnosis !== "no_data" && (<>

            {/* Recommended action banner */}
            <div style={{ background:cfg.bg, border:`1px solid ${cfg.bd}`, borderRadius:"6px", padding:"0.85rem 1rem", display:"flex", gap:"0.75rem", alignItems:"flex-start" }}>
              <div style={{ fontSize:"1.4rem", lineHeight:1, flexShrink:0 }}>{cfg.icon}</div>
              <div>
                <div style={{ fontWeight:700, color:cfg.color, fontSize:"0.82rem", marginBottom:"3px" }}>RECOMMENDED ACTION</div>
                <div style={{ fontSize:"0.82rem", color:"#333", lineHeight:1.5 }}>{data.recommendedAction}</div>
              </div>
            </div>

            {/* Summary row */}
            <div style={{ display:"flex", gap:"0.65rem", flexWrap:"wrap" }}>
              {[
                ["Tests Taken",   data.sessionCount,                           T.midnight],
                ["Avg Score",     data.avgTestScore != null ? `${data.avgTestScore}%` : "—",  pctColor(data.avgTestScore)],
                ["Avg Fluency",   data.engagementSignals?.avgFluencyScore != null ? `${data.engagementSignals.avgFluencyScore}%` : "—", T.warning],
                ["Avg Time/Q",    data.engagementSignals?.avgTimePerQuestion != null ? `${data.engagementSignals.avgTimePerQuestion}s` : "—", T.teal],
                ["Violations",    data.engagementSignals?.totalViolations ?? 0, data.engagementSignals?.totalViolations > 3 ? T.dangerText : T.textSecondary],
              ].map(([lbl, val, color]) => (
                <div key={lbl} style={{ background:"#fff", border:`1px solid ${T.border}`, borderLeft:`3px solid ${color}`, borderRadius:T.xs, padding:"0.65rem 0.85rem", minWidth:"100px", flex:1 }}>
                  <div style={{ fontSize:"0.55rem", fontWeight:700, letterSpacing:"0.12em", color:T.textSecondary, marginBottom:"3px" }}>{lbl.toUpperCase()}</div>
                  <div style={{ fontSize:"1.3rem", fontWeight:700, color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Two-column: Skill + Engagement */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>

              {/* Skill signals */}
              <div style={{ background:"#f8faff", border:"1px solid #c7d2fe", borderRadius:"6px", padding:"0.85rem 1rem" }}>
                <div style={{ fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.12em", color:"#4338ca", marginBottom:"0.6rem" }}>📚 SKILL SIGNALS</div>
                <Row label="Avg test score"      value={`${data.avgTestScore}%`}                    warn={data.avgTestScore < 60} />
                <Row label="Failure clustering"  value={`${data.skillSignals?.clusteredFailurePct ?? 0}% on top 3 standards`} warn={data.skillSignals?.clusteredFailurePct >= 60} />
                {data.skillSignals?.dokDrop != null && (
                  <Row label="DOK drop (1→3)"    value={`−${data.skillSignals.dokDrop}%`}           warn={data.skillSignals.dokDrop > 25} />
                )}
                {Object.entries(data.dokMastery || {}).sort(([a],[b])=>Number(a)-Number(b)).map(([dok, pct]) => (
                  <Row key={dok} label={`DOK ${dok}`} value={`${pct}%`} warn={pct < 60} />
                ))}
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:"#4338ca", marginTop:"0.6rem", marginBottom:"3px" }}>SKILL SCORE: {data.skillScore}/6</div>
                <div style={{ height:"6px", background:"#e0e7ff", borderRadius:"3px" }}>
                  <div style={{ width:`${Math.min(100, data.skillScore/6*100)}%`, height:"100%", background:"#4338ca", borderRadius:"3px" }}/>
                </div>
              </div>

              {/* Engagement signals */}
              <div style={{ background:"#fff8f0", border:"1px solid #ffcc80", borderRadius:"6px", padding:"0.85rem 1rem" }}>
                <div style={{ fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.12em", color:"#e65100", marginBottom:"0.6rem" }}>💤 ENGAGEMENT SIGNALS</div>
                <Row label="Avg time per question" value={data.engagementSignals?.avgTimePerQuestion != null ? `${data.engagementSignals.avgTimePerQuestion}s` : "—"} warn={(data.engagementSignals?.avgTimePerQuestion ?? 99) < 10} />
                <Row label="Fast answers (<5s)"    value={`${data.engagementSignals?.fastAnswerPct ?? 0}%`}   warn={data.engagementSignals?.fastAnswerPct > 30} />
                <Row label="Skipped questions"     value={`${data.engagementSignals?.skipPct ?? 0}%`}         warn={data.engagementSignals?.skipPct > 20} />
                <Row label="Tab switches"          value={data.engagementSignals?.totalViolations ?? 0}       warn={data.engagementSignals?.totalViolations > 3} />
                {data.engagementSignals?.fluencyTestGap != null && (
                  <Row label="Fluency vs test gap" value={`+${data.engagementSignals.fluencyTestGap}%`}       warn={data.engagementSignals.fluencyTestGap > 20} />
                )}
                <div style={{ fontSize:"0.65rem", fontWeight:700, color:"#e65100", marginTop:"0.6rem", marginBottom:"3px" }}>ENGAGEMENT SCORE: {data.engagementScore}/8</div>
                <div style={{ height:"6px", background:"#ffe0b2", borderRadius:"3px" }}>
                  <div style={{ width:`${Math.min(100, data.engagementScore/8*100)}%`, height:"100%", background:"#e65100", borderRadius:"3px" }}/>
                </div>
              </div>
            </div>

            {/* Weakest standards */}
            {data.weakestStandards?.length > 0 && (
              <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:"6px", overflow:"hidden" }}>
                <div style={{ padding:"0.6rem 1rem", background:"#f0f4f8", borderBottom:`1px solid ${T.border}`, fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.12em", color:T.textSecondary }}>
                  WEAKEST STANDARDS
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto", gap:0 }}>
                  {["Standard","Attempts","Correct","Score"].map(h => (
                    <div key={h} style={{ padding:"0.35rem 0.75rem", fontSize:"0.6rem", fontWeight:700, color:T.textSecondary, borderBottom:`1px solid ${T.border}` }}>{h}</div>
                  ))}
                  {data.weakestStandards.map(s => (
                    <React.Fragment key={s.standard}>
                      <div style={{ padding:"0.45rem 0.75rem", fontSize:"0.78rem", fontWeight:600, borderBottom:`1px solid ${T.surfaceAlt}` }}>{s.standard}</div>
                      <div style={{ padding:"0.45rem 0.75rem", textAlign:"center", fontSize:"0.78rem", color:T.textSecondary, borderBottom:`1px solid ${T.surfaceAlt}` }}>{s.attempts}</div>
                      <div style={{ padding:"0.45rem 0.75rem", textAlign:"center", fontSize:"0.78rem", color:T.textSecondary, borderBottom:`1px solid ${T.surfaceAlt}` }}>{s.correct}</div>
                      <div style={{ padding:"0.45rem 0.75rem", textAlign:"center", fontSize:"0.78rem", fontWeight:700, color:pctColor(s.pct), background:pctBg(s.pct), borderBottom:`1px solid ${T.surfaceAlt}` }}>{s.pct}%</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Fluency levels */}
            {data.fluencyLevels && (
              <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:"6px", padding:"0.75rem 1rem" }}>
                <div style={{ fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.12em", color:T.textSecondary, marginBottom:"0.6rem" }}>FLUENCY LEVELS</div>
                <div style={{ display:"flex", gap:"0.75rem" }}>
                  {[["Add",data.fluencyLevels.add],["Sub",data.fluencyLevels.sub],["Mul",data.fluencyLevels.mul],["Div",data.fluencyLevels.div]].map(([op, lv]) => (
                    <div key={op} style={{ flex:1, textAlign:"center", background: lv>=8?"#e8f5e9":lv>=5?"#fffbeb":"#f5f5f5", border:`1px solid ${lv>=8?"#a5d6a7":lv>=5?"#ffd54f":"#ddd"}`, borderRadius:"4px", padding:"0.5rem" }}>
                      <div style={{ fontSize:"0.6rem", color:T.textSecondary, fontWeight:600 }}>{op}</div>
                      <div style={{ fontSize:"1.4rem", fontWeight:700, color:lv>=8?T.success:lv>=5?T.warning:T.textMuted }}>L{lv}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Session history */}
            {data.sessions?.length > 0 && (
              <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:"6px", overflow:"hidden" }}>
                <div style={{ padding:"0.6rem 1rem", background:"#f0f4f8", borderBottom:`1px solid ${T.border}`, fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.12em", color:T.textSecondary }}>
                  TEST HISTORY
                </div>
                {[...data.sessions].reverse().map((s, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.5rem 1rem", borderBottom:`1px solid ${T.surfaceAlt}`, fontSize:"0.78rem" }}>
                    <div style={{ flex:1, fontWeight:600 }}>{s.testTitle || s.testCode || "Test"}</div>
                    <div style={{ color:T.textSecondary, fontSize:"0.68rem" }}>{s.submitted}</div>
                    <div style={{ color:T.textSecondary, fontSize:"0.68rem" }}>{s.timeUsed}</div>
                    {s.violations > 0 && <div style={{ color:T.dangerText, fontSize:"0.65rem", fontWeight:700 }}>⚠ {s.violations} switches</div>}
                    <div style={{ fontWeight:700, minWidth:"40px", textAlign:"right", color:pctColor(s.pct) }}>{s.pct}%</div>
                  </div>
                ))}
              </div>
            )}

          </>)}
        </div>
      </div>
    </div>
  );
}

// ── small helper row ──────────────────────────────────────────
function Row({ label, value, warn }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"3px 0", borderBottom:"1px solid rgba(0,0,0,.05)", fontSize:"0.72rem" }}>
      <span style={{ color:T.textSecondary }}>{label}</span>
      <span style={{ fontWeight:700, color: warn ? T.dangerText : T.text }}>{value}{warn ? " ⚠" : ""}</span>
    </div>
  );
}
