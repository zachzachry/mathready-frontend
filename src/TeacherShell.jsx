import { useState, useEffect, useCallback } from "react";
import TopBar from "./shared/TopBar";
import Dashboard from "./Dashboard";
import QuestionBuilder from "./QuestionBuilder";
import TestBuilder from "./TestBuilder";
import RosterManager from "./RosterManager";
import TeacherManager from "./TeacherManager";
import { API, T, S } from "./shared/constants";

// ── Manage Classes (super_admin only) ──────────────────────
function ClassAdmin() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding,  setAdding]  = useState(false);
  const [msg,     setMsg]     = useState("");

  const load = useCallback(async () => {
    try { const r = await fetch(`${API}/roster`); setClasses(await r.json()); }
    catch (e) { console.warn("Failed to load classes:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(t) { setMsg(t); setTimeout(() => setMsg(""), 3000); }

  async function addClass() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await fetch(`${API}/roster/class`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName(""); await load(); flash("Class created!");
    } catch (e) { console.warn("Failed to create class:", e); flash("Could not create class. Try again."); }
    setAdding(false);
  }

  async function deleteClass(cls) {
    if (!window.confirm(`Delete "${cls.name}" and all its students?`)) return;
    try { await fetch(`${API}/roster/class/${cls.id}`, { method: "DELETE" }); await load(); }
    catch (e) { console.warn("Failed to delete class:", e); }
  }

  if (loading) return <div style={{ padding: "2rem", color: "#aaa" }}>Loading…</div>;

  return (
    <div style={{ padding: "1.25rem", maxWidth: "700px" }}>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: T.text, marginBottom: "4px" }}>Manage Classes</div>
      <div style={{ fontSize: "0.75rem", color: T.textSecondary, marginBottom: "1.25rem" }}>
        Create classes here, then assign them to teachers in the Manage Teachers tab.
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addClass()}
          placeholder="Class name, e.g. Ms. Johnson Period 1"
          style={{ flex: 1, padding: "0.5rem 0.75rem", border: `1px solid ${T.border}`,
            borderRadius: T.xs, fontSize: "0.85rem", background: T.white }}/>
        <button onClick={addClass} disabled={adding || !newName.trim()}
          style={{ background: T.teal, color: T.white, border: "none", borderRadius: T.xs,
            padding: "0 1.25rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700,
            opacity: adding || !newName.trim() ? 0.6 : 1, transition: "opacity .15s" }}>
          {adding ? "Adding…" : "+ Add Class"}
        </button>
      </div>

      {msg && (
        <div style={{ background: T.successBg, border: `1px solid ${T.successBd}`, borderRadius: T.xs,
          padding: "0.5rem 0.85rem", fontSize: "0.78rem", color: T.success, fontWeight: 700, marginBottom: "0.85rem" }}>
          ✓ {msg}
        </div>
      )}

      {classes.length === 0 ? (
        <div style={{ background: T.surface, border: `1px dashed ${T.borderDark}`, borderRadius: T.r,
          padding: "2rem", textAlign: "center", color: T.textMuted }}>
          No classes yet. Add your first class above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {classes.map((cls, i) => (
            <div key={cls.id} style={{ background: T.white, border: `1px solid ${T.border}`,
              borderRadius: T.r, padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: T.full, background: T.teal,
                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.72rem", color: T.white, fontWeight: 700 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: T.text, fontSize: "0.9rem" }}>{cls.name}</div>
                <div style={{ fontSize: "0.7rem", color: T.textMuted }}>
                  {cls.students?.length || 0} student{cls.students?.length !== 1 ? "s" : ""}
                </div>
              </div>
              <button onClick={() => deleteClass(cls)}
                style={S.btnDanger}>✕ Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tool definitions ───────────────────────────────────────
const _ic = (children) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    {children}
  </svg>
);
const ALL_TOOLS = [
  { id:"dashboard",
    icon: _ic(<><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></>),
    label:"Live Dashboard", sub:"Scores & item analysis", roles:["super_admin","school_admin","teacher","observer"] },
  { id:"roster",
    icon: _ic(<><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></>),
    label:"Class Roster", sub:"Manage students & periods", roles:["super_admin","school_admin","teacher"] },
  { id:"testbuilder",
    icon: _ic(<><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m9 12 2 2 4-4"/></>),
    label:"Test Builder", sub:"Build, save & share tests", roles:["super_admin","school_admin","teacher"] },
  { id:"builder",
    icon: _ic(<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>),
    label:"Question Builder", sub:"Create & edit questions", roles:["super_admin","school_admin","teacher"] },
  { id:"teachers",
    icon: _ic(<><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/></>),
    label:"Manage Teachers", sub:"Teacher accounts & access", roles:["super_admin"] },
  { id:"classes",
    icon: _ic(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>),
    label:"Manage Classes", sub:"Create & organize classes", roles:["super_admin"] },
];

function effectiveClassIds(teacher) {
  // All roles filter to their own assigned classes.
  // Admins get school-wide data via the School Overview tab separately.
  return teacher?.classIds ?? [];
}

// ── View-as picker for super_admin ─────────────────────────
function ViewAsPicker({ teachers, onPick, onCancel }) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(15,23,42,.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <div style={{background:T.white,borderRadius:T.rl,maxWidth:"400px",width:"100%",overflow:"hidden",boxShadow:T.lg}}>
        <div style={{background:T.midnight,color:T.white,padding:"1rem 1.25rem",fontWeight:700,fontSize:"0.95rem"}}>
          View As Teacher
        </div>
        <div style={{padding:"1rem",maxHeight:"320px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"0.35rem"}}>
          {teachers.length === 0 && <div style={{color:T.textMuted,padding:"1rem",textAlign:"center"}}>No other teachers found.</div>}
          {teachers.map(t => (
            <button key={t.id} onClick={() => onPick(t)}
              style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem 0.85rem",
                background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.r,cursor:"pointer",textAlign:"left",width:"100%",transition:"background .15s"}}>
              <div style={{width:"32px",height:"32px",borderRadius:T.full,background:T.teal,color:T.white,
                display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.85rem",flexShrink:0}}>
                {t.name[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:"0.85rem",color:T.text}}>{t.name}</div>
                <div style={{fontSize:"0.7rem",color:T.textSecondary}}>{t.email || "No email"} · {(t.classIds||[]).length} class{(t.classIds||[]).length!==1?"es":""}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{padding:"0.75rem 1rem",borderTop:`1px solid ${T.border}`,textAlign:"right"}}>
          <button onClick={onCancel} style={S.btnSec}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main shell ─────────────────────────────────────────────
export default function TeacherShell({ onBack, teacher, onUpdateClassIds, onViewAsTeacher, onViewAsStudent }) {
  const role     = teacher?.teacherRole || "teacher";
  const readOnly = role === "observer";
  const tools    = ALL_TOOLS.filter(t => t.roles.includes(role));
  const [tool,        setTool]        = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [showViewAs,  setShowViewAs]  = useState(false);
  const [allTeachers, setAllTeachers] = useState([]);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [pickerClasses,     setPickerClasses]     = useState([]);
  const [pickerSearch,      setPickerSearch]      = useState("");

  const activeTool       = tools.find(t => t.id === tool) ? tool : "dashboard";
  const effectiveTeacher = { ...teacher, classIds: effectiveClassIds(teacher) };

  const roleBadge = ({
    super_admin:  { label: "Super Admin",  color: "#a78bfa", bg: "rgba(167,139,250,.15)" },
    school_admin: { label: "School Admin", color: T.teal,    bg: "rgba(13,148,136,.12)" },
    teacher:      { label: "Teacher",      color: T.success, bg: "rgba(16,185,129,.12)" },
    observer:     { label: "Observer",     color: T.warning, bg: "rgba(245,158,11,.12)" },
  })[role] || { label: "Teacher", color: T.success, bg: "rgba(16,185,129,.12)" };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", fontFamily:T.font, overflow:"hidden" }}>
      <TopBar title={(() => {
        const toolLabel = ALL_TOOLS.find(t => t.id === activeTool)?.label || "";
        const name = teacher?.teacherName || "Teacher";
        return toolLabel ? `${name} — ${toolLabel}` : `${name} — Grade 5 Mathematics`;
      })()} right={
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"3px 10px", borderRadius:T.full,
            color:roleBadge.color, background:roleBadge.bg, letterSpacing:"0.06em" }}>
            {roleBadge.label}
          </span>
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)",
              color:T.white, borderRadius:T.xs, padding:"5px 10px", cursor:"pointer", fontSize:"0.72rem", transition:"background .15s" }}>
            {sidebarOpen ? "◀ Hide" : "▶ Menu"}
          </button>
          <button onClick={onBack}
            style={{ background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)",
              color:T.white, borderRadius:T.xs, padding:"5px 12px", cursor:"pointer", fontSize:"0.75rem", transition:"background .15s" }}>
            ← Exit
          </button>
        </div>
      }/>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {sidebarOpen && (
          <div style={{ width:"230px", background:T.midnight, flexShrink:0, display:"flex", flexDirection:"column", overflowY:"auto" }}>
            <div style={{ padding:"0.85rem 1rem", fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.14em",
              color:"rgba(255,255,255,.35)", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
              TEACHER TOOLS
            </div>
            {tools.map(t => {
              const active = activeTool === t.id;
              return (
                <button key={t.id} onClick={() => { setTool(t.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                  style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.9rem 1rem",
                    background: active ? "rgba(13,148,136,.15)" : "transparent",
                    border:"none", borderLeft: active ? `3px solid ${T.teal}` : "3px solid transparent",
                    cursor:"pointer", textAlign:"left", width:"100%", transition:"all .15s" }}>
                  <span style={{ display:"flex", flexShrink:0, opacity: active ? 1 : 0.55 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize:"0.82rem", fontWeight:700, color: active ? T.white : "rgba(255,255,255,.7)" }}>{t.label}</div>
                    <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,.35)", marginTop:"1px" }}>{t.sub}</div>
                  </div>
                </button>
              );
            })}
            {/* View-as buttons */}
            {(onViewAsTeacher || onViewAsStudent) && (
              <div style={{marginTop:"auto",borderTop:"1px solid rgba(255,255,255,.06)",padding:"0.65rem 0.75rem",display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.12em",color:"rgba(255,255,255,.3)",marginBottom:"2px"}}>{onViewAsTeacher?"IMPERSONATE":"PREVIEW"}</div>
                {onViewAsTeacher && <button onClick={async () => {
                  try {
                    const r = await fetch(`${API}/teachers`);
                    const list = await r.json();
                    setAllTeachers(list.filter(t => t.id !== teacher?.teacherId));
                    setShowViewAs(true);
                  } catch { setAllTeachers([]); setShowViewAs(true); }
                }}
                  style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.55rem 0.65rem",
                    background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:T.xs,
                    cursor:"pointer",width:"100%",textAlign:"left",color:"rgba(255,255,255,.65)",fontSize:"0.75rem",fontWeight:600,transition:"background .15s"}}>
                  👁 View as Teacher
                </button>}
                {onViewAsStudent && <button onClick={()=>{
                  const classFilter = teacher?.classIds?.length ? `?classIds=${teacher.classIds.join(",")}` : "";
                  fetch(`${API}/roster${classFilter}`).then(r=>r.json()).then(d=>{setPickerClasses(Array.isArray(d)?d:[]);setShowStudentPicker(true);}).catch(()=>{});
                }}
                  style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.55rem 0.65rem",
                    background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:T.xs,
                    cursor:"pointer",width:"100%",textAlign:"left",color:"rgba(255,255,255,.65)",fontSize:"0.75rem",fontWeight:600,transition:"background .15s"}}>
                  🎒 View as Student
                </button>}
              </div>
            )}
          </div>
        )}

        {/* View-as teacher picker modal */}
        {showViewAs && (
          <ViewAsPicker
            teachers={allTeachers}
            onPick={(t) => {
              setShowViewAs(false);
              onViewAsTeacher({
                teacherRole: t.role || "teacher",
                teacherId:   t.id,
                teacherName: t.name,
                classIds:    t.classIds || [],
              });
            }}
            onCancel={() => setShowViewAs(false)}
          />
        )}

        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column", minWidth:0 }}>
          {(() => {
            switch (activeTool) {
              case "dashboard":   return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><Dashboard    teacher={effectiveTeacher} readOnly={readOnly}/></div>;
              case "roster":      return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><RosterManager teacher={effectiveTeacher} readOnly={readOnly} onUpdateClassIds={onUpdateClassIds}/></div>;
              case "testbuilder": return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><TestBuilder   teacher={effectiveTeacher} readOnly={readOnly}/></div>;
              case "builder":     return <div style={{flex:1,overflowY:"auto",height:"100%"}}><QuestionBuilder readOnly={readOnly}/></div>;
              case "teachers":    return <div style={{flex:1,overflowY:"auto",height:"100%"}}><TeacherManager/></div>;
              case "classes":     return <div style={{flex:1,overflowY:"auto",height:"100%"}}><ClassAdmin/></div>;
              default:            return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><Dashboard    teacher={effectiveTeacher} readOnly={readOnly}/></div>;
            }
          })()}
        </div>
      </div>

      {/* Student Picker Modal */}
      {showStudentPicker && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:T.white,borderRadius:"6px",width:"100%",maxWidth:"420px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.25)"}}>
            <div style={{background:T.midnight,color:T.white,padding:"0.9rem 1.25rem"}}>
              <div style={{fontSize:"0.6rem",opacity:.65,letterSpacing:"0.14em"}}>IMPERSONATE</div>
              <div style={{fontSize:"1rem",fontWeight:700}}>View as Student</div>
            </div>
            <div style={{padding:"1rem 1.25rem"}}>
              <input value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)}
                placeholder="Search students…" autoFocus
                style={{width:"100%",padding:"0.5rem 0.75rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.85rem",marginBottom:"0.75rem",boxSizing:"border-box"}}/>
              <div style={{maxHeight:"350px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"2px"}}>
                {pickerClasses.map(cls => {
                  const filtered = (cls.students||[]).filter(s =>
                    !pickerSearch || s.name.toLowerCase().includes(pickerSearch.toLowerCase())
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <div key={cls.id}>
                      <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,padding:"0.5rem 0.5rem 0.2rem",borderTop:`1px solid ${T.border}`}}>{cls.name}</div>
                      {filtered.map(s => (
                        <button key={s.id} onClick={()=>{
                          setShowStudentPicker(false);
                          onViewAsStudent({student: s, cls: {id: cls.id, name: cls.name}});
                        }}
                          style={{display:"block",width:"100%",textAlign:"left",padding:"0.45rem 0.65rem",border:"none",
                            background:T.white,cursor:"pointer",fontSize:"0.82rem",color:T.text,borderRadius:"3px"}}
                          onMouseOver={e=>e.currentTarget.style.background=T.surface}
                          onMouseOut={e=>e.currentTarget.style.background=T.white}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
              <button onClick={()=>setShowStudentPicker(false)}
                style={{marginTop:"0.75rem",width:"100%",background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
