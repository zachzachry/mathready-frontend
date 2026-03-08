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
export default function RosterManager() {
  const [classes,    setClasses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeClass,setActiveClass]= useState(null);
  const [newClassName,setNewClassName]=useState("");
  const [addMode,    setAddMode]    = useState("one");
  const [oneInput,   setOneInput]   = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [adding,     setAdding]     = useState(false);
  const [msg,        setMsg]        = useState("");

  const load = useCallback(async () => {
    try { const r = await fetch(`${API}/roster`); setClasses(await r.json()); }
    catch { setClasses([]); }
    setLoading(false);
  }, []);

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
        body: JSON.stringify({ name: newClassName.trim() }) });
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
                <button onClick={e=>{e.stopPropagation();deleteClass(cls.id);}}
                  style={{...S.btn,padding:"2px 7px",color:"#8b1a1a",borderColor:"#f0b8b8",background:"#fdf2f2",fontSize:"0.68rem"}}>✕</button>
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
              ) : (
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
                      <div style={{flex:1,fontSize:"0.88rem",fontWeight:600,color:"#1a1a1a",minWidth:"120px"}}>{s.name}</div>
                      <PinEditor
                        pin={s.pin}
                        onSave={pin=>setPin(activeClassData.id, s.id, pin)}
                        onRegen={()=>regenPin(activeClassData.id, s.id)}
                      />
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
    </div>
  );
}
