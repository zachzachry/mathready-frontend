import { useState, useRef, useCallback, useEffect } from "react";
import MathText from "./shared/MathText";
import PlotGrid from "./shared/PlotGrid";
import { API } from "./shared/constants";


// ── Math snippet toolbar ───────────────────────────────────
const MATH_SNIPPETS = [
  { label: "½",        insert: "$\\frac{1}{2}$",      tip: "Fraction ½" },
  { label: "¾",        insert: "$\\frac{3}{4}$",      tip: "Fraction ¾" },
  { label: "a/b",      insert: "$\\frac{a}{b}$",      tip: "Custom fraction" },
  { label: "×",        insert: " × ",                 tip: "Multiply" },
  { label: "÷",        insert: " ÷ ",                 tip: "Divide" },
  { label: "²",        insert: "$x^{2}$",             tip: "Squared" },
  { label: "10²",      insert: "$10^{2}$",            tip: "Power of 10" },
  { label: "√",        insert: "$\\sqrt{x}$",         tip: "Square root" },
  { label: "≤",        insert: " ≤ ",                 tip: "Less than or equal" },
  { label: "≥",        insert: " ≥ ",                 tip: "Greater than or equal" },
  { label: "°",        insert: "°",                   tip: "Degrees" },
  { label: "π",        insert: "$\\pi$",              tip: "Pi" },
  { label: "cm²",      insert: " cm²",                tip: "Square centimeters" },
  { label: "cm³",      insert: " cm³",                tip: "Cubic centimeters" },
];

function MathToolbar({ onInsert }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginBottom: "6px" }}>
      {MATH_SNIPPETS.map((s, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onInsert(s.insert)}
          title={s.tip}
          style={{ background: "#f0f4f8", border: "1px solid #c8d3dd", borderRadius: "3px", padding: "3px 8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "serif", color: "#1a1a1a", lineHeight: 1.4 }}
          onMouseEnter={e => e.currentTarget.style.background="#ddeaf7"}
          onMouseLeave={e => e.currentTarget.style.background="#f0f4f8"}
        >
          {s.label}
        </button>
      ))}
      <span style={{ fontSize: "0.62rem", color: "#aaa", alignSelf: "center", marginLeft: "4px" }}>
        Wrap custom LaTeX in $…$ e.g. <code>$\frac{2}{3}$</code>
      </span>
    </div>
  );
}

