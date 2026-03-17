import { useState, useEffect, useRef } from "react";
import MathTest from "./MathTest";
import TeacherShell from "./TeacherShell";
import { API } from "./shared/constants";

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
const SESSION_KEY = "mathready_session";

// Persist / restore session across refresh (sessionStorage = tab lifetime only)
function saveSession(data) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch {}
}
function loadSession() {
  try { const s = sessionStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

// ── Unified Google Sign-In — tries teacher first, falls back to student ──
function UnifiedGoogleSignIn({ onTeacher, onStudent }) {
  const btnRef   = useRef(null);
  const [err,    setErr]     = useState("");
  const [loading,setLoading] = useState(false);
  const [googleFallback, setGoogleFallback] = useState("");

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (!window.google) {
      setGoogleFallback("Google Sign-In is loading...");
      const timer = setTimeout(() => {
        if (!window.google) {
          setGoogleFallback("Google Sign-In could not load. Please check your internet connection and refresh.");
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
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
        setLoading(false);
        onTeacher(data);
        return;
      }
      // 2. Not a teacher — hand credential off to student flow
      setLoading(false);
      onStudent(response.credential);
    } catch {
      setErr("Could not connect to the server. Please try again.");
      setLoading(false);
    }
  }

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div style={{color:"#888",fontSize:"0.9rem",textAlign:"center",padding:"1rem"}}>
        Google Sign-In is not configured.
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem",width:"100%"}}>
      {loading ? (
        <div style={{color:"#888",fontSize:"0.9rem"}}>Signing in…</div>
      ) : googleFallback ? (
        <div style={{color:"#888",fontSize:"0.9rem",textAlign:"center",padding:"0.5rem"}}>
          {googleFallback}
        </div>
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

  // Restore session from sessionStorage on mount
  const restored = loadSession();
  const [screen,           setScreen]           = useState(() => {
    if (urlCode || urlPracticeClass) return "student";
    if (restored?.screen === "teacher" && restored?.teacher) return "teacher";
    return "home";
  });
  const [teacherIdentity,  setTeacherIdentity]  = useState(restored?.teacher || null);
  const [studentCredential,setStudentCredential] = useState(null);
  const [adminIdentity,    setAdminIdentity]     = useState(null); // stashed admin when impersonating

  function reset() {
    // If impersonating, return to admin view instead of signing out
    if (adminIdentity) {
      setTeacherIdentity(adminIdentity);
      setAdminIdentity(null);
      setScreen("teacher");
      setStudentCredential(null);
      return;
    }
    window.history.replaceState({}, "", window.location.pathname);
    clearSession();
    setScreen("home"); setTeacherIdentity(null); setStudentCredential(null);
  }

  function handleTeacherSuccess(data) {
    const teacher = {
      teacherRole: data.teacherRole,
      teacherId:   data.teacherId,
      teacherName: data.teacherName,
      classIds:    data.classIds,
    };
    setTeacherIdentity(teacher);
    setScreen("teacher");
    saveSession({ screen: "teacher", teacher });
  }

  // Super admin: view as a specific teacher
  function handleViewAsTeacher(impersonated) {
    setAdminIdentity(teacherIdentity); // stash the real admin
    setTeacherIdentity(impersonated);
    // Don't save impersonation to session — it's temporary
  }

  // Super admin: view as student (jump to student flow)
  function handleViewAsStudent() {
    setAdminIdentity(teacherIdentity); // stash the real admin
    setScreen("student");
    setStudentCredential(null);
  }

  if (screen === "teacher") return (
    <TeacherShell
      teacher={teacherIdentity}
      onBack={reset}
      onViewAsTeacher={teacherIdentity?.teacherRole === "super_admin" ? handleViewAsTeacher : undefined}
      onViewAsStudent={teacherIdentity?.teacherRole === "super_admin" ? handleViewAsStudent : undefined}
    />
  );
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
