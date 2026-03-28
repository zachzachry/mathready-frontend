import { useState, useEffect, useCallback, useRef } from "react";
import { API, T, teacherHeaders } from "./shared/constants";

const S = {
  inp:   { width:"100%", padding:"0.5rem 0.75rem", border:`1px solid ${T.border}`, borderRadius:T.xs, fontSize:"0.85rem", background:T.surface, boxSizing:"border-box" },
  lbl:   { display:"block", fontSize:"0.75rem", fontWeight:700, letterSpacing:"0.12em", color:T.textSecondary, marginBottom:"4px" },
  btn:   { border:`1px solid ${T.border}`, borderRadius:T.xs, padding:"6px 14px", cursor:"pointer", fontSize:"0.78rem", fontWeight:600, background:T.surfaceAlt, color:T.text },
  ta:    { width:"100%", padding:"0.5rem 0.75rem", border:`1px solid ${T.border}`, borderRadius:T.xs, fontSize:"0.82rem", background:T.surface, boxSizing:"border-box", resize:"vertical", fontFamily:T.font, minHeight:"120px" },
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
      <div style={{background:T.white,borderRadius:"6px",width:"100%",maxWidth:"380px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.22)"}}>
        <div style={{background:T.midnight,color:T.white,padding:"0.9rem 1.25rem"}}>
          <div style={{fontSize:"0.75rem",letterSpacing:"0.12em",opacity:.7,marginBottom:"2px"}}>ACCOMMODATIONS</div>
          <div style={{fontSize:"1rem",fontWeight:700}}>{student.name}</div>
        </div>
        <div style={{padding:"1.25rem",display:"flex",flexDirection:"column",gap:"1rem"}}>

          {/* Extended Time */}
          <div>
            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"8px"}}>⏱ EXTENDED TIME (IEP / 504)</label>
            <div style={{display:"flex",gap:"0.5rem"}}>
              {[["none","Standard"],["1.5x","1.5×"],["2x","2×"]].map(([val,lbl])=>(
                <button key={val} onClick={()=>setExtTime(val)}
                  style={{flex:1,padding:"0.55rem",border:`2px solid ${extTime===val?T.teal:T.border}`,borderRadius:T.xs,background:extTime===val?T.teal:T.surface,color:extTime===val?T.white:T.textSecondary,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>
                  {lbl}
                </button>
              ))}
            </div>
            {extTime !== "none" && (
              <div style={{marginTop:"6px",fontSize:"0.72rem",color:T.textSecondary,background:T.surfaceAlt,padding:"6px 10px",borderRadius:T.xs}}>
                A 30-min test becomes {extTime==="1.5x"?"45":"60"} minutes for this student.
              </div>
            )}
          </div>

          {/* Reduce Answer Choices */}
          <div>
            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"8px"}}>✂ REDUCE ANSWER CHOICES</label>
            <div style={{display:"flex",gap:"0.5rem"}}>
              {[[false,"Standard (4 choices)"],[true,"Reduced (3 choices)"]].map(([val,lbl])=>(
                <button key={String(val)} onClick={()=>setReduce(val)}
                  style={{flex:1,padding:"0.55rem",border:`2px solid ${reduce===val?T.teal:T.border}`,borderRadius:T.xs,background:reduce===val?T.teal:T.surface,color:reduce===val?T.white:T.textSecondary,fontWeight:600,fontSize:"0.78rem",cursor:"pointer"}}>
                  {lbl}
                </button>
              ))}
            </div>
            {reduce && (
              <div style={{marginTop:"6px",fontSize:"0.72rem",color:T.textSecondary,background:T.surfaceAlt,padding:"6px 10px",borderRadius:T.xs}}>
                One incorrect choice is hidden on all multiple-choice questions.
              </div>
            )}
          </div>
        </div>
        <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.25rem",borderTop:`1px solid ${T.border}`}}>
          <button onClick={onClose} style={{flex:1,background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:T.text}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{flex:1,background:T.success,border:"none",borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",color:T.white,fontWeight:700,opacity:saving?.6:1}}>
            {saving?"Saving…":"Save Accommodations"}
          </button>
        </div>
      </div>
    </div>
  );
}


