import { useState, useEffect, useCallback, useRef } from "react";
import MathText from "./shared/MathText";
import { API, T, teacherHeaders } from "./shared/constants";

const MATH_STANDARDS = [
  "5.NR.1.1","5.NR.1.2","5.NR.2.1","5.NR.2.2",
  "5.NR.3.1","5.NR.3.2","5.NR.3.3","5.NR.3.4","5.NR.3.5","5.NR.3.6",
  "5.NR.4.1","5.NR.4.2","5.NR.4.3","5.NR.4.4","5.NR.5.1",
  "5.PAR.6.1","5.PAR.6.2",
  "5.MDR.7.1","5.MDR.7.2","5.MDR.7.3","5.MDR.7.4",
  "5.GSR.8.1","5.GSR.8.2","5.GSR.8.3","5.GSR.8.4",
];
const SCIENCE_STANDARDS = [
  // Earth & Space Science
  "S5E1.a","S5E1.b","S5E1.c",
  // Physical Science
  "S5P1.a","S5P1.b","S5P1.c",
  "S5P2.a","S5P2.b","S5P2.c",
  "S5P3.a","S5P3.b",
  // Life Science
  "S5L1.a","S5L1.b",
  "S5L2.a","S5L2.b",
  "S5L3.a","S5L3.b","S5L3.c",
  "S5L4.a","S5L4.b",
];
const STANDARDS_BY_SUBJECT = { math: MATH_STANDARDS, science: SCIENCE_STANDARDS };
const DOK_LABELS = { 1:"Recall", 2:"Skill/Concept", 3:"Strategic", 4:"Extended" };

const S = {
  inp:   { width:"100%", padding:"0.5rem 0.75rem", border:`1px solid ${T.border}`, borderRadius:T.xs, fontSize:"0.85rem", background:T.surface, boxSizing:"border-box" },
  lbl:   { display:"block", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.12em", color:T.textSecondary, marginBottom:"4px" },
  smBtn: { border:`1px solid ${T.border}`, borderRadius:T.xs, padding:"4px 10px", cursor:"pointer", fontSize:"0.75rem", fontWeight:600, background:T.surfaceAlt, color:T.text },
  ta:    { width:"100%", padding:"0.5rem 0.75rem", border:`1px solid ${T.border}`, borderRadius:T.xs, fontSize:"0.85rem", background:T.surface, boxSizing:"border-box", resize:"vertical", minHeight:"80px", fontFamily:T.font },
  code:  { fontFamily:"monospace", fontSize:"1.1rem", letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:700, color:T.midnight },
};

function genCode() {
  return Math.random().toString(36).substring(2,8).toUpperCase();
}

// ── Image paste zone ───────────────────────────────────────
function ImagePasteZone({ image, onImage, onClear }) {
  const ref = useRef();
  const handlePaste = useCallback(e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = ev => onImage(ev.target.result);
        reader.readAsDataURL(blob);
        return;
      }
    }
  }, [onImage]);

  const handleFileChange = useCallback(e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onImage(ev.target.result);
    reader.readAsDataURL(file);
  }, [onImage]);

  if (image) return (
    <div><label style={S.lbl}>QUESTION IMAGE</label>
      <div style={{ position:"relative", display:"inline-block" }}>
        <img src={image} alt="question diagram" style={{ maxWidth:"100%", maxHeight:"200px", borderRadius:T.xs, border:`1px solid ${T.border}`, display:"block" }} />
        <button onClick={onClear} style={{ position:"absolute", top:"4px", right:"4px", background:"rgba(0,0,0,.6)", color:"#fff", border:"none", borderRadius:"50%", width:"22px", height:"22px", cursor:"pointer", fontSize:"0.7rem" }}>✕</button>
      </div>
    </div>
  );

  return (
    <div><label style={S.lbl}>QUESTION IMAGE <span style={{fontWeight:400,color:T.textMuted}}>— optional</span></label>
      <div style={{ display:"flex", gap:"0.5rem", alignItems:"stretch" }}>
        <div ref={ref} tabIndex={0} onPaste={handlePaste} onClick={() => ref.current?.focus()}
          style={{ flex:1, border:`2px dashed ${T.border}`, borderRadius:T.xs, padding:"0.5rem 0.85rem", fontSize:"0.74rem", color:T.textMuted, cursor:"pointer", background:T.surface, outline:"none" }}
          onFocus={e => e.currentTarget.style.borderColor=T.teal}
          onBlur={e  => e.currentTarget.style.borderColor=T.border}>
          📋 Click here, then Ctrl+V / ⌘V to paste image
        </div>
        <label style={{ display:"flex", alignItems:"center", padding:"0 0.75rem", background:T.surfaceAlt, border:`1px solid ${T.border}`, borderRadius:T.xs, cursor:"pointer", fontSize:"0.74rem", color:T.textSecondary, whiteSpace:"nowrap" }}>
          📁 Browse
          <input type="file" accept="image/*" style={{ display:"none" }} onChange={handleFileChange} />
        </label>
      </div>
    </div>
  );
}

