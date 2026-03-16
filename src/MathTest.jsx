import { useState, useEffect, useRef } from "react";
import { useRive } from "@rive-app/react-canvas";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import MathText from "./shared/MathText";
import TopBar from "./shared/TopBar";
import { QUESTIONS as FALLBACK_QUESTIONS, START_SECS, LETTERS, S, pct, lvl, lvlC, lvlBg, lvlBd, fmtTime, now, saveSession, sendHeartbeat, API } from "./shared/constants";
import { buildWeightMap, updateSessionWeights, pickAdaptiveQuestion, ALL_STANDARDS, generateDrill } from "./adaptive";
import PlotGrid from "./shared/PlotGrid";
import AvatarScreen, { GRACIE_THEMES } from "./Avatar";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

// ── Student Login ──────────────────────────────────────────
// Flow: google → choice (drill | test code) → [code → confirm] or [drill start]
function StudentLogin({ onStartTest, onStartDrill, onBack, prefillCode }) {
  const [credential, setCredential] = useState(null); // stored Google ID token
  const [code,       setCode]       = useState(prefillCode || "");
  const [err,        setErr]        = useState("");
  const [checking,   setChecking]   = useState(false);
  const [testInfo,   setTestInfo]   = useState(null);
  const [student,    setStudent]    = useState(null);
  const [cls,        setCls]        = useState(null);
  // skip google step if credential already provided from home screen sign-in
  const [step, setStep] = useState("google"); // google → choice → code → confirm
  const googleBtnRef = useRef(null);

  // Mount Google button on the google step
  useEffect(() => {
    if (step !== "google" || !GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp) => {
        setCredential(resp.credential);
        setErr("");
        setStep(prefillCode ? "code" : "choice");
      },
      ux_mode: "popup",
      auto_select: false,
    });
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 280,
      });
    }
  }, [step]); // eslint-disable-line

  // Step 2 — validate test code + verify stored credential against roster
  async function checkCode() {
    const c = code.trim().toUpperCase();
    if (!c) { setErr("Please enter the test code."); return; }
    setChecking(true); setErr("");
    try {
      const r = await fetch(`${API}/test/code/${encodeURIComponent(c)}`);
      const data = await r.json();
      if (!data.found || (!data.questions?.length && data.type !== "drill")) {
        setErr("Invalid test code. Check with your teacher.");
        setChecking(false); return;
      }
      const vr = await fetch(`${API}/auth/google/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential, code: c }),
      });
      const vd = await vr.json();
      if (!vr.ok) {
        setErr(vd.detail || "Your Google account is not on the roster for this test. Check with your teacher.");
        setChecking(false); return;
      }
      if (data.oneAttempt) {
        try {
          const ar = await fetch(`${API}/test/attempt-check?code=${encodeURIComponent(c)}&studentId=${encodeURIComponent(vd.student.id)}`);
          const ad = await ar.json();
          if (ad.attempted) { setErr("You have already submitted this test. Only one attempt is allowed."); setChecking(false); return; }
        } catch {}
      }
      setTestInfo(data); setStudent(vd.student); setCls(vd.cls);
      setStep("confirm");
    } catch { setErr("Could not connect to server. Try again."); }
    setChecking(false);
  }

  // ── Google Sign-In screen ──
  if (step === "google") return (
    <div style={S.page}>
      <div style={{background:"#003865",width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        {onBack && <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:"pointer",fontSize:"0.72rem"}}>← Back</button>}
        <div style={{color:"#fff",fontSize:"0.95rem",fontWeight:700}}>Georgia Milestones Readiness Trainer</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
        <div style={S.card}>
          <div style={S.hdr}>
            <div style={S.hdrSub}>STUDENT SIGN IN</div>
            <div style={S.hdrTitle}>Sign in with Google</div>
          </div>
          <div style={{padding:"1.75rem 2rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem"}}>
            <div style={{fontSize:"0.85rem",color:"#555",textAlign:"center",lineHeight:1.6}}>
              Use your <strong>school Google account</strong> to get started.
            </div>
            <div ref={googleBtnRef}></div>
            {err && <div style={{...S.errBox,width:"100%"}}>⚠ {err}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Choice screen ──
  if (step === "choice") return (
    <div style={S.page}>
      <div style={{background:"#003865",width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        <button onClick={()=>{setStep("google");setErr("");}} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:"pointer",fontSize:"0.72rem"}}>← Back</button>
        <div style={{color:"#fff",fontSize:"0.95rem",fontWeight:700}}>Georgia Milestones Readiness Trainer</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"1rem",width:"100%",maxWidth:"360px"}}>
          <div style={{textAlign:"center",fontSize:"0.85rem",color:"#666",marginBottom:"0.25rem"}}>Signed in. What would you like to do?</div>
          <button onClick={async () => {
            setChecking(true); setErr("");
            try {
              const r = await fetch(`${API}/auth/google/drill`, {
                method:"POST", headers:{"Content-Type":"application/json"},
                body: JSON.stringify({ token: credential }),
              });
              const d = await r.json();
              if (!r.ok) { setErr(d.detail || "Sign-in failed."); setChecking(false); return; }
              onStartDrill(d.student, d.cls);
            } catch { setErr("Could not connect. Try again."); }
            setChecking(false);
          }} disabled={checking}
            style={{background:"#fff",border:"2px solid #7a4500",borderRadius:"8px",padding:"1.5rem 2rem",cursor:"pointer",display:"flex",alignItems:"center",gap:"1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,.06)",textAlign:"left",opacity:checking?0.6:1}}>
            <div style={{width:"52px",height:"52px",borderRadius:"50%",background:"#fff8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",flexShrink:0}}>⚡</div>
            <div>
              <div style={{fontSize:"1.1rem",fontWeight:700,color:"#7a4500",marginBottom:"3px"}}>Fluency Drill</div>
              <div style={{fontSize:"0.8rem",color:"#888"}}>3-min adaptive fact practice</div>
            </div>
          </button>
          <button onClick={()=>{setErr(""); setStep("code");}} disabled={checking}
            style={{background:"#fff",border:"2px solid #003865",borderRadius:"8px",padding:"1.5rem 2rem",cursor:"pointer",display:"flex",alignItems:"center",gap:"1.25rem",boxShadow:"0 2px 8px rgba(0,0,0,.06)",textAlign:"left",opacity:checking?0.6:1}}>
            <div style={{width:"52px",height:"52px",borderRadius:"50%",background:"#f0f4f8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",flexShrink:0}}>📝</div>
            <div>
              <div style={{fontSize:"1.1rem",fontWeight:700,color:"#003865",marginBottom:"3px"}}>Take a Test</div>
              <div style={{fontSize:"0.8rem",color:"#888"}}>Enter the code from your teacher</div>
            </div>
          </button>
          {err && <div style={{...S.errBox}}>⚠ {err}</div>}
        </div>
      </div>
    </div>
  );

  // ── Code entry screen ──
  if (step === "code") return (
    <div style={S.page}>
      <div style={{background:"#003865",width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        <button onClick={()=>{setStep("choice");setErr("");}} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:"pointer",fontSize:"0.72rem"}}>← Back</button>
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
            <button onClick={checkCode} disabled={checking||!code.trim()}
              style={{...S.btnPri,width:"100%",opacity:(checking||!code.trim())?0.6:1}}>
              {checking ? "Verifying…" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Confirm screen ──
  if (step === "confirm" && testInfo && student) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.hdr}>
          <div style={S.hdrSub}>STUDENT SIGN IN</div>
          <div style={S.hdrTitle}>Confirm Your Information</div>
        </div>
        <div style={{padding:"1.75rem 2rem"}}>
          <div style={S.confirmBox}>
            {(testInfo.type === "drill" ? [
              ["STUDENT NAME", student?.name],
              ["CLASS",        cls?.name],
              ["DRILL",        testInfo.title || "Fact Fluency Drill"],
              ["TEST CODE",    code.toUpperCase()],
              ["FORMAT",       "Adaptive — all 4 operations"],
              ["TIME LIMIT",   "3 Minutes"],
              ["INPUT",        "Short answer (type your answer)"],
            ] : [
              ["STUDENT NAME", student?.name],
              ["CLASS",        cls?.name],
              ["TEST",         testInfo.title || "Grade 5 Mathematics"],
              ["TEST CODE",    code.toUpperCase()],
              ["QUESTIONS",    String(testInfo.questions.length)],
              ["TIME LIMIT",   testInfo.untimed ? "No Time Limit" : (() => {
                const extFactor = student?.extendedTime === "2x" ? 2 : student?.extendedTime === "1.5x" ? 1.5 : 1;
                const base = testInfo.timeLimitSecs || 1800;
                const final = Math.round(base * extFactor / 60);
                return extFactor > 1 ? `${final} min (${student.extendedTime} extended)` : `${final} Minutes`;
              })()],
              ["CALCULATOR",   "Not Permitted"],
              ...(student?.reduceChoices ? [["ANSWER CHOICES", "Reduced (3 per question)"]] : []),
              ...(testInfo.oneAttempt ? [["ATTEMPTS", "1 — Cannot retake"]] : []),
            ]).map(([k,v],i,a) => (
              <div key={k} style={{...S.confirmRow, borderBottom:i<a.length-1?"1px solid #eef1f4":"none"}}>
                <span style={S.confirmK}>{k}</span>
                <span style={{...S.confirmV, fontFamily:k==="TEST CODE"?"monospace":"inherit", letterSpacing:k==="TEST CODE"?"0.18em":"inherit"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:"#fff8e1",border:"1px solid #ffd166",borderRadius:"3px",padding:"0.65rem 1rem",marginBottom:"0.75rem",fontSize:"0.8rem",color:"#7a4e00"}}>
            {testInfo.type === "drill"
              ? "⚡ Once you click Begin, your 3-minute drill starts immediately. Answer as many problems as you can!"
              : "⚠ Once you click Begin Test, your timer starts immediately."}
          </div>
          {testInfo.oneAttempt && (
            <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"3px",padding:"0.65rem 1rem",marginBottom:"1.25rem",fontSize:"0.8rem",color:"#8b1a1a",display:"flex",alignItems:"center",gap:"0.5rem"}}>
              🚫 <span><strong>One attempt only.</strong> Once you submit, you cannot retake this test.</span>
            </div>
          )}
          <div style={{display:"flex",gap:"0.75rem"}}>
            <button onClick={()=>setStep("code")} style={S.btnSec}>← Go Back</button>
            <button onClick={()=>onStartTest(student, cls, code.toUpperCase(), testInfo)} style={S.btnPri}>
              {testInfo.type === "drill" ? "Begin Drill ⚡" : "Begin Test →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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
    const session = { score, total:TOTAL, pct:pct(score,TOTAL), submitted:now(), timeUsed:untimed ? fmtTime(0) : fmtTime(timeLimitSecs-secs), answers:{...ans}, violations };
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

// ── Drill Google Sign-In (no code required) ────────────────
function DrillLogin({ onSuccess, onBack }) {
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp) => {
        setLoading(true); setErr("");
        try {
          const r = await fetch(`${API}/auth/google/drill`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: resp.credential }),
          });
          const d = await r.json();
          if (!r.ok) { setErr(d.detail || "Sign-in failed."); setLoading(false); return; }
          onSuccess(d.student, d.cls);
        } catch { setErr("Could not connect. Try again."); setLoading(false); }
      },
      ux_mode: "popup",
      auto_select: false,
    });
    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 280,
      });
    }
  }, []); // eslint-disable-line

  return (
    <div style={S.page}>
      <div style={{background:"#7a4500",width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        {onBack && <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:"pointer",fontSize:"0.72rem"}}>← Back</button>}
        <div style={{color:"#fff",fontSize:"0.95rem",fontWeight:700}}>⚡ Fact Fluency Practice</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
        <div style={S.card}>
          <div style={S.hdr}>
            <div style={S.hdrSub}>FACT FLUENCY</div>
            <div style={S.hdrTitle}>Sign in to Start Drilling</div>
          </div>
          <div style={{padding:"1.75rem 2rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem"}}>
            <div style={{fontSize:"0.85rem",color:"#555",textAlign:"center",lineHeight:1.6}}>
              Sign in with your <strong>school Google account</strong>.<br/>
              You must be on a class roster to access drills.
            </div>
            {loading ? (
              <div style={{color:"#888",fontSize:"0.9rem"}}>Starting your drill…</div>
            ) : (
              <div ref={btnRef}></div>
            )}
            {err && <div style={{...S.errBox,width:"100%"}}>⚠ {err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fact Fluency Drill ─────────────────────────────────────
const DRILL_SECS = 180; // 3 minutes

// LEVEL_DEFS — 10 levels per operation, aligned to GA K-5 Math Standards
// Prerequisite gates enforced in pickDrillOp:
//   mul unlocks when add >= 4  (student has reached Grade 1 add facts)
//   div unlocks when sub >= 4 AND mul >= 6  (basic × facts mastered)
// LEVEL_DEFS — 10 levels per operation, aligned to GA K-5 Math Standards
//
// Grade bands per level:
//   Add/Sub  Lv 1-2 = K   |  Lv 3-4 = Gr 1  |  Lv 5-6 = Gr 2  |  Lv 7-8 = Gr 3  |  Lv 9-10 = Gr 4
//   Mul      Lv 1   = Gr2 foundation  |  Lv 2-7 = Gr 3  |  Lv 8-9 = Gr 4  |  Lv 10 = Gr 5
//   Div      Lv 1-5 = Gr 3  |  Lv 6-8 = Gr 4  |  Lv 9-10 = Gr 5
//
// Prerequisite gates (enforced in pickDrillOp):
//   mul unlocks when add >= 6 AND sub >= 6  (K–Grade 2 mastered)
//   div unlocks when sub >= 6 AND mul >= 6  (K–Grade 2 sub + all basic × facts mastered)
const LEVEL_DEFS = {
  add: [
    { desc: "Add within 5",                            standard: "K.NR.5", grade: "Kindergarten" }, // 1
    { desc: "Add within 10",                           standard: "K.NR.5", grade: "Kindergarten" }, // 2
    { desc: "Add within 20 (single digits)",           standard: "1.NR.2", grade: "Grade 1" },      // 3
    { desc: "2-digit + 1-digit, within 100",           standard: "1.NR.5", grade: "Grade 1" },      // 4
    { desc: "2-digit + 2-digit, within 100",           standard: "2.NR",   grade: "Grade 2" },      // 5
    { desc: "3-digit + 2-digit, within 1,000",         standard: "2.NR",   grade: "Grade 2" },      // 6
    { desc: "3-digit + 3-digit, fluently within 1,000",standard: "3.NR",   grade: "Grade 3" },      // 7
    { desc: "4-digit + 3-digit, within 10,000",        standard: "3.NR",   grade: "Grade 3" },      // 8
    { desc: "5-digit + 4-digit, within 100,000",       standard: "4.NR",   grade: "Grade 4" },      // 9
    { desc: "Add through hundred-thousands",            standard: "4.NR",   grade: "Grade 4" },      // 10
  ],
  sub: [
    { desc: "Subtract within 5",                           standard: "K.NR.5", grade: "Kindergarten" }, // 1
    { desc: "Subtract within 10",                          standard: "K.NR.5", grade: "Kindergarten" }, // 2
    { desc: "Subtract within 20",                          standard: "1.NR.2", grade: "Grade 1" },      // 3
    { desc: "2-digit − 1-digit, within 100",               standard: "1.NR.5", grade: "Grade 1" },      // 4
    { desc: "2-digit − 2-digit, within 100",               standard: "2.NR",   grade: "Grade 2" },      // 5
    { desc: "3-digit − 2-digit, within 1,000",             standard: "2.NR",   grade: "Grade 2" },      // 6
    { desc: "3-digit − 3-digit, fluently within 1,000",    standard: "3.NR",   grade: "Grade 3" },      // 7
    { desc: "4-digit − 3-digit, within 10,000",            standard: "3.NR",   grade: "Grade 3" },      // 8
    { desc: "5-digit − 4-digit, within 100,000",           standard: "4.NR",   grade: "Grade 4" },      // 9
    { desc: "Subtract through hundred-thousands",           standard: "4.NR",   grade: "Grade 4" },      // 10
  ],
  mul: [
    { desc: "Equal groups / arrays to 5×5",           standard: "2.NR",    grade: "Grade 2" },      // 1 — foundation
    { desc: "× 0 and × 1",                            standard: "3.PAR.3", grade: "Grade 3" },      // 2
    { desc: "× 2, × 5, × 10",                         standard: "3.PAR.3", grade: "Grade 3" },      // 3
    { desc: "× 3 and × 4",                            standard: "3.PAR.3", grade: "Grade 3" },      // 4
    { desc: "× 6 and × 7",                            standard: "3.PAR.3", grade: "Grade 3" },      // 5
    { desc: "× 8 and × 9 (within 100)",               standard: "3.PAR.3", grade: "Grade 3" },      // 6
    { desc: "× multiples of 10 (10–90)",              standard: "3.PAR.3", grade: "Grade 3" },      // 7
    { desc: "2-digit × 1-digit",                      standard: "4.NR",    grade: "Grade 4" },      // 8
    { desc: "4-digit × 1-digit or 2-digit × 2-digit", standard: "4.NR",    grade: "Grade 4" },      // 9
    { desc: "3-digit × 2-digit",                      standard: "5.NR",    grade: "Grade 5" },      // 10
  ],
  div: [
    { desc: "÷ 1 and ÷ 2, within 100",               standard: "3.PAR.3", grade: "Grade 3" },      // 1
    { desc: "÷ 3 and ÷ 4, within 100",               standard: "3.PAR.3", grade: "Grade 3" },      // 2
    { desc: "÷ 5 and ÷ 6, within 100",               standard: "3.PAR.3", grade: "Grade 3" },      // 3
    { desc: "÷ 7, ÷ 8, ÷ 9, within 100",             standard: "3.PAR.3", grade: "Grade 3" },      // 4
    { desc: "÷ multiples of 10",                      standard: "3.PAR.3", grade: "Grade 3" },      // 5
    { desc: "2-digit ÷ 1-digit",                      standard: "4.NR",    grade: "Grade 4" },      // 6
    { desc: "3-digit ÷ 1-digit",                      standard: "4.NR",    grade: "Grade 4" },      // 7
    { desc: "4-digit ÷ 1-digit",                      standard: "4.NR",    grade: "Grade 4" },      // 8
    { desc: "÷ 2-digit (≤ 25), 2–3-digit dividend",  standard: "5.NR",    grade: "Grade 5" },      // 9
    { desc: "÷ 2-digit (≤ 25), up to 4-digit",       standard: "5.NR",    grade: "Grade 5" },      // 10
  ],
};

const OP_LABEL = { add: "Addition", sub: "Subtraction", mul: "Multiplication", div: "Division" };
const OP_COLOR = { add: "#003865", sub: "#1a6e2e", mul: "#7a4500", div: "#5b1a8b" };
const OP_ICON  = { add: "+", sub: "−", mul: "×", div: "÷" };

function riD(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function genDrillProblem(op, level) {
  let a = 0, b = 0;
  let attempts = 0;
  const safe = (cond, gen) => { do { gen(); attempts++; } while (!cond() && attempts < 200); };

  if (op === "add") {
    // Lv1-2: K (within 5 / within 10)
    // Lv3-4: Gr1 (within 20 / 2+1-digit within 100)
    // Lv5-6: Gr2 (2+2 within 100 / 3+2 within 1,000)
    // Lv7-8: Gr3 (3+3 fluently within 1,000 / 4+3 within 10,000)
    // Lv9-10: Gr4 (within 100,000 / through hundred-thousands)
    if      (level === 1)  { a = riD(0,4); b = riD(0, 5-a); }
    else if (level === 2)  { safe(() => a+b >= 6 && a+b <= 10, () => { a=riD(0,9); b=riD(0,9); }); }  // sum 6-10 — never looks like Lv1 (≤5)
    else if (level === 3)  { safe(() => a+b >= 10 && a+b <= 18, () => { a=riD(2,9); b=riD(2,9); }); } // teen sums only — clearly Gr1, never looks like K
    else if (level === 4)  { a = riD(10,99); b = riD(1,9); }
    else if (level === 5)  { safe(() => a+b <= 100, () => { a=riD(10,90); b=riD(10,90); }); }
    else if (level === 6)  { a = riD(100,899); b = riD(10,99); }                              // sum ≤998
    else if (level === 7)  { safe(() => a+b <= 999 && b >= 100, () => { a=riD(100,899); b=riD(100,900); }); }  // 3+3 ≤999
    else if (level === 8)  { a = riD(1000,8999); b = riD(100,999); }                          // 4+3 ≤9998
    else if (level === 9)  { a = riD(10000,89999); b = riD(1000,9999); }                      // 5+4 ≤99998
    else                   { safe(() => a+b <= 999999, () => { a=riD(100000,899999); b=riD(10000,99999); }); } // through 999,999
    return { op, level, a, b, answer: a+b, display: `${a} + ${b}` };
  }

  if (op === "sub") {
    // Lv1-2: K | Lv3-4: Gr1 | Lv5-6: Gr2 | Lv7-8: Gr3 | Lv9-10: Gr4
    if      (level === 1)  { b = riD(0,4); a = riD(b, 5); }
    else if (level === 2)  { safe(() => a >= 6 && a > b, () => { a=riD(6,10); b=riD(0,a-1); }); }     // minuend 6-10 — never looks like Lv1 (≤5)
    else if (level === 3)  { b = riD(1,9); a = riD(Math.max(b+1,10), 20); }                   // always subtracting FROM a teen number (Gr1)
    else if (level === 4)  { a = riD(20,99); b = riD(1,9); }                                  // minuend ≥20 — no overlap with Lv3 (teens)
    else if (level === 5)  { a = riD(20,99); b = riD(10, a-1); }                              // 2-2 digit, a>b always
    else if (level === 6)  { a = riD(100,999); b = riD(10,99); }                              // 3-2 digit
    else if (level === 7)  { safe(() => a-b >= 10, () => { a=riD(201,999); b=riD(100,a-10); }); }  // 3-3 digit, diff ≥10 — no trivial results like 101-100=1
    else if (level === 8)  { a = riD(1000,9999); b = riD(100,999); }                          // 4-3 digit
    else if (level === 9)  { a = riD(10000,99999); b = riD(1000,9999); }                      // 5-4 digit
    else                   { a = riD(100000,999999); b = riD(10000,99999); }                   // through hundred-thousands
    return { op, level, a, b, answer: a-b, display: `${a} − ${b}` };
  }

  if (op === "mul") {
    // Lv1: Gr2 foundation (equal groups to 5×5)
    // Lv2-7: Gr3 (×0/1, ×2/5/10, ×3/4, ×6/7, ×8/9, ×multiples of 10)
    // Lv8-9: Gr4 (2-digit×1-digit; 4-digit×1-digit or 2-digit×2-digit)
    // Lv10: Gr5 (3-digit×2-digit)
    if      (level === 1)  { a = riD(1,5); b = riD(1,5); }
    else if (level === 2)  { a = riD(0,12); b = riD(0,1); }
    else if (level === 3)  { a = riD(2,12); b = [2,5,10][riD(0,2)]; }                          // a≥2 — prevents 1×b looking like Lv2
    else if (level === 4)  { a = riD(2,12); b = [3,4][riD(0,1)]; }                            // a≥2 — prevents 1×3=3 (trivial)
    else if (level === 5)  { a = riD(2,12); b = [6,7][riD(0,1)]; }                            // a≥2 — prevents 1×6=6 (trivial)
    else if (level === 6)  { a = riD(2,12); b = [8,9][riD(0,1)]; }                            // a≥2 — prevents 1×8=8 (trivial)
    else if (level === 7)  { a = riD(2,9); b = riD(1,9) * 10; }                               // a≥2 — prevents 1×10=10 (trivial)
    else if (level === 8)  { safe(() => a%10 !== 0, () => { a=riD(11,99); b=riD(2,9); }); }   // a not multiple of 10 — no overlap with Lv7
    else if (level === 9)  {                                                                    // 4-digit×1-digit OR 2-digit×2-digit
      if (Math.random() < 0.5) { a = riD(1000,9999); b = riD(2,9); }
      else                     { a = riD(10,99);     b = riD(10,99); }
    }
    else                   { a = riD(100,999); b = riD(10,99); }
    if (Math.random() < 0.5 && level >= 2) { const t=a; a=b; b=t; }
    return { op, level, a, b, answer: a*b, display: `${a} × ${b}` };
  }

  // div — Gr3: ÷1/2, ÷3/4, ÷5/6, ÷7/8/9, ÷multiples of 10
  //        Gr4: 2÷1, 3÷1, 4÷1  → Gr5: ÷2-digit ≤25 (small), ÷2-digit ≤25 (4-digit)
  if      (level === 1)  { b = [1,2][riD(0,1)]; a = b * riD(2,12); }                          // quotient ≥2 — prevents a÷a=1 (trivial)
  else if (level === 2)  { b = [3,4][riD(0,1)]; a = b * riD(2,12); }                          // quotient ≥2 — prevents 3÷3=1 (trivial)
  else if (level === 3)  { b = [5,6][riD(0,1)]; a = b * riD(2,10); }                          // quotient ≥2 — prevents 5÷5=1 (trivial)
  else if (level === 4)  { b = [7,8,9][riD(0,2)]; a = b * riD(2,10); }                        // quotient ≥2 — prevents 7÷7=1 (trivial)
  else if (level === 5)  { b = riD(2,9) * 10; a = b * riD(2,9); }                             // divisor ≥20, quotient ≥2 — no overlap with Lv1-4
  else if (level === 6)  { safe(() => a >= 10 && a <= 99, () => { b=riD(2,9); a=b*riD(2,Math.floor(99/b)); }); }
  else if (level === 7)  { safe(() => a >= 100 && a <= 999, () => { b=riD(2,9); a=b*riD(Math.ceil(100/b), Math.floor(999/b)); }); }
  else if (level === 8)  { safe(() => a >= 1000 && a <= 9999, () => { b=riD(2,9); a=b*riD(Math.ceil(1000/b), Math.floor(9999/b)); }); }
  else if (level === 9)  { b = riD(11,25); a = b * riD(2,9); }                                // divisor ≥11 — no overlap with Lv5 (multiples of 10)
  else                   { b = riD(11,25); a = b * riD(10, Math.floor(9999/b)); }             // divisor ≥11 — consistent with Lv9
  return { op, level, a, b, answer: a/b, display: `${a} ÷ ${b}` };
}

// Prerequisite gates (aligned to GA standards progression):
//   Multiplication unlocks when BOTH addition AND subtraction reach level 6
//     → student has mastered K through Grade 2 add/sub before starting Grade 3 multiplication
//   Division unlocks when subtraction >= 6 AND multiplication >= 6
//     → student has mastered K–Grade 2 sub AND all basic × facts (×0 through ×9) before dividing
function drillGates(levels) {
  const addLv = levels.add || 1;
  const subLv = levels.sub || 1;
  const mulLv = levels.mul || 1;
  return {
    mul: addLv >= 6 && subLv >= 6,   // K–Grade 2 add/sub complete
    div: subLv >= 6 && mulLv >= 6,   // K–Grade 2 sub complete + all basic × facts (×0–×9) mastered
  };
}

function pickDrillOp(levels, streaks) {
  const gates  = drillGates(levels);
  const ops    = ["add","sub"];
  if (gates.mul) ops.push("mul");
  if (gates.div) ops.push("div");

  const weights = ops.map(op => {
    const lv = levels[op] || 1;
    const sk = streaks[op] || 0;
    let w = 11 - lv; // level 1→10, level 10→1
    if (sk <= -2) w *= 1.5; // boost struggling op
    return Math.max(w, 0.5);
  });
  const total = weights.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < ops.length; i++) { r -= weights[i]; if (r <= 0) return ops[i]; }
  return ops[0];
}

// ── Drill result character — Gracie (Rive) ──────────────────────────────────
// gracie.riv lives in /public.  State machine: gracie_controller
// Animations found: IDLE, v20_smile (+ v0–v21 visemes for future lip-sync)

const STAR_LABELS = ["", "Keep going! 📚", "Nice work! 👍", "Good job! ✨", "Great work! 🌟", "PERFECT! 🏆"];

function DrillCharacter({ accuracy, studentId }) {
  const stars   = accuracy >= 90 ? 5 : accuracy >= 75 ? 4 : accuracy >= 60 ? 3 : accuracy >= 40 ? 2 : 1;
  const smiling = accuracy >= 60;

  // Read theme from localStorage (written by Avatar store on equip)
  const themeId   = (studentId && localStorage.getItem(`gracie_theme_${studentId}`)) || "gracie_default";
  const cssFilter = GRACIE_THEMES[themeId]?.filter ?? "none";

  const { rive, RiveComponent } = useRive({
    src: "/gracie.riv",
    artboard: "Viseme",
    animations: smiling ? ["IDLE", "v20_smile"] : ["IDLE"],
    autoplay: true,
    onLoad: () => {
      if (rive) {
        const inputs = rive.stateMachineInputs("gracie_controller");
        if (inputs) console.log("Gracie inputs:", inputs.map(i => ({ name: i.name, type: i.type, value: i.value })));
      }
    },
  });

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem"}}>
      {/* CSS filter applied to wrapper div — tints the entire Rive canvas */}
      <div style={{width:200,height:260,filter:cssFilter,
        transition:"filter 0.4s ease"}}>
        <RiveComponent style={{width:"100%",height:"100%"}} />
      </div>
      <div style={{display:"flex",gap:"3px",fontSize:"1.25rem"}}>
        {[1,2,3,4,5].map(s => (
          <span key={s} style={{opacity: s <= stars ? 1 : 0.18}}>⭐</span>
        ))}
      </div>
      <div style={{color:"rgba(255,255,255,0.85)",fontWeight:700,fontSize:"0.85rem",textAlign:"center"}}>
        {STAR_LABELS[stars]}
      </div>
    </div>
  );
}

// ── Drill session ───────────────────────────────────────────────────────────
function DrillSession({ student, cls, testCode, onDone, priorHistory = [], drillNumber = 1 }) {
  const [phase,    setPhase]    = useState("loading");
  const [levels,   setLevels]   = useState({ add:1, sub:1, mul:1, div:1 });
  const [problem,  setProblem]  = useState(null);
  const [inputVal, setInputVal] = useState("");
  const [lastInput,setLastInput]= useState("");
  const [feedback, setFeedback] = useState(null); // {correct, correctAnswer}
  const [log,      setLog]      = useState([]);
  const [timeLeft, setTimeLeft] = useState(DRILL_SECS);

  const levelsRef   = useRef({ add:1, sub:1, mul:1, div:1 });
  const streaksRef  = useRef({ add:0, sub:0, mul:0, div:0 });
  const levelUpsRef = useRef(0);   // total level-up events this session
  const logRef      = useRef([]);
  const fbTimer     = useRef(null);
  const inputRef    = useRef(null);
  const endedRef    = useRef(false);

  // Load saved levels and start drill
  useEffect(() => {
    async function init() {
      let lv = { add:1, sub:1, mul:1, div:1 };
      if (student?.id) {
        try {
          const r = await fetch(`${API}/fluency/progress/${encodeURIComponent(student.id)}`);
          if (r.ok) {
            const d = await r.json();
            lv = {
              add: Math.max(1, Math.min(10, d.add || 1)),
              sub: Math.max(1, Math.min(10, d.sub || 1)),
              mul: Math.max(1, Math.min(10, d.mul || 1)),
              div: Math.max(1, Math.min(10, d.div || 1)),
            };
          }
        } catch {}
      }
      levelsRef.current = lv;
      setLevels(lv);
      const op = pickDrillOp(lv, {});
      setProblem(genDrillProblem(op, lv[op]));
      setPhase("active");
    }
    init();
  }, []); // eslint-disable-line

  // Countdown timer
  useEffect(() => {
    if (phase !== "active") return;
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // End when timer hits 0
  useEffect(() => {
    if (phase === "active" && timeLeft === 0 && !endedRef.current) {
      endedRef.current = true;
      endSession();
    }
  }, [timeLeft, phase]); // eslint-disable-line

  // Auto-focus input
  useEffect(() => {
    if (phase === "active" && !feedback && inputRef.current) inputRef.current.focus();
  }, [problem, feedback, phase]);

  const earningsRef    = useRef(0);
  const sessionHistRef = useRef([...priorHistory]); // grows across Play Again restarts

  function endSession() {
    clearTimeout(fbTimer.current);

    // Calculate earnings:  $0.02 per correct, $0.10 accuracy bonus (≥80%), $0.10 per level-up
    const totalP   = logRef.current.length;
    const correctP = logRef.current.filter(e => e.correct).length;
    const accFrac  = totalP ? correctP / totalP : 0;
    const earned   = Math.round((
      correctP * 0.02 +
      (accFrac >= 0.80 ? 0.10 : 0) +
      levelUpsRef.current * 0.10
    ) * 100) / 100;
    earningsRef.current = earned;

    // Append this session to history for the progress chart
    sessionHistRef.current = [
      ...priorHistory,
      { n: drillNumber, accuracy: totalP ? Math.round(correctP / totalP * 100) : 0,
        correct: correctP, total: totalP, ppm: parseFloat((totalP / 3).toFixed(1)) },
    ];

    setPhase("summary");
    fetch(`${API}/fluency/session`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId:   student?.id   || "",
        studentName: student?.name || "",
        classId:     cls?.id       || "",
        className:   cls?.name     || "",
        testCode:    testCode      || "",
        levels:      { ...levelsRef.current },
        log:         logRef.current,
        submitted:   now(),
        earnings:    earned,
      }),
    }).catch(() => {});
  }

  // Pass earnings + session history up when user clicks a button
  function handleDone(dest) {
    onDone(dest, earningsRef.current, sessionHistRef.current);
  }

  function submitAnswer() {
    if (!problem || !inputVal.trim() || feedback) return;
    const given = Number(inputVal.trim());
    if (isNaN(given)) return;
    const correct = given === problem.answer;

    // Record
    const entry = { ...problem, studentAnswer: given, correct };
    logRef.current = [...logRef.current, entry];
    setLog([...logRef.current]);
    setLastInput(inputVal.trim());
    setInputVal("");

    // Update streak
    const curStreak = streaksRef.current[problem.op] || 0;
    const newStreak = correct
      ? (curStreak > 0 ? curStreak + 1 : 1)
      : (curStreak < 0 ? curStreak - 1 : -1);
    streaksRef.current = { ...streaksRef.current, [problem.op]: newStreak };

    // Level adjustment
    let newLevel = levelsRef.current[problem.op];
    if (newStreak >= 5)  newLevel = Math.min(10, newLevel + 1);
    if (newStreak <= -3) newLevel = Math.max(1,  newLevel - 1);
    if (newLevel !== levelsRef.current[problem.op]) {
      streaksRef.current = { ...streaksRef.current, [problem.op]: 0 };
      if (newLevel > levelsRef.current[problem.op]) levelUpsRef.current += 1;
    }
    levelsRef.current = { ...levelsRef.current, [problem.op]: newLevel };
    setLevels({ ...levelsRef.current });

    setFeedback({ correct, correctAnswer: problem.answer });
    clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => {
      setFeedback(null);
      const nextOp = pickDrillOp(levelsRef.current, streaksRef.current);
      setProblem(genDrillProblem(nextOp, levelsRef.current[nextOp]));
    }, correct ? 600 : 1500);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); submitAnswer(); }
  }

  // Loading
  if (phase === "loading") return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#e8edf2",fontFamily:"sans-serif"}}>
      <div style={{textAlign:"center",color:"#888"}}>
        <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>⚡</div>
        <div>Loading your drill…</div>
      </div>
    </div>
  );

  // Summary
  if (phase === "summary") {
    const totalP   = logRef.current.length;
    const correct  = logRef.current.filter(e=>e.correct).length;
    const accuracy = totalP ? Math.round(correct/totalP*100) : 0;
    const ppm      = (totalP / 3).toFixed(1);
    const missed   = logRef.current.filter(e=>!e.correct);
    const chartData = sessionHistRef.current.map(s => ({ name: `#${s.n}`, Accuracy: s.accuracy }));

    // Glassmorphism card style
    const glassCard = {
      background:"rgba(255,255,255,0.07)",
      border:"1px solid rgba(255,255,255,0.13)",
      borderRadius:"16px",
      backdropFilter:"blur(6px)",
    };
    const sectionLabel = {
      fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.14em",
      color:"rgba(255,255,255,0.45)", marginBottom:"0.6rem",
    };

    return (
      <div style={{minHeight:"100vh",
        background:"linear-gradient(155deg,#0d1b2a 0%,#0f2d4a 55%,#133a5e 100%)",
        fontFamily:"sans-serif",display:"flex",flexDirection:"column"}}>

        {/* ── Header ── */}
        <div style={{background:"rgba(0,0,0,0.35)",color:"#fff",
          padding:"0.8rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem",
          backdropFilter:"blur(8px)",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{fontSize:"1rem",fontWeight:800,letterSpacing:"0.04em"}}>⚡ Drill Complete</div>
          <div style={{marginLeft:"auto",fontSize:"0.8rem",opacity:.6}}>{student?.name}</div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{flex:1,overflowY:"auto",padding:"1.25rem 1rem 2rem"}}>
          <div style={{maxWidth:"760px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"1rem"}}>

            {/* ── Hero row: character + stats ── */}
            <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",alignItems:"stretch"}}>

              {/* Character card */}
              <div style={{...glassCard,flex:"0 0 200px",minWidth:"160px",
                display:"flex",flexDirection:"column",alignItems:"center",
                justifyContent:"center",padding:"1.25rem 1rem"}}>
                <DrillCharacter accuracy={accuracy} studentId={student?.id} />
              </div>

              {/* Stats card */}
              <div style={{...glassCard,flex:1,minWidth:"220px",padding:"1.25rem 1.5rem",
                display:"flex",flexDirection:"column",gap:"1rem"}}>

                {/* Accuracy + stat pills */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={sectionLabel}>3-MIN FACT FLUENCY</div>
                    <div style={{color:"#fff",fontWeight:900,fontSize:"3.8rem",
                      lineHeight:1,fontFamily:"Georgia,serif",letterSpacing:"-2px"}}>
                      {accuracy}<span style={{fontSize:"2rem",letterSpacing:0}}>%</span>
                    </div>
                    <div style={{color:"rgba(255,255,255,0.45)",fontSize:"0.68rem",marginTop:"2px"}}>Accuracy</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.55rem",textAlign:"right",marginTop:"0.25rem"}}>
                    {[["PROBLEMS",totalP,"#7ecfff"],["CORRECT",correct,"#2ecc71"],["PER MIN",ppm,"#ffd700"]]
                      .map(([k,v,c]) => (
                        <div key={k}>
                          <div style={{color:c,fontWeight:800,fontSize:"1.55rem",lineHeight:1}}>{v}</div>
                          <div style={{color:"rgba(255,255,255,0.38)",fontSize:"0.58rem",letterSpacing:"0.09em"}}>{k}</div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Progress sparkline (shows after 2+ sessions) */}
                {chartData.length >= 2 && (
                  <div>
                    <div style={sectionLabel}>ACCURACY — RECENT SESSIONS</div>
                    <ResponsiveContainer width="100%" height={68}>
                      <AreaChart data={chartData} margin={{top:4,right:4,bottom:0,left:0}}>
                        <defs>
                          <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="10%" stopColor="#4ecdc4" stopOpacity={0.45}/>
                            <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name"
                          tick={{fill:"rgba(255,255,255,0.35)",fontSize:9}}
                          axisLine={false} tickLine={false}/>
                        <YAxis domain={[0,100]} hide/>
                        <Tooltip
                          contentStyle={{background:"#0f2d4a",border:"1px solid rgba(255,255,255,0.15)",
                            borderRadius:"8px",fontSize:"0.72rem",color:"#fff"}}
                          formatter={v=>[`${v}%`,"Accuracy"]}/>
                        <Area type="monotone" dataKey="Accuracy"
                          stroke="#4ecdc4" strokeWidth={2} fill="url(#accGrad)"
                          dot={{fill:"#4ecdc4",r:3,strokeWidth:0}}
                          activeDot={{r:5,fill:"#fff",stroke:"#4ecdc4"}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* ── Math Levels ── */}
            <div style={{...glassCard,overflow:"hidden"}}>
              <div style={{padding:"0.7rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.08)",
                fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",color:"rgba(255,255,255,0.45)"}}>
                YOUR MATH LEVELS
              </div>
              {(() => {
                const gates = drillGates(levelsRef.current);
                const opUnlocked = { add:true, sub:true, mul:gates.mul, div:gates.div };
                const unlockHint = {
                  mul:`Unlocks when Addition AND Subtraction both reach Level 6 (K–Grade 2 mastered)`,
                  div:`Unlocks when Subtraction reaches Level 6 AND Multiplication reaches Level 6 (all basic facts ×0–×9)`,
                };
                return ["add","sub","mul","div"].map(op => {
                  const lv    = levelsRef.current[op];
                  const def   = LEVEL_DEFS[op][lv - 1];
                  const opLog = logRef.current.filter(e => e.op === op);
                  const opOk  = opLog.filter(e => e.correct).length;
                  const locked = !opUnlocked[op];
                  return (
                    <div key={op} style={{display:"flex",alignItems:"center",gap:"0.9rem",
                      padding:"0.7rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.06)",
                      opacity:locked?0.4:1}}>
                      <div style={{width:"36px",height:"36px",borderRadius:"50%",flexShrink:0,
                        background:locked?"rgba(255,255,255,0.15)":OP_COLOR[op],
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:"1rem",color:"#fff",fontWeight:700}}>
                        {locked ? "🔒" : OP_ICON[op]}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:"0.88rem",color:"#fff"}}>
                          {OP_LABEL[op]}{locked ? " — Locked" : ` — Level ${lv}/10`}
                        </div>
                        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.5)",marginTop:"1px"}}>
                          {locked ? unlockHint[op] : def.desc}
                        </div>
                        {!locked && (
                          <div style={{fontSize:"0.65rem",color:OP_COLOR[op],marginTop:"2px",fontWeight:600}}>
                            {def.grade} · {def.standard}
                          </div>
                        )}
                      </div>
                      {!locked && opLog.length > 0 && (
                        <div style={{textAlign:"right",fontSize:"0.78rem",color:"rgba(255,255,255,0.45)",flexShrink:0}}>
                          <strong style={{color:"#2ecc71",fontSize:"0.9rem"}}>{opOk}</strong>/{opLog.length}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* ── Missed problems ── */}
            {missed.length > 0 && (
              <div style={{...glassCard,overflow:"hidden"}}>
                <div style={{padding:"0.7rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.08)",
                  fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",color:"rgba(255,255,255,0.45)"}}>
                  REVIEW — MISSED PROBLEMS
                </div>
                {missed.map((item,i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"1rem",
                    padding:"0.6rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.05)",
                    background:"rgba(231,76,60,0.06)"}}>
                    <span style={{color:"#e74c3c",fontWeight:700,fontSize:"0.85rem"}}>✗</span>
                    <span style={{fontFamily:"monospace",fontSize:"0.97rem",fontWeight:700,
                      flex:1,color:"rgba(255,255,255,0.85)"}}>
                      {item.display} = <span style={{color:"#e74c3c"}}>{item.studentAnswer}</span>
                    </span>
                    <span style={{fontSize:"0.85rem",color:"#2ecc71",fontWeight:700,flexShrink:0}}>
                      ✓ {item.answer}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Earnings ── */}
            {earningsRef.current > 0 && (
              <div style={{...glassCard,overflow:"hidden"}}>
                <div style={{padding:"0.7rem 1.25rem",
                  borderBottom:"1px solid rgba(255,255,255,0.08)",
                  display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",
                    color:"rgba(255,255,255,0.45)"}}>EARNINGS THIS DRILL</div>
                  <div style={{fontFamily:"monospace",fontWeight:800,fontSize:"1.4rem",color:"#2ecc71"}}>
                    +${earningsRef.current.toFixed(2)}
                  </div>
                </div>
                <div style={{padding:"0.6rem 1.25rem",fontSize:"0.75rem",
                  color:"rgba(255,255,255,0.55)",display:"flex",gap:"1rem",flexWrap:"wrap"}}>
                  <span>💰 ${(correct * 0.02).toFixed(2)} correct</span>
                  {correct/totalP >= 0.80 && <span>🎯 $0.10 accuracy bonus</span>}
                  {levelUpsRef.current > 0 && (
                    <span>⬆ ${(levelUpsRef.current*0.10).toFixed(2)} level-up{levelUpsRef.current>1?"s":""}</span>
                  )}
                </div>
              </div>
            )}

            {/* ── Action buttons ── */}
            <div style={{display:"flex",gap:"0.75rem",justifyContent:"center",flexWrap:"wrap",
              padding:"0.25rem 0 0.5rem"}}>
              <button onClick={() => handleDone("again")}
                style={{background:"linear-gradient(135deg,#2ecc71,#27ae60)",color:"#fff",
                  border:"none",borderRadius:"12px",padding:"0.9rem 1.75rem",
                  fontSize:"1rem",fontWeight:800,cursor:"pointer",
                  boxShadow:"0 4px 16px rgba(46,204,113,0.35)",
                  letterSpacing:"0.02em"}}>
                🎮 Play Again
              </button>
              <button onClick={() => handleDone("avatar")}
                style={{background:"linear-gradient(135deg,#e67e22,#d35400)",color:"#fff",
                  border:"none",borderRadius:"12px",padding:"0.9rem 1.75rem",
                  fontSize:"1rem",fontWeight:800,cursor:"pointer",
                  boxShadow:"0 4px 16px rgba(230,126,34,0.35)",
                  letterSpacing:"0.02em"}}>
                🏪 Store
              </button>
              <button onClick={() => handleDone(null)}
                style={{background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.7)",
                  border:"1px solid rgba(255,255,255,0.2)",borderRadius:"12px",
                  padding:"0.9rem 1.75rem",fontSize:"1rem",fontWeight:700,cursor:"pointer",
                  letterSpacing:"0.02em"}}>
                ✓ Done
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Active drill
  if (!problem) return null;
  const timeColor = timeLeft <= 30 ? "#ff6b6b" : timeLeft <= 60 ? "#ffd166" : "#fff";
  const opColor   = OP_COLOR[problem.op];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"sans-serif",background:"#e8edf2"}}>
      {/* Header */}
      <div style={{background:opColor,color:"#fff",padding:"0.75rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0,width:"100%",boxSizing:"border-box"}}>
        <div style={{fontFamily:"monospace",fontWeight:700,fontSize:"1.4rem",background:"rgba(0,0,0,0.25)",padding:"3px 12px",borderRadius:"4px",color:timeColor,minWidth:"68px",textAlign:"center",flexShrink:0}}>
          {String(Math.floor(timeLeft/60)).padStart(2,"0")}:{String(timeLeft%60).padStart(2,"0")}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:"0.9rem"}}>{OP_LABEL[problem.op]} — Level {problem.level}</div>
          <div style={{fontSize:"0.72rem",opacity:.8}}>{LEVEL_DEFS[problem.op][problem.level-1].desc}</div>
        </div>
        {/* Level badges */}
        <div style={{display:"flex",gap:"5px",flexShrink:0}}>
          {["add","sub","mul","div"].map(op => {
            const gates  = drillGates(levels);
            const locked = op === "mul" ? !gates.mul : op === "div" ? !gates.div : false;
            return (
              <div key={op} style={{background:"rgba(0,0,0,0.2)",borderRadius:"3px",padding:"2px 6px",fontSize:"0.68rem",fontWeight:op===problem.op?700:400,border:op===problem.op?"1px solid rgba(255,255,255,.4)":"1px solid transparent",opacity:locked?0.45:1}}>
                {locked ? "🔒" : OP_ICON[op]}{!locked && levels[op]}
              </div>
            );
          })}
        </div>
      </div>

      {/* Problem + input area — scrollable so keypad is always reachable */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",padding:"1.5rem 1rem 2rem",gap:"1.25rem",boxSizing:"border-box",width:"100%"}}>

        {/* Problem card */}
        <div style={{
          background: feedback ? (feedback.correct ? "#e8f5e9" : "#fce4e4") : "#fff",
          border: `3px solid ${feedback ? (feedback.correct ? "#1a6e2e" : "#8b1a1a") : "#c8d3dd"}`,
          borderRadius:"12px",
          padding:"1.75rem 2.5rem",
          textAlign:"center",
          width:"min(420px, 100%)",
          alignSelf:"center",
          transition:"border-color 0.1s, background 0.1s",
          boxShadow:"0 4px 16px rgba(0,0,0,.08)",
          boxSizing:"border-box",
        }}>
          {feedback ? (
            feedback.correct ? (
              <div style={{fontSize:"3.5rem",color:"#1a6e2e"}}>✓</div>
            ) : (
              <>
                <div style={{fontSize:"1.6rem",fontFamily:"monospace",color:"#1a1a1a",fontWeight:700}}>{problem.display}</div>
                <div style={{fontSize:"1rem",color:"#8b1a1a",marginTop:"6px"}}>✗ You answered: <strong>{lastInput}</strong></div>
                <div style={{fontSize:"1.2rem",color:"#1a6e2e",fontWeight:700,marginTop:"6px"}}>✓ Correct: {problem.answer}</div>
              </>
            )
          ) : (
            <div style={{fontSize:"2.5rem",fontFamily:"monospace",fontWeight:700,color:"#1a1a1a",letterSpacing:"0.04em"}}>
              {problem.display} = <span style={{color:opColor}}>?</span>
            </div>
          )}
        </div>

        {/* Input + keypad */}
        {!feedback && (
          <>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={inputVal}
              onChange={e=>setInputVal(e.target.value.replace(/[^0-9]/g,""))}
              onKeyDown={handleKeyDown}
              maxLength={8}
              placeholder="?"
              style={{
                fontSize:"2rem",fontFamily:"monospace",fontWeight:700,textAlign:"center",
                width:"140px",padding:"0.5rem 0.75rem",
                border:`3px solid ${opColor}`,borderRadius:"8px",
                outline:"none",background:"#fafbfc",color:opColor,
              }}
            />
            <div style={{display:"flex",flexDirection:"column",gap:"8px",alignItems:"center"}}>
              {[[1,2,3],[4,5,6],[7,8,9],[null,0,"⌫"]].map((row,ri)=>(
                <div key={ri} style={{display:"flex",gap:"8px"}}>
                  {row.map((k,ki)=>(
                    <button key={ki}
                      onClick={()=>{
                        if (k===null) return;
                        if (k==="⌫") { setInputVal(v=>v.slice(0,-1)); return; }
                        setInputVal(v=>v+String(k));
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      style={{
                        width:"62px",height:"54px",
                        fontSize:"1.3rem",fontWeight:700,
                        background:k===null?"transparent":"#fff",
                        border:k===null?"none":"2px solid #c8d3dd",
                        borderRadius:"8px",
                        cursor:k===null?"default":"pointer",
                        color:k==="⌫"?"#8b1a1a":"#1a1a1a",
                        boxShadow:k===null?"none":"0 2px 4px rgba(0,0,0,.08)",
                      }}>
                      {k===null?"":k}
                    </button>
                  ))}
                </div>
              ))}
              <button onClick={submitAnswer} disabled={!inputVal.trim()}
                style={{
                  width:"198px",height:"50px",fontSize:"1rem",fontWeight:700,
                  background:inputVal.trim()?opColor:"#ccc",
                  color:"#fff",border:"none",borderRadius:"8px",
                  cursor:inputVal.trim()?"pointer":"not-allowed",
                  marginTop:"2px",boxShadow:"0 2px 8px rgba(0,0,0,.12)",
                }}>
                Submit ✓
              </button>
            </div>
          </>
        )}
      </div>
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

// ── Session persistence (survives refresh, clears on tab close) ──────────────
const SESSION_KEY = "mathready_session";
function _loadSaved() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

// ── Main shell ─────────────────────────────────────────────
export default function MathTest({ onBack, prefillCode, directPracticeClassId, directDrillMode }) {
  // prefillCode           = test code from ?code= URL param (goes straight to Google step)
  // directPracticeClassId = class ID from ?practice= URL param (direct practice via Google)
  // directDrillMode       = true when launched from "Practice Drill" home button (no code)

  // Restore session from sessionStorage if available
  const _saved     = _loadSaved();
  const _hasSession = !!((_saved?.student) && !prefillCode && !directPracticeClassId && !directDrillMode);
  const initScreen = _hasSession ? "practice"
                   : directDrillMode ? "drill-google"
                   : directPracticeClassId ? "google-practice"
                   : "login";

  const [screen,          setScreen]          = useState(initScreen);
  const [student,         setStudent]         = useState(_hasSession ? _saved.student : null);
  const [cls,             setCls]             = useState(_hasSession ? _saved.cls    : null);
  const [testCode,        setTestCode]        = useState("");
  const [finalSession,    setFinalSession]    = useState(null);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [drillEarnings,   setDrillEarnings]   = useState(0);
  const [drillKey,        setDrillKey]        = useState(0);   // increment to remount (Play Again)
  const [avatarDeepLink,  setAvatarDeepLink]  = useState(null); // {tab, shopCat} — set by Store button
  const [drillHistory,    setDrillHistory]    = useState([]);  // grows across Play Again sessions
  const [questions,       setQuestions]       = useState(FALLBACK_QUESTIONS);
  const [isAdaptive,      setIsAdaptive]      = useState(false);
  const [isDrill,         setIsDrill]         = useState(false);
  const [untimed,         setUntimed]         = useState(false);
  const [timeLimitSecs,   setTimeLimitSecs]   = useState(1800);
  const [warnSecs,        setWarnSecs]        = useState(300);

  // Keep sessionStorage in sync with login state
  useEffect(() => {
    if (student) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ student, cls }));
    }
    // don't clear here — reset() handles logout
  }, [student, cls]);

  function reset() {
    sessionStorage.removeItem(SESSION_KEY);   // ← logout clears session
    setStudent(null); setCls(null);
    if (prefillCode || directPracticeClassId || directDrillMode) { onBack(); return; }
    setFinalSession(null); setPracticeHistory([]);
    setTestCode("");
    setScreen("login");
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
      // DrillSession generates problems internally — no question list needed
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
      studentName: student?.name || "",
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

  if (screen === "avatar")
    return <AvatarScreen student={student} onBack={() => { setAvatarDeepLink(null); setScreen("test-done"); }}
                         earnedThisSession={drillEarnings}
                         startTab={avatarDeepLink?.tab ?? "look"}
                         startShopCat={avatarDeepLink?.shopCat ?? "hair"}/>;

  if (screen === "test-done") { reset(); return null; }

  if (screen === "drill-google")
    return <DrillLogin onBack={onBack} onSuccess={(studentObj, classObj) => {
      setStudent(studentObj); setCls(classObj); setIsDrill(true); setScreen("test");
    }}/>;

  if (screen === "login")
    return <StudentLogin
      onStartTest={handleStartTest}
      onStartDrill={(studentObj, classObj) => {
        setStudent(studentObj); setCls(classObj); setIsDrill(true); setScreen("test");
      }}
      onBack={onBack}
      prefillCode={prefillCode}
    />;

  if (screen === "google-practice")
    return <GoogleSignIn mode="practice" codeOrClassId={directPracticeClassId} onBack={onBack}
      onSuccess={(studentObj, classObj) => handleStartPractice(studentObj, classObj)} />;

  if (screen === "practice")
    return <PracticeMode student={student} cls={cls} onFinish={handleFinishPractice} onQuit={reset}/>;

  if (screen === "practice-results")
    return <PracticeResults session={finalSession} history={practiceHistory} onReset={reset}/>;

  if (screen === "test" && isDrill)
    return <DrillSession
              key={drillKey}
              student={student} cls={cls} testCode={testCode}
              priorHistory={drillHistory}
              drillNumber={drillKey + 1}
              onDone={(dest, earned, history) => {
                if (history)           setDrillHistory(history);
                if (earned !== undefined) setDrillEarnings(earned);
                if (dest === "again")  { setDrillKey(k => k + 1); return; }
                if (dest === "avatar") { setAvatarDeepLink({ tab:"shop", shopCat:"theme" }); setScreen("avatar"); return; }
                reset();
              }}/>;

  if (screen === "test")
    return <StudentTest studentName={student?.name || ""} studentId={student?.id || ""} questions={questions} adaptive={isAdaptive} onFinish={handleFinishTest} untimed={untimed} timeLimitSecs={timeLimitSecs} warnSecs={warnSecs}/>;

  if (screen === "results")
    return <StudentResults session={finalSession} questions={questions} onReset={()=>{ reset(); onBack(); }}/>;
}
