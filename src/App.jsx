import { useState, useEffect, useRef } from "react";
import MathTest from "./MathTest";
import TeacherShell from "./TeacherShell";
import PrivacyPolicy from "./PrivacyPolicy";
import { API, T, setToken, clearToken } from "./shared/constants";

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

    function init() {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback:  handleCredential,
        ux_mode:   "popup",
        auto_select: false,
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 300,
      });
      setGoogleFallback("");
    }

    if (window.google) { init(); return; }

    // Poll every 100ms until the GSI script loads (avoids needing a page refresh)
    let poll, giveUp;
    poll   = setInterval(() => { if (window.google) { clearInterval(poll); clearTimeout(giveUp); init(); } }, 100);
    giveUp = setTimeout(() => {
      clearInterval(poll);
      if (!window.google) setGoogleFallback("Google Sign-In could not load. Please check your connection and refresh.");
    }, 10000);
    return () => { clearInterval(poll); clearTimeout(giveUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div style={{background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,
          padding:"0.55rem 1.25rem",fontSize:"0.82rem",color:T.dangerText,fontWeight:600,
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
  const [impersonateStudent, setImpersonateStudent] = useState(null);

  // Serve privacy policy at /privacy without needing React Router (after hooks)
  if (window.location.pathname === "/privacy") return <PrivacyPolicy />;

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
    clearToken();
    setScreen("home"); setTeacherIdentity(null); setStudentCredential(null); setImpersonateStudent(null);
  }

  function handleTeacherSuccess(data) {
    if (data.sessionToken) setToken(data.sessionToken);
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

  // Update teacher's classIds in state + sessionStorage (called when teacher creates/deletes a class)
  function handleTeacherClassIdsUpdate(newClassIds) {
    const updated = { ...teacherIdentity, classIds: newClassIds };
    setTeacherIdentity(updated);
    saveSession({ screen: "teacher", teacher: updated });
  }

  // Super admin: view as a specific teacher
  function handleViewAsTeacher(impersonated) {
    setAdminIdentity(teacherIdentity); // stash the real admin
    setTeacherIdentity(impersonated);
    // Don't save impersonation to session — it's temporary
  }

  // Super admin: view as student (pick from roster then jump to student flow)
  function handleViewAsStudent(studentData) {
    setAdminIdentity(teacherIdentity); // stash the real admin
    if (studentData) {
      setImpersonateStudent(studentData); // {student, cls}
    }
    setScreen("student");
    setStudentCredential(null);
  }

  if (screen === "teacher") return (
    <TeacherShell
      teacher={teacherIdentity}
      onBack={reset}
      onUpdateClassIds={handleTeacherClassIdsUpdate}
      onViewAsTeacher={teacherIdentity?.teacherRole === "super_admin" ? handleViewAsTeacher : undefined}
      onViewAsStudent={handleViewAsStudent}
    />
  );
  if (screen === "student") return <MathTest onBack={reset} prefillCode={urlCode||undefined}
    directPracticeClassId={urlPracticeClass||undefined} prefillCredential={studentCredential}
    impersonateStudent={impersonateStudent}/>;

  // ── Home — single unified sign-in ──
  return (
    <div style={{minHeight:"100vh",background:T.midnight,display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:T.font,padding:"2rem 1rem",gap:"2.5rem"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.2em",color:T.teal,marginBottom:"10px"}}>
          GEORGIA MILESTONES READINESS TRAINER
        </div>
        <div style={{fontSize:"2rem",fontWeight:800,color:T.white,marginBottom:"8px",lineHeight:1.2}}>
          Grade 5 Mathematics
        </div>
        <div style={{fontSize:"0.88rem",color:T.textMuted}}>Sign in with your school Google account</div>
      </div>

      <div style={{background:T.white,borderRadius:T.rl,boxShadow:T.lg,
        padding:"2.25rem 2.5rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem",
        width:"100%",maxWidth:"360px"}}>
        <UnifiedGoogleSignIn
          onTeacher={handleTeacherSuccess}
          onStudent={(credential) => { setStudentCredential(credential); setScreen("student"); }}
        />
      </div>

      <div style={{fontSize:"0.75rem",color:"#4a5568",textAlign:"center"}}>
        By signing in, you agree to our{" "}
        <a href="/privacy" style={{color:T.teal,textDecoration:"underline"}}>Privacy Policy</a>.
        <br/>Student data is protected under COPPA and FERPA.
      </div>
    </div>
  );
}