const GRP_COLORS = [T.teal, T.success, "#7c3aed", "#b45309", T.danger];

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
      justifyContent:"center",zIndex:1000,fontFamily:T.font,padding:"1rem"}}>
      <div style={{background:T.white,borderRadius:T.r,boxShadow:"0 8px 40px rgba(0,0,0,.2)",
        width:"100%",maxWidth:maxW,display:"flex",flexDirection:"column",maxHeight:"88vh",overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:T.midnight,color:T.white,padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem",flexShrink:0}}>
          <img src="https://www.gstatic.com/images/branding/product/1x/classroom_2020q4_48dp.png"
            alt="" style={{width:"22px",height:"22px"}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:"0.75rem",opacity:.65,letterSpacing:"0.14em"}}>GOOGLE CLASSROOM</div>
            <div style={{fontSize:"0.95rem",fontWeight:700}}>Import Class Roster</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.white,fontSize:"1.2rem",cursor:"pointer",opacity:.7}}>✕</button>
        </div>

        <div style={{padding:"1.5rem",flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:"1rem"}}>
          {err && (
            <div style={{background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,
              padding:"0.6rem 1rem",fontSize:"0.82rem",color:T.dangerText,fontWeight:600}}>⚠ {err}</div>
          )}

          {step === "idle" && (
            <>
              <div style={{fontSize:"0.85rem",color:T.textSecondary,lineHeight:1.6}}>
                Sign in with your school Google account to pull your class rosters directly from Google Classroom. Student names will be imported automatically.
              </div>
              <button onClick={startAuth}
                style={{background:T.white,border:`2px solid ${T.border}`,borderRadius:"6px",padding:"0.75rem 1rem",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",cursor:"pointer",fontWeight:700,color:T.midnight}}>
                <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png"
                  alt="" style={{width:"20px",height:"20px"}}/>
                Sign in with Google
              </button>
            </>
          )}

          {step === "loading" && (
            <div style={{textAlign:"center",color:T.textSecondary,padding:"2rem"}}>Loading…</div>
          )}

          {step === "pick" && (
            <>
              <div style={{fontSize:"0.78rem",fontWeight:700,color:T.textSecondary,letterSpacing:"0.08em"}}>
                SELECT A CLASS TO IMPORT
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                {courses.map(c => (
                  <button key={c.id} onClick={() => fetchStudents(c)}
                    style={{textAlign:"left",padding:"0.75rem 1rem",border:`2px solid ${T.border}`,borderRadius:"6px",
                      background:T.surface,cursor:"pointer",fontWeight:600,color:T.text,fontSize:"0.88rem"}}>
                    {c.name}
                    {c.section && <span style={{fontWeight:400,color:T.textSecondary,marginLeft:"6px"}}>· {c.section}</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "confirm" && selected && (
            <>
              <div style={{fontSize:"0.78rem",fontWeight:700,color:T.textSecondary,letterSpacing:"0.08em"}}>
                PREVIEW — {selected.name} — {students.length} students
              </div>
              <div style={{border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden",maxHeight:"220px",overflowY:"auto"}}>
                {students.map((s, i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.45rem 0.75rem",
                    borderBottom:i<students.length-1?`1px solid ${T.border}`:"none",background:i%2===0?T.white:T.surface}}>
                    <div style={{width:"24px",height:"24px",borderRadius:"50%",background:T.midnight,
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{color:T.white,fontSize:"0.75rem",fontWeight:700}}>{i+1}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.85rem",fontWeight:600}}>{s.name}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
                <button onClick={doImport} disabled={importing}
                  style={{background:T.success,border:"none",borderRadius:"6px",padding:"0.75rem",
                    fontSize:"0.88rem",fontWeight:700,color:T.white,cursor:"pointer",opacity:importing?0.7:1}}>
                  {importing ? "Importing…" : `✓ Import as one class (${students.length} students)`}
                </button>
                <button onClick={enterSplit} disabled={importing}
                  style={{background:T.teal,border:"none",borderRadius:"6px",padding:"0.75rem",
                    fontSize:"0.88rem",fontWeight:700,color:T.white,cursor:"pointer",opacity:importing?0.5:1}}>
                  ✂ Split into Groups (General / SPED / Gifted…)
                </button>
                <button onClick={() => setStep("pick")}
                  style={{border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.5rem",background:T.white,cursor:"pointer",fontSize:"0.82rem",color:T.textSecondary}}>
                  ← Pick a different class
                </button>
              </div>
            </>
          )}

          {step === "split" && (
            <>
              {/* Group definitions */}
              <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary}}>
                STEP 1 — DEFINE GROUPS
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
                {groups.map((g, gi) => {
                  const color   = GRP_COLORS[gi % GRP_COLORS.length];
                  const count   = students.filter((_, si) => (assignments[si] ?? 0) === gi).length;
                  const isEditing = editingGrp === gi;
                  return (
                    <div key={gi} style={{border:`2px solid ${isEditing ? color : T.border}`,borderRadius:"6px",overflow:"hidden"}}>
                      {/* Card header */}
                      <div onClick={() => setEditingGrp(isEditing ? null : gi)}
                        style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.55rem 0.85rem",
                          background:isEditing ? color+"18" : T.surface,cursor:"pointer",userSelect:"none"}}>
                        <div style={{width:"10px",height:"10px",borderRadius:"50%",background:color,flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <span style={{fontWeight:700,fontSize:"0.88rem",color:T.text}}>{g.name}</span>
                          <span style={{fontSize:"0.75rem",color:T.textSecondary,marginLeft:"8px"}}>
                            {count} student{count!==1?"s":""}
                            {g.extendedTime !== "none" && ` · ⏱ ${g.extendedTime === "1.5x" ? "1.5×" : "2×"}`}
                            {g.reduceChoices && " · ✂ 3-choice"}
                          </span>
                        </div>
                        {groups.length > 1 && (
                          <button onClick={e => { e.stopPropagation(); removeGroup(gi); }}
                            style={{background:"none",border:"none",color:"#bbb",cursor:"pointer",fontSize:"0.78rem",padding:"2px 6px",lineHeight:1}}>✕</button>
                        )}
                        <span style={{fontSize:"0.75rem",color:T.textSecondary}}>{isEditing ? "▲" : "▼"}</span>
                      </div>
                      {/* Inline editor */}
                      {isEditing && (
                        <div style={{padding:"0.85rem",borderTop:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:"0.6rem"}}>
                          <div>
                            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"4px"}}>GROUP NAME</label>
                            <input value={g.name} onChange={e => updateGroup(gi, {name: e.target.value})}
                              style={{width:"100%",padding:"0.45rem 0.65rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.88rem",boxSizing:"border-box",outline:"none"}}/>
                          </div>
                          <div>
                            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"5px"}}>⏱ EXTENDED TIME (IEP / 504)</label>
                            <div style={{display:"flex",gap:"0.4rem"}}>
                              {[["none","Standard"],["1.5x","1.5×"],["2x","2×"]].map(([val,lbl]) => (
                                <button key={val} onClick={() => updateGroup(gi, {extendedTime: val})}
                                  style={{flex:1,padding:"0.4rem",border:`2px solid ${g.extendedTime===val?color:T.border}`,borderRadius:T.xs,
                                    background:g.extendedTime===val?color:T.surface,color:g.extendedTime===val?T.white:T.textSecondary,
                                    fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label style={{display:"block",fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"5px"}}>✂ ANSWER CHOICES</label>
                            <div style={{display:"flex",gap:"0.4rem"}}>
                              {[[false,"Standard (4)"],[true,"Reduced (3)"]].map(([val,lbl]) => (
                                <button key={String(val)} onClick={() => updateGroup(gi, {reduceChoices: val})}
                                  style={{flex:1,padding:"0.4rem",border:`2px solid ${g.reduceChoices===val?color:T.border}`,borderRadius:T.xs,
                                    background:g.reduceChoices===val?color:T.surface,color:g.reduceChoices===val?T.white:T.textSecondary,
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
                  style={{padding:"0.5rem",border:`2px dashed ${T.border}`,borderRadius:"6px",background:T.surface,
                    cursor:"pointer",fontSize:"0.82rem",fontWeight:600,color:T.textSecondary}}>
                  + Add Group
                </button>
              </div>

              {/* Student assignment */}
              <div style={{fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary}}>
                STEP 2 — ASSIGN STUDENTS ({students.length} total)
              </div>
              <div style={{border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden",maxHeight:"300px",overflowY:"auto"}}>
                {students.map((s, si) => {
                  const assigned = assignments[si] !== undefined ? assignments[si] : 0;
                  const aColor   = GRP_COLORS[assigned % GRP_COLORS.length];
                  return (
                    <div key={s.name} style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.35rem 0.75rem",
                      borderBottom:si<students.length-1?`1px solid ${T.border}`:"none",background:si%2===0?T.white:T.surface,flexWrap:"wrap"}}>
                      <div style={{width:"8px",height:"8px",borderRadius:"50%",background:aColor,flexShrink:0}}/>
                      <div style={{flex:1,fontSize:"0.82rem",fontWeight:600,minWidth:"100px"}}>{s.name}</div>
                      <div style={{display:"flex",gap:"0.25rem",flexWrap:"wrap"}}>
                        {groups.map((g, idx) => (
                          <button key={idx}
                            onClick={() => setAssignments(prev => ({ ...prev, [si]: idx }))}
                            style={{padding:"2px 8px",border:`2px solid ${assigned === idx ? GRP_COLORS[idx % GRP_COLORS.length] : T.border}`,
                              borderRadius:"12px",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",
                              background:assigned === idx ? GRP_COLORS[idx % GRP_COLORS.length] : T.surface,
                              color:assigned === idx ? T.white : T.textSecondary,whiteSpace:"nowrap"}}>
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
          <div style={{padding:"0.9rem 1.5rem",borderTop:`1px solid ${T.border}`,display:"flex",gap:"0.65rem",flexShrink:0}}>
            <button onClick={() => setStep("confirm")}
              style={{flex:1,background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:T.text}}>
              ← Back
            </button>
            <button onClick={doImportGroups} disabled={importing}
              style={{flex:2,background:T.success,border:"none",borderRadius:T.xs,padding:"0.65rem",
                fontSize:"0.88rem",cursor:"pointer",color:T.white,fontWeight:700,opacity:importing?0.6:1}}>
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,fontFamily:T.font}}>
      <div style={{background:T.white,borderRadius:T.r,boxShadow:"0 8px 40px rgba(0,0,0,.2)",width:"100%",maxWidth:"400px",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:T.midnight,color:T.white,padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <img src="https://www.gstatic.com/images/branding/product/1x/classroom_2020q4_48dp.png" alt="" style={{width:"22px",height:"22px"}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:"0.75rem",opacity:.65,letterSpacing:"0.14em"}}>GOOGLE CLASSROOM · RE-SYNC</div>
            <div style={{fontSize:"0.95rem",fontWeight:700}}>{cls.name}</div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.white,fontSize:"1.2rem",cursor:"pointer",opacity:.7}}>✕</button>
        </div>

        <div style={{padding:"1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
          {err && (
            <div style={{background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,padding:"0.6rem 1rem",fontSize:"0.82rem",color:T.dangerText,fontWeight:600}}>⚠ {err}</div>
          )}

          {step === "idle" && (
            <>
              <div style={{fontSize:"0.85rem",color:T.textSecondary,lineHeight:1.6}}>
                Check Google Classroom for new students. Existing students, their accommodations, and scores will not be affected.
              </div>
              <button onClick={startSync}
                style={{background:T.teal,border:"none",borderRadius:"6px",padding:"0.75rem",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:"0.75rem",cursor:"pointer",fontWeight:700,color:T.white}}>
                <img src="https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png" alt="" style={{width:"20px",height:"20px",filter:"brightness(10)"}}/>
                Connect to Google Classroom
              </button>
            </>
          )}

          {step === "loading" && (
            <div style={{textAlign:"center",color:T.textSecondary,padding:"1.5rem"}}>Fetching roster…</div>
          )}

          {step === "review" && (
            <>
              {newStudents.length === 0 ? (
                <div style={{textAlign:"center",color:T.success,fontWeight:700,padding:"1.5rem",background:T.successBg,borderRadius:"6px",fontSize:"0.9rem"}}>
                  ✓ Class is up to date — no new students found.
                </div>
              ) : (
                <>
                  <div style={{fontSize:"0.82rem",color:T.textSecondary}}>
                    Found <strong>{newStudents.length} new student{newStudents.length!==1?"s":""}</strong> in Google Classroom:
                  </div>
                  <div style={{border:`1px solid ${T.border}`,borderRadius:"4px",overflow:"hidden",maxHeight:"200px",overflowY:"auto"}}>
                    {newStudents.map((s, i) => (
                      <div key={i} style={{padding:"0.45rem 0.75rem",borderBottom:i<newStudents.length-1?`1px solid ${T.border}`:"none",background:i%2===0?T.white:T.surface}}>
                        <div style={{fontSize:"0.85rem",fontWeight:600}}>{s.name}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={doSync} disabled={syncing}
                    style={{background:T.success,border:"none",borderRadius:"6px",padding:"0.75rem",
                      fontSize:"0.88rem",fontWeight:700,color:T.white,cursor:"pointer",opacity:syncing?0.7:1}}>
                    {syncing ? "Adding…" : `✓ Add ${newStudents.length} Student${newStudents.length!==1?"s":""}`}
                  </button>
                </>
              )}
              <button onClick={onClose}
                style={{border:`1px solid ${T.borderDark}`,borderRadius:"4px",padding:"0.5rem",background:T.white,cursor:"pointer",fontSize:"0.82rem",color:T.textSecondary}}>
                {newStudents.length === 0 ? "Done" : "Cancel"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export default function RosterManager({ teacher, readOnly, onUpdateClassIds }) {
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
      const r = await fetch(`${API}/roster/class`, { method:"POST", headers:teacherHeaders(),
        body: JSON.stringify({ name: newClassName.trim(), teacherId: teacher?.teacherId || null }) });
      const data = await r.json();
      // Sync new classId into App state + sessionStorage so it survives navigation/refresh
      if (onUpdateClassIds && teacher?.classIds !== null && data.id) {
        onUpdateClassIds([...(teacher.classIds || []), data.id]);
      }
      setNewClassName(""); await load(); flash("Class added!");
    } catch { flash("Failed to add class. Check your connection."); }
  }

  async function deleteClass(cid) {
    const cls = classes.find(c => c.id === cid);
    if (!window.confirm(`Delete "${cls?.name || "this class"}" and all its students? This cannot be undone.`)) return;
    try {
      await fetch(`${API}/roster/class/${cid}`, { method:"DELETE", headers:teacherHeaders() });
      // Sync removed classId out of App state + sessionStorage
      if (onUpdateClassIds && teacher?.classIds !== null) {
        onUpdateClassIds((teacher.classIds || []).filter(id => id !== cid));
      }
      await load();
    }
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
        method:"POST", headers:teacherHeaders(),
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
        method:"POST", headers:teacherHeaders(),
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
        method:"PUT", headers:teacherHeaders(),
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
      const r = await fetch(`${API}/roster/class/${cid}/student/${sid}`, { method:"DELETE", headers:teacherHeaders() });
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
        method:"POST", headers:teacherHeaders(),
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
    const newCids = [];
    const allCurrentIds = classes.map(c => c.id);
    for (const g of groups) {
      if (!g.students.length) continue; // skip empty groups
      const r = await fetch(`${API}/roster/class`, {
        method:"POST", headers:teacherHeaders(),
        body: JSON.stringify({ name: g.name, teacherId: teacher?.teacherId || null, gcCourseId: g.gcCourseId }),
      });
      const { id: newCid } = await r.json();
      lastCid = newCid;
      newCids.push(newCid);
      // Add students
      await fetch(`${API}/roster/class/${newCid}/students`, {
        method:"POST", headers:teacherHeaders(),
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
          method:"PUT", headers:teacherHeaders(),
          body: JSON.stringify({ name: g.name, students: updated }),
        });
      }
    }
    // Sync all new classIds into App state + sessionStorage
    if (onUpdateClassIds && teacher?.classIds !== null && newCids.length) {
      onUpdateClassIds([...(teacher.classIds || []), ...newCids]);
    }
    await load();
    setGcImportOpen(false);
    if (lastCid) setActiveClass(lastCid);
    const total = groups.reduce((a, g) => a + g.students.length, 0);
    flash(`Imported ${total} students across ${groups.filter(g => g.students.length).length} group${groups.length!==1?"s":""}!`);
  }

  const activeClassData = classes.find(c => c.id === activeClass);
  const totalStudents   = classes.reduce((a,c) => a + c.students.length, 0);

  if (loading) return <div style={{padding:"3rem",textAlign:"center",color:T.textSecondary}}>Loading roster…</div>;

  return (
    <div style={{display:"flex",height:"100%",fontFamily:"sans-serif",background:T.surfaceAlt,overflow:"hidden"}}>

      {/* ── Left: class list ── */}
      <div style={{width:"260px",display:"flex",flexDirection:"column",borderRight:`2px solid ${T.borderDark}`,background:T.white,flexShrink:0,overflow:"hidden"}}>
        <div style={{background:T.teal,color:T.white,padding:"0.9rem 1.25rem",flexShrink:0}}>
          <div style={{fontSize:"0.75rem",opacity:.65,letterSpacing:"0.14em"}}>TEACHER TOOLS</div>
          <div style={{fontSize:"1rem",fontWeight:700}}>Class Roster</div>
          <div style={{fontSize:"0.72rem",opacity:.7,marginTop:"2px"}}>{classes.length} class{classes.length!==1?"es":""} · {totalStudents} students</div>
        </div>

        {!readOnly && (
        <div style={{padding:"0.85rem 1rem",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <label style={S.lbl}>NEW CLASS / PERIOD</label>
          <div style={{display:"flex",gap:"0.4rem"}}>
            <input style={{...S.inp,flex:1}} value={newClassName}
              onChange={e=>setNewClassName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&addClass()}
              placeholder="e.g. Period 2"/>
            <button onClick={addClass} style={{...S.btn,background:T.teal,color:T.white,border:"none",flexShrink:0}}>+ Add</button>
          </div>
          <button onClick={()=>setGcImportOpen(true)}
            style={{...S.btn,marginTop:"0.6rem",width:"100%",background:T.white,border:`1px solid ${T.borderDark}`,
              display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",padding:"0.55rem"}}>
            <img src="https://www.gstatic.com/images/branding/product/1x/classroom_2020q4_48dp.png"
              alt="" style={{width:"16px",height:"16px"}}/>
            <span style={{fontSize:"0.75rem",fontWeight:700,color:T.midnight}}>Import from Google Classroom</span>
          </button>
          {msg && <div style={{fontSize:"0.72rem",color:T.success,fontWeight:700,marginTop:"5px"}}>✓ {msg}</div>}
        </div>
        )}

        <div style={{flex:1,overflowY:"auto",padding:"0.5rem"}}>
          {classes.length===0 ? (
            <div style={{padding:"2rem 1rem",textAlign:"center",color:T.textSecondary,fontSize:"0.82rem"}}>No classes yet.</div>
          ) : classes.map(cls => {
            const isActive = cls.id===activeClass;
            return (
              <div key={cls.id} onClick={()=>setActiveClass(cls.id)}
                style={{padding:"0.75rem 0.9rem",borderRadius:"4px",marginBottom:"0.35rem",background:isActive?T.tealLight:T.surface,border:`2px solid ${isActive?T.teal:T.border}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:"0.88rem",fontWeight:700,color:isActive?T.midnight:T.text}}>{cls.name}</div>
                  <div style={{fontSize:"0.75rem",color:T.textSecondary,marginTop:"1px"}}>{cls.students.length} student{cls.students.length!==1?"s":""}</div>
                </div>
                <div style={{display:"flex",gap:"0.35rem",alignItems:"center",flexWrap:"wrap"}}>
                  {cls.gcCourseId && !readOnly && (
                    <button onClick={e=>{e.stopPropagation();setSyncModal(cls);}}
                      title="Sync new students from Google Classroom"
                      style={{...S.btn,padding:"2px 7px",fontSize:"0.75rem",color:T.midnight,borderColor:T.border,background:T.tealLight}}>
                      ↻ Sync
                    </button>
                  )}
                  {!readOnly && (
                  <button onClick={e=>{e.stopPropagation();deleteClass(cls.id);}}
                    title="Delete entire class"
                    style={{...S.btn,padding:"2px 7px",color:T.dangerText,borderColor:T.dangerBd,background:T.dangerBg,fontSize:"0.75rem"}}>🗑 Delete</button>
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
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",color:T.textSecondary,gap:"0.5rem"}}>
            <div style={{fontSize:"2rem"}}>👈</div>
            <div style={{fontWeight:600,color:T.textSecondary}}>Select a class to manage students</div>
            <div style={{fontSize:"0.82rem"}}>Or create a new class on the left</div>
          </div>
        ) : (
          <>
            {/* Class header */}
            <div style={{background:T.white,borderBottom:`1px solid ${T.borderDark}`,padding:"0.75rem 1.25rem",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.12em",color:T.midnight}}>{activeClassData.name.toUpperCase()}</div>
                <div style={{fontSize:"1rem",fontWeight:700,color:T.text,marginTop:"2px"}}>
                  {activeClassData.students.length} student{activeClassData.students.length!==1?"s":""}
                </div>
              </div>
              {!readOnly && (
                <div style={{display:"flex",alignItems:"center",gap:"1.25rem",flexWrap:"wrap"}}>
                  <label style={{display:"flex",alignItems:"center",gap:"0.5rem",fontSize:"0.78rem",color:T.textSecondary,cursor:"pointer",userSelect:"none"}}>
                    <span>Hide drill timer</span>
                    <div onClick={async () => {
                      const newVal = !(activeClassData.hideTimer ?? true);
                      try {
                        await fetch(`${API}/roster/class/${activeClassData.id}`, {
                          method:"PUT", headers:teacherHeaders(),
                          body: JSON.stringify({ hideTimer: newVal })
                        });
                        load();
                      } catch (e) { console.warn("Failed to update hideTimer:", e); }
                    }} style={{
                      width:36,height:20,borderRadius:10,
                      background:(activeClassData.hideTimer ?? true) ? T.teal : T.borderDark,
                      position:"relative",cursor:"pointer",transition:"background 0.2s"
                    }}>
                      <div style={{
                        width:16,height:16,borderRadius:8,background:T.white,position:"absolute",top:2,
                        left:(activeClassData.hideTimer ?? true) ? 18 : 2,transition:"left 0.2s",
                        boxShadow:"0 1px 3px rgba(0,0,0,0.3)"
                      }}/>
                    </div>
                  </label>
                  <label style={{display:"flex",alignItems:"center",gap:"0.4rem",fontSize:"0.78rem",color:T.textSecondary}}>
                    <span>Drill time</span>
                    <select value={activeClassData.drillDuration || 180} onChange={async (e) => {
                      const dur = parseInt(e.target.value);
                      try {
                        await fetch(`${API}/roster/class/${activeClassData.id}`, {
                          method:"PUT", headers:teacherHeaders(),
                          body: JSON.stringify({ drillDuration: dur })
                        });
                        load();
                      } catch (e) { console.warn("Failed to update drillDuration:", e); }
                    }} style={{
                      padding:"2px 6px",fontSize:"0.78rem",borderRadius:4,
                      border:`1px solid ${T.borderDark}`,background:T.white,cursor:"pointer"
                    }}>
                      <option value={60}>1 min</option>
                      <option value={120}>2 min</option>
                      <option value={180}>3 min</option>
                      <option value={300}>5 min</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            {/* Add students */}
            {!readOnly && (
            <div style={{background:T.white,borderBottom:`2px solid ${T.border}`,padding:"1rem 1.25rem",flexShrink:0}}>
              <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
                {[["one","Add One"],["paste","Paste List"],["csv","📄 Upload CSV"]].map(([key,lbl])=>(
                  <button key={key} onClick={()=>{setAddMode(key);setCsvPreview(null);setCsvErr("");}}
                    style={{...S.btn,background:addMode===key?T.teal:T.surfaceAlt,color:addMode===key?T.white:T.text,borderColor:addMode===key?T.teal:T.borderDark}}>
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
                    style={{...S.btn,background:oneInput.trim()?T.success:T.borderDark,color:T.white,border:"none",flexShrink:0}}>
                    {adding?"Adding…":"+ Add"}
                  </button>
                </div>
              ) : addMode==="paste" ? (
                <div>
                  <label style={S.lbl}>PASTE NAMES — one per line</label>
                  <textarea style={S.ta} value={pasteInput} onChange={e=>setPasteInput(e.target.value)}
                    placeholder={"Marcus Johnson\nAva Williams\nDeShawn Brown\nKeisha Davis"}/>
                  <button onClick={addStudents} disabled={adding||!pasteInput.trim()}
                    style={{...S.btn,marginTop:"0.5rem",background:pasteInput.trim()?T.teal:T.borderDark,color:T.white,border:"none",padding:"0.6rem 1.5rem"}}>
                    {adding?"Adding…":`+ Add ${pasteInput.split("\n").filter(n=>n.trim()).length} Student${pasteInput.split("\n").filter(n=>n.trim()).length!==1?"s":""}`}
                  </button>
                </div>
              ) : addMode==="csv" ? (
                <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
                  {/* Format hint */}
                  <div style={{background:T.surfaceAlt,borderRadius:"3px",padding:"0.6rem 0.9rem",fontSize:"0.76rem",color:T.textSecondary,lineHeight:1.6}}>
                    <strong>CSV format:</strong> one column — <code>name</code>. Header row optional. Example:<br/>
                    <code style={{display:"block",marginTop:"4px",color:T.midnight}}>
                      Marcus Johnson<br/>
                      Ava Williams<br/>
                      DeShawn Brown
                    </code>
                  </div>
                  {/* File picker */}
                  <input ref={csvRef} type="file" accept=".csv,.txt" onChange={handleCSVFile} style={{display:"none"}}/>
                  <button onClick={()=>csvRef.current?.click()}
                    style={{...S.btn,background:T.teal,color:T.white,border:"none",padding:"0.65rem",fontSize:"0.85rem",fontWeight:700}}>
                    📂 Choose CSV File
                  </button>
                  {csvErr && <div style={{background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:"3px",padding:"0.55rem 0.85rem",fontSize:"0.76rem",color:T.dangerText}}>⚠ {csvErr}</div>}
                  {/* Preview */}
                  {csvPreview && (
                    <div>
                      <div style={{fontSize:"0.75rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"6px"}}>
                        PREVIEW — {csvPreview.length} student{csvPreview.length!==1?"s":""}
                      </div>
                      <div style={{maxHeight:"160px",overflowY:"auto",border:`1px solid ${T.borderDark}`,borderRadius:"3px",background:T.surface}}>
                        {csvPreview.map((r,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.4rem 0.75rem",borderBottom:i<csvPreview.length-1?`1px solid ${T.border}`:"none"}}>
                            <span style={{fontSize:"0.82rem",fontWeight:600,flex:1}}>{r.name}</span>
                          </div>
                        ))}
                      </div>
                      <button onClick={importCSV} disabled={csvImporting}
                        style={{...S.btn,marginTop:"0.6rem",width:"100%",background:T.success,color:T.white,border:"none",padding:"0.65rem",fontSize:"0.85rem",fontWeight:700,opacity:csvImporting?0.7:1}}>
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
                <div style={{padding:"2rem",textAlign:"center",color:T.textSecondary,fontSize:"0.85rem"}}>No students yet.</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                  {activeClassData.students.map((s,i)=>(
                    <div key={s.id} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:"3px",padding:"0.6rem 0.9rem",display:"flex",alignItems:"center",gap:"0.75rem",flexWrap:"wrap"}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",background:T.teal,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{color:T.white,fontSize:"0.75rem",fontWeight:700}}>{i+1}</span>
                      </div>
                      <div style={{flex:1,fontSize:"0.88rem",fontWeight:600,color:T.text,minWidth:"120px"}}>
                        {s.name}
                        <span style={{display:"inline-flex",gap:"4px",marginLeft:"8px",verticalAlign:"middle"}}>
                          {s.extendedTime && s.extendedTime !== "none" && (
                            <span style={{background:T.tealLight,border:`1px solid ${T.border}`,borderRadius:"3px",padding:"1px 6px",fontSize:"0.75rem",fontWeight:700,color:T.midnight}}>
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
                        style={{...S.btn,padding:"2px 8px",fontSize:"0.75rem",color:T.midnight,borderColor:T.border,background:T.tealLight}}>IEP</button>
                      <button onClick={()=>removeStudent(activeClassData.id, s.id, s.name)}
                        style={{...S.btn,padding:"2px 8px",color:T.dangerText,borderColor:T.dangerBd,background:T.dangerBg,fontSize:"0.75rem"}}>✕</button>
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
            method:"POST", headers:teacherHeaders(),
            body: JSON.stringify({ name: courseName, teacherId: teacher?.teacherId || null, gcCourseId }),
          });
          const { id: newCid } = await r.json();
          await fetch(`${API}/roster/class/${newCid}/students`, {
            method:"POST", headers:teacherHeaders(),
            body: JSON.stringify({ students: students.map(s => ({ name: s.name })) }),
          });
          // Sync new classId into App state + sessionStorage
          if (onUpdateClassIds && teacher?.classIds !== null) {
            onUpdateClassIds([...(teacher.classIds || []), newCid]);
          }
          await load();
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