// ── Math-aware textarea ────────────────────────────────────
function MathTextarea({ value, onChange, placeholder, height }) {
  const ref = useRef();

  function insertAtCursor(text) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    // restore cursor after inserted text
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + text.length;
      el.focus();
    });
  }

  return (
    <div>
      <MathToolbar onInsert={insertAtCursor} />
      <textarea
        ref={ref}
        style={{ ...inp, height: height || "72px", resize: "vertical", fontFamily: "monospace", fontSize: "0.88rem" }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────
const LETTERS = ["A","B","C","D"];
const uid = () => `q${String(Math.floor(Math.random()*9000)+1000)}`;

const STANDARD_MAP = {
  // ── Mathematical Practices ─────────────────────────────
  "5.MP.1": { short: "Make Sense & Persevere",      keywords: ["problem","solve","plan","approach","stuck","persevere","check"] },
  "5.MP.2": { short: "Reason Abstractly",           keywords: ["abstract","quantitative","represent","symbol","reason"] },
  "5.MP.3": { short: "Construct Arguments",         keywords: ["argument","explain","justify","critique","prove","convince"] },
  "5.MP.4": { short: "Model with Math",             keywords: ["model","diagram","equation","real world","represent","draw"] },
  "5.MP.5": { short: "Use Tools Strategically",     keywords: ["tool","ruler","calculator","manipulative","choose","strategy"] },
  "5.MP.6": { short: "Attend to Precision",         keywords: ["precise","accurate","label","units","exact","careful"] },
  "5.MP.7": { short: "Use Structure",               keywords: ["pattern","structure","property","rule","organize"] },
  "5.MP.8": { short: "Repeated Reasoning",          keywords: ["repeat","shortcut","generalize","always","regularity"] },

  // ── NR.1: Place Value ──────────────────────────────────
  "5.NR.1.1": { short: "Place Value Relationships", keywords: ["place value","digit","10 times","one-tenth","left","right","represents"] },
  "5.NR.1.2": { short: "Powers of 10",              keywords: ["power of 10","exponent","pattern","multiply","divide","10²","10³"] },

  // ── NR.2: Multiply & Divide Whole Numbers ─────────────
  "5.NR.2.1": { short: "Multiply Multi-Digit",      keywords: ["multiply","product","multi-digit","3-digit","2-digit","factor","fluently"] },
  "5.NR.2.2": { short: "Divide Multi-Digit",        keywords: ["divide","quotient","dividend","divisor","remainder","4-digit","fluently"] },

  // ── NR.3: Fractions ───────────────────────────────────
  "5.NR.3.1": { short: "Fractions as Division",     keywords: ["fraction","division","numerator","denominator","mixed number","divide","a÷b"] },
  "5.NR.3.2": { short: "Compare & Order Fractions", keywords: ["compare","order","fraction","greater","less","benchmark","unlike"] },
  "5.NR.3.3": { short: "Add/Subtract Fractions",    keywords: ["add","subtract","fraction","mixed number","unlike denominator","sum","difference"] },
  "5.NR.3.4": { short: "Multiply Fraction × Whole", keywords: ["multiply","fraction","whole number","product","model"] },
  "5.NR.3.5": { short: "Fraction Scaling",          keywords: ["greater than one","less than one","equal to one","scaling","result","product"] },
  "5.NR.3.6": { short: "Divide Fractions",          keywords: ["divide","unit fraction","whole number","ribbon","split","÷"] },

  // ── NR.4: Decimals ────────────────────────────────────
  "5.NR.4.1": { short: "Read & Write Decimals",     keywords: ["decimal","standard form","expanded form","thousandths","read","write"] },
  "5.NR.4.2": { short: "Compare & Order Decimals",  keywords: ["compare","order","decimal","greater","less","equal","thousandths",">","<"] },
  "5.NR.4.3": { short: "Round Decimals",            keywords: ["round","decimal","hundredths","nearest","place value"] },
  "5.NR.4.4": { short: "Add & Subtract Decimals",   keywords: ["add","subtract","decimal","hundredths","sum","difference","change","price","cost","money"] },

  // ── NR.5: Numerical Expressions ───────────────────────
  "5.NR.5.1": { short: "Numerical Expressions",     keywords: ["expression","evaluate","grouping","parentheses","brackets","order of operations","write","interpret"] },

  // ── PAR.6: Patterns & Algebraic Reasoning ─────────────
  "5.PAR.6.1": { short: "Generate Patterns",        keywords: ["pattern","rule","table","generate","sequence","relationship","terms"] },
  "5.PAR.6.2": { short: "Coordinate Plane",         keywords: ["coordinate","ordered pair","plot","x-axis","y-axis","first quadrant","point","graph"] },

  // ── MDR.7: Measurement & Data ─────────────────────────
  "5.MDR.7.1": { short: "Measurement Problems",     keywords: ["distance","mass","weight","volume","time","measure","unit","realistic"] },
  "5.MDR.7.2": { short: "Graphical Displays",       keywords: ["graph","data","display","bar graph","line plot","table","question","interpret"] },
  "5.MDR.7.3": { short: "Metric Conversions",       keywords: ["metric","convert","kilometer","meter","centimeter","gram","kilogram","liter","milliliter"] },
  "5.MDR.7.4": { short: "Customary Conversions",    keywords: ["customary","convert","inch","foot","yard","mile","ounce","pound","cup","pint","quart","gallon"] },

  // ── GSR.8: Geometry & Spatial Reasoning ───────────────
  "5.GSR.8.1": { short: "Classify Polygons",        keywords: ["polygon","classify","compare","contrast","property","triangle","quadrilateral","pentagon","hexagon"] },
  "5.GSR.8.2": { short: "2D Figure Categories",     keywords: ["category","subcategory","attribute","belong","two-dimensional","rectangle","square","rhombus","trapezoid","parallel","perpendicular"] },
  "5.GSR.8.3": { short: "Volume with Unit Cubes",   keywords: ["volume","unit cube","pack","rectangular prism","fill","layer","gap","overlap"] },
  "5.GSR.8.4": { short: "Volume Formula",           keywords: ["volume","formula","base","height","area","length","width","multiply","rectangular prism","l×w×h"] },
};

const DOK_OPTIONS = [
  { level: 1, label: "Recall",        desc: "Recall a fact, term, or simple procedure" },
  { level: 2, label: "Skill/Concept", desc: "Use information or apply a concept" },
  { level: 3, label: "Strategic",     desc: "Reason, plan, or use evidence" },
  { level: 4, label: "Extended",      desc: "Connect ideas across content or time" },
];

function suggestStandard(text) {
  if (!text || text.length < 8) return null;
  const lower = text.toLowerCase();
  let best = null; let bestScore = 0;
  for (const [std, data] of Object.entries(STANDARD_MAP)) {
    const score = data.keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = std; }
  }
  return bestScore >= 1 ? best : null;
}

// ── Paste image zone ───────────────────────────────────────
function PasteImageZone({ image, onImage, onClear, placeholder }) {
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

  if (image) return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <img src={image} alt="diagram" style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "3px", border: "1px solid #c8d3dd", display: "block" }} />
      <button onClick={onClear} style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "0.65rem" }}>✕</button>
    </div>
  );

  return (
    <div ref={ref} tabIndex={0} onPaste={handlePaste} onClick={() => ref.current?.focus()}
      style={{ border: "2px dashed #c8d3dd", borderRadius: "3px", padding: "0.5rem 0.85rem", fontSize: "0.74rem", color: "#bbb", cursor: "pointer", background: "#fafbfc", outline: "none" }}
      onFocus={e => e.currentTarget.style.borderColor="#003865"}
      onBlur={e  => e.currentTarget.style.borderColor="#c8d3dd"}>
      📋 {placeholder || "Click here, then Ctrl+V / ⌘V to paste image"}
    </div>
  );
}

