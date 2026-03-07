import { useState, useEffect, useCallback } from "react";

// ── Constants ──────────────────────────────────────────────
const STUDENT_CODE = "MATH2025";
const TEACHER_CODE = "TEACH123";
const API          = "https://mathready-backend-production.up.railway.app";
const TOTAL        = 10;
const START_SECS   = 30 * 60;
const LETTERS      = ["A", "B", "C", "D"];

const QUESTIONS = [
  { id:"q001", standard:"MGSE5.NBT.1", short:"Place Value",       question:"In the number 3,492, the digit 4 is in the hundreds place. What is the value of the digit 4?", choices:["4","40","400","4,000"], correct:"400" },
  { id:"q002", standard:"MGSE5.NBT.2", short:"Powers of 10",      question:"What is 4.7 × 10²?", choices:["0.047","47","470","4,700"], correct:"470" },
  { id:"q003", standard:"MGSE5.NBT.6", short:"Division",          question:"A school bought 144 pencils to share equally among 12 classrooms. How many pencils does each classroom get?", choices:["10","11","12","13"], correct:"12" },
  { id:"q004", standard:"MGSE5.NF.1",  short:"Add Fractions",     question:"What is 1/4 + 1/2?", choices:["2/6","1/3","3/4","2/4"], correct:"3/4" },
  { id:"q005", standard:"MGSE5.NF.4",  short:"Multiply Fractions",question:"A recipe calls for 2/3 cup of sugar. If you make 3 batches, how much sugar do you need in all?", choices:["2/9 cup","1 cup","2 cups","6 cups"], correct:"2 cups" },
  { id:"q006", standard:"MGSE5.NF.7",  short:"Divide Fractions",  question:"You have 4 yards of ribbon. You cut it into pieces that are each 1/2 yard long. How many pieces do you get?", choices:["2","4","6","8"], correct:"8" },
  { id:"q007", standard:"MGSE5.OA.1",  short:"Order of Ops",      question:"What is the value of (3 + 5) × 2 − 4?", choices:["6","12","14","20"], correct:"12" },
  { id:"q008", standard:"MGSE5.MD.1",  short:"Unit Conversion",   question:"A table is 2 meters long. How many centimeters long is the table?", choices:["2","20","200","2,000"], correct:"200" },
  { id:"q009", standard:"MGSE5.MD.3",  short:"Volume",            question:"A rectangular box is 4 cm long, 3 cm wide, and 2 cm tall. What is its volume?", choices:["9 cubic cm","14 cubic cm","18 cubic cm","24 cubic cm"], correct:"24 cubic cm" },
  { id:"q010", standard:"MGSE5.G.3",   short:"Geometry",          question:"Which shape ALWAYS has 4 right angles and 4 equal sides?", choices:["Rectangle","Rhombus","Square","Trapezoid"], correct:"Square" },
];

// ── Helpers ────────────────────────────────────────────────
const pad    = n => String(n).padStart(2,"0");
const fmtTime= s => `${pad(Math.floor(s/60))}:${pad(s%60)}`;
const pct    = (s,t)=> Math.round((s/t)*100);
const lvl    = p => p>=80?"Proficient":p>=60?"Developing":"Beginning";
const lvlC   = p => p>=80?"#1a6e2e":p>=60?"#7a4e00":"#8b1a1a";
const lvlBg  = p => p>=80?"#d4edda":p>=60?"#fff3cd":"#fdf2f2";
const lvlBd  = p => p>=80?"#b3dfc0":p>=60?"#ffc107":"#f0b8b8";
const now    = ()=> new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

// API helpers — talk to Python backend
async function loadSessions() {
  try {
    const r = await fetch(`${API}/sessions`);
    return await r.json();
  } catch { return []; }
}
async function saveSession(session) {
  try {
    await fetch(`${API}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });
  } catch(e) { console.error("Submit error:", e); }
}
async function clearSessions() {
  try { await fetch(`${API}/sessions`, { method: "DELETE" }); } catch {}
}
async function sendHeartbeat(name, current) {
  try {
    await fetch(`${API}/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, current }),
    });
  } catch {}
}

