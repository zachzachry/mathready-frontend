import { useState, useEffect, useCallback } from "react";
import { API } from "./shared/constants";

const NAVY = "#003865";

function genHex(len = 6) {
  return Array.from({length: len}, () => "0123456789ABCDEF"[Math.floor(Math.random()*16)]).join("");
}
const S = {
  inp:  { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.85rem", background:"#fafbfc", boxSizing:"border-box" },
  lbl:  { display:"block", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.12em", color:"#555", marginBottom:"4px" },
  btn:  { border:"1px solid #c8d3dd", borderRadius:"3px", padding:"6px 14px", cursor:"pointer", fontSize:"0.78rem", fontWeight:600, background:"#f0f4f8", color:"#333" },
};

function ClassPicker({ allClasses, selected, onChange, onClassCreated }) {
  const [adding,   setAdding]   = useState(false);
  const [newName,  setNewName]  = useState("");
  const [creating, setCreating] = useState(false);

  async function createClass() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await fetch(`${API}/roster/class`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ name: newName.trim() })
      });
      const d = await r.json();
      setNewName(""); setAdding(false);
      onClassCreated(d.id); // auto-select the new class
    } catch {}
    setCreating(false);
  }

  return (
    <div>
      <div style={{ display:"flex", flexDirection:"column", gap:"0.3rem", maxHeight:"180px", overflowY:"auto",
        border:"1px solid #c8d3dd", borderRadius:"3px", padding:"0.5rem", background:"#fafbfc",
        marginBottom:"0.4rem" }}>
        {allClasses.length === 0 && !adding && (
          <div style={{ color:"#aaa", fontSize:"0.8rem", padding:"0.25rem" }}>No classes yet — create one below.</div>
        )}
        {allClasses.map(cls => {
          const checked = selected.includes(cls.id);
          return (
            <label key={cls.id} style={{ display:"flex", alignItems:"center", gap:"0.5rem", cursor:"pointer",
              padding:"0.35rem 0.5rem", borderRadius:"3px", background: checked ? "#ddeaf7" : "transparent" }}>
              <input type="checkbox" checked={checked}
                onChange={() => onChange(checked ? selected.filter(id=>id!==cls.id) : [...selected, cls.id])}
                style={{ accentColor: NAVY }}/>
              <span style={{ fontSize:"0.85rem", fontWeight: checked ? 700 : 500, color: checked ? NAVY : "#333" }}>
                {cls.name}
              </span>
              <span style={{ fontSize:"0.68rem", color:"#aaa", marginLeft:"auto" }}>
                {cls.students?.length || 0} students
              </span>
            </label>
          );
        })}
      </div>
      {/* Inline class creation */}
      {adding ? (
        <div style={{ display:"flex", gap:"0.4rem" }}>
          <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter") createClass(); if(e.key==="Escape") setAdding(false); }}
            placeholder="Class name, e.g. Ms. Johnson Pd 1"
            style={{ flex:1, padding:"5px 8px", border:"1px solid #003865", borderRadius:"3px", fontSize:"0.82rem" }}/>
          <button onClick={createClass} disabled={creating||!newName.trim()}
            style={{ background:NAVY, color:"#fff", border:"none", borderRadius:"3px",
              padding:"5px 12px", cursor:"pointer", fontSize:"0.78rem", fontWeight:700 }}>
            {creating ? "…" : "Add"}
          </button>
          <button onClick={()=>setAdding(false)}
            style={{ background:"#f0f4f8", border:"1px solid #c8d3dd", borderRadius:"3px",
              padding:"5px 10px", cursor:"pointer", fontSize:"0.78rem" }}>✕</button>
        </div>
      ) : (
        <button onClick={()=>setAdding(true)}
          style={{ background:"none", border:"1px dashed #b3cde8", borderRadius:"3px", padding:"5px 12px",
            cursor:"pointer", fontSize:"0.75rem", color:"#4a7fa5", width:"100%", textAlign:"left" }}>
          + Create new class
        </button>
      )}
    </div>
  );
}

