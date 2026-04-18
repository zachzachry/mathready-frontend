import React, { useState, useEffect, useCallback } from "react";
import { QUESTIONS, lvl, lvlC, lvlBg, lvlBd, API, T, teacherHeaders, TEACHER_POLL_MS, SESSION_FAST_POLL_MS, SLOW_POLL_MS } from "./shared/constants";
import MathText from "./shared/MathText";
import { generateClassReport } from "./generateReport";
import ParentReport from "./ParentReport";
import TestParentReport from "./TestParentReport";
import StudentDiagnostic from "./StudentDiagnostic";
import StudentQuestionReport from "./StudentQuestionReport";
import PracticeParentReport from "./PracticeParentReport";

const ALL_TABS = [
  ["overview",  "📊 Overview",       false, false],
  ["items",     "📋 Item Analysis",  false, false],
  ["growth",    "📈 Growth",         false, false],
  ["drills",    "🎯 Drills",         false, false],
  ["profile",   "📋 Class Profile",  false, false],
  ["gradebook", "📒 Gradebook",      false, false],
  ["controls",  "🎛 Test Controls",  true,  false],  // writeOnly
  ["admin",     "🏫 School Overview", false, true],   // adminOnly
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
  const [allSessions,  setAllSessions]  = useState([]);  // all active test sessions
  const [selectedCode, setSelectedCode] = useState("");   // which session is being managed
  const [ctrl,         setCtrl]         = useState({ paused: false, stopped: false, gate: false, testing: true, extensions: {} });
  const [active,       setActive]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState("");
  const [extMsgs,      setExtMsgs]      = useState({});  // per-student flash messages

  // Poll all sessions + control state + active students every 5s
  useEffect(() => {
    async function poll() {
      try {
        // Get all active sessions (teacher-auth required)
        const sessions = await fetch(`${API}/test/control/all`, {
          headers: teacherHeaders(),
        }).then(r=>r.ok?r.json():[]).catch(()=>[]);
        setAllSessions(Array.isArray(sessions) ? sessions : []);

        // Auto-select if only one session active
        const code = selectedCode || (sessions.length === 1 ? sessions[0].code : "");
        if (code !== selectedCode && sessions.length === 1) setSelectedCode(code);

        if (code) {
          const [c, a] = await Promise.all([
            fetch(`${API}/test/control?code=${encodeURIComponent(code)}`).then(r=>{ if(!r.ok) console.error("GET /test/control failed:", r.status); return r.json(); }),
            fetch(`${API}/active?code=${encodeURIComponent(code)}`).then(r=>{ if(!r.ok) console.error("GET /active failed:", r.status); return r.json(); }).catch(()=>[]),
          ]);
          setCtrl(c);
          setActive(Array.isArray(a) ? a : []);
        } else {
          setCtrl({ paused: false, stopped: false, gate: false, testing: true, extensions: {} });
          setActive([]);
        }
      } catch(e) { console.error("poll failed:", e); }
      setLoading(false);
    }
    poll();
    const t = setInterval(poll, TEACHER_POLL_MS);
    return () => clearInterval(t);
  }, [selectedCode]); // eslint-disable-line

  async function send(patch) {
    if (!selectedCode) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/test/control`, {
        method:"POST", headers: teacherHeaders(),
        body: JSON.stringify({ ...patch, code: selectedCode }),
      });
      const d = await r.json();
      setCtrl(d);
      setMsg(patch.action === "begin" ? "Testing started — students released from waiting room."
        : patch.paused != null
        ? (patch.paused ? "Test paused — students see a waiting screen." : "Test resumed.")
        : (patch.stopped ? "Test stopped — students prompted to submit." : "Stop cleared. Extensions reset."));
      setTimeout(() => setMsg(""), 4000);
    } catch { setMsg("Failed to update."); }
    setSaving(false);
  }

  async function grantExtension(studentName, extraSecs) {
    if (!selectedCode) return;
    try {
      const extResp = await fetch(`${API}/test/control/extend`, {
        method:"POST", headers: teacherHeaders(),
        body: JSON.stringify({ code: selectedCode, studentName, extraSecs }),
      });
      if (!extResp.ok) console.error("POST /test/control/extend failed:", extResp.status);
      const mins = extraSecs / 60;
      setExtMsgs(prev => ({ ...prev, [studentName]: `+${mins} min granted` }));
      setTimeout(() => setExtMsgs(prev => { const n={...prev}; delete n[studentName]; return n; }), 3000);
      const ctrlResp = await fetch(`${API}/test/control?code=${encodeURIComponent(selectedCode)}`);
      if (!ctrlResp.ok) console.error("GET /test/control failed:", ctrlResp.status);
      const d = await ctrlResp.json();
      setCtrl(d);
    } catch(e) { console.error("grantExtension failed:", e); setMsg("Failed to grant extension — check your connection."); }
  }

  if (loading) return <div style={{padding:"2rem",color:T.textMuted}}>Loading…</div>;

  const extensions = ctrl.extensions || {};
  const waitingStudents = active.filter(s => s.phase === "waiting");

  const isWaiting = ctrl.gate && !ctrl.testing;

  return (
    <div style={{padding:"1.25rem",maxWidth:"620px",fontFamily:T.font}}>
      <div style={{fontSize:"1rem",fontWeight:700,color:T.midnight,marginBottom:"4px"}}>Live Test Controls</div>

      {/* Session picker */}
      {allSessions.length === 0 ? (
        <div style={{fontSize:"0.88rem",color:T.textMuted,marginBottom:"1.25rem",background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.65rem 0.9rem"}}>
          No live sessions. Go to the Test Library and click <strong>Launch</strong> on an assignment to start a session.
        </div>
      ) : allSessions.length > 1 ? (
        <div style={{marginBottom:"1.25rem"}}>
          <label style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,textTransform:"uppercase",display:"block",marginBottom:"5px"}}>Active Session</label>
          <select value={selectedCode} onChange={e=>setSelectedCode(e.target.value)}
            style={{width:"100%",padding:"0.6rem 0.85rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.88rem",color:T.text,background:T.white}}>
            <option value="">— Select a session —</option>
            {allSessions.map(s=>(
              <option key={s.code} value={s.code}>{s.code}{s.classId ? ` · ${s.classId}` : ""}</option>
            ))}
          </select>
        </div>
      ) : (
        <div style={{fontSize:"0.88rem",color:T.textSecondary,marginBottom:"1.25rem"}}>
          Session: <strong>{selectedCode || allSessions[0]?.code}</strong> · Students poll every 5 seconds.
        </div>
      )}

      {selectedCode && (<>

      {msg && (
        <div style={{background:T.successBg,border:`1px solid ${T.successBd}`,borderRadius:T.xs,padding:"0.6rem 0.9rem",fontSize:"0.88rem",color:T.success,fontWeight:700,marginBottom:"1rem"}}>
          ✓ {msg}
        </div>
      )}

      {/* Waiting Room — shown when teacher has launched but not yet clicked Begin Testing */}
      {isWaiting && (
        <div style={{background:"#fff8e1",border:"1px solid #ffc107",borderRadius:T.r,padding:"1.1rem 1.25rem",marginBottom:"0.85rem"}}>
          <div style={{fontWeight:700,fontSize:"1.05rem",color:"#e65100",marginBottom:"4px"}}>
            🟡 Waiting Room — {waitingStudents.length} student{waitingStudents.length !== 1 ? "s" : ""} ready
          </div>
          <div style={{fontSize:"0.88rem",color:T.textSecondary,marginBottom:"0.75rem"}}>
            Students have entered the test code and are waiting for your signal. Click Begin Testing to release them all at once.
          </div>
          {waitingStudents.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.35rem",marginBottom:"0.85rem"}}>
              {waitingStudents.map(s=>(
                <span key={s.name} style={{background:"#fff",border:"1px solid #ffc107",borderRadius:T.full,padding:"4px 12px",fontSize:"0.88rem",fontWeight:600,color:"#555"}}>
                  {s.name}
                </span>
              ))}
            </div>
          )}
          <button onClick={()=>send({action:"begin"})} disabled={saving}
            style={{background:"#1565c0",color:"#fff",border:"none",borderRadius:T.xs,padding:"0.75rem 1.5rem",fontWeight:700,fontSize:"1rem",cursor:"pointer",opacity:saving?0.5:1}}>
            ▶ Begin Testing for All
          </button>
        </div>
      )}

      {/* Test in progress banner — visible once testing begins and test is not stopped */}
      {!isWaiting && ctrl.testing && !ctrl.stopped && (
        <div style={{background:"#e8f5e9",border:"1px solid #a5d6a7",borderRadius:T.xs,padding:"0.55rem 0.9rem",fontSize:"0.88rem",color:"#2e7d32",fontWeight:700,marginBottom:"0.85rem"}}>
          ✅ Test in progress — students are working
        </div>
      )}

      {/* Pause / Resume — hidden while students are still in the waiting room */}
      {!isWaiting && (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"1.1rem 1.25rem",marginBottom:"0.85rem",display:"flex",alignItems:"center",gap:"1rem"}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:"1.05rem",color:T.text,marginBottom:"2px"}}>
              {ctrl.paused ? "⏸ Test is PAUSED" : "▶ Test is Running"}
            </div>
            <div style={{fontSize:"0.88rem",color:T.textSecondary}}>
              {ctrl.paused
                ? "Students see a pause screen and cannot answer questions."
                : "Students are actively working. Click Pause to freeze the test."}
            </div>
          </div>
          <button onClick={()=>send({paused:!ctrl.paused})} disabled={saving||ctrl.stopped}
            style={{background:ctrl.paused?T.success:"#b8860b",color:T.white,border:"none",borderRadius:T.xs,
              padding:"0.65rem 1.25rem",fontWeight:700,fontSize:"0.95rem",cursor:"pointer",
              opacity:(saving||ctrl.stopped)?0.5:1,whiteSpace:"nowrap"}}>
            {ctrl.paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        </div>
      )}

      {/* Stop — hidden while students are still in the waiting room */}
      {!isWaiting && (
        <div style={{background:T.white,border:`1px solid ${T.dangerBd}`,borderRadius:T.r,padding:"1.1rem 1.25rem",marginBottom:"1.25rem",display:"flex",alignItems:"center",gap:"1rem"}}>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:"1.05rem",color:ctrl.stopped?T.dangerText:T.text,marginBottom:"2px"}}>
              {ctrl.stopped ? "🛑 Test is STOPPED" : "🛑 Stop Test"}
            </div>
            <div style={{fontSize:"0.88rem",color:T.textSecondary}}>
              {ctrl.stopped
                ? "Students are prompted to submit. Click Clear to reset for next test."
                : "Immediately prompts all students to submit their answers."}
            </div>
          </div>
          {ctrl.stopped
            ? <button onClick={()=>send({stopped:false,paused:false})} disabled={saving}
                style={{background:T.midnight,color:T.white,border:"none",borderRadius:T.xs,
                  padding:"0.65rem 1.25rem",fontWeight:700,fontSize:"0.95rem",cursor:"pointer",opacity:saving?0.5:1}}>
                Clear Stop
              </button>
            : <button onClick={()=>{ if(window.confirm("Stop the test for all students now?")) send({stopped:true,paused:false}); }}
                disabled={saving}
                style={{background:T.dangerText,color:T.white,border:"none",borderRadius:T.xs,
                  padding:"0.65rem 1.25rem",fontWeight:700,fontSize:"0.95rem",cursor:"pointer",opacity:saving?0.5:1}}>
                🛑 Stop Now
              </button>
          }
        </div>
      )}

      {/* IEP Time Extensions — hidden while students are still in the waiting room */}
      {!isWaiting && (
        <div style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:"0.95rem",fontWeight:700,color:T.midnight,marginBottom:"4px"}}>⏱ Time Extensions (IEP / 504)</div>
          <div style={{fontSize:"0.88rem",color:T.textSecondary,marginBottom:"0.85rem"}}>
            Grant extra time to individual students currently taking the test. Their timer adds the extra minutes immediately.
          </div>

          {active.length === 0 ? (
            <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"1rem 1.25rem",fontSize:"0.88rem",color:T.textMuted,textAlign:"center"}}>
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
                      <div style={{fontWeight:700,fontSize:"1rem",color:T.text}}>{s.name}</div>
                      <div style={{fontSize:"0.85rem",color:T.textSecondary}}>
                        Q{s.current_question+1} · {s.status === "active" ? <span style={{color:T.success}}>● Active</span> : <span style={{color:"#b8860b"}}>● Behind pace</span>}
                        {totalExtra > 0 && <span style={{color:T.midnight,marginLeft:"0.5rem",fontWeight:700}}>+{totalExtra/60} min granted</span>}
                      </div>
                    </div>
                    {flashMsg ? (
                      <div style={{background:T.successBg,border:`1px solid ${T.successBd}`,borderRadius:T.xs,padding:"4px 12px",fontSize:"0.85rem",color:T.success,fontWeight:700}}>
                        ✓ {flashMsg}
                      </div>
                    ) : (
                      <div style={{display:"flex",gap:"6px"}}>
                        {[5,10,15,30].map(mins => (
                          <button key={mins} onClick={()=>grantExtension(s.name, mins*60)}
                            style={{background:"rgba(13,148,136,.1)",border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"8px 16px",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",color:T.midnight,whiteSpace:"nowrap",minWidth:"52px"}}>
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
      )}

      <div style={{fontSize:"0.82rem",color:T.textMuted}}>
        Controls are scoped to the selected session. Extensions are per-student and reset when stop is cleared.
      </div>
      </>)}
    </div>
  );
}

export default function Dashboard({ teacher, readOnly }) {
  const isAdmin = teacher && (teacher.teacherRole === "super_admin" || teacher.teacherRole === "school_admin");
  const TABS = ALL_TABS.filter(([,, writeOnly, adminOnly]) => (!readOnly || !writeOnly) && (!adminOnly || isAdmin));
  const [tab,      setTab]      = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [overviewTest, setOverviewTest] = useState("all"); // filter overview by test code
  const [gradeSort,    setGradeSort]    = useState("score"); // "score" | "name"
  const [loading,  setLoading]  = useState(true);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState(""); // error message from failed delete
  const [clearModal, setClearModal] = useState(false);
  const [clearTestCode, setClearTestCode] = useState(""); // for per-test clear
  const [roster,   setRoster]   = useState([]);
  const [practiceReport, setPracticeReport] = useState(null); // session to show in parent report modal
  const [fluencyReport, setFluencyReport] = useState([]);
  const [leaderboard,   setLeaderboard]   = useState([]);
  const [parentReportId,   setParentReportId]   = useState(null); // student ID for fluency parent report
  const [testReportData,   setTestReportData]   = useState(null); // {session, fullStudent, stds, className} for test report
  const [diagStudentId,    setDiagStudentId]    = useState(null); // {id, name}
  const [questionReportSession, setQuestionReportSession] = useState(null); // session for per-question report
  const [adminData, setAdminData] = useState(null);
  const [openItem, setOpenItem] = useState(null); // q.id of expanded missed-by panel
  const [pendingCorrect, setPendingCorrect] = useState(null);
  const [regradeLoading, setRegradeLoading] = useState(false);
  const [regradeResult,  setRegradeResult]  = useState(null);
  const [regradeModalQ,     setRegradeModalQ]     = useState(null);
  const [regradeModalError, setRegradeModalError] = useState("");

  const [gbClass, setGbClass] = useState("all"); // gradebook class filter

  // Growth filters
  const [growthClass,      setGrowthClass]      = useState("all");
  const [growthStudent,    setGrowthStudent]    = useState("all");
  const [growthTestCodes,  setGrowthTestCodes]  = useState([]); // ordered selection for comparison

  const [bankQ, setBankQ] = useState(QUESTIONS);
  const [savedTests, setSavedTests] = useState([]); // for code→name lookup
  const [reviewCode, setReviewCode] = useState(null); // test code to review
  const [reviewData, setReviewData] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewNotFound, setReviewNotFound] = useState(false);

  async function openReview(code) {
    setReviewCode(code);
    setReviewLoading(true);
    setReviewData(null);
    setReviewNotFound(false);
    try {
      const classFilter = teacher?.classIds?.length ? `&classIds=${teacher.classIds.join(",")}` : "";
      const r = await fetch(`${API}/test/review/${encodeURIComponent(code)}?_=${Date.now()}${classFilter}`);
      if (r.ok) setReviewData(await r.json());
      else if (r.status === 404) setReviewNotFound(true);
    } catch (e) { console.warn("Review fetch failed:", e); }
    setReviewLoading(false);
  }

  // Build URL params once (stable across renders)
  const classFilter  = teacher && teacher.classIds !== null && teacher.classIds.length > 0
    ? "?classIds="+teacher.classIds.join(",") : teacher && teacher.classIds !== null ? "?classIds=" : "";
  const tidParam     = teacher?.teacherId   ? `&teacherId=${teacher.teacherId}` : "";
  const sessionParam = classFilter
    ? `${classFilter}${tidParam}`
    : tidParam ? `?${tidParam.slice(1)}` : "";
  const savedParam   = teacher?.teacherId
    ? `?teacherId=${teacher.teacherId}` : "";

  // ── Fast poll: sessions only (every 3 s) ──────────────────
  const refreshSessions = useCallback(async () => {
    try {
      const s = await fetch(`${API}/sessions${sessionParam}`, { headers: teacherHeaders() }).then(r=>r.ok?r.json():[]).catch(()=>[]);
      setSessions(Array.isArray(s) ? s : []);
    } catch(e) { console.error("refreshSessions failed:", e); }
  }, [sessionParam]);

  // ── Slow refresh: everything else (on mount + every 30 s) ─
  const refresh = useCallback(async () => {
    try {
      const [s, r, st] = await Promise.all([
        fetch(`${API}/sessions${sessionParam}`, { headers: teacherHeaders() }).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch(`${API}/roster${classFilter}`).then(r=>r.ok?r.json():[]).catch(()=>[]),
        fetch(`${API}/tests/saved${savedParam}`, { headers: teacherHeaders() }).then(r=>r.ok?r.json():[]).catch(()=>[]),
      ]);
      setSessions(Array.isArray(s) ? s : []);
      if (Array.isArray(st)) setSavedTests(st);
      const rosterArr = Array.isArray(r) ? r : [];
      setRoster(rosterArr);
      // Fluency reports + leaderboards
      try {
        const reports = await Promise.all(
          rosterArr.map(c => fetch(`${API}/fluency/class/${c.id}/report`).then(r=>r.ok?r.json():[]).catch(()=>[]))
        );
        setFluencyReport(rosterArr.map((c, i) => ({ classId: c.id, className: c.name, students: Array.isArray(reports[i]) ? reports[i] : [] })));
        const boards = await Promise.all(
          rosterArr.map(c => fetch(`${API}/fluency/class/${c.id}/leaderboard`).then(r=>r.ok?r.json():[]).catch(()=>[]))
        );
        setLeaderboard(rosterArr.map((c, i) => ({ classId: c.id, className: c.name, top5: Array.isArray(boards[i]) ? boards[i] : [] })));
      } catch (e) { console.warn("Failed to load fluency reports:", e); }
      // Admin overview
      if (teacher && (teacher.teacherRole === "super_admin" || teacher.teacherRole === "school_admin")) {
        try { const ov = await fetch(`${API}/admin/overview`); if (ov.ok) setAdminData(await ov.json()); } catch(e) { console.error("admin overview failed:", e); }
      }
    } catch(e) { console.error("refresh failed:", e); }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionParam, classFilter, savedParam]);

  // Load question bank once on mount — 2.4 MB, no need to re-fetch every 30 s
  useEffect(() => {
    fetch(`${API}/questions`).then(r=>r.ok?r.json():[]).then(q => {
      if (Array.isArray(q) && q.length > 0) setBankQ(q);
    }).catch(()=>{});
  }, []); // eslint-disable-line

  // Mount: full load once, then fast-poll sessions + slow-poll everything else
  useEffect(() => {
    refresh();
    const fast = setInterval(refreshSessions, SESSION_FAST_POLL_MS);
    const slow = setInterval(refresh, SLOW_POLL_MS);
    return () => { clearInterval(fast); clearInterval(slow); };
  }, [refresh, refreshSessions]);

  async function handleSaveRegrade(q) {
    const isMulti = q.type === "multiselect" || Array.isArray(q.answer);
    const hasChanged = isMulti
      ? JSON.stringify([...(Array.isArray(pendingCorrect)?pendingCorrect:[])].sort()) !== JSON.stringify([...(Array.isArray(q.answer)?q.answer:[])].sort())
      : pendingCorrect && pendingCorrect !== q.correct;
    if (!hasChanged) return;
    setRegradeLoading(true);
    setRegradeModalError("");
    setRegradeResult(null);
    try {
      const r = await fetch(`${API}/questions/${encodeURIComponent(q.id)}/regrade`, {
        method: "POST",
        headers: teacherHeaders(),
        body: JSON.stringify({ correct: pendingCorrect }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setRegradeModalError(err.detail || `Could not save. Please try again. (${r.status})`);
        setRegradeLoading(false);
        return;
      }
      const data = await r.json();
      setBankQ(prev => prev.map(bq => bq.id === q.id
        ? { ...bq, correct: pendingCorrect, ...(isMulti ? { answer: pendingCorrect } : {}) }
        : bq
      ));
      setRegradeResult({ questionId: q.id, updatedSessions: data.updated_sessions });
      setTimeout(() => setRegradeResult(null), 5000);
      setRegradeModalQ(null);
      await refreshSessions();
    } catch {
      setRegradeModalError("Network error — please check your connection and try again.");
    }
    setRegradeLoading(false);
  }

  async function handleClearByTest(code) {
    setClearing(true); setClearError("");
    try {
      const r = await fetch(`${API}/sessions/test/${encodeURIComponent(code)}`, { method: "DELETE", headers: teacherHeaders() });
      if (!r.ok) { setClearError(`Delete failed (${r.status}). Try again or refresh.`); setClearing(false); return; }
      setClearTestCode("");
      setSessions(prev => prev.filter(s => (s.testCode||s.code||"").toUpperCase() !== code.toUpperCase()));
      if (overviewTest === code) { setOverviewTest("all"); setSelected(null); }
    } catch (e) { setClearError("Network error — check your connection and try again."); }
    setClearing(false);
  }

  async function handleClearMode(mode) {
    setClearing(true); setClearModal(false);
    try {
      if (mode === "fluency") {
        const r = await fetch(`${API}/fluency/all`, { method: "DELETE", headers: teacherHeaders() });
        if (!r.ok) console.error("DELETE /fluency/all failed:", r.status);
        setFluencyReport([]); setLeaderboard([]);
      } else {
        const url = mode === "all" ? `${API}/sessions` : `${API}/sessions?mode=${mode}`;
        const r = await fetch(url, { method: "DELETE", headers: teacherHeaders() });
        if (!r.ok) console.error(`DELETE ${url} failed:`, r.status);
        if (mode === "all") { setSessions([]); const r2 = await fetch(`${API}/fluency/all`, { method: "DELETE", headers: teacherHeaders() }); if (!r2.ok) console.error("DELETE /fluency/all failed:", r2.status); setFluencyReport([]); setLeaderboard([]); }
        else if (mode === "tests") setSessions(prev => prev.filter(s => s.mode === "drill" || s.mode === "practice"));
        else if (mode === "drills") setSessions(prev => prev.filter(s => s.mode !== "drill" && s.mode !== "practice"));
      }
    } catch(e) { console.error("handleClearMode failed:", e); setClearError("Network error — check your connection and try again."); }
    setSelected(null); setClearing(false);
  }

  // ── Split sessions by mode ──
  const testSessions     = sessions.filter(s => s.mode !== "drill" && s.mode !== "practice");
  const drillSessions    = sessions.filter(s => s.mode === "drill" || s.mode === "practice");
  const practiceSessions    = sessions.filter(s => s.mode === "practice");

  // ── Overview stats (tests only) ──
  // Build code→name map: primary source = saved test library, fallback = session's testTitle
  const testCodeNames = {};
  savedTests.forEach(t => { if (t.code) testCodeNames[t.code] = t.name || t.title || t.code; });
  testSessions.forEach(s => {
    const code = s.testCode || s.code || "";
    if (code && !testCodeNames[code]) testCodeNames[code] = s.testTitle || s.testName || code;
  });
  const testCodes = Object.keys(testCodeNames).filter(c => testSessions.some(s=>(s.testCode||s.code||"")===c));
  // Filter by selected test
  const filteredTestSessions = overviewTest === "all" ? testSessions
    : testSessions.filter(s=>(s.testCode||s.code||"")=== overviewTest);
  // Deduplicate: keep only most recent session per student
  const latestByStudent = (() => {
    const map = {};
    [...filteredTestSessions].sort((a,b)=>new Date(a.submitted)-new Date(b.submitted)).forEach(s => {
      const key = s.studentId || s.studentName || s.name || "Unknown";
      map[key] = s; // overwrite with newer
    });
    return Object.values(map);
  })();
  // Regrade from bankQ (authoritative); fall back to qt.correct for deleted questions
  function effPct(s) {
    const answers = s.answers || {};
    const qIds = (s.questionTimes||[]).length
      ? s.questionTimes.map(qt => qt.qId)
      : Object.keys(answers);
    if (!qIds.length) return s.pct;
    const correct = qIds.filter(qid => {
      const q = bankQ.find(x => x.id === qid);
      const ans = answers[qid];
      if (ans === undefined || ans === null) return false;
      if (q) return gradeSessionAnswer(q, ans);
      const qt = (s.questionTimes||[]).find(t => t.qId === qid);
      return Boolean(qt?.correct);
    }).length;
    return Math.round(correct / qIds.length * 100);
  }
  const sorted  = [...latestByStudent].sort((a,b)=>{
    if (gradeSort === "name") {
      const aName = (a.studentName||a.name||"").split(" ").reverse().join(" ");
      const bName = (b.studentName||b.name||"").split(" ").reverse().join(" ");
      return aName.localeCompare(bName);
    }
    return effPct(b)-effPct(a);
  });

  const avgP    = latestByStudent.length ? Math.round(latestByStudent.reduce((a,s)=>a+effPct(s),0)/latestByStudent.length) : 0;
  const profC   = latestByStudent.filter(s=>effPct(s)>=80).length;
  const devC    = latestByStudent.filter(s=>effPct(s)>=60&&effPct(s)<80).length;
  const begC    = latestByStudent.filter(s=>effPct(s)<60).length;

  // ── DOK breakdown from questionTimes across filtered sessions ──
  const dokBuckets = {1:{c:0,t:0}, 2:{c:0,t:0}, 3:{c:0,t:0}};
  filteredTestSessions.forEach(s => (s.questionTimes||[]).forEach(qt => {
    const d = Number(qt.dok); if (d >= 1 && d <= 3) { dokBuckets[d].t++; if (qt.correct) dokBuckets[d].c++; }
  }));
  const dokAvg = k => dokBuckets[k].t ? Math.round(dokBuckets[k].c / dokBuckets[k].t * 100) : null;

  // ── Item analysis (use live question ids if available) ──
  function gradeSessionAnswer(q, ans) {
    if (!q || ans === undefined || ans === null) return false;
    if (q.type === "multiselect") { try { return JSON.stringify([...JSON.parse(ans)].sort()) === JSON.stringify([...(Array.isArray(q.answer)?q.answer:[])].sort()); } catch { return false; } }
    if (q.type === "keypad") return String(q.answer??"").trim().toLowerCase() === String(ans).trim().toLowerCase();
    if (q.type === "plotpoint") { try { return ans === JSON.stringify(Array.isArray(q.answer)?q.answer:JSON.parse(q.answer)); } catch { return false; } }
    if (q.type === "dragdrop") { try { const g=JSON.parse(ans); const cm=q.correct||q.answer||{}; return (q.items||[]).every(item=>{const c=cm[item]; if(c==="distractor") return g[item]===undefined; return g[item]===c;}); } catch { return false; } }
    if (q.type === "hotspot") { try { const g=Array.isArray(ans)?ans:JSON.parse(ans); const c=q.answer||{}; const sps=q.snapPoints||[]; const correctSps=sps.filter(sp=>c[sp.id]); const isDot=q.assetType==="dot"||q.assetType==="pin"; const TOL=8; if(!Array.isArray(g)||g.length!==correctSps.length) return false; return correctSps.every(sp=>g.some(pt=>{const d=Math.sqrt((sp.x-pt.x)**2+(sp.y-pt.y)**2); return d<=TOL&&(isDot||pt.val===c[sp.id]);})); } catch { return false; } }
    // MCQ: compare by choice index (robust against encoding/whitespace differences)
    const correctVal = q.correct ?? q.answer;
    const choices = q.choices || [];
    const ansIdx = choices.indexOf(ans); const correctIdx = choices.indexOf(correctVal);
    if (ansIdx >= 0 && correctIdx >= 0) return ansIdx === correctIdx;
    return String(ans).trim() === String(correctVal ?? "").trim();
  }

  const itemData = bankQ.map(q => {
    const correct = filteredTestSessions.filter(s=>gradeSessionAnswer(q, s.answers?.[q.id])).length;
    const attempted = filteredTestSessions.filter(s=>q.id in (s.answers||{})).length;
    const missedBy = filteredTestSessions
      .filter(s => q.id in (s.answers||{}) && !gradeSessionAnswer(q, s.answers[q.id]))
      .map(s => {
        const rawAns = s.answers[q.id];
        const choiceIdx = (q.choices||[]).indexOf(rawAns);
        return { name: s.studentName||s.name||"Unknown", answerLabel: choiceIdx>=0 ? ["A","B","C","D"][choiceIdx] : null };
      });
    return { ...q, correctCount:correct, attempted, pct: attempted ? Math.round((correct/attempted)*100) : 0, missedBy };
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
        if (gradeSessionAnswer(q, ans)) map[q.standard].correct++;
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
              ["Submitted", latestByStudent.length, T.teal],
            ].map(([lbl,val,c])=>(
              <div key={lbl} style={{background:T.white,border:`1px solid ${T.border}`,borderLeft:`3px solid ${c}`,borderRadius:T.xs,padding:"0.9rem 1.25rem",minWidth:"120px",flex:1}}>
                <div style={{fontSize:"0.78rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary,marginBottom:"4px"}}>{lbl.toUpperCase()}</div>
                <div style={{fontSize:"1.6rem",fontWeight:700,color:c}}>{val}</div>
              </div>
            ))}
          </div>
          {/* DOK breakdown row — only show when there's question-time data */}
          {(dokAvg(1) !== null || dokAvg(2) !== null || dokAvg(3) !== null) && (
            <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
              {[[1,"Recall / Procedural","#4338ca","#e0e7ff"],[2,"Skill / Concept","#0369a1","#e0f2fe"],[3,"Strategic Thinking","#7c3aed","#f3e8ff"]].map(([dok,desc,c,bg])=>{
                const v = dokAvg(dok);
                return (
                  <div key={dok} style={{background:T.white,border:`1px solid ${T.border}`,borderLeft:`3px solid ${c}`,borderRadius:T.xs,padding:"0.7rem 1.25rem",minWidth:"140px",flex:1}}>
                    <div style={{fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.08em",color:c,marginBottom:"2px"}}>DOK {dok} — {desc.toUpperCase()}</div>
                    <div style={{display:"flex",alignItems:"baseline",gap:"0.4rem"}}>
                      <div style={{fontSize:"1.5rem",fontWeight:700,color:v==null?T.textMuted:v>=80?T.success:v>=60?T.warning:T.dangerText}}>{v != null ? `${v}%` : "—"}</div>
                      {v != null && <div style={{fontSize:"0.78rem",color:T.textMuted}}>{dokBuckets[dok].t} qs</div>}
                    </div>
                    {v != null && (
                      <div style={{height:"4px",background:bg,borderRadius:"2px",marginTop:"6px"}}>
                        <div style={{width:`${v}%`,height:"100%",background:c,borderRadius:"2px"}}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {testCodes.length > 0 && (
            <div style={{display:"flex",alignItems:"flex-start",gap:"0.5rem",flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <span style={{fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.06em",color:T.textSecondary}}>FILTER BY TEST:</span>
                <select value={overviewTest} onChange={e=>{setOverviewTest(e.target.value);setSelected(null);}}
                  style={{fontSize:"0.9rem",padding:"0.3rem 0.5rem",border:`1px solid ${T.border}`,borderRadius:T.xs,background:T.white}}>
                  <option value="all">All Tests</option>
                  {testCodes.map(c=><option key={c} value={c}>{testCodeNames[c] !== c ? `${testCodeNames[c]} (${c})` : c}</option>)}
                </select>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.35rem"}}>
                {(overviewTest === "all" ? testCodes : [overviewTest]).map(c => (
                  <button key={`rev-${c}`} onClick={()=>openReview(c)}
                    style={{fontSize:"0.82rem",fontWeight:600,color:T.midnight,background:"rgba(13,148,136,.1)",border:`1px solid ${T.midnight}44`,borderRadius:T.xs,padding:"5px 11px",cursor:"pointer"}}>
                    📖 Review {testCodeNames[c]!==c ? testCodeNames[c] : c}
                  </button>
                ))}
                {!readOnly && (overviewTest === "all" ? testCodes : [overviewTest]).map(c => (
                  <button key={`del-${c}`} onClick={()=>setClearTestCode(c)}
                    style={{fontSize:"0.82rem",fontWeight:600,color:"#8b1a1a",background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:T.xs,padding:"5px 11px",cursor:"pointer"}}>
                    🗑 {testCodeNames[c]!==c ? testCodeNames[c] : c}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden"}}>
            <div style={{padding:"0.75rem 1rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary,display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"}}>
              <span>TEST SCORES — {sorted.length} student{sorted.length!==1?"s":""}</span>
              {overviewTest !== "all" && <span style={{background:T.midnight,color:T.white,padding:"1px 6px",borderRadius:"3px",fontSize:"0.78rem"}}>{testCodeNames[overviewTest]!==overviewTest?`${testCodeNames[overviewTest]} · `:""}<span style={{fontFamily:"monospace"}}>{overviewTest}</span></span>}
              <div style={{marginLeft:"auto",display:"flex",gap:"4px"}}>
                <button onClick={()=>setGradeSort("score")} style={{fontSize:"0.75rem",fontWeight:700,padding:"2px 9px",borderRadius:"3px",border:`1px solid ${gradeSort==="score"?T.teal:T.border}`,background:gradeSort==="score"?T.tealLight:T.white,color:gradeSort==="score"?T.teal:T.textSecondary,cursor:"pointer"}}>By Score</button>
                <button onClick={()=>setGradeSort("name")} style={{fontSize:"0.75rem",fontWeight:700,padding:"2px 9px",borderRadius:"3px",border:`1px solid ${gradeSort==="name"?T.teal:T.border}`,background:gradeSort==="name"?T.tealLight:T.white,color:gradeSort==="name"?T.teal:T.textSecondary,cursor:"pointer"}}>By Last Name</button>
              </div>
            </div>
            {sorted.map((s,i)=>{
              const name = s.studentName||s.name;
              const qtC = (s.questionTimes||[]).filter(q => q.correct !== undefined);
              const effScore = qtC.length > 0 ? qtC.filter(q=>q.correct).length : s.score;
              const effTotal = qtC.length > 0 ? s.questionTimes.length : s.total;
              const p = effPct(s);
              const isOpen = name===selected;
              return (
                <React.Fragment key={i}>
                  <div onClick={()=>setSelected(isOpen?null:name)}
                    style={{padding:"0.7rem 1rem",borderBottom:`1px solid ${T.surfaceAlt}`,cursor:"pointer",background:isOpen?T.surfaceAlt:T.white,display:"flex",alignItems:"center",gap:"0.75rem",transition:"background .15s"}}>
                    <div style={{width:"28px",height:"28px",borderRadius:"50%",background:lvlBg(p),border:`2px solid ${lvlC(p)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:"0.78rem",fontWeight:700,color:lvlC(p)}}>{i+1}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"1rem",fontWeight:700,color:T.text}}>{name}</div>
                      {s.className&&<div style={{fontSize:"0.82rem",color:T.textSecondary}}>{s.className}</div>}
                    </div>
                    {s.violations > 0 && (
                      <div
                        title={s.violationLog?.length ? s.violationLog.map(v=>`Q${v.questionNum}: ${v.reason}`).join("\n") : `${s.violations} testing violation${s.violations!==1?"s":""} (left fullscreen)`}
                        style={{background:T.dangerText,color:T.white,borderRadius:T.xs,padding:"3px 8px",fontSize:"0.82rem",fontWeight:700,flexShrink:0,cursor:"help"}}>
                        ⚠ {s.violations}
                      </div>
                    )}
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:"1rem",fontWeight:700,color:lvlC(p)}}>{p}%</div>
                      <div style={{fontSize:"0.82rem",color:T.textSecondary}}>{effScore}/{effTotal} · {s.timeUsed}</div>
                      {(() => {
                        const qt = s.questionTimes||[];
                        if (!qt.length) return null;
                        const avg = (qt.reduce((a,q)=>a+(q.timeSecs||0),0)/qt.length).toFixed(1);
                        const isFast = Number(avg) < 10;
                        return <div style={{fontSize:"0.78rem",fontWeight:700,color:isFast?"#c62828":"#888"}} title="Average seconds per question">{avg}s/q{isFast?" ⚡":""}</div>;
                      })()}
                    </div>
                    <span style={{fontSize:"0.85rem",color:T.textMuted,flexShrink:0}}>{isOpen?"▲":"▼"}</span>
                  </div>
                  {isOpen && (()=>{
                    /* Build per-standard breakdown for this session */
                    const stdMap = {};
                    Object.entries(s.answers||{}).forEach(([qid,ans])=>{
                      const q = bankQ.find(x=>x.id===qid);
                      if (!q) return;
                      if (!stdMap[q.standard]) stdMap[q.standard] = { correct:0, total:0 };
                      stdMap[q.standard].total++;
                      if (gradeSessionAnswer(q, ans)) stdMap[q.standard].correct++;
                    });
                    const stds = Object.entries(stdMap).sort(([a],[b])=>a.localeCompare(b));
                    /* Look up full student history */
                    const sKey = s.studentId || s.studentName || s.name;
                    const fullStudent = studentMap[sKey];
                    const hasHistory = fullStudent && fullStudent.sessions.length >= 2;
                    return (
                    <div style={{padding:"1rem 1rem 1rem 3.5rem",background:T.surface,borderBottom:`1px solid ${T.surfaceAlt}`}}>
                      {/* Standard mastery for THIS session */}
                      <div style={{fontSize:"0.8rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary,marginBottom:"0.5rem"}}>STANDARD BREAKDOWN</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"0.75rem"}}>
                        {stds.map(([std,v])=>{
                          const sp = Math.round((v.correct/v.total)*100);
                          return (
                            <div key={std} title={`${v.correct}/${v.total} correct`}
                              style={{background:sp>=80?T.successBg:sp>=60?T.warningBg:T.dangerBg,border:`1px solid ${sp>=80?T.successBd:sp>=60?T.warningBd:T.dangerBd}`,borderRadius:T.xs,padding:"0.35rem 0.6rem",textAlign:"center",minWidth:"76px"}}>
                              <div style={{fontSize:"0.75rem",fontWeight:700,color:T.textSecondary}}>{std}</div>
                              <div style={{fontSize:"0.9rem",fontWeight:700,color:sp>=80?T.success:sp>=60?T.warning:T.dangerText}}>{sp}%</div>
                              <div style={{fontSize:"0.72rem",color:T.textMuted}}>{v.correct}/{v.total}</div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Action buttons */}
                      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                        {hasHistory && (
                          <button onClick={(e)=>{e.stopPropagation(); setTab("growth"); setGrowthStudent(sKey);}}
                            style={{background:T.midnight,color:T.white,border:"none",borderRadius:T.xs,padding:"7px 14px",fontSize:"0.88rem",fontWeight:600,cursor:"pointer"}}>
                            📈 View Growth History ({fullStudent.sessions.length} sessions)
                          </button>
                        )}
                        <button onClick={(e)=>{e.stopPropagation(); setDiagStudentId({id:s.studentId||s.id, name:s.studentName||s.name});}}
                          style={{background:"#1565c0",color:T.white,border:"none",borderRadius:T.xs,padding:"7px 14px",fontSize:"0.88rem",fontWeight:600,cursor:"pointer"}}>
                          🔍 Diagnose
                        </button>
                        <button onClick={(e)=>{e.stopPropagation(); setTestReportData({session:s, fullStudent, stds, className:s.className||""});}}
                          style={{background:T.teal,color:T.white,border:"none",borderRadius:T.xs,padding:"7px 14px",fontSize:"0.88rem",fontWeight:600,cursor:"pointer"}}>
                          📋 Parent Report
                        </button>
                        <button onClick={(e)=>{e.stopPropagation(); setQuestionReportSession(s);}}
                          style={{background:"#7c3aed",color:T.white,border:"none",borderRadius:T.xs,padding:"7px 14px",fontSize:"0.88rem",fontWeight:600,cursor:"pointer"}}>
                          📄 Question Report
                        </button>
                      </div>
                    </div>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </div>
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
              <div style={{padding:"0.75rem 1rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary}}>
                DOK PERFORMANCE BREAKDOWN
              </div>
              <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
                {dokData.map((d, i) => (
                  <div key={d.dok} style={{flex:1,minWidth:"160px",padding:"1rem 1.25rem",borderRight:i<dokData.length-1?`1px solid ${T.border}`:"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.5rem"}}>
                      <span style={{background:DOK_BG[d.dok],border:`1px solid ${DOK_COLORS[d.dok]}44`,borderRadius:T.xs,padding:"2px 8px",fontSize:"0.82rem",fontWeight:700,color:DOK_COLORS[d.dok]}}>
                        DOK {d.dok}
                      </span>
                      <span style={{fontSize:"0.88rem",color:T.textSecondary}}>{DOK_LABELS[d.dok]}</span>
                    </div>
                    <div style={{fontSize:"2rem",fontWeight:700,color:d.pct>=70?T.success:d.pct>=50?"#b8860b":T.dangerText,lineHeight:1}}>
                      {d.pct}%
                    </div>
                    <div style={{height:"6px",background:"#e8edf2",borderRadius:T.xs,margin:"0.4rem 0",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${d.pct}%`,background:d.pct>=70?T.success:d.pct>=50?"#f59e0b":T.dangerText,borderRadius:T.xs,transition:"width .4s"}}/>
                    </div>
                    <div style={{fontSize:"0.85rem",color:T.textSecondary}}>{d.correct}/{d.attempts} correct · {d.qs} question{d.qs!==1?"s":""}</div>
                  </div>
                ))}
              </div>
              {dokData.length >= 2 && (() => {
                const sorted = [...dokData].sort((a,b) => a.pct - b.pct);
                const weakest = sorted[0];
                const strongest = sorted[sorted.length-1];
                return (
                  <div style={{padding:"0.6rem 1.25rem",borderTop:`1px solid ${T.border}`,background:T.surface,display:"flex",gap:"1.5rem",flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.88rem",color:T.textSecondary}}>
                      💡 <strong>Insight:</strong> Students perform best on DOK {strongest.dok} ({strongest.pct}%) and struggle most on DOK {weakest.dok} ({weakest.pct}%).
                      {weakest.dok > 1 ? " Consider more scaffolding for higher-order thinking." : " Focus on foundational recall and fluency."}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden"}}>
            <div style={{padding:"0.75rem 1rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary}}>
              ITEM ANALYSIS — {itemData.length} questions attempted
            </div>
            {itemData.sort((a,b)=>a.pct-b.pct).map(q=>(()=>{
                // Compute answer distribution from session answers
                const dist = {};
                filteredTestSessions.forEach(s => {
                  const a = s.answers?.[q.id];
                  if (a != null && a !== "") dist[String(a)] = (dist[String(a)]||0) + 1;
                });
                const letters = ["A","B","C","D"];
                const hasDistrib = q.type === "mcq" && q.choices?.length > 0 && Object.keys(dist).length > 0;
                const isItemOpen = openItem === q.id;
                return (
                <React.Fragment key={q.id}>
                <div onClick={()=>q.missedBy.length>0&&setOpenItem(isItemOpen?null:q.id)} style={{padding:"0.65rem 1rem",borderBottom:`1px solid ${T.surfaceAlt}`,display:"flex",alignItems:"flex-start",gap:"0.75rem",cursor:q.missedBy.length>0?"pointer":"default",background:isItemOpen?T.surfaceAlt:T.white,transition:"background .15s"}}>
                  <div style={{width:"36px",textAlign:"right",fontSize:"0.9rem",fontWeight:700,color:q.pct>=70?T.success:q.pct>=50?T.warning:T.dangerText,flexShrink:0,paddingTop:"2px"}}>{q.pct}%</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",gap:"0.35rem",marginBottom:"2px",flexWrap:"wrap"}}>
                      <span style={{fontSize:"0.78rem",fontWeight:700,color:T.midnight,background:"rgba(13,148,136,.1)",padding:"2px 6px",borderRadius:"2px"}}>{q.standard}</span>
                      {q.dok&&<span style={{fontSize:"0.78rem",fontWeight:700,color:T.warning,background:"#fff3cd",padding:"2px 6px",borderRadius:"2px"}}>DOK {q.dok}</span>}
                      <span style={{fontSize:"0.78rem",color:T.textSecondary}}>{q.short}</span>
                    </div>
                    <div style={{height:"6px",background:"#e8edf2",borderRadius:T.xs,overflow:"hidden",marginBottom: hasDistrib?"6px":"0"}}>
                      <div style={{height:"100%",width:`${q.pct}%`,background:q.pct>=70?T.success:q.pct>=50?"#f59e0b":T.dangerText,borderRadius:T.xs,transition:"width .3s"}}/>
                    </div>
                    {hasDistrib && (
                      <div style={{display:"flex",gap:"4px"}}>
                        {letters.map((ltr,li) => {
                          const count = dist[ltr] || 0;
                          const pct   = q.attempted ? Math.round(count/q.attempted*100) : 0;
                          const isCor = ltr === q.correct;
                          return (
                            <div key={ltr} style={{flex:1,minWidth:0}}>
                              <div style={{height:"20px",background:"#f0f4f8",borderRadius:"2px",overflow:"hidden",position:"relative"}}>
                                <div style={{position:"absolute",bottom:0,left:0,right:0,height:`${pct}%`,background:isCor?T.success:"#e57373",opacity:0.85,transition:"height .3s"}}/>
                                <div style={{position:"absolute",top:"50%",left:0,right:0,transform:"translateY(-50%)",textAlign:"center",fontSize:"0.72rem",fontWeight:700,color:isCor?T.success:"#b71c1c",zIndex:1}}>{pct>0?`${pct}%`:""}</div>
                              </div>
                              <div style={{textAlign:"center",fontSize:"0.72rem",fontWeight:700,color:isCor?T.success:T.textMuted,marginTop:"1px"}}>{ltr}{isCor?"✓":""}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:"0.85rem",color:T.textSecondary,flexShrink:0,paddingTop:"2px",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"2px"}}>
                    <span>{q.correctCount}/{q.attempted}</span>
                    {q.missedBy.length>0&&<span style={{fontSize:"0.8rem",color:T.textMuted}}>{isItemOpen?"▲":"▼"}</span>}
                  </div>
                </div>
                {isItemOpen && q.missedBy.length>0 && (
                  <div style={{padding:"0.65rem 1rem 0.75rem 3.5rem",background:T.surface,borderBottom:`1px solid ${T.surfaceAlt}`}}>
                    {regradeResult?.questionId===q.id && (
                      <div style={{marginBottom:"0.6rem",padding:"8px 12px",background:T.successBg,border:`1px solid ${T.successBd}`,borderRadius:T.xs,fontSize:"0.82rem",fontWeight:700,color:T.success}}>
                        ✓ Correction saved — grades updated for {regradeResult.updatedSessions} student{regradeResult.updatedSessions!==1?"s":""}.
                      </div>
                    )}
                    {q.question && (
                      <div style={{fontSize:"0.8rem",color:T.text,marginBottom:"0.5rem",lineHeight:1.4}}>
                        <MathText text={q.question}/>
                      </div>
                    )}
                    {q.questionImage && (
                      <img src={q.questionImage} alt="" style={{maxHeight:"160px",maxWidth:"100%",borderRadius:"4px",border:`1px solid ${T.border}`,marginBottom:"0.5rem",display:"block"}}/>
                    )}
                    <div style={{fontSize:"0.8rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary,marginBottom:"0.45rem"}}>
                      MISSED BY — {q.missedBy.length} student{q.missedBy.length!==1?"s":""}
                    </div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:"0.35rem"}}>
                      {q.missedBy.map((m,mi)=>(
                        <div key={mi} style={{display:"flex",alignItems:"center",gap:"4px",background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,padding:"4px 10px",fontSize:"0.85rem"}}>
                          <span style={{fontWeight:600,color:T.midnight}}>{m.name}</span>
                          {m.answerLabel&&<span style={{fontWeight:700,color:T.dangerText,background:T.white,border:`1px solid ${T.dangerBd}`,borderRadius:"2px",padding:"0 4px",fontSize:"0.8rem"}}>{m.answerLabel}</span>}
                        </div>
                      ))}
                    </div>
                    {q.choices?.length>0 && (
                      <div style={{marginTop:"0.75rem",paddingTop:"0.65rem",borderTop:`1px solid ${T.surfaceAlt}`}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.45rem"}}>
                          <div style={{fontSize:"0.8rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary}}>ANSWER CHOICES</div>
                          <button onClick={e=>{e.stopPropagation();setPendingCorrect((q.type==="multiselect"||Array.isArray(q.answer))?(Array.isArray(q.answer)?[...q.answer]:[]):q.correct);setRegradeModalError("");setRegradeModalQ(q);}}
                            style={{fontSize:"0.85rem",fontWeight:700,background:T.midnight,color:T.white,border:"none",borderRadius:T.xs,padding:"6px 14px",cursor:"pointer"}}>
                            Correct the Answer
                          </button>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                          {q.choices.map((ch,ci)=>{
                            const ltr=["A","B","C","D"][ci]||String(ci+1);
                            const isCorrect=(q.type==="multiselect"||Array.isArray(q.answer))?(Array.isArray(q.answer)?q.answer.includes(ch):false):String(ch)===String(q.correct);
                            const count=dist[String(ch)]||0;
                            const pct=q.attempted?Math.round(count/q.attempted*100):0;
                            return (
                              <div key={ci} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"6px 8px",
                                background:isCorrect?"rgba(16,185,129,.10)":"transparent",
                                border:isCorrect?`2px solid ${T.success}`:`1px solid ${T.border}`,
                                borderRadius:T.xs}}>
                                <div style={{width:"22px",fontWeight:700,fontSize:"0.88rem",color:isCorrect?T.success:T.textSecondary,flexShrink:0}}>{ltr}</div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:"0.9rem",color:T.text,marginBottom:"2px"}}><MathText text={ch}/></div>
                                  <div style={{height:"6px",background:"#e8edf2",borderRadius:"3px",overflow:"hidden"}}>
                                    <div style={{height:"100%",width:`${pct}%`,background:isCorrect?T.success:pct>30?T.dangerText:"#94a3b8",borderRadius:"3px",transition:"width .3s"}}/>
                                  </div>
                                </div>
                                <div style={{fontSize:"0.85rem",fontWeight:700,color:isCorrect?T.success:T.textSecondary,flexShrink:0,minWidth:"48px",textAlign:"right"}}>{count} ({pct}%)</div>
                                {isCorrect&&<span style={{fontSize:"0.85rem",flexShrink:0}}>✓</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </React.Fragment>
                );
            })())}
          </div>
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
      // ── helpers scoped to growth tab ──
      (() => {
        // First session date per code — used for default chronological sort when adding
        const codeFirstDate = {};
        testSessions.forEach(s => {
          const c = s.testCode || "";
          if (c && (!codeFirstDate[c] || s.submitted < codeFirstDate[c])) codeFirstDate[c] = s.submitted;
        });

        function toggleGrowthCode(code) {
          setGrowthTestCodes(prev => {
            if (prev.includes(code)) return prev.filter(c => c !== code);
            // Insert in chronological order
            const next = [...prev, code];
            next.sort((a, b) => (codeFirstDate[a]||"").localeCompare(codeFirstDate[b]||""));
            return next;
          });
        }
        function moveCode(idx, dir) {
          setGrowthTestCodes(prev => {
            const arr = [...prev];
            const swap = idx + dir;
            if (swap < 0 || swap >= arr.length) return prev;
            [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
            return arr;
          });
        }

        // Active codes: if teacher has selected some, use those; else use all (sorted by first date)
        const activeCodes = growthTestCodes.length > 0
          ? growthTestCodes
          : [...testCodes].sort((a,b) => (codeFirstDate[a]||"").localeCompare(codeFirstDate[b]||""));

        // Per-student sessions filtered + ordered by activeCodes
        const growthStudentMap = {};
        Object.entries(studentMap).forEach(([key, st]) => {
          const sessMap = {};
          st.sessions.forEach(s => { const c = s.testCode||""; if (!sessMap[c] || s.submitted > sessMap[c].submitted) sessMap[c] = s; });
          const ordered = activeCodes.map(c => sessMap[c] || null);
          growthStudentMap[key] = { ...st, ordered, sessMap };
        });

      return (
        <div style={{maxWidth:"960px"}}>
          {/* Filter bar */}
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",padding:"0.85rem 1.25rem",marginBottom:"1rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",alignItems:"center"}}>
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
            {/* Test picker */}
            <div>
              <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.4rem"}}>
                TESTS TO COMPARE <span style={{fontWeight:400,opacity:.7}}>— select and order the tests that define this growth window</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"0.5rem"}}>
                {testCodes.map(c => {
                  const on = growthTestCodes.includes(c);
                  return (
                    <button key={c} onClick={()=>toggleGrowthCode(c)}
                      style={{padding:"3px 10px",border:`1px solid ${on?"#1565c0":"#c8d3dd"}`,borderRadius:"20px",
                        background:on?"#1565c0":"#fff",color:on?"#fff":T.textSecondary,
                        fontSize:"0.72rem",fontWeight:on?700:400,cursor:"pointer",transition:"all .15s"}}>
                      {on && <span style={{marginRight:"4px",fontSize:"0.65rem"}}>✓</span>}
                      {testCodeNames[c]!==c ? `${testCodeNames[c]}` : c}
                    </button>
                  );
                })}
              </div>
              {/* Ordered selection with arrows */}
              {growthTestCodes.length > 0 && (
                <div style={{display:"flex",gap:"0.4rem",alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:"0.6rem",color:T.textSecondary,fontWeight:600}}>ORDER →</span>
                  {growthTestCodes.map((c, i) => (
                    <div key={c} style={{display:"flex",alignItems:"center",gap:"2px",background:"#e3f2fd",border:"1px solid #90caf9",borderRadius:"4px",padding:"2px 6px"}}>
                      <span style={{fontSize:"0.68rem",fontWeight:700,color:"#1565c0"}}>{i+1}. {testCodeNames[c]!==c?testCodeNames[c]:c}</span>
                      <button onClick={()=>moveCode(i,-1)} disabled={i===0} style={{background:"none",border:"none",cursor:i===0?"not-allowed":"pointer",color:"#1565c0",fontSize:"0.65rem",padding:"0 2px",opacity:i===0?0.3:1}}>◀</button>
                      <button onClick={()=>moveCode(i,1)} disabled={i===growthTestCodes.length-1} style={{background:"none",border:"none",cursor:i===growthTestCodes.length-1?"not-allowed":"pointer",color:"#1565c0",fontSize:"0.65rem",padding:"0 2px",opacity:i===growthTestCodes.length-1?0.3:1}}>▶</button>
                      <button onClick={()=>toggleGrowthCode(c)} style={{background:"none",border:"none",cursor:"pointer",color:"#888",fontSize:"0.6rem",padding:"0 1px"}}>✕</button>
                    </div>
                  ))}
                  <button onClick={()=>setGrowthTestCodes([])} style={{fontSize:"0.65rem",color:T.textSecondary,background:"none",border:"1px solid #ddd",borderRadius:"3px",padding:"2px 8px",cursor:"pointer"}}>Clear all</button>
                </div>
              )}
            </div>
          </div>

          {/* Cross-test comparison */}
          {!focusStudent && activeCodes.length >= 2 && (() => {
            const filtSess = growthClass === "all" ? testSessions : testSessions.filter(s => s.className === growthClass);
            const byCode = {};
            filtSess.forEach(s => {
              const c = s.testCode || "";
              if (!activeCodes.includes(c)) return;
              if (!byCode[c]) byCode[c] = { scores: [], count: 0 };
              byCode[c].scores.push(s.pct);
              byCode[c].count++;
            });
            const codes = activeCodes.filter(c => byCode[c]).map((c, i) => ({
              code: c, name: testCodeNames[c]||c, count: byCode[c].count,
              avg: Math.round(byCode[c].scores.reduce((a,b)=>a+b,0)/byCode[c].scores.length),
            }));
            if (codes.length < 2) return null;
            return (
              <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden",marginBottom:"0.5rem"}}>
                <div style={{padding:"0.75rem 1rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary}}>
                  {growthTestCodes.length > 0 ? "SELECTED TEST COMPARISON" : "TEST-BY-TEST COMPARISON"}
                </div>
                <div style={{display:"flex",gap:"0",padding:"0",flexWrap:"nowrap",overflowX:"auto"}}>
                  {codes.map((c, i) => {
                    const prev = i > 0 ? codes[i-1].avg : null;
                    const delta = prev != null ? c.avg - prev : null;
                    return (
                      <div key={c.code} style={{flex:1,minWidth:"90px",textAlign:"center",padding:"0.85rem 0.65rem",borderRight:i<codes.length-1?`1px solid ${T.border}`:"none",position:"relative"}}>
                        {i > 0 && <div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",fontSize:"0.75rem",color:T.border}}>→</div>}
                        <div style={{fontSize:"0.58rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary,marginBottom:"2px"}}>{c.name !== c.code ? c.name : c.code}</div>
                        <div style={{fontSize:"0.5rem",color:T.textMuted,marginBottom:"4px",fontFamily:"monospace"}}>{c.code}</div>
                        <div style={{fontSize:"1.5rem",fontWeight:700,color:lvlC(c.avg)}}>{c.avg}%</div>
                        <div style={{fontSize:"0.58rem",color:T.textMuted}}>{c.count} students</div>
                        {delta != null && (
                          <div style={{fontSize:"0.68rem",fontWeight:700,marginTop:"3px",
                            color:delta>0?T.success:delta<0?T.dangerText:T.textMuted}}>
                            {delta>0?"▲":delta<0?"▼":"—"}{Math.abs(delta)}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {focusStudent ? (
            <FocusStudentStats student={focusStudent} standardMasteryFn={standardMastery} bankQ={bankQ} lvlC={lvlC} lvlBg={lvlBg} lvlBd={lvlBd}/>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
              <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden"}}>
                {/* Column headers when tests are selected */}
                {growthTestCodes.length > 0 && (
                  <div style={{display:"grid",gridTemplateColumns:`1fr 120px ${growthTestCodes.map(()=>"64px").join(" ")} 56px 48px`,gap:0,padding:"0.5rem 1rem 0.5rem 1.25rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.58rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary,alignItems:"end"}}>
                    <div>STUDENT GROWTH — {filteredStudents.length} students</div>
                    <div style={{textAlign:"center"}}>TREND</div>
                    {growthTestCodes.map((c,i)=>(
                      <div key={c} style={{textAlign:"center",lineHeight:1.2}}>
                        <div style={{color:T.midnight}}>T{i+1}</div>
                        <div style={{fontWeight:400,opacity:.7,fontSize:"0.72rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60px"}}>{testCodeNames[c]!==c?testCodeNames[c]:c}</div>
                      </div>
                    ))}
                    <div style={{textAlign:"center"}}>ΔGROWTH</div>
                    <div style={{textAlign:"center"}}>AVG</div>
                  </div>
                )}
                {!growthTestCodes.length && (
                  <div style={{padding:"0.75rem 1rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary}}>
                    STUDENT GROWTH OVERVIEW — {filteredStudents.length} students
                  </div>
                )}
                {filteredStudents.map(([key, st])=>{
                  const gst = growthStudentMap[key];
                  // Scores to use: if tests selected, use ordered (non-null only for sparkline); else all sessions
                  const orderedScores = growthTestCodes.length > 0
                    ? (gst?.ordered||[]).map(s=>s?s.pct:null)
                    : st.sessions.map(s=>s.pct);
                  const validScores = orderedScores.filter(v=>v!=null);
                  const first = validScores[0]; const last = validScores[validScores.length-1];
                  const delta = validScores.length>=2 ? last-first : null;
                  const avg = validScores.length ? Math.round(validScores.reduce((a,b)=>a+b,0)/validScores.length) : 0;
                  const mastery = standardMastery(st.sessions);
                  const weakStds = Object.entries(mastery).filter(([,v])=>v.total>=2&&v.correct/v.total<0.6).map(([std])=>std);
                  // Standard mastery deltas: first session vs last session (only when 2+ sessions)
                  const stdDeltas = {};
                  if (st.sessions.length >= 2) {
                    const first = standardMastery([st.sessions[0]]);
                    const last  = standardMastery([st.sessions[st.sessions.length-1]]);
                    Object.keys(mastery).forEach(std => {
                      const f = first[std], l = last[std];
                      if (f?.total && l?.total) stdDeltas[std] = Math.round(l.correct/l.total*100) - Math.round(f.correct/f.total*100);
                    });
                  }
                  return (
                    <div key={key} style={{borderBottom:`1px solid ${T.surfaceAlt}`}}>
                    <div onClick={()=>setGrowthStudent(key)}
                      style={{padding:"0.65rem 1rem 0.65rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem",cursor:"pointer",background:"#fff"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.88rem",fontWeight:700,color:T.text}}>{st.name}</div>
                        {st.className&&<div style={{fontSize:"0.65rem",color:T.textMuted}}>{st.className}</div>}
                      </div>
                      <div style={{flexShrink:0,width:"120px"}}>
                        <LineChart points={validScores} width={120} height={36} color={delta>0?T.success:delta<0?T.dangerText:T.textMuted}/>
                      </div>
                      {/* Per-test score cells when tests selected */}
                      {growthTestCodes.length > 0 && (gst?.ordered||[]).map((s,i)=>(
                        <div key={i} style={{width:"64px",textAlign:"center",flexShrink:0}}>
                          {s ? (
                            <div style={{fontSize:"0.82rem",fontWeight:700,color:lvlC(s.pct)}}>{s.pct}%</div>
                          ) : (
                            <div style={{fontSize:"0.72rem",color:T.textMuted}}>—</div>
                          )}
                        </div>
                      ))}
                      <div style={{display:"flex",gap:"0.6rem",flexShrink:0}}>
                        {delta!==null&&(
                          <div style={{textAlign:"center",minWidth:"44px"}}>
                            {growthTestCodes.length===0&&<div style={{fontSize:"0.55rem",color:T.textMuted}}>ΔGROWTH</div>}
                            <div style={{fontSize:"0.9rem",fontWeight:700,color:delta>0?T.success:delta<0?T.dangerText:T.textMuted}}>{delta>0?"+":""}{delta}%</div>
                          </div>
                        )}
                        <div style={{textAlign:"center",minWidth:"36px"}}>
                          {growthTestCodes.length===0&&<div style={{fontSize:"0.55rem",color:T.textMuted}}>AVG</div>}
                          <div style={{fontSize:"0.9rem",fontWeight:700,color:lvlC(avg)}}>{avg}%</div>
                        </div>
                      </div>
                      <span style={{color:T.borderDark,fontSize:"0.8rem"}}>▶</span>
                    </div>
                    {weakStds.length>0&&(
                      <div style={{padding:"0.4rem 1.25rem 0.5rem",background:T.dangerBg,display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"}}>
                        <span style={{fontSize:"0.58rem",fontWeight:700,color:T.dangerText,letterSpacing:"0.1em"}}>NEEDS RETEACH:</span>
                        {weakStds.map(std=>{
                          const d = stdDeltas[std];
                          return (
                            <span key={std} style={{fontSize:"0.62rem",fontWeight:700,color:T.dangerText,background:T.white,padding:"1px 6px",borderRadius:"2px",border:`1px solid ${T.dangerBd}`,display:"inline-flex",alignItems:"center",gap:"2px"}}>
                              {std}
                              {d != null && <span style={{fontWeight:800,color:d>5?T.success:d<-5?T.dangerText:"#888"}} title={`${d>0?"+":""}${d}% since first test`}>{d>5?"▲":d<-5?"▼":"→"}</span>}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
      })();
    }

    if (tab === "drills") {
      const hasFluency = fluencyReport.some(c => c.students.some(s => s.sessionCount > 0 || s.personalBests?.bestAccuracy > 0));
      const hasRosterStudents = roster.some(c => (c.students || []).length > 0);
      if (drillSessions.length === 0 && !hasFluency && !hasRosterStudents) return (
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
                <div style={{fontSize:"0.78rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary,marginBottom:"4px"}}>{lbl.toUpperCase()}</div>
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
                  <div style={{fontSize:"0.72rem",color:"#555",background:"#f0f4f8",borderRadius:"3px",padding:"1px 5px",fontWeight:600}}>Lvl {s.avgLevel}</div>
                  <div style={{fontWeight:700,fontSize:"0.88rem",color:"#1a6e2e",minWidth:"44px",textAlign:"right"}}>{s.bestAccuracy}%</div>
                </div>
              ))}
            </div>
          ))}

          {/* Fluency Levels per class */}
          {fluencyReport.filter(c => c.students.some(s => s.sessionCount > 0 || s.personalBests?.bestAccuracy > 0)).map(cls => (
            <div key={cls.classId} style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
              <div style={{padding:"0.75rem 1rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>FLUENCY LEVELS — {cls.className.toUpperCase()}</span>
                <button onClick={() => setParentReportId({classId: cls.classId})}
                  style={{background:T.teal,color:"#fff",border:"none",borderRadius:T.xs,padding:"3px 10px",fontSize:"0.65rem",fontWeight:700,cursor:"pointer",letterSpacing:"normal"}}>
                  🖨️ Print All Reports
                </button>
              </div>
              <div style={{overflowX:"auto"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr repeat(4,48px) 4px repeat(4,48px) 46px 42px 52px 42px 36px 36px 36px",gap:0,fontSize:"0.68rem",minWidth:"740px"}}>
                {/* ── header row ── */}
                <div style={{padding:"0.5rem 0.75rem",fontWeight:700,color:T.textSecondary,borderBottom:`2px solid ${T.border}`}}>Student</div>
                {["Add","Sub","Mul","Div"].map(op=>(
                  <div key={`lvl-${op}`} style={{padding:"0.5rem 0.15rem",fontWeight:700,color:T.textSecondary,textAlign:"center",borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>{op}<br/><span style={{fontWeight:400,fontSize:"0.5rem",color:T.textMuted}}>lvl</span></div>
                ))}
                <div style={{borderBottom:`2px solid ${T.border}`}}/>
                {["Add","Sub","Mul","Div"].map(op=>(
                  <div key={`acc-${op}`} style={{padding:"0.5rem 0.15rem",fontWeight:700,color:T.textSecondary,textAlign:"center",borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>{op}<br/><span style={{fontWeight:400,fontSize:"0.5rem",color:T.textMuted}}>acc</span></div>
                ))}
                <div style={{padding:"0.5rem 0.15rem",fontWeight:700,color:T.textSecondary,textAlign:"center",borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>Drills</div>
                <div style={{padding:"0.5rem 0.15rem",fontWeight:700,color:T.textSecondary,textAlign:"center",borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>Best<br/><span style={{fontWeight:400,fontSize:"0.5rem",color:T.textMuted}}>PPM</span></div>
                <div style={{padding:"0.5rem 0.15rem",fontWeight:700,color:T.textSecondary,textAlign:"center",borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>Avg %</div>
                <div style={{padding:"0.5rem 0.15rem",fontWeight:700,color:T.textSecondary,textAlign:"center",borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>Trend</div>
                <div style={{padding:"0.5rem 0.15rem",fontWeight:700,color:T.textSecondary,textAlign:"center",borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>⭐<br/><span style={{fontWeight:400,fontSize:"0.5rem",color:T.textMuted}}>best</span></div>
                <div style={{padding:"0.5rem 0.15rem",fontWeight:700,color:T.textSecondary,textAlign:"center",borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>Rpt</div>
                <div style={{padding:"0.5rem 0.15rem",fontWeight:700,color:T.textSecondary,textAlign:"center",borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>Rst</div>

                {/* ── data rows ── */}
                {cls.students.filter(s => s.sessionCount > 0).map(s => {
                  const oa = s.opAvgs || {};
                  return (
                  <React.Fragment key={s.student.id}>
                    <div style={{padding:"0.45rem 0.75rem",borderBottom:`1px solid ${T.surfaceAlt}`,fontWeight:600,color:T.text,display:"flex",alignItems:"center",gap:"0.4rem"}}>
                      {s.student.name}
                      {(s.streakDays||0) >= 1 && <span title={`${s.streakDays}-day streak`} style={{fontSize:"0.65rem",background:"#fff3e0",border:"1px solid #ffcc80",borderRadius:"3px",padding:"0px 4px"}}>🔥{s.streakDays}d</span>}
                    </div>
                    {["add","sub","mul","div"].map(op=>(
                      <div key={`lvl-${op}`} style={{padding:"0.45rem 0.15rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`,fontWeight:700,
                        color:s.levels[op]>=8?T.success:s.levels[op]>=5?T.warning:T.textMuted}}>{s.levels[op]}</div>
                    ))}
                    <div style={{borderBottom:`1px solid ${T.surfaceAlt}`,background:T.border,width:"1px"}}/>
                    {["add","sub","mul","div"].map(op=>{
                      const v = oa[op];
                      return (
                        <div key={`acc-${op}`} style={{padding:"0.45rem 0.15rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`,fontWeight:600,fontSize:"0.62rem",
                          color:v==null?T.textMuted:v>=80?T.success:v>=60?T.warning:T.dangerText}}>{v!=null?`${v}%`:"—"}</div>
                      );
                    })}
                    <div style={{padding:"0.45rem 0.15rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`,color:T.textMuted}}>{s.sessionCount}</div>
                    <div style={{padding:"0.45rem 0.15rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`,fontWeight:600,fontSize:"0.62rem",color:T.textSecondary}}>{s.personalBests?.bestPPM != null ? Math.round(s.personalBests.bestPPM) : "—"}</div>
                    <div style={{padding:"0.45rem 0.15rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`,fontWeight:700,
                      color:s.avgAccuracy>=80?T.success:s.avgAccuracy>=60?T.warning:T.dangerText}}>{s.avgAccuracy}%</div>
                    <div style={{padding:"0.45rem 0.15rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`,fontSize:"0.85rem"}}>
                      {s.trend === "improving" ? "📈" : s.trend === "declining" ? "📉" : "➡️"}
                    </div>
                    <div style={{padding:"0.45rem 0.15rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`,fontSize:"0.72rem",color:"#c67c00",fontWeight:700,letterSpacing:"-1px"}}>
                      {s.personalBests?.bestStars != null ? "★".repeat(s.personalBests.bestStars) : "—"}
                    </div>
                    <div style={{padding:"0.3rem 0.15rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`,display:"flex",flexDirection:"column",gap:"2px",alignItems:"center"}}>
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
                      <button
                        onClick={() => setDiagStudentId({id:s.student.id, name:s.student.name})}
                        title="Diagnose student"
                        style={{
                          background:"#e3f2fd", border:"1px solid #90caf9",
                          borderRadius:6, padding:"2px 6px", cursor:"pointer",
                          fontSize:"0.6rem", fontWeight:700, color:"#1565c0",
                        }}
                      >
                        🔍
                      </button>
                    </div>
                    <div style={{padding:"0.3rem 0.15rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`}}>
                      <button
                        onClick={async () => { if (!window.confirm(`Reset fluency data for ${s.student.name}?`)) return; const r = await fetch(`${API}/fluency/student/${s.student.id}`, {method:"DELETE"}); if (!r.ok) console.error(`DELETE /fluency/student/${s.student.id} failed:`, r.status); refresh(); }}
                        title="Reset fluency data"
                        style={{
                          background: T.dangerBg, border: `1px solid ${T.dangerBd}`,
                          borderRadius: 6, padding:"2px 5px", cursor:"pointer",
                          fontSize:"0.6rem", fontWeight:700, color:T.dangerText,
                        }}
                      >
                        ↺
                      </button>
                    </div>
                  </React.Fragment>
                  );
                })}
              </div>
            </div>
            </div>
          ))}

          {/* ── Practice Sessions (Mul/Div + Fractions) ── */}
          {(()=>{
            // All students across all classes in the roster
            const allRosterStudents = roster.flatMap(c => (c.students||[]).map(s=>({...s, className:c.name, classId:c.id})));
            const rosterNames = new Set(allRosterStudents.map(s => s.name));
            // Map name → full student object (for force-submit)
            const rosterByName = Object.fromEntries(allRosterStudents.map(s => [s.name, s]));

            // Today's midnight for "submitted today" check
            const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);

            // Force-submit a zero-score session for a student who never started
            async function forceSubmitStudent(studentInfo, code, title) {
              if (!window.confirm(`Record "${studentInfo.name}" as absent/did not participate for ${title}?\n\nThis will submit a 0-score session on their behalf.`)) return;
              try {
                await fetch(`${API}/submit`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    studentId:   studentInfo.id   || "",
                    studentName: studentInfo.name || "",
                    classId:     studentInfo.classId  || "",
                    className:   studentInfo.className || "",
                    testCode:    code,
                    testTitle:   title,
                    score:       0,
                    total:       0,
                    pct:         0,
                    mode:        "practice",
                    inClass:     true,
                    submitted:   new Date().toISOString(),
                    timeUsed:    "",
                    answers:     { note: { question: "No participation recorded by teacher", standard: "N/A", tier: "easy", chosen: "—", correct: "—", isCorrect: false, timeMs: 0 } },
                    questionTimes: [],
                  }),
                });
                await refreshSessions();
              } catch(e) { alert("Could not record session: " + e.message); }
            }

            function PracticeTable({ code, title, icon, headerColor, sessions: sess, masteryGoal }) {
              // Last 3 sessions per student, sorted newest-first
              const byStudent = {};
              sess.forEach(s => {
                const name = s.studentName || s.name || "Unknown";
                if (!byStudent[name]) byStudent[name] = [];
                byStudent[name].push(s);
              });
              Object.keys(byStudent).forEach(name => {
                byStudent[name].sort((a, b) =>
                  new Date(b.submittedAt || b.submitted || 0) - new Date(a.submittedAt || a.submitted || 0)
                );
                byStudent[name] = byStudent[name].slice(0, 3);
              });
              const submitted = Object.values(byStudent).map(arr => arr[0]);

              // Class avg for in-class sessions submitted today
              const todayInClass = submitted.filter(s => {
                const sub = new Date(s.submittedAt || s.submitted || 0);
                return s.inClass && sub >= todayMidnight;
              });
              const classAvgScore = todayInClass.length > 0
                ? Math.round(todayInClass.reduce((a, s) => a + (s.pct || 0), 0) / todayInClass.length)
                : null;

              // Not-submitted students (in roster but no session today for this code)
              const submittedNames = new Set(Object.keys(byStudent));
              const notSubmitted = rosterNames.size > 0
                ? [...rosterNames].filter(n => !submittedNames.has(n)).sort().map(n => rosterByName[n] || { name: n })
                : [];

              const BANDS = [
                { min: 90, label: 'Distinguished', color: '#059669' },
                { min: 75, label: 'Proficient',    color: '#0d9488' },
                { min: 60, label: 'Approaching',   color: '#d97706' },
                { min: 0,  label: 'Beginning',     color: '#dc2626' },
              ];
              const band = p => BANDS.find(b => p >= b.min) || BANDS[BANDS.length - 1];

              if (submitted.length === 0 && notSubmitted.length === 0) return null;

              return (
                <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden"}}>
                  <div style={{padding:"0.75rem 1rem",background:headerColor,borderBottom:`1px solid ${T.border}`,
                    fontSize:"0.82rem",fontWeight:700,letterSpacing:"0.08em",color:"#0369a1",
                    display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"}}>
                    <span>{icon} {title} — {submitted.length} submitted</span>
                    {notSubmitted.length > 0 && (
                      <span style={{fontWeight:600,color:"#b45309",fontSize:"0.75rem"}}>
                        · {notSubmitted.length} not yet submitted
                      </span>
                    )}
                    {classAvgScore !== null && (
                      <span style={{marginLeft:"auto",fontSize:"0.75rem",fontWeight:600,color:"#0369a1"}}>
                        Class avg: {classAvgScore}%
                        {masteryGoal != null && (
                          <span style={{color: classAvgScore >= masteryGoal ? '#059669' : '#d97706', marginLeft:"0.4rem"}}>
                            · Goal: {masteryGoal}% {classAvgScore >= masteryGoal ? '✓' : ''}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Submitted students — latest + up to 2 prior attempts */}
                  {Object.entries(byStudent).sort(([,a],[,b])=>(b[0].pct||0)-(a[0].pct||0)).map(([name,attempts],i)=>{
                    const s = attempts[0];
                    const p = s.pct ?? Math.round(((s.score||0)/(s.total||1))*100);
                    const b = band(p);
                    const subDate = new Date(s.submittedAt || s.submitted || 0);
                    const timeStr = subDate.getTime() > 0
                      ? subDate.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})
                      : "";
                    const trend = attempts.length >= 2
                      ? (p > (attempts[1].pct||0) ? "↑" : p < (attempts[1].pct||0) ? "↓" : "—")
                      : "";
                    const trendColor = trend === "↑" ? "#059669" : trend === "↓" ? "#dc2626" : T.textMuted;
                    return (
                      <React.Fragment key={i}>
                        <div style={{padding:"0.55rem 1rem",borderBottom:`1px solid ${T.surfaceAlt}`,
                          display:"flex",alignItems:"center",gap:"0.6rem"}}>
                          <span style={{color:"#059669",fontWeight:700,fontSize:"0.85rem",minWidth:16}}>✓</span>
                          {trend && <span style={{color:trendColor,fontWeight:700,fontSize:"0.85rem",minWidth:14}}>{trend}</span>}
                          <div style={{flex:1,fontSize:"0.88rem",fontWeight:600,color:T.text}}>{name}</div>
                          <div style={{fontSize:"0.72rem",color:s.inClass?"#059669":T.textMuted}}>
                            {s.inClass?"🏫":"🏠"}
                          </div>
                          {timeStr && <div style={{fontSize:"0.72rem",color:T.textMuted}}>{timeStr}</div>}
                          <div style={{fontSize:"0.82rem",color:T.textSecondary,minWidth:50,textAlign:"right"}}>
                            {s.score}/{s.total} pts
                          </div>
                          <div style={{fontSize:"0.82rem",fontWeight:700,color:b.color,minWidth:80,textAlign:"right"}}>
                            {b.label}
                          </div>
                          <button onClick={()=>setPracticeReport({session:s,classAvgScore,todayInClass,title})}
                            style={{background:"transparent",border:`1px solid ${T.border}`,
                              borderRadius:4,padding:"2px 7px",fontSize:"0.72rem",cursor:"pointer",
                              color:T.textSecondary,fontFamily:"inherit",flexShrink:0}}
                            title="Parent report">
                            📄
                          </button>
                        </div>
                        {attempts.slice(1).map((prev, j) => {
                          const pp = prev.pct ?? Math.round(((prev.score||0)/(prev.total||1))*100);
                          const pb = band(pp);
                          const pd = new Date(prev.submittedAt || prev.submitted || 0);
                          return (
                            <div key={j} style={{padding:"0.3rem 1rem 0.3rem 2.5rem",borderBottom:`1px solid ${T.surfaceAlt}`,
                              display:"flex",alignItems:"center",gap:"0.6rem",background:"#fafafa"}}>
                              <div style={{flex:1,fontSize:"0.72rem",color:T.textMuted}}>
                                {pd.getTime() > 0 ? pd.toLocaleDateString([],{month:"short",day:"numeric"}) : "prior"}
                              </div>
                              <div style={{fontSize:"0.72rem",color:T.textSecondary}}>{prev.score}/{prev.total} pts</div>
                              <div style={{fontSize:"0.72rem",fontWeight:600,color:pb.color,minWidth:80,textAlign:"right"}}>{pb.label}</div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}

                  {/* Not-submitted students */}
                  {notSubmitted.map((student,i)=>(
                    <div key={i} style={{padding:"0.55rem 1rem",borderBottom:`1px solid ${T.surfaceAlt}`,
                      display:"flex",alignItems:"center",gap:"0.6rem",background:"#fafafa"}}>
                      <span style={{color:"#d1d5db",fontWeight:700,fontSize:"0.85rem",minWidth:16}}>✗</span>
                      <div style={{flex:1,fontSize:"0.88rem",color:T.textMuted}}>{student.name}</div>
                      <div style={{fontSize:"0.78rem",color:T.textMuted,fontStyle:"italic"}}>Did not start</div>
                      <button
                        onClick={()=>forceSubmitStudent(student, code, title)}
                        title="Record as absent / did not participate"
                        style={{background:"transparent",border:`1px solid #e5e7eb`,borderRadius:4,
                          padding:"2px 8px",fontSize:"0.72rem",cursor:"pointer",color:"#9ca3af",
                          fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}
                      >
                        ⚑ Record absent
                      </button>
                    </div>
                  ))}
                </div>
              );
            }

            const mulDivSessions = practiceSessions.filter(s => (s.testCode||"").toUpperCase() === "NR2PRAC");
            const fracSessions   = practiceSessions.filter(s => (s.testCode||"").toUpperCase() === "NR3PRAC");
            const mulDivGoal = (() => {
              const cid = mulDivSessions[0]?.classId;
              return roster.find(c => c.id === cid)?.practiceMasteryGoal ?? null;
            })();
            const fracGoal = (() => {
              const cid = fracSessions[0]?.classId;
              return roster.find(c => c.id === cid)?.practiceMasteryGoal ?? null;
            })();

            return (
              <>
                <PracticeTable
                  code="NR2PRAC"
                  title="MUL/DIV PRACTICE"
                  icon="✖÷"
                  headerColor="#f0f9ff"
                  sessions={mulDivSessions}
                  masteryGoal={mulDivGoal}
                />
                <PracticeTable
                  code="NR3PRAC"
                  title="FRACTIONS PRACTICE"
                  icon="½"
                  headerColor="#f5f3ff"
                  sessions={fracSessions}
                  masteryGoal={fracGoal}
                />
              </>
            );
          })()}
        </div>
      );
    }

    if (tab === "admin") {
      if (!adminData || !adminData.classes) return <div style={{textAlign:"center",color:T.textMuted,paddingTop:"3rem"}}>Loading school overview…</div>;
      const { classes, schoolGaps = [], totalStudents = 0, testedStudents = 0, totalSessions = 0 } = adminData;
      return (
        <div style={{maxWidth:"960px",display:"flex",flexDirection:"column",gap:"1rem"}}>
          {/* School-wide stat cards */}
          <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
            {[
              ["Total Students", totalStudents, T.midnight],
              ["Tested",         testedStudents, T.teal],
              ["Not Yet Tested", totalStudents - testedStudents, totalStudents - testedStudents > 0 ? T.warning : T.textMuted],
              ["Total Sessions", totalSessions, T.success],
            ].map(([lbl,val,c])=>(
              <div key={lbl} style={{background:T.white,border:`1px solid ${T.border}`,borderLeft:`3px solid ${c}`,borderRadius:T.xs,padding:"0.9rem 1.25rem",minWidth:"120px",flex:1}}>
                <div style={{fontSize:"0.78rem",fontWeight:700,letterSpacing:"0.08em",color:T.textSecondary,marginBottom:"4px"}}>{lbl.toUpperCase()}</div>
                <div style={{fontSize:"1.6rem",fontWeight:700,color:c}}>{val}</div>
              </div>
            ))}
          </div>

          {/* Class comparison table */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden"}}>
            <div style={{padding:"0.75rem 1rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary}}>
              CLASS COMPARISON — {classes.length} classes
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 70px 80px 50px",gap:0,fontSize:"0.72rem"}}>
              {["Class","Students","Tests","Drills","Avg Score",""].map(h=>(
                <div key={h} style={{padding:"0.5rem 0.75rem",fontWeight:700,color:T.textSecondary,borderBottom:`2px solid ${T.border}`,fontSize:"0.6rem"}}>{h}</div>
              ))}
              {classes.map(c=>(
                <React.Fragment key={c.id}>
                  <div style={{padding:"0.5rem 0.75rem",fontWeight:600,color:T.text,borderBottom:`1px solid ${T.surfaceAlt}`}}>{c.name}</div>
                  <div style={{padding:"0.5rem 0.75rem",textAlign:"center",color:T.textSecondary,borderBottom:`1px solid ${T.surfaceAlt}`}}>{c.studentCount}</div>
                  <div style={{padding:"0.5rem 0.75rem",textAlign:"center",color:T.textSecondary,borderBottom:`1px solid ${T.surfaceAlt}`}}>{c.sessionCount}</div>
                  <div style={{padding:"0.5rem 0.75rem",textAlign:"center",color:T.textSecondary,borderBottom:`1px solid ${T.surfaceAlt}`}}>{c.drillCount}</div>
                  <div style={{padding:"0.5rem 0.75rem",textAlign:"center",fontWeight:700,borderBottom:`1px solid ${T.surfaceAlt}`,
                    color:c.avgScore==null?T.textMuted:c.avgScore>=80?T.success:c.avgScore>=60?T.warning:T.dangerText}}>
                    {c.avgScore != null ? `${c.avgScore}%` : "—"}
                  </div>
                  <div style={{padding:"0.5rem 0.75rem",textAlign:"center",borderBottom:`1px solid ${T.surfaceAlt}`}}>
                    {c.sessionCount > 0 && (
                      <button onClick={async()=>{
                        if(!window.confirm(`Clear test scores for "${c.name}"? Drill data is kept. This cannot be undone.`)) return;
                        try {
                          const r = await fetch(`${API}/sessions/class/${c.id}`,{method:"DELETE",headers:teacherHeaders()});
                          if (!r.ok) console.error(`DELETE /sessions/class/${c.id} failed:`, r.status);
                          refresh();
                        } catch {}
                      }} title="Clear test data for this class"
                        style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.8rem",color:T.dangerText,padding:"2px 4px"}}>
                        🗑
                      </button>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* School-wide standard gaps */}
          {schoolGaps.length > 0 && (
            <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden"}}>
              <div style={{padding:"0.75rem 1rem",background:T.dangerBg,borderBottom:`1px solid ${T.dangerBd}`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.dangerText}}>
                SCHOOL-WIDE STANDARD GAPS — weakest first (min 5 attempts)
              </div>
              {schoolGaps.map((g,i)=>(
                <div key={i} style={{padding:"0.55rem 1rem",borderBottom:`1px solid ${T.surfaceAlt}`,display:"flex",alignItems:"center",gap:"0.75rem"}}>
                  <span style={{fontSize:"0.72rem",fontWeight:700,color:T.text,minWidth:"70px"}}>{g.standard}</span>
                  <div style={{flex:1,height:"8px",background:T.surfaceAlt,borderRadius:"4px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${g.pct}%`,borderRadius:"4px",
                      background:g.pct>=80?T.success:g.pct>=60?T.warning:T.danger}}/>
                  </div>
                  <span style={{fontSize:"0.72rem",fontWeight:700,minWidth:"38px",textAlign:"right",
                    color:g.pct>=80?T.success:g.pct>=60?T.warning:T.dangerText}}>{g.pct}%</span>
                  <span style={{fontSize:"0.6rem",color:T.textMuted}}>{g.total} attempts</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (tab === "gradebook") {
      // ── Build test columns: unique codes from test sessions, sorted by first submission ──
      const gbSessions = testSessions.filter(s => s.mode !== "drill" && s.mode !== "practice");
      // Class filter
      const gbClasses = roster.length > 0 ? roster : [];
      const gbFiltered = gbClass === "all" ? gbSessions : gbSessions.filter(s => s.classId === gbClass || s.className === gbClass);

      // Unique test codes ordered by earliest submission
      const codeOrder = [];
      const codeSeen = new Set();
      [...gbFiltered].sort((a,b) => new Date(a.submittedAt||0) - new Date(b.submittedAt||0)).forEach(s => {
        const c = s.testCode || s.code || "";
        if (c && !codeSeen.has(c)) { codeSeen.add(c); codeOrder.push(c); }
      });

      // Student rows: prefer roster, fall back to unique students in sessions
      let gbStudents = [];
      if (gbClass !== "all") {
        const cls = gbClasses.find(c => c.id === gbClass || c.name === gbClass);
        gbStudents = cls ? (cls.students || []).map(s => ({ id: s.id, name: s.name })) : [];
      } else {
        const seen = new Set();
        gbFiltered.forEach(s => {
          const id = s.studentId || s.studentName || "";
          if (!seen.has(id)) { seen.add(id); gbStudents.push({ id, name: s.studentName || id }); }
        });
      }
      gbStudents.sort((a,b) => a.name.localeCompare(b.name));

      // score lookup: studentId → testCode → pct (most recent)
      const scoreMap = {};
      [...gbFiltered].sort((a,b) => new Date(a.submittedAt||0) - new Date(b.submittedAt||0)).forEach(s => {
        const sid = s.studentId || s.studentName || "";
        const code = s.testCode || s.code || "";
        if (!scoreMap[sid]) scoreMap[sid] = {};
        scoreMap[sid][code] = s.pct ?? Math.round((s.score||0)/(s.total||1)*100);
      });

      // Per-column class average
      const colAvg = {};
      codeOrder.forEach(code => {
        const vals = gbStudents.map(st => scoreMap[st.id]?.[code]).filter(v => v !== undefined);
        colAvg[code] = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : null;
      });

      // Color helper
      const cellBg   = p => p >= 80 ? T.successBg  : p >= 60 ? T.warningBg  : T.dangerBg;
      const cellBd   = p => p >= 80 ? T.successBd  : p >= 60 ? T.warningBd  : T.dangerBd;
      const cellText = p => p >= 80 ? T.success     : p >= 60 ? T.warning    : T.danger;

      // CSV export
      function exportCSV() {
        const header = ["Student", ...codeOrder.map(c => testCodeNames[c] || c)];
        const rows = gbStudents.map(st => [
          st.name,
          ...codeOrder.map(c => scoreMap[st.id]?.[c] !== undefined ? scoreMap[st.id][c] + "%" : ""),
        ]);
        const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `gradebook${gbClass !== "all" ? "_" + gbClass : ""}.csv`;
        a.click();
      }

      if (codeOrder.length === 0) return (
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"3rem",textAlign:"center",color:T.textMuted,maxWidth:"600px"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📒</div>
          <div style={{fontSize:"1rem",fontWeight:600,color:T.textSecondary,marginBottom:"4px"}}>No test data yet</div>
          <div style={{fontSize:"0.82rem"}}>Gradebook populates once students submit tests.</div>
        </div>
      );

      const COL_W = 80;
      const NAME_W = 160;

      return (
        <div style={{display:"flex",flexDirection:"column",gap:"1rem",maxWidth:"100%"}}>
          {/* Toolbar */}
          <div style={{display:"flex",gap:"0.75rem",alignItems:"center",flexWrap:"wrap"}}>
            {gbClasses.length > 1 && (
              <select value={gbClass} onChange={e=>setGbClass(e.target.value)}
                style={{padding:"0.4rem 0.65rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.85rem",color:T.text,background:T.white}}>
                <option value="all">All Classes</option>
                {gbClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <button onClick={exportCSV}
              style={{background:T.teal,color:T.white,border:"none",borderRadius:T.xs,padding:"0.4rem 0.9rem",fontSize:"0.82rem",fontWeight:700,cursor:"pointer"}}>
              ⬇ Export CSV
            </button>
            <span style={{fontSize:"0.78rem",color:T.textMuted,marginLeft:"auto"}}>
              {gbStudents.length} students · {codeOrder.length} tests
            </span>
          </div>

          {/* Matrix */}
          <div style={{overflowX:"auto",background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,boxShadow:T.sm}}>
            <table style={{borderCollapse:"collapse",width:"max-content",minWidth:"100%",fontFamily:T.font,fontSize:"0.82rem"}}>
              <thead>
                {/* Test names row */}
                <tr>
                  <th style={{position:"sticky",left:0,zIndex:2,background:T.midnight,color:T.white,padding:"0.6rem 0.85rem",textAlign:"left",fontWeight:700,minWidth:NAME_W,borderRight:`2px solid ${T.borderDark}`}}>
                    Student
                  </th>
                  {codeOrder.map(code => (
                    <th key={code} style={{background:T.midnight,color:T.white,padding:"0.5rem 0.4rem",textAlign:"center",minWidth:COL_W,maxWidth:COL_W,fontWeight:600,borderRight:`1px solid rgba(255,255,255,0.1)`}}>
                      <div style={{fontSize:"0.65rem",opacity:0.6,marginBottom:"2px",letterSpacing:"0.05em"}}>{code}</div>
                      <div style={{fontSize:"0.75rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:COL_W-8}}>
                        {testCodeNames[code] || code}
                      </div>
                    </th>
                  ))}
                </tr>
                {/* Class average row */}
                <tr style={{background:T.surfaceAlt}}>
                  <td style={{position:"sticky",left:0,zIndex:2,background:T.surfaceAlt,padding:"0.45rem 0.85rem",fontWeight:700,fontSize:"0.72rem",letterSpacing:"0.07em",color:T.textSecondary,borderRight:`2px solid ${T.borderDark}`,borderBottom:`2px solid ${T.borderDark}`}}>
                    CLASS AVG
                  </td>
                  {codeOrder.map(code => {
                    const avg = colAvg[code];
                    return (
                      <td key={code} style={{padding:"0.45rem 0.4rem",textAlign:"center",borderRight:`1px solid ${T.border}`,borderBottom:`2px solid ${T.borderDark}`,fontWeight:700,color:avg !== null ? cellText(avg) : T.textMuted}}>
                        {avg !== null ? avg + "%" : "—"}
                      </td>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {gbStudents.map((st, i) => (
                  <tr key={st.id} style={{background: i%2===0 ? T.white : T.surface}}>
                    <td style={{position:"sticky",left:0,zIndex:1,background: i%2===0 ? T.white : T.surface,padding:"0.45rem 0.85rem",fontWeight:600,color:T.text,borderRight:`2px solid ${T.borderDark}`,whiteSpace:"nowrap"}}>
                      {st.name}
                    </td>
                    {codeOrder.map(code => {
                      const pct = scoreMap[st.id]?.[code];
                      return (
                        <td key={code} style={{padding:"0.3rem 0.4rem",textAlign:"center",borderRight:`1px solid ${T.border}`}}>
                          {pct !== undefined ? (
                            <span style={{display:"inline-block",padding:"2px 8px",borderRadius:"3px",background:cellBg(pct),border:`1px solid ${cellBd(pct)}`,color:cellText(pct),fontWeight:700,fontSize:"0.8rem"}}>
                              {pct}%
                            </span>
                          ) : (
                            <span style={{color:T.textMuted,fontSize:"0.75rem"}}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      {clearTestCode && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div style={{background:"#fff",borderRadius:"6px",maxWidth:"380px",width:"100%",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
            <div style={{background:"#7c3aed",color:"#fff",padding:"1.1rem 1.5rem"}}>
              <div style={{fontWeight:700,fontSize:"1rem"}}>🗑 Clear Test Data</div>
            </div>
            <div style={{padding:"1.25rem 1.5rem",fontSize:"0.88rem",color:"#444",lineHeight:1.6}}>
              Delete all sessions for <strong>{testCodeNames[clearTestCode]||clearTestCode}</strong> <span style={{fontFamily:"monospace",background:"#f0f4f8",padding:"1px 6px",borderRadius:"3px"}}>{clearTestCode}</span>?
              <br/><br/>
              <strong>{testSessions.filter(s=>(s.testCode||s.code||"").toUpperCase()===clearTestCode.toUpperCase()).length} session{testSessions.filter(s=>(s.testCode||s.code||"").toUpperCase()===clearTestCode.toUpperCase()).length!==1?"s":""}</strong> will be permanently removed. This cannot be undone.
            </div>
            {clearError && (
              <div style={{fontSize:"0.8rem",color:"#8b1a1a",background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",margin:"0 1.5rem",padding:"0.5rem 0.75rem"}}>
                ⚠ {clearError}
              </div>
            )}
            <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.5rem",borderTop:"1px solid #eee"}}>
              <button onClick={()=>{setClearTestCode(""); setClearError("");}}
                style={{flex:1,background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.55rem",fontSize:"0.85rem",cursor:"pointer",color:"#555",fontWeight:600}}>Cancel</button>
              <button onClick={()=>handleClearByTest(clearTestCode)} disabled={clearing}
                style={{flex:1,background:"#7c3aed",border:"none",borderRadius:"3px",padding:"0.55rem",fontSize:"0.85rem",cursor:"pointer",color:"#fff",fontWeight:700}}>
                {clearing?"Clearing…":"🗑 Delete Sessions"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                ...testCodes.map(c => [`test:${c}`, `Clear "${testCodeNames[c]||c}" (${c})`, `${testSessions.filter(s=>(s.testCode||s.code||"")===c).length} session${testSessions.filter(s=>(s.testCode||s.code||"")===c).length!==1?"s":""}`, "#7c3aed", "#f3f0ff"]),
                ["tests",   "Clear All Test Scores",          `${testSessions.length} test session${testSessions.length!==1?"s":""}`,  T.midnight,"rgba(13,148,136,.1)"],
                ["fluency", "Clear Fluency Drill Data",        "All fluency levels, streaks, and drill sessions",                      T.teal,    "rgba(13,148,136,.08)"],
                ["all",     "Clear Everything",                "All test scores + all fluency data",                                   T.dangerText, T.dangerBg],
              ].map(([mode, label, sub, c, bg]) => (
                <button key={mode} onClick={() => { if (mode.startsWith("test:")) { setClearModal(false); setClearTestCode(mode.slice(5)); } else handleClearMode(mode); }}
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

      {/* Correct the Answer modal */}
      {regradeModalQ && (
        <div onClick={()=>{if(!regradeLoading){setRegradeModalQ(null);setPendingCorrect(null);setRegradeModalError("");}}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:T.rl,width:"100%",maxWidth:"500px",overflow:"hidden",boxShadow:T.lg}}>
            <div style={{background:T.midnight,color:T.white,padding:"1.25rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:"1.15rem",fontWeight:800}}>Correct the Answer</div>
              <button disabled={regradeLoading} onClick={()=>{setRegradeModalQ(null);setPendingCorrect(null);setRegradeModalError("");}}
                style={{background:"rgba(255,255,255,.18)",border:"none",color:T.white,fontSize:"0.9rem",padding:"0.4rem 0.9rem",borderRadius:T.xs,cursor:"pointer",fontWeight:700}}>
                Cancel
              </button>
            </div>
            <div style={{padding:"1.25rem 1.5rem",borderBottom:`1px solid ${T.border}`,background:T.surface}}>
              <div style={{fontSize:"0.7rem",fontWeight:700,color:T.textSecondary,marginBottom:"0.5rem",letterSpacing:"0.08em"}}>THE QUESTION</div>
              <div style={{fontSize:"1rem",color:T.text,lineHeight:1.6,fontWeight:500}}><MathText text={regradeModalQ.question}/></div>
              {regradeModalQ.questionImage && (
                <img src={regradeModalQ.questionImage} alt=""
                  style={{maxWidth:"100%",maxHeight:"180px",marginTop:"0.75rem",borderRadius:T.xs,border:`1px solid ${T.border}`,display:"block"}}/>
              )}
            </div>
            {(() => {
              const isMulti = regradeModalQ.type === "multiselect" || Array.isArray(regradeModalQ.answer);
              const pendingArr = isMulti ? (Array.isArray(pendingCorrect) ? pendingCorrect : []) : null;
              const originalArr = isMulti ? (Array.isArray(regradeModalQ.answer) ? regradeModalQ.answer : []) : null;
              const hasChanged = isMulti
                ? JSON.stringify([...(pendingArr||[])].sort()) !== JSON.stringify([...(originalArr||[])].sort())
                : pendingCorrect && pendingCorrect !== regradeModalQ.correct;
              const isReady = isMulti ? (pendingArr?.length > 0 && hasChanged) : (pendingCorrect && hasChanged);
              return (
                <>
                  <div style={{padding:"1.1rem 1.5rem",display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                    <div style={{fontSize:"0.7rem",fontWeight:700,color:T.textSecondary,letterSpacing:"0.08em",marginBottom:"0.1rem"}}>
                      {isMulti ? "TAP ALL CORRECT ANSWERS" : "TAP THE CORRECT ANSWER"}
                    </div>
                    {isMulti && <div style={{fontSize:"0.75rem",color:T.textMuted,marginBottom:"0.2rem"}}>Select every answer that is correct.</div>}
                    {(regradeModalQ.choices||[]).map((ch,ci)=>{
                      const ltr=["A","B","C","D"][ci]||String(ci+1);
                      const isSelected = isMulti
                        ? (pendingArr||[]).includes(ch)
                        : String(ch)===String(pendingCorrect);
                      return (
                        <button key={ci} onClick={()=>{
                          if (regradeLoading) return;
                          if (isMulti) {
                            const cur = Array.isArray(pendingCorrect) ? [...pendingCorrect] : [];
                            setPendingCorrect(cur.includes(ch) ? cur.filter(x=>x!==ch) : [...cur, ch]);
                          } else {
                            setPendingCorrect(ch);
                          }
                        }}
                          style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.9rem 1.1rem",width:"100%",textAlign:"left",
                            background:isSelected?T.success:"#f8fafc",
                            border:isSelected?`2px solid ${T.success}`:`2px solid ${T.border}`,
                            borderRadius:T.r,cursor:regradeLoading?"default":"pointer",
                            transition:"all .12s",boxShadow:isSelected?"0 2px 8px rgba(16,185,129,.25)":"none"}}>
                          <div style={{width:"32px",height:"32px",borderRadius:isMulti?"4px":T.xs,flexShrink:0,
                            background:isSelected?"rgba(255,255,255,.25)":"#e2e8f0",
                            border:isMulti?(isSelected?`2px solid rgba(255,255,255,.6)`:`2px solid ${T.borderDark}`):"none",
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:"0.9rem",fontWeight:900,color:isSelected?T.white:T.textSecondary}}>
                            {ltr}
                          </div>
                          <div style={{flex:1,fontSize:"0.95rem",color:isSelected?T.white:T.text,fontWeight:isSelected?700:500,lineHeight:1.4}}>
                            <MathText text={ch}/>
                          </div>
                          {isSelected&&<span style={{fontSize:"1.1rem",flexShrink:0}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  {hasChanged && (
                    <div style={{margin:"0 1.5rem",padding:"0.85rem 1rem",background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:T.xs,fontSize:"0.88rem",color:"#92400e",lineHeight:1.5}}>
                      ⚠️ This will update the grades of <strong>{regradeModalQ.attempted} student{regradeModalQ.attempted!==1?"s":""}</strong> who took this question.
                    </div>
                  )}
                  {regradeModalError && (
                    <div style={{margin:"0.75rem 1.5rem 0",padding:"0.75rem 1rem",background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,fontSize:"0.88rem",fontWeight:600,color:T.dangerText}}>
                      ⚠ {regradeModalError}
                    </div>
                  )}
                  <div style={{padding:"1.1rem 1.5rem",marginTop:"0.5rem",borderTop:`1px solid ${T.border}`}}>
                    <button disabled={regradeLoading||!isReady}
                      onClick={()=>handleSaveRegrade(regradeModalQ)}
                      style={{width:"100%",background:T.success,border:"none",borderRadius:T.r,
                        padding:"1rem",fontSize:"1rem",fontWeight:800,
                        cursor:(regradeLoading||!isReady)?"default":"pointer",
                        color:T.white,opacity:(regradeLoading||!isReady)?0.4:1,
                        transition:"opacity .15s"}}>
                      {regradeLoading ? "Saving…" : "✓  Save Correction & Update Student Grades"}
                    </button>
                    {!isReady && !regradeLoading && (
                      <div style={{textAlign:"center",fontSize:"0.78rem",color:T.textMuted,marginTop:"0.6rem"}}>
                        {isMulti ? "Select at least one answer above to continue." : "Tap an answer above to continue."}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{background:T.midnight,display:"flex",alignItems:"flex-end",padding:"0 1.5rem",gap:"0.15rem",flexShrink:0}}>
        {TABS.map(([key,lbl])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{background:tab===key?T.surface:"transparent",color:tab===key?T.midnight:"rgba(255,255,255,.55)",border:"none",padding:"0.65rem 1.1rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer",borderRadius:"4px 4px 0 0",transition:"color .15s,background .15s"}}>
            {lbl}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"0.5rem",paddingBottom:"4px"}}>
          <div style={{fontSize:"0.8rem",color:"rgba(13,148,136,.4)",opacity:.7}}>{testSessions.length} tests · {drillSessions.length} drills · live</div>
          <button
            onClick={()=>generateClassReport(sessions, bankQ, growthClass).catch(e=>alert("Export failed: "+e.message))}
            disabled={sessions.length===0}
            style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.35)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:sessions.length===0?"not-allowed":"pointer",fontSize:"0.8rem",fontWeight:700,opacity:sessions.length===0?.4:1}}>
            📄 Export PDF
          </button>
          {!readOnly && (
          <button onClick={() => setClearModal(true)} disabled={clearing||sessions.length===0}
            style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",color:"#fecaca",borderRadius:"3px",padding:"4px 10px",cursor:sessions.length===0?"not-allowed":"pointer",fontSize:"0.8rem",opacity:sessions.length===0?.4:1}}>
            {clearing?"Clearing…":"🗑 Clear"}
          </button>
          )}
        </div>
      </div>

      <div style={{flex:1,padding:"1.25rem 1.5rem",overflowY:"auto"}}>
        {renderTab()}
      </div>

      {/* Practice parent report modal (Drills tab) */}
      {practiceReport && (
        <PracticeParentReport
          session={practiceReport.session}
          classAvgScore={practiceReport.classAvgScore}
          todayInClass={practiceReport.todayInClass}
          title={practiceReport.title}
          onClose={() => setPracticeReport(null)}
        />
      )}

      {/* Fluency parent report modal (Drills tab) */}
      {parentReportId && (
        <ParentReport
          studentId={typeof parentReportId === "string" ? parentReportId : undefined}
          classId={typeof parentReportId === "object" ? parentReportId.classId : undefined}
          onClose={() => setParentReportId(null)}
        />
      )}
      {/* Test score parent report modal (Overview tab) */}
      {testReportData && (
        <TestParentReport
          session={testReportData.session}
          fullStudent={testReportData.fullStudent}
          stds={testReportData.stds}
          className={testReportData.className}
          teacherName={teacher?.name || ""}
          onClose={() => setTestReportData(null)}
        />
      )}
      {diagStudentId && (
        <StudentDiagnostic
          studentId={diagStudentId.id}
          studentName={diagStudentId.name}
          onClose={() => setDiagStudentId(null)}
        />
      )}
      {questionReportSession && (
        <StudentQuestionReport
          session={questionReportSession}
          bankQ={bankQ}
          teacherName={teacher?.name || ""}
          onClose={() => setQuestionReportSession(null)}
        />
      )}

      {/* ── Test Review Modal ── */}
      {reviewCode && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}
          onClick={()=>{setReviewCode(null);setReviewData(null);setReviewNotFound(false);}}>
          <div style={{background:T.white,borderRadius:"8px",width:"100%",maxWidth:"900px",maxHeight:"90vh",overflow:"auto",boxShadow:"0 12px 40px rgba(0,0,0,.3)"}}
            onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{position:"sticky",top:0,background:T.midnight,color:T.white,padding:"1rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between",zIndex:1}}>
              <div>
                <div style={{fontSize:"1.1rem",fontWeight:800}}>📖 Test Review</div>
                {reviewData && <div style={{fontSize:"0.75rem",opacity:0.8,marginTop:"2px"}}>{reviewData.testTitle} · {reviewData.testCode} · {reviewData.totalStudents} student{reviewData.totalStudents!==1?"s":""}</div>}
              </div>
              <button onClick={()=>{setReviewCode(null);setReviewData(null);setReviewNotFound(false);}}
                style={{background:"rgba(255,255,255,.15)",border:"none",color:T.white,fontSize:"1.2rem",width:"32px",height:"32px",borderRadius:"50%",cursor:"pointer",fontWeight:700}}>×</button>
            </div>

            {reviewLoading && (
              <div style={{padding:"3rem",textAlign:"center",color:T.textMuted}}>Loading review data...</div>
            )}

            {!reviewLoading && reviewNotFound && (
              <div style={{padding:"3rem",textAlign:"center"}}>
                <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🗂️</div>
                <div style={{fontWeight:700,color:T.textSecondary,marginBottom:"4px"}}>Test not found</div>
                <div style={{fontSize:"0.8rem",color:T.textMuted}}>The test with code <strong>{reviewCode}</strong> no longer exists. Student session data is still intact.</div>
              </div>
            )}

            {reviewData && reviewData.items.length === 0 && (
              <div style={{padding:"3rem",textAlign:"center",color:T.textMuted}}>No student submissions yet for this test.</div>
            )}

            {reviewData && reviewData.items.length > 0 && (
              <div style={{padding:"1rem 1.5rem"}}>
                {/* Summary bar */}
                <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",marginBottom:"1rem"}}>
                  {(() => {
                    const items = reviewData.items;
                    const avgPct = Math.round(items.reduce((a,q)=>a+q.pct,0)/items.length);
                    const hardest = items[0];
                    const easiest = items[items.length-1];
                    return <>
                      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.6rem 1rem",flex:1,minWidth:"120px"}}>
                        <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary}}>CLASS AVG</div>
                        <div style={{fontSize:"1.5rem",fontWeight:800,color:avgPct>=70?T.success:avgPct>=50?"#b8860b":T.dangerText}}>{avgPct}%</div>
                      </div>
                      <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:T.xs,padding:"0.6rem 1rem",flex:1,minWidth:"120px"}}>
                        <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",color:"#8b1a1a"}}>MOST MISSED</div>
                        <div style={{fontSize:"0.82rem",fontWeight:700,color:"#8b1a1a"}}>{hardest.standard} — {hardest.pct}%</div>
                        <div style={{fontSize:"0.68rem",color:"#8b1a1a",opacity:0.7}}>{hardest.short}</div>
                      </div>
                      <div style={{background:T.successBg,border:`1px solid ${T.successBd}`,borderRadius:T.xs,padding:"0.6rem 1rem",flex:1,minWidth:"120px"}}>
                        <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.1em",color:T.success}}>EASIEST</div>
                        <div style={{fontSize:"0.82rem",fontWeight:700,color:T.success}}>{easiest.standard} — {easiest.pct}%</div>
                        <div style={{fontSize:"0.68rem",color:T.success,opacity:0.7}}>{easiest.short}</div>
                      </div>
                    </>;
                  })()}
                </div>

                {/* Questions — sorted most missed first */}
                {reviewData.items.map((q, qi) => {
                  const barColor = q.pct>=70?T.success:q.pct>=50?"#f59e0b":T.dangerText;
                  const barBg = q.pct>=70?T.successBg:q.pct>=50?"#fff8e1":"#fdf2f2";
                  return (
                    <div key={q.id} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,marginBottom:"0.75rem",overflow:"hidden"}}>
                      {/* Question header */}
                      <div style={{padding:"0.75rem 1rem",background:barBg,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:"0.75rem"}}>
                        <div style={{width:"44px",height:"44px",borderRadius:"50%",background:barColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:"0.85rem",fontWeight:800,color:"#fff"}}>{q.pct}%</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",gap:"0.35rem",marginBottom:"3px",flexWrap:"wrap"}}>
                            <span style={{fontSize:"0.6rem",fontWeight:700,color:T.midnight,background:"rgba(13,148,136,.1)",padding:"1px 6px",borderRadius:"2px"}}>{q.standard}</span>
                            {q.dok&&<span style={{fontSize:"0.6rem",fontWeight:700,color:T.warning,background:"#fff3cd",padding:"1px 6px",borderRadius:"2px"}}>DOK {q.dok}</span>}
                            <span style={{fontSize:"0.6rem",color:T.textSecondary}}>{q.short}</span>
                          </div>
                          <div style={{fontSize:"0.82rem",color:T.text,fontWeight:600}}>{q.correctCount}/{q.attempted} correct</div>
                        </div>
                      </div>

                      {/* Question text + image */}
                      <div style={{padding:"0.75rem 1rem"}}>
                        <div style={{fontSize:"0.88rem",color:T.text,lineHeight:1.5,marginBottom:q.questionImage?"0.5rem":"0"}}>
                          <MathText text={q.question}/>
                        </div>
                        {q.questionImage && (
                          <div style={{marginBottom:"0.5rem"}}>
                            <img src={q.questionImage} alt="" style={{maxWidth:"100%",maxHeight:"200px",borderRadius:"4px",border:`1px solid ${T.border}`}}/>
                          </div>
                        )}

                        {/* Answer choices with distribution bar */}
                        {q.type === "mcq" && q.choices && q.choices.length > 0 && (
                          <div style={{display:"flex",flexDirection:"column",gap:"4px",marginTop:"0.5rem"}}>
                            {q.choices.map((ch, ci) => {
                              const isCorrect = String(ch) === String(q.correct);
                              const count = q.answerDistribution[ch] || 0;
                              const pct = q.attempted ? Math.round(count / q.attempted * 100) : 0;
                              return (
                                <div key={ci} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"6px 8px",
                                  background:isCorrect?"rgba(16,185,129,.08)":"transparent",
                                  border:isCorrect?`2px solid ${T.success}`:`1px solid ${T.border}`,
                                  borderRadius:T.xs}}>
                                  <div style={{width:"20px",fontWeight:700,fontSize:"0.72rem",color:isCorrect?T.success:T.textSecondary,flexShrink:0}}>
                                    {String.fromCharCode(65+ci)}
                                  </div>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:"0.78rem",color:T.text,marginBottom:"2px"}}><MathText text={ch}/></div>
                                    <div style={{height:"6px",background:"#e8edf2",borderRadius:"3px",overflow:"hidden"}}>
                                      <div style={{height:"100%",width:`${pct}%`,background:isCorrect?T.success:pct>30?T.dangerText:"#94a3b8",borderRadius:"3px",transition:"width .3s"}}/>
                                    </div>
                                  </div>
                                  <div style={{fontSize:"0.7rem",fontWeight:700,color:isCorrect?T.success:T.textSecondary,flexShrink:0,minWidth:"42px",textAlign:"right"}}>
                                    {count} ({pct}%)
                                  </div>
                                  {isCorrect && <span style={{fontSize:"0.7rem",flexShrink:0}}>✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Non-MCQ: just show correct answer */}
                        {q.type !== "mcq" && (
                          <div style={{marginTop:"0.5rem",fontSize:"0.78rem",color:T.success,fontWeight:600}}>
                            ✓ Correct: <MathText text={q.correct}/>
                          </div>
                        )}

                        {/* Who missed it */}
                        {q.pct < 100 && (
                          <div style={{marginTop:"0.5rem",paddingTop:"0.5rem",borderTop:`1px solid ${T.surfaceAlt}`}}>
                            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"4px"}}>MISSED BY:</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                              {q.studentAnswers.filter(s=>!s.correct).map((s,si)=>(
                                <span key={si} style={{fontSize:"0.68rem",background:"#fdf2f2",border:"1px solid #f0b8b8",color:"#8b1a1a",padding:"2px 8px",borderRadius:"10px",fontWeight:600}}>
                                  {s.studentName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
