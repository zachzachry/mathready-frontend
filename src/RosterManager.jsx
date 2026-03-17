import { useState, useEffect, useCallback, useRef } from "react";
import { API } from "./shared/constants";

const S = {
  inp:   { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.85rem", background:"#fafbfc", boxSizing:"border-box" },
  lbl:   { display:"block", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.12em", color:"#555", marginBottom:"4px" },
  btn:   { border:"1px solid #c8d3dd", borderRadius:"3px", padding:"6px 14px", cursor:"pointer", fontSize:"0.78rem", fontWeight:600, background:"#f0f4f8", color:"#333" },
  ta:    { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.82rem", background:"#fafbfc", boxSizing:"border-box", resize:"vertical", fontFamily:"sans-serif", minHeight:"120px" },
};


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
          <div style={{fontSize:"0.75rem",letterSpacing:"0.12em",opacity:.7,marginBottom:"2px"}}>ACCOMMODATIONS</div>
          <div style={{fontSize:"1rem",fontWeight:700}}>{student.name}</div>
        </div>
        <div style={{padding:"1.25rem",display:"flex",flexDirection:"column",gap:"1rem"}}>

          {/* Extended Time */}
          <div>
            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"8px"}}>⏱ EXTENDED TIME (IEP / 504)</label>
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
            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"8px"}}>✂ REDUCE ANSWER CHOICES</label>
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


const GRP_COLORS = ["#003865","#1a6e2e","#7c3aed","#b45309","#dc2626"];

