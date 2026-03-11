import { useState, useEffect } from "react";
import MathTest from "./MathTest";
import TeacherShell from "./TeacherShell";
import AdminShell from "./AdminShell";
import { API } from "./shared/constants";

function PinPad({ onConfirm, loading, err }) {
  const [digits, setDigits] = useState([]);
  const MAX = 5;

  function press(d) {
    if (loading) return;
    setDigits(prev => {
      if (prev.length >= MAX) return prev;
      const next = [...prev, d];
      if (next.length === MAX) setTimeout(() => onConfirm(next.join("")), 80);
      return next;
    });
  }
  function del() { if (!loading) setDigits(d => d.slice(0, -1)); }

  useEffect(() => {
    function handle(e) {
      if (e.key >= "0" && e.key <= "9") press(Number(e.key));
      if (e.key === "Backspace") del();
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  });

  useEffect(() => { if (err) setDigits([]); }, [err]);

  const KEYS = [[1,2,3],[4,5,6],[7,8,9],[null,0,"⌫"]];

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"1.5rem"}}>
      <div style={{display:"flex",gap:"0.85rem"}}>
        {Array.from({length:MAX}).map((_,i)=>(
          <div key={i} style={{width:"18px",height:"18px",borderRadius:"50%",
            background:i<digits.length?"#003865":"#d0dae4",
            border:"2px solid "+(i<digits.length?"#003865":"#b0bec8"),
            transition:"background 0.15s"}}/>
        ))}
      </div>
      {err && <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",
        padding:"0.55rem 1.25rem",fontSize:"0.82rem",color:"#8b1a1a",fontWeight:600,textAlign:"center"}}>
        ⚠ {err}</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3, 72px)",gap:"0.6rem"}}>
        {KEYS.flat().map((k,i)=>{
          if(k===null) return <div key={i}/>;
          const isDel = k==="⌫";
          return (
            <button key={i} onClick={()=>isDel?del():press(k)}
              disabled={loading||(!isDel&&digits.length>=MAX)}
              style={{width:"72px",height:"72px",borderRadius:"50%",
                border:"2px solid "+(isDel?"#c8d3dd":"#b3cde8"),
                background:isDel?"#f0f4f8":"#fff",
                fontSize:isDel?"1.3rem":"1.5rem",fontWeight:700,
                color:isDel?"#888":"#003865",cursor:loading?"not-allowed":"pointer",
                boxShadow:"0 2px 6px rgba(0,0,0,.08)",transition:"transform 0.08s",
                opacity:loading?0.6:1}}
              onMouseDown={e=>e.currentTarget.style.transform="scale(0.93)"}
              onMouseUp={e=>e.currentTarget.style.transform="scale(1)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
              {k}
            </button>
          );
        })}
      </div>
      {loading && <div style={{fontSize:"0.8rem",color:"#888"}}>Checking PIN…</div>}
    </div>
  );
}

export default function App() {
  const [screen,         setScreen]         = useState("home");
  const [teacherIdentity,setTeacherIdentity]= useState(null);
  const [loading,        setLoading]        = useState(false);
  const [err,            setErr]            = useState("");

  function reset() { setScreen("home"); setErr(""); setTeacherIdentity(null); }

  async function handlePin(pin) {
    setLoading(true); setErr("");
    try {
      const r    = await fetch(`${API}/auth/pin/${pin}`);
      const data = await r.json();
      if (data.role === "admin") {
        setScreen("admin");
      } else if (data.role === "teacher") {
        setTeacherIdentity({
          teacherId:   data.teacherId,
          teacherName: data.teacherName,
          classIds:    data.classIds,
          isLegacy:    data.isLegacy,
        });
        setScreen("teacher");
      } else {
        setErr("PIN not recognized. Check with your teacher.");
      }
    } catch {
      setErr("Could not connect. Try again.");
    }
    setLoading(false);
  }

  if (screen === "admin")   return <AdminShell   onBack={reset}/>;
  if (screen === "teacher") return <TeacherShell teacher={teacherIdentity} onBack={reset}/>;
  if (screen === "student") return <MathTest     onBack={reset}/>;

  // ── Staff PIN screen ──
  if (screen === "pin") return (
    <div style={{minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:"sans-serif",padding:"2rem 1rem",gap:"2rem"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.18em",color:"#888",marginBottom:"6px"}}>
          GEORGIA MILESTONES READINESS TRAINER
        </div>
        <div style={{fontSize:"1.6rem",fontWeight:700,color:"#003865",fontFamily:"Georgia,serif"}}>
          Staff Sign In
        </div>
        <div style={{fontSize:"0.85rem",color:"#888",marginTop:"4px"}}>Enter your staff PIN</div>
      </div>
      <div style={{background:"#fff",borderRadius:"8px",boxShadow:"0 4px 24px rgba(0,0,0,.1)",
        padding:"2rem 2.5rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem",
        width:"100%",maxWidth:"340px"}}>
        <PinPad onConfirm={handlePin} loading={loading} err={err}/>
      </div>
      <button onClick={reset} style={{fontSize:"0.72rem",color:"#888",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
        ← Back
      </button>
    </div>
  );

  // ── Home screen ──
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
        <div style={{fontSize:"0.88rem",color:"#888"}}>Select who you are to continue</div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:"1rem",width:"100%",maxWidth:"360px"}}>
        {/* Student button */}
        <button onClick={()=>setScreen("student")}
          style={{background:"#003865",border:"none",borderRadius:"8px",padding:"1.5rem 2rem",
            cursor:"pointer",display:"flex",alignItems:"center",gap:"1.25rem",
            boxShadow:"0 4px 16px rgba(0,56,101,.2)",textAlign:"left",width:"100%"}}>
          <div style={{width:"52px",height:"52px",borderRadius:"50%",background:"rgba(255,255,255,.15)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",flexShrink:0}}>
            🧒
          </div>
          <div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:"#fff",marginBottom:"3px"}}>I'm a Student</div>
            <div style={{fontSize:"0.8rem",color:"rgba(255,255,255,.7)"}}>Enter your test code to begin</div>
          </div>
        </button>

        {/* Staff button */}
        <button onClick={()=>setScreen("pin")}
          style={{background:"#fff",border:"2px solid #c8d3dd",borderRadius:"8px",padding:"1.5rem 2rem",
            cursor:"pointer",display:"flex",alignItems:"center",gap:"1.25rem",
            boxShadow:"0 2px 8px rgba(0,0,0,.06)",textAlign:"left",width:"100%"}}>
          <div style={{width:"52px",height:"52px",borderRadius:"50%",background:"#f0f4f8",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",flexShrink:0}}>
            👩‍🏫
          </div>
          <div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:"#003865",marginBottom:"3px"}}>I'm a Teacher / Admin</div>
            <div style={{fontSize:"0.8rem",color:"#888"}}>Sign in with your staff PIN</div>
          </div>
        </button>
      </div>
    </div>
  );
}