// ── Question editor ────────────────────────────────────────
function QuestionEditor({ q, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [open, setOpen]         = useState(index === 0);
  const [suggestion, setSuggestion] = useState(null);
  const isPlot = q.type === "plotpoint";
  const isComplete = q.question && q.standard && q.dok && (isPlot ? (Array.isArray(q.answer) && q.answer.length === 2) : (q.choices.filter(c=>c).length===4 && q.correct));

  function update(field, value)  { onChange({ ...q, [field]: value }); }
  function updateChoice(i, val)  { const c=[...q.choices]; c[i]=val; update("choices",c); }
  function updateChoiceImage(i, img) { const ci=[...(q.choiceImages||[null,null,null,null])]; ci[i]=img; update("choiceImages",ci); }

  function handleQuestionChange(text) {
    update("question", text);
    const s = suggestStandard(text);
    setSuggestion(s && s !== q.standard ? s : null);
  }

  function handleStandardChange(std) {
    const data = STANDARD_MAP[std];
    onChange({ ...q, standard: std, short: data?.short || q.short });
    setSuggestion(null);
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${isComplete ? "#b3dfc0" : "#c8d3dd"}`, borderLeft: `4px solid ${isComplete ? "#1a6e2e" : "#bcc8d4"}`, borderRadius: "4px", marginBottom: "0.7rem", overflow: "hidden" }}>

      {/* Header */}
      <div onClick={() => setOpen(o=>!o)} style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.7rem", cursor: "pointer", background: open ? "#f8fafc" : "#fff", borderBottom: open ? "1px solid #e8edf2" : "none" }}>
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: isComplete ? "#d4edda" : "#e8edf2", border: `2px solid ${isComplete ? "#1a6e2e" : "#bcc8d4"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: isComplete ? "#1a6e2e" : "#667" }}>{index+1}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "2px", flexWrap: "wrap" }}>
            {q.standard && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#003865", background: "#ddeaf7", padding: "1px 6px", borderRadius: "2px", border: "1px solid #b3cde8" }}>{q.standard}</span>}
            {q.short    && <span style={{ fontSize: "0.6rem", color: "#666", padding: "1px 6px" }}>{q.short}</span>}
            {q.dok      && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#7a4e00", background: "#fff3cd", padding: "1px 6px", borderRadius: "2px", border: "1px solid #ffc107" }}>DOK {q.dok}</span>}
          </div>
          <div style={{ fontSize: "0.83rem", color: q.question ? "#1a1a1a" : "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {q.question || (q.questionImage ? "[diagram question]" : "Empty — click to edit")}
          </div>
        </div>
        <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
          {!isFirst && <button onClick={e=>{e.stopPropagation();onMoveUp();}} style={smBtn}>↑</button>}
          {!isLast  && <button onClick={e=>{e.stopPropagation();onMoveDown();}} style={smBtn}>↓</button>}
          <button onClick={e=>{e.stopPropagation();onRemove();}} style={{...smBtn,color:"#8b1a1a",borderColor:"#f0b8b8"}}>✕</button>
          <span style={{ color: "#bbb", fontSize: "0.8rem", paddingLeft: "4px" }}>{open?"▲":"▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Standard + skill + DOK */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: "200px" }}>
              <label style={lbl}>GSE STANDARD <span style={{ fontWeight: 400, color: "#aaa" }}>— auto-suggests as you type</span></label>
              <select style={{ ...inp, fontFamily: "monospace", borderColor: suggestion ? "#ffc107" : "#c8d3dd" }} value={q.standard} onChange={e => handleStandardChange(e.target.value)}>
                {Object.keys(STANDARD_MAP).map(s => <option key={s} value={s}>{s} — {STANDARD_MAP[s].short}</option>)}
              </select>
              {suggestion && (
                <div style={{ marginTop: "5px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.73rem" }}>
                  <span style={{ color: "#7a4e00" }}>💡 Suggested:</span>
                  <button onClick={() => handleStandardChange(suggestion)} style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "3px", padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#7a4e00" }}>
                    Use {suggestion} — {STANDARD_MAP[suggestion]?.short}
                  </button>
                  <button onClick={() => setSuggestion(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "0.72rem" }}>dismiss</button>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={lbl}>SKILL LABEL <span style={{ fontWeight: 400, color: "#aaa" }}>— auto-filled</span></label>
              <input style={inp} value={q.short} onChange={e => update("short",e.target.value)} placeholder="e.g. Place Value" />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={lbl}>DEPTH OF KNOWLEDGE</label>
              <div style={{ display: "flex", gap: "4px" }}>
                {DOK_OPTIONS.map(d => (
                  <button key={d.level} onClick={() => update("dok",d.level)} title={`DOK ${d.level} — ${d.label}: ${d.desc}`}
                    style={{ flex: 1, padding: "6px 0", border: `2px solid ${q.dok===d.level?"#003865":"#c8d3dd"}`, borderRadius: "3px", background: q.dok===d.level?"#003865":"#fafbfc", color: q.dok===d.level?"#fff":"#555", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                    {d.level}
                  </button>
                ))}
              </div>
              {q.dok && <div style={{ fontSize: "0.67rem", color: "#888", marginTop: "4px" }}><strong>DOK {q.dok} — {DOK_OPTIONS[q.dok-1].label}</strong></div>}
            </div>
          </div>

          {/* Question type toggle */}
          <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
            <span style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:"#555"}}>QUESTION TYPE</span>
            {[["mcq","📝 Multiple Choice"],["plotpoint","📍 Plot a Point"]].map(([t,lbl2])=>(
              <button key={t} onClick={()=>update("type",t)}
                style={{padding:"5px 12px",borderRadius:"4px",border:`2px solid ${q.type===t?"#003865":"#c8d3dd"}`,background:q.type===t?"#003865":"#fafbfc",color:q.type===t?"#fff":"#555",fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
                {lbl2}
              </button>
            ))}
          </div>

          {/* Question text with math toolbar */}
          <div>
            <label style={lbl}>QUESTION TEXT <span style={{ fontWeight: 400, color: "#aaa" }}>— press Enter for new line · wrap math in $…$</span></label>
            <MathTextarea value={q.question} onChange={text => handleQuestionChange(text)} placeholder={"Type the question here…\nPress Enter to start a new line.\nUse toolbar buttons or $\\frac{1}{2}$ for fractions."} height="90px" />
          </div>

          {/* Question image */}
          <div>
            <label style={lbl}>QUESTION DIAGRAM <span style={{ fontWeight: 400, color: "#aaa" }}>— optional</span></label>
            <PasteImageZone image={q.questionImage} onImage={img=>update("questionImage",img)} onClear={()=>update("questionImage",null)} placeholder="Click here then Ctrl+V / ⌘V to paste a screenshot" />
          </div>

          {/* Answer choices — MCQ */}
          {!isPlot && (
          <div>
            <label style={lbl}>ANSWER CHOICES <span style={{ fontWeight: 400, color: "#aaa" }}>— text, math, and/or diagram per choice</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {q.choices.map((choice, i) => {
                const isCorrect = q.correct === choice && choice;
                const ci = q.choiceImages?.[i] ?? null;
                return (
                  <div key={i} style={{ border: `1px solid ${isCorrect ? "#b3dfc0" : "#dde3e9"}`, borderRadius: "4px", background: isCorrect ? "#f0faf2" : "#fafbfc", padding: "0.6rem 0.8rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                      <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: `2px solid ${isCorrect ? "#1a6e2e" : "#bcc8d4"}`, background: isCorrect ? "#1a6e2e" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: isCorrect ? "#fff" : "#667" }}>{LETTERS[i]}</span>
                      </div>
                      <input style={{ ...inp, flex: 1, padding: "0.4rem 0.65rem", fontFamily: "monospace", fontSize: "0.85rem" }} value={choice} onChange={e => updateChoice(i, e.target.value)} placeholder={`Choice ${LETTERS[i]} — use $\frac{1}{2}$ for fractions`} />
                      <button onClick={() => update("correct", choice || null)}
                        style={{ ...smBtn, background: isCorrect?"#1a6e2e":"#f0f4f8", color: isCorrect?"#fff":"#555", borderColor: isCorrect?"#1a6e2e":"#c8d3dd", padding: "5px 10px", whiteSpace: "nowrap" }}>
                        {isCorrect ? "✓ Correct" : "Mark Correct"}
                      </button>
                    </div>
                    <div style={{ marginLeft: "30px" }}>
                      <PasteImageZone image={ci} onImage={img=>updateChoiceImage(i,img)} onClear={()=>updateChoiceImage(i,null)} placeholder={`Paste diagram for choice ${LETTERS[i]} (optional)`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {/* Answer — Plot Point */}
          {isPlot && (
          <div>
            <label style={lbl}>CORRECT ANSWER — click the grid to set the answer point</label>
            <div style={{display:"flex",gap:"1.5rem",alignItems:"flex-start",flexWrap:"wrap"}}>
              <PlotGrid
                answer={q.answer}
                placed={q.answer}
                onPlace={pt => update("answer", pt)}
                size={260}
              />
              <div style={{fontSize:"0.82rem",color:"#555",lineHeight:1.7,paddingTop:"0.5rem"}}>
                {q.answer
                  ? <><strong style={{color:"#1a6e2e",fontSize:"1rem"}}>✓ ({q.answer[0]}, {q.answer[1]})</strong><br/>Click a different point to change it.</>
                  : <span style={{color:"#8b1a1a"}}>Click a point on the grid to set the correct answer.</span>}
              </div>
            </div>
          </div>
          )}

          {/* Live preview */}
          {(q.question || q.questionImage) && (
            <div style={{ borderTop: "1px solid #eef1f4", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: "#888", marginBottom: "0.65rem" }}>STUDENT PREVIEW — renders math & line breaks</div>
              <div style={{ background: "#f8fafc", border: "1px solid #dde3e9", borderRadius: "4px", padding: "1rem 1.1rem" }}>
                <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#003865", background: "#ddeaf7", padding: "2px 7px", borderRadius: "2px", border: "1px solid #b3cde8" }}>{q.standard}</span>
                  {q.dok && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: "#7a4e00", background: "#fff3cd", padding: "2px 7px", borderRadius: "2px", border: "1px solid #ffc107" }}>DOK {q.dok}</span>}
                </div>
                {q.question && (
                  <p style={{ fontFamily: "Georgia,serif", fontSize: "0.95rem", color: "#0f0f0f", lineHeight: 1.7, margin: "0 0 0.5rem" }}>
                    <MathText text={q.question} />
                  </p>
                )}
                {q.questionImage && <img src={q.questionImage} alt="diagram" style={{ maxWidth: "100%", maxHeight: "160px", borderRadius: "3px", marginBottom: "0.5rem", display: "block" }} />}
                {isPlot ? (
                  <div style={{marginTop:"0.5rem"}}>
                    <PlotGrid answer={q.answer} placed={q.answer} readOnly size={220}/>
                    {q.answer && <div style={{fontSize:"0.78rem",color:"#1a6e2e",marginTop:"4px",fontWeight:700}}>Answer: ({q.answer[0]}, {q.answer[1]})</div>}
                  </div>
                ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {q.choices.map((c, i) => {
                    const ci = q.choiceImages?.[i];
                    if (!c && !ci) return null;
                    const isC = q.correct === c && c;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0.75rem", border: `1px solid ${isC?"#003865":"#dde3e9"}`, borderRadius: "3px", background: isC?"#ddeaf7":"#fff" }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${isC?"#003865":"#9aabba"}`, background: isC?"#003865":"#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: isC?"#fff":"#667" }}>{LETTERS[i]}</span>
                        </div>
                        <div>
                          {c && <MathText text={c} style={{ fontSize: "0.9rem", fontFamily: "Georgia,serif", color: "#0f0f0f" }} />}
                          {ci && <img src={ci} alt={`choice ${LETTERS[i]}`} style={{ maxHeight: "55px", maxWidth: "160px", display: "block", marginTop: c?"3px":0, borderRadius: "2px" }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────
function EMPTY_Q() {
  return { id: uid(), type: "mcq", standard: "5.NR.1.1", short: "Place Value Relationships", question: "", questionImage: null, choices: ["","","",""], choiceImages: [null,null,null,null], correct: "", answer: null, dok: null };
}

export default function QuestionBuilder() {
  const [questions, setQuestions] = useState([EMPTY_Q()]);
  const [copied, setCopied] = useState(false);

  function addQuestion() {
    setQuestions(qs => {
      const last = qs[qs.length - 1];
      return [...qs, {
        ...EMPTY_Q(),
        // carry forward standard, skill label, and DOK from the last question
        standard: last?.standard || "MGSE5.NBT.1",
        short:    last?.short    || "Place Value",
        dok:      last?.dok      || null,
      }];
    });
  }
  function updateQ(i, updated) { setQuestions(qs => qs.map((q,j) => j===i ? updated : q)); }
  function removeQ(i)          { setQuestions(qs => qs.filter((_,j) => j!==i)); }
  function moveUp(i)           { if(i===0)return; setQuestions(qs=>{const a=[...qs];[a[i-1],a[i]]=[a[i],a[i-1]];return a;}); }
  function moveDown(i)         { setQuestions(qs=>{if(i>=qs.length-1)return qs;const a=[...qs];[a[i],a[i+1]]=[a[i+1],a[i]];return a;}); }

  function copyJSON() {
    const out = questions.map((q,i) => ({
      id: `q${String(i+1).padStart(3,"0")}`,
      standard: q.standard, short: q.short, dok: q.dok,
      question: q.question,
      ...(q.questionImage ? { questionImage: q.questionImage } : {}),
      choices: q.choices,
      ...(q.choiceImages?.some(c=>c) ? { choiceImages: q.choiceImages } : {}),
      correct: q.correct,
    }));
    navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    setCopied(true); setTimeout(()=>setCopied(false), 2500);
  }

  const [saving, setSaving]   = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  async function saveToBank() {
    const complete_qs = questions.filter(q => q.question && q.standard && q.dok && (q.type==="plotpoint" ? (Array.isArray(q.answer)&&q.answer.length===2) : (q.choices.filter(c=>c).length===4 && q.correct)));
    if (complete_qs.length === 0) return;
    setSaving(true);
    let count = 0;
    for (const q of complete_qs) {
      try {
        await fetch(`${API}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(q),
        });
        count++;
      } catch {}
    }
    setSaving(false);
    setSavedCount(count);
    setTimeout(() => setSavedCount(0), 3000);
  }

  const complete = questions.filter(q => q.question && q.choices.filter(c=>c).length===4 && q.correct && q.standard && q.dok).length;

  return (
    <div style={{ minHeight: "100vh", background: "#e8edf2", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#003865", color: "#fff", padding: "0 1.5rem", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,.3)" }}>
        <div>
          <div style={{ fontSize: "0.58rem", opacity: .65, letterSpacing: "0.14em" }}>GEORGIA MILESTONES READINESS TRAINER</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Question Builder</div>
        </div>
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", opacity: .75 }}>{complete}/{questions.length} complete</span>
          <button onClick={saveToBank} disabled={saving||complete===0}
            style={{ background: savedCount>0?"#d4edda":complete===0?"#c8d3dd":"#1a6e2e", color: savedCount>0?"#1a6e2e":"#fff", border: "none", borderRadius: "3px", padding: "6px 14px", fontWeight: 700, fontSize: "0.8rem", cursor: complete===0?"not-allowed":"pointer" }}>
            {savedCount>0 ? `✓ Saved ${savedCount} to Bank!` : saving ? "Saving…" : `💾 Save to Bank (${complete})`}
          </button>
          <button onClick={copyJSON} style={{ background: copied?"#d4edda":"#fff", color: copied?"#1a6e2e":"#003865", border: "none", borderRadius: "3px", padding: "6px 14px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
            {copied ? "✓ Copied!" : "📋 Copy JSON"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* DOK legend */}
        <div style={{ background: "#fff", border: "1px solid #c8d3dd", borderRadius: "4px", padding: "0.75rem 1.1rem", marginBottom: "1rem", display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "#555" }}>DOK:</span>
          {DOK_OPTIONS.map(d => (
            <span key={d.level} style={{ fontSize: "0.72rem", color: "#555" }}>
              <strong style={{ color: "#003865" }}>{d.level} {d.label}</strong> — <span style={{ color: "#888" }}>{d.desc}</span>
            </span>
          ))}
        </div>

        {questions.map((q, i) => (
          <QuestionEditor key={q.id} q={q} index={i}
            onChange={u => updateQ(i,u)} onRemove={() => removeQ(i)}
            onMoveUp={() => moveUp(i)} onMoveDown={() => moveDown(i)}
            isFirst={i===0} isLast={i===questions.length-1} />
        ))}

        <button onClick={addQuestion}
          style={{ width: "100%", background: "#fff", border: "2px dashed #003865", borderRadius: "4px", padding: "0.85rem", fontSize: "0.88rem", fontWeight: 700, color: "#003865", cursor: "pointer" }}
          onMouseEnter={e=>e.currentTarget.style.background="#f0f4f8"}
          onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
          + Add Question
        </button>

        <div style={{ marginTop: "1rem", background: "#f0f4f8", border: "1px solid #dde3e9", borderRadius: "3px", padding: "0.75rem 1.1rem", fontSize: "0.78rem", color: "#666" }}>
          <strong>Math syntax:</strong> Wrap any LaTeX in dollar signs — <code>$\frac{2}{3}$</code> renders as a fraction, <code>$10^{2}$</code> renders as 10². Use the toolbar buttons for common symbols. Press <strong>Enter</strong> in the question box for a new line.
        </div>
      </div>
    </div>
  );
}

const lbl   = { display: "block", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: "#555", marginBottom: "5px" };
const inp   = { width: "100%", padding: "0.6rem 0.85rem", border: "1px solid #c8d3dd", borderRadius: "3px", fontSize: "0.9rem", color: "#1a1a1a", background: "#fafbfc", boxSizing: "border-box" };
const smBtn = { background: "#f0f4f8", border: "1px solid #c8d3dd", borderRadius: "3px", padding: "4px 7px", cursor: "pointer", fontSize: "0.7rem", color: "#333", fontWeight: 600 };