function ClassroomImportModal({ onClose, onImport, onImportGroups }) {
  const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
  const [step,      setStep]      = useState("idle"); // idle|loading|pick|confirm|split
  const [courses,   setCourses]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [students,  setStudents]  = useState([]);
  const [err,       setErr]       = useState("");
  const [importing, setImporting] = useState(false);
  const tokenRef = useRef(null);

  // Split step state
  const [groups,      setGroups]      = useState([]);
  const [assignments, setAssignments] = useState({}); // studentIndex → groupIndex
  const [editingGrp,  setEditingGrp]  = useState(null);

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
      const all = [];
      let pageToken = null;
      do {
        const url = `https://classroom.googleapis.com/v1/courses/${course.id}/students?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${tokenRef.current}` } });
        const d = await r.json();
        if (!r.ok) { setErr(d.error?.message || "Failed to load students."); setStep("pick"); return; }
        (d.students || []).forEach(s => all.push(s));
        pageToken = d.nextPageToken || null;
      } while (pageToken);

      const list = all.map(s => ({
        name:  `${s.profile.name.givenName} ${s.profile.name.familyName}`,
        _last: s.profile.name.familyName || "",
      })).sort((a, b) => a._last.localeCompare(b._last) || a.name.localeCompare(b.name));
      list.forEach(s => delete s._last);
      setStudents(list);
      setStep("confirm");
    } catch { setErr("Could not load students."); setStep("pick"); }
  }

  function enterSplit() {
    setGroups([{ name: selected?.name || "General", extendedTime: "none", reduceChoices: false }]);
    setAssignments({});
    setEditingGrp(0);
    setStep("split");
  }

  function addGroup() {
    const newIdx = groups.length;
    setGroups(g => [...g, { name: "New Group", extendedTime: "none", reduceChoices: false }]);
    setEditingGrp(newIdx);
  }

  function updateGroup(gi, patch) {
    setGroups(gs => gs.map((g, i) => i === gi ? { ...g, ...patch } : g));
  }

  function removeGroup(gi) {
    if (groups.length === 1) return;
    setGroups(gs => gs.filter((_, i) => i !== gi));
    setAssignments(a => {
      const updated = {};
      Object.entries(a).forEach(([si, gIdx]) => {
        const n = Number(gIdx);
        updated[si] = n === gi ? 0 : n > gi ? n - 1 : n;
      });
      return updated;
    });
    if (editingGrp === gi) setEditingGrp(null);
    else if (editingGrp !== null && editingGrp > gi) setEditingGrp(e => e - 1);
  }

  async function doImport() {
    setImporting(true);
    await onImport(selected.name, students, selected.id);
    setImporting(false);
  }

  async function doImportGroups() {
    setImporting(true);
    const groupsWithStudents = groups.map((g, gi) => ({
      ...g,
      gcCourseId: selected.id,
      students: students.filter((_, si) => (assignments[si] !== undefined ? assignments[si] : 0) === gi),
    }));
    await onImportGroups(groupsWithStudents);
    setImporting(false);
  }

  const maxW = step === "split" ? "580px" : "440px";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",
      justifyContent:"center",zIndex:1000,fontFamily:"sans-serif",padding:"1rem"}}>
      <div style={{background:"#fff",borderRadius:"8px",boxShadow:"0 8px 40px rgba(0,0,0,.2)",
        width:"100%",maxWidth:maxW,display:"flex",flexDirection:"column",maxHeight:"88vh",overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:"#003865",color:"#fff",padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem",flexShrink:0}}>
          <img src="https://www.gstatic.com/images/branding/product/1x/classroom_2020q4_48dp.png"
            alt="" style={{width:"22px",height:"22px"}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:"0.75rem",opacity:.65,letterSpacing:"0.14em"}}>GOOGLE CLASSROOM</div>
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
                Sign in with your school Google account to pull your class rosters directly from Google Classroom. Student names will be imported automatically.
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
                  <button key={c.id} onClick={() => fetchStudents(c)}
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
                PREVIEW — {selected.name} — {students.length} students
              </div>
              <div style={{border:"1px solid #dde3e9",borderRadius:"4px",overflow:"hidden",maxHeight:"220px",overflowY:"auto"}}>
                {students.map((s, i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.45rem 0.75rem",
                    borderBottom:i<students.length-1?"1px solid #eef1f4":"none",background:i%2===0?"#fff":"#f8fafc"}}>
                    <div style={{width:"24px",height:"24px",borderRadius:"50%",background:"#003865",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{color:"#fff",fontSize:"0.75rem",fontWeight:700}}>{i+1}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.85rem",fontWeight:600}}>{s.name}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                <button onClick={doImport} disabled={importing}
                  style={{background:"#1a6e2e",border:"none",borderRadius:"6px",padding:"0.75rem",
                    fontSize:"0.88rem",fontWeight:700,color:"#fff",cursor:"pointer",opacity:importing?0.7:1}}>
                  {importing ? "Importing…" : `✓ Import as one class (${students.length} students)`}
                </button>
                <button onClick={enterSplit} disabled={importing}
                  style={{background:"#003865",border:"none",borderRadius:"6px",padding:"0.75rem",
                    fontSize:"0.88rem",fontWeight:700,color:"#fff",cursor:"pointer",opacity:importing?0.5:1}}>
                  ✂ Split into Groups (General / SPED / Gifted…)
                </button>
                <button onClick={() => setStep("pick")}
                  style={{border:"1px solid #c8d3dd",borderRadius:"4px",padding:"0.5rem",background:"#fff",cursor:"pointer",fontSize:"0.82rem",color:"#555"}}>
                  ← Pick a different class
                </button>
              </div>
            </>
          )}

          {step === "split" && (
            <>
              {/* Group definitions */}
              <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.1em",color:"#555"}}>
                STEP 1 — DEFINE GROUPS
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                {groups.map((g, gi) => {
                  const color   = GRP_COLORS[gi % GRP_COLORS.length];
                  const count   = students.filter((_, si) => (assignments[si] ?? 0) === gi).length;
                  const isEditing = editingGrp === gi;
                  return (
                    <div key={gi} style={{border:`2px solid ${isEditing ? color : "#dde3e9"}`,borderRadius:"6px",overflow:"hidden"}}>
                      {/* Card header */}
                      <div onClick={() => setEditingGrp(isEditing ? null : gi)}
                        style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.55rem 0.85rem",
                          background:isEditing ? color+"18" : "#f8fafc",cursor:"pointer",userSelect:"none"}}>
                        <div style={{width:"10px",height:"10px",borderRadius:"50%",background:color,flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <span style={{fontWeight:700,fontSize:"0.88rem",color:"#1a1a1a"}}>{g.name}</span>
                          <span style={{fontSize:"0.75rem",color:"#888",marginLeft:"8px"}}>
                            {count} student{count!==1?"s":""}
                            {g.extendedTime !== "none" && ` · ⏱ ${g.extendedTime === "1.5x" ? "1.5×" : "2×"}`}
                            {g.reduceChoices && " · ✂ 3-choice"}
                          </span>
                        </div>
                        {groups.length > 1 && (
                          <button onClick={e => { e.stopPropagation(); removeGroup(gi); }}
                            style={{background:"none",border:"none",color:"#bbb",cursor:"pointer",fontSize:"0.78rem",padding:"2px 6px",lineHeight:1}}>✕</button>
                        )}
                        <span style={{fontSize:"0.75rem",color:"#666"}}>{isEditing ? "▲" : "▼"}</span>
                      </div>
                      {/* Inline editor */}
                      {isEditing && (
                        <div style={{padding:"0.85rem",borderTop:"1px solid #eef1f4",display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                          <div>
                            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.1em",color:"#555",marginBottom:"4px"}}>GROUP NAME</label>
                            <input value={g.name} onChange={e => updateGroup(gi, {name: e.target.value})}
                              style={{width:"100%",padding:"0.45rem 0.65rem",border:"1px solid #b3cde8",borderRadius:"3px",fontSize:"0.88rem",boxSizing:"border-box",outline:"none"}}/>
                          </div>
                          <div>
                            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.1em",color:"#555",marginBottom:"5px"}}>⏱ EXTENDED TIME (IEP / 504)</label>
                            <div style={{display:"flex",gap:"0.4rem"}}>
                              {[["none","Standard"],["1.5x","1.5×"],["2x","2×"]].map(([val,lbl]) => (
                                <button key={val} onClick={() => updateGroup(gi, {extendedTime: val})}
                                  style={{flex:1,padding:"0.4rem",border:`2px solid ${g.extendedTime===val?color:"#c8d3dd"}`,borderRadius:"3px",
                                    background:g.extendedTime===val?color:"#fafbfc",color:g.extendedTime===val?"#fff":"#555",
                                    fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.1em",color:"#555",marginBottom:"5px"}}>✂ ANSWER CHOICES</label>
                            <div style={{display:"flex",gap:"0.4rem"}}>
                              {[[false,"Standard (4)"],[true,"Reduced (3)"]].map(([val,lbl]) => (
                                <button key={String(val)} onClick={() => updateGroup(gi, {reduceChoices: val})}
                                  style={{flex:1,padding:"0.4rem",border:`2px solid ${g.reduceChoices===val?color:"#c8d3dd"}`,borderRadius:"3px",
                                    background:g.reduceChoices===val?color:"#fafbfc",color:g.reduceChoices===val?"#fff":"#555",
                                    fontWeight:600,fontSize:"0.72rem",cursor:"pointer"}}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button onClick={addGroup}
                  style={{padding:"0.5rem",border:"2px dashed #c8d3dd",borderRadius:"6px",background:"#fafbfc",
                    cursor:"pointer",fontSize:"0.82rem",fontWeight:600,color:"#555"}}>
                  + Add Group
                </button>
              </div>

              {/* Student assignment */}
              <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.1em",color:"#555"}}>
                STEP 2 — ASSIGN STUDENTS ({students.length} total)
              </div>
              <div style={{border:"1px solid #dde3e9",borderRadius:"4px",overflow:"hidden",maxHeight:"300px",overflowY:"auto"}}>
                {students.map((s, si) => {
                  const assigned = assignments[si] !== undefined ? assignments[si] : 0;
                  const aColor   = GRP_COLORS[assigned % GRP_COLORS.length];
                  return (
                    <div key={s.name} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.35rem 0.75rem",
                      borderBottom:si<students.length-1?"1px solid #eef1f4":"none",background:si%2===0?"#fff":"#f8fafc",flexWrap:"wrap"}}>
                      <div style={{width:"8px",height:"8px",borderRadius:"50%",background:aColor,flexShrink:0}}/>
                      <div style={{flex:1,fontSize:"0.82rem",fontWeight:600,minWidth:"100px"}}>{s.name}</div>
                      <div style={{display:"flex",gap:"0.25rem",flexWrap:"wrap"}}>
                        {groups.map((g, idx) => (
                          <button key={idx}
                            onClick={() => setAssignments(prev => ({ ...prev, [si]: idx }))}
                            style={{padding:"2px 8px",border:`2px solid ${assigned === idx ? GRP_COLORS[idx % GRP_COLORS.length] : "#dde3e9"}`,
                              borderRadius:"12px",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",
                              background:assigned === idx ? GRP_COLORS[idx % GRP_COLORS.length] : "#f8fafc",
                              color:assigned === idx ? "#fff" : "#888",whiteSpace:"nowrap"}}>
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer — split step only */}
        {step === "split" && (
          <div style={{padding:"0.9rem 1.5rem",borderTop:"1px solid #dde3e9",display:"flex",gap:"0.65rem",flexShrink:0}}>
            <button onClick={() => setStep("confirm")}
              style={{flex:1,background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:"#333"}}>
              ← Back
            </button>
            <button onClick={doImportGroups} disabled={importing}
              style={{flex:2,background:"#1a6e2e",border:"none",borderRadius:"3px",padding:"0.65rem",
                fontSize:"0.88rem",cursor:"pointer",color:"#fff",fontWeight:700,opacity:importing?0.6:1}}>
              {importing ? "Creating classes…" : `✓ Import ${groups.length} Group${groups.length!==1?"s":""}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ClassroomSyncModal({ cls, onClose, onSync }) {
  const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
  const [step,        setStep]       = useState("idle"); // idle|loading|review
  const [newStudents, setNewStudents] = useState([]);
  const [err,         setErr]        = useState("");
  const [syncing,     setSyncing]    = useState(false);

  function startSync() {
    if (!window.google) { setErr("Google API not loaded. Refresh and try again."); return; }
    setErr(""); setStep("loading");
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: "https://www.googleapis.com/auth/classroom.rosters.readonly",
      callback: async (resp) => {
        if (resp.error) { setErr("Sign-in cancelled or failed."); setStep("idle"); return; }
        await fetchAndDiff(resp.access_token);
      },
    });
    client.requestAccessToken();
  }

  async function fetchAndDiff(token) {
    try {
      const all = [];
      let pageToken = null;
      do {
        const url = `https://classroom.googleapis.com/v1/courses/${cls.gcCourseId}/students?pageSize=200${pageToken ? `&pageToken=${pageToken}` : ""}`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        if (!r.ok) { setErr(d.error?.message || "Failed to fetch roster."); setStep("idle"); return; }
        (d.students || []).forEach(s => all.push(s));
        pageToken = d.nextPageToken || null;
      } while (pageToken);
      const gcStudents = all.map(s => ({
        name: `${s.profile.name.givenName} ${s.profile.name.familyName}`,
      }));
      const existingNames = new Set(cls.students.map(s => s.name.toLowerCase()));
      const newOnes = gcStudents.filter(gs => !existingNames.has(gs.name.toLowerCase()));
      setNewStudents(newOnes);
      setStep("review");
    } catch { setErr("Could not reach Google Classroom API."); setStep("idle"); }
  }

  async function doSync() {
    setSyncing(true);
    await onSync(cls, newStudents);
    setSyncing(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,fontFamily:"sans-serif"}}>
      <div style={{background:"#fff",borderRadius:"8px",boxShadow:"0 8px 40px rgba(0,0,0,.2)",width:"100%",maxWidth:"400px",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:"#003865",color:"#fff",padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <img src="https://www.gstatic.com/images/branding/product/1x/classroom_2020q4_48dp.png" alt="" style={{width:"22px",height:"22px"}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:"0.75rem",opacity:.65,letterSpacing:"0.14em"}}>GOOGLE CLASSROOM · RE-SYNC</div>
            <div style={{fontSize:"0.95rem",fontWeight:700}}>{cls.name}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",fontSize:"1.2rem",cursor:"pointer",opacity:.7}}>✕</button>
        </div>

        <div style={{padding:"1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
          {err && (
            <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",padding:"0.6rem 1rem",fontSize:"0.82rem",color:"#8b1a1a",fontWeight:600}}>⚠ {err}</div>
          )}

          {step === "idle" && (
            <>
              <div style={{fontSize:"0.85rem",color:"#555",lineHeight:1.6}}>
                Check Google Classroom for new students. Existing students, their accommodations, and scores will not be affected.
              </div>
              <button onClick={startSync}
                style={{background:"#003865",border:"none",borderRadius:"6px",padding:"0.75rem",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",cursor:"pointer",fontWeight:700,color:"#fff"}}>
                <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="" style={{width:"20px",height:"20px",filter:"brightness(10)"}}/>
                Connect to Google Classroom
              </button>
            </>
          )}

          {step === "loading" && (
            <div style={{textAlign:"center",color:"#888",padding:"1.5rem"}}>Fetching roster…</div>
          )}

          {step === "review" && (
            <>
              {newStudents.length === 0 ? (
                <div style={{textAlign:"center",color:"#1a6e2e",fontWeight:700,padding:"1.5rem",background:"#f0faf2",borderRadius:"6px",fontSize:"0.9rem"}}>
                  ✓ Class is up to date — no new students found.
                </div>
              ) : (
                <>
                  <div style={{fontSize:"0.82rem",color:"#555"}}>
                    Found <strong>{newStudents.length} new student{newStudents.length!==1?"s":""}</strong> in Google Classroom:
                  </div>
                  <div style={{border:"1px solid #dde3e9",borderRadius:"4px",overflow:"hidden",maxHeight:"200px",overflowY:"auto"}}>
                    {newStudents.map((s, i) => (
                      <div key={i} style={{padding:"0.45rem 0.75rem",borderBottom:i<newStudents.length-1?"1px solid #eef1f4":"none",background:i%2===0?"#fff":"#f8fafc"}}>
                        <div style={{fontSize:"0.85rem",fontWeight:600}}>{s.name}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={doSync} disabled={syncing}
                    style={{background:"#1a6e2e",border:"none",borderRadius:"6px",padding:"0.75rem",
                      fontSize:"0.88rem",fontWeight:700,color:"#fff",cursor:"pointer",opacity:syncing?0.7:1}}>
                    {syncing ? "Adding…" : `✓ Add ${newStudents.length} Student${newStudents.length!==1?"s":""}`}
                  </button>
                </>
              )}
              <button onClick={onClose}
                style={{border:"1px solid #c8d3dd",borderRadius:"4px",padding:"0.5rem",background:"#fff",cursor:"pointer",fontSize:"0.82rem",color:"#555"}}>
                {newStudents.length === 0 ? "Done" : "Cancel"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export default function RosterManager({ teacher, readOnly }) {
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
  const [gcImportOpen, setGcImportOpen] = useState(false);
  const [syncModal,    setSyncModal]    = useState(null); // class object or null

  const load = useCallback(async () => {
    try {
      const url = `${API}/roster${teacher && teacher.classIds !== null ? '?classIds='+teacher.classIds.join(',') : ''}`;
      const r = await fetch(url);
      setClasses(await r.json());
    }
    catch { setClasses([]); flash("Could not load classes. Please refresh."); }
    setLoading(false);
  }, [teacher]);

  useEffect(() => { load(); }, [load]);

  function flash(text) { setMsg(text); setTimeout(() => setMsg(""), 3500); }

  async function addClass() {
    if (!newClassName.trim()) return;
    try {
      await fetch(`${API}/roster/class`, { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: newClassName.trim(), teacherId: teacher?.teacherId || null }) });
      setNewClassName(""); await load(); flash("Class added!");
    } catch { flash("Failed to add class. Check your connection."); }
  }

  async function deleteClass(cid) {
    const cls = classes.find(c => c.id === cid);
    if (!window.confirm(`Delete "${cls?.name || "this class"}" and all its students? This cannot be undone.`)) return;
    try { await fetch(`${API}/roster/class/${cid}`, { method:"DELETE" }); await load(); }
    catch { flash("Failed to delete class. Check your connection."); }
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
    } catch { flash("Failed to add students. Check your connection."); }
    setAdding(false);
  }

  // ── CSV upload ──────────────────────────────────────────
  const csvRef = useRef();
  const [csvPreview, setCsvPreview] = useState(null);  // [{name}]
  const [csvErr,     setCsvErr]     = useState("");
  const [csvImporting, setCsvImporting] = useState(false);

  function parseCSV(text) {
    const lines = text.trim().replace(/\r/g, "").split("\n").filter(l => l.trim());
    if (!lines.length) return { err:"Empty file", rows:[] };
    const first = lines[0].toLowerCase();
    const hasHeader = first.includes("name") || first.includes("student");
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const rows = [];
    const errs = [];
    dataLines.forEach((line, i) => {
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      const name = parts[0]?.trim().replace(/^"|"$/g,"");
      if (!name) { errs.push(`Row ${i+2}: missing name`); return; }
      rows.push({ name });
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
    const names = csvPreview.map(r => r.name);
    try {
      const r = await fetch(`${API}/roster/class/${activeClass}/students`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ students: names })
      });
      const data = await r.json();
      await load();
      flash(`Imported ${data.added} student${data.added!==1?"s":""}.`);
      setCsvPreview(null);
    } catch { flash("Import failed."); }
    setCsvImporting(false);
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
    if (!cid || !sid) { console.error("removeStudent: missing cid or sid", {cid, sid}); return; }
    if (!window.confirm(`Remove ${name} from this class?`)) return;
    try {
      const r = await fetch(`${API}/roster/class/${cid}/student/${sid}`, { method:"DELETE" });
      const d = await r.json();
      if (!r.ok) { flash("Failed to remove student."); return; }
      await load();
      flash(`Removed ${name}.`);
    } catch { flash("Failed to remove student."); }
  }

  // ── Google Classroom: sync new students ──
  async function handleGcSync(cls, newStudents) {
    let addedCount = 0;
    if (newStudents.length > 0) {
      await fetch(`${API}/roster/class/${cls.id}/students`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ students: newStudents.map(s => ({ name: s.name })) }),
      });
      addedCount = newStudents.length;
    }
    await load();
    setSyncModal(null);
    flash(`Synced! ${addedCount ? `${addedCount} new student${addedCount!==1?"s":""} added` : "No changes"}.`);
  }

  // ── Google Classroom: import multiple groups ───────────────
  async function handleImportGroups(groups) {
    // groups = [{name, extendedTime, reduceChoices, gcCourseId, students:[{name}]}]
    let lastCid = null;
    const allCurrentIds = classes.map(c => c.id);
    for (const g of groups) {
      if (!g.students.length) continue; // skip empty groups
      const r = await fetch(`${API}/roster/class`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: g.name, teacherId: teacher?.teacherId || null, gcCourseId: g.gcCourseId }),
      });
      const { id: newCid } = await r.json();
      lastCid = newCid;
      // Add students
      await fetch(`${API}/roster/class/${newCid}/students`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ students: g.students.map(s => ({ name: s.name })) }),
      });
      // Apply accommodations
      await load();
      const freshAll = await fetch(`${API}/roster`).then(r => r.json());
      const newCls   = freshAll.find(c => c.id === newCid);
      if (newCls) {
        const updated = newCls.students.map(s => ({
          ...s,
          extendedTime:  g.extendedTime  || "none",
          reduceChoices: g.reduceChoices || false,
        }));
        await fetch(`${API}/roster/class/${newCid}`, {
          method:"PUT", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ name: g.name, students: updated }),
        });
      }
    }
    await load();
    setGcImportOpen(false);
    if (lastCid) setActiveClass(lastCid);
    const total = groups.reduce((a, g) => a + g.students.length, 0);
    flash(`Imported ${total} students across ${groups.filter(g => g.students.length).length} group${groups.length!==1?"s":""}!`);
  }

  const activeClassData = classes.find(c => c.id === activeClass);
  const totalStudents   = classes.reduce((a,c) => a + c.students.length, 0);

  if (loading) return <div style={{padding:"3rem",textAlign:"center",color:"#666"}}>Loading roster…</div>;

  return (
    <div style={{display:"flex",height:"100%",fontFamily:"sans-serif",background:"#e8edf2",overflow:"hidden"}}>

      {/* ── Left: class list ── */}
      <div style={{width:"260px",display:"flex",flexDirection:"column",borderRight:"2px solid #c8d3dd",background:"#fff",flexShrink:0,overflow:"hidden"}}>
        <div style={{background:"#003865",color:"#fff",padding:"0.9rem 1.25rem",flexShrink:0}}>
          <div style={{fontSize:"0.75rem",opacity:.65,letterSpacing:"0.14em"}}>TEACHER TOOLS</div>
          <div style={{fontSize:"1rem",fontWeight:700}}>Class Roster</div>
          <div style={{fontSize:"0.72rem",opacity:.7,marginTop:"2px"}}>{classes.length} class{classes.length!==1?"es":""} · {totalStudents} students</div>
        </div>

        {!readOnly && (
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
        )}

        <div style={{flex:1,overflowY:"auto",padding:"0.5rem"}}>
          {classes.length===0 ? (
            <div style={{padding:"2rem 1rem",textAlign:"center",color:"#666",fontSize:"0.82rem"}}>No classes yet.</div>
          ) : classes.map(cls => {
            const isActive = cls.id===activeClass;
            return (
              <div key={cls.id} onClick={()=>setActiveClass(cls.id)}
                style={{padding:"0.75rem 0.9rem",borderRadius:"4px",marginBottom:"0.35rem",background:isActive?"#ddeaf7":"#f8fafc",border:`2px solid ${isActive?"#003865":"#dde3e9"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:"0.88rem",fontWeight:700,color:isActive?"#003865":"#1a1a1a"}}>{cls.name}</div>
                  <div style={{fontSize:"0.75rem",color:"#888",marginTop:"1px"}}>{cls.students.length} student{cls.students.length!==1?"s":""}</div>
                </div>
                <div style={{display:"flex",gap:"0.35rem",alignItems:"center",flexWrap:"wrap"}}>
                  {cls.gcCourseId && !readOnly && (
                    <button onClick={e=>{e.stopPropagation();setSyncModal(cls);}}
                      title="Sync new students from Google Classroom"
                      style={{...S.btn,padding:"2px 7px",fontSize:"0.75rem",color:"#003865",borderColor:"#b3cde8",background:"#ddeaf7"}}>
                      ↻ Sync
                    </button>
                  )}
                  {!readOnly && (
                  <button onClick={e=>{e.stopPropagation();deleteClass(cls.id);}}
                    title="Delete entire class"
                    style={{...S.btn,padding:"2px 7px",color:"#8b1a1a",borderColor:"#f0b8b8",background:"#fdf2f2",fontSize:"0.75rem"}}>🗑 Delete</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: student management ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {!activeClassData ? (
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"#666",gap:"0.5rem"}}>
            <div style={{fontSize:"2rem"}}>👈</div>
            <div style={{fontWeight:600,color:"#555"}}>Select a class to manage students</div>
            <div style={{fontSize:"0.82rem"}}>Or create a new class on the left</div>
          </div>
        ) : (
          <>
            {/* Class header */}
            <div style={{background:"#fff",borderBottom:"1px solid #c8d3dd",padding:"0.75rem 1.25rem",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.12em",color:"#003865"}}>{activeClassData.name.toUpperCase()}</div>
                <div style={{fontSize:"1rem",fontWeight:700,color:"#1a1a1a",marginTop:"2px"}}>
                  {activeClassData.students.length} student{activeClassData.students.length!==1?"s":""}
                </div>
              </div>
            </div>

            {/* Add students */}
            {!readOnly && (
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
                    <strong>CSV format:</strong> one column — <code>name</code>. Header row optional. Example:<br/>
                    <code style={{display:"block",marginTop:"4px",color:"#003865"}}>
                      Marcus Johnson<br/>
                      Ava Williams<br/>
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
                      <div style={{fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.1em",color:"#555",marginBottom:"6px"}}>
                        PREVIEW — {csvPreview.length} student{csvPreview.length!==1?"s":""}
                      </div>
                      <div style={{maxHeight:"160px",overflowY:"auto",border:"1px solid #c8d3dd",borderRadius:"3px",background:"#fafbfc"}}>
                        {csvPreview.map((r,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.4rem 0.75rem",borderBottom:i<csvPreview.length-1?"1px solid #eef1f4":"none"}}>
                            <span style={{fontSize:"0.82rem",fontWeight:600,flex:1}}>{r.name}</span>
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
            )}

            {/* Student list */}
            <div style={{flex:1,overflowY:"auto",padding:"0.75rem 1.25rem"}}>
              {activeClassData.students.length===0 ? (
                <div style={{padding:"2rem",textAlign:"center",color:"#666",fontSize:"0.85rem"}}>No students yet.</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                  {activeClassData.students.map((s,i)=>(
                    <div key={s.id} style={{background:"#fff",border:"1px solid #dde3e9",borderRadius:"3px",padding:"0.6rem 0.9rem",display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",background:"#003865",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{color:"#fff",fontSize:"0.75rem",fontWeight:700}}>{i+1}</span>
                      </div>
                      <div style={{flex:1,fontSize:"0.88rem",fontWeight:600,color:"#1a1a1a",minWidth:"120px"}}>
                        {s.name}
                        <span style={{display:"inline-flex",gap:"4px",marginLeft:"8px",verticalAlign:"middle"}}>
                          {s.extendedTime && s.extendedTime !== "none" && (
                            <span style={{background:"#ddeaf7",border:"1px solid #b3cde8",borderRadius:"3px",padding:"1px 6px",fontSize:"0.75rem",fontWeight:700,color:"#003865"}}>
                              ⏱ {s.extendedTime === "1.5x" ? "1.5×" : "2×"} TIME
                            </span>
                          )}
                          {s.reduceChoices && (
                            <span style={{background:"#fff8e1",border:"1px solid #ffc107",borderRadius:"3px",padding:"1px 6px",fontSize:"0.75rem",fontWeight:700,color:"#7a4e00"}}>
                              ✂ 3-CHOICE
                            </span>
                          )}
                        </span>
                      </div>
                      {!readOnly && (<>
                      <button onClick={()=>setAccomModal({cid:activeClassData.id, student:s})}
                        title="Accommodations (extended time, reduced choices)"
                        style={{...S.btn,padding:"2px 8px",fontSize:"0.75rem",color:"#003865",borderColor:"#b3cde8",background:"#ddeaf7"}}>IEP</button>
                      <button onClick={()=>removeStudent(activeClassData.id, s.id, s.name)}
                        style={{...S.btn,padding:"2px 8px",color:"#8b1a1a",borderColor:"#f0b8b8",background:"#fdf2f2",fontSize:"0.75rem"}}>✕</button>
                      </>)}
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
        onImportGroups={handleImportGroups}
        onImport={async (courseName, students, gcCourseId) => {
          // Create a new class with the course name
          const r = await fetch(`${API}/roster/class`, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ name: courseName, teacherId: teacher?.teacherId || null, gcCourseId }),
          });
          const { id: newCid } = await r.json();
          await fetch(`${API}/roster/class/${newCid}/students`, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ students: students.map(s => ({ name: s.name })) }),
          });
          await load();
          const freshAll = await fetch(`${API}/roster`).then(r => r.json());
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
    {/* ── Google Classroom Sync Modal ── */}
    {syncModal && (
      <ClassroomSyncModal
        cls={syncModal}
        onClose={() => setSyncModal(null)}
        onSync={handleGcSync}
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

    </div>
  );
}
