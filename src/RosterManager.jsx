import { useState, useEffect, useCallback, useRef } from "react";
import { API } from "./shared/constants";

const S = {
  inp:   { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.85rem", background:"#fafbfc", boxSizing:"border-box" },
  lbl:   { display:"block", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.12em", color:"#555", marginBottom:"4px" },
  btn:   { border:"1px solid #c8d3dd", borderRadius:"3px", padding:"6px 14px", cursor:"pointer", fontSize:"0.78rem", fontWeight:600, background:"#f0f4f8", color:"#333" },
  ta:    { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.82rem", background:"#fafbfc", boxSizing:"border-box", resize:"vertical", fontFamily:"sans-serif", minHeight:"120px" },
};

// ── Inline PIN editor ──────────────────────────────────────
function PinEditor({ pin, onSave, onRegen }) {
  const [editing, setEditing] = useState(false);
  const [val,     setVal]     = useState(pin || "");
  const [err,     setErr]     = useState("");
  const inputRef = useRef();

  function startEdit() { setVal(pin || ""); setErr(""); setEditing(true); setTimeout(()=>inputRef.current?.focus(),50); }
  function cancel()    { setEditing(false); setErr(""); }

  async function save() {
    const clean = val.trim();
    if (clean.length !== 5 || !/^[0-9]{5}$/.test(clean)) { setErr("Must be exactly 5 digits"); return; }
    const ok = await onSave(clean);
    if (ok === true) { setEditing(false); setErr(""); }
    else             { setErr(ok || "Already in use"); }
  }

  if (editing) return (
    <div style={{display:"flex",alignItems:"center",gap:"0.35rem"}}>
      <input ref={inputRef} value={val}
        onChange={e=>{ setVal(e.target.value.replace(/\D/g,"").slice(0,5)); setErr(""); }}
        onKeyDown={e=>{ if(e.key==="Enter") save(); if(e.key==="Escape") cancel(); }}
        style={{width:"80px",padding:"4px 8px",border:`1px solid ${err?"#f0b8b8":"#003865"}`,borderRadius:"3px",fontFamily:"monospace",fontSize:"0.95rem",fontWeight:700,letterSpacing:"0.18em",textAlign:"center",background:"#fff"}}
        placeholder="12345" maxLength={5}/>
      <button onClick={save}   style={{...S.btn,padding:"2px 8px",background:"#1a6e2e",color:"#fff",border:"none",fontSize:"0.72rem"}}>✓</button>
      <button onClick={cancel} style={{...S.btn,padding:"2px 8px",fontSize:"0.72rem"}}>✕</button>
      {err && <span style={{fontSize:"0.68rem",color:"#8b1a1a"}}>{err}</span>}
    </div>
  );

  return (
    <div style={{display:"flex",alignItems:"center",gap:"0.4rem",background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3px 8px"}}>
      <span style={{fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.08em",color:"#555"}}>PIN</span>
      <span style={{fontFamily:"monospace",fontSize:"0.95rem",fontWeight:700,letterSpacing:"0.18em",color:pin?"#003865":"#bbb",minWidth:"52px"}}>
        {pin || "—"}
      </span>
      <button onClick={startEdit} title="Set a specific PIN"
        style={{...S.btn,padding:"1px 6px",fontSize:"0.65rem"}}>✏️</button>
      <button onClick={()=>navigator.clipboard.writeText(pin||"")} title="Copy PIN" disabled={!pin}
        style={{...S.btn,padding:"1px 6px",fontSize:"0.65rem",opacity:pin?1:0.4}}>📋</button>
      <button onClick={onRegen} title="Generate random PIN"
        style={{...S.btn,padding:"1px 6px",fontSize:"0.65rem"}}>🔀</button>
    </div>
  );
}

// ── Print PIN cards ────────────────────────────────────────
function printPinSheet(cls) {
  const rows = cls.students.map(s => `
    <div class="card">
      <div class="class-name">${cls.name}</div>
      <div class="student-name">${s.name}</div>
      <div class="pin-label">PIN</div>
      <div class="pin">${s.pin || "—"}</div>
      <div class="hint">mathready-frontend.vercel.app</div>
    </div>
  `).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>PINs — ${cls.name}</title>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 0; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
    .card { border: 1px solid #ccc; padding: 1rem 1.25rem; page-break-inside: avoid; box-sizing: border-box; }
    .class-name { font-size: 0.55rem; letter-spacing: 0.1em; color: #888; text-transform: uppercase; margin-bottom: 2px; }
    .student-name { font-size: 1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 0.5rem; }
    .pin-label { font-size: 0.55rem; letter-spacing: 0.12em; color: #888; text-transform: uppercase; }
    .pin { font-size: 1.8rem; font-weight: 700; font-family: monospace; letter-spacing: 0.25em; color: #003865; margin: 2px 0; }
    .hint { font-size: 0.55rem; color: #aaa; margin-top: 4px; }
    @media print { @page { margin: 0.5in; } }
  </style>
  </head><body>
  <div style="padding:0.5rem 0.75rem 0.25rem;border-bottom:2px solid #003865;margin-bottom:0.5rem;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="font-size:0.6rem;color:#888;letter-spacing:0.1em;text-transform:uppercase;">Georgia Milestones Readiness Trainer</div>
      <div style="font-size:1rem;font-weight:700;color:#003865;">${cls.name} — Student PINs</div>
    </div>
    <div style="font-size:0.7rem;color:#888;">${new Date().toLocaleDateString()}</div>
  </div>
  <div class="grid">${rows}</div>
  </body></html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ── Main ───────────────────────────────────────────────────
// ── Accommodations Modal ──────────────────────────────────
function AccomModal({ student, onSave, onClose }) {
  const [extTime,  setExtTime]  = useState(student.extendedTime  || "none");
  const [reduce,   setReduce]   = useState(!!student.reduceChoices);
  const [saving,   setSaving]   = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(extTime, reduce);
    setSaving(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>
      <div style={{background:"#fff",borderRadius:"6px",width:"100%",maxWidth:"380px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.22)"}}>
        <div style={{background:"#003865",color:"#fff",padding:"0.9rem 1.25rem"}}>
          <div style={{fontSize:"0.62rem",letterSpacing:"0.12em",opacity:.7,marginBottom:"2px"}}>ACCOMMODATIONS</div>
          <div style={{fontSize:"1rem",fontWeight:700}}>{student.name}</div>
        </div>
        <div style={{padding:"1.25rem",display:"flex",flexDirection:"column",gap:"1rem"}}>

          {/* Extended Time */}
          <div>
            <label style={{display:"block",fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"8px"}}>⏱ EXTENDED TIME (IEP / 504)</label>
            <div style={{display:"flex",gap:"0.5rem"}}>
              {[["none","Standard"],["1.5x","1.5×"],["2x","2×"]].map(([val,lbl])=>(
                <button key={val} onClick={()=>setExtTime(val)}
                  style={{flex:1,padding:"0.55rem",border:`2px solid ${extTime===val?"#003865":"#c8d3dd"}`,borderRadius:"4px",background:extTime===val?"#003865":"#fafbfc",color:extTime===val?"#fff":"#555",fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>
                  {lbl}
                </button>
              ))}
            </div>
            {extTime !== "none" && (
              <div style={{marginTop:"6px",fontSize:"0.72rem",color:"#555",background:"#f0f4f8",padding:"6px 10px",borderRadius:"3px"}}>
                A 30-min test becomes {extTime==="1.5x"?"45":"60"} minutes for this student.
              </div>
            )}
          </div>

          {/* Reduce Answer Choices */}
          <div>
            <label style={{display:"block",fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"8px"}}>✂ REDUCE ANSWER CHOICES</label>
            <div style={{display:"flex",gap:"0.5rem"}}>
              {[[false,"Standard (4 choices)"],[true,"Reduced (3 choices)"]].map(([val,lbl])=>(
                <button key={String(val)} onClick={()=>setReduce(val)}
                  style={{flex:1,padding:"0.55rem",border:`2px solid ${reduce===val?"#003865":"#c8d3dd"}`,borderRadius:"4px",background:reduce===val?"#003865":"#fafbfc",color:reduce===val?"#fff":"#555",fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
                  {lbl}
                </button>
              ))}
            </div>
            {reduce && (
              <div style={{marginTop:"6px",fontSize:"0.72rem",color:"#555",background:"#f0f4f8",padding:"6px 10px",borderRadius:"3px"}}>
                One incorrect choice is hidden on all multiple-choice questions.
              </div>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.25rem",borderTop:"1px solid #dde3e9"}}>
          <button onClick={onClose} style={{flex:1,background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:"#333"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{flex:1,background:"#1a6e2e",border:"none",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",color:"#fff",fontWeight:700,opacity:saving?.6:1}}>
            {saving?"Saving…":"Save Accommodations"}
          </button>
        </div>
      </div>
    </div>
  );
}


function ClassroomImportModal({ onClose, onImport }) {
  const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
  const [step,      setStep]      = useState("idle"); // idle | loading | pick | importing | done
  const [courses,   setCourses]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [students,  setStudents]  = useState([]);
  const [err,       setErr]       = useState("");
  const [importing, setImporting] = useState(false);
  const tokenRef = useRef(null);

  function startAuth() {
    if (!window.google) { setErr("Google API not loaded. Refresh and try again."); return; }
    setErr(""); setStep("loading");
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.rosters.readonly",
      callback: async (resp) => {
        if (resp.error) { setErr("Sign-in cancelled or failed."); setStep("idle"); return; }
        tokenRef.current = resp.access_token;
        await fetchCourses(resp.access_token);
      },
    });
    client.requestAccessToken();
  }

  async function fetchCourses(token) {
    try {
      const r = await fetch(
        "https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE&pageSize=50",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await r.json();
      if (!r.ok) { setErr(d.error?.message || "Failed to load courses."); setStep("idle"); return; }
      const list = d.courses || [];
      if (!list.length) { setErr("No active Google Classroom courses found."); setStep("idle"); return; }
      setCourses(list);
      setStep("pick");
    } catch { setErr("Could not reach Google Classroom API."); setStep("idle"); }
  }

  async function fetchStudents(course) {
    setSelected(course); setStep("loading");
    try {
      const r = await fetch(
        `https://classroom.googleapis.com/v1/courses/${course.id}/students?pageSize=200`,
        { headers: { Authorization: `Bearer ${tokenRef.current}` } }
      );
      const d = await r.json();
      if (!r.ok) { setErr(d.error?.message || "Failed to load students."); setStep("pick"); return; }
      const list = (d.students || []).map(s => ({
        name:  `${s.profile.name.givenName} ${s.profile.name.familyName}`,
        email: s.profile.emailAddress || "",
      }));
      setStudents(list);
      setStep("confirm");
    } catch { setErr("Could not load students."); setStep("pick"); }
  }

  async function doImport() {
    setImporting(true);
    await onImport(selected.name, students);
    setImporting(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",
      justifyContent:"center",zIndex:1000,fontFamily:"sans-serif"}}>
      <div style={{background:"#fff",borderRadius:"8px",boxShadow:"0 8px 40px rgba(0,0,0,.2)",
        width:"100%",maxWidth:"440px",display:"flex",flexDirection:"column",maxHeight:"80vh",overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:"#003865",color:"#fff",padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <img src="https://www.gstatic.com/images/branding/product/1x/classroom_2020q4_48dp.png"
            alt="" style={{width:"22px",height:"22px"}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:"0.58rem",opacity:.65,letterSpacing:"0.14em"}}>GOOGLE CLASSROOM</div>
            <div style={{fontSize:"0.95rem",fontWeight:700}}>Import Class Roster</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",fontSize:"1.2rem",cursor:"pointer",opacity:.7}}>✕</button>
        </div>

        <div style={{padding:"1.5rem",flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:"1rem"}}>
          {err && (
            <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",
              padding:"0.6rem 1rem",fontSize:"0.82rem",color:"#8b1a1a",fontWeight:600}}>⚠ {err}</div>
          )}

          {step === "idle" && (
            <>
              <div style={{fontSize:"0.85rem",color:"#555",lineHeight:1.6}}>
                Sign in with your school Google account to pull your class rosters directly from Google Classroom. Student names and emails will be imported automatically.
              </div>
              <button onClick={startAuth}
                style={{background:"#fff",border:"2px solid #c8d3dd",borderRadius:"6px",padding:"0.75rem 1rem",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",cursor:"pointer",fontWeight:700,color:"#003865"}}>
                <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
                  alt="" style={{width:"20px",height:"20px"}}/>
                Sign in with Google
              </button>
            </>
          )}

          {step === "loading" && (
            <div style={{textAlign:"center",color:"#888",padding:"2rem"}}>Loading…</div>
          )}

          {step === "pick" && (
            <>
              <div style={{fontSize:"0.78rem",fontWeight:700,color:"#555",letterSpacing:"0.08em"}}>
                SELECT A CLASS TO IMPORT
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                {courses.map(c => (
                  <button key={c.id} onClick={()=>fetchStudents(c)}
                    style={{textAlign:"left",padding:"0.75rem 1rem",border:"2px solid #dde3e9",borderRadius:"6px",
                      background:"#f8fafc",cursor:"pointer",fontWeight:600,color:"#1a1a1a",fontSize:"0.88rem"}}>
                    {c.name}
                    {c.section && <span style={{fontWeight:400,color:"#888",marginLeft:"6px"}}>· {c.section}</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "confirm" && selected && (
            <>
              <div style={{fontSize:"0.78rem",fontWeight:700,color:"#555",letterSpacing:"0.08em"}}>
                PREVIEW — {selected.name}
              </div>
              <div style={{border:"1px solid #dde3e9",borderRadius:"4px",overflow:"hidden",maxHeight:"260px",overflowY:"auto"}}>
                {students.map((s,i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.45rem 0.75rem",
                    borderBottom:i<students.length-1?"1px solid #eef1f4":"none",background:i%2===0?"#fff":"#f8fafc"}}>
                    <div style={{width:"24px",height:"24px",borderRadius:"50%",background:"#003865",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{color:"#fff",fontSize:"0.6rem",fontWeight:700}}>{i+1}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.85rem",fontWeight:600}}>{s.name}</div>
                      <div style={{fontSize:"0.7rem",color:"#888"}}>{s.email}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={doImport} disabled={importing}
                style={{background:"#1a6e2e",border:"none",borderRadius:"6px",padding:"0.75rem",
                  fontSize:"0.95rem",fontWeight:700,color:"#fff",cursor:"pointer",opacity:importing?0.7:1}}>
                {importing ? "Importing…" : `✓ Import ${students.length} Students`}
              </button>
              <button onClick={()=>setStep("pick")}
                style={{...{border:"1px solid #c8d3dd",borderRadius:"4px",padding:"0.5rem",background:"#fff",cursor:"pointer",fontSize:"0.82rem",color:"#555"}}}>
                ← Pick a different class
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailModal({ student, onSave, onClose }) {
  const [email, setEmail] = useState(student.email || "");
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    setSaving(true);
    await onSave(email);
    setSaving(false);
  }
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:"#fff",borderRadius:"8px",boxShadow:"0 8px 40px rgba(0,0,0,.18)",padding:"1.75rem 2rem",width:"100%",maxWidth:"360px",display:"flex",flexDirection:"column",gap:"1.25rem"}}>
        <div style={{fontSize:"1rem",fontWeight:700,color:"#003865"}}>✉ Google Email — {student.name}</div>
        <div style={{fontSize:"0.78rem",color:"#666",lineHeight:1.5}}>
          Enter the student's school Google account email. This is used to verify their identity when they click a practice or test link.
        </div>
        <input
          autoFocus
          value={email}
          onChange={e=>setEmail(e.target.value)}
          onKeyDown={e=>{ if(e.key==="Enter") handleSave(); if(e.key==="Escape") onClose(); }}
          placeholder="student@school.edu"
          style={{padding:"0.7rem 0.9rem",border:"2px solid #b3cde8",borderRadius:"6px",fontSize:"0.95rem",outline:"none",width:"100%",boxSizing:"border-box"}}
        />
        <div style={{display:"flex",gap:"0.5rem",justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"0.55rem 1.25rem",border:"1px solid #c8d3dd",borderRadius:"4px",background:"#fff",cursor:"pointer",fontSize:"0.85rem"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{padding:"0.55rem 1.25rem",border:"none",borderRadius:"4px",background:"#003865",color:"#fff",cursor:"pointer",fontSize:"0.85rem",fontWeight:700,opacity:saving?0.7:1}}>
            {saving?"Saving…":"Save Email"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RosterManager({ teacher }) {
  const [classes,    setClasses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeClass,setActiveClass]= useState(null);
  const [newClassName,setNewClassName]=useState("");
  const [addMode,    setAddMode]    = useState("one");
  const [oneInput,   setOneInput]   = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [adding,     setAdding]     = useState(false);
  const [msg,        setMsg]        = useState("");
  const [accomModal, setAccomModal] = useState(null);
  const [emailModal, setEmailModal] = useState(null); // {cid, student}
  const [gcImportOpen, setGcImportOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const url = `${API}/roster${teacher && teacher.classIds !== null ? '?classIds='+teacher.classIds.join(',') : ''}`;
      const r = await fetch(url);
      setClasses(await r.json());
    }
    catch { setClasses([]); }
    setLoading(false);
  }, [teacher]);

  useEffect(() => { load(); }, [load]);

  function flash(text) { setMsg(text); setTimeout(() => setMsg(""), 3500); }

  async function generateMissingPins() {
    try {
      const r    = await fetch(`${API}/roster/pins/generate-missing`, { method:"POST" });
      const data = await r.json();
      await load();
      flash(`Generated ${data.generated} new PIN${data.generated!==1?"s":""}.`);
    } catch { flash("Failed to generate PINs."); }
  }

  async function addClass() {
    if (!newClassName.trim()) return;
    try {
      await fetch(`${API}/roster/class`, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: newClassName.trim(), teacherId: teacher?.teacherId || null }) });
      setNewClassName(""); await load(); flash("Class added!");
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
    const names = addMode==="one"
      ? [oneInput.trim()].filter(Boolean)
      : pasteInput.split("\n").map(n=>n.trim()).filter(Boolean);
    if (!names.length) return;
    setAdding(true);
    try {
      const r    = await fetch(`${API}/roster/class/${activeClass}/students`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ students: names })
      });
      const data = await r.json();
      setOneInput(""); setPasteInput(""); await load();
      flash(`Added ${data.added} student${data.added!==1?"s":""}!`);
    } catch {}
    setAdding(false);
  }

  // ── CSV upload ──────────────────────────────────────────
  const csvRef = useRef();
  const [csvPreview, setCsvPreview] = useState(null);  // [{name, pin}]
  const [csvErr,     setCsvErr]     = useState("");
  const [csvImporting, setCsvImporting] = useState(false);

  function parseCSV(text) {
    const lines = text.trim().replace(/\r/g, "").split("\n").filter(l => l.trim());
    if (!lines.length) return { err:"Empty file", rows:[] };
    // Detect header row
    const first = lines[0].toLowerCase();
    const hasHeader = first.includes("name") || first.includes("pin") || first.includes("student");
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const rows = [];
    const errs = [];
    dataLines.forEach((line, i) => {
      // Support comma or tab separated
      const parts = line.includes("	") ? line.split("	") : line.split(",");
      const name = parts[0]?.trim().replace(/^"|"$/g,"");
      const pin  = parts[1]?.trim().replace(/^"|"$/g,"");
      if (!name) { errs.push(`Row ${i+2}: missing name`); return; }
      if (pin && (pin.length !== 5 || !/^[0-9]{5}$/.test(pin))) {
        errs.push(`Row ${i+2}: PIN must be 5 digits (got "${pin}")`);
        return;
      }
      rows.push({ name, pin: pin || null });
    });
    return { rows, errs };
  }

  function handleCSVFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const { rows, errs } = parseCSV(ev.target.result);
      if (errs.length) { setCsvErr(errs.join(" · ")); setCsvPreview(null); return; }
      if (!rows.length) { setCsvErr("No valid rows found."); setCsvPreview(null); return; }
      setCsvErr(""); setCsvPreview(rows);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function importCSV() {
    if (!csvPreview?.length || !activeClass) return;
    setCsvImporting(true);
    // Add students first (names only)
    const names = csvPreview.map(r => r.name);
    try {
      const r = await fetch(`${API}/roster/class/${activeClass}/students`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ students: names })
      });
      const data = await r.json();
      await load();
      // Now set specific PINs for rows that have them
      const withPin = csvPreview.filter(r => r.pin);
      for (const row of withPin) {
        // Find the student we just added
        const cls = classes.find(c => c.id === activeClass) || (await fetch(`${API}/roster`).then(r=>r.json()).then(d=>d.find(c=>c.id===activeClass)));
        const found = cls?.students.find(s => s.name.toLowerCase() === row.name.toLowerCase());
        if (found) {
          await fetch(`${API}/roster/class/${activeClass}/student/${found.id}/pin/set?pin=${row.pin}`, { method:"PUT" });
        }
      }
      await load();
      flash(`Imported ${data.added} student${data.added!==1?"s":""}${withPin.length ? ` with ${withPin.length} PIN${withPin.length!==1?"s":""}` : ""}.`);
      setCsvPreview(null);
    } catch { flash("Import failed."); }
    setCsvImporting(false);
  }

  async function saveEmail(cid, sid, email) {
    const cls = classes.find(c => c.id === cid);
    if (!cls) return;
    const updated = cls.students.map(s =>
      s.id === sid ? { ...s, email: email.trim().toLowerCase() } : s
    );
    try {
      await fetch(`${API}/roster/class/${cid}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: cls.name, students: updated }),
      });
      await load();
      setEmailModal(null);
      flash("Email saved!");
    } catch(e) { console.error("saveEmail failed", e); }
  }

  async function saveAccommodations(cid, sid, extendedTime, reduceChoices) {
    const cls  = classes.find(c => c.id === cid);
    if (!cls) return;
    const updated = cls.students.map(s =>
      s.id === sid ? { ...s, extendedTime, reduceChoices } : s
    );
    try {
      await fetch(`${API}/roster/class/${cid}`, {
        method:"PUT", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: cls.name, students: updated }),
      });
      await load();
      setAccomModal(null);
    } catch(e) { console.error("saveAccommodations failed", e); }
  }

  async function removeStudent(cid, sid, name) {
    if (!window.confirm(`Remove ${name}?`)) return;
    try { await fetch(`${API}/roster/class/${cid}/student/${sid}`, { method:"DELETE" }); await load(); }
    catch {}
  }

  async function regenPin(cid, sid) {
    try {
      const r    = await fetch(`${API}/roster/class/${cid}/student/${sid}/pin`, { method:"PUT" });
      const data = await r.json();
      await load(); flash(`New PIN for student: ${data.pin}`);
    } catch { flash("Failed to update PIN."); }
  }

  async function setPin(cid, sid, pin) {
    try {
      const r = await fetch(`${API}/roster/class/${cid}/student/${sid}/pin/set?pin=${pin}`, { method:"PUT" });
      if (!r.ok) { const d = await r.json(); return d.detail || "Error"; }
      await load(); flash(`PIN set to ${pin}`);
      return true;
    } catch { return "Failed to save PIN."; }
  }

  const activeClassData = classes.find(c => c.id === activeClass);
  const totalStudents   = classes.reduce((a,c) => a + c.students.length, 0);
  const missingPins     = classes.reduce((a,c) => a + c.students.filter(s=>!s.pin).length, 0);

  if (loading) return <div style={{padding:"3rem",textAlign:"center",color:"#aaa"}}>Loading roster…</div>;

  return (
    <div style={{display:"flex",height:"100%",fontFamily:"sans-serif",background:"#e8edf2",overflow:"hidden"}}>

      {/* ── Left: class list ── */}
      <div style={{width:"260px",display:"flex",flexDirection:"column",borderRight:"2px solid #c8d3dd",background:"#fff",flexShrink:0,overflow:"hidden"}}>
        <div style={{background:"#003865",color:"#fff",padding:"0.9rem 1.25rem",flexShrink:0}}>
          <div style={{fontSize:"0.6rem",opacity:.65,letterSpacing:"0.14em"}}>TEACHER TOOLS</div>
          <div style={{fontSize:"1rem",fontWeight:700}}>Class Roster</div>
          <div style={{fontSize:"0.72rem",opacity:.7,marginTop:"2px"}}>{classes.length} class{classes.length!==1?"es":""} · {totalStudents} students</div>
        </div>

        <div style={{padding:"0.85rem 1rem",borderBottom:"1px solid #dde3e9",flexShrink:0}}>
          <label style={S.lbl}>NEW CLASS / PERIOD</label>
          <div style={{display:"flex",gap:"0.4rem"}}>
            <input style={{...S.inp,flex:1}} value={newClassName}
              onChange={e=>setNewClassName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addClass()}
              placeholder="e.g. Period 2"/>
            <button onClick={addClass} style={{...S.btn,background:"#003865",color:"#fff",border:"none",flexShrink:0}}>+ Add</button>
          </div>
          <button onClick={()=>setGcImportOpen(true)}
            style={{...S.btn,marginTop:"0.6rem",width:"100%",background:"#fff",border:"1px solid #c8d3dd",
              display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",padding:"0.55rem"}}>
            <img src="https://www.gstatic.com/images/branding/product/1x/classroom_2020q4_48dp.png"
              alt="" style={{width:"16px",height:"16px"}}/>
            <span style={{fontSize:"0.75rem",fontWeight:700,color:"#003865"}}>Import from Google Classroom</span>
          </button>
          {msg && <div style={{fontSize:"0.72rem",color:"#1a6e2e",fontWeight:700,marginTop:"5px"}}>✓ {msg}</div>}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"0.5rem"}}>
          {classes.length===0 ? (
            <div style={{padding:"2rem 1rem",textAlign:"center",color:"#aaa",fontSize:"0.82rem"}}>No classes yet.</div>
          ) : classes.map(cls => {
            const isActive = cls.id===activeClass;
            return (
              <div key={cls.id} onClick={()=>setActiveClass(cls.id)}
                style={{padding:"0.75rem 0.9rem",borderRadius:"4px",marginBottom:"0.35rem",background:isActive?"#ddeaf7":"#f8fafc",border:`2px solid ${isActive?"#003865":"#dde3e9"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:"0.88rem",fontWeight:700,color:isActive?"#003865":"#1a1a1a"}}>{cls.name}</div>
                  <div style={{fontSize:"0.68rem",color:"#888",marginTop:"1px"}}>{cls.students.length} student{cls.students.length!==1?"s":""}</div>
                </div>
                <div style={{display:"flex",gap:"0.35rem",alignItems:"center"}}>
                  <button onClick={e=>{e.stopPropagation();navigator.clipboard.writeText(`${window.location.origin}/?practice=${cls.id}`);}}
                    title="Copy practice link for Google Classroom"
                    style={{...S.btn,padding:"2px 7px",fontSize:"0.65rem",color:"#1a6e2e",borderColor:"#b3dfc0",background:"#f0faf2"}}>
                    📋 Practice Link
                  </button>
                  <button onClick={e=>{e.stopPropagation();deleteClass(cls.id);}}
                    title="Delete entire class"
                    style={{...S.btn,padding:"2px 7px",color:"#8b1a1a",borderColor:"#f0b8b8",background:"#fdf2f2",fontSize:"0.68rem"}}>🗑 Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: student management ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Missing PIN banner */}
        {missingPins>0 && (
          <div style={{background:"#fff8e1",borderBottom:"1px solid #ffd166",padding:"0.55rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem",fontSize:"0.8rem",color:"#7a4e00",flexShrink:0}}>
            <span>⚠ {missingPins} student{missingPins!==1?"s":""} missing a PIN.</span>
            <button onClick={generateMissingPins} style={{...S.btn,padding:"3px 12px",background:"#ffd166",borderColor:"#ffc107",color:"#7a4e00",fontWeight:700,fontSize:"0.75rem"}}>
              Generate Missing PINs
            </button>
          </div>
        )}

        {!activeClassData ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"#aaa",gap:"0.5rem"}}>
            <div style={{fontSize:"2rem"}}>👈</div>
            <div style={{fontWeight:600,color:"#555"}}>Select a class to manage students</div>
            <div style={{fontSize:"0.82rem"}}>Or create a new class on the left</div>
          </div>
        ) : (
          <>
            {/* Class header */}
            <div style={{background:"#fff",borderBottom:"1px solid #c8d3dd",padding:"0.75rem 1.25rem",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#003865"}}>{activeClassData.name.toUpperCase()}</div>
                <div style={{fontSize:"1rem",fontWeight:700,color:"#1a1a1a",marginTop:"2px"}}>
                  {activeClassData.students.length} student{activeClassData.students.length!==1?"s":""}
                </div>
              </div>
              {activeClassData.students.length>0 && (
                <button onClick={()=>printPinSheet(activeClassData)}
                  style={{...S.btn,background:"#003865",color:"#fff",border:"none",display:"flex",alignItems:"center",gap:"0.4rem"}}>
                  🖨️ Print PIN Cards
                </button>
              )}
            </div>

            {/* Add students */}
            <div style={{background:"#fff",borderBottom:"2px solid #dde3e9",padding:"1rem 1.25rem",flexShrink:0}}>
              <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
                {[["one","Add One"],["paste","Paste List"],["csv","📄 Upload CSV"]].map(([key,lbl])=>(
                  <button key={key} onClick={()=>{setAddMode(key);setCsvPreview(null);setCsvErr("");}}
                    style={{...S.btn,background:addMode===key?"#003865":"#f0f4f8",color:addMode===key?"#fff":"#333",borderColor:addMode===key?"#003865":"#c8d3dd"}}>
                    {lbl}
                  </button>
                ))}
              </div>
              {addMode==="one" ? (
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
              ) : addMode==="paste" ? (
                <div>
                  <label style={S.lbl}>PASTE NAMES — one per line</label>
                  <textarea style={S.ta} value={pasteInput} onChange={e=>setPasteInput(e.target.value)}
                    placeholder={"Marcus Johnson\nAva Williams\nDeShawn Brown\nKeisha Davis"}/>
                  <button onClick={addStudents} disabled={adding||!pasteInput.trim()}
                    style={{...S.btn,marginTop:"0.5rem",background:pasteInput.trim()?"#003865":"#c8d3dd",color:"#fff",border:"none",padding:"0.6rem 1.5rem"}}>
                    {adding?"Adding…":`+ Add ${pasteInput.split("\n").filter(n=>n.trim()).length} Student${pasteInput.split("\n").filter(n=>n.trim()).length!==1?"s":""}`}
                  </button>
                </div>
              ) : addMode==="csv" ? (
                <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                  {/* Format hint */}
                  <div style={{background:"#f0f4f8",borderRadius:"3px",padding:"0.6rem 0.9rem",fontSize:"0.76rem",color:"#555",lineHeight:1.6}}>
                    <strong>CSV format:</strong> two columns — <code>name</code> and <code>pin</code> (PIN optional).<br/>
                    Header row optional. Example:<br/>
                    <code style={{display:"block",marginTop:"4px",color:"#003865"}}>
                      Marcus Johnson,12345<br/>
                      Ava Williams,67890<br/>
                      DeShawn Brown
                    </code>
                  </div>
                  {/* File picker */}
                  <input ref={csvRef} type="file" accept=".csv,.txt" onChange={handleCSVFile} style={{display:"none"}}/>
                  <button onClick={()=>csvRef.current?.click()}
                    style={{...S.btn,background:"#003865",color:"#fff",border:"none",padding:"0.65rem",fontSize:"0.85rem",fontWeight:700}}>
                    📂 Choose CSV File
                  </button>
                  {csvErr && <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"3px",padding:"0.55rem 0.85rem",fontSize:"0.76rem",color:"#8b1a1a"}}>⚠ {csvErr}</div>}
                  {/* Preview */}
                  {csvPreview && (
                    <div>
                      <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",color:"#555",marginBottom:"6px"}}>
                        PREVIEW — {csvPreview.length} student{csvPreview.length!==1?"s":""} · {csvPreview.filter(r=>r.pin).length} with PINs
                      </div>
                      <div style={{maxHeight:"160px",overflowY:"auto",border:"1px solid #c8d3dd",borderRadius:"3px",background:"#fafbfc"}}>
                        {csvPreview.map((r,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.4rem 0.75rem",borderBottom:i<csvPreview.length-1?"1px solid #eef1f4":"none"}}>
                            <span style={{fontSize:"0.82rem",fontWeight:600,flex:1}}>{r.name}</span>
                            {r.pin
                              ? <span style={{fontFamily:"monospace",fontSize:"0.85rem",fontWeight:700,color:"#003865",letterSpacing:"0.15em"}}>{r.pin}</span>
                              : <span style={{fontSize:"0.72rem",color:"#aaa"}}>auto PIN</span>}
                          </div>
                        ))}
                      </div>
                      <button onClick={importCSV} disabled={csvImporting}
                        style={{...S.btn,marginTop:"0.6rem",width:"100%",background:"#1a6e2e",color:"#fff",border:"none",padding:"0.65rem",fontSize:"0.85rem",fontWeight:700,opacity:csvImporting?0.7:1}}>
                        {csvImporting?"Importing…":`✓ Import ${csvPreview.length} Student${csvPreview.length!==1?"s":""}`}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Student list */}
            <div style={{flex:1,overflowY:"auto",padding:"0.75rem 1.25rem"}}>
              {activeClassData.students.length===0 ? (
                <div style={{padding:"2rem",textAlign:"center",color:"#aaa",fontSize:"0.85rem"}}>No students yet.</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                  {activeClassData.students.map((s,i)=>(
                    <div key={s.id} style={{background:"#fff",border:"1px solid #dde3e9",borderRadius:"3px",padding:"0.6rem 0.9rem",display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",background:"#003865",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{color:"#fff",fontSize:"0.65rem",fontWeight:700}}>{i+1}</span>
                      </div>
                      <div style={{flex:1,fontSize:"0.88rem",fontWeight:600,color:"#1a1a1a",minWidth:"120px"}}>
                        {s.name}
                        <span style={{display:"inline-flex",gap:"4px",marginLeft:"8px",verticalAlign:"middle"}}>
                          {s.extendedTime && s.extendedTime !== "none" && (
                            <span style={{background:"#ddeaf7",border:"1px solid #b3cde8",borderRadius:"3px",padding:"1px 6px",fontSize:"0.6rem",fontWeight:700,color:"#003865"}}>
                              ⏱ {s.extendedTime === "1.5x" ? "1.5×" : "2×"} TIME
                            </span>
                          )}
                          {s.reduceChoices && (
                            <span style={{background:"#fff8e1",border:"1px solid #ffc107",borderRadius:"3px",padding:"1px 6px",fontSize:"0.6rem",fontWeight:700,color:"#7a4e00"}}>
                              ✂ 3-CHOICE
                            </span>
                          )}
                        </span>
                      </div>
                      <PinEditor
                        pin={s.pin}
                        onSave={pin=>setPin(activeClassData.id, s.id, pin)}
                        onRegen={()=>regenPin(activeClassData.id, s.id)}
                      />
                      <button onClick={()=>setAccomModal({cid:activeClassData.id, student:s})}
                        style={{...S.btn,padding:"2px 8px",fontSize:"0.7rem",color:"#003865",borderColor:"#b3cde8",background:"#ddeaf7"}}>IEP</button>
                      <button onClick={()=>setEmailModal({cid:activeClassData.id, student:s})}
                        title={s.email || "Set Google email"}
                        style={{...S.btn,padding:"2px 8px",fontSize:"0.7rem",color:s.email?"#1a6e2e":"#888",borderColor:s.email?"#b3dfc0":"#dde3e9",background:s.email?"#f0faf2":"#f8fafc"}}>
                        {s.email ? "✉ ✓" : "✉"}
                      </button>
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
    {/* ── Google Classroom Import Modal ── */}
    {gcImportOpen && (
      <ClassroomImportModal
        onClose={() => setGcImportOpen(false)}
        onImport={async (courseName, students) => {
          // Create a new class with the course name
          const r = await fetch(`${API}/roster/class`, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ name: courseName, teacherId: teacher?.teacherId || null }),
          });
          const { id: newCid } = await r.json();
          // Assign class to teacher if we have a teacherId
          if (teacher?.teacherId) {
            const currentIds = classes.map(c => c.id);
            await fetch(`${API}/teachers/${teacher.teacherId}/classes`, {
              method:"PUT", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ students: [...currentIds, newCid] }),
            });
          }
          // Add student names
          const names = students.map(s => s.name);
          await fetch(`${API}/roster/class/${newCid}/students`, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ students: names }),
          });
          // Save emails
          await load();
          const freshClasses = await fetch(`${API}/roster`).then(r=>r.json());
          const newCls = freshClasses.find(c => c.id === newCid);
          if (newCls) {
            const updated = newCls.students.map(s => {
              const match = students.find(gs => gs.name === s.name);
              return match ? { ...s, email: match.email } : s;
            });
            await fetch(`${API}/roster/class/${newCid}`, {
              method:"PUT", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ name: courseName, students: updated }),
            });
          }
          await load();
          // Also refresh teacher's classIds by fetching fresh roster directly
          const freshAll = await fetch(`${API}/roster`).then(r=>r.json());
          setClasses(teacher && teacher.classIds !== null
            ? freshAll.filter(c => [...(teacher.classIds||[]), newCid].includes(c.id))
            : freshAll
          );
          setActiveClass(newCid);
          setGcImportOpen(false);
          flash(`Imported ${students.length} students from Google Classroom!`);
        }}
      />
    )}
    {/* ── IEP / Accommodations Modal ── */}
    {accomModal && (
      <AccomModal
        student={accomModal.student}
        onSave={(ext, red) => saveAccommodations(accomModal.cid, accomModal.student.id, ext, red)}
        onClose={() => setAccomModal(null)}
      />
    )}
    {/* ── Email Modal ── */}
    {emailModal && (
      <EmailModal
        student={emailModal.student}
        onSave={email => saveEmail(emailModal.cid, emailModal.student.id, email)}
        onClose={() => setEmailModal(null)}
      />
    )}
    </div>
  );
}
