import { useState } from "react";
import MathTest from "./MathTest";
import TeacherShell from "./TeacherShell";

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
          {role:"teacher", emoji:"👩‍🏫", label:"I'm a Teacher", sub:"Dashboard, builder & tools"},
        ].map(({role,emoji,label,sub})=>(
          <button key={role} onClick={()=>onRole(role)}
            style={{flex:1,background:"#fff",border:"2px solid #c8d3dd",borderRadius:"6px",padding:"1.75rem 1rem",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:"0.6rem"}}
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

export default function App() {
  const [role, setRole] = useState(null);
  if (!role)             return <RoleSelect onRole={setRole}/>;
  if (role==="student")  return <MathTest   onBack={()=>setRole(null)}/>;
  if (role==="teacher")  return <TeacherShell onBack={()=>setRole(null)}/>;
}
