import { useState, useEffect } from "react";
import MathText from "./shared/MathText";
import TopBar from "./shared/TopBar";
import { STUDENT_CODE, QUESTIONS, TOTAL, START_SECS, LETTERS, S, pct, lvl, lvlC, lvlBg, lvlBd, fmtTime, now, saveSession, sendHeartbeat } from "./shared/constants";

// ── Student Login ──────────────────────────────────────────
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
            <button onClick={submit} style={{...S.btnPri,width:"100%",marginTop:"1rem"}}>Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Student Test ───────────────────────────────────────────
function StudentTest({ studentName, onFinish }) {
  const [cur,setCur]    = useState(0);
  const [ans,setAns]    = useState({});
  const [flg,setFlg]    = useState({});
  const [secs,setSecs]  = useState(START_SECS);
  const [modal,setModal]= useState(false);
  const [nav,setNav]    = useState(window.innerWidth > 640);

  useEffect(()=>{const t=setInterval(()=>setSecs(s=>s>0?s-1:0),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    sendHeartbeat(studentName,cur);
    const t=setInterval(()=>sendHeartbeat(studentName,cur),30000);
    return()=>clearInterval(t);
  },[studentName,cur]);

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
            <p style={{fontSize:"1.05rem",fontFamily:"Georgia,serif",color:"#0f0f0f",lineHeight:1.72,margin:0}}><MathText text={q.question}/></p>
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
                  <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",color:"#0f0f0f"}}><MathText text={choice}/></span>
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

// ── Student Results ────────────────────────────────────────
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
                  <div style={{color:"#1a1a1a",fontFamily:"Georgia,serif",marginBottom:ok?0:"4px"}}><MathText text={q.question}/></div>
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

// ── Exported shell ─────────────────────────────────────────
export default function MathTest({ onBack }) {
  const [screen,setScreen]       = useState("login");
  const [studentName,setStudentName] = useState("");
  const [finalSession,setFinalSession] = useState(null);

  if (screen==="login")   return <StudentLogin onStart={n=>{setStudentName(n);setScreen("test");}} onBack={onBack}/>;
  if (screen==="test")    return <StudentTest  studentName={studentName} onFinish={s=>{setFinalSession(s);setScreen("results");}}/>;
  if (screen==="results") return <StudentResults session={finalSession} onReset={()=>{setStudentName("");setFinalSession(null);setScreen("login");onBack();}}/>;
}
