import React, { useState, useEffect, useCallback } from "react";
import { QUESTIONS, lvl, lvlC, lvlBg, lvlBd, loadSessions, clearSessions, API, T } from "./shared/constants";
import { generateClassReport } from "./generateReport";
import ParentReport from "./ParentReport";

const ALL_TABS = [
  ["overview",  "📊 Overview",       false],
  ["items",     "📋 Item Analysis",  false],
  ["students",  "👤 Students",       false],
  ["growth",    "📈 Growth",         false],
  ["drills",    "🎯 Drills",         false],
  ["profile",   "📋 Class Profile",  false],
  ["controls",  "🎛 Test Controls",  true],  // true = hidden for readOnly
];

// ── Focus student stats panel ──────────────────────────────
function FocusStudentStats({ student, standardMasteryFn, bankQ, lvlC, lvlBg, lvlBd }) {
  const scores  = student.sessions.map(s => s.pct);
  const fsFirst = scores[0];
  const fsLast  = scores[scores.length - 1];
  const fsDelta = scores.length >= 2 ? fsLast - fsFirst : null;
  const mastery = standardMasteryFn(student.sessions);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
      <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"1.25rem 1.5rem"}}>
        <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.75rem"}}>{student.name.toUpperCase()} — SCORE TREND</div>
        <div style={{display:"flex",alignItems:"center",gap:"2rem",flexWrap:"wrap"}}>
          <LineChart points={scores} width={340} height={90}/>
          {fsDelta !== null && (
            <div style={{display:"flex",gap:"1.5rem"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.6rem",color:T.textSecondary,letterSpacing:"0.1em"}}>FIRST</div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:lvlC(fsFirst)}}>{fsFirst}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.6rem",color:T.textSecondary,letterSpacing:"0.1em"}}>LATEST</div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:lvlC(fsLast)}}>{fsLast}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.6rem",color:T.textSecondary,letterSpacing:"0.1em"}}>CHANGE</div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:fsDelta>0?T.success:fsDelta<0?T.dangerText:T.textSecondary}}>{fsDelta>0?"+":""}{fsDelta}%</div>
              </div>
            </div>
          )}
        </div>
        {/* Session history */}
        <div style={{marginTop:"1rem",display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          {student.sessions.map((s,i) => (
            <div key={i} style={{background:lvlBg(s.pct),border:`1px solid ${lvlC(s.pct)}33`,borderRadius:T.xs,padding:"0.4rem 0.65rem",textAlign:"center",minWidth:"70px"}}>
              <div style={{fontSize:"0.6rem",color:T.textSecondary}}>{s.submitted?.split(",")[0]||`Test ${i+1}`}</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:lvlC(s.pct)}}>{s.pct}%</div>
              {s.testCode&&<div style={{fontSize:"0.58rem",color:T.textMuted,fontFamily:"monospace"}}>{s.testCode}</div>}
            </div>
          ))}
        </div>
      </div>
      {/* Standard mastery grid */}
      <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"1.25rem 1.5rem"}}>
        <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.75rem"}}>STANDARD MASTERY</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
          {Object.entries(mastery).sort(([a],[b])=>a.localeCompare(b)).map(([std,v])=>{
            const p = Math.round((v.correct/v.total)*100);
            return (
              <div key={std} title={`${v.correct}/${v.total} correct`}
                style={{background:p>=80?T.successBg:p>=60?T.warningBg:T.dangerBg,border:`1px solid ${p>=80?T.successBd:p>=60?T.warningBd:T.dangerBd}`,borderRadius:T.xs,padding:"0.35rem 0.65rem",textAlign:"center",minWidth:"80px"}}>
                <div style={{fontSize:"0.6rem",fontWeight:700,color:T.textSecondary}}>{std}</div>
                <div style={{fontSize:"0.9rem",fontWeight:700,color:p>=80?T.success:p>=60?T.warning:T.dangerText}}>{p}%</div>
                <div style={{fontSize:"0.58rem",color:T.textMuted}}>{v.correct}/{v.total}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Simple SVG line chart
function LineChart({ points, width=320, height=80, color=T.midnight }) {
  if (!points || points.length < 2) return (
    <div style={{width,height,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",color:T.textMuted}}>
      Not enough data yet
    </div>
  );
  const xs = points.map((_,i) => (i / (points.length-1)) * width);
  const min = Math.min(...points); const max = Math.max(...points);
  const range = max - min || 1;
  const ys = points.map(v => height - ((v - min) / range) * (height - 8) - 4);
  const path = xs.map((x,i) => `${i===0?"M":"L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} style={{overflow:"visible"}}>
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
      {xs.map((x,i)=>(
        <circle key={i} cx={x} cy={ys[i]} r="4" fill={color} stroke="#fff" strokeWidth="1.5"/>
      ))}
    </svg>
  );
}

// ── Test Controls ─────────────────────────────────────────
function TestControls() {
  const [ctrl,       setCtrl]       = useState({ paused: false, stopped: false, extensions: {} });
  const [active,     setActive]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState("");
  const [extMsgs,    setExtMsgs]    = useState({});  // per-student flash messages

  // Poll control state + active students every 5s
  useEffect(() => {
    async function poll() {
      try {
        const [c, a] = await Promise.all([
          fetch(`${API}/test/control`).then(r=>r.json()),
          fetch(`${API}/active`).then(r=>r.json()).catch(()=>[]),
        ]);
        setCtrl(c);
        setActive(Array.isArray(a) ? a : []);
      } catch {}
      setLoading(false);
    }
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, []);

  async function send(patch) {
    setSaving(true);
    try {
      const r = await fetch(`${API}/test/control`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(patch),
      });
      const d = await r.json();
      setCtrl(d);
      setMsg(patch.paused != null
        ? (patch.paused ? "Test paused — students see a waiting screen." : "Test resumed.")
        : (patch.stopped ? "Test stopped — students prompted to submit." : "Stop cleared. Extensions reset."));
      setTimeout(() => setMsg(""), 4000);
    } catch { setMsg("Failed to update."); }
    setSaving(false);
  }

  async function grantExtension(studentName, extraSecs) {
    try {
      await fetch(`${API}/test/control/extend`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ studentName, extraSecs }),
      });
      const mins = extraSecs / 60;
      setExtMsgs(prev => ({ ...prev, [studentName]: `+${mins} min granted` }));
      setTimeout(() => setExtMsgs(prev => { const n={...prev}; delete n[studentName]; return n; }), 3000);
      // Refresh ctrl to show updated extensions
      const d = await fetch(`${API}/test/control`).then(r=>r.json());
      setCtrl(d);
    } catch {}
  }

  if (loading) return <div style={{padding:"2rem",color:T.textMuted}}>Loading…</div>;

  const extensions = ctrl.extensions || {};

  return (
    <div style={{padding:"1.25rem",maxWidth:"620px",fontFamily:T.font}}>
      <div style={{fontSize:"1rem",fontWeight:700,color:T.midnight,marginBottom:"4px"}}>Live Test Controls</div>
      <div style={{fontSize:"0.75rem",color:T.textSecondary,marginBottom:"1.5rem"}}>
        Controls apply to all students currently taking a test. Students poll every 5 seconds.
      </div>

      {msg && (
        <div style={{background:T.successBg,border:`1px solid ${T.successBd}`,borderRadius:T.xs,padding:"0.6rem 0.9rem",fontSize:"0.78rem",color:T.success,fontWeight:700,marginBottom:"1rem"}}>
          ✓ {msg}
        </div>
      )}

      {/* Pause / Resume */}
      <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"1.1rem 1.25rem",marginBottom:"0.85rem",display:"flex",alignItems:"center",gap:"1rem"}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:"0.92rem",color:T.text,marginBottom:"2px"}}>
            {ctrl.paused ? "⏸ Test is PAUSED" : "▶ Test is Running"}
          </div>
          <div style={{fontSize:"0.72rem",color:T.textSecondary}}>
            {ctrl.paused
              ? "Students see a pause screen and cannot answer questions."
              : "Students are actively working. Click Pause to freeze the test."}
          </div>
        </div>
        <button onClick={()=>send({paused:!ctrl.paused})} disabled={saving||ctrl.stopped}
          style={{background:ctrl.paused?T.success:"#b8860b",color:T.white,border:"none",borderRadius:T.xs,
            padding:"0.65rem 1.25rem",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",
            opacity:(saving||ctrl.stopped)?0.5:1,whiteSpace:"nowrap"}}>
          {ctrl.paused ? "▶ Resume" : "⏸ Pause"}
        </button>
      </div>

      {/* Stop */}
      <div style={{background:T.white,border:`1px solid ${T.dangerBd}`,borderRadius:T.r,padding:"1.1rem 1.25rem",marginBottom:"1.25rem",display:"flex",alignItems:"center",gap:"1rem"}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:"0.92rem",color:ctrl.stopped?T.dangerText:T.text,marginBottom:"2px"}}>
            {ctrl.stopped ? "🛑 Test is STOPPED" : "🛑 Stop Test"}
          </div>
          <div style={{fontSize:"0.72rem",color:T.textSecondary}}>
            {ctrl.stopped
              ? "Students are prompted to submit. Click Clear to reset for next test."
              : "Immediately prompts all students to submit their answers."}
          </div>
        </div>
        {ctrl.stopped
          ? <button onClick={()=>send({stopped:false,paused:false})} disabled={saving}
              style={{background:T.midnight,color:T.white,border:"none",borderRadius:T.xs,
                padding:"0.65rem 1.25rem",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",opacity:saving?0.5:1}}>
              Clear Stop
            </button>
          : <button onClick={()=>{ if(window.confirm("Stop the test for all students now?")) send({stopped:true,paused:false}); }}
              disabled={saving}
              style={{background:T.dangerText,color:T.white,border:"none",borderRadius:T.xs,
                padding:"0.65rem 1.25rem",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",opacity:saving?0.5:1}}>
              🛑 Stop Now
            </button>
        }
      </div>

      {/* IEP Time Extensions */}
      <div style={{marginBottom:"1.25rem"}}>
        <div style={{fontSize:"0.85rem",fontWeight:700,color:T.midnight,marginBottom:"4px"}}>⏱ Time Extensions (IEP / 504)</div>
        <div style={{fontSize:"0.72rem",color:T.textSecondary,marginBottom:"0.85rem"}}>
          Grant extra time to individual students currently taking the test. Their timer adds the extra minutes immediately.
        </div>

        {active.length === 0 ? (
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"1rem 1.25rem",fontSize:"0.8rem",color:T.textMuted,textAlign:"center"}}>
            No students are currently active. Extensions can only be granted during a live test.
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {active.map(s => {
              const totalExtra = extensions[s.name] || 0;
              const flashMsg   = extMsgs[s.name];
              return (
                <div key={s.name} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"0.75rem 1rem",display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
                  <div style={{flex:1,minWidth:"120px"}}>
                    <div style={{fontWeight:700,fontSize:"0.88rem",color:T.text}}>{s.name}</div>
                    <div style={{fontSize:"0.68rem",color:T.textSecondary}}>
                      Q{s.current_question+1} · {s.status === "active" ? <span style={{color:T.success}}>● Active</span> : <span style={{color:"#b8860b"}}>● Slow</span>}
                      {totalExtra > 0 && <span style={{color:T.midnight,marginLeft:"0.5rem",fontWeight:700}}>+{totalExtra/60} min granted</span>}
                    </div>
                  </div>
                  {flashMsg ? (
                    <div style={{background:T.successBg,border:`1px solid ${T.successBd}`,borderRadius:T.xs,padding:"4px 12px",fontSize:"0.75rem",color:T.success,fontWeight:700}}>
                      ✓ {flashMsg}
                    </div>
                  ) : (
                    <div style={{display:"flex",gap:"4px"}}>
                      {[5,10,15,30].map(mins => (
                        <button key={mins} onClick={()=>grantExtension(s.name, mins*60)}
                          style={{background:"rgba(13,148,136,.1)",border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"5px 10px",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",color:T.midnight,whiteSpace:"nowrap"}}>
                          +{mins}m
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{fontSize:"0.7rem",color:T.textMuted}}>
        Pause/stop controls affect all students school-wide. Extensions are per-student and reset when stop is cleared.
      </div>
    </div>
  );
}

export default function Dashboard({ teacher, readOnly }) {
  const TABS = ALL_TABS.filter(([,, writeOnly]) => !readOnly || !writeOnly);
  const [tab,      setTab]      = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [clearing, setClearing] = useState(false);
  const [clearModal, setClearModal] = useState(false);
  const [roster,   setRoster]   = useState([]);
  const [fluencyReport, setFluencyReport] = useState([]);
  const [leaderboard,   setLeaderboard]   = useState([]);
  const [parentReportId, setParentReportId] = useState(null); // student ID for parent report modal

  // Growth filters
  const [growthClass,   setGrowthClass]   = useState("all");
  const [growthStudent, setGrowthStudent] = useState("all");

  const [bankQ, setBankQ] = useState(QUESTIONS);

  const refresh = useCallback(async () => {
    try {
      const classFilter = teacher && teacher.classIds !== null && teacher.classIds.length > 0
        ? "?classIds="+teacher.classIds.join(",") : teacher && teacher.classIds !== null ? "?classIds=" : "";
      const [s, r, q] = await Promise.all([
        fetch(`${API}/sessions${classFilter}`).then(r=>r.json()),
        fetch(`${API}/roster${classFilter}`).then(r=>r.json()),
        fetch(`${API}/questions`).then(r=>r.json()).catch(()=>[]),
      ]);
      setSessions(Array.isArray(s) ? s : []);
      const rosterArr = Array.isArray(r) ? r : [];
      setRoster(rosterArr);
      if (Array.isArray(q) && q.length > 0) setBankQ(q);
      // Fetch fluency reports and leaderboards per class
      try {
        const reports = await Promise.all(
          rosterArr.map(c => fetch(`${API}/fluency/class/${c.id}/report`).then(r=>r.json()).catch(()=>[]))
        );
        setFluencyReport(rosterArr.map((c, i) => ({ classId: c.id, className: c.name, students: reports[i] || [] })));
        const boards = await Promise.all(
          rosterArr.map(c => fetch(`${API}/fluency/class/${c.id}/leaderboard`).then(r=>r.json()).catch(()=>[]))
        );
        setLeaderboard(rosterArr.map((c, i) => ({ classId: c.id, className: c.name, top5: boards[i] || [] })));
      } catch (e) { console.warn("Failed to load fluency reports:", e); }
    } catch { setSessions([]); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); const t=setInterval(refresh,3000); return()=>clearInterval(t); }, [refresh]);

  async function handleClearMode(mode) {
    setClearing(true); setClearModal(false);
    try {
      const url = mode === "all" ? `${API}/sessions` : `${API}/sessions?mode=${mode}`;
      await fetch(url, { method: "DELETE" });
      if (mode === "all") setSessions([]);
      else if (mode === "tests") setSessions(prev => prev.filter(s => s.mode === "drill" || s.mode === "practice"));
      else if (mode === "drills") setSessions(prev => prev.filter(s => s.mode !== "drill" && s.mode !== "practice"));
    } catch {}
    setSelected(null); setClearing(false);
  }

  // ── Split sessions by mode ──
  const testSessions  = sessions.filter(s => s.mode !== "drill");
  const drillSessions = sessions.filter(s => s.mode === "drill" || s.mode === "practice");

  // ── Overview stats (tests only) ──
  const sorted  = [...testSessions].sort((a,b)=>b.pct - a.pct);
  const sel     = testSessions.find(s => s.name===selected || s.studentName===selected);
  const avgP    = testSessions.length ? Math.round(testSessions.reduce((a,s)=>a+s.pct,0)/testSessions.length) : 0;
  const profC   = testSessions.filter(s=>s.pct>=80).length;
  const devC    = testSessions.filter(s=>s.pct>=60&&s.pct<80).length;
  const begC    = testSessions.filter(s=>s.pct<60).length;

  // ── Item analysis (use live question ids if available) ──
  const allQIds = [...new Set(testSessions.flatMap(s=>Object.keys(s.answers||{})))];
  const itemData = bankQ.map(q => {
    const correct = testSessions.filter(s=>s.answers?.[q.id]===q.correct).length;
    const attempted = testSessions.filter(s=>q.id in (s.answers||{})).length;
    return { ...q, correctCount:correct, attempted, pct: attempted ? Math.round((correct/attempted)*100) : 0 };
  }).filter(q => q.attempted > 0);

  // ── Growth: build per-student history ──
  // Group sessions by studentId (fall back to studentName)
  function studentKey(s) { return s.studentId || s.studentName || s.name || "Unknown"; }
  function studentLabel(s) { return s.studentName || s.name || "Unknown"; }
  function studentClass(s) { return s.className || ""; }

  const studentMap = {};
  testSessions.forEach(s => {
    const key = studentKey(s);
    if (!studentMap[key]) studentMap[key] = { name: studentLabel(s), className: studentClass(s), sessions: [] };
    studentMap[key].sessions.push(s);
  });
  // Sort each student's sessions by submitted date
  Object.values(studentMap).forEach(st => {
    st.sessions.sort((a,b) => new Date(a.submitted) - new Date(b.submitted));
  });

  // Standard mastery: per-student, per-standard accuracy across all sessions
  function standardMastery(studentSessions) {
    const map = {};
    studentSessions.forEach(sess => {
      Object.entries(sess.answers || {}).forEach(([qid, ans]) => {
        const q = bankQ.find(x=>x.id===qid);
        if (!q) return;
        if (!map[q.standard]) map[q.standard] = { correct:0, total:0 };
        map[q.standard].total++;
        if (ans === q.correct) map[q.standard].correct++;
      });
    });
    return map;
  }

  // ── Georgia domains ──
  const DOMAINS = [
    { key:"NR",  label:"Number & Operations",        color:T.midnight, bg:"rgba(13,148,136,.1)", standards: s => s.startsWith("5.NR") },
    { key:"PAR", label:"Patterns, Algebra & Relations", color:T.warning, bg:T.warningBg, standards: s => s.startsWith("5.PAR") },
    { key:"MDR", label:"Measurement, Data & Results", color:T.success, bg:T.successBg, standards: s => s.startsWith("5.MDR") },
    { key:"GSR", label:"Geometry & Spatial Reasoning", color:"#5b21b6", bg:"#f3f0ff", standards: s => s.startsWith("5.GSR") },
  ];

  function domainMastery(studentSessions) {
    const stdMap = standardMastery(studentSessions);
    const result = {};
    DOMAINS.forEach(d => {
      const stds = Object.entries(stdMap).filter(([std]) => d.standards(std));
      const correct = stds.reduce((a,[,v]) => a + v.correct, 0);
      const total   = stds.reduce((a,[,v]) => a + v.total,   0);
      result[d.key] = total ? Math.round((correct/total)*100) : null;
    });
    return result;
  }

  // Unique class names from sessions
  const sessionClasses = [...new Set(testSessions.map(s=>s.className||"").filter(Boolean))];
  const filteredStudents = Object.entries(studentMap).filter(([,st]) => {
    if (growthClass !== "all" && st.className !== growthClass) return false;
    return true;
  });

  const focusStudent = growthStudent !== "all" ? studentMap[growthStudent] : null;

  function renderTab() {
    if (loading) return <div style={{textAlign:"center",color:T.textMuted,paddingTop:"3rem"}}>Loading…</div>;

    if (tab === "overview") {
      if (testSessions.length === 0) return (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"3rem",textAlign:"center",color:T.textMuted,maxWidth:"600px"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>⏳</div>
          <div style={{fontSize:"1rem",fontWeight:600,color:T.textSecondary,marginBottom:"4px"}}>Waiting for students…</div>
          <div style={{fontSize:"0.82rem"}}>Scores appear automatically as students submit.</div>
        </div>
      );
      return (
        <div style={{display:"flex",flexDirection:"column",gap:"1rem",maxWidth:"860px"}}>
          <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
            {[
              ["Class Average", `${avgP}%`, lvlC(avgP)],
              ["Proficient (≥80%)", profC, T.success],
              ["Developing (60–79%)", devC, T.warning],
              ["Beginning (<60%)", begC, T.danger],
              ["Submitted", testSessions.length, T.teal],
            ].map(([lbl,val,c])=>(
              <div key={lbl} style={{background:T.white,border:`1px solid ${T.border}`,borderLeft:`3px solid ${c}`,borderRadius:T.xs,padding:"0.9rem 1.25rem",minWidth:"120px",flex:1}}>
                <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"4px"}}>{lbl.toUpperCase()}</div>
                <div style={{fontSize:"1.6rem",fontWeight:700,color:c}}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden"}}>
            <div style={{padding:"0.75rem 1rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary}}>
              TEST SCORES — {sorted.length} submitted
            </div>
            {sorted.map((s,i)=>{
              const name = s.studentName||s.name; const p=s.pct;
              return (
                <div key={i} onClick={()=>setSelected(name===selected?null:name)}
                  style={{padding:"0.7rem 1rem",borderBottom:`1px solid ${T.surfaceAlt}`,cursor:"pointer",background:name===selected?"#f0f6ff":T.white,display:"flex",alignItems:"center",gap:"0.75rem"}}>
                  <div style={{width:"28px",height:"28px",borderRadius:"50%",background:lvlBg(p),border:`2px solid ${lvlC(p)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:"0.65rem",fontWeight:700,color:lvlC(p)}}>{i+1}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.88rem",fontWeight:700,color:T.text}}>{name}</div>
                    {s.className&&<div style={{fontSize:"0.65rem",color:T.textSecondary}}>{s.className}</div>}
                  </div>
                  {s.violations > 0 && (
                    <div title={`${s.violations} testing violation${s.violations!==1?"s":""} detected`}
                      style={{background:T.dangerText,color:T.white,borderRadius:T.xs,padding:"2px 7px",fontSize:"0.65rem",fontWeight:700,flexShrink:0}}>
                      ⚠ {s.violations}
                    </div>
                  )}
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"1rem",fontWeight:700,color:lvlC(p)}}>{p}%</div>
                    <div style={{fontSize:"0.65rem",color:T.textSecondary}}>{s.score}/{s.total} · {s.timeUsed}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {sel && (
            <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"1rem 1.25rem"}}>
              <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.75rem"}}>{(sel.studentName||sel.name).toUpperCase()} — ITEM DETAIL</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                {Object.entries(sel.answers||{}).map(([qid,ans])=>{
                  const q = bankQ.find(x=>x.id===qid);
                  const ok = q && ans===q.correct;
                  return <div key={qid} title={q?.standard||qid}
                    style={{width:"28px",height:"28px",borderRadius:T.xs,background:ok?T.success:T.dangerText,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:T.white,fontSize:"0.7rem",fontWeight:700}}>{ok?"✓":"✗"}</span>
                  </div>;
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (tab === "items") {
      if (itemData.length === 0) return (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"3rem",textAlign:"center",color:T.textMuted,maxWidth:"600px"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📋</div>
          <div style={{fontSize:"1rem",fontWeight:600,color:T.textSecondary}}>No item data yet</div>
          <div style={{fontSize:"0.82rem",marginTop:"4px"}}>Item analysis appears once students start submitting.</div>
        </div>
      );
      // ── DOK breakdown ──
      const dokLevels = [1, 2, 3];
      const dokData = dokLevels.map(dok => {
        const qs = itemData.filter(q => q.dok === dok);
        const correct  = qs.reduce((a, q) => a + q.correctCount, 0);
        const attempts = qs.reduce((a, q) => a + q.attempted, 0);
        const pct = attempts ? Math.round((correct / attempts) * 100) : null;
        return { dok, qs: qs.length, correct, attempts, pct };
      }).filter(d => d.attempts > 0);

      const DOK_LABELS = { 1: "Recall & Reproduction", 2: "Skills & Concepts", 3: "Strategic Thinking" };
      const DOK_COLORS = { 1: T.midnight, 2: T.warning, 3: "#5b21b6" };
      const DOK_BG     = { 1: "rgba(13,148,136,.1)", 2: T.warningBg, 3: "#f3f0ff" };

      return (
        <div style={{maxWidth:"860px",display:"flex",flexDirection:"column",gap:"0.85rem"}}>

          {/* DOK Summary Cards */}
          {dokData.length > 0 && (
            <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden"}}>
              <div style={{padding:"0.75rem 1rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary}}>
                DOK PERFORMANCE BREAKDOWN
              </div>
              <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
                {dokData.map((d, i) => (
                  <div key={d.dok} style={{flex:1,minWidth:"160px",padding:"1rem 1.25rem",borderRight:i<dokData.length-1?`1px solid ${T.border}`:"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.5rem"}}>
                      <span style={{background:DOK_BG[d.dok],border:`1px solid ${DOK_COLORS[d.dok]}44`,borderRadius:T.xs,padding:"2px 8px",fontSize:"0.65rem",fontWeight:700,color:DOK_COLORS[d.dok]}}>
                        DOK {d.dok}
                      </span>
                      <span style={{fontSize:"0.72rem",color:T.textSecondary}}>{DOK_LABELS[d.dok]}</span>
                    </div>
                    <div style={{fontSize:"2rem",fontWeight:700,color:d.pct>=70?T.success:d.pct>=50?"#b8860b":T.dangerText,lineHeight:1}}>
                      {d.pct}%
                    </div>
                    <div style={{height:"6px",background:"#e8edf2",borderRadius:T.xs,margin:"0.4rem 0",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${d.pct}%`,background:d.pct>=70?T.success:d.pct>=50?"#f59e0b":T.dangerText,borderRadius:T.xs,transition:"width .4s"}}/>
                    </div>
                    <div style={{fontSize:"0.68rem",color:T.textSecondary}}>{d.correct}/{d.attempts} correct · {d.qs} question{d.qs!==1?"s":""}</div>
                  </div>
                ))}
              </div>
              {dokData.length >= 2 && (() => {
                const sorted = [...dokData].sort((a,b) => a.pct - b.pct);
                const weakest = sorted[0];
                const strongest = sorted[sorted.length-1];
                return (
                  <div style={{padding:"0.6rem 1.25rem",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.72rem",color:T.textSecondary}}>
                      💡 <strong>Insight:</strong> Students perform best on DOK {strongest.dok} ({strongest.pct}%) and struggle most on DOK {weakest.dok} ({weakest.pct}%).
                      {weakest.dok > 1 ? " Consider more scaffolding for higher-order thinking." : " Focus on foundational recall and fluency."}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden"}}>
            <div style={{padding:"0.75rem 1rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary}}>
              ITEM ANALYSIS — {itemData.length} questions attempted
            </div>
            {itemData.sort((a,b)=>a.pct-b.pct).map(q=>(
              <div key={q.id} style={{padding:"0.65rem 1rem",borderBottom:`1px solid ${T.surfaceAlt}`,display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <div style={{width:"36px",textAlign:"right",fontSize:"0.9rem",fontWeight:700,color:q.pct>=70?T.success:q.pct>=50?T.warning:T.dangerText,flexShrink:0}}>{q.pct}%</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:"0.35rem",marginBottom:"2px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.6rem",fontWeight:700,color:T.midnight,background:"rgba(13,148,136,.1)",padding:"1px 5px",borderRadius:"2px"}}>{q.standard}</span>
                    {q.dok&&<span style={{fontSize:"0.6rem",fontWeight:700,color:T.warning,background:"#fff3cd",padding:"1px 5px",borderRadius:"2px"}}>DOK {q.dok}</span>}
                    <span style={{fontSize:"0.6rem",color:T.textSecondary}}>{q.short}</span>
                  </div>
                  <div style={{height:"6px",background:"#e8edf2",borderRadius:T.xs,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${q.pct}%`,background:q.pct>=70?T.success:q.pct>=50?"#f59e0b":T.dangerText,borderRadius:T.xs,transition:"width .3s"}}/>
                  </div>
                </div>
                <div style={{fontSize:"0.68rem",color:T.textSecondary,flexShrink:0}}>{q.correctCount}/{q.attempted}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tab === "students") {
      if (sessions.length === 0) return (
        <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa",maxWidth:"600px"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>👤</div>
          <div style={{fontSize:"1rem",fontWeight:600,color:"#555"}}>No submissions yet</div>
        </div>
      );
      return (
        <div style={{maxWidth:"860px",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          {Object.entries(studentMap).map(([key, st])=>{
            const latest = st.sessions[st.sessions.length-1];
            const avg    = Math.round(st.sessions.reduce((a,s)=>a+s.pct,0)/st.sessions.length);
            const mastery= standardMastery(st.sessions);
            const weakStds = Object.entries(mastery).filter(([,v])=>v.total>=2&&v.correct/v.total<0.6).map(([std])=>std);
            return (
              <div key={key} style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
                <div style={{padding:"0.9rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem",borderBottom:weakStds.length?"1px solid #f0f4f8":"none"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.9rem",fontWeight:700,color:"#1a1a1a"}}>{st.name}</div>
                    {st.className&&<div style={{fontSize:"0.68rem",color:"#888"}}>{st.className}</div>}
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:"0.6rem",color:"#888",letterSpacing:"0.1em"}}>AVG</div>
                    <div style={{fontSize:"1.2rem",fontWeight:700,color:lvlC(avg)}}>{avg}%</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:"0.6rem",color:"#888",letterSpacing:"0.1em"}}>TESTS</div>
                    <div style={{fontSize:"1.2rem",fontWeight:700,color:T.midnight}}>{st.sessions.length}</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:"0.6rem",color:"#888",letterSpacing:"0.1em"}}>LATEST</div>
                    <div style={{fontSize:"1.2rem",fontWeight:700,color:lvlC(latest.pct)}}>{latest.pct}%</div>
                  </div>
                </div>
                {weakStds.length>0&&(
                  <div style={{padding:"0.6rem 1.25rem",background:"#fdf2f2",display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.6rem",fontWeight:700,color:"#8b1a1a",letterSpacing:"0.1em"}}>NEEDS RETEACH:</span>
                    {weakStds.map(std=>(
                      <span key={std} style={{fontSize:"0.65rem",fontWeight:700,color:"#8b1a1a",background:"#fee2e2",padding:"1px 6px",borderRadius:"2px",border:"1px solid #fca5a5"}}>{std}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (tab === "controls") return <TestControls/>;
    if (tab === "growth") {
      if (Object.keys(studentMap).length === 0) return (
        <div style={{maxWidth:"960px"}}>
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📈</div>
            <div style={{fontSize:"1rem",fontWeight:600,color:"#555"}}>No growth data yet</div>
            <div style={{fontSize:"0.82rem",marginTop:"4px"}}>Students need to complete tests for growth to appear.</div>
          </div>
        </div>
      );
      return (
        <div style={{maxWidth:"960px"}}>
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",padding:"0.85rem 1.25rem",marginBottom:"1rem",display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center"}}>
            <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.12em",color:"#555"}}>FILTER</div>
            <select style={{padding:"0.4rem 0.65rem",border:"1px solid #c8d3dd",borderRadius:"3px",fontSize:"0.8rem",background:"#fafbfc"}}
              value={growthClass} onChange={e=>{setGrowthClass(e.target.value);setGrowthStudent("all");}}>
              <option value="all">All Classes</option>
              {sessionClasses.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select style={{padding:"0.4rem 0.65rem",border:"1px solid #c8d3dd",borderRadius:"3px",fontSize:"0.8rem",background:"#fafbfc"}}
              value={growthStudent} onChange={e=>setGrowthStudent(e.target.value)}>
              <option value="all">All Students</option>
              {filteredStudents.map(([key,st])=><option key={key} value={key}>{st.name}</option>)}
            </select>
            {growthStudent!=="all"&&<button onClick={()=>setGrowthStudent("all")} style={{fontSize:"0.72rem",background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"4px 10px",cursor:"pointer"}}>✕ Clear</button>}
          </div>
          {focusStudent ? (
            <FocusStudentStats student={focusStudent} standardMasteryFn={standardMastery} bankQ={bankQ} lvlC={lvlC} lvlBg={lvlBg} lvlBd={lvlBd}/>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
                <div style={{padding:"0.75rem 1rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555"}}>
                  STUDENT GROWTH OVERVIEW — {filteredStudents.length} students
                </div>
                {filteredStudents.map(([key, st])=>{
                  const scores = st.sessions.map(s=>s.pct);
                  const first  = scores[0]; const last = scores[scores.length-1];
                  const delta  = scores.length>=2 ? last-first : null;
                  const avg    = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
                  return (
                    <div key={key} onClick={()=>setGrowthStudent(key)}
                      style={{padding:"0.75rem 1rem 0.75rem 1.25rem",borderBottom:"1px solid #f0f4f8",display:"flex",alignItems:"center",gap:"1rem",cursor:"pointer",background:"#fff"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#1a1a1a"}}>{st.name}</div>
                        {st.className&&<div style={{fontSize:"0.65rem",color:"#888"}}>{st.className}</div>}
                      </div>
                      <div style={{flexShrink:0}}>
                        <LineChart points={scores} width={120} height={36} color={delta>0?"#1a6e2e":delta<0?"#8b1a1a":"#888"}/>
                      </div>
                      <div style={{display:"flex",gap:"0.75rem",flexShrink:0}}>
                        <div style={{textAlign:"center",minWidth:"36px"}}>
                          <div style={{fontSize:"0.55rem",color:"#aaa"}}>AVG</div>
                          <div style={{fontSize:"0.9rem",fontWeight:700,color:lvlC(avg)}}>{avg}%</div>
                        </div>
                        {delta!==null&&(
                          <div style={{textAlign:"center",minWidth:"40px"}}>
                            <div style={{fontSize:"0.55rem",color:"#aaa"}}>ΔGROWTH</div>
                            <div style={{fontSize:"0.9rem",fontWeight:700,color:delta>0?"#1a6e2e":delta<0?"#8b1a1a":"#888"}}>{delta>0?"+":""}{delta}%</div>
                          </div>
                        )}
                        <div style={{textAlign:"center",minWidth:"28px"}}>
                          <div style={{fontSize:"0.55rem",color:"#aaa"}}>TESTS</div>
                          <div style={{fontSize:"0.9rem",fontWeight:700,color:T.midnight}}>{st.sessions.length}</div>
                        </div>
                      </div>
                      <span style={{color:"#c8d3dd",fontSize:"0.8rem"}}>▶</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (tab === "drills") {
      const hasFluency = fluencyReport.some(c => c.students.some(s => s.sessionCount > 0));
      if (drillSessions.length === 0 && !hasFluency) return (
        <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa",maxWidth:"600px"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🎯</div>
          <div style={{fontSize:"1rem",fontWeight:600,color:"#555",marginBottom:"4px"}}>No drill data yet</div>
          <div style={{fontSize:"0.82rem"}}>Drill scores appear here separately from test scores.</div>
        </div>
      );

      // ── Fluency-based stat card data ───────────────────────────────────────
      const allFluencyStudents  = fluencyReport.flatMap(c => c.students);
      const drilledStudents     = allFluencyStudents.filter(s => s.sessionCount > 0);
      const totalFluencySessions = drilledStudents.reduce((a, s) => a + s.sessionCount, 0);
      const weightedAccSum      = drilledStudents.reduce((a, s) => a + s.avgAccuracy * s.sessionCount, 0);
      const fluencyAvgAcc       = totalFluencySessions > 0
        ? Math.round(weightedAccSum / totalFluencySessions) + "%" : "—";
      const improvingCount      = drilledStudents.filter(s => s.trend === "improving").length;

      return (
        <div style={{maxWidth:"960px",display:"flex",flexDirection:"column",gap:"1rem"}}>
          {/* Summary cards — sourced from fluency_data (all students, all sessions) */}
          <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
            {[
              ["Drill Sessions",   totalFluencySessions,      T.warning],
              ["Students Drilled", drilledStudents.length,    T.teal],
              ["Avg Accuracy",     fluencyAvgAcc,             T.success],
              ["Improving",        improvingCount,            T.midnight],
            ].map(([lbl,val,c])=>(
              <div key={lbl} style={{background:T.white,border:`1px solid ${T.border}`,borderLeft:`3px solid ${c}`,borderRadius:T.xs,padding:"0.9rem 1.25rem",minWidth:"120px",flex:1}}>
                <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"4px"}}>{lbl.toUpperCase()}</div>
                <div style={{fontSize:"1.6rem",fontWeight:700,color:c}}>{val}</div>
              </div>
            ))}
          </div>

          {/* Top 5 Leaderboard per class */}
          {leaderboard.filter(c => c.top5.length > 0).map(cls => (
            <div key={cls.classId} style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
              <div style={{padding:"0.75rem 1rem",background:"#fff8e1",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#7a4e00",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <span>🏆</span> TOP 5 — {cls.className.toUpperCase()}
              </div>
              {cls.top5.map((s, i) => (
                <div key={i} style={{padding:"0.55rem 1rem",borderBottom:"1px solid #f0f4f8",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                  <div style={{width:"22px",textAlign:"center",fontWeight:800,fontSize:"0.85rem",color:i===0?"#ffd700":i===1?"#aaa":i===2?"#cd7f32":"#888"}}>
                    {i < 3 ? ["🥇","🥈","🥉"][i] : `${i+1}`}
                  </div>
                  <div style={{flex:1,fontSize:"0.82rem",fontWeight:600,color:"#1a1a1a"}}>{s.studentName}</div>
                  <div style={{fontSize:"0.72rem",color:"#888"}}>{s.sessionCount} drill{s.sessionCount!==1?"s":""}</div>
                  <div style={{fontWeight:700,fontSize:"0.88rem",color:"#1a6e2e",minWidth:"44px",textAlign:"right"}}>{s.bestAccuracy}%</div>
                </div>
              ))}
            </div>
          ))}

          {/* Fluency Levels per class */}
          {fluencyReport.filter(c => c.students.some(s => s.sessionCount > 0)).map(cls => (
            <div key={cls.classId} style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
              <div style={{padding:"0.75rem 1rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555"}}>
                FLUENCY LEVELS — {cls.className.toUpperCase()}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr repeat(4,60px) 55px 60px 55px 52px",gap:0,fontSize:"0.68rem"}}>
                <div style={{padding:"0.5rem 0.75rem",fontWeight:700,color:"#555",borderBottom:"2px solid #dde3e9"}}>Student</div>
                {["Add","Sub","Mul","Div"].map(op=>(
                  <div key={op} style={{padding:"0.5rem 0.25rem",fontWeight:700,color:"#555",textAlign:"center",borderBottom:"2px solid #dde3e9"}}>{op}</div>
                ))}
                <div style={{padding:"0.5rem 0.25rem",fontWeight:700,color:"#555",textAlign:"center",borderBottom:"2px solid #dde3e9"}}>Drills</div>
                <div style={{padding:"0.5rem 0.25rem",fontWeight:700,color:"#555",textAlign:"center",borderBottom:"2px solid #dde3e9"}}>Avg %</div>
                <div style={{padding:"0.5rem 0.25rem",fontWeight:700,color:"#555",textAlign:"center",borderBottom:"2px solid #dde3e9"}}>Trend</div>
                <div style={{padding:"0.5rem 0.25rem",fontWeight:700,color:"#555",textAlign:"center",borderBottom:"2px solid #dde3e9"}}>Report</div>
                {cls.students.filter(s => s.sessionCount > 0).map(s => (
                  <React.Fragment key={s.student.id}>
                    <div style={{padding:"0.45rem 0.75rem",borderBottom:"1px solid #f0f4f8",fontWeight:600,color:"#1a1a1a"}}>{s.student.name}</div>
                    {["add","sub","mul","div"].map(op=>(
                      <div key={op} style={{padding:"0.45rem 0.25rem",textAlign:"center",borderBottom:"1px solid #f0f4f8",fontWeight:700,
                        color:s.levels[op]>=8?"#1a6e2e":s.levels[op]>=5?"#7a4e00":"#888"}}>{s.levels[op]}</div>
                    ))}
                    <div style={{padding:"0.45rem 0.25rem",textAlign:"center",borderBottom:"1px solid #f0f4f8",color:"#888"}}>{s.sessionCount}</div>
                    <div style={{padding:"0.45rem 0.25rem",textAlign:"center",borderBottom:"1px solid #f0f4f8",fontWeight:700,
                      color:s.avgAccuracy>=80?"#1a6e2e":s.avgAccuracy>=60?"#7a4e00":"#8b1a1a"}}>{s.avgAccuracy}%</div>
                    <div style={{padding:"0.45rem 0.25rem",textAlign:"center",borderBottom:"1px solid #f0f4f8",fontSize:"0.85rem"}}>
                      {s.trend === "improving" ? "📈" : s.trend === "declining" ? "📉" : "➡️"}
                    </div>
                    <div style={{padding:"0.3rem 0.25rem",textAlign:"center",borderBottom:"1px solid #f0f4f8"}}>
                      <button
                        onClick={() => setParentReportId(s.student.id)}
                        title="Open parent report"
                        style={{
                          background: T.tealLight, border: `1px solid ${T.tealMuted}`,
                          borderRadius: 6, padding:"2px 6px", cursor:"pointer",
                          fontSize:"0.6rem", fontWeight:700, color:T.teal,
                          whiteSpace:"nowrap",
                        }}
                      >
                        📄
                      </button>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (tab === "profile") {
      const profileStudents = Object.entries(studentMap);
      if (profileStudents.length === 0) return (
        <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa",maxWidth:"600px"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📋</div>
          <div style={{fontSize:"1rem",fontWeight:600,color:"#555",marginBottom:"4px"}}>No test data yet</div>
          <div style={{fontSize:"0.82rem"}}>Class Profile populates once students submit tests.</div>
        </div>
      );

      // Class-level domain averages
      const classDomainAvg = {};
      DOMAINS.forEach(d => {
        const vals = profileStudents.map(([,st]) => domainMastery(st.sessions)[d.key]).filter(v => v !== null);
        classDomainAvg[d.key] = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
      });

      // Per-student domain scores
      const studentDomains = profileStudents.map(([key, st]) => ({
        key, name: st.name, className: st.className,
        overall: Math.round(st.sessions.reduce((a,s)=>a+s.pct,0)/st.sessions.length),
        sessions: st.sessions.length,
        domains: domainMastery(st.sessions),
      })).sort((a,b) => b.overall - a.overall);

      // Standard-level detail — which standards are weakest class-wide
      const allStdMap = {};
      testSessions.forEach(sess => {
        Object.entries(sess.answers || {}).forEach(([qid, ans]) => {
          const q = bankQ.find(x=>x.id===qid);
          if (!q) return;
          if (!allStdMap[q.standard]) allStdMap[q.standard] = { std: q.standard, short: q.short||q.standard, correct:0, total:0 };
          allStdMap[q.standard].total++;
          if (ans === q.correct) allStdMap[q.standard].correct++;
        });
      });
      const stdRows = Object.values(allStdMap)
        .map(r => ({...r, pct: Math.round((r.correct/r.total)*100)}))
        .sort((a,b) => a.pct - b.pct);
      const weakest = stdRows.slice(0, 5);
      const strongest = [...stdRows].sort((a,b)=>b.pct-a.pct).slice(0,5);

      const DomainBar = ({pct: p, color, bg}) => (
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem",width:"100%"}}>
          <div style={{flex:1,height:"12px",background:"#f0f4f8",borderRadius:"6px",overflow:"hidden"}}>
            <div style={{width:`${p||0}%`,height:"100%",background:color,borderRadius:"6px",transition:"width .5s"}}/>
          </div>
          <div style={{width:"36px",textAlign:"right",fontSize:"0.78rem",fontWeight:700,color:p===null?"#aaa":lvlC(p),flexShrink:0}}>
            {p===null?"—":`${p}%`}
          </div>
        </div>
      );

      return (
        <div style={{maxWidth:"1060px",display:"flex",flexDirection:"column",gap:"1.25rem"}}>

          {/* Class domain summary */}
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
            <div style={{padding:"0.75rem 1.25rem",background:T.midnight,color:"#fff",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em"}}>
              CLASS PROFILE — DOMAIN AVERAGES · {profileStudents.length} students · {testSessions.length} test sessions
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"1px",background:"#e8edf2"}}>
              {DOMAINS.map(d => {
                const p = classDomainAvg[d.key];
                return (
                  <div key={d.key} style={{background:"#fff",padding:"1rem 1.25rem"}}>
                    <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.12em",color:d.color,marginBottom:"6px"}}>{d.label.toUpperCase()}</div>
                    <div style={{fontSize:"2rem",fontWeight:700,color:p===null?"#aaa":lvlC(p),marginBottom:"6px"}}>{p===null?"—":`${p}%`}</div>
                    <DomainBar pct={p} color={d.color} bg={d.bg}/>
                    {p!==null && <div style={{fontSize:"0.65rem",color:"#888",marginTop:"4px"}}>{lvl(p)}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strength / Opportunity */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            {[
              ["🏆 Strength Areas", strongest, "#1a6e2e","#f0faf2","#b3dfc0"],
              ["⚠️ Opportunity Areas", weakest,  "#8b1a1a","#fdf2f2","#f0b8b8"],
            ].map(([title, rows, color, bg, bd]) => (
              <div key={title} style={{background:"#fff",border:`1px solid ${bd}`,borderRadius:"4px",overflow:"hidden"}}>
                <div style={{padding:"0.65rem 1rem",background:bg,borderBottom:`1px solid ${bd}`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color}}>{title.toUpperCase()}</div>
                {rows.map(r => (
                  <div key={r.std} style={{padding:"0.55rem 1rem",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.72rem",fontWeight:700,color:"#1a1a1a"}}>{r.std}</div>
                      <div style={{fontSize:"0.62rem",color:"#888"}}>{r.short} · {r.total} attempts</div>
                    </div>
                    <div style={{fontWeight:700,fontSize:"0.9rem",color:lvlC(r.pct),minWidth:"38px",textAlign:"right"}}>{r.pct}%</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Student × Domain grid */}
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
            <div style={{padding:"0.75rem 1.25rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555"}}>
              STUDENT DOMAIN BREAKDOWN
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.8rem"}}>
                <thead>
                  <tr style={{background:"#f8fafc",borderBottom:"2px solid #dde3e9"}}>
                    <th style={{padding:"0.6rem 1rem",textAlign:"left",fontWeight:700,color:"#555",fontSize:"0.68rem",letterSpacing:"0.08em",minWidth:"140px"}}>STUDENT</th>
                    <th style={{padding:"0.6rem 0.75rem",textAlign:"center",fontWeight:700,color:"#555",fontSize:"0.68rem",minWidth:"70px"}}>OVERALL</th>
                    {DOMAINS.map(d => (
                      <th key={d.key} style={{padding:"0.6rem 0.75rem",textAlign:"center",fontWeight:700,color:d.color,fontSize:"0.65rem",minWidth:"80px"}}>{d.key}</th>
                    ))}
                    <th style={{padding:"0.6rem 0.75rem",textAlign:"center",fontWeight:700,color:"#555",fontSize:"0.65rem",minWidth:"60px"}}>TESTS</th>
                  </tr>
                </thead>
                <tbody>
                  {studentDomains.map((st, i) => (
                    <tr key={st.key} style={{borderBottom:"1px solid #f0f4f8",background:i%2===0?"#fff":"#fafbfc"}}>
                      <td style={{padding:"0.6rem 1rem",fontWeight:600,color:"#1a1a1a"}}>
                        {st.name}
                        {st.className && <div style={{fontSize:"0.62rem",color:"#888",fontWeight:400}}>{st.className}</div>}
                      </td>
                      <td style={{padding:"0.6rem 0.75rem",textAlign:"center"}}>
                        <span style={{display:"inline-block",padding:"2px 8px",borderRadius:"10px",background:lvlBg(st.overall),color:lvlC(st.overall),fontWeight:700,fontSize:"0.82rem"}}>
                          {st.overall}%
                        </span>
                      </td>
                      {DOMAINS.map(d => {
                        const p = st.domains[d.key];
                        return (
                          <td key={d.key} style={{padding:"0.6rem 0.75rem",textAlign:"center"}}>
                            {p===null ? (
                              <span style={{color:"#ccc",fontSize:"0.75rem"}}>—</span>
                            ) : (
                              <span style={{display:"inline-block",padding:"2px 8px",borderRadius:"10px",background:lvlBg(p),color:lvlC(p),fontWeight:700,fontSize:"0.8rem"}}>{p}%</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{padding:"0.6rem 0.75rem",textAlign:"center",color:"#888",fontSize:"0.8rem"}}>{st.sessions}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Class averages footer */}
                <tfoot>
                  <tr style={{borderTop:"2px solid #dde3e9",background:"#f0f4f8"}}>
                    <td style={{padding:"0.6rem 1rem",fontWeight:700,fontSize:"0.72rem",color:"#555",letterSpacing:"0.08em"}}>CLASS AVG</td>
                    <td style={{padding:"0.6rem 0.75rem",textAlign:"center"}}>
                      <span style={{fontWeight:700,fontSize:"0.82rem",color:lvlC(Math.round(testSessions.reduce((a,s)=>a+s.pct,0)/(testSessions.length||1)))}}>{Math.round(testSessions.reduce((a,s)=>a+s.pct,0)/(testSessions.length||1))}%</span>
                    </td>
                    {DOMAINS.map(d => {
                      const p = classDomainAvg[d.key];
                      return (
                        <td key={d.key} style={{padding:"0.6rem 0.75rem",textAlign:"center"}}>
                          {p===null ? <span style={{color:"#ccc"}}>—</span> : <span style={{fontWeight:700,color:lvlC(p),fontSize:"0.82rem"}}>{p}%</span>}
                        </td>
                      );
                    })}
                    <td style={{padding:"0.6rem 0.75rem",textAlign:"center",color:"#888",fontSize:"0.8rem"}}>{testSessions.length}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#e8edf2",overflow:"hidden"}}>

      {/* Clear confirmation modal */}
      {clearModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div style={{background:"#fff",borderRadius:"6px",maxWidth:"420px",width:"100%",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
            <div style={{background:"#8b1a1a",color:"#fff",padding:"1.1rem 1.5rem"}}>
              <div style={{fontWeight:700,fontSize:"1rem"}}>🗑 Clear Session Data</div>
            </div>
            <div style={{padding:"1.25rem 1.5rem",fontSize:"0.88rem",color:"#444",lineHeight:1.6}}>
              Choose what to clear. <strong>This cannot be undone.</strong>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",padding:"0 1.5rem 1.25rem"}}>
              {[
                ["tests",  "Clear Test Scores only",         `${testSessions.length} test session${testSessions.length!==1?"s":""}`,  T.midnight,"rgba(13,148,136,.1)"],
                ["drills", "Clear Drill & Practice data only", `${drillSessions.length} drill session${drillSessions.length!==1?"s":""}`, "#7a4e00","#fff8e1"],
                ["all",    "Clear Everything",               `All ${sessions.length} sessions`,                                        "#8b1a1a","#fdf2f2"],
              ].map(([mode, label, sub, c, bg]) => (
                <button key={mode} onClick={() => handleClearMode(mode)}
                  style={{background:bg,border:`1px solid ${c}33`,borderRadius:"4px",padding:"0.75rem 1rem",textAlign:"left",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.85rem",color:c}}>{label}</div>
                    <div style={{fontSize:"0.72rem",color:"#888",marginTop:"2px"}}>{sub}</div>
                  </div>
                  <span style={{color:c,fontSize:"0.8rem"}}>→</span>
                </button>
              ))}
            </div>
            <div style={{padding:"0.75rem 1.5rem",borderTop:"1px solid #eee",display:"flex",justifyContent:"flex-end"}}>
              <button onClick={() => setClearModal(false)}
                style={{background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.5rem 1.25rem",fontSize:"0.82rem",cursor:"pointer",color:"#555",fontWeight:600}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{background:T.midnight,display:"flex",alignItems:"flex-end",padding:"0 1.5rem",gap:"0.15rem",flexShrink:0}}>
        {TABS.map(([key,lbl])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{background:tab===key?T.surface:"transparent",color:tab===key?T.midnight:"rgba(255,255,255,.55)",border:"none",padding:"0.6rem 1.1rem",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",borderRadius:"4px 4px 0 0",transition:"color .15s,background .15s"}}>
            {lbl}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"0.5rem",paddingBottom:"4px"}}>
          <div style={{fontSize:"0.68rem",color:"rgba(13,148,136,.4)",opacity:.7}}>{testSessions.length} tests · {drillSessions.length} drills · live</div>
          <button
            onClick={()=>generateClassReport(sessions, bankQ, growthClass).catch(e=>alert("Export failed: "+e.message))}
            disabled={sessions.length===0}
            style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.35)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:sessions.length===0?"not-allowed":"pointer",fontSize:"0.68rem",fontWeight:700,opacity:sessions.length===0?.4:1}}>
            📄 Export PDF
          </button>
          {!readOnly && (
          <button onClick={() => setClearModal(true)} disabled={clearing||sessions.length===0}
            style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",color:"#fecaca",borderRadius:"3px",padding:"4px 10px",cursor:sessions.length===0?"not-allowed":"pointer",fontSize:"0.68rem",opacity:sessions.length===0?.4:1}}>
            {clearing?"Clearing…":"🗑 Clear"}
          </button>
          )}
        </div>
      </div>

      <div style={{flex:1,padding:"1.25rem 1.5rem",overflowY:"auto"}}>
        {renderTab()}
      </div>

      {/* Parent report modal */}
      {parentReportId && (
        <ParentReport
          studentId={parentReportId}
          onClose={() => setParentReportId(null)}
        />
      )}
    </div>
  );
}
