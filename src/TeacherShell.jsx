import { useState, useEffect, useCallback } from "react";
import TopBar from "./shared/TopBar";
import Dashboard from "./Dashboard";
import QuestionBuilder from "./QuestionBuilder";
import PDFImporter from "./PDFImporter";
import TestBuilder from "./TestBuilder";
import RosterManager from "./RosterManager";
import TeacherManager from "./TeacherManager";
import { API } from "./shared/constants";

const NAVY  = "#003865";
const GREEN = "#1a6e2e";

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
    <div style={{ padding: "1.25rem", maxWidth: "700px", fontFamily: "sans-serif" }}>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: NAVY, marginBottom: "4px" }}>Manage Classes</div>
      <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "1.25rem" }}>
        Create classes here, then assign them to teachers in the Manage Teachers tab.
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addClass()}
          placeholder="Class name, e.g. Ms. Johnson Period 1"
          style={{ flex: 1, padding: "0.5rem 0.75rem", border: "1px solid #c8d3dd",
            borderRadius: "3px", fontSize: "0.85rem", background: "#fafbfc" }}/>
        <button onClick={addClass} disabled={adding || !newName.trim()}
          style={{ background: NAVY, color: "#fff", border: "none", borderRadius: "3px",
            padding: "0 1.25rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700,
            opacity: adding || !newName.trim() ? 0.6 : 1 }}>
          {adding ? "Adding…" : "+ Add Class"}
        </button>
      </div>

      {msg && (
        <div style={{ background: "#f0faf2", border: "1px solid #b3dfc0", borderRadius: "3px",
          padding: "0.5rem 0.85rem", fontSize: "0.78rem", color: GREEN, fontWeight: 700, marginBottom: "0.85rem" }}>
          ✓ {msg}
        </div>
      )}

      {classes.length === 0 ? (
        <div style={{ background: "#f8fafc", border: "1px dashed #c8d3dd", borderRadius: "6px",
          padding: "2rem", textAlign: "center", color: "#aaa" }}>
          No classes yet. Add your first class above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {classes.map((cls, i) => (
            <div key={cls.id} style={{ background: "#fff", border: "1px solid #dde3e9",
              borderRadius: "4px", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: NAVY,
                flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.72rem", color: "#fff", fontWeight: 700 }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "#1a1a1a", fontSize: "0.9rem" }}>{cls.name}</div>
                <div style={{ fontSize: "0.7rem", color: "#aaa" }}>
                  {cls.students?.length || 0} student{cls.students?.length !== 1 ? "s" : ""}
                </div>
              </div>
              <button onClick={() => deleteClass(cls)}
                style={{ border: "1px solid #f0b8b8", borderRadius: "3px", padding: "3px 10px",
                  cursor: "pointer", fontSize: "0.72rem", fontWeight: 600,
                  background: "#fdf2f2", color: "#8b1a1a" }}>✕ Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tool definitions ───────────────────────────────────────
const ALL_TOOLS = [
  { id:"dashboard",   icon:"📊", label:"Live Dashboard",    sub:"Scores & item analysis",    roles:["super_admin","school_admin","teacher","observer"] },
  { id:"roster",      icon:"👥", label:"Class Roster",       sub:"Manage students & periods", roles:["super_admin","school_admin","teacher"] },
  { id:"testbuilder", icon:"📚", label:"Test Builder",       sub:"Build, save & share tests", roles:["super_admin","school_admin","teacher"] },
  { id:"builder",     icon:"🔨", label:"Question Builder",   sub:"Create & edit questions",   roles:["super_admin","school_admin","teacher"] },
  { id:"importer",    icon:"📄", label:"PDF Importer",       sub:"Extract from PDFs",         roles:["super_admin","school_admin","teacher"] },
  { id:"teachers",    icon:"👩‍🏫", label:"Manage Teachers",  sub:"Teacher accounts & access", roles:["super_admin"] },
  { id:"classes",     icon:"🏫",  label:"Manage Classes",    sub:"Create & organize classes", roles:["super_admin"] },
];

function effectiveClassIds(teacher) {
  const role = teacher?.teacherRole || "teacher";
  if (role === "super_admin" || role === "school_admin") return null;
  return teacher?.classIds ?? [];
}

// ── View-as picker for super_admin ─────────────────────────
function ViewAsPicker({ teachers, onPick, onCancel }) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <div style={{background:"#fff",borderRadius:"8px",maxWidth:"400px",width:"100%",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
        <div style={{background:"#003865",color:"#fff",padding:"1rem 1.25rem",fontWeight:700,fontSize:"0.95rem"}}>
          View As Teacher
        </div>
        <div style={{padding:"1rem",maxHeight:"320px",overflowY:"auto",display:"flex",flexDirection:"column",gap:"0.35rem"}}>
          {teachers.length === 0 && <div style={{color:"#aaa",padding:"1rem",textAlign:"center"}}>No other teachers found.</div>}
          {teachers.map(t => (
            <button key={t.id} onClick={() => onPick(t)}
              style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.65rem 0.85rem",
                background:"#f8fafc",border:"1px solid #dde3e9",borderRadius:"4px",cursor:"pointer",textAlign:"left",width:"100%"}}>
              <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"#003865",color:"#fff",
                display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:"0.85rem",flexShrink:0}}>
                {t.name[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{fontWeight:700,fontSize:"0.85rem",color:"#1a1a1a"}}>{t.name}</div>
                <div style={{fontSize:"0.7rem",color:"#888"}}>{t.email || "No email"} · {(t.classIds||[]).length} class{(t.classIds||[]).length!==1?"es":""}</div>
              </div>
            </button>
          ))}
        </div>
        <div style={{padding:"0.75rem 1rem",borderTop:"1px solid #eee",textAlign:"right"}}>
          <button onClick={onCancel} style={{background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"6px 16px",cursor:"pointer",fontSize:"0.8rem",fontWeight:600}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main shell ─────────────────────────────────────────────
export default function TeacherShell({ onBack, teacher, onViewAsTeacher, onViewAsStudent }) {
  const role     = teacher?.teacherRole || "teacher";
  const readOnly = role === "observer";
  const tools    = ALL_TOOLS.filter(t => t.roles.includes(role));
  const [tool,        setTool]        = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [showViewAs,  setShowViewAs]  = useState(false);
  const [allTeachers, setAllTeachers] = useState([]);

  const activeTool       = tools.find(t => t.id === tool) ? tool : "dashboard";
  const effectiveTeacher = { ...teacher, classIds: effectiveClassIds(teacher) };

  const roleBadge = ({
    super_admin:  { label: "Super Admin",  color: "#7c3aed", bg: "#f3e8ff" },
    school_admin: { label: "School Admin", color: "#003865", bg: "#ddeaf7" },
    teacher:      { label: "Teacher",      color: "#1a6e2e", bg: "#f0faf2" },
    observer:     { label: "Observer",     color: "#7a4e00", bg: "#fff8e1" },
  })[role] || { label: "Teacher", color: "#1a6e2e", bg: "#f0faf2" };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100vh", fontFamily:"sans-serif", overflow:"hidden" }}>
      <TopBar title={(() => {
        const toolLabel = ALL_TOOLS.find(t => t.id === activeTool)?.label || "";
        const name = teacher?.teacherName || "Teacher";
        return toolLabel ? `${name} — ${toolLabel}` : `${name} — Grade 5 Mathematics`;
      })()} right={
        <div style={{ display:"flex", gap:"0.75rem", alignItems:"center" }}>
          <span style={{ fontSize:"0.65rem", fontWeight:700, padding:"3px 8px", borderRadius:"10px",
            color:roleBadge.color, background:roleBadge.bg, letterSpacing:"0.06em" }}>
            {roleBadge.label}
          </span>
          <button onClick={() => setSidebarOpen(o => !o)}
            style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)",
              color:"#fff", borderRadius:"3px", padding:"5px 10px", cursor:"pointer", fontSize:"0.72rem" }}>
            {sidebarOpen ? "◀ Hide" : "▶ Menu"}
          </button>
          <button onClick={onBack}
            style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)",
              color:"#fff", borderRadius:"3px", padding:"5px 12px", cursor:"pointer", fontSize:"0.75rem" }}>
            ← Exit
          </button>
        </div>
      }/>

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
        {sidebarOpen && (
          <div style={{ width:"220px", background:"#1a2e44", flexShrink:0, display:"flex", flexDirection:"column", overflowY:"auto" }}>
            <div style={{ padding:"0.85rem 1rem", fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.14em",
              color:"rgba(255,255,255,.4)", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
              TEACHER TOOLS
            </div>
            {tools.map(t => {
              const active = activeTool === t.id;
              return (
                <button key={t.id} onClick={() => { setTool(t.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                  style={{ display:"flex", alignItems:"center", gap:"0.75rem", padding:"0.9rem 1rem",
                    background: active ? "rgba(255,255,255,.1)" : "transparent",
                    border:"none", borderLeft: active ? "3px solid #4da6ff" : "3px solid transparent",
                    cursor:"pointer", textAlign:"left", width:"100%", transition:"all .1s" }}>
                  <span style={{ fontSize:"1.2rem" }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize:"0.82rem", fontWeight:700, color: active ? "#fff" : "rgba(255,255,255,.75)" }}>{t.label}</div>
                    <div style={{ fontSize:"0.65rem", color:"rgba(255,255,255,.4)", marginTop:"1px" }}>{t.sub}</div>
                  </div>
                </button>
              );
            })}
            {/* View-as buttons for super_admin */}
            {onViewAsTeacher && (
              <div style={{marginTop:"auto",borderTop:"1px solid rgba(255,255,255,.08)",padding:"0.65rem 0.75rem",display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                <div style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.12em",color:"rgba(255,255,255,.35)",marginBottom:"2px"}}>IMPERSONATE</div>
                <button onClick={async () => {
                  try {
                    const r = await fetch(`${API}/teachers`);
                    const list = await r.json();
                    setAllTeachers(list.filter(t => t.id !== teacher?.teacherId));
                    setShowViewAs(true);
                  } catch { setAllTeachers([]); setShowViewAs(true); }
                }}
                  style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.55rem 0.65rem",
                    background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:"3px",
                    cursor:"pointer",width:"100%",textAlign:"left",color:"rgba(255,255,255,.7)",fontSize:"0.75rem",fontWeight:600}}>
                  👁 View as Teacher
                </button>
                <button onClick={onViewAsStudent}
                  style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.55rem 0.65rem",
                    background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:"3px",
                    cursor:"pointer",width:"100%",textAlign:"left",color:"rgba(255,255,255,.7)",fontSize:"0.75rem",fontWeight:600}}>
                  🎒 View as Student
                </button>
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
              case "roster":      return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><RosterManager teacher={effectiveTeacher} readOnly={readOnly}/></div>;
              case "testbuilder": return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><TestBuilder   teacher={effectiveTeacher} readOnly={readOnly}/></div>;
              case "builder":     return <div style={{flex:1,overflowY:"auto",height:"100%"}}><QuestionBuilder readOnly={readOnly}/></div>;
              case "importer":    return <div style={{flex:1,overflowY:"auto",height:"100%"}}><PDFImporter     readOnly={readOnly}/></div>;
              case "teachers":    return <div style={{flex:1,overflowY:"auto",height:"100%"}}><TeacherManager/></div>;
              case "classes":     return <div style={{flex:1,overflowY:"auto",height:"100%"}}><ClassAdmin/></div>;
              default:            return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><Dashboard    teacher={effectiveTeacher} readOnly={readOnly}/></div>;
            }
          })()}
        </div>
      </div>
    </div>
  );
}
