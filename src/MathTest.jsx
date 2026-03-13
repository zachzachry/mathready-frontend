import { useState, useEffect, useRef } from "react";
import MathText from "./shared/MathText";
import TopBar from "./shared/TopBar";
import { QUESTIONS as FALLBACK_QUESTIONS, START_SECS, LETTERS, S, pct, lvl, lvlC, lvlBg, lvlBd, fmtTime, now, saveSession, sendHeartbeat, API } from "./shared/constants";
import { buildWeightMap, updateSessionWeights, pickAdaptiveQuestion, ALL_STANDARDS, generateDrill } from "./adaptive";
import PlotGrid from "./shared/PlotGrid";

// ── Student Login ──────────────────────────────────────────
function StudentLogin({ onStartTest, onStartPractice, onBack, prefill, codeOnly, prefillCode }) {
  // New flow: code → pick name → confirm
  const [code,        setCode]       = useState(prefillCode || "");
  const [err,         setErr]        = useState("");
  const [checking,    setChecking]   = useState(false);
  const [testInfo,    setTestInfo]   = useState(null);
  const [rosterCls,   setRosterCls]  = useState([]);  // classes from test's assigned classIds
  const [studentId,   setStudentId]  = useState("");
  const [classId,     setClassId]    = useState("");
  const [step,        setStep]       = useState("code"); // code → name → mode → confirm

  const selectedClass   = prefill?.cls     || rosterCls.find(c => c.id === classId);
  const selectedStudent = prefill?.student || selectedClass?.students?.find(s => s.id === studentId);

  // Auto-submit if code came from URL param
  useEffect(() => {
    if (prefillCode) checkCode(prefillCode);
  }, []); // eslint-disable-line

  // Step 1 — validate test code and load roster
  async function checkCode(overrideCode) {
    const c = (overrideCode || code).trim().toUpperCase();
    if (!c) { setErr("Please enter the test code."); return; }
    setChecking(true); setErr("");
    try {
      const r    = await fetch(`${API}/test/code/${encodeURIComponent(c)}`);
      const data = await r.json();
      if (!data.found || (!data.questions?.length && data.type !== "drill")) {
        setErr("Invalid test code. Check with your teacher.");
        setChecking(false); return;
      }
      setTestInfo(data);
      const cls = Array.isArray(data.roster) ? data.roster : [];
      setRosterCls(cls);
      // If only one class, auto-select it
      if (cls.length === 1) setClassId(cls[0].id);
      setStep("name");
    } catch {
      setErr("Could not connect to server. Try again.");
    }
    setChecking(false);
  }

  // Step 2 — student selected name, check one-attempt then proceed
  async function handleNameConfirm() {
    if (!studentId) { setErr("Please select your name."); return; }
    setErr("");
    if (testInfo?.oneAttempt) {
      try {
        const sid = `&studentId=${encodeURIComponent(studentId)}`;
        const ar = await fetch(`${API}/test/attempt-check?code=${encodeURIComponent(code.trim().toUpperCase())}${sid}`);
        const ad = await ar.json();
        if (ad.attempted) {
          setErr("You have already submitted this test. Only one attempt is allowed.");
          return;
        }
      } catch {}
    }
    setStep("confirm");
  }

  function handlePractice() {
    onStartPractice(selectedStudent, selectedClass);
  }

  // ── Confirm screen ──
  if (step === "confirm" && testInfo) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.hdr}>
          <div style={S.hdrSub}>STUDENT SIGN IN</div>
          <div style={S.hdrTitle}>Confirm Your Information</div>
        </div>
        <div style={{padding:"1.75rem 2rem"}}>
          <div style={S.confirmBox}>
            {[
              ["STUDENT NAME", selectedStudent?.name],
              ["CLASS",        selectedClass?.name],
              ["TEST",         testInfo.title || "Grade 5 Mathematics"],
              ["TEST CODE",    code.toUpperCase()],
              ["QUESTIONS",    String(testInfo.questions.length)],
              ["TIME LIMIT",   testInfo.untimed ? "No Time Limit" : (() => {
                const extFactor = selectedStudent?.extendedTime === "2x" ? 2 : selectedStudent?.extendedTime === "1.5x" ? 1.5 : 1;
                const base = testInfo.timeLimitSecs || 1800;
                const final = Math.round(base * extFactor / 60);
                return extFactor > 1 ? `${final} min (${selectedStudent.extendedTime} extended)` : `${final} Minutes`;
              })()],
              ["CALCULATOR",   "Not Permitted"],
              ...(selectedStudent?.reduceChoices ? [["ANSWER CHOICES", "Reduced (3 per question)"]] : []),
              ...(testInfo.oneAttempt ? [["ATTEMPTS", "1 — Cannot retake"]] : []),
            ].map(([k,v],i,a) => (
              <div key={k} style={{...S.confirmRow, borderBottom:i<a.length-1?"1px solid #eef1f4":"none"}}>
                <span style={S.confirmK}>{k}</span>
                <span style={{...S.confirmV, fontFamily:k==="TEST CODE"?"monospace":"inherit", letterSpacing:k==="TEST CODE"?"0.18em":"inherit"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:"#fff8e1",border:"1px solid #ffd166",borderRadius:"3px",padding:"0.65rem 1rem",marginBottom:"0.75rem",fontSize:"0.8rem",color:"#7a4e00"}}>
            ⚠ Once you click <strong>Begin Test</strong>, your timer starts immediately.
          </div>
          {testInfo.oneAttempt && (
            <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"3px",padding:"0.65rem 1rem",marginBottom:"1.25rem",fontSize:"0.8rem",color:"#8b1a1a",display:"flex",alignItems:"center",gap:"0.5rem"}}>
              🚫 <span><strong>One attempt only.</strong> Once you submit, you cannot retake this test.</span>
            </div>
          )}
          <div style={{display:"flex",gap:"0.75rem"}}>
            <button onClick={()=>setStep("name")} style={S.btnSec}>← Go Back</button>
            <button onClick={()=>onStartTest(selectedStudent, selectedClass, code.toUpperCase(), testInfo)} style={S.btnPri}>Begin Test →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Code entry screen ──
  if (step === "code") return (
    <div style={S.page}>
      <div style={{background:"#003865",width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        {onBack && <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:"pointer",fontSize:"0.72rem"}}>← Back</button>}
        <div style={{color:"#fff",fontSize:"0.95rem",fontWeight:700}}>Georgia Milestones Readiness Trainer</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
        <div style={S.card}>
          <div style={S.hdr}>
            <div style={S.hdrSub}>STUDENT SIGN IN</div>
            <div style={S.hdrTitle}>Enter Test Code</div>
          </div>
          <div style={{padding:"1.75rem 2rem"}}>
            <div style={{marginBottom:"1.25rem"}}>
              <label style={S.lbl}>TEST CODE — given to you by your teacher</label>
              <input style={{...S.inp,fontFamily:"monospace",fontSize:"1.4rem",letterSpacing:"0.3em",textTransform:"uppercase",fontWeight:700,textAlign:"center"}}
                value={code} onChange={e=>{setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""));setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&checkCode()} placeholder="ABCD1234" maxLength={8} autoFocus/>
            </div>
            {err && <div style={{...S.errBox,marginBottom:"0.75rem"}}>⚠ {err}</div>}
            <button onClick={checkCode} disabled={checking}
              style={{...S.btnPri,width:"100%",opacity:checking?0.7:1}}>
              {checking ? "Checking…" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Name picker screen ──
  if (step === "name") {
    const allStudents = rosterCls.flatMap(c => (c.students||[]).map(s=>({...s, className:c.name, classId:c.id})));
    const noRoster = rosterCls.length === 0;
    return (
      <div style={S.page}>
        <div style={{background:"#003865",width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
          <button onClick={()=>{setStep("code");setErr("");}} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:"pointer",fontSize:"0.72rem"}}>← Back</button>
          <div style={{color:"#fff",fontSize:"0.95rem",fontWeight:700}}>Code: <span style={{fontFamily:"monospace",letterSpacing:"0.18em"}}>{code}</span></div>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
          <div style={S.card}>
            <div style={S.hdr}>
              <div style={S.hdrSub}>{testInfo?.title || "Grade 5 Mathematics"}</div>
              <div style={S.hdrTitle}>Who are you?</div>
            </div>
            <div style={{padding:"1.75rem 2rem"}}>
              {noRoster ? (
                <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",padding:"1.25rem",textAlign:"center"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:"0.5rem"}}>🚫</div>
                  <div style={{fontWeight:700,color:"#8b1a1a",marginBottom:"4px"}}>No class assigned to this test</div>
                  <div style={{fontSize:"0.82rem",color:"#555"}}>Ask your teacher to assign this test to your class.</div>
                </div>
              ) : (
                <>
                  {rosterCls.length > 1 && (
                    <div style={{marginBottom:"1rem"}}>
                      <label style={S.lbl}>YOUR CLASS</label>
                      <select style={{...S.inp}} value={classId} onChange={e=>{setClassId(e.target.value);setStudentId("");setErr("");}}>
                        <option value="">— Select your class —</option>
                        {rosterCls.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div style={{marginBottom:"1rem"}}>
                    <label style={S.lbl}>YOUR NAME</label>
                    {(() => {
                      const students = classId
                        ? (rosterCls.find(c=>c.id===classId)?.students||[])
                        : allStudents;
                      if (!classId && rosterCls.length > 1) return (
                        <div style={{color:"#aaa",fontSize:"0.82rem",padding:"0.65rem",border:"1px solid #e0e7ee",borderRadius:"3px"}}>Select your class first</div>
                      );
                      return (
                        <select style={{...S.inp,fontSize:"1rem"}} value={studentId} onChange={e=>{setStudentId(e.target.value);setErr("");}}>
                          <option value="">— Select your name —</option>
                          {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      );
                    })()}
                  </div>
                  {!studentId && (
                    <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"3px",padding:"0.65rem 0.9rem",fontSize:"0.8rem",color:"#8b1a1a",marginBottom:"0.75rem"}}>
                      🚫 If your name is not listed, see your teacher to be added to the class roster.
                    </div>
                  )}
                  {err && <div style={{...S.errBox,marginBottom:"0.75rem"}}>⚠ {err}</div>}
                  <button onClick={handleNameConfirm} disabled={!studentId}
                    style={{...S.btnPri,width:"100%",opacity:studentId?1:0.4,cursor:studentId?"pointer":"not-allowed"}}>
                    Continue →
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Mode picker screen ──
  if (step === "mode") return (
    <div style={S.page}>
      <div style={{background:"#003865",width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem"}}>
        <button onClick={()=>setStep("name")} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:"pointer",fontSize:"0.72rem"}}>← Back</button>
        <div style={{color:"#fff",fontSize:"0.95rem",fontWeight:700}}>Georgia Milestones Readiness Trainer</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
        <div style={{width:"100%",maxWidth:"520px"}}>
          <div style={{textAlign:"center",marginBottom:"2rem"}}>
            <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.14em",color:"#888",marginBottom:"6px"}}>SIGNED IN AS</div>
            <div style={{fontSize:"1.3rem",fontWeight:700,color:"#1a1a1a"}}>{selectedStudent?.name}</div>
            <div style={{fontSize:"0.85rem",color:"#666"}}>{selectedClass?.name}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
            {/* Practice card */}
            <button onClick={handlePractice}
              style={{background:"#fff",border:"2px solid #1a6e2e",borderRadius:"8px",padding:"1.75rem 2rem",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:"1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{width:"52px",height:"52px",borderRadius:"50%",background:"#f0faf2",border:"2px solid #b3dfc0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"1.6rem"}}>🎯</div>
              <div>
                <div style={{fontSize:"1.05rem",fontWeight:700,color:"#1a6e2e",marginBottom:"4px"}}>Practice Mode</div>
                <div style={{fontSize:"0.82rem",color:"#555",lineHeight:1.5}}>Random questions from the bank. See if you got it right after every answer. Practice as long as you want.</div>
              </div>
            </button>
            {/* Test card */}
            <button onClick={()=>testInfo ? setStep("confirm") : setStep("code")}
              style={{background:"#fff",border:"2px solid #003865",borderRadius:"8px",padding:"1.75rem 2rem",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:"1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
              <div style={{width:"52px",height:"52px",borderRadius:"50%",background:"#ddeaf7",border:"2px solid #9dbfe0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"1.6rem"}}>📝</div>
              <div>
                <div style={{fontSize:"1.05rem",fontWeight:700,color:"#003865",marginBottom:"4px"}}>Take a Test</div>
                <div style={{fontSize:"0.82rem",color:"#555",lineHeight:1.5}}>{testInfo ? `Continue to: ${testInfo.title||"Grade 5 Mathematics"}` : "Enter a test code from your teacher."}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Fallback — should not reach here
  return null;
}

// ── Practice Mode ──────────────────────────────────────────
function PracticeMode({ student, cls, onFinish, onQuit }) {
  const [bankQ,       setBankQ]       = useState([]);
  const [weights,     setWeights]     = useState({});
  const [seenIds,     setSeenIds]     = useState(new Set());
  const [loading,     setLoading]     = useState(true);
  const [curQ,        setCurQ]        = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [revealed,    setRevealed]    = useState(false);
  const [history,     setHistory]     = useState([]);
  const [qStart,      setQStart]      = useState(Date.now());
  const [totalSecs,   setTotalSecs]   = useState(0);
  const timerRef = useRef(null);
  const LIMIT = 10;

  // Fetch bank + student history to seed weights
  useEffect(() => {
    async function init() {
      let bank = FALLBACK_QUESTIONS;
      let initWeights = {};
      try {
        const [qRes, hRes] = await Promise.all([
          fetch(`${API}/questions`).then(r=>r.json()).catch(()=>[]),
          student?.id
            ? fetch(`${API}/student/history/${encodeURIComponent(student.id)}`).then(r=>r.json()).catch(()=>[])
            : Promise.resolve([]),
        ]);
        if (Array.isArray(qRes) && qRes.length) bank = qRes;
        if (Array.isArray(hRes) && hRes.length)  initWeights = buildWeightMap(hRes);
      } catch {}
      // Seed all standards at 0.5 if not in history
      ALL_STANDARDS.forEach(std => { if (!initWeights[std]) initWeights[std] = 0.5; });
      setBankQ(bank);
      setWeights(initWeights);
      // Pick first question
      const first = pickAdaptiveQuestion(bank, initWeights, new Set(), ALL_STANDARDS);
      setCurQ(first);
      setSeenIds(new Set([first.id]));
      setLoading(false);
      setQStart(Date.now());
    }
    init();
    timerRef.current = setInterval(() => setTotalSecs(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);  // eslint-disable-line

  function handleChoose(choice) {
    if (revealed) return;
    setSelected(choice);
    setRevealed(true);
  }

  function handleNext() {
    const timeSecs = Math.round((Date.now() - qStart) / 1000);
    function gradeIt(q, sel) {
      if (!sel) return false;
      if (q.type === "plotpoint") return sel === JSON.stringify(Array.isArray(q.answer)?q.answer:(()=>{try{return JSON.parse(q.answer);}catch{return null;}})());
      if (q.type === "multiselect") { try { return JSON.stringify([...JSON.parse(sel)].sort())===JSON.stringify([...(Array.isArray(q.answer)?q.answer:[])].sort()); } catch { return false; } }
      if (q.type === "keypad") return String(q.answer??"").trim().toLowerCase()===String(sel).trim().toLowerCase();
      return sel === q.correct;
    }
    const isCorrect = gradeIt(curQ, selected);
    const newHistory = [...history, { q: curQ, chosen: selected, correct: isCorrect, timeSecs }];
    setHistory(newHistory);

    if (newHistory.length >= LIMIT) {
      handleFinish(newHistory);
      return;
    }

    // Update weights based on session so far
    const newWeights = updateSessionWeights(weights, newHistory, ALL_STANDARDS);
    setWeights(newWeights);

    // Pick next question adaptively
    const newSeen = new Set([...seenIds, curQ.id]);
    const next = pickAdaptiveQuestion(bankQ, newWeights, newSeen, ALL_STANDARDS);
    setSeenIds(new Set([...newSeen, next.id]));
    setCurQ(next);
    setSelected(null);
    setRevealed(false);
    setQStart(Date.now());
  }

  function handleFinish(finalHistory) {
    clearInterval(timerRef.current);
    const h = finalHistory || history;
    const score = h.filter(x => x.correct).length;
    const session = {
      name:        student?.name || "Student",
      studentName: student?.name || "Student",
      studentId:   student?.id   || "",
      className:   cls?.name     || "",
      classId:     cls?.id       || "",
      score,
      total:       h.length,
      pct:         h.length ? pct(score, h.length) : 0,
      submitted:   now(),
      timeUsed:    fmtTime(totalSecs),
      mode:        "practice",
      testCode:    "PRACTICE",
      answers:     Object.fromEntries(h.map(x => [x.q.id, x.chosen])),
    };
    onFinish(session, h);
  }

  function handleQuit() {
    if (history.length === 0) { onQuit(); return; }
    handleFinish();
  }

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#e8edf2",fontFamily:"sans-serif"}}>
      <div style={{textAlign:"center",color:"#aaa"}}>
        <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🎯</div>
        <div>Building your practice session…</div>
      </div>
    </div>
  );

  if (!curQ) return null;

  const q = curQ;
  const correct = (() => {
    if (q.type === "plotpoint") return JSON.stringify(Array.isArray(q.answer)?q.answer:(()=>{try{return JSON.parse(q.answer);}catch{return null;}})());
    if (q.type === "multiselect") return JSON.stringify([...(Array.isArray(q.answer)?q.answer:[])].sort());
    if (q.type === "keypad") return String(q.answer??"").trim().toLowerCase();
    return q.correct;
  })();
  const streak  = (() => { let s=0; for(let i=history.length-1;i>=0;i--){ if(history[i].correct) s++; else break; } return s; })();
  const totalCorrect = history.filter(x=>x.correct).length;
  const questionNum  = history.length + 1;

  return (
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",fontFamily:"sans-serif",background:"#e8edf2"}}>
      {/* Header */}
      <div style={{background:"#1a6e2e",color:"#fff",padding:"0.75rem 1.5rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        <div style={{fontSize:"1rem",fontWeight:700}}>🎯 Practice Mode</div>
        <div style={{marginLeft:"auto",display:"flex",gap:"1.25rem",alignItems:"center"}}>
          {streak >= 3 && <div style={{fontSize:"0.75rem",background:"rgba(255,255,255,.2)",padding:"3px 10px",borderRadius:"12px",fontWeight:700}}>🔥 {streak} streak!</div>}
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"0.55rem",opacity:.7,letterSpacing:"0.08em"}}>SCORE</div>
            <div style={{fontSize:"0.9rem",fontWeight:700}}>{totalCorrect}/{history.length}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"0.55rem",opacity:.7,letterSpacing:"0.08em"}}>TIME</div>
            <div style={{fontSize:"0.9rem",fontWeight:700,fontFamily:"monospace"}}>{fmtTime(totalSecs)}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"0.55rem",opacity:.7,letterSpacing:"0.08em"}}>STUDENT</div>
            <div style={{fontSize:"0.82rem",fontWeight:600}}>{student?.name}</div>
          </div>
          <button onClick={handleQuit}
            style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"5px 12px",cursor:"pointer",fontSize:"0.75rem",fontWeight:600}}>
            Quit
          </button>
        </div>
      </div>

      {/* Question counter strip */}
      <div style={{background:"#155a27",color:"#a8e6b8",padding:"0.4rem 1.5rem",fontSize:"0.7rem",display:"flex",gap:"1rem",alignItems:"center"}}>
        <span>Question {questionNum} of {LIMIT}</span>
        <span style={{opacity:.6}}>·</span>
        <span style={{color:"#fff",fontWeight:700}}>{q.standard}</span>
        {q.dok && <><span style={{opacity:.6}}>·</span><span>DOK {q.dok}</span></>}
        {q.parametric && <span style={{background:"rgba(255,255,255,.2)",borderRadius:"8px",padding:"1px 7px",fontSize:"0.65rem",fontWeight:700}}>⚡ Generated</span>}
      </div>

      {/* Question area */}
      <div style={{flex:1,display:"flex",justifyContent:"center",padding:"1.5rem 1rem 2rem",overflowY:"auto"}}>
        <div style={{width:"100%",maxWidth:"680px",display:"flex",flexDirection:"column",gap:"1rem"}}>

          {/* Question card */}
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"6px",padding:"1.5rem 1.75rem",boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>
            <p style={{fontSize:"1.08rem",fontFamily:"Georgia,serif",color:"#0f0f0f",lineHeight:1.75,margin:0}}>
              <MathText text={q.question}/>
            </p>
          </div>

          {/* Choices — by type */}
          {q.type === "plotpoint" ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.75rem"}}>
              <PlotGrid
                answer={revealed ? q.answer : null}
                placed={selected ? JSON.parse(selected) : null}
                onPlace={pt => !revealed && handleChoose(JSON.stringify(pt))}
                revealed={revealed}
                size={Math.min(320, window.innerWidth - 60)}
              />
            </div>
          ) : q.type === "keypad" ? (
            <div style={{display:"flex",flexDirection:"column",gap:"0.65rem",alignItems:"flex-start"}}>
              <input
                type="text" inputMode="decimal"
                value={selected ?? ""}
                onChange={e => !revealed && handleChoose(e.target.value)}
                disabled={revealed}
                placeholder="Type your answer…"
                style={{width:"100%",maxWidth:"260px",padding:"0.8rem 1rem",fontSize:"1.3rem",fontFamily:"monospace",fontWeight:700,border:`2px solid ${revealed?(String(selected??"").trim().toLowerCase()===correct?"#1a6e2e":"#8b1a1a"):"#003865"}`,borderRadius:"4px",outline:"none",background:"#fafbfc",color:"#0f0f0f"}}
              />
              {!revealed && selected && (
                <button onClick={() => handleChoose(selected)}
                  style={{background:"#003865",color:"#fff",border:"none",borderRadius:"4px",padding:"0.65rem 1.25rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer"}}>
                  Submit →
                </button>
              )}
            </div>
          ) : q.type === "multiselect" ? (
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              <div style={{fontSize:"0.7rem",color:"#888",marginBottom:"4px"}}>Select all that apply.</div>
              {q.choices.map((choice, i) => {
                const selArr = (() => { try { return selected ? JSON.parse(selected) : []; } catch { return []; } })();
                const isChosen = selArr.includes(choice);
                const correctArr = Array.isArray(q.answer) ? q.answer : [];
                const isInCorrect = correctArr.includes(choice);
                let bg = "#fff", border = "2px solid #c8d3dd";
                if (revealed) {
                  if (isInCorrect)    { bg="#f0faf2"; border="2px solid #1a6e2e"; }
                  else if (isChosen)  { bg="#fdf2f2"; border="2px solid #8b1a1a"; }
                  else                { bg="#fafbfc"; border="2px solid #e0e0e0"; }
                } else if (isChosen) { bg="#ddeaf7"; border="2px solid #003865"; }
                return (
                  <button key={i}
                    onClick={() => {
                      if (revealed) return;
                      const next = isChosen ? selArr.filter(c=>c!==choice) : [...selArr, choice];
                      setSelected(next.length ? JSON.stringify(next) : null);
                    }}
                    disabled={revealed}
                    style={{background:bg,border,borderRadius:"6px",padding:"0.9rem 1.25rem",textAlign:"left",cursor:revealed?"default":"pointer",display:"flex",alignItems:"center",gap:"1rem",transition:"all .15s"}}>
                    <div style={{width:"22px",height:"22px",borderRadius:"3px",border:`2px solid ${revealed?(isInCorrect?"#1a6e2e":isChosen?"#8b1a1a":"#ddd"):"#9aabba"}`,background:revealed?(isInCorrect?"#1a6e2e":isChosen?"#8b1a1a":"#f0f0f0"):(isChosen?"#003865":"#fff"),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {(isChosen || (revealed && isInCorrect)) && <span style={{color:"#fff",fontSize:"0.8rem",fontWeight:900}}>✓</span>}
                    </div>
                    <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",flex:1}}><MathText text={choice}/></span>
                  </button>
                );
              })}
              {!revealed && (
                <button onClick={() => handleChoose(selected || "[]")}
                  style={{background:"#003865",color:"#fff",border:"none",borderRadius:"4px",padding:"0.65rem 1.25rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer",marginTop:"0.25rem"}}>
                  Submit Selections →
                </button>
              )}
            </div>
          ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
            {q.choices.map((choice, i) => {
              const isChosen  = selected === choice;
              const isCorrect = choice === correct;
              let bg = "#fff", border = "2px solid #c8d3dd", color = "#1a1a1a";
              if (revealed) {
                if (isCorrect)       { bg="#f0faf2"; border="2px solid #1a6e2e"; color="#1a6e2e"; }
                else if (isChosen)   { bg="#fdf2f2"; border="2px solid #8b1a1a"; color="#8b1a1a"; }
                else                 { bg="#fafbfc"; border="2px solid #e0e0e0"; color="#aaa"; }
              } else if (isChosen)   { bg="#ddeaf7"; border="2px solid #003865"; }

              return (
                <button key={i} onClick={() => handleChoose(choice)} disabled={revealed}
                  style={{background:bg,border,borderRadius:"6px",padding:"0.9rem 1.25rem",textAlign:"left",cursor:revealed?"default":"pointer",display:"flex",alignItems:"center",gap:"1rem",transition:"all .15s"}}>
                  <div style={{width:"30px",height:"30px",borderRadius:"50%",border:`2px solid ${revealed?(isCorrect?"#1a6e2e":isChosen?"#8b1a1a":"#ddd"):"#9aabba"}`,background:revealed?(isCorrect?"#1a6e2e":isChosen?"#8b1a1a":"#f0f0f0"):(isChosen?"#003865":"#fff"),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:"0.75rem",fontWeight:700,color:revealed?(isCorrect||isChosen?"#fff":"#aaa"):(isChosen?"#fff":"#667")}}>
                      {revealed && isCorrect ? "✓" : revealed && isChosen ? "✗" : LETTERS[i]}
                    </span>
                  </div>
                  <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",color,flex:1}}>
                    <MathText text={choice}/>
                  </span>
                </button>
              );
            })}
          </div>
          )}

          {/* Feedback banner */}
          {revealed && (() => {
              let isOk;
              if (q.type === "multiselect") {
                try { isOk = JSON.stringify([...JSON.parse(selected)].sort()) === correct; } catch { isOk = false; }
              } else if (q.type === "keypad") {
                isOk = String(selected??"").trim().toLowerCase() === correct;
              } else {
                isOk = selected === correct;
              }
              const correctLabel = q.type==="multiselect"
                ? (Array.isArray(q.answer)?q.answer:[]).join(", ")
                : q.type==="keypad" ? String(q.answer??"")
                : correct;
              return (
            <div style={{borderRadius:"6px",padding:"1rem 1.25rem",background:isOk?"#f0faf2":"#fdf2f2",border:`1px solid ${isOk?"#b3dfc0":"#f0b8b8"}`}}>
              <div style={{fontSize:"1rem",fontWeight:700,color:isOk?"#1a6e2e":"#8b1a1a",marginBottom:q.explanation?"6px":0}}>
                {isOk ? "✓ Correct!" : <span>✗ The correct answer is: <MathText text={correctLabel}/></span>}
              </div>
              {q.explanation && (
                <div style={{fontSize:"0.85rem",color:"#444",lineHeight:1.6}}>
                  <MathText text={q.explanation}/>
                </div>
              )}
            </div>
              ); })()}

          {/* Next button */}
          {(revealed || (q.type==="plotpoint" && selected)) && (
            <div style={{display:"flex",gap:"0.75rem"}}>
              <button onClick={handleNext}
                style={{flex:1,background:"#003865",border:"none",borderRadius:"6px",padding:"0.85rem",fontSize:"0.95rem",cursor:"pointer",color:"#fff",fontWeight:700}}>
                {(q.type==="plotpoint"||q.type==="keypad"||q.type==="multiselect") && !revealed ? "Submit Answer →" : "Next Question →"}
              </button>
              <button onClick={handleQuit}
                style={{background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"6px",padding:"0.85rem 1.25rem",fontSize:"0.85rem",cursor:"pointer",color:"#555",fontWeight:600}}>
                Finish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Practice Results ───────────────────────────────────────
function PracticeResults({ session, history, onReset }) {
  const p = session.pct;
  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",fontFamily:"sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#1a6e2e",color:"#fff",padding:"0.85rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
        <div style={{fontSize:"1rem",fontWeight:700}}>🎯 Practice Session Complete</div>
      </div>
      <div style={{flex:1,display:"flex",justifyContent:"center",padding:"2rem 1rem"}}>
        <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"6px",width:"100%",maxWidth:"640px",boxShadow:"0 2px 12px rgba(0,0,0,.07)",overflow:"hidden"}}>
          {/* Score header */}
          <div style={{background:"#f0faf2",borderBottom:"1px solid #c8d3dd",padding:"1.5rem 1.75rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:"#888",marginBottom:"4px"}}>PRACTICE SCORE</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:"#1a1a1a"}}>{session.studentName}</div>
              <div style={{fontSize:"2rem",fontWeight:700,color:lvlC(p),fontFamily:"Georgia,serif",marginTop:"4px"}}>{session.score}/{session.total} <span style={{fontSize:"1rem",opacity:.6}}>({p}%)</span></div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"0.62rem",color:"#888",marginBottom:"4px"}}>TIME</div>
              <div style={{fontSize:"1.1rem",fontWeight:700,color:"#003865",fontFamily:"monospace"}}>{session.timeUsed}</div>
              <div style={{marginTop:"8px",fontSize:"0.75rem",background:"#ddeaf7",color:"#003865",border:"1px solid #9dbfe0",borderRadius:"3px",padding:"3px 10px",fontWeight:700}}>📝 PRACTICE</div>
            </div>
          </div>

          {/* Per-question review */}
          <div style={{padding:"1.25rem 1.5rem"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"0.75rem"}}>QUESTION REVIEW</div>
            {history.map((item, i) => {
              const { q, chosen, correct: isCorrect } = item;
              return (
                <div key={q.id} style={{display:"flex",gap:"0.75rem",marginBottom:"0.6rem",padding:"0.75rem 0.9rem",background:isCorrect?"#f0faf2":"#fdf2f2",border:`1px solid ${isCorrect?"#b3dfc0":"#f0b8b8"}`,borderRadius:"4px"}}>
                  <div style={{width:"22px",height:"22px",borderRadius:"50%",background:isCorrect?"#1a6e2e":"#8b1a1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"2px"}}>
                    <span style={{color:"#fff",fontSize:"0.7rem",fontWeight:700}}>{i+1}</span>
                  </div>
                  <div style={{flex:1,fontSize:"0.82rem"}}>
                    <div style={{color:"#777",fontSize:"0.63rem",letterSpacing:"0.08em",marginBottom:"2px"}}>{q.standard}{item.timeSecs ? ` · ${item.timeSecs}s` : ""}</div>
                    <div style={{color:"#1a1a1a",fontFamily:"Georgia,serif",marginBottom:isCorrect?0:"4px"}}><MathText text={q.question}/></div>
                    {q.type==="plotpoint" && !isCorrect && (
                      <div style={{margin:"6px 0"}}>
                        <PlotGrid answer={q.answer} placed={chosen?(()=>{try{return JSON.parse(chosen);}catch{return null;}})():null} revealed readOnly size={180}/>
                      </div>
                    )}
                    {!isCorrect && q.type!=="plotpoint" && (
                      <div style={{fontSize:"0.78rem"}}>
                        <span style={{color:"#1a6e2e"}}>Correct: <strong><MathText text={q.correct}/></strong></span>
                        {chosen && <span style={{color:"#8b1a1a"}}> · Your answer: <MathText text={chosen}/></span>}
                      </div>
                    )}
                    {q.explanation && !isCorrect && (
                      <div style={{fontSize:"0.75rem",color:"#555",marginTop:"4px",fontStyle:"italic"}}><MathText text={q.explanation}/></div>
                    )}
                  </div>
                  <span style={{fontWeight:700,fontSize:"0.9rem",color:isCorrect?"#1a6e2e":"#8b1a1a"}}>{isCorrect?"✓":"✗"}</span>
                </div>
              );
            })}
          </div>

          <div style={{padding:"1rem 1.5rem",borderTop:"1px solid #dde3e9",display:"flex",gap:"0.75rem",justifyContent:"flex-end"}}>
            <button onClick={onReset} style={{background:"#1a6e2e",color:"#fff",border:"none",borderRadius:"3px",padding:"0.65rem 1.75rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600}}>Practice Again</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Student Test ───────────────────────────────────────────
function normalizeQuestion(q) {
  // Normalize answer field — may be stored as JSON string or array
  let answer = q.answer;
  if (typeof answer === "string") {
    try { answer = JSON.parse(answer); } catch { answer = null; }
  }
  // Detect plotpoint: explicit type OR answer is [x,y] and choices are empty
  const hasRealChoices = Array.isArray(q.choices) && q.choices.filter(c => c).length > 0;
  const isPlotAnswer   = Array.isArray(answer) && answer.length === 2 &&
                         typeof answer[0] === "number" && typeof answer[1] === "number";
  const type = (q.type === "plotpoint" || (isPlotAnswer && !hasRealChoices))
    ? "plotpoint"
    : (["multiselect","keypad"].includes(q.type) ? q.type : "mcq");
  return { ...q, type, answer };
}

function StudentTest({ studentName, studentId, questions: initialQuestions, adaptive, onFinish, untimed=false, timeLimitSecs=1800, warnSecs=300 }) {
  const [questions, setQuestions] = useState(initialQuestions.map(normalizeQuestion));
  const [weights,   setWeights]   = useState({});
  const [seenIds,   setSeenIds]   = useState(new Set(initialQuestions.map(q=>q.id)));
  const TOTAL = questions.length;
  const [cur,   setCur]   = useState(0);
  const [ans,   setAns]   = useState({});
  const [flg,   setFlg]   = useState({});
  const [secs,     setSecs]     = useState(untimed ? 0 : timeLimitSecs);
  const [paused,   setPaused]   = useState(false);
  const [stopped,  setStopped]  = useState(false);
  const [modal, setModal] = useState(false);
  const [nav,   setNav]   = useState(window.innerWidth > 640);

  // Adaptive: fetch student history and seed weights
  useEffect(() => {
    if (!adaptive) return;
    async function seedWeights() {
      try {
        const hRes = studentId
          ? await fetch(`${API}/student/history/${encodeURIComponent(studentId)}`).then(r=>r.json()).catch(()=>[])
          : [];
        const initW = buildWeightMap(Array.isArray(hRes) ? hRes : []);
        ALL_STANDARDS.forEach(std => { if (!initW[std]) initW[std] = 0.5; });
        setWeights(initW);
      } catch {}
    }
    seedWeights();
  }, [adaptive, studentId]);  // eslint-disable-line

  // Adaptive: when student answers, swap in an adaptive next question
  function handleAdaptiveAnswer(qId, choice) {
    if (!adaptive) return;
    setAns(prev => {
      const newAns = {...prev, [qId]: choice};
      // Build mini history from current answers
      const miniHistory = questions.slice(0, cur+1).map(q => ({
        q, chosen: newAns[q.id], correct: newAns[q.id] === q.correct
      }));
      const newW = updateSessionWeights(weights, miniHistory, ALL_STANDARDS);
      setWeights(newW);
      // Replace the NEXT question in the queue if there is one
      if (cur + 1 < questions.length) {
        const newSeen = new Set([...seenIds]);
        const nextQ = pickAdaptiveQuestion(initialQuestions, newW, newSeen, ALL_STANDARDS);
        if (nextQ && nextQ.id !== questions[cur+1].id) {
          setQuestions(qs => {
            const updated = [...qs];
            updated[cur+1] = normalizeQuestion(nextQ);
            return updated;
          });
          setSeenIds(s => new Set([...s, nextQ.id]));
        }
      }
      return newAns;
    });
  }

  // Countdown timer (skipped if untimed)
  useEffect(()=>{
    if (untimed) return;
    const t = setInterval(()=>{
      if (!paused) setSecs(s => s > 0 ? s - 1 : 0);
    }, 1000);
    return () => clearInterval(t);
  }, [paused, untimed]);

  // Poll for teacher pause/stop/extensions every 5s
  const appliedExtRef = useRef(0); // total seconds already added to timer
  useEffect(()=>{
    const t = setInterval(async () => {
      try {
        const r = await fetch(`${API}/test/control`);
        const d = await r.json();
        setPaused(!!d.paused);
        if (d.stopped && !stopped) { setStopped(true); }
        // Apply any new time extension granted for this student
        if (!untimed && d.extensions) {
          const granted = d.extensions[studentName] || 0;
          if (granted > appliedExtRef.current) {
            const newSecs = granted - appliedExtRef.current;
            appliedExtRef.current = granted;
            setSecs(s => s + newSecs);
          }
        }
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [stopped, untimed, studentName]);
  useEffect(()=>{
    sendHeartbeat(studentName, cur);
    const t = setInterval(()=>sendHeartbeat(studentName, cur), 30000);
    return()=>clearInterval(t);
  },[studentName, cur]);

  // ── Lockdown ────────────────────────────────────────────
  const containerRef = useRef();
  const [violations,    setViolations]    = useState(0);
  const [lockWarning,   setLockWarning]   = useState(null); // message string or null
  const [isFullscreen,  setIsFullscreen]  = useState(false);

  function addViolation(reason) {
    setViolations(v => v + 1);
    setLockWarning(reason);
  }

  // Enter fullscreen on mount
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().then(()=>setIsFullscreen(true)).catch(()=>{});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();

    return () => {
      if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
    };
  }, []);

  // Detect fullscreen exit
  useEffect(() => {
    function onFsChange() {
      const inFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(inFs);
      if (!inFs) addViolation("You exited fullscreen. Click below to return.");
    }
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  // Detect tab/window blur
  useEffect(() => {
    function onBlur()       { addViolation("You left this window. Return to your test."); }
    function onVisibility() { if (document.hidden) addViolation("You switched tabs. Return to your test."); }
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Block keyboard shortcuts and right-click
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    // Block keyboard shortcuts
    function onKey(e) {
      const bad = (
        (e.ctrlKey || e.metaKey) && ["c","v","u","a","s","p"].includes(e.key.toLowerCase()) ||
        (e.ctrlKey && e.shiftKey && ["i","j","c","k"].includes(e.key.toLowerCase())) ||
        e.key === "F12" || e.key === "PrintScreen" || e.key === "F5"
      );
      if (bad) { e.preventDefault(); e.stopPropagation(); setDevToolsOpen(true); setViolations(v=>v+1); }
    }
    function onContext(e) { e.preventDefault(); }
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("contextmenu", onContext, true);

    // Devtools size detection — fires when devtools panel opens/closes
    function checkDevTools() {
      const threshold = 160;
      const widthDiff  = window.outerWidth  - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const open = widthDiff > threshold || heightDiff > threshold;
      setDevToolsOpen(prev => {
        if (open && !prev) setViolations(v => v + 1);
        return open;
      });
    }
    const dtInterval = setInterval(checkDevTools, 800);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("contextmenu", onContext, true);
      clearInterval(dtInterval);
    };
  }, []);

  // Warn before leaving page
  useEffect(() => {
    function onBeforeUnload(e) { e.preventDefault(); e.returnValue = ""; }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  function reEnterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().then(()=>{ setIsFullscreen(true); setLockWarning(null); }).catch(()=>{});
    else if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); setLockWarning(null); }
  }

  const q = questions[cur];
  if (!q) return <div style={{padding:"3rem",textAlign:"center",color:"#aaa"}}>Loading…</div>;

  const sel  = ans[q.id] ?? null;
  const isFl = flg[q.id] ?? false;
  const ansCount = Object.keys(ans).length;
  const flgCount = Object.values(flg).filter(Boolean).length;

  function gradeAnswer(q, given) {
    if (!given) return false;
    if (q.type === "plotpoint") {
      const ans = Array.isArray(q.answer) ? q.answer
        : (()=>{ try { return JSON.parse(q.answer); } catch { return null; } })();
      return given === JSON.stringify(ans);
    }
    if (q.type === "multiselect") {
      const correct = Array.isArray(q.answer) ? q.answer : [];
      try {
        const given_arr = JSON.parse(given);
        return JSON.stringify([...given_arr].sort()) === JSON.stringify([...correct].sort());
      } catch { return false; }
    }
    if (q.type === "keypad") {
      return String(q.answer ?? "").trim().toLowerCase() === String(given).trim().toLowerCase();
    }
    return given === q.correct;
  }

  async function doSubmit() {
    const score = questions.reduce((a,q) => {
      const given = ans[q.id] ?? null;
      return a + (gradeAnswer(q, given) ? 1 : 0);
    }, 0);
    const session = { name:studentName, score, total:TOTAL, pct:pct(score,TOTAL), submitted:now(), timeUsed:untimed ? fmtTime(0) : fmtTime(timeLimitSecs-secs), answers:{...ans}, violations };
    onFinish(session);
  }

  return (
    <div ref={containerRef} style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"sans-serif",background:"#e8edf2",overflow:"hidden",userSelect:"none",WebkitUserSelect:"none"}}>

      {/* Teacher stopped the test */}
      {stopped && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
          <div style={{background:"#fff",borderRadius:"8px",maxWidth:"420px",width:"100%",overflow:"hidden",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.5)"}}>
            <div style={{background:"#8b1a1a",color:"#fff",padding:"1.25rem"}}>
              <div style={{fontSize:"1.5rem",marginBottom:"4px"}}>🛑</div>
              <div style={{fontWeight:700,fontSize:"1.1rem"}}>Test Stopped by Teacher</div>
            </div>
            <div style={{padding:"1.5rem"}}>
              <p style={{fontSize:"0.92rem",color:"#333",marginBottom:"1.25rem"}}>Your teacher has ended the test. Please submit your answers now.</p>
              <button onClick={()=>{ setStopped(false); setModal(true); }}
                style={{width:"100%",background:"#003865",color:"#fff",border:"none",borderRadius:"4px",padding:"0.85rem",fontSize:"0.95rem",fontWeight:700,cursor:"pointer"}}>
                Submit My Answers →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher paused the test */}
      {paused && !stopped && (
        <div style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#fff",borderRadius:"8px",maxWidth:"360px",width:"100%",padding:"2rem",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.4)"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.5rem"}}>⏸</div>
            <div style={{fontWeight:700,fontSize:"1.1rem",color:"#003865",marginBottom:"0.5rem"}}>Test Paused</div>
            <div style={{fontSize:"0.85rem",color:"#666"}}>Your teacher has paused the test. Please wait.</div>
          </div>
        </div>
      )}

      {/* Lockdown warning overlay */}
      {lockWarning && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
          <div style={{background:"#fff",borderRadius:"8px",maxWidth:"420px",width:"100%",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.4)"}}>
            <div style={{background:"#8b1a1a",color:"#fff",padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <span style={{fontSize:"1.5rem"}}>⚠️</span>
              <div>
                <div style={{fontWeight:700,fontSize:"1rem"}}>Testing Violation</div>
                <div style={{fontSize:"0.72rem",opacity:.8}}>This has been recorded</div>
              </div>
            </div>
            <div style={{padding:"1.5rem"}}>
              <div style={{fontSize:"0.92rem",color:"#333",marginBottom:"1.25rem",lineHeight:1.5}}>
                {lockWarning}
              </div>
              <div style={{fontSize:"0.75rem",color:"#888",marginBottom:"1rem"}}>
                Violation count: <strong style={{color:"#8b1a1a"}}>{violations}</strong> — your teacher will see this on your results.
              </div>
              <button onClick={reEnterFullscreen}
                style={{width:"100%",background:"#003865",color:"#fff",border:"none",borderRadius:"4px",padding:"0.75rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer"}}>
                Return to Test →
              </button>
            </div>
          </div>
        </div>
      )}

      <TopBar title="Grade 5 Math" right={
        <div style={{display:"flex",gap:"1rem",alignItems:"center"}}>
          {devToolsOpen && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"1.5rem"}}>
            <div style={{fontSize:"3rem"}}>🚫</div>
            <div style={{color:"#fff",fontSize:"1.3rem",fontWeight:700,textAlign:"center",maxWidth:"380px"}}>
              Developer Tools Detected
            </div>
            <div style={{color:"#ffb3b3",fontSize:"0.95rem",textAlign:"center",maxWidth:"340px",lineHeight:1.5}}>
              Close the browser developer tools to continue your test.<br/>
              <strong>This incident has been logged for your teacher.</strong>
            </div>
            <div style={{color:"#888",fontSize:"0.75rem"}}>Press F12 or close the DevTools panel to dismiss this screen.</div>
          </div>
        )}
        {violations > 0 && (
            <div style={{background:"#8b1a1a",borderRadius:"3px",padding:"2px 8px",fontSize:"0.65rem",fontWeight:700,color:"#fff"}}>
              ⚠ {violations} violation{violations!==1?"s":""}
            </div>
          )}
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"0.55rem",opacity:.6,letterSpacing:"0.08em"}}>TIME</div>
            <div style={{fontSize:"1rem",fontWeight:"bold",fontFamily:"monospace",color:(!untimed&&secs<warnSecs)?"#ffaaaa":"#fff"}}>
              {untimed ? "∞" : fmtTime(secs)}
            </div>
          </div>
          <div style={{textAlign:"right",display:window.innerWidth>480?"block":"none"}}>
            <div style={{fontSize:"0.55rem",opacity:.6,letterSpacing:"0.08em"}}>STUDENT</div>
            <div style={{fontSize:"0.78rem",fontWeight:600}}>{studentName}</div>
          </div>
        </div>
      }/>

      <div style={{background:"#004e94",color:"#cce0f5",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 0.75rem",height:"30px",flexShrink:0,fontSize:"0.7rem"}}>
        <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
          <button onClick={()=>setNav(o=>!o)} style={{background:"none",border:"none",color:"#cce0f5",cursor:"pointer",fontSize:"0.7rem",padding:0}}>{nav?"◀ Hide":"▶ Nav"}</button>
          <span style={{opacity:.5}}>|</span>
          <span>{ansCount}/{TOTAL} answered</span>
          {flgCount>0&&<><span style={{opacity:.5}}>|</span><span style={{color:"#ffd166"}}>🚩{flgCount}</span></>}
        </div>
        <span style={{opacity:.65,fontSize:"0.65rem"}}>No Calculator</span>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {nav&&(
          <div style={{width:"156px",background:"#fff",borderRight:"1px solid #c8d3dd",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
            <div style={{padding:"0.65rem 0.9rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.14em",color:"#555"}}>QUESTIONS</div>
            <div style={{padding:"0.5rem",display:"flex",flexWrap:"wrap",gap:"4px"}}>
              {questions.map((item,i)=>{
                const isAns=!!ans[item.id]; const isCur=i===cur; const isFg=!!flg[item.id];
                let bg="#fafbfc", border="#bcc8d4", color="#445";
                if (isCur)       { bg="#003865"; border="#003865"; color="#fff"; }
                else if (isFg)   { bg="#fff8e1"; border="#ffc107"; color="#7a4e00"; }
                else if (isAns)  { bg="#d4edda"; border="#1a6e2e"; color="#1a5c28"; }
                return <button key={item.id} onClick={()=>setCur(i)}
                  style={{width:"36px",height:"36px",borderRadius:"3px",border:`2px solid ${border}`,background:bg,color,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {isFg && !isCur ? <span style={{position:"absolute",top:"-4px",right:"-4px",fontSize:"0.55rem",lineHeight:1}}>🚩</span> : null}
                  {i+1}
                </button>;
              })}
            </div>
            <div style={{padding:"0.65rem 0.9rem",borderTop:"1px solid #dde3e9",marginTop:"auto"}}>
              {[
                ["#d4edda","#1a6e2e","Answered"],
                ["#fff8e1","#ffc107","Flagged for Review"],
                ["#fafbfc","#bcc8d4","Not Answered"],
              ].map(([bg,bd,lbl])=>(
                <div key={lbl} style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px",fontSize:"0.62rem",color:"#555"}}>
                  <div style={{width:"13px",height:"13px",background:bg,border:`2px solid ${bd}`,borderRadius:"2px",flexShrink:0}}/>{lbl}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{flex:1,overflowY:"auto",padding:window.innerWidth>640?"1.25rem 1.75rem":"0.75rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <span style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#003865",background:"#ddeaf7",padding:"3px 8px",borderRadius:"2px",border:"1px solid #b3cde8"}}>{q.standard}</span>
              <span style={{fontSize:"0.78rem",color:"#666"}}>Question {cur+1} of {TOTAL}</span>
            </div>
            <button onClick={()=>setFlg(p=>({...p,[q.id]:!p[q.id]}))}
              style={{display:"flex",alignItems:"center",gap:"5px",background:isFl?"#fff8e1":"#f8f9fa",border:`1px solid ${isFl?"#ffc107":"#bcc8d4"}`,borderRadius:"3px",padding:"5px 12px",cursor:"pointer",fontSize:"0.73rem",color:isFl?"#7a4e00":"#555",fontWeight:isFl?700:400}}>
              🚩 {isFl?"Flagged":"Flag for Review"}
            </button>
          </div>
          <div style={{height:"1px",background:"#dde3e9"}}/>
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"1.25rem 1.5rem"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#888",marginBottom:"0.65rem"}}>QUESTION</div>
            <p style={{fontSize:"1.05rem",fontFamily:"Georgia,serif",color:"#0f0f0f",lineHeight:1.72,margin:0}}><MathText text={q.question}/></p>
            {q.questionImage&&<img src={q.questionImage} alt="diagram" style={{maxWidth:"100%",maxHeight:"200px",marginTop:"0.75rem",borderRadius:"3px",display:"block"}}/>}
          </div>
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"1.1rem 1.5rem"}}>
            {q.type === "plotpoint" ? (
              <>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#888",marginBottom:"0.9rem"}}>PLOT YOUR ANSWER</div>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <PlotGrid
                    placed={sel ? (() => { try { return JSON.parse(sel); } catch { return null; } })() : null}
                    onPlace={pt => {
                      const v = JSON.stringify(pt);
                      setAns(p=>({...p,[q.id]:v}));
                      handleAdaptiveAnswer(q.id, v);
                    }}
                    size={Math.min(300, window.innerWidth - 80)}
                  />
                </div>
              </>
            ) : q.type === "keypad" ? (
              <>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#888",marginBottom:"0.9rem"}}>TYPE YOUR ANSWER</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.65rem",alignItems:"flex-start"}}>
                  <input
                    type="text" inputMode="decimal"
                    value={sel ?? ""}
                    onChange={e => { setAns(p=>({...p,[q.id]:e.target.value})); handleAdaptiveAnswer(q.id, e.target.value); }}
                    placeholder="Enter your answer…"
                    style={{width:"100%",maxWidth:"260px",padding:"0.8rem 1rem",fontSize:"1.3rem",fontFamily:"monospace",fontWeight:700,border:"2px solid #003865",borderRadius:"4px",outline:"none",background:"#fafbfc",color:"#0f0f0f",letterSpacing:"0.05em"}}
                  />
                  {sel && <div style={{fontSize:"0.72rem",color:"#555"}}>Your answer: <strong>{sel}</strong></div>}
                </div>
              </>
            ) : q.type === "multiselect" ? (
              <>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#888",marginBottom:"4px"}}>SELECT ALL CORRECT ANSWERS</div>
                <div style={{fontSize:"0.7rem",color:"#888",marginBottom:"0.75rem"}}>Choose all that apply — there may be more than one correct answer.</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.55rem"}}>
                  {(q.choices||[]).filter(c=>c).map((choice,i)=>{
                    const selArr = (() => { try { return sel ? JSON.parse(sel) : []; } catch { return []; } })();
                    const chosen = selArr.includes(choice);
                    function toggleChoice() {
                      const next = chosen ? selArr.filter(c=>c!==choice) : [...selArr, choice];
                      const v = JSON.stringify(next);
                      setAns(p=>({...p,[q.id]: next.length ? v : null}));
                      handleAdaptiveAnswer(q.id, next.length ? v : null);
                    }
                    return <label key={i} onClick={toggleChoice}
                      style={{display:"flex",alignItems:"center",gap:"0.9rem",padding:"0.8rem 1rem",border:`2px solid ${chosen?"#003865":"#c8d3dd"}`,borderRadius:"3px",background:chosen?"#ddeaf7":"#fafbfc",cursor:"pointer"}}>
                      <div style={{width:"22px",height:"22px",borderRadius:"3px",border:`2px solid ${chosen?"#003865":"#9aabba"}`,background:chosen?"#003865":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {chosen && <span style={{color:"#fff",fontSize:"0.8rem",fontWeight:900}}>✓</span>}
                      </div>
                      <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",color:"#0f0f0f"}}><MathText text={choice}/></span>
                    </label>;
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#888",marginBottom:"0.9rem"}}>SELECT ONE ANSWER</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.55rem"}}>
                  {(q.choices||[]).filter(c=>c).length === 0 ? (
                    <div style={{color:"#aaa",fontSize:"0.85rem",padding:"1rem",textAlign:"center",border:"1px dashed #c8d3dd",borderRadius:"4px"}}>
                      ⚠ This question has no answer choices. Contact your teacher.
                    </div>
                  ) : (q.choices||[]).map((choice,i)=>{
                    const chosen = sel===choice;
                    return <label key={i} onClick={()=>{ setAns(p=>({...p,[q.id]:choice})); handleAdaptiveAnswer(q.id, choice); }}
                      style={{display:"flex",alignItems:"center",gap:"0.9rem",padding:"0.8rem 1rem",border:`2px solid ${chosen?"#003865":"#c8d3dd"}`,borderRadius:"3px",background:chosen?"#ddeaf7":"#fafbfc",cursor:"pointer"}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",border:`2px solid ${chosen?"#003865":"#9aabba"}`,background:chosen?"#003865":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:"0.7rem",fontWeight:700,color:chosen?"#fff":"#667"}}>{LETTERS[i]}</span>
                      </div>
                      <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",color:"#0f0f0f"}}><MathText text={choice}/></span>
                    </label>;
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{background:"#fff",borderTop:"2px solid #c8d3dd",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.65rem 1.5rem",flexShrink:0}}>
        <button onClick={()=>setCur(c=>Math.max(0,c-1))} disabled={cur===0}
          style={{background:cur===0?"#e8edf2":"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"7px 20px",fontSize:"0.83rem",cursor:cur===0?"not-allowed":"pointer",color:cur===0?"#aaa":"#333",fontWeight:600}}>◀ Back</button>
        <div style={{display:"flex",gap:"0.75rem",alignItems:"center",fontSize:"0.75rem"}}>
          <span style={{color:"#1a6e2e",fontWeight:700}}>✓ {ansCount} answered</span>
          {flgCount>0&&<span style={{color:"#7a4e00",fontWeight:700}}>🚩 {flgCount} flagged</span>}
          {TOTAL-ansCount>0&&<span style={{color:"#888"}}>{TOTAL-ansCount} left</span>}
        </div>
        {cur<TOTAL-1
          ?<button onClick={()=>setCur(c=>c+1)} style={{background:"#003865",border:"none",borderRadius:"3px",padding:"7px 20px",fontSize:"0.83rem",cursor:"pointer",color:"#fff",fontWeight:600}}>Next ▶</button>
          :<button onClick={()=>setModal(true)} style={{background:"#1a6e2e",border:"none",borderRadius:"3px",padding:"7px 20px",fontSize:"0.83rem",cursor:"pointer",color:"#fff",fontWeight:700}}>Submit Test ✓</button>
        }
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:"#fff",borderRadius:"4px",width:"100%",maxWidth:"400px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.22)"}}>
            <div style={{background:"#003865",color:"#fff",padding:"0.9rem 1.25rem"}}>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.12em",opacity:.7,marginBottom:"2px"}}>CONFIRMATION</div>
              <div style={{fontSize:"1rem",fontWeight:700}}>Submit Test?</div>
            </div>
            <div style={{padding:"1.25rem"}}>
              <div style={{display:"flex",gap:"1rem",marginBottom:"0.85rem",flexWrap:"wrap"}}>
                <div style={{flex:1,background:"#f0faf2",border:"1px solid #b3dfc0",borderRadius:"4px",padding:"0.65rem 0.85rem",textAlign:"center"}}>
                  <div style={{fontSize:"1.4rem",fontWeight:700,color:"#1a6e2e"}}>{ansCount}</div>
                  <div style={{fontSize:"0.65rem",color:"#555"}}>Answered</div>
                </div>
                <div style={{flex:1,background:flgCount?"#fff8e1":"#f8fafc",border:`1px solid ${flgCount?"#ffc107":"#dde3e9"}`,borderRadius:"4px",padding:"0.65rem 0.85rem",textAlign:"center"}}>
                  <div style={{fontSize:"1.4rem",fontWeight:700,color:flgCount?"#7a4e00":"#aaa"}}>{flgCount}</div>
                  <div style={{fontSize:"0.65rem",color:"#555"}}>Flagged</div>
                </div>
                <div style={{flex:1,background:TOTAL-ansCount?"#fdf2f2":"#f8fafc",border:`1px solid ${TOTAL-ansCount?"#f0b8b8":"#dde3e9"}`,borderRadius:"4px",padding:"0.65rem 0.85rem",textAlign:"center"}}>
                  <div style={{fontSize:"1.4rem",fontWeight:700,color:TOTAL-ansCount?"#8b1a1a":"#aaa"}}>{TOTAL-ansCount}</div>
                  <div style={{fontSize:"0.65rem",color:"#555"}}>Unanswered</div>
                </div>
              </div>
              {flgCount>0&&(
                <div style={{background:"#fff8e1",border:"1px solid #ffc107",borderRadius:"3px",padding:"0.6rem 0.85rem",marginBottom:"0.65rem",fontSize:"0.82rem",color:"#7a4e00",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"0.5rem"}}>
                  <span>🚩 You have <strong>{flgCount}</strong> question{flgCount>1?"s":""}  flagged for review.</span>
                  <button onClick={()=>{ setModal(false); const firstFlagged=questions.findIndex((_,i)=>flg[questions[i].id]); if(firstFlagged>=0)setCur(firstFlagged); }}
                    style={{background:"#ffc107",border:"none",borderRadius:"3px",padding:"4px 10px",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",color:"#7a4e00",whiteSpace:"nowrap"}}>
                    Review →
                  </button>
                </div>
              )}
              {TOTAL-ansCount>0&&<div style={{fontSize:"0.82rem",color:"#8b1a1a",background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"3px",padding:"0.55rem 0.85rem",marginBottom:"0.65rem"}}>⚠ {TOTAL-ansCount} question{TOTAL-ansCount>1?"s are":" is"} unanswered — these will be marked incorrect.</div>}
              <p style={{fontSize:"0.78rem",color:"#888",margin:0}}>Once submitted you cannot return to change your answers.</p>
            </div>
            <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.25rem",borderTop:"1px solid #dde3e9"}}>
              <button onClick={()=>setModal(false)} style={{flex:1,background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:"#333"}}>← Keep Working</button>
              <button onClick={doSubmit} style={{flex:1,background:"#1a6e2e",border:"none",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",color:"#fff",fontWeight:700}}>Submit Final ✓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student Results ────────────────────────────────────────
function StudentResults({ session, questions, onReset }) {
  const p = session.pct;
  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",fontFamily:"sans-serif",display:"flex",flexDirection:"column"}}>
      <TopBar title="Grade 5 Mathematics — Results"/>
      <div style={{flex:1,display:"flex",justifyContent:"center",padding:"2rem 1rem"}}>
        <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",width:"100%",maxWidth:"640px",boxShadow:"0 2px 12px rgba(0,0,0,.07)",overflow:"hidden"}}>
          <div style={{background:"#f0f4f8",borderBottom:"1px solid #c8d3dd",padding:"1.25rem 1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:"#888",marginBottom:"4px"}}>STUDENT</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:"#1a1a1a"}}>{session.name}</div>
              <div style={{fontSize:"1.8rem",fontWeight:700,color:lvlC(p),fontFamily:"Georgia,serif",marginTop:"4px"}}>{session.score}/{session.total} <span style={{fontSize:"1rem",opacity:.6}}>({p}%)</span></div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"0.62rem",color:"#888",marginBottom:"4px"}}>PERFORMANCE LEVEL</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:lvlC(p),padding:"6px 16px",background:lvlBg(p),border:`1px solid ${lvlBd(p)}`,borderRadius:"3px"}}>{lvl(p)}</div>
            </div>
          </div>
          <div style={{padding:"1.25rem 1.5rem"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"0.75rem"}}>ITEM REVIEW</div>
            {questions.map((q,i)=>{
              const a = session.answers[q.id];
              // Grade using same logic as doSubmit
              function gradeAns(q, given) {
                if (!given) return false;
                if (q.type === "plotpoint") {
                  const ans = Array.isArray(q.answer) ? q.answer : (()=>{try{return JSON.parse(q.answer);}catch{return null;}})();
                  return given === JSON.stringify(ans);
                }
                if (q.type === "multiselect") {
                  const correct = Array.isArray(q.answer) ? q.answer : [];
                  try { const ga = JSON.parse(given); return JSON.stringify([...ga].sort())===JSON.stringify([...correct].sort()); } catch { return false; }
                }
                if (q.type === "keypad") return String(q.answer??"").trim().toLowerCase()===String(given).trim().toLowerCase();
                return given === q.correct;
              }
              const ok = gradeAns(q, a);
              // Human-readable correct answer
              const correctDisplay = (() => {
                if (q.type === "plotpoint") { try { const arr = Array.isArray(q.answer)?q.answer:JSON.parse(q.answer); return `(${arr[0]}, ${arr[1]})`; } catch { return "?"; } }
                if (q.type === "multiselect") { const arr = Array.isArray(q.answer)?q.answer:[]; return arr.join(", ") || "?"; }
                if (q.type === "keypad") return String(q.answer ?? "");
                return q.correct;
              })();
              // Human-readable student answer
              const studentDisplay = (() => {
                if (!a) return null;
                if (q.type === "plotpoint") { try { const arr=JSON.parse(a); return `(${arr[0]}, ${arr[1]})`; } catch { return a; } }
                if (q.type === "multiselect") { try { return JSON.parse(a).join(", "); } catch { return a; } }
                return a;
              })();
              return <div key={q.id} style={{display:"flex",gap:"0.75rem",marginBottom:"0.6rem",padding:"0.7rem 0.85rem",background:ok?"#f0faf2":"#fdf2f2",border:`1px solid ${ok?"#b3dfc0":"#f0b8b8"}`,borderRadius:"3px"}}>
                <div style={{width:"22px",height:"22px",borderRadius:"50%",background:ok?"#1a6e2e":"#8b1a1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"1px"}}>
                  <span style={{color:"#fff",fontSize:"0.7rem",fontWeight:700}}>{i+1}</span>
                </div>
                <div style={{flex:1,fontSize:"0.82rem"}}>
                  <div style={{color:"#777",fontSize:"0.63rem",letterSpacing:"0.08em",marginBottom:"2px"}}>{q.standard}</div>
                  <div style={{color:"#1a1a1a",fontFamily:"Georgia,serif",marginBottom:ok?0:"4px"}}><MathText text={q.question}/></div>
                  {!ok&&<div style={{fontSize:"0.78rem"}}>
                    <span style={{color:"#1a6e2e"}}>Correct: <strong>{correctDisplay}</strong></span>
                    {studentDisplay&&<span style={{color:"#8b1a1a"}}> · Your answer: {studentDisplay}</span>}
                    {!studentDisplay&&<span style={{color:"#8b1a1a"}}> · Not answered</span>}
                  </div>}
                </div>
                <span style={{fontWeight:700,fontSize:"0.9rem",color:ok?"#1a6e2e":"#8b1a1a"}}>{ok?"✓":"✗"}</span>
              </div>;
            })}
          </div>
          <div style={{padding:"1rem 1.5rem",borderTop:"1px solid #dde3e9",display:"flex",justifyContent:"flex-end"}}>
            <button onClick={onReset} style={{background:"#003865",color:"#fff",border:"none",borderRadius:"3px",padding:"0.65rem 1.75rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600}}>Start New Session</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GoogleSignIn: used for ?code= and ?practice= link flows ──────────────────
function GoogleSignIn({ mode, codeOrClassId, onSuccess, onBack }) {
  // mode = "test" | "practice"
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const btnRef = useRef(null);
  const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      ux_mode: "popup",
    });
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: 280,
    });
  // eslint-disable-line
  }, [CLIENT_ID]);

  async function handleCredential(response) {
    setLoading(true); setErr("");
    try {
      const body = { token: response.credential };
      if (mode === "test")     body.code    = codeOrClassId;
      if (mode === "practice") body.classId = codeOrClassId;
      const r = await fetch(`${API}/auth/google/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.detail || "Sign-in failed. Check with your teacher."); setLoading(false); return; }
      onSuccess(data.student, data.cls);
    } catch {
      setErr("Could not connect. Try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",padding:"2rem 1rem",gap:"2rem"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.18em",color:"#888",marginBottom:"6px"}}>
          GEORGIA MILESTONES READINESS TRAINER
        </div>
        <div style={{fontSize:"1.6rem",fontWeight:700,color:mode==="practice"?"#1a6e2e":"#003865",fontFamily:"Georgia,serif"}}>
          {mode === "practice" ? "🎯 Practice Mode" : "📝 Take a Test"}
        </div>
        <div style={{fontSize:"0.85rem",color:"#888",marginTop:"4px"}}>
          Sign in with your school Google account to continue
        </div>
      </div>

      <div style={{background:"#fff",borderRadius:"8px",boxShadow:"0 4px 24px rgba(0,0,0,.1)",
        padding:"2rem 2.5rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.5rem",
        width:"100%",maxWidth:"360px"}}>
        {loading ? (
          <div style={{color:"#888",fontSize:"0.9rem"}}>Verifying…</div>
        ) : (
          <>
            <div style={{fontSize:"0.82rem",color:"#555",textAlign:"center",lineHeight:1.6}}>
              Use the Google account you use for Google Classroom.
            </div>
            <div ref={btnRef}></div>
            {!CLIENT_ID && (
              <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",
                padding:"0.5rem 1rem",fontSize:"0.78rem",color:"#8b1a1a",textAlign:"center"}}>
                Google auth not configured. Contact your administrator.
              </div>
            )}
          </>
        )}
        {err && (
          <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",
            padding:"0.55rem 1.25rem",fontSize:"0.82rem",color:"#8b1a1a",fontWeight:600,textAlign:"center",width:"100%",boxSizing:"border-box"}}>
            ⚠ {err}
          </div>
        )}
      </div>

      <button onClick={onBack} style={{fontSize:"0.72rem",color:"#888",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
        ← Back
      </button>
    </div>
  );
}

// ── Main shell ─────────────────────────────────────────────
export default function MathTest({ onBack, identity, prefillCode, directPracticeClassId }) {
  // identity     = pre-filled from PIN login
  // prefillCode  = test code from ?code= URL param (skip code entry)
  // directPracticeClassId = class ID from ?practice= URL param (skip to practice name picker)
  const initScreen = directPracticeClassId ? "google-practice"
                   : prefillCode           ? "google-test"
                   : identity              ? "mode"
                                           : "login";
  const [screen,          setScreen]          = useState(initScreen);
  const [student,         setStudent]         = useState(
    identity ? { id: identity.studentId, name: identity.studentName } : null
  );
  const [cls,             setCls]             = useState(
    identity ? { id: identity.classId, name: identity.className } : null
  );
  const [testCode,        setTestCode]        = useState("");
  const [finalSession,    setFinalSession]    = useState(null);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [questions,       setQuestions]       = useState(FALLBACK_QUESTIONS);
  const [isAdaptive,      setIsAdaptive]      = useState(false);
  const [isDrill,         setIsDrill]         = useState(false);
  const [untimed,         setUntimed]         = useState(false);
  const [timeLimitSecs,   setTimeLimitSecs]   = useState(1800);
  const [warnSecs,        setWarnSecs]        = useState(300);

  function reset() {
    if (prefillCode || directPracticeClassId) { onBack(); return; }
    setFinalSession(null); setPracticeHistory([]);
    setTestCode("");
    setScreen(identity ? "mode" : "login");
  }

  function handleStartTest(studentObj, classObj, code, testInfo) {
    setStudent(studentObj); setCls(classObj); setTestCode(code);
    const drill = testInfo?.type === "drill";
    setIsDrill(drill);
    setIsAdaptive(!!testInfo?.adaptive && !drill);

    // Apply accommodations from student profile
    const extFactor = studentObj?.extendedTime === "2x" ? 2
                    : studentObj?.extendedTime === "1.5x" ? 1.5 : 1;
    const reduceChoices = !!studentObj?.reduceChoices;

    if (drill) {
      const qs = generateDrill(testInfo.drillStandards || [], testInfo.drillCount || 10);
      setQuestions(qs.length ? qs : FALLBACK_QUESTIONS.slice(0, testInfo.drillCount || 10));
    } else if (testInfo?.questions?.length) {
      // Apply reduce choices: remove one wrong MCQ option per question
      const qs = testInfo.questions.map(q => {
        if (!reduceChoices || q.type !== "mcq" || !q.choices || q.choices.length < 4) return q;
        const wrongIdxs = q.choices
          .map((c,i) => i)
          .filter(i => q.choices[i] !== q.correct);
        if (wrongIdxs.length === 0) return q;
        const removeIdx = wrongIdxs[Math.floor(Math.random() * wrongIdxs.length)];
        return { ...q, choices: q.choices.filter((_,i) => i !== removeIdx) };
      });
      setQuestions(qs);
    }
    setUntimed(!!testInfo?.untimed);
    const baseTime = testInfo?.timeLimitSecs ?? 1800;
    setTimeLimitSecs(Math.round(baseTime * extFactor));
    setWarnSecs(testInfo?.warnSecs ?? 300);
    setScreen("test");
  }

  function handleStartPractice(studentObj, classObj) {
    setStudent(studentObj); setCls(classObj);
    setScreen("practice");
  }

  async function handleFinishTest(session) {
    const enriched = {
      ...session,
      studentId:   student?.id   || "",
      studentName: student?.name || session.name,
      classId:     cls?.id       || "",
      className:   cls?.name     || "",
      testCode,
      mode: isDrill ? "drill" : "test",
    };
    try {
      await fetch(`${API}/submit`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(enriched),
      });
    } catch {}
    setFinalSession(enriched);
    setScreen("results");
  }

  async function handleFinishPractice(session, history) {
    try {
      await fetch(`${API}/submit`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(session),
      });
    } catch {}
    setFinalSession(session);
    setPracticeHistory(history);
    setScreen("practice-results");
  }

  // ── Mode picker — shown when identity is known (PIN login) ──
  if (screen === "mode") {
    const s = student || (identity ? { id: identity.studentId, name: identity.studentName } : null);
    const c = cls    || (identity ? { id: identity.classId,   name: identity.className   } : null);
    return (
      <div style={{minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",padding:"2rem 1rem",gap:"1.5rem"}}>
        <div style={{background:"#003865",borderRadius:"6px",padding:"1rem 2rem",color:"#fff",textAlign:"center",width:"100%",maxWidth:"480px"}}>
          <div style={{fontSize:"0.6rem",letterSpacing:"0.16em",opacity:.65,marginBottom:"3px"}}>SIGNED IN</div>
          <div style={{fontSize:"1.2rem",fontWeight:700}}>{s?.name}</div>
          <div style={{fontSize:"0.8rem",opacity:.75,marginTop:"2px"}}>{c?.name}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"1rem",width:"100%",maxWidth:"480px"}}>
          <button onClick={()=>handleStartPractice(s,c)}
            style={{background:"#fff",border:"2px solid #1a6e2e",borderRadius:"8px",padding:"1.75rem 2rem",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:"1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
            <div style={{width:"52px",height:"52px",borderRadius:"50%",background:"#f0faf2",border:"2px solid #b3dfc0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"1.6rem"}}>🎯</div>
            <div>
              <div style={{fontSize:"1.05rem",fontWeight:700,color:"#1a6e2e",marginBottom:"4px"}}>Practice Mode</div>
              <div style={{fontSize:"0.82rem",color:"#555",lineHeight:1.5}}>Adaptive questions targeting your weak areas. Instant feedback after each answer.</div>
            </div>
          </button>
          <button onClick={()=>setScreen("code")}
            style={{background:"#fff",border:"2px solid #003865",borderRadius:"8px",padding:"1.75rem 2rem",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:"1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,.06)"}}>
            <div style={{width:"52px",height:"52px",borderRadius:"50%",background:"#ddeaf7",border:"2px solid #9dbfe0",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"1.6rem"}}>📝</div>
            <div>
              <div style={{fontSize:"1.05rem",fontWeight:700,color:"#003865",marginBottom:"4px"}}>Take a Test</div>
              <div style={{fontSize:"0.82rem",color:"#555",lineHeight:1.5}}>Enter a test code from your teacher.</div>
            </div>
          </button>
        </div>
        <button onClick={onBack} style={{fontSize:"0.78rem",color:"#888",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
          ← Sign out
        </button>
      </div>
    );
  }

  // ── Code entry (from mode picker) ──
  if (screen === "code") {
    const s = student || { id: identity?.studentId, name: identity?.studentName };
    const c = cls    || { id: identity?.classId,   name: identity?.className };
    return <StudentLogin
      prefill={{ student: s, cls: c }}
      onStartTest={handleStartTest}
      onStartPractice={handleStartPractice}
      onBack={()=>setScreen("mode")}
      codeOnly
    />;
  }

  if (screen === "login")
    return <StudentLogin onStartTest={handleStartTest} onStartPractice={handleStartPractice} onBack={onBack} prefillCode={prefillCode}/>;

  // ── Google Sign-In flows (from Google Classroom links) ──
  if (screen === "google-test")
    return <GoogleSignIn mode="test" codeOrClassId={prefillCode} onBack={onBack}
      onSuccess={async (studentObj, classObj) => {
        // Fetch testInfo so handleStartTest gets full config
        try {
          const r = await fetch(`${API}/test/code/${encodeURIComponent(prefillCode)}`);
          const testInfo = await r.json();
          handleStartTest(studentObj, classObj, prefillCode, testInfo);
        } catch { handleStartTest(studentObj, classObj, prefillCode, null); }
      }} />;

  if (screen === "google-practice")
    return <GoogleSignIn mode="practice" codeOrClassId={directPracticeClassId} onBack={onBack}
      onSuccess={(studentObj, classObj) => handleStartPractice(studentObj, classObj)} />;

  if (screen === "practice")
    return <PracticeMode student={student} cls={cls} onFinish={handleFinishPractice} onQuit={reset}/>;

  if (screen === "practice-results")
    return <PracticeResults session={finalSession} history={practiceHistory} onReset={reset}/>;

  if (screen === "test")
    return <StudentTest studentName={student?.name || ""} studentId={student?.id || ""} questions={questions} adaptive={isAdaptive} onFinish={handleFinishTest} untimed={untimed} timeLimitSecs={timeLimitSecs} warnSecs={warnSecs}/>;

  if (screen === "results")
    return <StudentResults session={finalSession} questions={questions} onReset={()=>{ reset(); onBack(); }}/>;
}
