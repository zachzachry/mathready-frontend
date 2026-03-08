import { useState, useEffect, useCallback } from "react";
import { API } from "./shared/constants";

const NAVY = "#003865";
const GREEN = "#1a6e2e";

function pctColor(pct) {
  if (pct === null || pct === undefined) return "#aaa";
  if (pct >= 70) return "#1a6e2e";
  if (pct >= 50) return "#b36a00";
  return "#8b1a1a";
}

function pctBg(pct) {
  if (pct === null || pct === undefined) return "#f0f4f8";
  if (pct >= 70) return "#f0faf2";
  if (pct >= 50) return "#fff8e1";
  return "#fdf2f2";
}

function ScoreBar({ pct, width = 120 }) {
  if (pct === null) return <span style={{ fontSize:"0.75rem", color:"#aaa" }}>No data</span>;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
      <div style={{ width, height:"10px", background:"#e0e7ee", borderRadius:"5px", overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:pctColor(pct), borderRadius:"5px", transition:"width 0.4s" }}/>
      </div>
      <span style={{ fontSize:"0.82rem", fontWeight:700, color:pctColor(pct), minWidth:"34px" }}>{pct}%</span>
    </div>
  );
}

// ── Class card ─────────────────────────────────────────────
function ClassCard({ cls, onSelect, selected }) {
  const hasData = cls.sessionCount > 0;
  return (
    <div onClick={() => onSelect(cls)}
      style={{ background:"#fff", border:`2px solid ${selected ? NAVY : "#dde3e9"}`,
        borderRadius:"6px", padding:"1.1rem 1.25rem", cursor:"pointer",
        boxShadow: selected ? "0 2px 12px rgba(0,56,101,.12)" : "0 1px 4px rgba(0,0,0,.05)",
        transition:"border-color 0.15s" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.6rem" }}>
        <div>
          <div style={{ fontSize:"1rem", fontWeight:700, color:NAVY }}>{cls.name}</div>
          <div style={{ fontSize:"0.72rem", color:"#888", marginTop:"2px" }}>
            {cls.studentCount} student{cls.studentCount!==1?"s":""} · {cls.sessionCount} test{cls.sessionCount!==1?"s":""}
            {cls.drillCount > 0 && ` · ${cls.drillCount} drill${cls.drillCount!==1?"s":""}`}
          </div>
        </div>
        {hasData
          ? <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:"1.4rem", fontWeight:700, color:pctColor(cls.avgScore) }}>{cls.avgScore}%</div>
              <div style={{ fontSize:"0.65rem", color:"#aaa" }}>avg score</div>
            </div>
          : <div style={{ fontSize:"0.72rem", color:"#bbb", fontStyle:"italic" }}>No tests yet</div>
        }
      </div>
      {hasData && <ScoreBar pct={cls.avgScore} width={160}/>}
    </div>
  );
}

