import { useState, useEffect, useRef } from "react";
import MathTest from "./MathTest";
import TeacherShell from "./TeacherShell";
import { API } from "./shared/constants";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

function HexInput({ onConfirm, loading, err }) {
  const [code, setCode] = useState("");

  useEffect(() => { if (err) setCode(""); }, [err]);

  function handleChange(e) {
    const v = e.target.value.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 8);
    setCode(v);
  }
  function handleKey(e) {
    if (e.key === "Enter" && code.length >= 4) onConfirm(code);
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1rem",width:"100%"}}>
      <input
        value={code}
        onChange={handleChange}
        onKeyDown={handleKey}
        autoFocus
        placeholder="e.g. A3F9B2"
        maxLength={8}
        style={{
          width:"100%", padding:"0.85rem 1rem", border:"2px solid #b3cde8",
          borderRadius:"6px", fontSize:"1.6rem", fontFamily:"monospace",
          letterSpacing:"0.3em", textAlign:"center", textTransform:"uppercase",
          fontWeight:700, color:"#003865", background:"#f8faff", boxSizing:"border-box",
          outline:"none"
        }}
      />
      <div style={{fontSize:"0.7rem",color:"#aaa",letterSpacing:"0.08em"}}>
        CHARACTERS: 0–9 and A–F · 4 to 8 characters
      </div>
      {err && <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",
        padding:"0.55rem 1.25rem",fontSize:"0.82rem",color:"#8b1a1a",fontWeight:600,textAlign:"center",width:"100%",boxSizing:"border-box"}}>
        ⚠ {err}</div>}
      <button onClick={()=>onConfirm(code)} disabled={loading||code.length<4}
        style={{width:"100%",padding:"0.75rem",background:code.length>=4?"#003865":"#c8d3dd",
          border:"none",borderRadius:"6px",fontSize:"1rem",fontWeight:700,color:"#fff",
          cursor:code.length>=4?"pointer":"not-allowed",opacity:loading?0.7:1}}>
        {loading ? "Checking…" : "Sign In →"}
      </button>
    </div>
  );
}

// ── Unified Google Sign-In — tries teacher first, falls back to student ──
function UnifiedGoogleSignIn({ onTeacher, onStudent, onAdminFallback }) {
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
      <button onClick={onAdminFallback}
        style={{fontSize:"0.68rem",color:"#bbb",background:"none",border:"none",
          cursor:"pointer",textDecoration:"underline",marginTop:"0.25rem"}}>
        Admin access
      </button>
    </div>
  );
}

export default function App() {
  function getUrlParams() {
    const p = new URLSearchParams(window.location.search);
    return { code: p.get("code"), practiceClass: p.get("practice") };
  }
  const { code: urlCode, practiceClass: urlPracticeClass } = getUrlParams();

  const [screen,           setScreen]          = useState(urlCode || urlPracticeClass ? "student" : "home");
  const [teacherIdentity,  setTeacherIdentity] = useState(null);
  const [studentCredential,setStudentCredential] = useState(null); // prefill for student flow
  const [loading,          setLoading]         = useState(false);
  const [err,              setErr]             = useState("");

  function reset() {
    window.history.replaceState({}, "", window.location.pathname);
    setScreen("home"); setErr(""); setTeacherIdentity(null); setStudentCredential(null);
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

  // Emergency hex login — routes to TeacherShell as super_admin
  async function handleAdminPin(pin) {
    setLoading(true); setErr("");
    try {
      const r    = await fetch(`${API}/auth/pin/${pin}`);
      const data = await r.json();
      if (data.role === "admin") {
        handleTeacherSuccess({ teacherRole: "super_admin", teacherId: null, teacherName: "Admin", classIds: null });
      } else if (data.role === "teacher") {
        handleTeacherSuccess(data);
      } else {
        setErr("Admin code not recognized.");
      }
    } catch { setErr("Could not connect. Try again."); }
    setLoading(false);
  }

  if (screen === "teacher") return <TeacherShell teacher={teacherIdentity} onBack={reset}/>;
  if (screen === "student") return <MathTest onBack={reset} prefillCode={urlCode||undefined}
    directPracticeClassId={urlPracticeClass||undefined} prefillCredential={studentCredential}/>;

  // ── Admin hex fallback screen ──
  if (screen === "admin-pin") return (
    <div style={{minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",padding:"2rem 1rem",gap:"2rem"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.18em",color:"#888",marginBottom:"6px"}}>
          GEORGIA MILESTONES READINESS TRAINER
        </div>
        <div style={{fontSize:"1.6rem",fontWeight:700,color:"#003865",fontFamily:"Georgia,serif"}}>
          Admin Sign In
        </div>
        <div style={{fontSize:"0.85rem",color:"#888",marginTop:"4px"}}>Enter your admin code</div>
      </div>
      <div style={{background:"#fff",borderRadius:"8px",boxShadow:"0 4px 24px rgba(0,0,0,.1)",
        padding:"2rem 2.5rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem",
        width:"100%",maxWidth:"340px"}}>
        <HexInput onConfirm={handleAdminPin} loading={loading} err={err}/>
      </div>
      <button onClick={reset} style={{fontSize:"0.72rem",color:"#888",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
        ← Back
      </button>
    </div>
  );

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
          onAdminFallback={() => setScreen("admin-pin")}
        />
      </div>
    </div>
  );
}
