import { useState, useEffect, useCallback } from "react";
import { QUESTIONS, lvl, lvlC, lvlBg, lvlBd, loadSessions, clearSessions, API } from "./shared/constants";

const TABS = [
  ["overview",  "📊 Overview"],
  ["items",     "📋 Item Analysis"],
  ["students",  "👤 Students"],
  ["growth",    "📈 Growth"],
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
      <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",padding:"1.25rem 1.5rem"}}>
        <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"0.75rem"}}>{student.name.toUpperCase()} — SCORE TREND</div>
        <div style={{display:"flex",alignItems:"center",gap:"2rem",flexWrap:"wrap"}}>
          <LineChart points={scores} width={340} height={90}/>
          {fsDelta !== null && (
            <div style={{display:"flex",gap:"1.5rem"}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.6rem",color:"#888",letterSpacing:"0.1em"}}>FIRST</div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:lvlC(fsFirst)}}>{fsFirst}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.6rem",color:"#888",letterSpacing:"0.1em"}}>LATEST</div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:lvlC(fsLast)}}>{fsLast}%</div>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.6rem",color:"#888",letterSpacing:"0.1em"}}>CHANGE</div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:fsDelta>0?"#1a6e2e":fsDelta<0?"#8b1a1a":"#888"}}>{fsDelta>0?"+":""}{fsDelta}%</div>
              </div>
            </div>
          )}
        </div>
        {/* Session history */}
        <div style={{marginTop:"1rem",display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          {student.sessions.map((s,i) => (
            <div key={i} style={{background:lvlBg(s.pct),border:`1px solid ${lvlC(s.pct)}33`,borderRadius:"3px",padding:"0.4rem 0.65rem",textAlign:"center",minWidth:"70px"}}>
              <div style={{fontSize:"0.6rem",color:"#888"}}>{s.submitted?.split(",")[0]||`Test ${i+1}`}</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:lvlC(s.pct)}}>{s.pct}%</div>
              {s.testCode&&<div style={{fontSize:"0.58rem",color:"#aaa",fontFamily:"monospace"}}>{s.testCode}</div>}
            </div>
          ))}
        </div>
      </div>
      {/* Standard mastery grid */}
      <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",padding:"1.25rem 1.5rem"}}>
        <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"0.75rem"}}>STANDARD MASTERY</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
          {Object.entries(mastery).sort(([a],[b])=>a.localeCompare(b)).map(([std,v])=>{
            const p = Math.round((v.correct/v.total)*100);
            return (
              <div key={std} title={`${v.correct}/${v.total} correct`}
                style={{background:p>=80?"#f0faf2":p>=60?"#fff8e1":"#fdf2f2",border:`1px solid ${p>=80?"#b3dfc0":p>=60?"#ffc107":"#f0b8b8"}`,borderRadius:"3px",padding:"0.35rem 0.65rem",textAlign:"center",minWidth:"80px"}}>
                <div style={{fontSize:"0.6rem",fontWeight:700,color:"#555"}}>{std}</div>
                <div style={{fontSize:"0.9rem",fontWeight:700,color:p>=80?"#1a6e2e":p>=60?"#7a4e00":"#8b1a1a"}}>{p}%</div>
                <div style={{fontSize:"0.58rem",color:"#aaa"}}>{v.correct}/{v.total}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Simple SVG line chart
function LineChart({ points, width=320, height=80, color="#003865" }) {
  if (!points || points.length < 2) return (
    <div style={{width,height,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",color:"#aaa"}}>
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

export default function Dashboard() {
  const [tab,      setTab]      = useState("overview");
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [clearing, setClearing] = useState(false);
  const [roster,   setRoster]   = useState([]);

  // Growth filters
  const [growthClass,   setGrowthClass]   = useState("all");
  const [growthStudent, setGrowthStudent] = useState("all");

  const refresh = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetch(`${API}/sessions`).then(r=>r.json()),
        fetch(`${API}/roster`).then(r=>r.json()),
      ]);
      setSessions(Array.isArray(s) ? s : []);
      setRoster(Array.isArray(r) ? r : []);
    } catch { setSessions([]); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); const t=setInterval(refresh,3000); return()=>clearInterval(t); }, [refresh]);

  async function handleClear() {
    setClearing(true);
    await clearSessions();
    setSessions([]); setSelected(null); setClearing(false);
  }

  // ── Overview stats ──
  const sorted  = [...sessions].sort((a,b)=>b.pct - a.pct);
  const sel     = sessions.find(s => s.name===selected || s.studentName===selected);
  const avgP    = sessions.length ? Math.round(sessions.reduce((a,s)=>a+s.pct,0)/sessions.length) : 0;
  const profC   = sessions.filter(s=>s.pct>=80).length;
  const devC    = sessions.filter(s=>s.pct>=60&&s.pct<80).length;
  const begC    = sessions.filter(s=>s.pct<60).length;

  // ── Item analysis (use live question ids if available) ──
  const allQIds = [...new Set(sessions.flatMap(s=>Object.keys(s.answers||{})))];
  const bankQ   = QUESTIONS;
  const itemData = bankQ.map(q => {
    const correct = sessions.filter(s=>s.answers?.[q.id]===q.correct).length;
    const attempted = sessions.filter(s=>q.id in (s.answers||{})).length;
    return { ...q, correctCount:correct, attempted, pct: attempted ? Math.round((correct/attempted)*100) : 0 };
  }).filter(q => q.attempted > 0);

  // ── Growth: build per-student history ──
  // Group sessions by studentId (fall back to studentName)
  function studentKey(s) { return s.studentId || s.studentName || s.name || "Unknown"; }
  function studentLabel(s) { return s.studentName || s.name || "Unknown"; }
  function studentClass(s) { return s.className || ""; }

  const studentMap = {};
  sessions.forEach(s => {
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

  // Unique class names from sessions
  const sessionClasses = [...new Set(sessions.map(s=>s.className||"").filter(Boolean))];
  const filteredStudents = Object.entries(studentMap).filter(([,st]) => {
    if (growthClass !== "all" && st.className !== growthClass) return false;
    return true;
  });

  const focusStudent = growthStudent !== "all" ? studentMap[growthStudent] : null;

  function renderTab() {
    if (loading) return <div style={{textAlign:"center",color:"#aaa",paddingTop:"3rem"}}>Loading…</div>;

    if (tab === "overview") {
      if (sessions.length === 0) return (
        <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa",maxWidth:"600px"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>⏳</div>
          <div style={{fontSize:"1rem",fontWeight:600,color:"#555",marginBottom:"4px"}}>Waiting for students…</div>
          <div style={{fontSize:"0.82rem"}}>Scores appear automatically as students submit.</div>
        </div>
      );
      return (
        <div style={{display:"flex",flexDirection:"column",gap:"1rem",maxWidth:"860px"}}>
          <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
            {[
              ["Class Average", `${avgP}%`, lvlC(avgP), lvlBg(avgP)],
              ["Proficient (≥80%)", profC, "#1a6e2e", "#f0faf2"],
              ["Developing (60–79%)", devC, "#7a4e00", "#fff8e1"],
              ["Beginning (<60%)", begC, "#8b1a1a", "#fdf2f2"],
              ["Submitted", sessions.length, "#003865", "#ddeaf7"],
            ].map(([lbl,val,c,bg])=>(
              <div key={lbl} style={{background:bg,border:`1px solid ${c}22`,borderRadius:"4px",padding:"0.9rem 1.25rem",minWidth:"120px",flex:1}}>
                <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.12em",color:c,marginBottom:"4px"}}>{lbl.toUpperCase()}</div>
                <div style={{fontSize:"1.6rem",fontWeight:700,color:c}}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
            <div style={{padding:"0.75rem 1rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555"}}>
              STUDENT SCORES — {sorted.length} submitted
            </div>
            {sorted.map((s,i)=>{
              const name = s.studentName||s.name; const p=s.pct;
              return (
                <div key={i} onClick={()=>setSelected(name===selected?null:name)}
                  style={{padding:"0.7rem 1rem",borderBottom:"1px solid #f0f4f8",cursor:"pointer",background:name===selected?"#f0f6ff":"#fff",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                  <div style={{width:"28px",height:"28px",borderRadius:"50%",background:lvlBg(p),border:`2px solid ${lvlC(p)}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:"0.65rem",fontWeight:700,color:lvlC(p)}}>{i+1}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.88rem",fontWeight:700,color:"#1a1a1a"}}>{name}</div>
                    {s.className&&<div style={{fontSize:"0.65rem",color:"#888"}}>{s.className}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"1rem",fontWeight:700,color:lvlC(p)}}>{p}%</div>
                    <div style={{fontSize:"0.65rem",color:"#888"}}>{s.score}/{s.total} · {s.timeUsed}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {sel && (
            <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",padding:"1rem 1.25rem"}}>
              <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"0.75rem"}}>{(sel.studentName||sel.name).toUpperCase()} — ITEM DETAIL</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px"}}>
                {Object.entries(sel.answers||{}).map(([qid,ans])=>{
                  const q = bankQ.find(x=>x.id===qid);
                  const ok = q && ans===q.correct;
                  return <div key={qid} title={q?.standard||qid}
                    style={{width:"28px",height:"28px",borderRadius:"3px",background:ok?"#1a6e2e":"#8b1a1a",display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{color:"#fff",fontSize:"0.7rem",fontWeight:700}}>{ok?"✓":"✗"}</span>
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
        <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa",maxWidth:"600px"}}>
          <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📋</div>
          <div style={{fontSize:"1rem",fontWeight:600,color:"#555"}}>No item data yet</div>
          <div style={{fontSize:"0.82rem",marginTop:"4px"}}>Item analysis appears once students start submitting.</div>
        </div>
      );
      return (
        <div style={{maxWidth:"860px"}}>
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
            <div style={{padding:"0.75rem 1rem",background:"#f0f4f8",borderBottom:"1px solid #dde3e9",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#555"}}>
              ITEM ANALYSIS — {itemData.length} questions attempted
            </div>
            {itemData.sort((a,b)=>a.pct-b.pct).map(q=>(
              <div key={q.id} style={{padding:"0.65rem 1rem",borderBottom:"1px solid #f0f4f8",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <div style={{width:"36px",textAlign:"right",fontSize:"0.9rem",fontWeight:700,color:q.pct>=70?"#1a6e2e":q.pct>=50?"#7a4e00":"#8b1a1a",flexShrink:0}}>{q.pct}%</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:"0.35rem",marginBottom:"2px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.6rem",fontWeight:700,color:"#003865",background:"#ddeaf7",padding:"1px 5px",borderRadius:"2px"}}>{q.standard}</span>
                    {q.dok&&<span style={{fontSize:"0.6rem",fontWeight:700,color:"#7a4e00",background:"#fff3cd",padding:"1px 5px",borderRadius:"2px"}}>DOK {q.dok}</span>}
                    <span style={{fontSize:"0.6rem",color:"#888"}}>{q.short}</span>
                  </div>
                  <div style={{height:"6px",background:"#e8edf2",borderRadius:"3px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${q.pct}%`,background:q.pct>=70?"#1a6e2e":q.pct>=50?"#f59e0b":"#8b1a1a",borderRadius:"3px",transition:"width .3s"}}/>
                  </div>
                </div>
                <div style={{fontSize:"0.68rem",color:"#888",flexShrink:0}}>{q.correctCount}/{q.attempted}</div>
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
                    <div style={{fontSize:"1.2rem",fontWeight:700,color:"#003865"}}>{st.sessions.length}</div>
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
                          <div style={{fontSize:"0.9rem",fontWeight:700,color:"#003865"}}>{st.sessions.length}</div>
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

    return null;
  }

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#e8edf2",overflow:"hidden"}}>
      {/* Tab bar */}
      <div style={{background:"#004e94",display:"flex",alignItems:"flex-end",padding:"0 1.5rem",gap:"0.15rem",flexShrink:0}}>
        {TABS.map(([key,lbl])=>(
          <button key={key} onClick={()=>setTab(key)}
            style={{background:tab===key?"#fff":"transparent",color:tab===key?"#003865":"#cce0f5",border:"none",padding:"0.6rem 1.1rem",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",borderRadius:"4px 4px 0 0"}}>
            {lbl}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"0.5rem",paddingBottom:"4px"}}>
          <div style={{fontSize:"0.68rem",color:"#cce0f5",opacity:.7}}>{sessions.length} total submissions · live</div>
          <button onClick={handleClear} disabled={clearing||sessions.length===0}
            style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",color:"#fecaca",borderRadius:"3px",padding:"4px 10px",cursor:sessions.length===0?"not-allowed":"pointer",fontSize:"0.68rem",opacity:sessions.length===0?.4:1}}>
            {clearing?"Clearing…":"🗑 Clear"}
          </button>
        </div>
      </div>

      <div style={{flex:1,padding:"1.25rem 1.5rem",overflowY:"auto"}}>
        {renderTab()}
      </div>
    </div>
  );
}