function TeacherForm({ teacher, allClasses, onSave, onCancel, onClassCreated }) {
  const [name,       setName]       = useState(teacher?.name     || "");
  const [email,      setEmail]      = useState(teacher?.email    || "");
  const [pin,        setPin]        = useState(teacher ? "" : genHex());
  const [changingPin,setChangingPin]= useState(!teacher);
  const [classIds,   setClassIds]   = useState(teacher?.classIds || []);
  const [err,        setErr]        = useState("");
  const [saving,     setSaving]     = useState(false);

  async function submit() {
    if (!name.trim()) { setErr("Name is required."); return; }
    if (!email.trim()) { setErr("School Google email is required."); return; }
    if (changingPin && pin.trim()) {
      const cleanPin = pin.trim().toUpperCase();
      if (cleanPin.length < 4 || cleanPin.length > 8 || !/^[0-9A-F]+$/.test(cleanPin)) {
        setErr("Login code must be 4–8 hex characters (0-9, A-F)."); return;
      }
    }
    setSaving(true); setErr("");
    const body = { name: name.trim(), email: email.trim().toLowerCase(),
                   pin: changingPin ? pin.trim().toUpperCase() : "", classIds };
    try {
      const url    = teacher ? `${API}/teachers/${teacher.id}` : `${API}/teachers`;
      const method = teacher ? "PUT" : "POST";
      const r = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) { setErr(d.detail || "Error saving."); setSaving(false); return; }
      onSave();
    } catch { setErr("Failed to save."); }
    setSaving(false);
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #c8d3dd", borderRadius:"6px",
      padding:"1.25rem", boxShadow:"0 2px 12px rgba(0,0,0,.08)" }}>
      <div style={{ fontSize:"0.9rem", fontWeight:700, color:NAVY, marginBottom:"1rem" }}>
        {teacher ? `Edit — ${teacher.name}` : "New Teacher Account"}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1rem" }}>
        <div>
          <label style={S.lbl}>TEACHER NAME</label>
          <input style={S.inp} value={name} onChange={e=>setName(e.target.value)}
            placeholder="Ms. Johnson" autoFocus/>
        </div>
        <div>
          <label style={S.lbl}>SCHOOL GOOGLE EMAIL</label>
          <input style={S.inp} value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="teacher@school.edu" type="email"/>
        </div>
      </div>

      <div style={{ marginBottom:"1rem" }}>
        <label style={S.lbl}>LOGIN CODE (HEX) — optional, for admin fallback only</label>
        {!teacher || changingPin ? (
          <div style={{display:"flex",gap:"0.4rem",alignItems:"center"}}>
            <input style={{...S.inp, fontFamily:"monospace", letterSpacing:"0.2em", flex:1, textTransform:"uppercase"}}
              value={pin} onChange={e=>setPin(e.target.value.toUpperCase().replace(/[^0-9A-F]/g,"").slice(0,8))}
              placeholder="Leave blank or generate" maxLength={8}/>
            <button type="button" onClick={()=>setPin(genHex())} title="Generate random code"
              style={{...S.btn,padding:"5px 10px",fontSize:"0.75rem",whiteSpace:"nowrap",background:"#e8f0fa",borderColor:"#b3cde8",color:"#003865"}}>
              🎲
            </button>
            {teacher && (
              <button type="button" onClick={()=>{setChangingPin(false);setPin("");setErr("");}}
                style={{...S.btn,padding:"5px 10px",fontSize:"0.75rem",whiteSpace:"nowrap"}}>
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
            <div style={{flex:1,padding:"0.5rem 0.75rem",background:"#f0f4f8",border:"1px solid #c8d3dd",
              borderRadius:"3px",fontFamily:"monospace",letterSpacing:"0.25em",fontSize:"1rem",color:"#888"}}>
              {"•••••"}
            </div>
            <button type="button" onClick={()=>setChangingPin(true)}
              style={{...S.btn,padding:"5px 12px",fontSize:"0.75rem",whiteSpace:"nowrap",
                background:"#fff3cd",borderColor:"#ffc107",color:"#7a4e00",fontWeight:700}}>
              🔑 Change Code
            </button>
          </div>
        )}
      </div>

      <div style={{ marginBottom:"1rem" }}>
        <label style={S.lbl}>ASSIGN CLASSES</label>
        <ClassPicker allClasses={allClasses} selected={classIds} onChange={setClassIds}
          onClassCreated={(newId) => { onClassCreated(newId); setClassIds(ids => [...ids, newId]); }}/>
        <div style={{ fontSize:"0.68rem", color:"#888", marginTop:"4px" }}>
          {classIds.length === 0 ? "No classes assigned — teacher will see no data." : `${classIds.length} class${classIds.length!==1?"es":""} assigned`}
        </div>
      </div>

      {err && <div style={{ background:"#fdf2f2", border:"1px solid #f0b8b8", borderRadius:"3px",
        padding:"0.5rem 0.75rem", fontSize:"0.78rem", color:"#8b1a1a", marginBottom:"0.75rem" }}>⚠ {err}</div>}

      <div style={{ display:"flex", gap:"0.5rem" }}>
        <button onClick={submit} disabled={saving}
          style={{...S.btn, background:NAVY, color:"#fff", border:"none", padding:"7px 20px", opacity:saving?0.7:1}}>
          {saving ? "Saving…" : teacher ? "Save Changes" : "Create Account"}
        </button>
        <button onClick={onCancel} style={S.btn}>Cancel</button>
      </div>
    </div>
  );
}