// ── Standard gap table ─────────────────────────────────────
function GapTable({ standards, title }) {
  if (!standards?.length) return (
    <div style={{ color:"#aaa", fontSize:"0.82rem", padding:"1rem 0" }}>No data yet.</div>
  );
  return (
    <div>
      {title && <div style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", color:"#555", marginBottom:"8px" }}>{title}</div>}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem" }}>
        {standards.map(s => (
          <div key={s.standard} style={{ display:"flex", alignItems:"center", gap:"0.75rem",
            background:pctBg(s.pct), border:"1px solid #e0e7ee", borderRadius:"4px", padding:"0.45rem 0.75rem" }}>
            <div style={{ width:"110px", fontSize:"0.75rem", fontWeight:700, color:NAVY, flexShrink:0 }}>{s.standard}</div>
            <ScoreBar pct={s.pct} width={140}/>
            <div style={{ fontSize:"0.68rem", color:"#aaa", marginLeft:"auto" }}>{s.total} item{s.total!==1?"s":""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Class detail panel ─────────────────────────────────────
function ClassDetail({ cls, onClose }) {
  const weakest = [...(cls.standards||[])].sort((a,b)=>a.pct-b.pct).slice(0,8);
  const strongest = [...(cls.standards||[])].sort((a,b)=>b.pct-a.pct).slice(0,5);

  return (
    <div style={{ background:"#fff", borderRadius:"6px", border:"1px solid #dde3e9",
      boxShadow:"0 4px 20px rgba(0,0,0,.1)", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ background:NAVY, color:"#fff", padding:"0.9rem 1.25rem", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:"0.6rem", opacity:.65, letterSpacing:"0.14em" }}>CLASS DETAIL</div>
          <div style={{ fontSize:"1.1rem", fontWeight:700 }}>{cls.name}</div>
        </div>
        <button onClick={onClose}
          style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)",
            color:"#fff", borderRadius:"3px", padding:"4px 12px", cursor:"pointer", fontSize:"0.75rem" }}>
          ✕ Close
        </button>
      </div>

      <div style={{ padding:"1.25rem", display:"flex", flexDirection:"column", gap:"1.25rem" }}>
        {/* Stats row */}
        <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap" }}>
          {[
            { label:"Students",    value: cls.studentCount },
            { label:"Tests Taken", value: cls.sessionCount },
            { label:"Drills",      value: cls.drillCount },
            { label:"Avg Score",   value: cls.avgScore !== null ? `${cls.avgScore}%` : "—",
              color: pctColor(cls.avgScore) },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background:"#f0f4f8", borderRadius:"4px", padding:"0.65rem 1rem", minWidth:"90px", textAlign:"center" }}>
              <div style={{ fontSize:"1.3rem", fontWeight:700, color: color||NAVY }}>{value}</div>
              <div style={{ fontSize:"0.65rem", color:"#888", marginTop:"2px" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Standards */}
        {cls.standards?.length > 0 ? (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
            <div>
              <GapTable standards={weakest}  title="⚠ WEAKEST STANDARDS (reteach priority)"/>
            </div>
            <div>
              <GapTable standards={strongest} title="✓ STRONGEST STANDARDS"/>
            </div>
          </div>
        ) : (
          <div style={{ color:"#aaa", fontSize:"0.85rem" }}>No test data yet for this class.</div>
        )}
      </div>
    </div>
  );
}

// ── Main Admin Shell ───────────────────────────────────────
export default function AdminShell({ onBack }) {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [tab,      setTab]      = useState("overview"); // "overview" | "gaps"
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/admin/overview`);
      const d = await r.json();
      setData(d);
      setLastRefresh(new Date());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"sans-serif", color:"#aaa", background:"#e8edf2" }}>
      Loading school data…
    </div>
  );

  const schoolAvg = data?.classes?.length
    ? (() => {
        const withData = data.classes.filter(c => c.avgScore !== null);
        if (!withData.length) return null;
        return Math.round(withData.reduce((a,c) => a + c.avgScore, 0) / withData.length);
      })()
    : null;

  const activeClasses  = data?.classes?.filter(c => c.sessionCount > 0).length ?? 0;
  const inactiveClasses = (data?.classes?.length ?? 0) - activeClasses;

  return (
    <div style={{ minHeight:"100vh", background:"#e8edf2", fontFamily:"sans-serif", display:"flex", flexDirection:"column" }}>

      {/* Top bar */}
      <div style={{ background:NAVY, color:"#fff", padding:"0.85rem 1.5rem",
        display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:"0.6rem", opacity:.65, letterSpacing:"0.16em" }}>GEORGIA MILESTONES READINESS TRAINER</div>
          <div style={{ fontSize:"1.1rem", fontWeight:700 }}>Admin View — Grade 5 Mathematics</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          {lastRefresh && (
            <span style={{ fontSize:"0.65rem", opacity:.6 }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button onClick={load}
            style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)",
              color:"#fff", borderRadius:"3px", padding:"5px 12px", cursor:"pointer", fontSize:"0.72rem" }}>
            ↻ Refresh
          </button>
          <button onClick={onBack}
            style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)",
              color:"#fff", borderRadius:"3px", padding:"5px 12px", cursor:"pointer", fontSize:"0.75rem" }}>
            ← Sign Out
          </button>
        </div>
      </div>

      {/* School summary strip */}
      <div style={{ background:"#fff", borderBottom:"1px solid #c8d3dd", padding:"0.75rem 1.5rem",
        display:"flex", gap:"2rem", alignItems:"center", flexWrap:"wrap", flexShrink:0 }}>
        {[
          { label:"Total Students",   value: data?.totalStudents ?? "—" },
          { label:"Students Tested",  value: data?.testedStudents ?? "—",
            sub: data?.totalStudents ? `${Math.round((data.testedStudents/data.totalStudents)*100)}% of roster` : "" },
          { label:"Total Sessions",   value: data?.totalSessions ?? "—" },
          { label:"Classes Active",   value: activeClasses,
            sub: inactiveClasses > 0 ? `${inactiveClasses} not yet tested` : "All classes tested" },
          { label:"School Avg Score", value: schoolAvg !== null ? `${schoolAvg}%` : "—",
            color: pctColor(schoolAvg) },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ textAlign:"center", minWidth:"90px" }}>
            <div style={{ fontSize:"1.5rem", fontWeight:700, color: color||NAVY }}>{value}</div>
            <div style={{ fontSize:"0.65rem", color:"#888" }}>{label}</div>
            {sub && <div style={{ fontSize:"0.62rem", color:"#aaa" }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ background:"#fff", borderBottom:"2px solid #c8d3dd", padding:"0 1.5rem",
        display:"flex", gap:"0", flexShrink:0 }}>
        {[["overview","📊 Classes"], ["gaps","⚠ School-Wide Gaps"]].map(([key, label]) => (
          <button key={key} onClick={() => { setTab(key); setSelected(null); }}
            style={{ padding:"0.65rem 1.25rem", background:"none", border:"none",
              borderBottom: tab===key ? `3px solid ${NAVY}` : "3px solid transparent",
              fontWeight: tab===key ? 700 : 500, color: tab===key ? NAVY : "#888",
              cursor:"pointer", fontSize:"0.85rem" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto", padding:"1.25rem 1.5rem" }}>

        {tab === "overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"1.25rem", maxWidth:"1100px" }}>

            {/* Class grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"0.85rem" }}>
              {(data?.classes||[]).map(cls => (
                <ClassCard key={cls.id} cls={cls}
                  selected={selected?.id === cls.id}
                  onSelect={c => setSelected(selected?.id===c.id ? null : c)}/>
              ))}
              {!data?.classes?.length && (
                <div style={{ color:"#aaa", fontSize:"0.9rem", gridColumn:"1/-1", padding:"2rem 0", textAlign:"center" }}>
                  No classes in the roster yet.
                </div>
              )}
            </div>

            {/* Detail panel */}
            {selected && (
              <ClassDetail cls={selected} onClose={() => setSelected(null)}/>
            )}
          </div>
        )}

        {tab === "gaps" && (
          <div style={{ maxWidth:"700px" }}>
            <div style={{ background:"#fff", borderRadius:"6px", border:"1px solid #dde3e9",
              padding:"1.25rem", marginBottom:"1rem" }}>
              <div style={{ fontSize:"1rem", fontWeight:700, color:NAVY, marginBottom:"4px" }}>
                School-Wide Standard Gaps
              </div>
              <div style={{ fontSize:"0.78rem", color:"#888", marginBottom:"1rem" }}>
                Standards with lowest average performance across all classes. Minimum 5 responses to appear.
              </div>
              <GapTable standards={data?.schoolGaps} title="LOWEST PERFORMING STANDARDS"/>
            </div>

            {/* Per-class breakdown of gaps */}
            {(data?.classes||[]).filter(c => c.standards?.length).map(cls => (
              <div key={cls.id} style={{ background:"#fff", borderRadius:"6px", border:"1px solid #dde3e9",
                padding:"1.25rem", marginBottom:"0.85rem" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
                  <div style={{ fontWeight:700, color:NAVY }}>{cls.name}</div>
                  {cls.avgScore !== null && (
                    <span style={{ fontSize:"0.82rem", fontWeight:700, color:pctColor(cls.avgScore) }}>
                      avg {cls.avgScore}%
                    </span>
                  )}
                </div>
                <GapTable standards={[...cls.standards].sort((a,b)=>a.pct-b.pct).slice(0,6)}
                  title="WEAKEST STANDARDS"/>
              </div>
            ))}
            {!(data?.classes||[]).some(c => c.standards?.length) && (
              <div style={{ color:"#aaa", fontSize:"0.85rem", padding:"1rem 0" }}>
                No test data yet. Standards will appear here once students take tests.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
