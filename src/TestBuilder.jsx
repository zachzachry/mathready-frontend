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

const lbl   = { display:"block", fontSize:"0.62rem", fontWeight:700, letterSpacing:"0.12em", color:"#555", marginBottom:"4px" };
const inp   = { width:"100%", padding:"0.5rem 0.75rem", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.85rem", background:"#fafbfc", boxSizing:"border-box" };
const smBtn = { border:"1px solid #c8d3dd", borderRadius:"3px", padding:"4px 10px", cursor:"pointer", fontSize:"0.75rem", fontWeight:600, background:"#f0f4f8", color:"#333" };

export default function TestBuilder() {
  const [bank, setBank]           = useState([]);
  const [selected, setSelected]   = useState([]);   // question ids in the active test
  const [loading, setLoading]     = useState(true);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [testTitle, setTestTitle] = useState("Grade 5 Math — Practice");

  // Filters
  const [filterStd,  setFilterStd]  = useState("");
  const [filterDok,  setFilterDok]  = useState("");
  const [filterText, setFilterText] = useState("");

  // Auto-fill
  const [autoCount, setAutoCount] = useState(10);

  const loadBank = useCallback(async () => {
    try {
      const r = await fetch(`${API}/questions`);
      const qs = await r.json();
      setBank(qs);
    } catch { setBank([]); }
    setLoading(false);
  }, []);

  const loadActive = useCallback(async () => {
    try {
      const r = await fetch(`${API}/test/active`);
      const t = await r.json();
      setSelected((t.questions || []).map(q => q.id));
      setTestTitle(t.title || "Grade 5 Math — Practice");
    } catch {}
  }, []);

  useEffect(() => { loadBank(); loadActive(); }, [loadBank, loadActive]);

  // Filtered view of bank
  const filtered = bank.filter(q => {
    if (filterStd  && !q.standard?.startsWith(filterStd)) return false;
    if (filterDok  && q.dok !== Number(filterDok))         return false;
    if (filterText && !q.question?.toLowerCase().includes(filterText.toLowerCase()) &&
                      !q.short?.toLowerCase().includes(filterText.toLowerCase())) return false;
    return true;
  });

  const selectedQuestions = selected.map(id => bank.find(q => q.id === id)).filter(Boolean);
  const isSelected = id => selected.includes(id);

  function toggleSelect(q) {
    setSelected(s => s.includes(q.id) ? s.filter(x => x !== q.id) : [...s, q.id]);
  }

  function moveUp(i)   { setSelected(s => { const a=[...s]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; }); }
  function moveDown(i) { setSelected(s => { const a=[...s]; [a[i],a[i+1]]=[a[i+1],a[i]]; return a; }); }
  function remove(id)  { setSelected(s => s.filter(x => x !== id)); }

  function autoFill() {
    // Take questions matching current filters, not already selected, up to autoCount total
    const needed = autoCount - selected.length;
    if (needed <= 0) return;
    const candidates = filtered.filter(q => !selected.includes(q.id));
    // Shuffle for variety
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const toAdd = shuffled.slice(0, needed).map(q => q.id);
    setSelected(s => [...s, ...toAdd]);
  }

  async function activateTest() {
    if (selected.length === 0) return;
    setActivating(true);
    try {
      await fetch(`${API}/test/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: selectedQuestions, title: testTitle }),
      });
      setActivated(true);
      setTimeout(() => setActivated(false), 3000);
    } catch {}
    setActivating(false);
  }

  if (loading) return <div style={{ padding:"3rem", textAlign:"center", color:"#aaa" }}>Loading question bank…</div>;

  return (
    <div style={{ display:"flex", height:"100%", fontFamily:"sans-serif", background:"#e8edf2", overflow:"hidden" }}>

      {/* ── Left: Bank browser ── */}
      <div style={{ width:"55%", display:"flex", flexDirection:"column", borderRight:"2px solid #c8d3dd", overflow:"hidden" }}>

        {/* Filter bar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #c8d3dd", padding:"0.75rem 1rem", display:"flex", flexDirection:"column", gap:"0.5rem", flexShrink:0 }}>
          <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
            <div style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", color:"#003865" }}>QUESTION BANK</div>
            <span style={{ fontSize:"0.7rem", color:"#aaa" }}>{bank.length} questions</span>
          </div>
          <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
            <div style={{ flex:2, minWidth:"120px" }}>
              <select style={{ ...inp }} value={filterStd} onChange={e => setFilterStd(e.target.value)}>
                <option value="">All Standards</option>
                {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex:1, minWidth:"100px" }}>
              <select style={{ ...inp }} value={filterDok} onChange={e => setFilterDok(e.target.value)}>
                <option value="">All DOK</option>
                {[1,2,3,4].map(d => <option key={d} value={d}>DOK {d} — {DOK_LABELS[d]}</option>)}
              </select>
            </div>
            <div style={{ flex:2, minWidth:"120px" }}>
              <input style={{ ...inp }} value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Search questions…" />
            </div>
          </div>
          <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }}>
            <span style={{ fontSize:"0.72rem", color:"#555" }}>{filtered.length} shown</span>
            <span style={{ opacity:.4 }}>·</span>
            <span style={{ fontSize:"0.72rem", color:"#555" }}>
              Auto-fill <input type="number" min={1} max={50} value={autoCount} onChange={e=>setAutoCount(Number(e.target.value))}
                style={{ width:"42px", padding:"2px 5px", border:"1px solid #c8d3dd", borderRadius:"3px", fontSize:"0.78rem", textAlign:"center" }} /> questions
            </span>
            <button onClick={autoFill} style={{ ...smBtn, background:"#003865", color:"#fff", borderColor:"#003865" }}>
              ⚡ Auto-fill
            </button>
            <button onClick={() => setSelected([])} style={{ ...smBtn, color:"#8b1a1a", borderColor:"#f0b8b8" }}>
              Clear All
            </button>
          </div>
        </div>

        {/* Question list */}
        <div style={{ flex:1, overflowY:"auto", padding:"0.75rem" }}>
          {bank.length === 0 ? (
            <div style={{ background:"#fff", border:"1px solid #c8d3dd", borderRadius:"3px", padding:"3rem", textAlign:"center", color:"#aaa" }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>📭</div>
              <div style={{ fontWeight:600, color:"#555", marginBottom:"4px" }}>Question bank is empty</div>
              <div style={{ fontSize:"0.82rem" }}>Use the Question Builder or PDF Importer to add questions.</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:"2rem", textAlign:"center", color:"#aaa", fontSize:"0.85rem" }}>No questions match your filters.</div>
          ) : (
            filtered.map(q => {
              const sel = isSelected(q.id);
              return (
                <div key={q.id}
                  onClick={() => toggleSelect(q)}
                  style={{ background: sel ? "#ddeaf7" : "#fff", border:`2px solid ${sel?"#003865":"#c8d3dd"}`, borderRadius:"4px", padding:"0.7rem 1rem", marginBottom:"0.5rem", cursor:"pointer", display:"flex", alignItems:"flex-start", gap:"0.75rem", transition:"all .1s" }}
                >
                  {/* Checkbox */}
                  <div style={{ width:"20px", height:"20px", borderRadius:"4px", border:`2px solid ${sel?"#003865":"#bcc8d4"}`, background:sel?"#003865":"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"2px" }}>
                    {sel && <span style={{ color:"#fff", fontSize:"0.7rem", fontWeight:700 }}>✓</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", gap:"0.4rem", marginBottom:"3px", flexWrap:"wrap" }}>
                      <span style={{ fontSize:"0.6rem", fontWeight:700, color:"#003865", background:"#ddeaf7", padding:"1px 6px", borderRadius:"2px", border:"1px solid #b3cde8" }}>{q.standard}</span>
                      {q.dok && <span style={{ fontSize:"0.6rem", fontWeight:700, color:"#7a4e00", background:"#fff3cd", padding:"1px 6px", borderRadius:"2px", border:"1px solid #ffc107" }}>DOK {q.dok}</span>}
                      <span style={{ fontSize:"0.6rem", color:"#888" }}>{q.short}</span>
                    </div>
                    <div style={{ fontSize:"0.85rem", color:"#1a1a1a", fontFamily:"Georgia,serif", lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                      <MathText text={q.question} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Active test builder ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Test config header */}
        <div style={{ background:"#fff", borderBottom:"1px solid #c8d3dd", padding:"0.75rem 1rem", flexShrink:0 }}>
          <div style={{ fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.12em", color:"#003865", marginBottom:"0.4rem" }}>ACTIVE TEST</div>
          <input style={{ ...inp, fontWeight:600 }} value={testTitle} onChange={e => setTestTitle(e.target.value)} placeholder="Test title…" />
          <div style={{ fontSize:"0.7rem", color:"#888", marginTop:"4px" }}>{selected.length} question{selected.length!==1?"s":""} selected</div>
        </div>

        {/* Selected questions — draggable order */}
        <div style={{ flex:1, overflowY:"auto", padding:"0.75rem" }}>
          {selected.length === 0 ? (
            <div style={{ padding:"3rem 1rem", textAlign:"center", color:"#aaa" }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>👈</div>
              <div style={{ fontWeight:600, color:"#555", marginBottom:"4px" }}>No questions selected</div>
              <div style={{ fontSize:"0.82rem" }}>Click questions on the left to add them, or use Auto-fill.</div>
            </div>
          ) : (
            selectedQuestions.map((q, i) => (
              <div key={q.id} style={{ background:"#fff", border:"1px solid #c8d3dd", borderRadius:"4px", padding:"0.6rem 0.85rem", marginBottom:"0.4rem", display:"flex", alignItems:"center", gap:"0.6rem" }}>
                <div style={{ width:"22px", height:"22px", borderRadius:"50%", background:"#003865", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ color:"#fff", fontSize:"0.65rem", fontWeight:700 }}>{i+1}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", gap:"0.35rem", marginBottom:"2px" }}>
                    <span style={{ fontSize:"0.58rem", fontWeight:700, color:"#003865", background:"#ddeaf7", padding:"1px 5px", borderRadius:"2px" }}>{q.standard}</span>
                    {q.dok && <span style={{ fontSize:"0.58rem", fontWeight:700, color:"#7a4e00", background:"#fff3cd", padding:"1px 5px", borderRadius:"2px" }}>DOK {q.dok}</span>}
                  </div>
                  <div style={{ fontSize:"0.8rem", color:"#1a1a1a", fontFamily:"Georgia,serif", overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>
                    <MathText text={q.question} />
                  </div>
                </div>
                <div style={{ display:"flex", gap:"2px", flexShrink:0 }}>
                  {i>0 && <button onClick={()=>moveUp(i)} style={{ ...smBtn, padding:"3px 7px" }}>↑</button>}
                  {i<selected.length-1 && <button onClick={()=>moveDown(i)} style={{ ...smBtn, padding:"3px 7px" }}>↓</button>}
                  <button onClick={()=>remove(q.id)} style={{ ...smBtn, color:"#8b1a1a", borderColor:"#f0b8b8", padding:"3px 7px" }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Activate button */}
        <div style={{ padding:"0.85rem 1rem", borderTop:"2px solid #c8d3dd", background:"#fff", flexShrink:0 }}>
          <button
            onClick={activateTest}
            disabled={activating || selected.length === 0}
            style={{ width:"100%", background: activated?"#1a6e2e": selected.length===0?"#c8d3dd":"#003865", border:"none", borderRadius:"4px", padding:"0.85rem", fontSize:"0.95rem", fontWeight:700, color:"#fff", cursor:selected.length===0?"not-allowed":"pointer", transition:"background .2s" }}
          >
            {activated ? "✓ Test Activated — Students can begin!" : activating ? "Activating…" : `🚀 Activate Test (${selected.length} questions)`}
          </button>
          {selected.length > 0 && !activated && (
            <div style={{ fontSize:"0.7rem", color:"#888", textAlign:"center", marginTop:"5px" }}>
              Students will immediately see these {selected.length} questions when they log in
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