export default function TeacherManager() {
  const [teachers,   setTeachers]   = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState(null);  // null | "new" | teacher object
  const [msg,        setMsg]        = useState("");

  const load = useCallback(async () => {
    try {
      const [t, r] = await Promise.all([
        fetch(`${API}/teachers`).then(r=>r.json()),
        fetch(`${API}/roster`).then(r=>r.json()),
      ]);
      setTeachers(t);
      setAllClasses(r);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(text) { setMsg(text); setTimeout(() => setMsg(""), 3500); }

  async function deleteTeacher(t) {
    if (!window.confirm(`Delete account for ${t.name}? They will no longer be able to log in.`)) return;
    try {
      await fetch(`${API}/teachers/${t.id}`, { method:"DELETE" });
      await load();
      flash(`${t.name} deleted.`);
    } catch { flash("Failed to delete."); }
  }

  function classNamesFor(classIds) {
    if (!classIds?.length) return <span style={{ color:"#bbb", fontStyle:"italic" }}>No classes</span>;
    return classIds.map(id => {
      const cls = allClasses.find(c => c.id === id);
      return cls ? cls.name : id;
    }).join(", ");
  }

  if (loading) return <div style={{ padding:"3rem", textAlign:"center", color:"#aaa" }}>Loading…</div>;

  return (
    <div style={{ padding:"1.25rem", maxWidth:"860px", fontFamily:"sans-serif" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
        <div>
          <div style={{ fontSize:"1rem", fontWeight:700, color:NAVY }}>Teacher Accounts</div>
          <div style={{ fontSize:"0.75rem", color:"#888", marginTop:"2px" }}>
            Each teacher gets their own hex login code and sees only their assigned classes.
          </div>
        </div>
        <button onClick={() => setEditing("new")}
          style={{...S.btn, background:NAVY, color:"#fff", border:"none", padding:"7px 16px"}}>
          + New Teacher
        </button>
      </div>

      {msg && <div style={{ background:"#f0faf2", border:"1px solid #b3dfc0", borderRadius:"3px",
        padding:"0.55rem 0.9rem", fontSize:"0.8rem", color:"#1a6e2e", fontWeight:700, marginBottom:"1rem" }}>
        ✓ {msg}
      </div>}

      {/* New / Edit form */}
      {editing && (
        <div style={{ marginBottom:"1.25rem" }}>
          <TeacherForm
            teacher={editing === "new" ? null : editing}
            allClasses={allClasses}
            onSave={async () => { await load(); setEditing(null); flash(editing==="new" ? "Teacher account created!" : "Account updated!"); }}
            onCancel={() => setEditing(null)}
            onClassCreated={async () => { await load(); }}
          />
        </div>
      )}

      {/* Teacher list */}
      {teachers.length === 0 && !editing ? (
        <div style={{ background:"#f8fafc", border:"1px solid #dde3e9", borderRadius:"6px",
          padding:"2.5rem", textAlign:"center", color:"#aaa" }}>
          <div style={{ fontSize:"1.5rem", marginBottom:"0.5rem" }}>👩‍🏫</div>
          <div style={{ fontWeight:600, color:"#555" }}>No teacher accounts yet</div>
          <div style={{ fontSize:"0.82rem", marginTop:"4px" }}>
            Create accounts so each teacher has their own PIN and class access.
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
          {teachers.map(t => (
            <div key={t.id} style={{ background:"#fff", border:"1px solid #dde3e9", borderRadius:"5px",
              padding:"0.9rem 1.1rem", display:"flex", alignItems:"center", gap:"1rem",
              boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
              {/* Avatar */}
              <div style={{ width:"40px", height:"40px", borderRadius:"50%", background:NAVY, flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"1.1rem", color:"#fff", fontWeight:700 }}>
                {t.name[0]?.toUpperCase()}
              </div>
              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, color:"#1a1a1a", fontSize:"0.95rem" }}>{t.name}</div>
                <div style={{ fontSize:"0.72rem", color: t.email ? "#1a6e2e" : "#e67e00", marginTop:"1px", fontWeight:600 }}>
                  {t.email ? `✉ ${t.email}` : "⚠ No Google email set"}
                </div>
                <div style={{ fontSize:"0.72rem", color:"#888", marginTop:"1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {classNamesFor(t.classIds)}
                </div>
              </div>
              {/* PIN badge */}
              <div style={{ background:"#f0f4f8", border:"1px solid #c8d3dd", borderRadius:"3px",
                padding:"3px 10px", flexShrink:0 }}>
                <div style={{ fontSize:"0.55rem", color:"#888", letterSpacing:"0.1em" }}>{t.pinSet ? "CODE SET" : "NO CODE"}</div>
                <div style={{ fontSize:"0.9rem", fontFamily:"monospace", fontWeight:700, color:t.pinSet?NAVY:"#f0b8b8", letterSpacing:"0.15em" }}>
                  {t.pinSet ? "••••••" : "⚠"}
                </div>
              </div>
              {/* Class count */}
              <div style={{ textAlign:"center", minWidth:"60px", flexShrink:0 }}>
                <div style={{ fontSize:"1.2rem", fontWeight:700, color:NAVY }}>{t.classIds?.length || 0}</div>
                <div style={{ fontSize:"0.62rem", color:"#888" }}>class{t.classIds?.length!==1?"es":""}</div>
              </div>
              {/* Actions */}
              <div style={{ display:"flex", gap:"0.4rem", flexShrink:0 }}>
                <button onClick={() => setEditing(t)}
                  style={{...S.btn, padding:"4px 12px", fontSize:"0.75rem"}}>✏️ Edit</button>
                <button onClick={() => deleteTeacher(t)}
                  style={{...S.btn, padding:"4px 10px", color:"#8b1a1a", borderColor:"#f0b8b8", background:"#fdf2f2", fontSize:"0.75rem"}}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note about legacy PIN */}
      <div style={{ marginTop:"1.5rem", background:"#fff8e1", border:"1px solid #ffd166",
        borderRadius:"4px", padding:"0.65rem 1rem", fontSize:"0.76rem", color:"#7a4e00" }}>
        <strong>Note:</strong> Existing numeric PINs still work — teachers can keep theirs or click ✏️ Edit → 🔑 Change Code to upgrade to a hex code. Legacy <code>TEACHER_PIN</code> env var still works until removed from Railway.
      </div>
    </div>
  );
}
