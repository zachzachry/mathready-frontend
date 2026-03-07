import { useState, useEffect, useCallback } from "react";
import { QUESTIONS, TOTAL, lvl, lvlC, lvlBg, lvlBd, loadSessions, clearSessions } from "./shared/constants";

export default function Dashboard() {
  const [tab,setTab]           = useState("overview");
  const [sessions,setSessions] = useState([]);
  const [selected,setSelected] = useState(null);
  const [loading,setLoading]   = useState(true);
  const [clearing,setClearing] = useState(false);

  const refresh = useCallback(async()=>{
    const s = await loadSessions();
    setSessions(s);
    setLoading(false);
  },[]);

  useEffect(()=>{refresh();const t=setInterval(refresh,3000);return()=>clearInterval(t);},[refresh]);

  async function handleClear(){
    setClearing(true);
    await clearSessions();
    setSessions([]); setSelected(null); setClearing(false);
  }

  const sorted  = [...sessions].sort((a,b)=>b.score-a.score);
  const sel     = sessions.find(s=>s.name===selected);
  const avgP    = sessions.length ? Math.round(sessions.reduce((a,s)=>a+s.pct,0)/sessions.length) : 0;
  const profC   = sessions.filter(s=>s.pct>=80).length;
  const devC    = sessions.filter(s=>s.pct>=60&&s.pct<80).length;
  const begC    = sessions.filter(s=>s.pct<60).length;
  const itemData = QUESTIONS.map(q=>{
    const correct=sessions.filter(s=>s.answers[q.id]===q.correct).length;
    return {...q, correctCount:correct, pct:sessions.length?Math.round((correct/sessions.length)*100):0};
  });

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#e8edf2",overflow:"hidden"}}>
      {/* Tab bar */}
      <div style={{background:"#004e94",display:"flex",alignItems:"flex-end",padding:"0 1.5rem",gap:"0.15rem",flexShrink:0}}>
        {[["overview","📊 Overview"],["items","📋 Item Analysis"],["students","👤 Students"]].map(([key,lbl])=>(
          <button key={key} onClick={()=>setTab(key)} style={{background:tab===key?"#fff":"transparent",color:tab===key?"#003865":"#cce0f5",border:"none",padding:"0.6rem 1.1rem",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",borderRadius:"4px 4px 0 0"}}>
            {lbl}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:"0.5rem",paddingBottom:"4px"}}>
          <div style={{fontSize:"0.68rem",color:"#cce0f5",opacity:.7}}>{sessions.length} submitted · auto-refresh</div>
          <button onClick={handleClear} disabled={clearing||sessions.length===0} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.25)",color:"#fecaca",borderRadius:"3px",padding:"4px 10px",cursor:sessions.length===0?"not-allowed":"pointer",fontSize:"0.68rem",opacity:sessions.length===0?.4:1}}>
            {clearing?"Clearing…":"🗑 Clear"}
          </button>
        </div>
      </div>

      <div style={{flex:1,padding:"1.25rem 1.5rem",overflowY:"auto"}}>
        {loading ? (
          <div style={{textAlign:"center",color:"#aaa",paddingTop:"3rem"}}>Loading sessions…</div>
        ) : sessions.length===0 && tab!=="items" ? (
          <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa",maxWidth:"600px"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>⏳</div>
            <div style={{fontSize:"1rem",fontWeight:600,color:"#555",marginBottom:"4px"}}>Waiting for students…</div>
            <div style={{fontSize:"0.82rem"}}>Scores appear automatically as students submit. Refreshes every 3 seconds.</div>
          </div>
        ) : (
          <>
          {/* OVERVIEW */}
          {tab==="overview"&&(
            <div style={{maxWidth:"900px",display:"flex",flexDirection:"column",gap:"1.1rem"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:"0.8rem"}}>
                {[
                  {lbl:"CLASS AVERAGE",val:`${avgP}%`,sub:`${sessions.length} submitted`,c:lvlC(avgP),bg:lvlBg(avgP),bd:lvlBd(avgP)},
                  {lbl:"PROFICIENT",val:profC,sub:"≥ 80%",c:"#1a6e2e",bg:"#d4edda",bd:"#b3dfc0"},
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
                          <td style={{padding:"0.65rem 1rem",fontWeight:600}}>{s.name}</td>
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
              <div style={{background:"#f0f4f8",border:"1px solid #dde3e9",borderRadius:"3px",padding:"0.75rem 1.25rem",fontSize:"0.78rem",color:"#555"}}>
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
                    <div style={{fontSize:"0.7rem",color:lvlC(s.pct),fontWeight:700}}>{s.score}/{TOTAL} — {lvl(s.pct)}</div>
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
