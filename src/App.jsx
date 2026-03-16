import { useState, useEffect, useRef } from "react";
import MathTest from "./MathTest";
import TeacherShell from "./TeacherShell";
import { API } from "./shared/constants";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

// ── Unified Google Sign-In — tries teacher first, falls back to student ──
function UnifiedGoogleSignIn({ onTeacher, onStudent }) {
  const btnRef   = useRef(null);
  const [err,    setErr]     = useState("");
  const [loading,setLoading] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback:  handleCredential,
      ux_mode:   "popup",
      auto_select: false,
    });
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 300,
    });
  // eslint-disable-line
  }, [GOOGLE_CLIENT_ID]);

  async function handleCredential(response) {
    setLoading(true); setErr("");
    try {
      // 1. Try teacher auth
      const r = await fetch(`${API}/auth/google/teacher`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ token: response.credential }),
      });
      if (r.ok) {
        const data = await r.json();
        onTeacher(data);
        return;
      }
      // 2. Not a teacher — hand credential off to student flow
      onStudent(response.credential);
    } catch { setErr("Could not connect. Try again."); }
    setLoading(false);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem",width:"100%"}}>
      {loading ? (
        <div style={{color:"#888",fontSize:"0.9rem"}}>Signing in…</div>
      ) : (
        <div ref={btnRef}/>
      )}
      {err && (
        <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",
          padding:"0.55rem 1.25rem",fontSize:"0.82rem",color:"#8b1a1a",fontWeight:600,
          textAlign:"center",width:"100%",boxSizing:"border-box"}}>⚠ {err}</div>
      )}
    </div>
  );
}

export default function App() {
  function getUrlParams() {
    const p = new URLSearchParams(window.location.search);
    return { code: p.get("code"), practiceClass: p.get("practice") };
  }
  const { code: urlCode, practiceClass: urlPracticeClass } = getUrlParams();

  const [screen,           setScreen]           = useState(urlCode || urlPracticeClass ? "student" : "home");
  const [teacherIdentity,  setTeacherIdentity]  = useState(null);
  const [studentCredential,setStudentCredential] = useState(null);

  function reset() {
    window.history.replaceState({}, "", window.location.pathname);
    setScreen("home"); setTeacherIdentity(null); setStudentCredential(null);
  }

  function handleTeacherSuccess(data) {
    setTeacherIdentity({
      teacherRole: data.teacherRole,
      teacherId:   data.teacherId,
      teacherName: data.teacherName,
      classIds:    data.classIds,
    });
    setScreen("teacher");
  }

  if (screen === "teacher") return <TeacherShell teacher={teacherIdentity} onBack={reset}/>;
  if (screen === "student") return <MathTest onBack={reset} prefillCode={urlCode||undefined}
    directPracticeClassId={urlPracticeClass||undefined} prefillCredential={studentCredential}/>;

  // ── Home — single unified sign-in ──
  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",padding:"2rem 1rem",gap:"2rem"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.18em",color:"#888",marginBottom:"8px"}}>
          GEORGIA MILESTONES READINESS TRAINER
        </div>
        <div style={{fontSize:"1.8rem",fontWeight:700,color:"#003865",fontFamily:"Georgia,serif",marginBottom:"6px"}}>
          Grade 5 Mathematics
        </div>
        <div style={{fontSize:"0.85rem",color:"#888"}}>Sign in with your school Google account</div>
      </div>

      <div style={{background:"#fff",borderRadius:"8px",boxShadow:"0 4px 24px rgba(0,0,0,.1)",
        padding:"2rem 2.5rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem",
        width:"100%",maxWidth:"340px"}}>
        <UnifiedGoogleSignIn
          onTeacher={handleTeacherSuccess}
          onStudent={(credential) => { setStudentCredential(credential); setScreen("student"); }}
        />
      </div>
    </div>
  );
}
