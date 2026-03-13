import { useState } from "react";
import TopBar from "./shared/TopBar";
import Dashboard from "./Dashboard";
import QuestionBuilder from "./QuestionBuilder";
import PDFImporter from "./PDFImporter";
import TestBuilder from "./TestBuilder";
import RosterManager from "./RosterManager";
import { TEACHER_CODE, S } from "./shared/constants";

const ALL_TOOLS = [
  { id:"dashboard",   icon:"📊", label:"Live Dashboard",   sub:"Scores & item analysis",    roles:["super_admin","school_admin","teacher","observer"] },
  { id:"roster",      icon:"👥", label:"Class Roster",      sub:"Manage students & periods", roles:["super_admin","school_admin","teacher"] },
  { id:"testbuilder", icon:"📚", label:"Test Builder",      sub:"Build, save & share tests", roles:["super_admin","school_admin","teacher"] },
  { id:"builder",     icon:"🔨", label:"Question Builder",  sub:"Create & edit questions",   roles:["super_admin","school_admin","teacher"] },
  { id:"importer",    icon:"📄", label:"PDF Importer",      sub:"Extract from PDFs",         roles:["super_admin","school_admin","teacher"] },
];

// What each role can see in terms of classes
// super_admin / school_admin → all classes (classIds=null means all)
// teacher / observer → own classIds only
function effectiveClassIds(teacher) {
  const role = teacher?.teacherRole || "teacher";
  if (role === "super_admin" || role === "school_admin") return null; // all
  return teacher?.classIds ?? [];
}

function TeacherApp({ onBack, teacher }) {
  const role      = teacher?.teacherRole || "teacher";
  const readOnly  = role === "observer";
  const tools     = ALL_TOOLS.filter(t => t.roles.includes(role));
  const [tool, setTool]             = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

  // If current tool got filtered out, reset to dashboard
  const activeTool = tools.find(t => t.id === tool) ? tool : "dashboard";

  const effectiveTeacher = { ...teacher, classIds: effectiveClassIds(teacher) };

  const roleBadge = {
    super_admin:  { label:"Super Admin",   color:"#7c3aed", bg:"#f3e8ff" },
    school_admin: { label:"School Admin",  color:"#003865", bg:"#ddeaf7" },
    teacher:      { label:"Teacher",       color:"#1a6e2e", bg:"#f0faf2" },
    observer:     { label:"Observer",      color:"#7a4e00", bg:"#fff8e1" },
  }[role] || { label:"Teacher", color:"#1a6e2e", bg:"#f0faf2" };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:"sans-serif",overflow:"hidden"}}>
      <TopBar title={(() => {
        const toolLabel = ALL_TOOLS.find(t => t.id === activeTool)?.label || "";
        const name = teacher?.teacherName || "Teacher";
        return toolLabel ? `${name} — ${toolLabel}` : `${name} — Grade 5 Mathematics`;
      })()} right={
        <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
          <span style={{fontSize:"0.65rem",fontWeight:700,padding:"3px 8px",borderRadius:"10px",
            color:roleBadge.color,background:roleBadge.bg,letterSpacing:"0.06em"}}>
            {roleBadge.label}
          </span>
          <button onClick={()=>setSidebarOpen(o=>!o)} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"5px 10px",cursor:"pointer",fontSize:"0.72rem"}}>
            {sidebarOpen ? "◀ Hide" : "▶ Menu"}
          </button>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:"3px",padding:"5px 12px",cursor:"pointer",fontSize:"0.75rem"}}>
            ← Exit
          </button>
        </div>
      }/>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {sidebarOpen && (
          <div style={{width:"220px",background:"#1a2e44",flexShrink:0,display:"flex",flexDirection:"column",overflowY:"auto"}}>
            <div style={{padding:"0.85rem 1rem",fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",color:"rgba(255,255,255,.4)",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
              TEACHER TOOLS
            </div>
            {tools.map(t => {
              const active = activeTool === t.id;
              return (
                <button key={t.id} onClick={()=>{ setTool(t.id); if(window.innerWidth<768) setSidebarOpen(false); }}
                  style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.9rem 1rem",
                    background:active?"rgba(255,255,255,.1)":"transparent",
                    border:"none", borderLeft:active?"3px solid #4da6ff":"3px solid transparent",
                    cursor:"pointer",textAlign:"left",width:"100%",transition:"all .1s"}}>
                  <span style={{fontSize:"1.2rem"}}>{t.icon}</span>
                  <div>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:active?"#fff":"rgba(255,255,255,.75)"}}>{t.label}</div>
                    <div style={{fontSize:"0.65rem",color:"rgba(255,255,255,.4)",marginTop:"1px"}}>{t.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",minWidth:0}}>
          {(() => {
            switch(activeTool) {
              case "dashboard":   return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><Dashboard    teacher={effectiveTeacher} readOnly={readOnly}/></div>;
              case "roster":      return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><RosterManager teacher={effectiveTeacher} readOnly={readOnly}/></div>;
              case "testbuilder": return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><TestBuilder   teacher={effectiveTeacher} readOnly={readOnly}/></div>;
              case "builder":     return <div style={{flex:1,overflowY:"auto",height:"100%"}}><QuestionBuilder readOnly={readOnly}/></div>;
              case "importer":    return <div style={{flex:1,overflowY:"auto",height:"100%"}}><PDFImporter     readOnly={readOnly}/></div>;
              default:            return <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",height:"100%"}}><Dashboard    teacher={effectiveTeacher} readOnly={readOnly}/></div>;
            }
          })()}
        </div>
      </div>
    </div>
  );
}

export default function TeacherShell({ onBack, pinAuth, teacher }) {
  const [loggedIn, setLoggedIn] = useState(!!(pinAuth || teacher));
  if (!loggedIn) return <TeacherLogin onEnter={()=>setLoggedIn(true)} onBack={onBack}/>;
  return <TeacherApp teacher={teacher} onBack={()=>{ setLoggedIn(false); onBack(); }}/>;
}

function TeacherLogin({ onEnter, onBack }) {
  const [code, setCode] = useState("");
  const [err,  setErr]  = useState("");

  function submit() {
    if (code.trim().toUpperCase() !== TEACHER_CODE) { setErr("Invalid code."); return; }
    onEnter();
  }

  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>
      <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",width:"100%",maxWidth:"380px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,.09)"}}>
        <div style={{background:"#003865",color:"#fff",padding:"1.1rem 2rem"}}>
          <div style={{fontSize:"0.58rem",letterSpacing:"0.18em",opacity:.65,marginBottom:"3px"}}>GEORGIA MILESTONES READINESS TRAINER</div>
          <div style={{fontSize:"1.1rem",fontWeight:700,fontFamily:"Georgia,serif"}}>Teacher Access</div>
        </div>
        <div style={{padding:"2rem"}}>
          <label style={S.lbl}>TEACHER ACCESS CODE</label>
          <input style={{...S.inp,fontFamily:"monospace",fontSize:"1rem",letterSpacing:"0.15em",textTransform:"uppercase"}}
            value={code} onChange={e=>{setCode(e.target.value);setErr("");}}
            onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Enter code" autoFocus/>
          {err && <div style={{...S.errBox,marginTop:"0.75rem"}}>⚠ {err}</div>}
          <button onClick={submit} style={{...S.btnPri,width:"100%",marginTop:"1.25rem"}}>Enter →</button>
          <button onClick={onBack}  style={{...S.btnSec,width:"100%",marginTop:"0.5rem"}}>← Back</button>
        </div>
      </div>
    </div>
  );
}