// ── Edit Question Modal ────────────────────────────────────
function EditModal({ question, onSave, onClose, teacher }) {
  const [q, setQ] = useState({
    ...question,
    subject: question.subject||"math",
    type: question.type||"mcq",
    zones: question.zones||["Category 1","Category 2"],
    items: question.items||[""],
    correct: question.correct||(question.type==="dragdrop"?{}:""),
  });
  const [saving, setSaving] = useState(false);
  const editStds = STANDARDS_BY_SUBJECT[q.subject] || MATH_STANDARDS;
  const isDragDrop = q.type === "dragdrop";

  function updateChoice(i, val) {
    const choices = [...(q.choices||[])]; choices[i] = val;
    setQ(p => ({ ...p, choices }));
  }

  function updateZone(i, val) {
    const zones = [...(q.zones||[])]; zones[i] = val;
    setQ(p => ({ ...p, zones }));
  }
  function addZone() { setQ(p => ({...p, zones: [...(p.zones||[]), `Category ${(p.zones||[]).length+1}`]})); }
  function removeZone(i) { setQ(p => ({...p, zones: (p.zones||[]).filter((_,j)=>j!==i)})); }

  function updateItem(i, val) {
    const items = [...(q.items||[])]; items[i] = val;
    setQ(p => ({ ...p, items }));
  }
  function addItem() { setQ(p => ({...p, items: [...(p.items||[]), ""]})); }
  function removeItem(i) {
    const item = (q.items||[])[i];
    setQ(p => {
      const items = (p.items||[]).filter((_,j)=>j!==i);
      const correct = {...(typeof p.correct==="object"&&!Array.isArray(p.correct)?p.correct:{})};
      delete correct[item];
      return {...p, items, correct};
    });
  }
  function setItemZone(item, zoneIdx) {
    setQ(p => ({...p, correct: {...(typeof p.correct==="object"&&!Array.isArray(p.correct)?p.correct:{}), [item]: zoneIdx}}));
  }

  async function handleSave() {
    if (!q.question.trim()) return;
    if (isDragDrop) {
      if ((q.zones||[]).length<2 || (q.items||[]).filter(x=>x.trim()).length<2) return;
      const correctMap = typeof q.correct==="object"&&!Array.isArray(q.correct)?q.correct:{};
      if ((q.items||[]).some(item=>correctMap[item]===undefined)) return;
    } else if (q.type === "hotspot") {
      if (!q.questionImage || (q.snapPoints||[]).length < 1 || (q.items||[]).length < 1 || !q.answer || Object.keys(q.answer).length < 1) return;
    } else if (q.type === "keypad") {
      if (q.answer == null || String(q.answer).trim() === "") return;
    } else if (q.type === "plotpoint") {
      if (!Array.isArray(q.answer) || q.answer.length !== 2) return;
    } else {
      if ((q.choices||[]).filter(c=>c.trim()).length < 2 || !(typeof q.correct==="string"&&q.correct.trim())) return;
    }
    setSaving(true);
    try {
      // Stamp author on new questions (don't overwrite if already set)
      const toSave = {
        ...q,
        createdBy:     q.createdBy     || teacher?.teacherId   || "",
        createdByName: q.createdByName || teacher?.teacherName || "",
      };
      await fetch(`${API}/questions`, { method:"POST", headers:teacherHeaders(), body:JSON.stringify(toSave) });
      onSave(toSave);
    } catch {}
    setSaving(false);
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"1rem"}}>
      <div style={{background:T.white,borderRadius:"6px",width:"100%",maxWidth:"650px",maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 8px 32px rgba(0,0,0,.25)"}}>
        <div style={{background:T.midnight,color:T.white,padding:"0.9rem 1.25rem",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div><div style={{fontSize:"0.6rem",opacity:.65,letterSpacing:"0.14em"}}>QUESTION BANK</div><div style={{fontSize:"1rem",fontWeight:700}}>Edit Question</div></div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:T.white,borderRadius:T.xs,padding:"5px 12px",cursor:"pointer",fontSize:"0.8rem"}}>✕ Cancel</button>
        </div>
        <div style={{overflowY:"auto",padding:"1.25rem",display:"flex",flexDirection:"column",gap:"0.85rem"}}>
          <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:"90px"}}><label style={S.lbl}>SUBJECT</label>
              <select style={S.inp} value={q.subject} onChange={e=>setQ(p=>({...p,subject:e.target.value,standard:STANDARDS_BY_SUBJECT[e.target.value]?.[0]||""}))}>
                <option value="math">Math</option>
                <option value="science">Science</option>
              </select>
            </div>
            <div style={{flex:2,minWidth:"120px"}}><label style={S.lbl}>STANDARD</label>
              <select style={S.inp} value={q.standard} onChange={e=>setQ(p=>({...p,standard:e.target.value}))}>
                {editStds.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:"80px"}}><label style={S.lbl}>DOK</label>
              <select style={S.inp} value={q.dok||""} onChange={e=>setQ(p=>({...p,dok:Number(e.target.value)}))}>
                <option value="">—</option>
                {[1,2,3,4].map(d=><option key={d} value={d}>{d} — {DOK_LABELS[d]}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:"100px"}}><label style={S.lbl}>TYPE</label>
              <select style={S.inp} value={q.type||"mcq"} onChange={e=>setQ(p=>({...p,type:e.target.value}))}>
                <option value="mcq">Multiple Choice</option>
                <option value="multiselect">Multi-Select</option>
                <option value="keypad">Keypad</option>
                <option value="dragdrop">Drag & Drop</option>
              </select>
            </div>
          </div>
          <div><label style={S.lbl}>SKILL LABEL</label>
            <input style={S.inp} value={q.short} onChange={e=>setQ(p=>({...p,short:e.target.value}))} placeholder="e.g. Add Fractions"/>
          </div>
          <div><label style={S.lbl}>QUESTION TEXT (use $...$ for math)</label>
            <textarea style={S.ta} value={q.question} onChange={e=>setQ(p=>({...p,question:e.target.value}))} rows={3}/>
            {q.question&&<div style={{marginTop:"4px",padding:"0.5rem 0.75rem",background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.85rem",fontFamily:"Georgia,serif"}}><MathText text={q.question}/></div>}
          </div>

          <ImagePasteZone image={q.questionImage} onImage={img=>setQ(p=>({...p,questionImage:img}))} onClear={()=>setQ(p=>({...p,questionImage:null}))} />

          {isDragDrop ? (
            <>
              {/* Zones (categories) */}
              <div>
                <label style={S.lbl}>DROP ZONES (categories)</label>
                <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                  {(q.zones||[]).map((zone,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                      <span style={{fontSize:"0.7rem",fontWeight:700,color:T.textSecondary,width:"16px"}}>{i+1}</span>
                      <input style={{...S.inp,flex:1}} value={zone} onChange={e=>updateZone(i,e.target.value)} placeholder={`Category ${i+1}`}/>
                      {(q.zones||[]).length>2 && <button onClick={()=>removeZone(i)} style={{...S.smBtn,color:T.dangerText,padding:"2px 6px"}}>✕</button>}
                    </div>
                  ))}
                </div>
                <button onClick={addZone} style={{...S.smBtn,marginTop:"0.4rem",fontSize:"0.7rem"}}>+ Add Zone</button>
              </div>
              {/* Items to drag */}
              <div>
                <label style={S.lbl}>ITEMS TO SORT — assign each to its correct zone</label>
                <div style={{display:"flex",flexDirection:"column",gap:"0.35rem"}}>
                  {(q.items||[]).map((item,i) => {
                    const correctMap = typeof q.correct==="object"&&!Array.isArray(q.correct)?q.correct:{};
                    return (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                        <input style={{...S.inp,flex:2}} value={item} onChange={e=>updateItem(i,e.target.value)} placeholder={`Item ${i+1}`}/>
                        <select style={{...S.inp,flex:1}} value={correctMap[item]??""} onChange={e=>setItemZone(item,Number(e.target.value))}>
                          <option value="">— assign —</option>
                          {(q.zones||[]).map((z,zi) => <option key={zi} value={zi}>{z}</option>)}
                        </select>
                        {(q.items||[]).length>1 && <button onClick={()=>removeItem(i)} style={{...S.smBtn,color:T.dangerText,padding:"2px 6px"}}>✕</button>}
                      </div>
                    );
                  })}
                </div>
                <button onClick={addItem} style={{...S.smBtn,marginTop:"0.4rem",fontSize:"0.7rem"}}>+ Add Item</button>
              </div>
            </>
          ) : (
          <div>
            <label style={S.lbl}>
              ANSWER CHOICES —{" "}
              {q.type==="multiselect"
                ? <span style={{fontWeight:400,color:T.textMuted}}>click checkboxes to mark all correct answers</span>
                : <span style={{fontWeight:400,color:T.textMuted}}>click letter to mark correct</span>}
            </label>
            <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
              {["A","B","C","D"].map((letter,i)=>{
                const isMultiSelect = q.type === "multiselect";
                const isCorrect = isMultiSelect
                  ? (Array.isArray(q.answer) && q.answer.includes(q.choices[i]) && !!q.choices[i])
                  : (q.correct === q.choices[i]);
                const toggle = () => {
                  if (isMultiSelect) {
                    const choice = q.choices[i];
                    if (!choice) return;
                    setQ(p => {
                      const cur = Array.isArray(p.answer) ? p.answer : [];
                      const next = cur.includes(choice) ? cur.filter(c=>c!==choice) : [...cur, choice];
                      return { ...p, answer: next };
                    });
                  } else {
                    setQ(p => ({ ...p, correct: p.choices[i] }));
                  }
                };
                return (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                    <div onClick={toggle}
                      style={{width:"24px",height:"24px",borderRadius:isMultiSelect?"4px":"50%",background:isCorrect?T.success:"#e8edf2",border:`2px solid ${isCorrect?T.success:"#bcc8d4"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer"}}>
                      <span style={{fontSize:"0.65rem",fontWeight:700,color:isCorrect?T.white:"#667"}}>{isMultiSelect&&isCorrect?"✓":letter}</span>
                    </div>
                    <input style={{...S.inp,flex:1,border:`1px solid ${isCorrect?T.success:T.border}`,background:isCorrect?T.successBg:T.surface}}
                      value={q.choices[i]} onChange={e=>updateChoice(i,e.target.value)} placeholder={`Choice ${letter}`}/>
                  </div>
                );
              })}
            </div>
            {q.type==="multiselect" && (
              <div style={{fontSize:"0.72rem",color:T.textSecondary,marginTop:"0.4rem"}}>
                {Array.isArray(q.answer) && q.answer.filter(Boolean).length > 0
                  ? <span>✓ {q.answer.filter(Boolean).length} correct answer{q.answer.filter(Boolean).length!==1?"s":""} selected</span>
                  : <span style={{color:T.dangerText}}>Select at least 2 correct answers</span>}
              </div>
            )}
          </div>
          )}
        </div>
        <div style={{padding:"0.9rem 1.25rem",borderTop:`1px solid ${T.border}`,display:"flex",gap:"0.65rem",justifyContent:"flex-end",flexShrink:0}}>
          <button onClick={onClose} style={{...S.smBtn,padding:"0.6rem 1.25rem"}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{background:T.teal,border:"none",borderRadius:T.xs,padding:"0.6rem 1.5rem",fontSize:"0.85rem",fontWeight:700,color:T.white,cursor:"pointer"}}>
            {saving?"Saving…":"💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Save Test Modal ────────────────────────────────────────
function SaveTestModal({ count, currentTitle, savedTests = [], onSave, onClose, editing, teacher }) {
  const isAdmin = teacher && (teacher.teacherRole === "super_admin" || teacher.teacherRole === "school_admin");
  const [name,      setName]      = useState(editing?.name || currentTitle || "");
  const [saving,    setSaving]    = useState(false);
  const [codeErr,   setCodeErr]   = useState("");
  const [adaptive,  setAdaptive]  = useState(editing?.adaptive || false);
  const [overwriteWarning, setOverwriteWarning] = useState(false);
  const [untimed,        setUntimed]        = useState(editing?.untimed || false);
  const [timeMins,       setTimeMins]       = useState(editing?.timeLimitSecs ? Math.round(editing.timeLimitSecs/60) : 30);
  const [warnMins,       setWarnMins]       = useState(editing?.warnSecs ? Math.round(editing.warnSecs/60) : 5);
  const [oneAttempt,       setOneAttempt]       = useState(editing?.oneAttempt       || false);
  const [shuffleQuestions, setShuffleQuestions] = useState(editing?.shuffleQuestions || false);
  const [shuffleChoices,   setShuffleChoices]   = useState(editing?.shuffleChoices   || false);
  const [classes,        setClasses]        = useState([]);
  const [assignedClassIds, setAssignedClassIds] = useState([]);
  // Visibility / GMAS fields
  const [visibility,      setVisibility]      = useState(editing?.visibility || "private");
  const [adminScoresOnly, setAdminScoresOnly] = useState(editing?.adminScoresOnly || false);
  const [closeDate,       setCloseDate]       = useState(editing?.closeDate || "");
  const [sharedWith,      setSharedWith]      = useState(editing?.sharedWith || []);
  const [allTeachers,     setAllTeachers]     = useState([]);

  useEffect(() => {
    fetch(`${API}/roster`).then(r=>r.json()).then(d=>setClasses(Array.isArray(d)?d:[])).catch(()=>{});
  }, []);

  useEffect(() => {
    if (visibility === "grade") {
      fetch(`${API}/teachers`).then(r=>r.json()).then(d=>setAllTeachers(Array.isArray(d)?d:[])).catch(()=>{});
    }
  }, [visibility]);

  function toggleClass(id) {
    setAssignedClassIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  const duplicate = savedTests.find(t =>
    t.name?.trim().toLowerCase() === name.trim().toLowerCase() && (!editing || t.id !== editing.id)
  );

  async function handleSave() {
    if (!name.trim()) { setCodeErr("Test name is required"); return; }
    if (duplicate && !overwriteWarning) { setOverwriteWarning(true); return; }
    setSaving(true);
    const timerCfg = {
      untimed,
      timeLimitSecs: untimed ? 0 : Math.max(1, timeMins) * 60,
      warnSecs:      untimed ? 0 : Math.max(1, warnMins) * 60,
      oneAttempt,
      shuffleQuestions,
      shuffleChoices,
      classIds: assignedClassIds,
      visibility,
      sharedWith: visibility === "grade" ? sharedWith : [],
      adminScoresOnly: visibility === "global" ? adminScoresOnly : false,
      closeDate: (visibility === "global" && adminScoresOnly && closeDate) ? closeDate : null,
    };
    const err = await onSave(name.trim(), editing?.code || "", adaptive, timerCfg);
    if (err) { setCodeErr(err); setSaving(false); setOverwriteWarning(false); }
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:T.white,borderRadius:"6px",width:"100%",maxWidth:"440px",maxHeight:"92vh",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.25)",display:"flex",flexDirection:"column"}}>
        <div style={{background:T.midnight,color:T.white,padding:"0.9rem 1.25rem",flexShrink:0}}>
          <div style={{fontSize:"0.6rem",opacity:.65,letterSpacing:"0.14em"}}>TEST LIBRARY</div>
          <div style={{fontSize:"1rem",fontWeight:700}}>{editing?"Edit Test":"Save Test"}</div>
        </div>
        <div style={{padding:"1.25rem",display:"flex",flexDirection:"column",gap:"0.85rem",overflowY:"auto",flex:1}}>
          <div><label style={S.lbl}>TEST NAME</label>
            <input style={S.inp} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Chapter 3 Fractions Quiz" autoFocus/>
          </div>
          {codeErr && <div style={{fontSize:"0.78rem",color:T.dangerText,background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,padding:"0.5rem 0.75rem"}}>⚠ {codeErr}</div>}
          <div>
            <label style={{display:"flex",alignItems:"center",gap:"0.75rem",cursor:"pointer",padding:"0.65rem 0.85rem",background:adaptive?T.successBg:T.surface,border:`1px solid ${adaptive?T.successBd:T.border}`,borderRadius:T.xs}}>
              <div onClick={()=>setAdaptive(a=>!a)}
                style={{width:"36px",height:"20px",borderRadius:"10px",background:adaptive?T.success:T.border,position:"relative",flexShrink:0,transition:"background .2s"}}>
                <div style={{position:"absolute",top:"2px",left:adaptive?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:T.white,transition:"left .2s"}}/>
              </div>
              <div>
                <div style={{fontSize:"0.82rem",fontWeight:700,color:adaptive?T.success:T.text}}>Adaptive Mode {adaptive?"ON":"OFF"}</div>
                <div style={{fontSize:"0.7rem",color:T.textSecondary,marginTop:"1px"}}>Questions adjust to each student's weak areas during the test</div>
              </div>
            </label>
          </div>
        <div style={{borderTop:"1px solid #eef1f4",paddingTop:"0.85rem"}}>
          <label style={{display:"flex",alignItems:"center",gap:"0.75rem",cursor:"pointer",marginBottom:"0.75rem",
            padding:"0.65rem 0.85rem",background:untimed?"#fff3cd":T.surface,
            border:`1px solid ${untimed?T.warningBd:T.border}`,borderRadius:T.xs}}
            onClick={()=>setUntimed(u=>!u)}>
            <div style={{width:"36px",height:"20px",borderRadius:"10px",background:untimed?"#b8860b":T.border,position:"relative",flexShrink:0,transition:"background .2s"}}>
              <div style={{position:"absolute",top:"2px",left:untimed?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:T.white,transition:"left .2s"}}/>
            </div>
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:untimed?T.warning:T.text}}>Untimed {untimed?"ON":"OFF"}</div>
              <div style={{fontSize:"0.7rem",color:T.textSecondary,marginTop:"1px"}}>No countdown — students work at their own pace</div>
            </div>
          </label>
          {!untimed && (
            <div style={{display:"flex",gap:"0.75rem"}}>
              <div style={{flex:1}}>
                <label style={{display:"block",fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"4px"}}>TIME LIMIT (minutes)</label>
                <input type="number" min="1" max="180" value={timeMins}
                  onChange={e=>setTimeMins(Math.max(1,Math.min(180,Number(e.target.value))))}
                  style={{...S.inp,fontFamily:"monospace",fontWeight:700,fontSize:"1rem"}}/>
              </div>
              <div style={{flex:1}}>
                <label style={{display:"block",fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"4px"}}>WARN AT (minutes left)</label>
                <input type="number" min="1" max={timeMins-1} value={warnMins}
                  onChange={e=>setWarnMins(Math.max(1,Math.min(timeMins-1,Number(e.target.value))))}
                  style={{...S.inp,fontFamily:"monospace",fontWeight:700,fontSize:"1rem"}}/>
              </div>
            </div>
          )}
        </div>
        {/* One Attempt toggle */}
        <div>
          <label style={{display:"flex",alignItems:"center",gap:"0.75rem",cursor:"pointer",padding:"0.65rem 0.85rem",
            background:oneAttempt?T.dangerBg:T.surface,
            border:`1px solid ${oneAttempt?T.dangerBd:T.border}`,borderRadius:T.xs}}
            onClick={()=>setOneAttempt(a=>!a)}>
            <div style={{width:"36px",height:"20px",borderRadius:"10px",background:oneAttempt?T.dangerText:T.border,position:"relative",flexShrink:0,transition:"background .2s"}}>
              <div style={{position:"absolute",top:"2px",left:oneAttempt?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:T.white,transition:"left .2s"}}/>
            </div>
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:oneAttempt?T.dangerText:T.text}}>
                One Attempt Only {oneAttempt?"ON":"OFF"}
              </div>
              <div style={{fontSize:"0.7rem",color:T.textSecondary,marginTop:"1px"}}>
                Students can only submit this test once. They cannot retake it.
              </div>
            </div>
          </label>
        </div>
        {/* Shuffle toggles */}
        <div style={{borderTop:"1px solid #eef1f4",paddingTop:"0.85rem",display:"flex",flexDirection:"column",gap:"0.5rem"}}>
          <label style={{display:"flex",alignItems:"center",gap:"0.75rem",cursor:"pointer",padding:"0.65rem 0.85rem",
            background:shuffleQuestions?"#e8f5e9":T.surface,
            border:`1px solid ${shuffleQuestions?T.successBd:T.border}`,borderRadius:T.xs}}
            onClick={()=>setShuffleQuestions(v=>!v)}>
            <div style={{width:"36px",height:"20px",borderRadius:"10px",background:shuffleQuestions?T.success:T.border,position:"relative",flexShrink:0,transition:"background .2s"}}>
              <div style={{position:"absolute",top:"2px",left:shuffleQuestions?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:T.white,transition:"left .2s"}}/>
            </div>
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:shuffleQuestions?T.success:T.text}}>Shuffle Question Order {shuffleQuestions?"ON":"OFF"}</div>
              <div style={{fontSize:"0.7rem",color:T.textSecondary,marginTop:"1px"}}>Each student sees questions in a different random order</div>
            </div>
          </label>
          <label style={{display:"flex",alignItems:"center",gap:"0.75rem",cursor:"pointer",padding:"0.65rem 0.85rem",
            background:shuffleChoices?"#e8f5e9":T.surface,
            border:`1px solid ${shuffleChoices?T.successBd:T.border}`,borderRadius:T.xs}}
            onClick={()=>setShuffleChoices(v=>!v)}>
            <div style={{width:"36px",height:"20px",borderRadius:"10px",background:shuffleChoices?T.success:T.border,position:"relative",flexShrink:0,transition:"background .2s"}}>
              <div style={{position:"absolute",top:"2px",left:shuffleChoices?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:T.white,transition:"left .2s"}}/>
            </div>
            <div>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:shuffleChoices?T.success:T.text}}>Shuffle Answer Choices {shuffleChoices?"ON":"OFF"}</div>
              <div style={{fontSize:"0.7rem",color:T.textSecondary,marginTop:"1px"}}>A/B/C/D order is randomized per student</div>
            </div>
          </label>
        </div>
        {/* Visibility */}
        <div style={{borderTop:"1px solid #eef1f4",paddingTop:"0.85rem"}}>
          <label style={S.lbl}>VISIBILITY</label>
          <div style={{display:"flex",gap:"0.5rem"}}>
            {[["private","🔒 Private","Only you can see and use this test"],["grade","👥 Grade","Share with specific teachers in your school"],isAdmin&&["global","🌐 Global","Available to all teachers (admin only)"]].filter(Boolean).map(([val,label,desc])=>(
              <button key={val} onClick={()=>setVisibility(val)} style={{flex:1,padding:"0.55rem 0.4rem",border:`2px solid ${visibility===val?"#1565c0":"#c8d3dd"}`,borderRadius:T.xs,background:visibility===val?"#e3f2fd":"#fff",cursor:"pointer",textAlign:"left"}}>
                <div style={{fontSize:"0.72rem",fontWeight:700,color:visibility===val?"#1565c0":T.text}}>{label}</div>
                <div style={{fontSize:"0.58rem",color:T.textSecondary,marginTop:"1px"}}>{desc}</div>
              </button>
            ))}
          </div>
          {/* Grade: teacher picker */}
          {visibility==="grade" && allTeachers.length > 0 && (
            <div style={{marginTop:"0.6rem"}}>
              <label style={S.lbl}>SHARE WITH TEACHERS</label>
              <div style={{maxHeight:"100px",overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.35rem 0.5rem",display:"flex",flexDirection:"column",gap:"3px"}}>
                {allTeachers.filter(t=>t.id !== teacher?.teacherId).map(t=>(
                  <label key={t.id} style={{display:"flex",alignItems:"center",gap:"0.5rem",cursor:"pointer",fontSize:"0.78rem"}}>
                    <input type="checkbox" checked={sharedWith.includes(t.id)} onChange={()=>setSharedWith(prev=>prev.includes(t.id)?prev.filter(x=>x!==t.id):[...prev,t.id])}/>
                    {t.name} <span style={{fontSize:"0.65rem",color:T.textSecondary}}>({t.email||t.id})</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {/* Global: GMAS Simulator options */}
          {visibility==="global" && isAdmin && (
            <div style={{marginTop:"0.6rem",background:"#fafafa",border:"1px solid #ddd",borderRadius:T.xs,padding:"0.65rem 0.85rem"}}>
              <label style={{display:"flex",alignItems:"center",gap:"0.75rem",cursor:"pointer"}} onClick={()=>setAdminScoresOnly(a=>!a)}>
                <div style={{width:"32px",height:"18px",borderRadius:"9px",background:adminScoresOnly?"#7b1fa2":"#bbb",position:"relative",flexShrink:0,transition:"background .2s"}}>
                  <div style={{position:"absolute",top:"2px",left:adminScoresOnly?"14px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
                </div>
                <div>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:adminScoresOnly?"#7b1fa2":T.text}}>🎯 GMAS Simulator {adminScoresOnly?"ON":"OFF"}</div>
                  <div style={{fontSize:"0.65rem",color:T.textSecondary}}>Scores visible to admin only — teachers see no results</div>
                </div>
              </label>
              {adminScoresOnly && (
                <div style={{marginTop:"0.55rem"}}>
                  <label style={S.lbl}>CLOSE DATE (students blocked after this date)</label>
                  <input type="date" value={closeDate} onChange={e=>setCloseDate(e.target.value)}
                    style={{...S.inp,fontFamily:"monospace"}}/>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
        {overwriteWarning && (
          <div style={{padding:"0.75rem 1.25rem",background:T.warningBg,borderTop:`1px solid ${T.warningBd}`}}>
            <div style={{fontSize:"0.82rem",color:T.warning,fontWeight:700,marginBottom:"4px"}}>
              ⚠ A test named "{name.trim()}" already exists.
            </div>
            <div style={{fontSize:"0.75rem",color:T.warning}}>
              This will save as a second copy with a different code. Click Save again to confirm.
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.25rem",borderTop:`1px solid ${T.border}`}}>
          <button onClick={()=>{ setOverwriteWarning(false); onClose(); }} style={{flex:1,background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:T.text}}>Cancel</button>
          <button onClick={handleSave} disabled={saving||!name.trim()}
            style={{flex:1,background:!name.trim()?T.border:overwriteWarning?"#b8860b":T.teal,border:"none",borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:!name.trim()?"not-allowed":"pointer",color:T.white,fontWeight:700}}>
            {saving?"Saving…":overwriteWarning?"Save Anyway →":editing?"💾 Update":"💾 Save"}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Assign Test Modal ──────────────────────────────────────
function AssignTestModal({ test, onDone, onClose, teacher, existingAssignments }) {
  const [classes,      setClasses]      = useState([]);
  const [selectedCls,  setSelectedCls]  = useState(null);
  const [studentChecks,setStudentChecks]= useState({});
  const [saving,       setSaving]       = useState(false);
  const [msg,          setMsg]          = useState("");

  useEffect(() => {
    const classFilter = teacher?.classIds?.length
      ? `?classIds=${teacher.classIds.join(",")}`
      : "";
    fetch(`${API}/roster${classFilter}`).then(r=>r.json()).then(d=>setClasses(Array.isArray(d)?d:[])).catch(()=>{});
  }, [teacher]);

  function selectClass(cls) {
    setSelectedCls(cls);
    // Check if assignment already exists for this test+class
    const existing = (existingAssignments||[]).find(a=>a.testId===test.id&&a.classId===cls.id);
    const checks = {};
    (cls.students||[]).forEach(s => {
      if (existing) {
        checks[s.id] = existing.studentIds.includes(s.id);
      } else {
        checks[s.id] = true; // all checked by default
      }
    });
    setStudentChecks(checks);
    setMsg("");
  }

  function toggleStudent(sid) {
    setStudentChecks(prev => ({...prev, [sid]: !prev[sid]}));
  }

  function selectAll() {
    const checks = {};
    (selectedCls.students||[]).forEach(s => { checks[s.id] = true; });
    setStudentChecks(checks);
  }

  function deselectAll() {
    const checks = {};
    (selectedCls.students||[]).forEach(s => { checks[s.id] = false; });
    setStudentChecks(checks);
  }

  async function handleAssign() {
    const studentIds = Object.entries(studentChecks).filter(([,v])=>v).map(([k])=>k);
    if (studentIds.length === 0) { setMsg("Select at least one student."); return; }
    setSaving(true);
    try {
      // Check for existing assignment for this test+class
      const existing = (existingAssignments||[]).find(a=>a.testId===test.id&&a.classId===selectedCls.id);
      if (existing) {
        // Update student list
        await fetch(`${API}/assignments/${existing.id}/students`, {
          method:"PATCH", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({studentIds})
        });
      } else {
        // Create new assignment
        await fetch(`${API}/assignments`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            testId: test.id,
            classId: selectedCls.id,
            studentIds,
            createdBy: teacher?.teacherId||"",
            createdByName: teacher?.teacherName||"",
          })
        });
      }
      onDone();
    } catch { setMsg("Failed to assign."); }
    setSaving(false);
  }

  const checkedCount = Object.values(studentChecks).filter(Boolean).length;
  const existing = selectedCls ? (existingAssignments||[]).find(a=>a.testId===test.id&&a.classId===selectedCls.id) : null;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
      <div style={{background:T.white,borderRadius:"6px",width:"100%",maxWidth:"460px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.25)"}}>
        <div style={{background:T.midnight,color:T.white,padding:"0.9rem 1.25rem"}}>
          <div style={{fontSize:"0.6rem",opacity:.65,letterSpacing:"0.14em"}}>ASSIGN TEST TO STUDENTS</div>
          <div style={{fontSize:"1rem",fontWeight:700}}>{test.name}</div>
        </div>
        <div style={{padding:"1.25rem"}}>
          {!selectedCls ? (
            <>
              <div style={{fontSize:"0.75rem",color:T.textSecondary,marginBottom:"0.75rem"}}>Select a class:</div>
              {classes.length===0 ? (
                <div style={{color:T.textMuted,fontSize:"0.82rem",padding:"1rem",textAlign:"center"}}>No classes found.</div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"4px",maxHeight:"300px",overflowY:"auto",marginBottom:"0.75rem"}}>
                  {classes.map(cls => {
                    const hasAssignment = (existingAssignments||[]).some(a=>a.testId===test.id&&a.classId===cls.id);
                    return (
                      <button key={cls.id} onClick={()=>selectClass(cls)}
                        style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.6rem 0.75rem",
                          border:`1px solid ${hasAssignment?"#2e7d32":T.border}`,borderRadius:T.xs,
                          background:hasAssignment?"#e8f5e9":T.surface,cursor:"pointer",textAlign:"left",width:"100%"}}>
                        <span style={{fontWeight:600,color:T.midnight,fontSize:"0.85rem",flex:1}}>{cls.name}</span>
                        <span style={{fontSize:"0.68rem",color:T.textSecondary}}>{cls.students?.length||0} students</span>
                        {hasAssignment&&<span style={{fontSize:"0.6rem",color:"#2e7d32",fontWeight:700}}>✓ Assigned</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              <button onClick={onClose} style={{width:"100%",background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600}}>Cancel</button>
            </>
          ) : (
            <>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.75rem"}}>
                <button onClick={()=>setSelectedCls(null)} style={{border:"none",background:"none",cursor:"pointer",fontSize:"0.85rem",color:T.teal,fontWeight:700}}>← Back</button>
                <span style={{fontWeight:700,color:T.midnight,fontSize:"0.9rem"}}>{selectedCls.name}</span>
                <span style={{marginLeft:"auto",fontSize:"0.72rem",color:T.textSecondary}}>{checkedCount}/{selectedCls.students?.length||0} selected</span>
              </div>
              {existing&&<div style={{fontSize:"0.7rem",color:"#2e7d32",background:"#e8f5e9",border:"1px solid #c8e6c9",borderRadius:T.xs,padding:"0.4rem 0.65rem",marginBottom:"0.5rem"}}>
                ✓ Already assigned — {existing.completedCount||0}/{existing.totalStudents||0} completed. Editing student list.
              </div>}
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.5rem"}}>
                <button onClick={selectAll} style={{fontSize:"0.68rem",border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"3px 8px",cursor:"pointer",background:T.surfaceAlt}}>Select All</button>
                <button onClick={deselectAll} style={{fontSize:"0.68rem",border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"3px 8px",cursor:"pointer",background:T.surfaceAlt}}>Deselect All</button>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"2px",maxHeight:"280px",overflowY:"auto",marginBottom:"0.75rem",border:`1px solid ${T.border}`,borderRadius:T.xs}}>
                {(selectedCls.students||[]).map(s => {
                  const on = !!studentChecks[s.id];
                  const completed = existing && (existing.completedIds||[]).includes(s.id);
                  return (
                    <label key={s.id} onClick={()=>toggleStudent(s.id)}
                      style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.4rem 0.65rem",
                        borderBottom:`1px solid ${T.border}`,background:on?T.white:"#f5f5f5",cursor:"pointer"}}>
                      <div style={{width:"15px",height:"15px",borderRadius:"3px",border:`2px solid ${on?T.teal:T.border}`,
                        background:on?T.teal:T.white,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {on&&<span style={{color:T.white,fontSize:"0.6rem",fontWeight:900}}>✓</span>}
                      </div>
                      <span style={{flex:1,fontWeight:on?600:400,color:on?T.text:"#999",fontSize:"0.82rem"}}>{s.name}</span>
                      {completed&&<span style={{fontSize:"0.6rem",color:"#2e7d32",fontWeight:700,background:"#e8f5e9",padding:"1px 6px",borderRadius:"3px"}}>✅ Done</span>}
                    </label>
                  );
                })}
              </div>
              {msg&&<div style={{fontSize:"0.72rem",color:"#e67e00",marginBottom:"0.5rem"}}>⚠ {msg}</div>}
              <div style={{display:"flex",gap:"0.65rem"}}>
                <button onClick={onClose} style={{flex:1,background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600}}>Cancel</button>
                <button onClick={handleAssign} disabled={saving||checkedCount===0}
                  style={{flex:1,background:T.teal,border:"none",borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",color:T.white,fontWeight:700,opacity:saving?0.7:1}}>
                  {saving?"Assigning…":`Assign to ${checkedCount} Students →`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main TestBuilder ───────────────────────────────────────
// ── Teacher Preview Modal ─────────────────────────────────
function TestPreviewModal({ test, bank, onClose }) {
  const questions = (test.questionIds || [])
    .map(id => bank.find(q => q.id === id))
    .filter(Boolean);

  const [cur,      setCur]      = useState(0);
  const [answers,  setAnswers]  = useState({}); // qId → chosen value
  const [revealed, setRevealed] = useState({}); // qId → bool
  const [done,     setDone]     = useState(false);

  const q        = questions[cur];
  const chosen   = q ? answers[q.id] : null;
  const isReveal = q ? !!revealed[q.id] : false;
  const correct  = q ? (q.correct || q.answer) : null;

  function choose(val) {
    if (isReveal) return;
    setAnswers(a => ({ ...a, [q.id]: val }));
    setRevealed(r => ({ ...r, [q.id]: true }));
  }

  function next() {
    if (cur < questions.length - 1) setCur(c => c + 1);
    else setDone(true);
  }

  function prev() { setCur(c => Math.max(0, c - 1)); }
  function restart() { setCur(0); setAnswers({}); setRevealed({}); setDone(false); }

  const score = questions.filter(q => {
    const a = answers[q.id];
    const c = q.correct || q.answer;
    return a != null && String(a).trim().toLowerCase() === String(c).trim().toLowerCase();
  }).length;

  const letters = ["a","b","c","d"];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
      <div style={{background:"#f8fafc",borderRadius:"8px",width:"100%",maxWidth:"680px",maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden",boxShadow:"0 16px 60px rgba(0,0,0,.35)"}}>

        {/* Header */}
        <div style={{background:"#7c3aed",color:"#fff",padding:"0.85rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
          <div style={{flex:1}}>
            <div style={{fontSize:"0.55rem",opacity:.7,letterSpacing:"0.14em"}}>TEACHER PREVIEW — NOT RECORDED</div>
            <div style={{fontSize:"1rem",fontWeight:700}}>{test.name || "Untitled"}</div>
          </div>
          {!done && <div style={{fontSize:"0.72rem",opacity:.8}}>{cur+1} / {questions.length}</div>}
          <button onClick={onClose} style={{background:"rgba(255,255,255,.18)",border:"none",color:"#fff",borderRadius:"4px",padding:"5px 11px",cursor:"pointer",fontSize:"0.8rem"}}>✕ Close</button>
        </div>

        {questions.length === 0 ? (
          <div style={{padding:"3rem",textAlign:"center",color:"#888"}}>
            <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📭</div>
            <div style={{fontWeight:600}}>No questions found in bank for this test.</div>
            <div style={{fontSize:"0.8rem",marginTop:"4px"}}>Questions may have been deleted from the bank.</div>
          </div>
        ) : done ? (
          /* ── Results ── */
          <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"2rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1rem"}}>
            <div style={{fontSize:"3rem"}}>{score === questions.length ? "🎉" : score >= questions.length * 0.8 ? "✅" : "📋"}</div>
            <div style={{fontSize:"1.6rem",fontWeight:800,color:"#0f172a"}}>{Math.round(score/questions.length*100)}%</div>
            <div style={{fontSize:"0.85rem",color:"#666"}}>{score} / {questions.length} correct</div>
            <div style={{width:"100%",maxWidth:"420px",background:"#fff",border:"1px solid #e2e8f0",borderRadius:"8px",overflow:"hidden",marginTop:"0.5rem"}}>
              {questions.map((q, i) => {
                const a = answers[q.id];
                const c = q.correct || q.answer;
                const ok = a != null && String(a).trim().toLowerCase() === String(c).trim().toLowerCase();
                return (
                  <div key={q.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.55rem 1rem",borderBottom:"1px solid #f1f5f9",fontSize:"0.78rem"}}>
                    <span style={{width:"20px",height:"20px",borderRadius:"50%",background:a==null?"#e2e8f0":ok?"#dcfce7":"#fee2e2",border:`1.5px solid ${a==null?"#cbd5e1":ok?"#16a34a":"#dc2626"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:"0.65rem",fontWeight:700,color:a==null?"#94a3b8":ok?"#16a34a":"#dc2626"}}>
                      {a==null?"—":ok?"✓":"✗"}
                    </span>
                    <span style={{flex:1,color:"#334155",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>Q{i+1}: <MathText text={q.question}/></span>
                    {!ok && <span style={{fontSize:"0.68rem",color:"#16a34a",fontWeight:600}}>Key: <MathText text={String(c)}/></span>}
                  </div>
                );
              })}
            </div>
            <div style={{display:"flex",gap:"0.75rem",marginTop:"0.5rem"}}>
              <button onClick={restart} style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:"6px",padding:"0.65rem 1.5rem",fontWeight:700,cursor:"pointer",fontSize:"0.9rem"}}>↺ Retake</button>
              <button onClick={onClose} style={{background:"#f1f5f9",color:"#334155",border:"1px solid #e2e8f0",borderRadius:"6px",padding:"0.65rem 1.5rem",fontWeight:600,cursor:"pointer",fontSize:"0.9rem"}}>Done</button>
            </div>
          </div>
        ) : (
          /* ── Question ── */
          <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"1.5rem 1.25rem 1rem"}}>
            {/* Progress bar */}
            <div style={{height:"4px",background:"#e2e8f0",borderRadius:"2px",marginBottom:"1.25rem"}}>
              <div style={{width:`${(cur/questions.length)*100}%`,height:"100%",background:"#7c3aed",borderRadius:"2px",transition:"width .2s"}}/>
            </div>

            {/* Standard / DOK badge */}
            <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
              {q.standard && <span style={{fontSize:"0.6rem",fontWeight:700,background:"#ede9fe",color:"#5b21b6",borderRadius:"3px",padding:"2px 7px"}}>{q.standard}</span>}
              {q.dok && <span style={{fontSize:"0.6rem",fontWeight:700,background:"#fef9c3",color:"#713f12",borderRadius:"3px",padding:"2px 7px"}}>DOK {q.dok}</span>}
            </div>

            {/* Question card */}
            <div style={{background:"#fff",border:"1px solid #e2e8f0",borderTop:"4px solid #7c3aed",borderRadius:"6px",padding:"1.25rem 1.5rem",marginBottom:"1rem",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
              <p style={{fontSize:"1.05rem",fontFamily:"Georgia,serif",color:"#0f0f0f",lineHeight:1.75,margin:0}}>
                <MathText text={q.question}/>
              </p>
            </div>

            {/* Choices */}
            {(q.choices || []).length > 0 && (
              <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:"6px",overflow:"hidden",marginBottom:"1rem"}}>
                {(q.choices || []).map((choice, i) => {
                  const isChosen  = chosen === choice;
                  const isCorrect = String(choice) === String(correct);
                  let rowBg = "transparent", textColor = "#334155";
                  let circleBg = "#fff", circleBd = "#94a3b8", circleColor = "#445";
                  let circleLabel = letters[i] || String(i+1);
                  if (isReveal) {
                    if (isCorrect)     { rowBg="#f0fdf4"; textColor="#166534"; circleBg="#16a34a"; circleBd="#16a34a"; circleColor="#fff"; circleLabel="✓"; }
                    else if (isChosen) { rowBg="#fef2f2"; textColor="#991b1b"; circleBg="#dc2626"; circleBd="#dc2626"; circleColor="#fff"; circleLabel="✗"; }
                    else               { textColor="#94a3b8"; circleBd="#e2e8f0"; circleColor="#94a3b8"; }
                  } else if (isChosen) { rowBg="#eef4fb"; circleBg="#0f172a"; circleBd="#0f172a"; circleColor="#fff"; }
                  return (
                    <button key={i} onClick={() => choose(choice)}
                      style={{background:rowBg,border:"none",borderBottom:"1px solid #f1f5f9",padding:"0.75rem 1.25rem",textAlign:"left",cursor:isReveal?"default":"pointer",display:"flex",alignItems:"center",gap:"1rem",width:"100%",transition:"background .1s"}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",border:`1.5px solid ${circleBd}`,background:circleBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:"0.72rem",fontWeight:700,color:circleColor}}>{circleLabel}</span>
                      </div>
                      <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",color:textColor,flex:1}}><MathText text={choice}/></span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Key answer for non-MCQ */}
            {isReveal && (q.choices || []).length === 0 && (
              <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:"6px",padding:"0.75rem 1rem",marginBottom:"1rem",fontSize:"0.88rem",color:"#166534",fontWeight:600}}>
                ✓ Answer key: <MathText text={String(correct)}/>
              </div>
            )}

            {/* Feedback / nav */}
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginTop:"0.5rem"}}>
              <button onClick={prev} disabled={cur===0}
                style={{background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:"6px",padding:"0.6rem 1rem",fontSize:"0.85rem",fontWeight:600,cursor:cur===0?"not-allowed":"pointer",color:cur===0?"#cbd5e1":"#334155"}}>← Back</button>
              <div style={{flex:1}}/>
              {!isReveal && (q.choices||[]).length === 0 && (
                <button onClick={() => setRevealed(r => ({...r, [q.id]: true}))}
                  style={{background:"#f1f5f9",border:"1px solid #e2e8f0",borderRadius:"6px",padding:"0.6rem 1.1rem",fontSize:"0.85rem",fontWeight:600,cursor:"pointer",color:"#334155"}}>Show Answer</button>
              )}
              {isReveal && (
                <button onClick={next}
                  style={{background:"#7c3aed",color:"#fff",border:"none",borderRadius:"6px",padding:"0.6rem 1.25rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer"}}>
                  {cur < questions.length - 1 ? "Next →" : "See Results"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TestBuilder({ teacher, readOnly }) {
  const isAdmin = teacher && (teacher.teacherRole === "super_admin" || teacher.teacherRole === "school_admin");
  const [bank, setBank]               = useState([]);
  const [selected, setSelected]       = useState([]);
  const [loading, setLoading]         = useState(true);

  const [testTitle, setTestTitle]     = useState("Grade 5 Math — Practice");
  const [editingQ, setEditingQ]       = useState(null);
  const [confirmDelete,     setConfirmDelete]     = useState(null);
  const [confirmDeleteTest, setConfirmDeleteTest] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savedTests, setSavedTests]   = useState([]);
  const [allClasses,  setAllClasses]  = useState([]);
  const [assigningTest, setAssigningTest] = useState(null); // test id being assigned
  const [savedMsg, setSavedMsg]       = useState("");
  const [libSearch,     setLibSearch]     = useState("");
  const [libSort,       setLibSort]       = useState("newest");
  const [showArchived,  setShowArchived]  = useState(false);
  const [myTestsOnly,   setMyTestsOnly]   = useState(true);
  const [previewTest, setPreviewTest] = useState(null); // test object to preview
  const [rightTab, setRightTab]       = useState("current");
  const [testAssignments, setTestAssignments] = useState([]);
  const [editingTestId, setEditingTestId]   = useState(null); // non-null = editing existing test
  const [activeSessions,  setActiveSessions] = useState({}); // testCode → control dict
  const [waitingCounts,   setWaitingCounts]  = useState({}); // testCode → # students waiting
  const [expandedAssign,  setExpandedAssign] = useState(null); // assignment id with expanded not-completed list
  const [makeupLoading,   setMakeupLoading]  = useState(null); // student id being processed

  const [subject,      setSubject]    = useState("math");
  const [filterStd,    setFilterStd]  = useState("");
  const [filterDok,    setFilterDok]  = useState("");
  const [filterText,   setFilterText] = useState("");
  const [filterAuthor, setFilterAuthor] = useState("");
  const [autoCount,  setAutoCount]  = useState(10);
  const activeStandards = STANDARDS_BY_SUBJECT[subject] || MATH_STANDARDS;


  const loadBank = useCallback(async () => {
    try { const r=await fetch(`${API}/questions`); setBank(await r.json()); }
    catch { setBank([]); }
    setLoading(false);
  }, []);

  const loadActive = useCallback(async () => {
    try {
      const r=await fetch(`${API}/test/active`); const t=await r.json();
      setSelected((t.questions||[]).map(q=>q.id));
      setTestTitle(t.title||"Grade 5 Math — Practice");
    } catch {}
  }, []);

  const loadSavedTests = useCallback(async (archived = false) => {
    try {
      const params = new URLSearchParams();
      if (teacher?.teacherId) { params.set("teacherId", teacher.teacherId); params.set("role", teacher.teacherRole||"teacher"); }
      if (archived) params.set("showArchived", "true");
      const r = await fetch(`${API}/tests/saved?${params}`);
      setSavedTests(await r.json());
    } catch { setSavedTests([]); }
  }, [teacher]);

  const loadAssignments = useCallback(async () => {
    try {
      const classFilter = teacher?.classIds?.length ? `?classIds=${teacher.classIds.join(",")}` : "";
      const r=await fetch(`${API}/assignments${classFilter}`);
      setTestAssignments(await r.json());
    } catch { setTestAssignments([]); }
  }, [teacher]);

  const loadActiveSessions = useCallback(async () => {
    try {
      const codes = [...new Set((testAssignments||[]).map(a=>a.testCode).filter(Boolean))];
      if (!codes.length) return;
      const results = {}; const counts = {};
      await Promise.all(codes.map(async code => {
        try {
          const r = await fetch(`${API}/test/control?code=${encodeURIComponent(code)}`);
          const d = await r.json();
          if (d.launchedAt) results[code] = d;
          const ar = await fetch(`${API}/active?code=${encodeURIComponent(code)}`);
          const ad = await ar.json();
          counts[code] = (Array.isArray(ad)?ad:[]).filter(s=>s.phase==="waiting").length;
        } catch {}
      }));
      setActiveSessions(results);
      setWaitingCounts(counts);
    } catch {}
  }, [testAssignments]);

  async function launchSession(testCode, classId) {
    try {
      await fetch(`${API}/test/control`, {
        method:"POST", headers:teacherHeaders(),
        body: JSON.stringify({ code:testCode, classId, action:"launch" }),
      });
      await loadActiveSessions();
    } catch {}
  }

  async function beginTesting(testCode) {
    try {
      await fetch(`${API}/test/control`, {
        method:"POST", headers:teacherHeaders(),
        body: JSON.stringify({ code:testCode, action:"begin" }),
      });
      await loadActiveSessions();
    } catch {}
  }

  async function endSession(testCode) {
    if (!window.confirm(`End the live session for code ${testCode}?`)) return;
    try {
      await fetch(`${API}/test/control`, {
        method:"POST", headers:teacherHeaders(),
        body: JSON.stringify({ code:testCode, action:"end" }),
      });
      setActiveSessions(s=>{ const n={...s}; delete n[testCode]; return n; });
      setWaitingCounts(s=>{ const n={...s}; delete n[testCode]; return n; });
    } catch {}
  }

  async function giveMakeup(assignmentId, studentId) {
    setMakeupLoading(studentId);
    try {
      await fetch(`${API}/assignments/${assignmentId}/makeup`, {
        method:"PATCH", headers:teacherHeaders(),
        body: JSON.stringify({ studentId }),
      });
      await loadAssignments();
    } catch {}
    setMakeupLoading(null);
  }

  useEffect(()=>{
    loadBank(); loadActive(); loadSavedTests(showArchived); loadAssignments();
    const classFilter = teacher?.classIds !== null
      ? `?classIds=${teacher.classIds.join(",")}`
      : "";
    fetch(`${API}/roster${classFilter}`).then(r=>r.json()).then(d=>setAllClasses(Array.isArray(d)?d:[])).catch(()=>{});
  },[loadBank,loadActive,loadSavedTests,loadAssignments,showArchived]);

  // Poll active sessions every 5s when library tab is open
  useEffect(()=>{
    if (rightTab !== "library") return;
    loadActiveSessions();
    const t = setInterval(loadActiveSessions, 5000);
    return ()=>clearInterval(t);
  },[rightTab, loadActiveSessions]);

  const filtered = bank.filter(q => {
    const qSubject = q.subject || "math";
    if (qSubject !== subject) return false;
    if (filterStd  && !q.standard?.startsWith(filterStd)) return false;
    if (filterDok  && q.dok !== Number(filterDok))         return false;
    if (filterText) {
      const t = filterText.toLowerCase();
      const matchesId = q.id?.toLowerCase().includes(t);
      const matchesQ  = q.question?.toLowerCase().includes(t);
      const matchesS  = q.short?.toLowerCase().includes(t);
      if (!matchesId && !matchesQ && !matchesS) return false;
    }
    if (filterAuthor) {
      const a = filterAuthor.toLowerCase();
      if (!(q.createdByName||"").toLowerCase().includes(a)) return false;
    }
    return true;
  });

  const selectedQuestions = selected.map(id=>bank.find(q=>q.id===id)).filter(Boolean);
  const isSelected = id => selected.includes(id);

  function toggleSelect(q) { setSelected(s=>s.includes(q.id)?s.filter(x=>x!==q.id):[...s,q.id]); }
  function moveUp(i)       { setSelected(s=>{const a=[...s];[a[i-1],a[i]]=[a[i],a[i-1]];return a;}); }
  function moveDown(i)     { setSelected(s=>{const a=[...s];[a[i],a[i+1]]=[a[i+1],a[i]];return a;}); }
  function removeFromTest(id) { setSelected(s=>s.filter(x=>x!==id)); }

  function autoFill() {
    const needed=autoCount-selected.length; if(needed<=0)return;
    const candidates=filtered.filter(q=>!selected.includes(q.id));
    const shuffled=[...candidates].sort(()=>Math.random()-.5);
    setSelected(s=>[...s,...shuffled.slice(0,needed).map(q=>q.id)]);
  }

  async function deleteQuestion(id) {
    try { await fetch(`${API}/questions/${id}`,{method:"DELETE",headers:teacherHeaders()}); setBank(b=>b.filter(q=>q.id!==id)); setSelected(s=>s.filter(x=>x!==id)); }
    catch {}
    setConfirmDelete(null);
  }

  function handleSaveEdit(updated) { setBank(b=>b.map(q=>q.id===updated.id?updated:q)); setEditingQ(null); }

  async function assignClasses(testId, classIds) {
    const t = savedTests.find(x => x.id === testId);
    if (!t) return;
    try {
      await fetch(`${API}/tests/saved/${testId}`, {
        method:"PUT", headers:teacherHeaders(),
        body: JSON.stringify({...t, classIds})
      });
      await loadSavedTests();
    } catch {}
    setAssigningTest(null);
  }

  async function saveTest(name, code, adaptive=false, timerCfg={}) {
    try {
      const tParams = teacher?.teacherId ? `?teacherId=${teacher.teacherId}&role=${teacher.teacherRole||"teacher"}` : "";
      const body = {
        name, code, title:testTitle, questions:selectedQuestions, adaptive, subject, ...timerCfg,
        createdBy:     editingTestId ? (editingTestId.createdBy || teacher?.teacherId || "") : (teacher?.teacherId || ""),
        createdByName: editingTestId ? (editingTestId.createdByName || teacher?.teacherName || "") : (teacher?.teacherName || ""),
      };
      const url = editingTestId
        ? `${API}/tests/saved/${editingTestId.id}${tParams}`
        : `${API}/tests/saved${tParams}`;
      const method = editingTestId ? "PUT" : "POST";
      const r = await fetch(url,{method,headers:teacherHeaders(),body:JSON.stringify(body)});
      if (!r.ok) { const err = await r.json().catch(()=>({})); return err.detail || `Server error (${r.status})`; }
      const data = await r.json();
      await loadSavedTests();
      setSavedMsg(editingTestId ? `Updated! Code: ${data.code}` : `Saved! Code: ${data.code}`);
      setEditingTestId(null);
      setTimeout(()=>setSavedMsg(""),5000);
      setShowSaveModal(false);
    } catch { return "Save failed"; }
  }


  async function loadSavedTest(id, forEdit=false) {
    try {
      const p = teacher?.teacherId ? `?teacherId=${teacher.teacherId}&role=${teacher.teacherRole||"teacher"}` : "";
      const r = await fetch(`${API}/tests/saved/${id}${p}`);
      const t = await r.json();
      setSelected((t.questions||[]).map(q=>q.id));
      setTestTitle(t.title||t.name||"");
      setRightTab("current");
      if (forEdit) setEditingTestId({
        id, name:t.name, code:t.code, adaptive:!!t.adaptive, untimed:!!t.untimed,
        timeLimitSecs:t.timeLimitSecs, warnSecs:t.warnSecs, oneAttempt:!!t.oneAttempt,
        visibility:t.visibility||"private", sharedWith:t.sharedWith||[],
        adminScoresOnly:!!t.adminScoresOnly, closeDate:t.closeDate||"",
        createdBy:t.createdBy||"", createdByName:t.createdByName||"",
      });
      else setEditingTestId(null);
    } catch {}
  }

  async function deleteAssignment(aid) {
    try { await fetch(`${API}/assignments/${aid}`,{method:"DELETE"}); await loadAssignments(); }
    catch {}
  }

  async function deleteSavedTest(id) {
    try {
      const p = teacher?.teacherId ? `?teacherId=${teacher.teacherId}&role=${teacher.teacherRole||"teacher"}` : "";
      const r = await fetch(`${API}/tests/saved/${id}${p}`,{method:"DELETE",headers:teacherHeaders()});
      if (!r.ok) {
        const d = await r.json().catch(()=>({}));
        alert(d.detail || "Cannot delete this test.");
        return;
      }
      setSavedTests(s=>s.filter(t=>t.id!==id));
    } catch {}
  }

  async function archiveTest(t) {
    const newVal = !t.archived;
    try {
      await fetch(`${API}/tests/saved/${t.id}/archive`, {
        method: "PATCH",
        headers: {"Content-Type":"application/json", ...teacherHeaders()},
        body: JSON.stringify({ archived: newVal }),
      });
      if (newVal && !showArchived) {
        setSavedTests(s => s.filter(x => x.id !== t.id));
      } else {
        setSavedTests(s => s.map(x => x.id === t.id ? {...x, archived: newVal} : x));
      }
    } catch {}
  }

  async function duplicateSavedTest(id) {
    try {
      const p = teacher?.teacherId ? `?teacherId=${teacher.teacherId}&role=${teacher.teacherRole||"teacher"}` : "";
      const r = await fetch(`${API}/tests/saved/${id}${p}`);
      const t = await r.json();
      const body = {
        name: `${t.name} (copy)`, questions: t.questions||[], title: t.title||"",
        adaptive: t.adaptive||false, untimed: t.untimed||false, timeLimitSecs: t.timeLimitSecs||1800,
        warnSecs: t.warnSecs||300, oneAttempt: t.oneAttempt||false, classIds: [],
        subject: t.subject||"math",
        createdBy: teacher?.teacherId||"", createdByName: teacher?.teacherName||"",
        visibility: "private", sharedWith: [], adminScoresOnly: false, closeDate: null,
      };
      const cp = teacher?.teacherId ? `?teacherId=${teacher.teacherId}&role=${teacher.teacherRole||"teacher"}` : "";
      await fetch(`${API}/tests/saved${cp}`, { method:"POST", headers:teacherHeaders(), body: JSON.stringify(body) });
      await loadSavedTests();
    } catch {}
  }

  if (loading) return <div style={{padding:"3rem",textAlign:"center",color:T.textMuted}}>Loading question bank…</div>;

  return (
    <div style={{display:"flex",height:"100%",fontFamily:T.font,background:"#e8edf2",overflow:"hidden"}}>

      {/* ── Left: Bank browser ── */}
      <div style={{width:"55%",display:"flex",flexDirection:"column",borderRight:`2px solid ${T.border}`,overflow:"hidden"}}>
        <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"0.75rem 1rem",display:"flex",flexDirection:"column",gap:"0.5rem",flexShrink:0}}>
          <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.midnight}}>QUESTION BANK</div>
            <span style={{fontSize:"0.7rem",color:T.textMuted}}>{bank.length} total · {filtered.length} shown</span>
            <div style={{marginLeft:"auto",display:"flex",borderRadius:T.xs,overflow:"hidden",border:`1px solid ${T.border}`}}>
              {[["math","Math"],["science","Science"]].map(([key,lbl])=>(
                <button key={key} onClick={()=>{setSubject(key);setFilterStd("");}}
                  style={{padding:"3px 12px",fontSize:"0.72rem",fontWeight:600,border:"none",cursor:"pointer",
                    background:subject===key?T.midnight:T.surfaceAlt,color:subject===key?T.white:T.textSecondary}}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
            <select style={{...S.inp,flex:2,minWidth:"120px"}} value={filterStd} onChange={e=>setFilterStd(e.target.value)}>
              <option value="">All Standards</option>
              {activeStandards.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select style={{...S.inp,flex:1,minWidth:"100px"}} value={filterDok} onChange={e=>setFilterDok(e.target.value)}>
              <option value="">All DOK</option>
              {[1,2,3,4].map(d=><option key={d} value={d}>DOK {d}</option>)}
            </select>
            <input style={{...S.inp,flex:2,minWidth:"120px"}} value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder="Search by ID, keyword…"/>
            <input style={{...S.inp,flex:2,minWidth:"120px"}} value={filterAuthor} onChange={e=>setFilterAuthor(e.target.value)} placeholder="Filter by author…"/>
          </div>
          <div style={{display:"flex",gap:"0.5rem",alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.72rem",color:T.textSecondary}}>
              Auto-fill <input type="number" min={1} max={50} value={autoCount} onChange={e=>setAutoCount(Number(e.target.value))}
                style={{width:"42px",padding:"2px 5px",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.78rem",textAlign:"center"}}/> questions
            </span>
            <button onClick={autoFill} style={{...S.smBtn,background:T.teal,color:T.white,borderColor:T.teal}}>⚡ Auto-fill</button>
            <button onClick={()=>setSelected([])} style={{...S.smBtn,color:T.dangerText,borderColor:T.dangerBd}}>Clear All</button>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"0.75rem"}}>
          {bank.length===0?(
            <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"3rem",textAlign:"center",color:T.textMuted}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📭</div>
              <div style={{fontWeight:600,color:T.textSecondary}}>Question bank is empty</div>
              <div style={{fontSize:"0.82rem",marginTop:"4px"}}>Use the Question Builder or PDF Importer to add questions.</div>
            </div>
          ):filtered.length===0?(
            <div style={{padding:"2rem",textAlign:"center",color:T.textMuted,fontSize:"0.85rem"}}>No questions match your filters.</div>
          ):(
            filtered.map(q=>{
              const sel=isSelected(q.id);
              return (
                <div key={q.id} style={{background:sel?T.tealLight:T.white,border:`2px solid ${sel?T.midnight:T.border}`,borderRadius:T.xs,padding:"0.7rem 1rem",marginBottom:"0.5rem",display:"flex",alignItems:"flex-start",gap:"0.75rem"}}>
                  <div onClick={()=>toggleSelect(q)} style={{width:"20px",height:"20px",borderRadius:T.xs,border:`2px solid ${sel?T.midnight:"#bcc8d4"}`,background:sel?T.midnight:T.white,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"2px",cursor:"pointer"}}>
                    {sel&&<span style={{color:T.white,fontSize:"0.7rem",fontWeight:700}}>✓</span>}
                  </div>
                  <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>toggleSelect(q)}>
                    <div style={{display:"flex",gap:"0.4rem",marginBottom:"3px",flexWrap:"wrap",alignItems:"center"}}>
                      {q.id&&<span style={{fontSize:"0.65rem",fontWeight:700,fontFamily:"monospace",color:T.white,background:T.midnight,padding:"1px 7px",borderRadius:T.xs,letterSpacing:"0.05em"}}>{q.id}</span>}
                      <span style={{fontSize:"0.6rem",fontWeight:700,color:T.midnight,background:T.tealLight,padding:"1px 6px",borderRadius:"2px",border:`1px solid ${T.border}`}}>{q.standard}</span>
                      {q.dok&&<span style={{fontSize:"0.6rem",fontWeight:700,color:T.warning,background:"#fff3cd",padding:"1px 6px",borderRadius:"2px",border:`1px solid ${T.warningBd}`}}>DOK {q.dok}</span>}
                      {q.type&&q.type!=="mcq"&&<span style={{fontSize:"0.58rem",fontWeight:700,color:"#6d28d9",background:"#ede9fe",padding:"1px 6px",borderRadius:"2px",border:"1px solid #c4b5fd"}}>{q.type==="dragdrop"?"D&D":q.type==="multiselect"?"Multi":q.type==="keypad"?"Keypad":q.type}</span>}
                      {q.createdByName&&<span style={{fontSize:"0.58rem",fontWeight:600,color:T.textSecondary,background:T.surfaceAlt,padding:"1px 6px",borderRadius:"2px",border:`1px solid ${T.border}`}}>👤 {q.createdByName}</span>}
                      <span style={{fontSize:"0.6rem",color:T.textSecondary}}>{q.short}</span>
                    </div>
                    <div style={{fontSize:"0.85rem",color:T.text,fontFamily:"Georgia,serif",lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                      <MathText text={q.question}/>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:"3px",flexShrink:0}}>
                    <button onClick={e=>{e.stopPropagation();setEditingQ(q);}} style={{...S.smBtn,padding:"3px 8px",color:T.teal,borderColor:T.border,background:T.surfaceAlt}}>✏️</button>
                    <button onClick={e=>{e.stopPropagation();setConfirmDelete(q);}} style={{...S.smBtn,padding:"3px 8px",color:"#8b1a1a",borderColor:"#f0b8b8",background:"#fdf2f2"}}>🗑</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:T.midnight,display:"flex",alignItems:"flex-end",padding:"0 1rem",gap:"0.15rem",flexShrink:0}}>
          {[["current","📋 Current Test"],["library","📚 Test Library"]].map(([key,lbl])=>(
            <button key={key} onClick={()=>setRightTab(key)}
              style={{background:rightTab===key?"#fff":"transparent",color:rightTab===key?T.midnight:"rgba(13,148,136,.4)",border:"none",padding:"0.55rem 0.9rem",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",borderRadius:"4px 4px 0 0"}}>
              {lbl}{key==="library"&&savedTests.length>0&&<span style={{marginLeft:"5px",background:rightTab===key?T.midnight:"rgba(255,255,255,.25)",color:"#fff",borderRadius:"10px",padding:"0px 6px",fontSize:"0.65rem"}}>{savedTests.filter(t=>(t.subject||"math")===subject).length}</span>}
            </button>
          ))}
        </div>

        {/* Current Test */}
        {rightTab==="current"&&(
          <>
            <div style={{background:"#fff",borderBottom:"1px solid #c8d3dd",padding:"0.75rem 1rem",flexShrink:0}}>
              {editingTestId && (
                <div style={{background:"#e3f2fd",border:"1px solid #90caf9",borderRadius:T.xs,padding:"0.4rem 0.65rem",marginBottom:"0.5rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                  <span style={{fontSize:"0.72rem",fontWeight:700,color:"#1565c0"}}>✏️ Editing: {editingTestId.name}</span>
                  <span style={{fontSize:"0.62rem",color:"#1565c0",fontFamily:"monospace"}}>({editingTestId.code})</span>
                </div>
              )}
              <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.midnight,marginBottom:"0.4rem"}}>CURRENT SELECTION</div>
              <input style={{...S.inp,fontWeight:600}} value={testTitle} onChange={e=>setTestTitle(e.target.value)} placeholder="Test title…"/>
              <div style={{fontSize:"0.7rem",color:"#888",marginTop:"4px"}}>
                {selected.length} question{selected.length!==1?"s":""} selected
                {savedMsg&&<span style={{marginLeft:"0.75rem",color:"#1a6e2e",fontWeight:700,fontFamily:"monospace"}}>✓ {savedMsg}</span>}
              </div>
            </div>

            <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"0.75rem"}}>
              {selected.length===0?(
                <div style={{padding:"3rem 1rem",textAlign:"center",color:"#aaa"}}>
                  <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>👈</div>
                  <div style={{fontWeight:600,color:"#555",marginBottom:"4px"}}>No questions selected</div>
                  <div style={{fontSize:"0.82rem"}}>Click questions on the left or use Auto-fill.</div>
                </div>
              ):(
                selectedQuestions.map((q,i)=>(
                  <div key={q.id} style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",padding:"0.6rem 0.85rem",marginBottom:"0.4rem",display:"flex",alignItems:"center",gap:"0.6rem"}}>
                    <div style={{width:"22px",height:"22px",borderRadius:"50%",background:T.teal,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{color:"#fff",fontSize:"0.65rem",fontWeight:700}}>{i+1}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",gap:"0.35rem",marginBottom:"2px"}}>
                        <span style={{fontSize:"0.58rem",fontWeight:700,color:T.midnight,background:T.tealLight,padding:"1px 5px",borderRadius:"2px"}}>{q.standard}</span>
                        {q.dok&&<span style={{fontSize:"0.58rem",fontWeight:700,color:"#7a4e00",background:"#fff3cd",padding:"1px 5px",borderRadius:"2px"}}>DOK {q.dok}</span>}
                      </div>
                      <div style={{fontSize:"0.8rem",color:"#1a1a1a",fontFamily:"Georgia,serif",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>
                        <MathText text={q.question}/>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:"2px",flexShrink:0}}>
                      {i>0&&<button onClick={()=>moveUp(i)} style={{...S.smBtn,padding:"3px 7px"}}>↑</button>}
                      {i<selected.length-1&&<button onClick={()=>moveDown(i)} style={{...S.smBtn,padding:"3px 7px"}}>↓</button>}
                      <button onClick={()=>removeFromTest(q.id)} style={{...S.smBtn,color:"#8b1a1a",borderColor:"#f0b8b8",padding:"3px 7px"}}>✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{padding:"0.85rem 1rem",borderTop:"2px solid #c8d3dd",background:"#fff",flexShrink:0}}>
              <button onClick={()=>setShowSaveModal(true)} disabled={selected.length===0}
                style={{width:"100%",background:selected.length===0?"#c8d3dd":editingTestId?T.midnight:T.teal,border:"none",borderRadius:"4px",padding:"0.8rem",fontSize:"0.95rem",fontWeight:700,color:"#fff",cursor:selected.length===0?"not-allowed":"pointer"}}>
                {editingTestId ? "💾 Update Test" : "💾 Save to Library & Get Code"}
              </button>
              {editingTestId && (
                <button onClick={()=>setEditingTestId(null)}
                  style={{width:"100%",marginTop:"0.35rem",background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:"4px",padding:"0.5rem",fontSize:"0.78rem",fontWeight:600,color:T.textSecondary,cursor:"pointer"}}>
                  Cancel Editing — start fresh
                </button>
              )}
              {selected.length>0&&(
                <div style={{fontSize:"0.7rem",color:"#888",textAlign:"center",marginTop:"5px"}}>
                  Students use the code to access this test
                </div>
              )}
            </div>
          </>
        )}

        {/* Library */}
        {rightTab==="library"&&(()=>{
          const q = libSearch.trim().toLowerCase();
          const filtered = savedTests.filter(t => {
            if ((t.subject||"math") !== subject) return false;
            if (myTestsOnly && t.createdBy && t.createdBy !== teacher?.teacherId) return false;
            if (q && !(t.name||"").toLowerCase().includes(q) && !(t.code||"").toLowerCase().includes(q)) return false;
            return true;
          });
          const sorted = [...filtered].sort((a,b) => {
            if (libSort==="oldest")  return (a.saved_at||"").localeCompare(b.saved_at||"");
            if (libSort==="name")    return (a.name||"").localeCompare(b.name||"");
            if (libSort==="most-q")  return (b.count||0)-(a.count||0);
            if (libSort==="least-q") return (a.count||0)-(b.count||0);
            return (b.saved_at||"").localeCompare(a.saved_at||""); // newest
          });
          return (
          <>
            <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"0.75rem 1rem",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                <div>
                  <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.midnight}}>TEST LIBRARY</div>
                  <div style={{fontSize:"0.68rem",color:T.textSecondary,marginTop:"1px"}}>{filtered.length} test{filtered.length!==1?"s":""}{q?` · ${filtered.length} match${filtered.length!==1?"es":""}`:""}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"0.4rem"}}>
                {[
                  {label: myTestsOnly?"👤 My Tests":"🌐 All Tests", active: myTestsOnly, onClick:()=>setMyTestsOnly(v=>!v)},
                  {label: showArchived?"📦 Hide Archived":"📦 Archived", active: showArchived, onClick:()=>setShowArchived(v=>!v)},
                ].map(btn=>(
                  <button key={btn.label} onClick={btn.onClick}
                    style={{fontSize:"0.68rem",fontWeight:700,padding:"3px 9px",borderRadius:"12px",cursor:"pointer",border:`1px solid ${btn.active?T.teal:T.border}`,background:btn.active?T.tealLight:"transparent",color:btn.active?T.teal:T.textSecondary}}>
                    {btn.label}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:"0.4rem",alignItems:"center"}}>
                <input value={libSearch} onChange={e=>setLibSearch(e.target.value)} placeholder="Search by name or code..."
                  style={{...S.inp,flex:1,fontSize:"0.78rem",padding:"5px 8px",margin:0}}/>
                <select value={libSort} onChange={e=>setLibSort(e.target.value)}
                  style={{...S.inp,width:"auto",fontSize:"0.72rem",padding:"5px 6px",margin:0,color:T.textSecondary}}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">A-Z</option>
                  <option value="most-q">Most Questions</option>
                  <option value="least-q">Fewest Questions</option>
                </select>
              </div>
            </div>
            <div style={{flex:1,minHeight:0,overflowY:"auto",padding:"0.75rem"}}>
              {sorted.length===0?(
                <div style={{padding:"3rem 1rem",textAlign:"center",color:"#aaa"}}>
                  <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>{q?"🔍":"📚"}</div>
                  <div style={{fontWeight:600,color:"#555",marginBottom:"4px"}}>{q?"No tests match your search":"No saved tests yet"}</div>
                  <div style={{fontSize:"0.82rem"}}>{q?"Try a different search term.":"Build a test and click \"Save to Library\"."}</div>
                </div>
              ):(
                sorted.map(t=>{
                  /* Extract unique standards from the full test via the question bank */
                  const testStds = [...new Set((bank||[]).filter(bq=>(t.questionIds||[]).includes(bq.id)||(savedTests.find(x=>x.id===t.id)?.questions||[]).some(sq=>sq.id===bq.id)).map(bq=>bq.standard).filter(Boolean))].sort();
                  const classNames = (t.classIds||[]).map(id=>allClasses.find(c=>c.id===id)?.name).filter(Boolean);
                  const canEdit = !t.createdBy || t.createdBy === teacher?.teacherId || isAdmin;
                  const canDupe = t.visibility !== "global" || isAdmin;
                  const vis = t.visibility || "private";
                  const visBadge = vis==="global"
                    ? (t.adminScoresOnly ? {icon:"🎯",label:"GMAS Sim",bg:"#f3e5f5",color:"#7b1fa2",bd:"#ce93d8"}
                                        : {icon:"🌐",label:"Global",bg:"#e8f5e9",color:"#2e7d32",bd:"#a5d6a7"})
                    : vis==="grade"
                    ? {icon:"👥",label:"Grade",bg:"#e3f2fd",color:"#1565c0",bd:"#90caf9"}
                    : {icon:"🔒",label:"Private",bg:T.surfaceAlt,color:T.textSecondary,bd:T.border};
                  const hasAssignment = (testAssignments||[]).some(a => a.testId === t.id);
                  const canHardDelete = canEdit && !hasAssignment;
                  return (
                  <div key={t.id} style={{background:T.white,border:`1px solid ${t.archived?"#cbd5e1":T.border}`,borderRadius:"6px",padding:"0.85rem 1rem",marginBottom:"0.6rem",transition:"box-shadow .15s",boxShadow:"0 1px 3px rgba(0,0,0,.04)",opacity:t.archived?0.6:1}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:"0.75rem"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"}}>
                          <span style={{fontSize:"0.9rem",fontWeight:700,color:T.text}}>{t.name||"Untitled"}</span>
                          <span style={{fontSize:"0.58rem",fontWeight:700,background:visBadge.bg,color:visBadge.color,border:`1px solid ${visBadge.bd}`,borderRadius:"3px",padding:"1px 6px"}}>{visBadge.icon} {visBadge.label}</span>
                          {t.archived&&<span style={{fontSize:"0.58rem",fontWeight:700,background:"#f1f5f9",color:"#64748b",border:"1px solid #cbd5e1",borderRadius:"3px",padding:"1px 6px"}}>📦 ARCHIVED</span>}
                          {t.createdByName&&<span style={{fontSize:"0.58rem",color:T.textSecondary}}>by {t.createdByName}</span>}
                        </div>
                        <div style={{fontSize:"0.7rem",color:T.textSecondary,marginTop:"2px"}}>
                          {t.count} Q{t.count!==1?"s":""} · {t.saved_at}
                          {t.oneAttempt&&<span style={{marginLeft:"6px",background:"#fff3e0",color:"#e65100",borderRadius:"3px",padding:"0px 5px",fontSize:"0.6rem",fontWeight:600}}>1 attempt</span>}
                          {t.untimed&&<span style={{marginLeft:"4px",background:"#e8f5e9",color:"#2e7d32",borderRadius:"3px",padding:"0px 5px",fontSize:"0.6rem",fontWeight:600}}>untimed</span>}
                          {t.adaptive&&<span style={{marginLeft:"4px",background:"#e3f2fd",color:"#1565c0",borderRadius:"3px",padding:"0px 5px",fontSize:"0.6rem",fontWeight:600}}>adaptive</span>}
                          {t.closeDate&&<span style={{marginLeft:"4px",background:"#fce4ec",color:"#c62828",borderRadius:"3px",padding:"0px 5px",fontSize:"0.6rem",fontWeight:600}}>closes {t.closeDate}</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:"0.35rem",flexShrink:0}}>
                        <button onClick={()=>setAssigningTest(t)} title="Assign to students"
                          style={{...S.smBtn,background:(testAssignments||[]).some(a=>a.testId===t.id)?"#2e7d32":"#e65100",color:"#fff",borderColor:(testAssignments||[]).some(a=>a.testId===t.id)?"#2e7d32":"#e65100",padding:"5px 12px",fontWeight:700}}>
                          {(testAssignments||[]).some(a=>a.testId===t.id)?"📋 Assigned":"📋 Assign"}</button>
                        {canEdit&&<button onClick={()=>loadSavedTest(t.id,true)} title="Edit test"
                          style={{...S.smBtn,background:T.teal,color:"#fff",borderColor:T.teal,padding:"5px 12px"}}>✏️ Edit</button>}
                        <button onClick={()=>setPreviewTest(t)} title="Preview test as teacher"
                          style={{...S.smBtn,background:"#7c3aed",color:"#fff",borderColor:"#7c3aed",padding:"5px 12px"}}>🔍 Preview</button>
                        {canDupe&&<button onClick={()=>duplicateSavedTest(t.id)} title="Duplicate test"
                          style={{...S.smBtn,padding:"5px 8px",background:T.surfaceAlt,borderColor:T.border,color:T.text}}>📄</button>}
                        {canEdit&&canHardDelete&&<button onClick={()=>setConfirmDeleteTest(t)} title="Delete test"
                          style={{...S.smBtn,color:"#8b1a1a",borderColor:"#f0b8b8",background:"#fdf2f2",padding:"5px 8px"}}>🗑</button>}
                        {canEdit&&!canHardDelete&&<button onClick={()=>archiveTest(t)} title={t.archived?"Restore test":"Archive test"}
                          style={{...S.smBtn,color:t.archived?T.teal:"#64748b",borderColor:t.archived?"#99e6da":"#cbd5e1",background:t.archived?T.tealLight:"#f8fafc",padding:"5px 8px"}}>{t.archived?"↩":"📦"}</button>}
                      </div>
                    </div>
                    {/* Direct link (backup access) */}
                    {t.code&&(
                      <div style={{marginTop:"0.5rem",display:"flex",alignItems:"center",gap:"0.5rem",background:T.surface,borderRadius:"4px",padding:"0.4rem 0.65rem"}}>
                        <span style={{fontSize:"0.58rem",color:T.textSecondary,fontWeight:700,letterSpacing:"0.1em"}}>DIRECT LINK</span>
                        <span style={{fontSize:"0.65rem",color:T.textSecondary,fontFamily:"monospace",opacity:0.6}}>{t.code}</span>
                        <button onClick={()=>navigator.clipboard.writeText(`${window.location.origin}/?code=${t.code}`)}
                          style={{...S.smBtn,marginLeft:"auto",padding:"2px 8px",fontSize:"0.65rem"}}>📋 Copy</button>
                      </div>
                    )}
                    {/* Standards tags */}
                    {testStds.length>0&&(
                      <div style={{marginTop:"0.45rem",display:"flex",flexWrap:"wrap",gap:"3px"}}>
                        {testStds.map(std=>(
                          <span key={std} style={{fontSize:"0.58rem",fontWeight:600,background:"#eef2ff",color:"#4338ca",borderRadius:"3px",padding:"1px 6px",border:"1px solid #c7d2fe"}}>{std}</span>
                        ))}
                      </div>
                    )}
                    {/* Assignment status */}
                    {(()=>{
                      const assigns = (testAssignments||[]).filter(a=>a.testId===t.id);
                      if (assigns.length === 0) return (
                        <div style={{marginTop:"0.4rem",fontSize:"0.68rem",color:"#e67e00"}}>
                          <span onClick={()=>setAssigningTest(t)} style={{cursor:"pointer"}}>⚠ Not assigned — click Assign to push to students</span>
                        </div>
                      );
                      return assigns.map(a=>{
                        const sess = activeSessions[t.code];
                        const isWaiting = sess?.gate && !sess?.testing;
                        const isTesting = sess?.testing && !sess?.gate;
                        const waitCount = waitingCounts[t.code] || 0;
                        const notCompleted = (allClasses.find(c=>c.id===a.classId)?.students||[])
                          .filter(s=>!(a.completedIds||[]).includes(s.id) && (a.studentIds||[]).includes(s.id));
                        const isExpanded = expandedAssign === a.id;
                        return (
                          <div key={a.id} style={{marginTop:"0.35rem",fontSize:"0.68rem",background:"#e8f5e9",borderRadius:"3px",padding:"0.3rem 0.5rem"}}>
                            {/* Main row */}
                            <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                              <span style={{fontWeight:600,color:"#2e7d32"}}>📋 {a.className}</span>
                              <span style={{color:T.textSecondary}}>{a.completedCount||0}/{a.totalStudents||0} completed</span>
                              <div style={{flex:1,height:"4px",background:"#c8e6c9",borderRadius:"2px",overflow:"hidden"}}>
                                <div style={{width:`${a.totalStudents?(a.completedCount||0)/a.totalStudents*100:0}%`,height:"100%",background:"#2e7d32",borderRadius:"2px"}}/>
                              </div>
                              {/* Session control button */}
                              {!sess ? (
                                <button onClick={()=>launchSession(t.code, a.classId)}
                                  style={{border:"1px solid #a5d6a7",background:"#e8f5e9",cursor:"pointer",fontSize:"0.62rem",fontWeight:700,color:"#2e7d32",padding:"2px 8px",borderRadius:"3px",whiteSpace:"nowrap"}}>
                                  🟢 Launch
                                </button>
                              ) : isWaiting ? (
                                <button onClick={()=>beginTesting(t.code)}
                                  style={{border:"1px solid #90caf9",background:"#e3f2fd",cursor:"pointer",fontSize:"0.62rem",fontWeight:700,color:"#1565c0",padding:"2px 8px",borderRadius:"3px",whiteSpace:"nowrap"}}>
                                  ▶ Begin{waitCount>0?` (${waitCount} waiting)`:""}
                                </button>
                              ) : isTesting ? (
                                <button onClick={()=>endSession(t.code)}
                                  style={{border:"1px solid #f0b8b8",background:"#fdf2f2",cursor:"pointer",fontSize:"0.62rem",fontWeight:600,color:"#8b1a1a",padding:"2px 8px",borderRadius:"3px",whiteSpace:"nowrap"}}>
                                  End Session
                                </button>
                              ) : null}
                              {/* Makeup expander */}
                              {notCompleted.length > 0 && (
                                <button onClick={()=>setExpandedAssign(isExpanded ? null : a.id)}
                                  style={{border:"1px solid #ffcc02",background:"#fff8e1",cursor:"pointer",fontSize:"0.62rem",fontWeight:600,color:"#e65100",padding:"2px 8px",borderRadius:"3px",whiteSpace:"nowrap"}}>
                                  ＋ Makeup ({notCompleted.length})
                                </button>
                              )}
                              <button onClick={()=>{if(window.confirm(`Unassign from ${a.className}?`))deleteAssignment(a.id);}} title="Remove assignment"
                                style={{border:"1px solid #f0b8b8",background:"#fdf2f2",cursor:"pointer",fontSize:"0.62rem",fontWeight:600,color:"#8b1a1a",padding:"2px 8px",borderRadius:"3px"}}>Unassign</button>
                            </div>
                            {/* Session code display when live */}
                            {sess && (
                              <div style={{marginTop:"0.3rem",fontSize:"0.62rem",color:"#1565c0",fontWeight:600}}>
                                Session code: <span style={{fontFamily:"monospace",letterSpacing:"0.05em"}}>{t.code}</span>
                                {isWaiting && " · Waiting room open"}
                                {isTesting && " · Testing in progress"}
                              </div>
                            )}
                            {/* Not-completed student list for makeup */}
                            {isExpanded && notCompleted.length > 0 && (
                              <div style={{marginTop:"0.5rem",borderTop:"1px solid #c8e6c9",paddingTop:"0.4rem"}}>
                                <div style={{fontSize:"0.6rem",fontWeight:700,color:"#888",marginBottom:"0.3rem",textTransform:"uppercase",letterSpacing:"0.08em"}}>
                                  Not completed — click Give Makeup to add &amp; extend window to end of today
                                </div>
                                <div style={{display:"flex",flexDirection:"column",gap:"3px"}}>
                                  {notCompleted.map(s=>(
                                    <div key={s.id} style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                                      <span style={{flex:1,color:"#333"}}>{s.name}</span>
                                      <button
                                        disabled={makeupLoading===s.id}
                                        onClick={()=>giveMakeup(a.id, s.id)}
                                        style={{border:"1px solid #ffcc02",background:"#fff8e1",cursor:"pointer",fontSize:"0.6rem",fontWeight:700,color:"#e65100",padding:"2px 7px",borderRadius:"3px",opacity:makeupLoading===s.id?0.6:1}}>
                                        {makeupLoading===s.id ? "…" : "Give Makeup →"}
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <div style={{marginTop:"0.35rem",fontSize:"0.6rem",color:"#888"}}>
                                  Test code: <strong style={{fontFamily:"monospace"}}>{t.code}</strong> · Share with student after clicking Give Makeup
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  );
                })
              )}
            </div>
          </>
          );
        })()}
      </div>

      {/* Modals */}
      {editingQ&&<EditModal question={editingQ} onSave={handleSaveEdit} onClose={()=>setEditingQ(null)} teacher={teacher}/>}
      {showSaveModal&&<SaveTestModal count={selected.length} currentTitle={testTitle} savedTests={savedTests} onSave={saveTest} onClose={()=>setShowSaveModal(false)} editing={editingTestId} teacher={teacher}/>}
      {assigningTest&&<AssignTestModal test={assigningTest} teacher={teacher} existingAssignments={testAssignments}
        onDone={()=>{setAssigningTest(null);loadAssignments();}} onClose={()=>setAssigningTest(null)}/>}
      {previewTest&&<TestPreviewModal test={previewTest} bank={bank} onClose={()=>setPreviewTest(null)}/>}

      {confirmDeleteTest&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#fff",borderRadius:"6px",width:"100%",maxWidth:"400px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.25)"}}>
            <div style={{background:"#8b1a1a",color:"#fff",padding:"0.9rem 1.25rem"}}>
              <div style={{fontSize:"0.6rem",opacity:.75,letterSpacing:"0.12em",marginBottom:"2px"}}>TEST LIBRARY</div>
              <div style={{fontSize:"1rem",fontWeight:700}}>Delete Test?</div>
            </div>
            <div style={{padding:"1.25rem"}}>
              <p style={{fontSize:"0.9rem",color:T.text,margin:"0 0 0.5rem",fontWeight:700}}>{confirmDeleteTest.name||confirmDeleteTest.title||"Untitled Test"}</p>
              <p style={{fontSize:"0.78rem",color:"#888",margin:"0 0 0.5rem"}}>{confirmDeleteTest.count} question{confirmDeleteTest.count!==1?"s":""} · Code: {confirmDeleteTest.code||"none"}</p>
              <p style={{fontSize:"0.78rem",color:"#c0392b",margin:0,fontWeight:600}}>⚠ This permanently removes the test from the library. Student session data is not affected.</p>
            </div>
            <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.25rem",borderTop:"1px solid #dde3e9"}}>
              <button onClick={()=>setConfirmDeleteTest(null)} style={{flex:1,background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:T.text}}>Cancel</button>
              <button onClick={()=>{deleteSavedTest(confirmDeleteTest.id);setConfirmDeleteTest(null);}} style={{flex:1,background:"#8b1a1a",border:"none",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",color:"#fff",fontWeight:700}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#fff",borderRadius:"6px",width:"100%",maxWidth:"380px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.25)"}}>
            <div style={{background:"#8b1a1a",color:"#fff",padding:"0.9rem 1.25rem"}}>
              <div style={{fontSize:"0.6rem",opacity:.75,letterSpacing:"0.12em",marginBottom:"2px"}}>QUESTION BANK</div>
              <div style={{fontSize:"1rem",fontWeight:700}}>Delete Question?</div>
            </div>
            <div style={{padding:"1.25rem"}}>
              <p style={{fontSize:"0.85rem",color:T.text,margin:"0 0 0.75rem",fontFamily:"Georgia,serif",lineHeight:1.5}}><MathText text={confirmDelete.question}/></p>
              <p style={{fontSize:"0.78rem",color:"#888",margin:0}}>This permanently removes the question and cannot be undone.</p>
            </div>
            <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.25rem",borderTop:"1px solid #dde3e9"}}>
              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:T.text}}>Cancel</button>
              <button onClick={()=>deleteQuestion(confirmDelete.id)} style={{flex:1,background:"#8b1a1a",border:"none",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",color:"#fff",fontWeight:700}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
