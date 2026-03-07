import { useState, useEffect, useCallback } from "react";
import MathText from "./shared/MathText";
import { API } from "./shared/constants";

const STANDARDS = [
  "5.NR.1.1","5.NR.1.2","5.NR.2.1","5.NR.2.2",
  "5.NR.3.1","5.NR.3.2","5.NR.3.3","5.NR.3.4","5.NR.3.5","5.NR.3.6",
  "5.NR.4.1","5.NR.4.2","5.NR.4.3","5.NR.4.4","5.NR.5.1",
  "5.PAR.6.1","5.PAR.6.2",
  "5.MDR.7.1","5.MDR.7.2","5.MDR.7.3","5.MDR.7.4",
  "5.GSR.8.1","5.GSR.8.2","5.GSR.8.3","5.GSR.8.4",
];

const DOK_LABELS = { 1:"Recall", 2:"Skill/Concept", 3:"Strategic", 4:"Extended" };

const S = {
  lbl:   { display:"block", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.12em", color:"#555", marginBottom:"4px" },
  inp:   { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.85rem", background:"#fafbfc", boxSizing:"border-box" },
  smBtn: { border:"1px solid #c8d3dd", borderRadius:"3px", padding:"4px 10px", cursor:"pointer", fontSize:"0.75rem", fontWeight:600, background:"#f0f4f8", color:"#333" },
  ta:    { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.85rem", background:"#fafbfc", boxSizing:"border-box", resize:"vertical", minHeight:"80px", fontFamily:"sans-serif" },
};

// ── Edit Modal ─────────────────────────────────────────────
function EditModal({ question, onSave, onClose }) {
  const [q, setQ] = useState({ ...question });
  const [saving, setSaving] = useState(false);

  function updateChoice(i, val) {
    const choices = [...q.choices];
    choices[i] = val;
    setQ(prev => ({ ...prev, choices }));
  }

  async function handleSave() {
    if (!q.question.trim() || q.choices.filter(c=>c.trim()).length < 4 || !q.correct.trim()) return;
    setSaving(true);
    try {
      await fetch(`${API}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(q),
      });
      onSave(q);
    } catch {}
    setSaving(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"1rem" }}>
      <div style={{ background:"#fff", borderRadius:"6px", width:"100%", maxWidth:"600px", maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 8px 32px rgba(0,0,0,.25)" }}>

        {/* Header */}
        <div style={{ background:"#003865", color:"#fff", padding:"0.9rem 1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"0.6rem", opacity:.65, letterSpacing:"0.14em" }}>QUESTION BANK</div>
            <div style={{ fontSize:"1rem", fontWeight:700 }}>Edit Question</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)", color:"#fff", borderRadius:"3px", padding:"5px 12px", cursor:"pointer", fontSize:"0.8rem" }}>✕ Cancel</button>
        </div>

        {/* Body */}
        <div style={{ overflowY:"auto", padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.85rem" }}>

          {/* Standard + DOK + Skill */}
          <div style={{ display:"flex", gap:"0.75rem" }}>
            <div style={{ flex:2 }}>
              <label style={S.lbl}>STANDARD</label>
              <select style={S.inp} value={q.standard} onChange={e=>setQ(p=>({...p,standard:e.target.value}))}>
                {STANDARDS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <label style={S.lbl}>DOK</label>
              <select style={S.inp} value={q.dok||""} onChange={e=>setQ(p=>({...p,dok:Number(e.target.value)}))}>
                <option value="">—</option>
                {[1,2,3,4].map(d=><option key={d} value={d}>{d} — {DOK_LABELS[d]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={S.lbl}>SKILL LABEL</label>
            <input style={S.inp} value={q.short} onChange={e=>setQ(p=>({...p,short:e.target.value}))} placeholder="e.g. Add Fractions" />
          </div>

          {/* Question text */}
          <div>
            <label style={S.lbl}>QUESTION TEXT (use $...$ for math)</label>
            <textarea style={S.ta} value={q.question} onChange={e=>setQ(p=>({...p,question:e.target.value}))} rows={3}/>
            {q.question && (
              <div style={{ marginTop:"4px", padding:"0.5rem 0.75rem", background:"#f8fafc", border:"1px solid #dde3e9", borderRadius:"3px", fontSize:"0.85rem", fontFamily:"Georgia,serif" }}>
                <MathText text={q.question}/>
              </div>
            )}
          </div>

          {/* Choices */}
          <div>
            <label style={S.lbl}>ANSWER CHOICES</label>
            <div style={{ display:"flex", flexDirection:"column", gap:"0.4rem" }}>
              {["A","B","C","D"].map((letter,i) => {
                const isCorrect = q.correct === q.choices[i];
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                    <div style={{ width:"24px", height:"24px", borderRadius:"50%", background:isCorrect?"#1a6e2e":"#e8edf2", border:`2px solid ${isCorrect?"#1a6e2e":"#bcc8d4"}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, cursor:"pointer" }}
                      onClick={()=>setQ(p=>({...p,correct:p.choices[i]}))}>
                      <span style={{ fontSize:"0.65rem", fontWeight:700, color:isCorrect?"#fff":"#667" }}>{letter}</span>
                    </div>
                    <input style={{ ...S.inp, flex:1, border:`1px solid ${isCorrect?"#1a6e2e":"#c8d3dd"}`, background:isCorrect?"#f0faf2":"#fafbfc" }}
                      value={q.choices[i]} onChange={e=>updateChoice(i,e.target.value)} placeholder={`Choice ${letter}`}/>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize:"0.7rem", color:"#888", marginTop:"4px" }}>Click the letter circle to mark the correct answer.</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"0.9rem 1.25rem", borderTop:"1px solid #dde3e9", display:"flex", gap:"0.65rem", justifyContent:"flex-end", flexShrink:0 }}>
          <button onClick={onClose} style={{ ...S.smBtn, padding:"0.6rem 1.25rem" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ background:"#003865", border:"none", borderRadius:"3px", padding:"0.6rem 1.5rem", fontSize:"0.85rem", fontWeight:700, color:"#fff", cursor:"pointer" }}>
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main TestBuilder ───────────────────────────────────────
export default function TestBuilder() {
  const [bank, setBank]           = useState([]);
  const [selected, setSelected]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [testTitle, setTestTitle] = useState("Grade 5 Math — Practice");
  const [editingQ, setEditingQ]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Filters
  const [filterStd,  setFilterStd]  = useState("");
  const [filterDok,  setFilterDok]  = useState("");
  const [filterText, setFilterText] = useState("");
  const [autoCount,  setAutoCount]  = useState(10);

  const loadBank = useCallback(async () => {
    try {
      const r = await fetch(`${API}/questions`);
      setBank(await r.json());
    } catch { setBank([]); }
    setLoading(false);
  }, []);

  const loadActive = useCallback(async () => {
    try {
      const r = await fetch(`${API}/test/active`);
      const t = await r.json();
      setSelected((t.questions||[]).map(q=>q.id));
      setTestTitle(t.title||"Grade 5 Math — Practice");
    } catch {}
  }, []);

  useEffect(() => { loadBank(); loadActive(); }, [loadBank, loadActive]);

  // ── Filter ─────────────────────────────────────────────
  const filtered = bank.filter(q => {
    if (filterStd  && !q.standard?.startsWith(filterStd)) return false;
    if (filterDok  && q.dok !== Number(filterDok))         return false;
    if (filterText && !q.question?.toLowerCase().includes(filterText.toLowerCase()) &&
                      !q.short?.toLowerCase().includes(filterText.toLowerCase())) return false;
    return true;
  });

  const selectedQuestions = selected.map(id=>bank.find(q=>q.id===id)).filter(Boolean);
  const isSelected = id => selected.includes(id);

  function toggleSelect(q) {
    setSelected(s => s.includes(q.id) ? s.filter(x=>x!==q.id) : [...s,q.id]);
  }
  function moveUp(i)   { setSelected(s=>{const a=[...s];[a[i-1],a[i]]=[a[i],a[i-1]];return a;}); }
  function moveDown(i) { setSelected(s=>{const a=[...s];[a[i],a[i+1]]=[a[i+1],a[i]];return a;}); }
  function removeFromTest(id) { setSelected(s=>s.filter(x=>x!==id)); }

  function autoFill() {
    const needed = autoCount - selected.length;
    if (needed <= 0) return;
    const candidates = filtered.filter(q=>!selected.includes(q.id));
    const shuffled   = [...candidates].sort(()=>Math.random()-.5);
    setSelected(s=>[...s, ...shuffled.slice(0,needed).map(q=>q.id)]);
  }

  // ── Delete from bank ───────────────────────────────────
  async function deleteQuestion(id) {
    try {
      await fetch(`${API}/questions/${id}`, { method:"DELETE" });
      setBank(b=>b.filter(q=>q.id!==id));
      setSelected(s=>s.filter(x=>x!==id));
    } catch {}
    setConfirmDelete(null);
  }

  // ── Save edit ──────────────────────────────────────────
  function handleSaveEdit(updated) {
    setBank(b=>b.map(q=>q.id===updated.id?updated:q));
    setEditingQ(null);
  }

  // ── Activate test ──────────────────────────────────────
  async function activateTest() {
    if (selected.length===0) return;
    setActivating(true);
    try {
      await fetch(`${API}/test/activate`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({questions:selectedQuestions,title:testTitle}),
      });
      setActivated(true);
      setTimeout(()=>setActivated(false),3000);
    } catch {}
    setActivating(false);
  }

  if (loading) return <div style={{padding:"3rem",textAlign:"center",color:"#aaa"}}>Loading question bank…</div>;

  return (
    <div style={{display:"flex",height:"100%",fontFamily:"sans-serif",background:"#e8edf2",overflow:"hidden"}}>

      {/* ── Left: Bank browser ── */}
      <div style={{width:"55%",display:"flex",flexDirection:"column",borderRight:"2px solid #c8d3dd",overflow:"hidden"}}>

        {/* Filter bar */}
        <div style={{background:"#fff",borderBottom:"1px solid #c8d3dd",padding:"0.75rem 1rem",display:"flex",flexDirection:"column",gap:"0.5rem",flexShrink:0}}>
          <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#003865"}}>QUESTION BANK</div>
            <span style={{fontSize:"0.7rem",color:"#aaa"}}>{bank.length} questions · {filtered.length} shown</span>
          </div>
          <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
            <select style={{...S.inp,flex:2,minWidth:"120px"}} value={filterStd} onChange={e=>setFilterStd(e.target.value)}>
              <option value="">All Standards</option>
              {STANDARDS.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <select style={{...S.inp,flex:1,minWidth:"100px"}} value={filterDok} onChange={e=>setFilterDok(e.target.value)}>
              <option value="">All DOK</option>
              {[1,2,3,4].map(d=><option key={d} value={d}>DOK {d}</option>)}
            </select>
            <input style={{...S.inp,flex:2,minWidth:"120px"}} value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder="Search…"/>
          </div>
          <div style={{display:"flex",gap:"0.5rem",alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:"0.72rem",color:"#555"}}>
              Auto-fill <input type="number" min={1} max={50} value={autoCount} onChange={e=>setAutoCount(Number(e.target.value))}
                style={{width:"42px",padding:"2px 5px",border:"1px solid #c8d3dd",borderRadius:"3px",fontSize:"0.78rem",textAlign:"center"}}/> questions
            </span>
            <button onClick={autoFill} style={{...S.smBtn,background:"#003865",color:"#fff",borderColor:"#003865"}}>⚡ Auto-fill</button>
            <button onClick={()=>setSelected([])} style={{...S.smBtn,color:"#8b1a1a",borderColor:"#f0b8b8"}}>Clear All</button>
          </div>
        </div>

        {/* Question list */}
        <div style={{flex:1,overflowY:"auto",padding:"0.75rem"}}>
          {bank.length===0 ? (
            <div style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"3rem",textAlign:"center",color:"#aaa"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>📭</div>
              <div style={{fontWeight:600,color:"#555",marginBottom:"4px"}}>Question bank is empty</div>
              <div style={{fontSize:"0.82rem"}}>Use the Question Builder or PDF Importer to add questions.</div>
            </div>
          ) : filtered.length===0 ? (
            <div style={{padding:"2rem",textAlign:"center",color:"#aaa",fontSize:"0.85rem"}}>No questions match your filters.</div>
          ) : (
            filtered.map(q => {
              const sel = isSelected(q.id);
              return (
                <div key={q.id} style={{background:sel?"#ddeaf7":"#fff",border:`2px solid ${sel?"#003865":"#c8d3dd"}`,borderRadius:"4px",padding:"0.7rem 1rem",marginBottom:"0.5rem",display:"flex",alignItems:"flex-start",gap:"0.75rem",transition:"all .1s"}}>

                  {/* Checkbox — click to select */}
                  <div onClick={()=>toggleSelect(q)} style={{width:"20px",height:"20px",borderRadius:"4px",border:`2px solid ${sel?"#003865":"#bcc8d4"}`,background:sel?"#003865":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"2px",cursor:"pointer"}}>
                    {sel&&<span style={{color:"#fff",fontSize:"0.7rem",fontWeight:700}}>✓</span>}
                  </div>

                  {/* Question body */}
                  <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>toggleSelect(q)}>
                    <div style={{display:"flex",gap:"0.4rem",marginBottom:"3px",flexWrap:"wrap"}}>
                      <span style={{fontSize:"0.6rem",fontWeight:700,color:"#003865",background:"#ddeaf7",padding:"1px 6px",borderRadius:"2px",border:"1px solid #b3cde8"}}>{q.standard}</span>
                      {q.dok&&<span style={{fontSize:"0.6rem",fontWeight:700,color:"#7a4e00",background:"#fff3cd",padding:"1px 6px",borderRadius:"2px",border:"1px solid #ffc107"}}>DOK {q.dok}</span>}
                      <span style={{fontSize:"0.6rem",color:"#888"}}>{q.short}</span>
                    </div>
                    <div style={{fontSize:"0.85rem",color:"#1a1a1a",fontFamily:"Georgia,serif",lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                      <MathText text={q.question}/>
                    </div>
                  </div>

                  {/* Edit / Delete buttons */}
                  <div style={{display:"flex",gap:"3px",flexShrink:0}}>
                    <button onClick={e=>{e.stopPropagation();setEditingQ(q);}}
                      style={{...S.smBtn,padding:"3px 8px",color:"#003865",borderColor:"#b3cde8",background:"#f0f6ff"}} title="Edit">✏️</button>
                    <button onClick={e=>{e.stopPropagation();setConfirmDelete(q);}}
                      style={{...S.smBtn,padding:"3px 8px",color:"#8b1a1a",borderColor:"#f0b8b8",background:"#fdf2f2"}} title="Delete">🗑</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Active test ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{background:"#fff",borderBottom:"1px solid #c8d3dd",padding:"0.75rem 1rem",flexShrink:0}}>
          <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:"#003865",marginBottom:"0.4rem"}}>ACTIVE TEST</div>
          <input style={{...S.inp,fontWeight:600}} value={testTitle} onChange={e=>setTestTitle(e.target.value)} placeholder="Test title…"/>
          <div style={{fontSize:"0.7rem",color:"#888",marginTop:"4px"}}>{selected.length} question{selected.length!==1?"s":""} selected</div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"0.75rem"}}>
          {selected.length===0 ? (
            <div style={{padding:"3rem 1rem",textAlign:"center",color:"#aaa"}}>
              <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>👈</div>
              <div style={{fontWeight:600,color:"#555",marginBottom:"4px"}}>No questions selected</div>
              <div style={{fontSize:"0.82rem"}}>Click questions on the left to add them, or use Auto-fill.</div>
            </div>
          ) : (
            selectedQuestions.map((q,i)=>(
              <div key={q.id} style={{background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",padding:"0.6rem 0.85rem",marginBottom:"0.4rem",display:"flex",alignItems:"center",gap:"0.6rem"}}>
                <div style={{width:"22px",height:"22px",borderRadius:"50%",background:"#003865",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:"#fff",fontSize:"0.65rem",fontWeight:700}}>{i+1}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",gap:"0.35rem",marginBottom:"2px"}}>
                    <span style={{fontSize:"0.58rem",fontWeight:700,color:"#003865",background:"#ddeaf7",padding:"1px 5px",borderRadius:"2px"}}>{q.standard}</span>
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
          <button onClick={activateTest} disabled={activating||selected.length===0}
            style={{width:"100%",background:activated?"#1a6e2e":selected.length===0?"#c8d3dd":"#003865",border:"none",borderRadius:"4px",padding:"0.85rem",fontSize:"0.95rem",fontWeight:700,color:"#fff",cursor:selected.length===0?"not-allowed":"pointer",transition:"background .2s"}}>
            {activated?"✓ Test Activated — Students can begin!":activating?"Activating…":`🚀 Activate Test (${selected.length} questions)`}
          </button>
          {selected.length>0&&!activated&&(
            <div style={{fontSize:"0.7rem",color:"#888",textAlign:"center",marginTop:"5px"}}>
              Students will immediately see these {selected.length} questions when they log in
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editingQ && <EditModal question={editingQ} onSave={handleSaveEdit} onClose={()=>setEditingQ(null)}/>}

      {/* ── Delete Confirm ── */}
      {confirmDelete && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#fff",borderRadius:"6px",width:"100%",maxWidth:"380px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.25)"}}>
            <div style={{background:"#8b1a1a",color:"#fff",padding:"0.9rem 1.25rem"}}>
              <div style={{fontSize:"0.6rem",opacity:.75,letterSpacing:"0.12em",marginBottom:"2px"}}>QUESTION BANK</div>
              <div style={{fontSize:"1rem",fontWeight:700}}>Delete Question?</div>
            </div>
            <div style={{padding:"1.25rem"}}>
              <p style={{fontSize:"0.85rem",color:"#333",margin:"0 0 0.75rem",fontFamily:"Georgia,serif",lineHeight:1.5}}>
                <MathText text={confirmDelete.question}/>
              </p>
              <p style={{fontSize:"0.78rem",color:"#888",margin:0}}>This will permanently remove the question from the bank. It cannot be undone.</p>
            </div>
            <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.25rem",borderTop:"1px solid #dde3e9"}}>
              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:"#333"}}>Cancel</button>
              <button onClick={()=>deleteQuestion(confirmDelete.id)} style={{flex:1,background:"#8b1a1a",border:"none",borderRadius:"3px",padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",color:"#fff",fontWeight:700}}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