// ── Shared top bar ─────────────────────────────────────────
function TopBar({ title, subtitle, right }) {
  return (
    <div style={{background:"#003865",color:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.25rem",height:"52px",flexShrink:0,boxShadow:"0 2px 6px rgba(0,0,0,0.3)"}}>
      <div>
        <div style={{fontSize:"0.58rem",opacity:.65,letterSpacing:"0.14em"}}>GEORGIA MILESTONES READINESS TRAINER</div>
        <div style={{fontSize:"0.9rem",fontWeight:600}}>{title}</div>
      </div>
      {right}
    </div>
  );
}

// ══════════════════════════════════════════
// ROLE SELECT SCREEN
// ══════════════════════════════════════════
function RoleSelect({ onRole }) {
  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",gap:"1.5rem",padding:"2rem"}}>
      <div style={{background:"#003865",borderRadius:"6px",padding:"1.25rem 2rem",color:"#fff",textAlign:"center",width:"100%",maxWidth:"480px"}}>
        <div style={{fontSize:"0.6rem",letterSpacing:"0.18em",opacity:.65,marginBottom:"4px"}}>GEORGIA MILESTONES READINESS TRAINER</div>
        <div style={{fontSize:"1.3rem",fontWeight:700,fontFamily:"Georgia,serif"}}>Grade 5 Mathematics</div>
        <div style={{fontSize:"0.8rem",opacity:.7,marginTop:"4px"}}>Select your role to continue</div>
      </div>

      <div style={{display:"flex",gap:"1rem",width:"100%",maxWidth:"480px"}}>
        {[
          {role:"student", emoji:"🧒", label:"I'm a Student", sub:"Take the practice test"},
          {role:"teacher", emoji:"👩‍🏫", label:"I'm a Teacher", sub:"View dashboard & scores"},
        ].map(({role,emoji,label,sub}) => (
          <button key={role} onClick={()=>onRole(role)} style={{flex:1,background:"#fff",border:"2px solid #c8d3dd",borderRadius:"6px",padding:"1.75rem 1rem",cursor:"pointer",transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:"0.6rem"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#003865";e.currentTarget.style.background="#f0f4f8";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#c8d3dd";e.currentTarget.style.background="#fff";}}>
            <span style={{fontSize:"2.2rem"}}>{emoji}</span>
            <div style={{fontWeight:700,fontSize:"0.95rem",color:"#1a1a1a"}}>{label}</div>
            <div style={{fontSize:"0.73rem",color:"#888"}}>{sub}</div>
          </button>
        ))}
      </div>

      <div style={{fontSize:"0.7rem",color:"#aaa"}}>Student code: <strong>MATH2025</strong> · Teacher code: <strong>TEACH123</strong></div>
    </div>
  );
}

// ══════════════════════════════════════════
// STUDENT: LOGIN
// ══════════════════════════════════════════
function StudentLogin({ onStart, onBack }) {
  const [first,setFirst]=useState(""); const [last,setLast]=useState("");
  const [code,setCode]=useState(""); const [err,setErr]=useState("");
  const [step,setStep]=useState("form");

  function submit() {
    if (!first.trim()||!last.trim()){setErr("Please enter your first and last name.");return;}
    if (code.trim().toUpperCase()!==STUDENT_CODE){setErr("Invalid test code. Check with your teacher.");return;}
    setErr(""); setStep("confirm");
  }

  if (step==="confirm") return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.hdr}><div style={S.hdrSub}>STUDENT SIGN IN</div><div style={S.hdrTitle}>Confirm Your Information</div></div>
        <div style={{padding:"1.75rem 2rem"}}>
          <div style={S.confirmBox}>
            {[["STUDENT NAME",`${first} ${last}`],["TEST","Grade 5 Mathematics — Practice"],["TIME LIMIT","30 Minutes"],["QUESTIONS",String(TOTAL)],["CALCULATOR","Not Permitted"]].map(([k,v],i,a)=>(
              <div key={k} style={{...S.confirmRow,borderBottom:i<a.length-1?"1px solid #eef1f4":"none"}}><span style={S.confirmK}>{k}</span><span style={S.confirmV}>{v}</span></div>
            ))}
          </div>
          <div style={{background:"#fff8e1",border:"1px solid #ffd166",borderRadius:"3px",padding:"0.65rem 1rem",marginBottom:"1.25rem",fontSize:"0.8rem",color:"#7a4e00"}}>
            ⚠ Once you click <strong>Begin Test</strong>, your timer starts immediately.
          </div>
          <div style={{display:"flex",gap:"0.75rem"}}>
            <button onClick={()=>setStep("form")} style={S.btnSec}>← Go Back</button>
            <button onClick={()=>onStart(`${first} ${last}`)} style={S.btnPri}>Begin Test →</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={{background:"#003865",width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem"}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:"pointer",fontSize:"0.72rem"}}>← Back</button>
        <div style={{color:"#fff",fontSize:"0.95rem",fontWeight:700}}>Georgia Milestones Readiness Trainer</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
        <div style={S.card}>
          <div style={S.hdr}><div style={S.hdrSub}>STUDENT SIGN IN</div><div style={S.hdrTitle}>Grade 5 Mathematics</div></div>
          <div style={{padding:"1.75rem 2rem"}}>
            <div style={{display:"flex",gap:"0.75rem",marginBottom:"1rem"}}>
              {[["FIRST NAME",first,setFirst,"First name"],["LAST NAME",last,setLast,"Last name"]].map(([lbl,val,set,ph])=>(
                <div key={lbl} style={{flex:1}}>
                  <label style={S.lbl}>{lbl}</label>
                  <input style={S.inp} value={val} onChange={e=>{set(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={ph} />
                </div>
              ))}
            </div>
            <div style={{marginBottom:"1.25rem"}}>
              <label style={S.lbl}>TEST CODE</label>
              <input style={{...S.inp,fontFamily:"monospace",fontSize:"1.05rem",letterSpacing:"0.18em",textTransform:"uppercase"}} value={code} onChange={e=>{setCode(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="e.g. MATH2025" maxLength={12} />
            </div>
            {err&&<div style={S.errBox}>⚠ {err}</div>}
            <button onClick={submit} style={{...S.btnPri,width:"100%"}}>Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// STUDENT: TEST
// ══════════════════════════════════════════
function StudentTest({ studentName, onFinish }) {
  const [cur,setCur]   = useState(0);
  const [ans,setAns]   = useState({});
  const [flg,setFlg]   = useState({});
  const [secs,setSecs] = useState(START_SECS);
  const [modal,setModal]=useState(false);
  const [nav,setNav]   = useState(window.innerWidth > 640);

  useEffect(()=>{const t=setInterval(()=>setSecs(s=>s>0?s-1:0),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    sendHeartbeat(studentName, cur);
    const t=setInterval(()=>sendHeartbeat(studentName, cur),30000);
    return()=>clearInterval(t);
  },[studentName, cur]);

  const q=QUESTIONS[cur]; const sel=ans[q.id]??null; const isFl=flg[q.id]??false;
  const ansCount=Object.keys(ans).length; const flgCount=Object.values(flg).filter(Boolean).length;

  async function doSubmit() {
    const score=QUESTIONS.reduce((a,q)=>a+(ans[q.id]===q.correct?1:0),0);
    const session={name:studentName,score,total:TOTAL,pct:pct(score,TOTAL),submitted:now(),timeUsed:fmtTime(START_SECS-secs),answers:{...ans}};
    await saveSession(session);
    onFinish(session);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"sans-serif",background:"#e8edf2",overflow:"hidden"}}>
      <TopBar title="Grade 5 Math — Practice" right={
        <div style={{display:"flex",gap:"1rem",alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"0.55rem",opacity:.6,letterSpacing:"0.08em"}}>TIME</div>
            <div style={{fontSize:"1rem",fontWeight:"bold",fontFamily:"monospace",color:secs<300?"#ffaaaa":"#fff"}}>{fmtTime(secs)}</div>
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
              {QUESTIONS.map((item,i)=>{
                const isAns=!!ans[item.id]; const isCur=i===cur; const isFg=!!flg[item.id];
                return <button key={item.id} onClick={()=>setCur(i)} style={{width:"35px",height:"35px",borderRadius:"3px",border:`2px solid ${isCur?"#003865":isAns?"#1a6e2e":"#bcc8d4"}`,background:isCur?"#003865":isAns?"#d4edda":"#fafbfc",color:isCur?"#fff":isAns?"#1a5c28":"#445",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",position:"relative"}}>
                  {i+1}{isFg&&<span style={{position:"absolute",top:"-5px",right:"-4px",fontSize:"0.5rem"}}>🚩</span>}
                </button>;
              })}
            </div>
            <div style={{padding:"0.65rem 0.9rem",borderTop:"1px solid #dde3e9",marginTop:"auto"}}>
              {[["#d4edda","#1a6e2e","Answered"],["#fafbfc","#bcc8d4","Unanswered"]].map(([bg,bd,lbl])=>(
                <div key={lbl} style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px",fontSize:"0.65rem",color:"#555"}}>
                  <div style={{width:"13px",height:"13px",background:bg,border:`2px solid ${bd}`,borderRadius:"2px"}}/>{lbl}
                </div>
              ))}
              <div style={{display:"flex",alignItems:"center",gap:"6px",fontSize:"0.65rem",color:"#555"}}><span>🚩</span>Flagged</div>
            </div>
          </div>
        )}

        <div style={{flex:1,overflowY:"auto",padding:window.innerWidth>640?"1.25rem 1.75rem":"0.75rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <span style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#003865",background:"#ddeaf7",padding:"3px 8px",borderRadius:"2px",border:"1px solid #b3cde8"}}>{q.standard}</span>
              <span style={{fontSize:"0.78rem",color:"#666"}}>Question {cur+1} of {TOTAL}</span>
            </div>
            <button onClick={()=>setFlg(p=>({...p,[q.id]:!p[q.id]}))} style={{display:"flex",alignItems:"center",gap:"5px",background:isFl?"#fff8e1":"#f8f9fa",border:`1px solid ${isFl?"#ffc107":"#bcc8d4"}`,borderRadius:"3px",padding:"5px 12px",cursor:"pointer",fontSize:"0.73rem",color:isFl?"#7a4e00":"#555",fontWeight:isFl?700:400}}>
              🚩 {isFl?"Flagged":"Flag for Review"}
            </button>
          </div>
          <div style={{height:"1px",background:"#dde3e9"}}/>
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"1.25rem 1.5rem"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#888",marginBottom:"0.65rem"}}>QUESTION</div>
            <p style={{fontSize:"1.05rem",fontFamily:"Georgia,serif",color:"#0f0f0f",lineHeight:1.72,margin:0}}>{q.question}</p>
          </div>
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"1.1rem 1.5rem"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#888",marginBottom:"0.9rem"}}>SELECT ONE ANSWER</div>
            <div style={{display:"flex",flexDirection:"column",gap:"0.55rem"}}>
              {q.choices.map((choice,i)=>{
                const chosen=sel===choice;
                return <label key={choice} onClick={()=>setAns(p=>({...p,[q.id]:choice}))} style={{display:"flex",alignItems:"center",gap:"0.9rem",padding:"0.8rem 1rem",border:`2px solid ${chosen?"#003865":"#c8d3dd"}`,borderRadius:"3px",background:chosen?"#ddeaf7":"#fafbfc",cursor:"pointer"}}>
                  <div style={{width:"26px",height:"26px",borderRadius:"50%",border:`2px solid ${chosen?"#003865":"#9aabba"}`,background:chosen?"#003865":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:"0.7rem",fontWeight:700,color:chosen?"#fff":"#667"}}>{LETTERS[i]}</span>
                  </div>
                  <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",color:"#0f0f0f"}}>{choice}</span>
                </label>;
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{background:"#fff",borderTop:"2px solid #c8d3dd",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.65rem 1.5rem",flexShrink:0}}>
        <button onClick={()=>setCur(c=>Math.max(0,c-1))} disabled={cur===0} style={{background:cur===0?"#e8edf2":"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"7px 20px",fontSize:"0.83rem",cursor:cur===0?"not-allowed":"pointer",color:cur===0?"#aaa":"#333",fontWeight:600}}>◀ Back</button>
        <div style={{display:"flex",gap:"4px"}}>
          {QUESTIONS.map((item,i)=><div key={i} onClick={()=>setCur(i)} style={{width:"9px",height:"9px",borderRadius:"50%",background:i===cur?"#003865":ans[item.id]?"#1a6e2e":"#c8d3dd",cursor:"pointer"}}/>)}
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
              <p style={{fontSize:"0.88rem",color:"#444",margin:"0 0 0.75rem"}}>You have answered <strong>{ansCount}</strong> of <strong>{TOTAL}</strong> questions.</p>
              {ansCount<TOTAL&&<div style={{fontSize:"0.82rem",color:"#8b1a1a",background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"3px",padding:"0.55rem 0.85rem",marginBottom:"0.75rem"}}>⚠ {TOTAL-ansCount} question{TOTAL-ansCount>1?"s are":" is"} unanswered.</div>}
              <p style={{fontSize:"0.82rem",color:"#666",margin:0}}>Once submitted you cannot return to change answers.</p>
            </div>
            <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.25rem",borderTop:"1px solid #dde3e9"}}>
              <button onClick={()=>setModal(false)} style={{flex:1,background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:"#333"}}>Go Back</button>
              <button onClick={doSubmit} style={{flex:1,background:"#1a6e2e",border:"none",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",color:"#fff",fontWeight:700}}>Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════
// STUDENT: RESULTS
// ══════════════════════════════════════════
function StudentResults({ session, onReset }) {
  const p=session.pct;
  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",fontFamily:"sans-serif",display:"flex",flexDirection:"column"}}>
      <TopBar title="Grade 5 Mathematics — Session Results"/>
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
            {QUESTIONS.map((q,i)=>{
              const a=session.answers[q.id]; const ok=a===q.correct;
              return <div key={q.id} style={{display:"flex",gap:"0.75rem",marginBottom:"0.6rem",padding:"0.7rem 0.85rem",background:ok?"#f0faf2":"#fdf2f2",border:`1px solid ${ok?"#b3dfc0":"#f0b8b8"}`,borderRadius:"3px"}}>
                <div style={{width:"22px",height:"22px",borderRadius:"50%",background:ok?"#1a6e2e":"#8b1a1a",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"1px"}}>
                  <span style={{color:"#fff",fontSize:"0.7rem",fontWeight:700}}>{i+1}</span>
                </div>
                <div style={{flex:1,fontSize:"0.82rem"}}>
                  <div style={{color:"#777",fontSize:"0.63rem",letterSpacing:"0.08em",marginBottom:"2px"}}>{q.standard}</div>
                  <div style={{color:"#1a1a1a",fontFamily:"Georgia,serif",marginBottom:ok?0:"4px"}}>{q.question}</div>
                  {!ok&&<div style={{fontSize:"0.78rem"}}><span style={{color:"#1a6e2e"}}>Correct: <strong>{q.correct}</strong></span>{a&&<span style={{color:"#8b1a1a"}}> · Your answer: {a}</span>}</div>}
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

// ══════════════════════════════════════════
// TEACHER: LOGIN
// ══════════════════════════════════════════
function TeacherLogin({ onEnter, onBack }) {
  const [code,setCode]=useState(""); const [err,setErr]=useState("");
  function submit(){
    if(code.trim().toUpperCase()!==TEACHER_CODE){setErr("Invalid code. (Hint: TEACH123)");return;}
    onEnter();
  }
  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",gap:"1rem"}}>
      <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",width:"100%",maxWidth:"380px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,.09)"}}>
        <div style={{background:"#003865",color:"#fff",padding:"1.1rem 2rem"}}>
          <div style={{fontSize:"0.58rem",letterSpacing:"0.18em",opacity:.65,marginBottom:"3px"}}>GEORGIA MILESTONES READINESS TRAINER</div>
          <div style={{fontSize:"1.1rem",fontWeight:700,fontFamily:"Georgia,serif"}}>Teacher Dashboard</div>
        </div>
        <div style={{padding:"2rem"}}>
          <label style={S.lbl}>TEACHER ACCESS CODE</label>
          <input style={{...S.inp,fontFamily:"monospace",fontSize:"1rem",letterSpacing:"0.15em",textTransform:"uppercase"}} value={code} onChange={e=>{setCode(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Enter code" autoFocus/>
          {err&&<div style={{...S.errBox,marginTop:"0.75rem"}}>⚠ {err}</div>}
          <button onClick={submit} style={{...S.btnPri,width:"100%",marginTop:"1.25rem"}}>Enter Dashboard →</button>
          <button onClick={onBack} style={{...S.btnSec,width:"100%",marginTop:"0.5rem"}}>← Back</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
// TEACHER: DASHBOARD
// ══════════════════════════════════════════
function TeacherDashboard({ onBack }) {
  const [tab,setTab]       = useState("overview");
  const [sessions,setSessions]=useState([]);
  const [selected,setSelected]=useState(null);
  const [loading,setLoading]=useState(true);
  const [clearing,setClearing]=useState(false);

  const refresh = useCallback(async()=>{
    const s = await loadSessions();
    setSessions(s);
    setLoading(false);
  },[]);

  useEffect(()=>{ refresh(); const t=setInterval(refresh,3000); return()=>clearInterval(t); },[refresh]);

  async function handleClear(){
    setClearing(true);
    await clearSessions();
    setSessions([]);
    setSelected(null);
    setClearing(false);
  }

  const sorted = [...sessions].sort((a,b)=>b.score-a.score);
  const sel    = sessions.find(s=>s.name===selected);
  const avgP   = sessions.length ? Math.round(sessions.reduce((a,s)=>a+s.pct,0)/sessions.length) : 0;
  const profC  = sessions.filter(s=>s.pct>=80).length;
  const devC   = sessions.filter(s=>s.pct>=60&&s.pct<80).length;
  const begC   = sessions.filter(s=>s.pct<60).length;

  const itemData = QUESTIONS.map(q=>{
    const correct=sessions.filter(s=>s.answers[q.id]===q.correct).length;
    return {...q, correctCount:correct, pct:sessions.length?Math.round((correct/sessions.length)*100):0};
  });

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"sans-serif",background:"#e8edf2",overflow:"hidden"}}>
      <TopBar title="Teacher Dashboard — Grade 5 Mathematics" right={
        <div style={{display:"flex",gap:"1rem",alignItems:"center"}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"0.58rem",opacity:.6,letterSpacing:"0.1em"}}>STUDENTS SUBMITTED</div>
            <div style={{fontSize:"1.1rem",fontWeight:700}}>{sessions.length} <span style={{fontSize:"0.7rem",opacity:.6}}>auto-refreshing</span></div>
          </div>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"6px 12px",cursor:"pointer",fontSize:"0.75rem"}}>← Exit</button>
        </div>
      }/>

      {/* TAB BAR */}
      <div style={{background:"#004e94",display:"flex",alignItems:"flex-end",padding:"0 1.5rem",gap:"0.15rem"}}>
        {[["overview","📊 Overview"],["items","📋 Item Analysis"],["students","👤 Students"]].map(([key,lbl])=>(
          <button key={key} onClick={()=>setTab(key)} style={{background:tab===key?"#fff":"transparent",color:tab===key?"#003865":"#cce0f5",border:"none",padding:"0.6rem 1.1rem",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",borderRadius:"4px 4px 0 0",transition:"all .1s"}}>{lbl}</button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"0.5rem",paddingBottom:"4px"}}>
          <button onClick={handleClear} disabled={clearing||sessions.length===0} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",color:"#fecaca",borderRadius:"3px",padding:"4px 10px",cursor:sessions.length===0?"not-allowed":"pointer",fontSize:"0.68rem",opacity:sessions.length===0?.4:1}}>
            {clearing?"Clearing…":"🗑 Clear Sessions"}
          </button>
        </div>
      </div>

      <div style={{flex:1,padding:"1.25rem 1.5rem",overflowY:"auto"}}>
        {loading ? (
          <div style={{textAlign:"center",color:"#aaa",paddingTop:"3rem",fontSize:"0.9rem"}}>Loading sessions…</div>
        ) : sessions.length===0 && tab!=="items" ? (
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa",maxWidth:"600px"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>⏳</div>
            <div style={{fontSize:"1rem",fontWeight:600,color:"#555",marginBottom:"4px"}}>Waiting for students…</div>
            <div style={{fontSize:"0.82rem"}}>Scores will appear here automatically as students submit their tests. This refreshes every 3 seconds.</div>
          </div>
        ) : (

          <>
          {/* OVERVIEW */}
          {tab==="overview"&&(
            <div style={{maxWidth:"900px",display:"flex",flexDirection:"column",gap:"1.1rem"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:"0.8rem"}}>
                {[
                  {lbl:"CLASS AVERAGE",val:`${avgP}%`,sub:`${sessions.length} submitted`,c:lvlC(avgP),bg:lvlBg(avgP),bd:lvlBd(avgP)},
                  {lbl:"PROFICIENT",val:profC,sub:`≥ 80%`,c:"#1a6e2e",bg:"#d4edda",bd:"#b3dfc0"},
                  {lbl:"DEVELOPING",val:devC,sub:"60–79%",c:"#7a4e00",bg:"#fff3cd",bd:"#ffc107"},
                  {lbl:"BEGINNING",val:begC,sub:"< 60%",c:"#8b1a1a",bg:"#fdf2f2",bd:"#f0b8b8"},
                ].map(c=>(
                  <div key={c.lbl} style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"1rem 1.25rem",borderTop:`3px solid ${c.c}`}}>
                    <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.12em",color:"#888",marginBottom:"0.35rem"}}>{c.lbl}</div>
                    <div style={{fontSize:"1.8rem",fontWeight:700,color:c.c,lineHeight:1}}>{c.val}</div>
                    <div style={{fontSize:"0.72rem",color:"#888",marginTop:"4px"}}>{c.sub}</div>
                  </div>
                ))}
              </div>

              {sessions.length>0&&(
                <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",overflow:"hidden"}}>
                  <div style={{padding:"0.8rem 1.25rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555"}}>SUBMITTED STUDENTS</div>
                    <div style={{fontSize:"0.68rem",color:"#888"}}>Click a row for details</div>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.85rem"}}>
                    <thead>
                      <tr style={{background:"#f8fafc",borderBottom:"1px solid #dde3e9"}}>
                        {["Student","Score","Level","Time Used","Submitted"].map(h=>(
                          <th key={h} style={{padding:"0.55rem 1rem",textAlign:"left",fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:"#888"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sorted.map((s,i)=>(
                        <tr key={s.name} onClick={()=>{setSelected(s.name);setTab("students");}} style={{borderBottom:"1px solid #eef1f4",cursor:"pointer",background:i%2===0?"#fff":"#fafbfc"}}
                          onMouseEnter={e=>e.currentTarget.style.background="#f0f4f8"}
                          onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafbfc"}>
                          <td style={{padding:"0.65rem 1rem",fontWeight:600,color:"#1a1a1a"}}>{s.name}</td>
                          <td style={{padding:"0.65rem 1rem"}}><strong>{s.score}</strong><span style={{color:"#aaa"}}> / {s.total}</span></td>
                          <td style={{padding:"0.65rem 1rem"}}><span style={{fontSize:"0.72rem",fontWeight:700,color:lvlC(s.pct),background:lvlBg(s.pct),border:`1px solid ${lvlBd(s.pct)}`,borderRadius:"3px",padding:"2px 8px"}}>{lvl(s.pct)}</span></td>
                          <td style={{padding:"0.65rem 1rem",color:"#555",fontFamily:"monospace",fontSize:"0.82rem"}}>{s.timeUsed}</td>
                          <td style={{padding:"0.65rem 1rem",color:"#888",fontSize:"0.82rem"}}>{s.submitted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ITEM ANALYSIS */}
          {tab==="items"&&(
            <div style={{maxWidth:"800px",display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {sessions.length===0&&<div style={{background:"#fff8e1",border:"1px solid #ffd166",borderRadius:"3px",padding:"0.75rem 1.25rem",fontSize:"0.82rem",color:"#7a4e00",marginBottom:"0.25rem"}}>⚠ No submissions yet — item analysis will populate as students submit.</div>}
              {itemData.map((item,i)=>(
                <div key={item.id} style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.85rem 1.25rem",display:"flex",alignItems:"center",gap:"1.25rem"}}>
                  <div style={{width:"28px",height:"28px",borderRadius:"50%",background:lvlBg(item.pct),border:`2px solid ${lvlBd(item.pct)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:"0.72rem",fontWeight:700,color:lvlC(item.pct)}}>{i+1}</span>
                  </div>
                  <div style={{minWidth:"120px"}}>
                    <div style={{fontSize:"0.62rem",color:"#888"}}>{item.standard}</div>
                    <div style={{fontSize:"0.83rem",fontWeight:600,color:"#1a1a1a"}}>{item.short}</div>
                  </div>
                  <div style={{flex:1,height:"18px",background:"#e8edf2",borderRadius:"2px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${item.pct}%`,background:item.pct>=80?"#1a6e2e":item.pct>=60?"#d97706":"#c0392b",borderRadius:"2px",transition:"width .4s"}}/>
                  </div>
                  <div style={{minWidth:"80px",textAlign:"right"}}>
                    <span style={{fontWeight:700,fontSize:"0.95rem",color:lvlC(item.pct)}}>{item.pct}%</span>
                    <span style={{color:"#aaa",fontSize:"0.75rem"}}> ({item.correctCount}/{sessions.length||"–"})</span>
                  </div>
                </div>
              ))}
              <div style={{background:"#f0f4f8",border:"1px solid #dde3e9",borderRadius:"3px",padding:"0.75rem 1.25rem",fontSize:"0.78rem",color:"#555",marginTop:"0.25rem"}}>
                🟢 80%+ Proficient &nbsp; 🟡 60–79% Developing &nbsp; 🔴 Under 60% Needs Reteaching
              </div>
            </div>
          )}

          {/* STUDENTS */}
          {tab==="students"&&(
            <div style={{display:"flex",gap:"1.25rem",maxWidth:"1000px"}}>
              <div style={{width:"210px",flexShrink:0,background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",overflow:"hidden",alignSelf:"flex-start"}}>
                <div style={{padding:"0.65rem 0.9rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555"}}>SELECT STUDENT</div>
                {sorted.map(s=>{
                  const isActive=selected===s.name;
                  return <div key={s.name} onClick={()=>setSelected(s.name)} style={{padding:"0.7rem 0.9rem",borderBottom:"1px solid #eef1f4",cursor:"pointer",background:isActive?"#ddeaf7":"#fff",borderLeft:isActive?"3px solid #003865":"3px solid transparent"}}>
                    <div style={{fontSize:"0.83rem",fontWeight:isActive?700:600,color:"#1a1a1a"}}>{s.name}</div>
                    <div style={{fontSize:"0.7rem",color:lvlC(s.pct),fontWeight:700}}>{s.score}/10 — {lvl(s.pct)}</div>
                  </div>;
                })}
              </div>

              <div style={{flex:1}}>
                {!sel?(
                  <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa"}}>
                    <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>👈</div>
                    <div>Select a student to view their responses</div>
                  </div>
                ):(
                  <div style={{display:"flex",flexDirection:"column",gap:"1rem"}}>
                    <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"1.1rem 1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:"1.1rem",fontWeight:700,color:"#1a1a1a",fontFamily:"Georgia,serif"}}>{sel.name}</div>
                        <div style={{fontSize:"0.78rem",color:"#888",marginTop:"2px"}}>Submitted {sel.submitted} · Time used: {sel.timeUsed}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:"1.6rem",fontWeight:700,color:lvlC(sel.pct),lineHeight:1}}>{sel.score}/{sel.total}</div>
                        <div style={{fontSize:"0.75rem",fontWeight:700,color:lvlC(sel.pct),background:lvlBg(sel.pct),border:`1px solid ${lvlBd(sel.pct)}`,borderRadius:"3px",padding:"2px 10px",marginTop:"4px",display:"inline-block"}}>{lvl(sel.pct)}</div>
                      </div>
                    </div>
                    <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",overflow:"hidden"}}>
                      <div style={{padding:"0.7rem 1.25rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555"}}>ITEM RESPONSES</div>
                      {QUESTIONS.map((q,i)=>{
                        const a=sel.answers[q.id]; const ok=a===q.correct;
                        return <div key={q.id} style={{display:"flex",alignItems:"center",gap:"1rem",padding:"0.7rem 1.25rem",borderBottom:"1px solid #eef1f4",background:ok?"#f8fdf9":"#fdf8f8"}}>
                          <div style={{width:"22px",height:"22px",borderRadius:"50%",background:ok?"#1a6e2e":"#c0392b",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <span style={{color:"#fff",fontSize:"0.7rem",fontWeight:700}}>{i+1}</span>
                          </div>
                          <div style={{minWidth:"90px"}}>
                            <div style={{fontSize:"0.6rem",color:"#aaa"}}>{q.standard}</div>
                            <div style={{fontSize:"0.78rem",fontWeight:600,color:"#334"}}>{q.short}</div>
                          </div>
                          <div style={{flex:1,fontSize:"0.82rem"}}>
                            <span style={{color:"#888"}}>Answer: </span>
                            <span style={{fontWeight:700,color:ok?"#1a6e2e":"#c0392b"}}>{a||<em style={{color:"#aaa"}}>no answer</em>}</span>
                            {!ok&&a&&<span style={{color:"#888"}}> · Correct: <span style={{color:"#1a6e2e",fontWeight:700}}>{q.correct}</span></span>}
                          </div>
                          <span style={{fontWeight:700,fontSize:"0.9rem",color:ok?"#1a6e2e":"#c0392b"}}>{ok?"✓":"✗"}</span>
                        </div>;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared style tokens ────────────────────
const S = {
  page:      {minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"sans-serif"},
  card:      {background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",width:"100%",maxWidth:"500px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,.09)"},
  hdr:       {background:"#003865",color:"#fff",padding:"1.1rem 2rem"},
  hdrSub:    {fontSize:"0.58rem",letterSpacing:"0.18em",opacity:.65,marginBottom:"3px"},
  hdrTitle:  {fontSize:"1.15rem",fontWeight:700,fontFamily:"Georgia,serif"},
  lbl:       {display:"block",fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"5px"},
  inp:       {width:"100%",padding:"0.65rem 0.85rem",border:"1px solid #c8d3dd",borderRadius:"3px",fontSize:"0.95rem",color:"#1a1a1a",background:"#fafbfc",boxSizing:"border-box"},
  errBox:    {background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"3px",padding:"0.6rem 0.9rem",fontSize:"0.82rem",color:"#8b1a1a"},
  confirmBox:{background:"#f8fafc",border:"1px solid #dde3e9",borderRadius:"3px",marginBottom:"1.25rem",overflow:"hidden"},
  confirmRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.65rem 1rem"},
  confirmK:  {fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:"#888"},
  confirmV:  {fontSize:"0.88rem",color:"#1a1a1a",fontWeight:600},
  btnPri:    {background:"#003865",border:"none",borderRadius:"3px",padding:"0.75rem",fontSize:"0.9rem",cursor:"pointer",color:"#fff",fontWeight:700},
  btnSec:    {background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.7rem",fontSize:"0.88rem",cursor:"pointer",fontWeight:600,color:"#333"},
};

// ══════════════════════════════════════════
// APP SHELL
// ══════════════════════════════════════════
export default function App() {
  const [role,setRole]       = useState(null);        // null | student | teacher
  const [sScreen,setSScreen] = useState("login");     // login | test | results
  const [studentName,setStudentName] = useState("");
  const [finalSession,setFinalSession] = useState(null);
  const [teacherIn,setTeacherIn] = useState(false);

  if (!role) return <RoleSelect onRole={setRole}/>;

  if (role==="student") {
    if (sScreen==="login")   return <StudentLogin   onStart={n=>{setStudentName(n);setSScreen("test");}} onBack={()=>setRole(null)}/>;
    if (sScreen==="test")    return <StudentTest    studentName={studentName} onFinish={s=>{setFinalSession(s);setSScreen("results");}}/>;
    if (sScreen==="results") return <StudentResults session={finalSession} onReset={()=>{setStudentName("");setFinalSession(null);setSScreen("login");setRole(null);}}/>;
  }

  if (role==="teacher") {
    if (!teacherIn) return <TeacherLogin onEnter={()=>setTeacherIn(true)} onBack={()=>setRole(null)}/>;
    return <TeacherDashboard onBack={()=>{setTeacherIn(false);setRole(null);}}/>;
  }
}
