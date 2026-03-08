import { useState, useEffect, useCallback } from "react";
import { API } from "./shared/constants";

const S = {
  inp:   { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.85rem", background:"#fafbfc", boxSizing:"border-box" },
  lbl:   { display:"block", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.12em", color:"#555", marginBottom:"4px" },
  btn:   { border:"1px solid #c8d3dd", borderRadius:"3px", padding:"6px 14px", cursor:"pointer", fontSize:"0.78rem", fontWeight:600, background:"#f0f4f8", color:"#333" },
  ta:    { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.82rem", background:"#fafbfc", boxSizing:"border-box", resize:"vertical", fontFamily:"sans-serif", minHeight:"120px" },
};

export default function RosterManager() {
  const [classes,   setClasses]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeClass, setActiveClass] = useState(null); // class id
  const [newClassName, setNewClassName] = useState("");
  const [addMode,   setAddMode]   = useState("one");    // "one" | "paste"
  const [oneInput,  setOneInput]  = useState("");
  const [pasteInput,setPasteInput]= useState("");
  const [adding,    setAdding]    = useState(false);
  const [msg,       setMsg]       = useState("");

  const load = useCallback(async () => {
    try { const r = await fetch(`${API}/roster`); setClasses(await r.json()); }
    catch { setClasses([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(text) { setMsg(text); setTimeout(() => setMsg(""), 3000); }

  async function addClass() {
    if (!newClassName.trim()) return;
    try {
      await fetch(`${API}/roster/class`, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: newClassName.trim() }) });
      setNewClassName("");
      await load();
      flash("Class added!");
    } catch {}
  }

  async function deleteClass(cid) {
    if (!window.confirm("Delete this class and all its students?")) return;
    try { await fetch(`${API}/roster/class/${cid}`, { method:"DELETE" }); await load(); }
    catch {}
  }

  async function addStudents() {
    const cls = classes.find(c => c.id === activeClass);
    if (!cls) return;
    const names = addMode === "one"
      ? [oneInput.trim()].filter(Boolean)
      : pasteInput.split("\n").map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    setAdding(true);
    try {
      const r = await fetch(`${API}/roster/class/${activeClass}/students`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ students: names })
      });
      const data = await r.json();
      setOneInput(""); setPasteInput("");
      await load();
      flash(`Added ${data.added} student${data.added !== 1 ? "s" : ""}!`);
    } catch {}
    setAdding(false);
  }

  async function removeStudent(cid, sid, name) {
    if (!window.confirm(`Remove ${name} from this class?`)) return;
    try { await fetch(`${API}/roster/class/${cid}/student/${sid}`, { method:"DELETE" }); await load(); }
    catch {}
  }

  const activeClassData = classes.find(c => c.id === activeClass);
  const totalStudents   = classes.reduce((a, c) => a + c.students.length, 0);

  if (loading) return <div style={{padding:"3rem",textAlign:"center",color:"#aaa"}}>Loading roster…</div>;

  return (
    <div style={{display:"flex",height:"100%",fontFamily:"sans-serif",background:"#e8edf2",overflow:"hidden"}}>

      {/* ── Left: Class list ── */}
      <div style={{width:"260px",display:"flex",flexDirection:"column",borderRight:"2px solid #c8d3dd",background:"#fff",flexShrink:0,overflow:"hidden"}}>
        <div style={{background:"#003865",color:"#fff",padding:"0.9rem 1.25rem",flexShrink:0}}>
          <div style={{fontSize:"0.6rem",opacity:.65,letterSpacing:"0.14em"}}>TEACHER TOOLS</div>
          <div style={{fontSize:"1rem",fontWeight:700}}>Class Roster</div>
          <div style={{fontSize:"0.72rem",opacity:.7,marginTop:"2px"}}>{classes.length} class{classes.length!==1?"es":""} · {totalStudents} students</div>
        </div>

        {/* Add class */}
        <div style={{padding:"0.85rem 1rem",borderBottom:"1px solid #dde3e9",flexShrink:0}}>
          <label style={S.lbl}>NEW CLASS / PERIOD</label>
          <div style={{display:"flex",gap:"0.4rem"}}>
            <input style={{...S.inp,flex:1}} value={newClassName}
              onChange={e=>setNewClassName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addClass()}
              placeholder="e.g. Period 2"/>
            <button onClick={addClass} style={{...S.btn,background:"#003865",color:"#fff",border:"none",flexShrink:0}}>+ Add</button>
          </div>
          {msg && <div style={{fontSize:"0.72rem",color:"#1a6e2e",fontWeight:700,marginTop:"5px"}}>✓ {msg}</div>}
        </div>

        {/* Class list */}
        <div style={{flex:1,overflowY:"auto",padding:"0.5rem"}}>
          {classes.length === 0 ? (
            <div style={{padding:"2rem 1rem",textAlign:"center",color:"#aaa",fontSize:"0.82rem"}}>
              No classes yet. Add one above.
            </div>
          ) : (
            classes.map(cls => {
              const isActive = cls.id === activeClass;
              return (
                <div key={cls.id} onClick={() => setActiveClass(cls.id)}
                  style={{padding:"0.75rem 0.9rem",borderRadius:"4px",marginBottom:"0.35rem",background:isActive?"#ddeaf7":"#f8fafc",border:`2px solid ${isActive?"#003865":"#dde3e9"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:"0.88rem",fontWeight:700,color:isActive?"#003865":"#1a1a1a"}}>{cls.name}</div>
                    <div style={{fontSize:"0.68rem",color:"#888",marginTop:"1px"}}>{cls.students.length} student{cls.students.length!==1?"s":""}</div>
                  </div>
                  <button onClick={e=>{e.stopPropagation();deleteClass(cls.id);}}
                    style={{...S.btn,padding:"2px 7px",color:"#8b1a1a",borderColor:"#f0b8b8",background:"#fdf2f2",fontSize:"0.68rem"}}>✕</button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Student management ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {!activeClassData ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"#aaa",gap:"0.5rem"}}>
            <div style={{fontSize:"2rem"}}>👈</div>
            <div style={{fontWeight:600,color:"#555"}}>Select a class to manage students</div>
            <div style={{fontSize:"0.82rem"}}>Or create a new class on the left</div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{background:"#fff",borderBottom:"1px solid #c8d3dd",padding:"0.9rem 1.25rem",flexShrink:0}}>
              <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#003865"}}>{activeClassData.name.toUpperCase()}</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:"#1a1a1a",marginTop:"2px"}}>
                {activeClassData.students.length} student{activeClassData.students.length!==1?"s":""}
              </div>
            </div>

            {/* Add student(s) */}
            <div style={{background:"#fff",borderBottom:"2px solid #dde3e9",padding:"1rem 1.25rem",flexShrink:0}}>
              <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.75rem"}}>
                {[["one","Add One"],["paste","Paste List"]].map(([key,lbl])=>(
                  <button key={key} onClick={()=>setAddMode(key)}
                    style={{...S.btn,background:addMode===key?"#003865":"#f0f4f8",color:addMode===key?"#fff":"#333",borderColor:addMode===key?"#003865":"#c8d3dd"}}>
                    {lbl}
                  </button>
                ))}
              </div>

              {addMode === "one" ? (
                <div style={{display:"flex",gap:"0.5rem"}}>
                  <input style={{...S.inp,flex:1}} value={oneInput}
                    onChange={e=>setOneInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addStudents()}
                    placeholder="First Last (e.g. Marcus Johnson)"/>
                  <button onClick={addStudents} disabled={adding||!oneInput.trim()}
                    style={{...S.btn,background:oneInput.trim()?"#1a6e2e":"#c8d3dd",color:"#fff",border:"none",flexShrink:0}}>
                    {adding?"Adding…":"+ Add"}
                  </button>
                </div>
              ) : (
                <div>
                  <label style={S.lbl}>PASTE NAMES — one per line</label>
                  <textarea style={S.ta} value={pasteInput} onChange={e=>setPasteInput(e.target.value)}
                    placeholder={"Marcus Johnson\nAva Williams\nDeShawn Brown\nKeisha Davis"}/>
                  <button onClick={addStudents} disabled={adding||!pasteInput.trim()}
                    style={{...S.btn,marginTop:"0.5rem",background:pasteInput.trim()?"#003865":"#c8d3dd",color:"#fff",border:"none",padding:"0.6rem 1.5rem"}}>
                    {adding?"Adding…":`+ Add ${pasteInput.split("\n").filter(n=>n.trim()).length} Student${pasteInput.split("\n").filter(n=>n.trim()).length!==1?"s":""}`}
                  </button>
                </div>
              )}
            </div>

            {/* Student list */}
            <div style={{flex:1,overflowY:"auto",padding:"0.75rem 1.25rem"}}>
              {activeClassData.students.length === 0 ? (
                <div style={{padding:"2rem",textAlign:"center",color:"#aaa",fontSize:"0.85rem"}}>
                  No students yet. Add them above.
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                  {activeClassData.students.map((s, i) => (
                    <div key={s.id} style={{background:"#fff",border:"1px solid #dde3e9",borderRadius:"3px",padding:"0.6rem 0.9rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",background:"#003865",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{color:"#fff",fontSize:"0.65rem",fontWeight:700}}>{i+1}</span>
                      </div>
                      <div style={{flex:1,fontSize:"0.88rem",fontWeight:600,color:"#1a1a1a"}}>{s.name}</div>
                      <div style={{fontSize:"0.65rem",color:"#aaa",fontFamily:"monospace"}}>{s.id}</div>
                      <button onClick={()=>removeStudent(activeClassData.id, s.id, s.name)}
                        style={{...S.btn,padding:"2px 8px",color:"#8b1a1a",borderColor:"#f0b8b8",background:"#fdf2f2",fontSize:"0.7rem"}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
