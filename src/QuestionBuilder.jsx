import { useState, useRef, useCallback, useEffect } from "react";
import MathText from "./shared/MathText";
import PlotGrid from "./shared/PlotGrid";
import { API, QUESTIONS as BUILTIN_QUESTIONS, T } from "./shared/constants";


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
          style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.xs, padding: "3px 8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "serif", color: T.text, lineHeight: 1.4 }}
          onMouseEnter={e => e.currentTarget.style.background="#ddeaf7"}
          onMouseLeave={e => e.currentTarget.style.background=T.surfaceAlt}
        >
          {s.label}
        </button>
      ))}
      <span style={{ fontSize: "0.62rem", color: T.textMuted, alignSelf: "center", marginLeft: "4px" }}>
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
      <img src={image} alt="diagram" style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: T.xs, border: `1px solid ${T.border}`, display: "block" }} />
      <button onClick={onClear} style={{ position: "absolute", top: "4px", right: "4px", background: "rgba(0,0,0,.6)", color: "#fff", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", fontSize: "0.65rem" }}>✕</button>
    </div>
  );

  return (
    <div ref={ref} tabIndex={0} onPaste={handlePaste} onClick={() => ref.current?.focus()}
      style={{ border: `2px dashed ${T.border}`, borderRadius: T.xs, padding: "0.5rem 0.85rem", fontSize: "0.74rem", color: T.textMuted, cursor: "pointer", background: T.surface, outline: "none" }}
      onFocus={e => e.currentTarget.style.borderColor=T.teal}
      onBlur={e  => e.currentTarget.style.borderColor=T.border}>
      📋 {placeholder || "Click here, then Ctrl+V / ⌘V to paste image"}
    </div>
  );
}

// ── Question editor ────────────────────────────────────────
function QuestionEditor({ q, index, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const [open, setOpen]         = useState(index === 0);
  const [suggestion, setSuggestion] = useState(null);
  const isPlot     = q.type === "plotpoint";
  const isMulti    = q.type === "multiselect";
  const isKeypad   = q.type === "keypad";
  const isDragDrop = q.type === "dragdrop";
  const isMCQ      = !isPlot && !isMulti && !isKeypad && !isDragDrop;

  function update(field, value)  { onChange({ ...q, [field]: value }); }
  function updateChoice(i, val)  { const c=[...q.choices]; c[i]=val; update("choices",c); }
  function updateChoiceImage(i, img) { const ci=[...(q.choiceImages||[null,null,null,null])]; ci[i]=img; update("choiceImages",ci); }

  function toggleCorrectMulti(choice) {
    if (!choice) return;
    const cur = Array.isArray(q.answer) ? q.answer : [];
    const next = cur.includes(choice) ? cur.filter(c => c !== choice) : [...cur, choice];
    update("answer", next);
  }

  const isComplete = (() => {
    if (!q.question || !q.standard || !q.dok) return false;
    if (isPlot)     return Array.isArray(q.answer) && q.answer.length === 2;
    if (isKeypad)   return q.answer != null && String(q.answer).trim() !== "";
    if (isMulti)    return Array.isArray(q.answer) && q.answer.length >= 2 && q.choices.filter(c=>c).length >= 4;
    if (isDragDrop) { const fi=(q.items||[]).filter(x=>x.trim()); const cor=typeof q.correct==="object"&&!Array.isArray(q.correct)?q.correct:{}; const hasReal=fi.some(item=>typeof cor[item]==="number"); const noDupes=new Set(fi.map(x=>x.trim())).size===fi.length; return (q.zones||[]).length>=2 && fi.length>=2 && fi.every(item=>cor[item]!==undefined) && hasReal && noDupes; }
    return q.choices.filter(c=>c).length === 4 && !!q.correct;
  })();

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
    <div style={{ background: T.white, border: `1px solid ${isComplete ? T.successBd : T.border}`, borderLeft: `4px solid ${isComplete ? T.success : "#bcc8d4"}`, borderRadius: T.xs, marginBottom: "0.7rem", overflow: "hidden" }}>

      {/* Header */}
      <div onClick={() => setOpen(o=>!o)} style={{ padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.7rem", cursor: "pointer", background: open ? T.surface : T.white, borderBottom: open ? "1px solid #e8edf2" : "none" }}>
        <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: isComplete ? "#d4edda" : "#e8edf2", border: `2px solid ${isComplete ? T.success : "#bcc8d4"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: isComplete ? T.success : "#667" }}>{index+1}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "2px", flexWrap: "wrap", alignItems: "center" }}>
            {q.id && <span style={{ fontSize: "0.65rem", fontWeight: 700, fontFamily: "monospace", color: T.white, background: T.teal, padding: "1px 7px", borderRadius: T.xs, letterSpacing:"0.05em" }}>{q.id}</span>}
            {q.standard && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: T.teal, background: "#ddeaf7", padding: "1px 6px", borderRadius: "2px", border: "1px solid #b3cde8" }}>{q.standard}</span>}
            {q.short    && <span style={{ fontSize: "0.6rem", color: T.textSecondary, padding: "1px 6px" }}>{q.short}</span>}
            {q.dok      && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: T.warning, background: "#fff3cd", padding: "1px 6px", borderRadius: "2px", border: `1px solid ${T.warningBd}` }}>DOK {q.dok}</span>}
          </div>
          <div style={{ fontSize: "0.83rem", color: q.question ? T.text : T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {q.question || (q.questionImage ? "[diagram question]" : "Empty — click to edit")}
          </div>
        </div>
        <div style={{ display: "flex", gap: "3px", flexShrink: 0 }}>
          {!isFirst && <button onClick={e=>{e.stopPropagation();onMoveUp();}} style={smBtn}>↑</button>}
          {!isLast  && <button onClick={e=>{e.stopPropagation();onMoveDown();}} style={smBtn}>↓</button>}
          <button onClick={e=>{e.stopPropagation();onRemove();}} style={{...smBtn,color:T.dangerText,borderColor:T.dangerBd}}>✕</button>
          <span style={{ color: T.textMuted, fontSize: "0.8rem", paddingLeft: "4px" }}>{open?"▲":"▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Standard + skill + DOK */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: "200px" }}>
              <label style={lbl}>GSE STANDARD <span style={{ fontWeight: 400, color: T.textMuted }}>— auto-suggests as you type</span></label>
              <select style={{ ...inp, fontFamily: "monospace", borderColor: suggestion ? T.warningBd : T.border }} value={q.standard} onChange={e => handleStandardChange(e.target.value)}>
                {Object.keys(STANDARD_MAP).map(s => <option key={s} value={s}>{s} — {STANDARD_MAP[s].short}</option>)}
              </select>
              {suggestion && (
                <div style={{ marginTop: "5px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.73rem" }}>
                  <span style={{ color: T.warning }}>💡 Suggested:</span>
                  <button onClick={() => handleStandardChange(suggestion)} style={{ background: "#fff3cd", border: `1px solid ${T.warningBd}`, borderRadius: T.xs, padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: T.warning }}>
                    Use {suggestion} — {STANDARD_MAP[suggestion]?.short}
                  </button>
                  <button onClick={() => setSuggestion(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: "0.72rem" }}>dismiss</button>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={lbl}>SKILL LABEL <span style={{ fontWeight: 400, color: T.textMuted }}>— auto-filled</span></label>
              <input style={inp} value={q.short} onChange={e => update("short",e.target.value)} placeholder="e.g. Place Value" />
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <label style={lbl}>DEPTH OF KNOWLEDGE</label>
              <div style={{ display: "flex", gap: "4px" }}>
                {DOK_OPTIONS.map(d => (
                  <button key={d.level} onClick={() => update("dok",d.level)} title={`DOK ${d.level} — ${d.label}: ${d.desc}`}
                    style={{ flex: 1, padding: "6px 0", border: `2px solid ${q.dok===d.level?T.teal:T.border}`, borderRadius: T.xs, background: q.dok===d.level?T.teal:T.surface, color: q.dok===d.level?T.white:T.textSecondary, fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
                    {d.level}
                  </button>
                ))}
              </div>
              {q.dok && <div style={{ fontSize: "0.67rem", color: T.textSecondary, marginTop: "4px" }}><strong>DOK {q.dok} — {DOK_OPTIONS[q.dok-1].label}</strong></div>}
            </div>
          </div>

          {/* Question type toggle */}
          <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
            <span style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary}}>QUESTION TYPE</span>
            {[["mcq","📝 Multiple Choice"],["multiselect","☑ Multi-Select"],["keypad","🔢 Numeric Answer"],["plotpoint","📍 Plot a Point"],["dragdrop","🔀 Drag & Drop"]].map(([t,lbl2])=>(
              <button key={t} onClick={()=>{
                if(t==="dragdrop") onChange({...q,type:t,zones:q.zones||["Category 1","Category 2"],items:q.items||[""],correct:(typeof q.correct==="object"&&!Array.isArray(q.correct))?q.correct:{}});
                else update("type",t);
              }}
                style={{padding:"5px 12px",borderRadius:T.xs,border:`2px solid ${q.type===t?T.teal:T.border}`,background:q.type===t?T.teal:T.surface,color:q.type===t?T.white:T.textSecondary,fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
                {lbl2}
              </button>
            ))}
          </div>

          {/* Question text with math toolbar */}
          <div>
            <label style={lbl}>QUESTION TEXT <span style={{ fontWeight: 400, color: T.textMuted }}>— press Enter for new line · wrap math in $…$</span></label>
            <MathTextarea value={q.question} onChange={text => handleQuestionChange(text)} placeholder={"Type the question here…\nPress Enter to start a new line.\nUse toolbar buttons or $\\frac{1}{2}$ for fractions."} height="90px" />
          </div>

          {/* Question image */}
          <div>
            <label style={lbl}>QUESTION DIAGRAM <span style={{ fontWeight: 400, color: T.textMuted }}>— optional</span></label>
            <PasteImageZone image={q.questionImage} onImage={img=>update("questionImage",img)} onClear={()=>update("questionImage",null)} placeholder="Click here then Ctrl+V / ⌘V to paste a screenshot" />
          </div>

          {/* Answer choices — MCQ and Multi-Select */}
          {(isMCQ || isMulti) && (
          <div>
            <label style={lbl}>ANSWER CHOICES <span style={{ fontWeight: 400, color: T.textMuted }}>— text, math, and/or diagram per choice</span></label>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {q.choices.map((choice, i) => {
                const isCorrect = isMulti
                  ? (Array.isArray(q.answer) && q.answer.includes(choice) && !!choice)
                  : (q.correct === choice && !!choice);
                const ci = q.choiceImages?.[i] ?? null;
                return (
                  <div key={i} style={{ border: `1px solid ${isCorrect ? T.successBd : T.border}`, borderRadius: T.xs, background: isCorrect ? T.successBg : T.surface, padding: "0.6rem 0.8rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                      <div style={{ width: "22px", height: "22px", borderRadius: "50%", border: `2px solid ${isCorrect ? T.success : "#bcc8d4"}`, background: isCorrect ? T.success : T.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: isCorrect ? T.white : "#667" }}>{LETTERS[i]}</span>
                      </div>
                      <input style={{ ...inp, flex: 1, padding: "0.4rem 0.65rem", fontFamily: "monospace", fontSize: "0.85rem" }} value={choice} onChange={e => updateChoice(i, e.target.value)} placeholder={`Choice ${LETTERS[i]} — use $\frac{1}{2}$ for fractions`} />
                      {isMulti ? (
                        <button onClick={() => toggleCorrectMulti(choice)}
                          style={{ ...smBtn, background: isCorrect?T.success:T.surfaceAlt, color: isCorrect?T.white:T.textSecondary, borderColor: isCorrect?T.success:T.border, padding: "5px 10px", whiteSpace: "nowrap" }}>
                          {isCorrect ? "✓ Correct" : "+ Correct"}
                        </button>
                      ) : (
                        <button onClick={() => update("correct", choice || null)}
                          style={{ ...smBtn, background: isCorrect?T.success:T.surfaceAlt, color: isCorrect?T.white:T.textSecondary, borderColor: isCorrect?T.success:T.border, padding: "5px 10px", whiteSpace: "nowrap" }}>
                          {isCorrect ? "✓ Correct" : "Mark Correct"}
                        </button>
                      )}
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

          {/* Multiselect helper */}
          {isMulti && (
            <div style={{background:T.surfaceAlt,borderRadius:T.xs,padding:"0.6rem 0.9rem",fontSize:"0.75rem",color:T.textSecondary}}>
              <strong>Multi-Select:</strong> Click "+ Correct" on 2–3 choices above.
              Currently correct: {Array.isArray(q.answer) && q.answer.length > 0
                ? q.answer.map((a,i) => <strong key={i} style={{color:T.success}}>{a}{i < q.answer.length-1 ? ", " : ""}</strong>)
                : <span style={{color:T.dangerText}}>None selected yet.</span>}
            </div>
          )}

          {/* Answer — Keypad / Numeric */}
          {isKeypad && (
          <div>
            <label style={lbl}>CORRECT ANSWER <span style={{fontWeight:400,color:T.textMuted}}>— exact numeric value (decimals ok)</span></label>
            <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
              <input
                type="text"
                inputMode="decimal"
                value={q.answer ?? ""}
                onChange={e => update("answer", e.target.value)}
                placeholder="e.g.  3.5  or  1/4  or  12"
                style={{...inp, fontFamily:"monospace", fontSize:"1.1rem", fontWeight:700, maxWidth:"200px", letterSpacing:"0.05em"}}
              />
              {q.answer && <span style={{fontSize:"0.78rem",color:T.success,fontWeight:700}}>✓ Answer set: {q.answer}</span>}
            </div>
            <div style={{fontSize:"0.7rem",color:T.textSecondary,marginTop:"4px"}}>
              Student types their answer — graded by exact match (trimmed, case-insensitive).
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
              <div style={{fontSize:"0.82rem",color:T.textSecondary,lineHeight:1.7,paddingTop:"0.5rem"}}>
                {q.answer
                  ? <><strong style={{color:T.success,fontSize:"1rem"}}>✓ ({q.answer[0]}, {q.answer[1]})</strong><br/>Click a different point to change it.</>
                  : <span style={{color:T.dangerText}}>Click a point on the grid to set the correct answer.</span>}
              </div>
            </div>
          </div>
          )}

          {/* Answer — Drag & Drop */}
          {isDragDrop && (
          <div>
            <div style={{display:"flex",gap:"0.5rem",alignItems:"center",marginBottom:"0.75rem"}}>
              <span style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary}}>LAYOUT</span>
              {[["categories","📊 Sort into Categories"],["blanks","📝 Fill in Blanks"]].map(([v,l])=>(
                <button key={v} onClick={()=>update("ddLayout",v)}
                  style={{padding:"4px 10px",borderRadius:T.xs,border:`2px solid ${(q.ddLayout||"categories")===v?T.teal:T.border}`,background:(q.ddLayout||"categories")===v?T.teal:T.surface,color:(q.ddLayout||"categories")===v?T.white:T.textSecondary,fontSize:"0.72rem",fontWeight:700,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
            <label style={lbl}>{(q.ddLayout||"categories")==="blanks"?"BLANK LABELS":"DROP ZONES"} <span style={{fontWeight:400,color:T.textMuted}}>— {(q.ddLayout||"categories")==="blanks"?"named slots students fill in":"categories students will sort items into"}</span></label>
            <div style={{display:"flex",flexDirection:"column",gap:"0.4rem",marginBottom:"0.75rem"}}>
              {(q.zones||["Category 1","Category 2"]).map((zone,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                  <span style={{fontSize:"0.72rem",fontWeight:700,color:T.midnight,width:"20px"}}>{i+1}.</span>
                  <input style={{flex:1,padding:"0.45rem 0.65rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.85rem",background:T.surface,boxSizing:"border-box"}}
                    value={zone} onChange={e=>{const z=[...(q.zones||[])];z[i]=e.target.value;update("zones",z);}} placeholder={`Category ${i+1}`}/>
                  {(q.zones||[]).length>2 && <button onClick={()=>update("zones",(q.zones||[]).filter((_,j)=>j!==i))}
                    style={{border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"3px 8px",cursor:"pointer",fontSize:"0.75rem",color:"#8b1a1a",background:"#fdf2f2"}}>✕</button>}
                </div>
              ))}
              <button onClick={()=>update("zones",[...(q.zones||[]),`Category ${(q.zones||[]).length+1}`])}
                style={{alignSelf:"flex-start",border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"4px 12px",cursor:"pointer",fontSize:"0.75rem",fontWeight:600,background:T.surfaceAlt,color:T.text}}>+ Add Zone</button>
            </div>

            <label style={lbl}>{(q.ddLayout||"categories")==="blanks"?"ANSWER TILES":"DRAG ITEMS"} <span style={{fontWeight:400,color:T.textMuted}}>— {(q.ddLayout||"categories")==="blanks"?"options students drag into blanks (include distractors)":"assign each to its correct zone"}</span></label>
            <div style={{display:"flex",flexDirection:"column",gap:"0.4rem"}}>
              {(q.items||[""]).map((item,i)=>{
                const isDupe=item.trim()&&(q.items||[]).filter(x=>x.trim()===item.trim()).length>1;
                return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                  <input style={{flex:2,padding:"0.45rem 0.65rem",border:`1px solid ${isDupe?"#c0392b":T.border}`,borderRadius:T.xs,fontSize:"0.85rem",background:isDupe?"#fdf2f2":T.surface,boxSizing:"border-box"}}
                    title={isDupe?"Duplicate item name — each item must be unique":""}
                    value={item} onChange={e=>{
                      const oldVal=item; const newVal=e.target.value;
                      const it=[...(q.items||[])];it[i]=newVal;
                      const cor={...(typeof q.correct==="object"&&!Array.isArray(q.correct)?q.correct:{})};
                      if(oldVal in cor){cor[newVal]=cor[oldVal];delete cor[oldVal];}
                      onChange({...q,items:it,correct:cor});
                    }} placeholder={`Item ${i+1}`}/>
                  <select style={{flex:1,padding:"0.45rem 0.5rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.78rem",background:T.surface}}
                    value={(q.correct||{})[item]??""}
                    onChange={e=>{const v=e.target.value; const c={...(typeof q.correct==="object"&&!Array.isArray(q.correct)?q.correct:{})}; if(v==="") {delete c[item];} else if(v==="distractor") {c[item]="distractor";} else {c[item]=Number(v);} update("correct",c);}}>
                    <option value="">— assign zone —</option>
                    {(q.zones||[]).map((z,zi)=><option key={zi} value={zi}>{z}</option>)}
                    <option value="distractor">🚫 Distractor (unused)</option>
                  </select>
                  {(q.items||[]).length>1 && <button onClick={()=>{
                    const items=(q.items||[]).filter((_,j)=>j!==i);
                    const correct={...(typeof q.correct==="object"&&!Array.isArray(q.correct)?q.correct:{})};
                    delete correct[item];
                    onChange({...q,items,correct});
                  }} style={{border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"3px 8px",cursor:"pointer",fontSize:"0.75rem",color:"#8b1a1a",background:"#fdf2f2"}}>✕</button>}
                </div>
              );})}
              <button onClick={()=>update("items",[...(q.items||[]),""])}
                style={{alignSelf:"flex-start",border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"4px 12px",cursor:"pointer",fontSize:"0.75rem",fontWeight:600,background:T.surfaceAlt,color:T.text}}>+ Add Item</button>
            </div>
          </div>
          )}

          {/* Live preview */}
          {(q.question || q.questionImage) && (
            <div style={{ borderTop: "1px solid #eef1f4", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: T.textSecondary, marginBottom: "0.65rem" }}>STUDENT PREVIEW — renders math & line breaks</div>
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.xs, padding: "1rem 1.1rem" }}>
                <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.6rem", fontWeight: 700, color: T.teal, background: "#ddeaf7", padding: "2px 7px", borderRadius: "2px", border: "1px solid #b3cde8" }}>{q.standard}</span>
                  {q.dok && <span style={{ fontSize: "0.6rem", fontWeight: 700, color: T.warning, background: "#fff3cd", padding: "2px 7px", borderRadius: "2px", border: `1px solid ${T.warningBd}` }}>DOK {q.dok}</span>}
                </div>
                {q.question && (
                  <p style={{ fontFamily: "Georgia,serif", fontSize: "0.95rem", color: "#0f0f0f", lineHeight: 1.7, margin: "0 0 0.5rem" }}>
                    <MathText text={q.question} />
                  </p>
                )}
                {q.questionImage && <img src={q.questionImage} alt="diagram" style={{ maxWidth: "100%", maxHeight: "160px", borderRadius: T.xs, marginBottom: "0.5rem", display: "block" }} />}
                {isPlot ? (
                  <div style={{marginTop:"0.5rem"}}>
                    <PlotGrid answer={q.answer} placed={q.answer} readOnly size={220}/>
                    {q.answer && <div style={{fontSize:"0.78rem",color:T.success,marginTop:"4px",fontWeight:700}}>Answer: ({q.answer[0]}, {q.answer[1]})</div>}
                  </div>
                ) : isDragDrop ? (
                  <div style={{marginTop:"0.5rem"}}>
                    <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min((q.zones||[]).length,3)},1fr)`,gap:"0.5rem"}}>
                      {(q.zones||[]).map((zone,zi)=>(
                        <div key={zi} style={{border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.5rem",background:T.white}}>
                          <div style={{fontSize:"0.65rem",fontWeight:700,color:T.midnight,textAlign:"center",borderBottom:`1px solid ${T.border}`,paddingBottom:"0.3rem",marginBottom:"0.3rem"}}>{zone}</div>
                          {(q.items||[]).filter(item=>{const v=(q.correct||{})[item]; return typeof v==="number" && v===zi;}).map(item=>(
                            <div key={item} style={{fontSize:"0.75rem",background:"#e3edf7",borderRadius:"3px",padding:"3px 8px",marginBottom:"2px",fontWeight:600}}>{item}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                    {(q.items||[]).filter(item=>(q.correct||{})[item]==="distractor").length > 0 && (
                      <div style={{marginTop:"0.4rem",padding:"0.35rem 0.6rem",background:"#fdf2f2",border:`1px solid ${T.dangerBd}`,borderRadius:T.xs}}>
                        <span style={{fontSize:"0.62rem",fontWeight:700,color:T.dangerText}}>DISTRACTORS: </span>
                        <span style={{fontSize:"0.75rem",color:T.text}}>
                          {(q.items||[]).filter(item=>(q.correct||{})[item]==="distractor").join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {q.choices.map((c, i) => {
                    const ci = q.choiceImages?.[i];
                    if (!c && !ci) return null;
                    const isC = q.correct === c && c;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0.75rem", border: `1px solid ${isC?T.teal:T.border}`, borderRadius: T.xs, background: isC?"#ddeaf7":T.white }}>
                        <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: `2px solid ${isC?T.teal:"#9aabba"}`, background: isC?T.teal:T.white, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: "0.6rem", fontWeight: 700, color: isC?T.white:"#667" }}>{LETTERS[i]}</span>
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
    const complete_qs = questions.filter(q => {
      if (!q.question || !q.standard || !q.dok) return false;
      if (q.type === "plotpoint") return Array.isArray(q.answer) && q.answer.length === 2;
      if (q.type === "keypad")    return q.answer != null && String(q.answer).trim() !== "";
      if (q.type === "multiselect") return Array.isArray(q.answer) && q.answer.length >= 2 && q.choices.filter(c=>c).length >= 4;
      if (q.type === "dragdrop") { const fi=(q.items||[]).filter(x=>x.trim()); const cor=typeof q.correct==="object"&&!Array.isArray(q.correct)?q.correct:{}; const hasReal=fi.some(item=>typeof cor[item]==="number"); const noDupes=new Set(fi.map(x=>x.trim())).size===fi.length; return (q.zones||[]).length>=2 && fi.length>=2 && fi.every(item=>cor[item]!==undefined) && hasReal && noDupes; }
      return q.choices.filter(c=>c).length === 4 && q.correct;
    });
    if (complete_qs.length === 0) return;
    setSaving(true);
    let count = 0;
    for (const q of complete_qs) {
      try {
        // Ensure type is correct before saving
        const toSave = {
          ...q,
          type: (Array.isArray(q.answer) && q.answer.length === 2 && q.choices.filter(c=>c).length === 0)
            ? "plotpoint"
          : (["multiselect","keypad","plotpoint","dragdrop","mcq"].includes(q.type) ? q.type : "mcq")
        };
        await fetch(`${API}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSave),
        });
        count++;
      } catch {}
    }
    setSaving(false);
    setSavedCount(count);
    setTimeout(() => setSavedCount(0), 3000);
  }

  async function seedBank() {
    if (!window.confirm(`Re-seed the bank with ${BUILTIN_QUESTIONS.length} built-in questions? Only missing questions will be added.`)) return;
    setSaving(true);
    try {
      const r = await fetch(`${API}/questions/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(BUILTIN_QUESTIONS),
      });
      const data = await r.json();
      setSavedCount(data.added);
      setTimeout(() => setSavedCount(0), 4000);
    } catch {}
    setSaving(false);
  }

  // ── CSV Import ──────────────────────────────────────────
  const csvRef = useRef();
  const [csvPanel,   setCsvPanel]   = useState(false);
  const [csvPreview, setCsvPreview] = useState(null);
  const [csvErr,     setCsvErr]     = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult,  setCsvResult]  = useState(null);

  const CSV_COLS = ["id","standard","short","dok","question","choiceA","choiceB","choiceC","choiceD","correct"];

  function downloadTemplate() {
    const header = CSV_COLS.join(",");
    const example = [
      "","5.NR.2.1","Multiply whole numbers","1",
      "What is 24 × 13?","302","312","322","332","312"
    ].map(v => `"${v}"`).join(",");
    const blob = new Blob([header + "\n" + example + "\n"], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mathready_questions_template.csv";
    a.click();
  }

  function parseQuestionCSV(text) {
    const lines = text.trim().replace(/\r/g,"").split("\n").filter(l=>l.trim());
    if (!lines.length) return { rows:[], errs:["Empty file"] };
    // Detect and skip header row
    const first = lines[0].toLowerCase();
    const hasHeader = CSV_COLS.some(c => first.includes(c));
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows = [], errs = [];
    dataLines.forEach((line, i) => {
      const rowNum = i + (hasHeader ? 2 : 1);
      // Parse CSV respecting quoted fields
      const parts = [];
      let cur = "", inQ = false;
      for (let ci = 0; ci < line.length; ci++) {
        const ch = line[ci];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { parts.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      parts.push(cur.trim());

      // Support both with and without id column (9 or 10 cols)
      let id, standard, short, dok, question, choiceA, choiceB, choiceC, choiceD, correct;
      if (parts.length >= 10) {
        [id,standard,short,dok,question,choiceA,choiceB,choiceC,choiceD,correct] = parts;
      } else {
        [standard,short,dok,question,choiceA,choiceB,choiceC,choiceD,correct] = parts;
        id = "";
      }
      const rowErrs = [];
      if (!standard?.trim()) rowErrs.push("missing standard");
      if (!short?.trim())    rowErrs.push("missing skill label");
      if (!dok?.trim() || isNaN(parseInt(dok))) rowErrs.push("dok must be 1-4");
      if (!question?.trim()) rowErrs.push("missing question");
      if (!choiceA?.trim() || !choiceB?.trim() || !choiceC?.trim() || !choiceD?.trim()) rowErrs.push("need 4 choices");
      if (!correct?.trim()) rowErrs.push("missing correct answer");
      if (correct?.trim() && ![choiceA,choiceB,choiceC,choiceD].map(c=>c?.trim()).includes(correct.trim())) {
        rowErrs.push("correct answer must match one of the 4 choices exactly");
      }
      if (rowErrs.length) { errs.push(`Row ${rowNum}: ${rowErrs.join(", ")}`); return; }

      rows.push({
        ...(id?.trim() ? { id: id.trim() } : {}),
        standard: standard.trim(),
        short:    short.trim(),
        dok:      parseInt(dok),
        question: question.trim(),
        choices:  [choiceA,choiceB,choiceC,choiceD].map(c=>c.trim()),
        correct:  correct.trim(),
      });
    });
    return { rows, errs };
  }

  function handleCSVFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvErr(""); setCsvPreview(null); setCsvResult(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const { rows, errs } = parseQuestionCSV(ev.target.result);
      if (errs.length && !rows.length) { setCsvErr(errs.join(" · ")); return; }
      setCsvPreview({ rows, errs });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function importCSVQuestions(forceReassign = false) {
    if (!csvPreview?.rows?.length) return;
    setCsvImporting(true); setCsvErr("");
    try {
      // If forceReassign, strip IDs from rows that were flagged as duplicates
      const toUpload = forceReassign
        ? csvPreview.rows.map(r => csvPreview.duplicateIds?.includes(r.id) ? {...r, id:""} : r)
        : csvPreview.rows;
      const r = await fetch(`${API}/questions/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toUpload),
      });
      const d = await r.json();
      // Show duplicate warning before final success
      if (d.duplicate_count > 0 && !forceReassign) {
        setCsvPreview(prev => ({ ...prev, duplicateIds: d.duplicates }));
        setCsvResult({ ...d, pendingDuplicates: true });
      } else {
        setCsvResult(d);
        setCsvPreview(null);
      }
    } catch { setCsvErr("Upload failed. Check your connection."); }
    setCsvImporting(false);
  }

  const complete = questions.filter(q => {
    if (!q.question || !q.standard || !q.dok) return false;
    if (q.type === "plotpoint") return Array.isArray(q.answer) && q.answer.length === 2;
    if (q.type === "keypad")    return q.answer != null && String(q.answer).trim() !== "";
    if (q.type === "multiselect") return Array.isArray(q.answer) && q.answer.length >= 2 && q.choices.filter(c=>c).length >= 4;
    if (q.type === "dragdrop") { const fi=(q.items||[]).filter(x=>x.trim()); const cor=typeof q.correct==="object"&&!Array.isArray(q.correct)?q.correct:{}; const hasReal=fi.some(item=>typeof cor[item]==="number"); const noDupes=new Set(fi.map(x=>x.trim())).size===fi.length; return (q.zones||[]).length>=2 && fi.length>=2 && fi.every(item=>cor[item]!==undefined) && hasReal && noDupes; }
    return q.choices.filter(c=>c).length === 4 && q.correct;
  }).length;

  return (
    <div style={{ minHeight: "100vh", background: "#e8edf2", fontFamily: T.font }}>

      {/* Header */}
      <div style={{ background: T.midnight, color: T.white, padding: "0 1.5rem", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,.3)" }}>
        <div>
          <div style={{ fontSize: "0.58rem", opacity: .65, letterSpacing: "0.14em" }}>GEORGIA MILESTONES READINESS TRAINER</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>Question Builder</div>
        </div>
        <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", opacity: .75 }}>{complete}/{questions.length} complete</span>
          <button onClick={()=>{setCsvPanel(p=>!p);setCsvPreview(null);setCsvErr("");setCsvResult(null);}}
            style={{ background:"#4a7fa5", border:"none", borderRadius:T.xs, padding:"6px 14px", fontSize:"0.78rem", fontWeight:700, color:T.white, cursor:"pointer" }}>
            📥 Import CSV
          </button>
          <button onClick={seedBank} disabled={saving}
            style={{ background:T.warning, border:"none", borderRadius:T.xs, padding:"6px 14px", fontSize:"0.78rem", fontWeight:700, color:T.white, cursor:"pointer", opacity:saving?0.6:1 }}
            title="Re-load the 100 built-in questions into the bank">
            🔄 Restore Built-in Questions
          </button>
          {savedCount>0&&<span style={{fontSize:"0.75rem",color:T.success,fontWeight:700}}>+{savedCount} added</span>}
          <button onClick={saveToBank} disabled={saving||complete===0}
            style={{ background: savedCount>0?"#d4edda":complete===0?T.border:T.success, color: savedCount>0?T.success:T.white, border: "none", borderRadius: T.xs, padding: "6px 14px", fontWeight: 700, fontSize: "0.8rem", cursor: complete===0?"not-allowed":"pointer" }}>
            {savedCount>0 ? `✓ Saved ${savedCount} to Bank!` : saving ? "Saving…" : `💾 Save to Bank (${complete})`}
          </button>
          <button onClick={copyJSON} style={{ background: copied?"#d4edda":T.white, color: copied?T.success:T.teal, border: "none", borderRadius: T.xs, padding: "6px 14px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
            {copied ? "✓ Copied!" : "📋 Copy JSON"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* CSV Import Panel */}
      {csvPanel && (
        <div style={{background:"#fff",border:"1px solid #b3cde8",borderRadius:"6px",padding:"1.25rem",marginBottom:"1rem",boxShadow:"0 2px 12px rgba(0,56,101,.08)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
            <div>
              <div style={{fontSize:"0.95rem",fontWeight:700,color:T.teal}}>Import Questions from CSV</div>
              <div style={{fontSize:"0.75rem",color:T.textSecondary,marginTop:"2px"}}>
                One question per row. ID column optional — leave blank to auto-assign (Q00001 format). Columns: id, standard, short, dok, question, choiceA–D, correct
              </div>
            </div>
            <button onClick={downloadTemplate}
              style={{background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"6px 14px",fontSize:"0.78rem",fontWeight:600,cursor:"pointer",color:T.teal}}>
              ⬇ Download Template
            </button>
          </div>

          {/* Upload area */}
          <input ref={csvRef} type="file" accept=".csv,.txt" onChange={handleCSVFile} style={{display:"none"}}/>
          <div onClick={()=>csvRef.current?.click()}
            style={{border:"2px dashed #b3cde8",borderRadius:"6px",padding:"1.5rem",textAlign:"center",cursor:"pointer",background:"#f7fafd",marginBottom:"1rem"}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.background="#ddeaf7";}}
            onDragLeave={e=>{e.currentTarget.style.background="#f7fafd";}}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.background="#f7fafd";const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);csvRef.current.files=dt.files;handleCSVFile({target:{files:[f],value:""}})}}}>
            <div style={{fontSize:"1.5rem",marginBottom:"6px"}}>📄</div>
            <div style={{fontSize:"0.85rem",fontWeight:600,color:"#4a7fa5"}}>Click to choose a CSV file</div>
            <div style={{fontSize:"0.72rem",color:"#aaa",marginTop:"4px"}}>or drag and drop here</div>
          </div>

          {/* Errors */}
          {csvErr && (
            <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",padding:"0.65rem 0.9rem",fontSize:"0.78rem",color:"#8b1a1a",marginBottom:"0.75rem"}}>
              ⚠ {csvErr}
            </div>
          )}

          {/* Row-level warnings */}
          {csvPreview?.errs?.length > 0 && (
            <div style={{background:"#fff8e1",border:"1px solid #ffd166",borderRadius:"4px",padding:"0.65rem 0.9rem",fontSize:"0.75rem",color:"#7a4e00",marginBottom:"0.75rem"}}>
              <strong>⚠ {csvPreview.errs.length} row{csvPreview.errs.length!==1?"s":""} skipped:</strong>
              <ul style={{margin:"4px 0 0",paddingLeft:"1.25rem"}}>
                {csvPreview.errs.map((e,i)=><li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Preview table */}
          {csvPreview?.rows?.length > 0 && (
            <div>
              <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",color:"#555",marginBottom:"6px"}}>
                PREVIEW — {csvPreview.rows.length} question{csvPreview.rows.length!==1?"s":""} ready to import
              </div>
              <div style={{border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden",marginBottom:"0.85rem"}}>
                <div style={{display:"grid",gridTemplateColumns:"56px 110px 60px 30px 1fr 80px",background:"#f0f4f8",padding:"0.4rem 0.75rem",gap:"0.5rem",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.08em",color:"#555"}}>
                  <span>ID</span><span>STANDARD</span><span>SKILL</span><span>DOK</span><span>QUESTION</span><span>CORRECT</span>
                </div>
                <div style={{maxHeight:"220px",overflowY:"auto"}}>
                  {csvPreview.rows.map((r,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"56px 110px 60px 30px 1fr 80px",padding:"0.45rem 0.75rem",gap:"0.5rem",fontSize:"0.78rem",borderTop:"1px solid #eef1f4",alignItems:"center"}}>
                      <span style={{fontFamily:"monospace",fontSize:"0.72rem",color:r.id?T.midnight:T.textMuted}}>{r.id||"auto"}</span>
                      <span style={{color:T.midnight,fontWeight:700,fontSize:"0.72rem"}}>{r.standard}</span>
                      <span style={{color:"#555",fontSize:"0.72rem"}}>{r.short}</span>
                      <span style={{color:T.textSecondary,textAlign:"center"}}>{r.dok}</span>
                      <span style={{color:"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.question}</span>
                      <span style={{color:"#1a6e2e",fontWeight:600,fontSize:"0.75rem",overflow:"hidden",textOverflow:"ellipsis"}}>{r.correct}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={importCSVQuestions} disabled={csvImporting}
                style={{background:"#1a6e2e",color:"#fff",border:"none",borderRadius:"4px",padding:"0.65rem 1.5rem",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",opacity:csvImporting?0.7:1,width:"100%"}}>
                {csvImporting ? "Importing…" : `✓ Add ${csvPreview.rows.length} Question${csvPreview.rows.length!==1?"s":""} to Bank`}
              </button>
            </div>
          )}

          {/* Success / duplicate warning */}
          {csvResult && (
            <div>
              {csvResult.added > 0 && (
                <div style={{background:"#f0faf2",border:"1px solid #b3dfc0",borderRadius:"4px",padding:"0.75rem 1rem",marginBottom:"0.75rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                  <span style={{fontSize:"1.3rem"}}>✅</span>
                  <div>
                    <div style={{fontWeight:700,color:"#1a6e2e",fontSize:"0.9rem"}}>{csvResult.added} question{csvResult.added!==1?"s":""} added to bank</div>
                    <div style={{fontSize:"0.72rem",color:T.textSecondary}}>Bank now has {csvResult.total} total questions</div>
                  </div>
                </div>
              )}
              {csvResult.pendingDuplicates && csvResult.duplicate_count > 0 && (
                <div style={{background:"#fff8e1",border:"1px solid #ffd166",borderRadius:"4px",padding:"0.85rem 1rem"}}>
                  <div style={{fontWeight:700,color:"#7a4e00",marginBottom:"6px"}}>
                    ⚠ {csvResult.duplicate_count} ID{csvResult.duplicate_count!==1?"s":""} already exist in the bank
                  </div>
                  <div style={{fontSize:"0.75rem",color:"#555",marginBottom:"8px"}}>
                    <strong>Conflicting IDs:</strong> {csvResult.duplicates.join(", ")}
                  </div>
                  <div style={{fontSize:"0.75rem",color:"#555",marginBottom:"0.75rem"}}>
                    These questions were skipped. What would you like to do?
                  </div>
                  <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                    <button onClick={()=>importCSVQuestions(true)}
                      style={{background:T.teal,color:"#fff",border:"none",borderRadius:"3px",padding:"6px 14px",cursor:"pointer",fontSize:"0.78rem",fontWeight:700}}>
                      Auto-assign new IDs and import
                    </button>
                    <button onClick={()=>{ setCsvResult(null); setCsvPreview(null); setCsvPanel(false); }}
                      style={{background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"6px 14px",cursor:"pointer",fontSize:"0.78rem",fontWeight:600}}>
                      Skip them, I'll fix the CSV
                    </button>
                  </div>
                </div>
              )}
              {!csvResult.pendingDuplicates && (
                <button onClick={()=>{ setCsvPanel(false); setCsvResult(null); }}
                  style={{width:"100%",marginTop:"0.5rem",background:"#1a6e2e",color:"#fff",border:"none",borderRadius:"3px",padding:"7px",cursor:"pointer",fontSize:"0.82rem",fontWeight:700}}>
                  Done
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* DOK legend */}
        <div style={{ background: "#fff", border: "1px solid #c8d3dd", borderRadius: "4px", padding: "0.75rem 1.1rem", marginBottom: "1rem", display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: "#555" }}>DOK:</span>
          {DOK_OPTIONS.map(d => (
            <span key={d.level} style={{ fontSize: "0.72rem", color: "#555" }}>
              <strong style={{ color: T.midnight }}>{d.level} {d.label}</strong> — <span style={{ color: T.textSecondary }}>{d.desc}</span>
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
          style={{ width: "100%", background: "#fff", border: `2px dashed ${T.teal}`, borderRadius: "4px", padding: "0.85rem", fontSize: "0.88rem", fontWeight: 700, color: T.teal, cursor: "pointer" }}
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

const lbl   = { display: "block", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: T.textSecondary, marginBottom: "5px" };
const inp   = { width: "100%", padding: "0.6rem 0.85rem", border: `1px solid ${T.border}`, borderRadius: T.xs, fontSize: "0.9rem", color: T.text, background: T.surface, boxSizing: "border-box" };
const smBtn = { background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.xs, padding: "4px 7px", cursor: "pointer", fontSize: "0.7rem", color: "#333", fontWeight: 600 };
