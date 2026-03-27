import { useState, useRef, useCallback, useEffect } from "react";
import MathText from "./shared/MathText";
import PlotGrid from "./shared/PlotGrid";
import { API, QUESTIONS as BUILTIN_QUESTIONS, T } from "./shared/constants";
import { HotspotAnswer } from "./MathTest";


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

  // ── Earth & Space Science ──────────────────────────────
  "S5E1.a": { short: "Surface Features",               keywords: ["surface","feature","constructive","destructive","delta","sand dune","mountain","volcano","deposition","weathering","erosion","organism"] },
  "S5E1.b": { short: "Surface Change Models",          keywords: ["model","surface","change","constructive","destructive","illustrate","data","collect"] },
  "S5E1.c": { short: "Technology & Earth Processes",   keywords: ["technology","seismological","flood","GIS","map","satellite","infrared","engineering","predict","limit"] },

  // ── Physical Science: Matter ───────────────────────────
  "S5P1.a": { short: "Physical Changes",               keywords: ["physical change","manipulate","separate","mix","dry","liquid","material"] },
  "S5P1.b": { short: "States of Water",                keywords: ["state","water","temperature","solid","liquid","gas","particle","freeze","melt","evaporate","condense"] },
  "S5P1.c": { short: "Chemical Changes",               keywords: ["chemical change","color","gas","temperature change","odor","new substance","evidence","observable"] },

  // ── Physical Science: Electricity ─────────────────────
  "S5P2.a": { short: "Static vs. Harnessed Electricity", keywords: ["static","electricity","naturally occurring","human-harnessed","lightning","charge"] },
  "S5P2.b": { short: "Electric Circuits",               keywords: ["circuit","complete","component","battery","bulb","wire","switch","open","closed"] },
  "S5P2.c": { short: "Conductors & Insulators",         keywords: ["conductor","insulator","material","electricity","flow","metal","rubber","plastic","wood","glass"] },

  // ── Physical Science: Magnetism ───────────────────────
  "S5P3.a": { short: "Electromagnets vs. Magnets",      keywords: ["electromagnet","magnet","permanent","temporary","function","purpose","electric current","coil"] },
  "S5P3.b": { short: "Magnetic Fields",                 keywords: ["magnetic field","magnetic object","material","wood","paper","glass","metal","rock","thickness","attract"] },

  // ── Life Science: Classification ──────────────────────
  "S5L1.a": { short: "Animal Classification",           keywords: ["vertebrate","invertebrate","fish","amphibian","reptile","bird","mammal","classify","group","animal"] },
  "S5L1.b": { short: "Plant Classification",            keywords: ["seed","non-seed","plant","classify","group","producer","fern","moss","flowering"] },

  // ── Life Science: Heredity & Behavior ─────────────────
  "S5L2.a": { short: "Instincts vs. Learned Behaviors", keywords: ["instinct","learned","behavior","compare","contrast","born","trained","animal"] },
  "S5L2.b": { short: "Inherited vs. Acquired Traits",   keywords: ["inherited","acquired","trait","characteristic","physical","parent","offspring","environment","compare"] },

  // ── Life Science: Cells ───────────────────────────────
  "S5L3.a": { short: "Cells & Magnification",           keywords: ["cell","magnification","microscope","too small","plant","animal","comprised","observe"] },
  "S5L3.b": { short: "Cell Parts",                      keywords: ["membrane","wall","cytoplasm","nucleus","chloroplast","organelle","label","plant cell","animal cell"] },
  "S5L3.c": { short: "Plant vs. Animal Cells",          keywords: ["plant cell","animal cell","difference","structure","compare","contrast","chloroplast","cell wall"] },

  // ── Life Science: Microorganisms ──────────────────────
  "S5L4.a": { short: "Beneficial Microorganisms",       keywords: ["microorganism","beneficial","helpful","bacteria","probiotic","organism","benefit","lactobacillus"] },
  "S5L4.b": { short: "Harmful Microorganisms",          keywords: ["microorganism","harmful","disease","bacteria","infection","organism","harm","salmonella","e-coli"] },
};

const MATH_STANDARD_KEYS    = Object.keys(STANDARD_MAP).filter(k => !k.startsWith("S5"));
const SCIENCE_STANDARD_KEYS = Object.keys(STANDARD_MAP).filter(k =>  k.startsWith("S5"));
const STANDARDS_BY_SUBJECT  = { math: MATH_STANDARD_KEYS, science: SCIENCE_STANDARD_KEYS };

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
  const isHotspot  = q.type === "hotspot";
  const isMCQ      = !isPlot && !isMulti && !isKeypad && !isDragDrop && !isHotspot;

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
    if (isHotspot) return !!q.questionImage && (q.snapPoints||[]).length >= 1 && (q.items||[]).length >= 1 && q.answer && Object.keys(q.answer).length >= 1;
    return q.choices.filter(c=>c).length === 4 && !!q.correct;
  })();

  function handleQuestionChange(text) {
    update("question", text);
    const s = suggestStandard(text);
    setSuggestion(s && s !== q.standard ? s : null);
  }

  function handleStandardChange(std) {
    const data = STANDARD_MAP[std];
    const subject = std.startsWith("S5") ? "science" : "math";
    onChange({ ...q, standard: std, short: data?.short || q.short, subject });
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

          {/* Subject selector */}
          <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", color: T.textSecondary, marginRight: "4px" }}>SUBJECT</span>
            {["math", "science"].map(s => (
              <button key={s} onClick={() => {
                const firstStd = STANDARDS_BY_SUBJECT[s][0];
                const data = STANDARD_MAP[firstStd];
                onChange({ ...q, subject: s, standard: firstStd, short: data?.short || "" });
                setSuggestion(null);
              }}
                style={{ padding: "5px 14px", borderRadius: T.xs, border: `2px solid ${(q.subject||"math")===s ? T.teal : T.border}`, background: (q.subject||"math")===s ? T.teal : T.surface, color: (q.subject||"math")===s ? T.white : T.textSecondary, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                {s}
              </button>
            ))}
          </div>

          {/* Standard + skill + DOK */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ flex: 2, minWidth: "200px" }}>
              <label style={lbl}>GSE STANDARD <span style={{ fontWeight: 400, color: T.textMuted }}>— auto-suggests as you type</span></label>
              <select style={{ ...inp, fontFamily: "monospace", borderColor: suggestion ? T.warningBd : T.border }} value={q.standard} onChange={e => handleStandardChange(e.target.value)}>
                {(STANDARDS_BY_SUBJECT[q.subject || "math"]).map(s => <option key={s} value={s}>{s} — {STANDARD_MAP[s].short}</option>)}
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
            {[["mcq","📝 Multiple Choice"],["multiselect","☑ Multi-Select"],["keypad","🔢 Numeric Answer"],["plotpoint","📍 Plot a Point"],["dragdrop","🔀 Drag & Drop"],["hotspot","🎯 Hotspot"]].map(([t,lbl2])=>(
              <button key={t} onClick={()=>{
                if(t==="dragdrop") onChange({...q,type:t,zones:q.zones||["Category 1","Category 2"],items:q.items||[""],correct:(typeof q.correct==="object"&&!Array.isArray(q.correct))?q.correct:{}});
                else if(t==="hotspot") onChange({...q,type:t,snapPoints:q.snapPoints||[],items:q.items&&q.items.length?q.items:[""],answer:q.answer||{},assetType:q.assetType||"tile",assetReuse:q.assetReuse!==false?true:false});
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
                      // Check if THIS item exclusively owned the old key (no other item shares the name)
                      const ownedOldKey=oldVal.trim() && !(q.items||[]).some((x,j)=>j!==i && x===oldVal);
                      if(ownedOldKey && oldVal in cor) {
                        const saved=cor[oldVal];
                        delete cor[oldVal];
                        // Only carry to new key if no other item already has that name
                        if(newVal.trim() && !it.some((x,j)=>j!==i && x===newVal)) cor[newVal]=saved;
                      }
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

          {/* Answer — Hotspot */}
          {isHotspot && (
          <div>
            <label style={lbl}>HOTSPOT CONFIGURATION</label>
            {/* Asset config */}
            <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap",marginBottom:"1rem",alignItems:"center"}}>
              <div>
                <div style={{fontSize:"0.6rem",fontWeight:700,color:T.textSecondary,marginBottom:"3px"}}>ASSET TYPE</div>
                <select value={q.assetType||"tile"} onChange={e=>{
                  const t=e.target.value;
                  if(t==="dot") onChange({...q,assetType:t,items:["●"],assetReuse:false});
                  else if(t==="pin") onChange({...q,assetType:t,items:["📍"],assetReuse:false});
                  else onChange({...q,assetType:t,items:(q.items||[]).length&&q.items[0]!=="●"&&q.items[0]!=="📍"?q.items:[""],assetReuse:true});
                }}
                  style={{padding:"0.4rem 0.6rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.82rem",background:T.surface}}>
                  <option value="dot">● Dot / Point</option>
                  <option value="pin">📍 Pin Marker</option>
                  <option value="tile">🔢 Number Tiles</option>
                  <option value="custom">🏷 Custom Labels</option>
                </select>
              </div>
              <label style={{display:"flex",alignItems:"center",gap:"0.4rem",fontSize:"0.78rem",color:T.textSecondary,cursor:"pointer",userSelect:"none"}}>
                <input type="checkbox" checked={q.assetReuse!==false} onChange={e=>update("assetReuse",e.target.checked)} />
                Reusable (tile stays in tray after placing)
              </label>
              {q.assetType !== "dot" && q.assetType !== "pin" && (
                <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                  <span style={{fontSize:"0.65rem",fontWeight:700,color:T.textSecondary}}>SIZE:</span>
                  {["xs","sm","md","lg","xl"].map(sz => (
                    <button key={sz} onClick={()=>update("assetSize",sz)}
                      style={{
                        padding:"2px 8px",fontSize:"0.7rem",fontWeight:600,border:`1px solid ${(q.assetSize||"md")===sz?T.teal:T.border}`,
                        borderRadius:T.xs,cursor:"pointer",background:(q.assetSize||"md")===sz?"#ddeaf7":T.white,color:(q.assetSize||"md")===sz?T.teal:"#555",
                      }}>{sz}</button>
                  ))}
                  <span style={{fontSize:"0.68rem",color:T.textMuted,marginLeft:"0.3rem"}}>
                    preview: <span style={{fontSize:{xs:"0.55rem",sm:"0.7rem",md:"0.9rem",lg:"1.15rem",xl:"1.4rem"}[q.assetSize||"md"],fontFamily:"Georgia,serif",fontWeight:600}}>{(q.items||["123"])[0]||"123"}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Asset list */}
            <div style={{marginBottom:"1rem"}}>
              <div style={{fontSize:"0.6rem",fontWeight:700,color:T.textSecondary,marginBottom:"4px"}}>
                {(q.assetType==="dot"||q.assetType==="pin") ? "HOW MANY?" : "ASSET VALUES"}
              </div>
              {(q.assetType==="dot"||q.assetType==="pin") ? (
                <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                  <input type="number" min="1" max="20" value={Math.max(1,(q.items||[]).length)}
                    onChange={e=>{const n=Math.max(1,Math.min(20,parseInt(e.target.value)||1)); const sym=q.assetType==="pin"?"📍":"●"; update("items",Array(n).fill(sym));}}
                    style={{width:"60px",padding:"0.4rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.9rem",textAlign:"center"}}/>
                  <span style={{fontSize:"0.75rem",color:T.textMuted}}>assets to drag</span>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
                  {(q.items||[""]).map((item,i)=>(
                    <div key={i} style={{display:"flex",gap:"0.4rem",alignItems:"center"}}>
                      <input value={item} onChange={e=>{const items=[...(q.items||[""])]; items[i]=e.target.value; update("items",items);}}
                        placeholder={q.assetType==="tile"?`Number ${i+1} (e.g. 24)`:`Label ${i+1}`}
                        style={{flex:1,padding:"0.4rem 0.6rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.85rem",fontFamily:q.assetType==="tile"?"monospace":"inherit"}}/>
                      {(q.items||[]).length>1 && <button onClick={()=>{const items=(q.items||[]).filter((_,j)=>j!==i); update("items",items);}}
                        style={{border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"3px 8px",cursor:"pointer",fontSize:"0.7rem",color:"#8b1a1a",background:"#fdf2f2"}}>✕</button>}
                    </div>
                  ))}
                  <button onClick={()=>update("items",[...(q.items||[]),""])}
                    style={{alignSelf:"flex-start",border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"4px 12px",cursor:"pointer",fontSize:"0.75rem",fontWeight:600,background:T.surfaceAlt,color:T.text}}>+ Add Value</button>
                </div>
              )}
            </div>

            {/* Snap point editor — click on image */}
            {q.questionImage ? (
              <div>
                <div style={{fontSize:"0.6rem",fontWeight:700,color:T.textSecondary,marginBottom:"4px"}}>
                  SNAP POINTS — click on the image to add drop zones
                </div>
                <div style={{position:"relative",display:"inline-block",maxWidth:500,width:"100%",cursor:"crosshair",marginBottom:"0.75rem"}}
                  onClick={e=>{
                    const img = e.currentTarget.querySelector("img");
                    const rect = img.getBoundingClientRect();
                    const x = Math.round(((e.clientX-rect.left)/rect.width)*100);
                    const y = Math.round(((e.clientY-rect.top)/rect.height)*100);
                    const id = "sp"+Date.now().toString(36);
                    const sps = [...(q.snapPoints||[]),{id,x,y}];
                    update("snapPoints",sps);
                  }}>
                  <img src={q.questionImage} alt="diagram" style={{width:"100%",display:"block",borderRadius:T.xs,pointerEvents:"none"}}/>
                  {(q.snapPoints||[]).map((sp,i)=>{
                    const isCorrect = q.answer && q.answer[sp.id] !== undefined;
                    return (
                      <div key={sp.id} style={{
                        position:"absolute",left:`${sp.x}%`,top:`${sp.y}%`,transform:"translate(-50%,-50%)",
                        width:28,height:28,borderRadius:"50%",
                        background:isCorrect?T.success+"33":"rgba(255,255,255,0.7)",
                        border:`3px solid ${isCorrect?T.success:T.midnight}`,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:"0.6rem",fontWeight:800,color:isCorrect?T.success:T.midnight,
                        cursor:"default",zIndex:3,
                      }} onClick={e=>e.stopPropagation()} title={`Snap point ${i+1} (${sp.x}%, ${sp.y}%)`}>
                        {i+1}
                      </div>
                    );
                  })}
                </div>

                {/* Snap point table */}
                {(q.snapPoints||[]).length > 0 && (
                  <div style={{border:`1px solid ${T.border}`,borderRadius:T.xs,overflow:"hidden",marginBottom:"0.5rem"}}>
                    <div style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 40px",gap:0,padding:"6px 10px",background:T.surfaceAlt,fontSize:"0.58rem",fontWeight:700,color:T.textSecondary,letterSpacing:"0.08em"}}>
                      <div>#</div><div>LABEL</div><div>CORRECT ASSET</div><div></div>
                    </div>
                    {(q.snapPoints||[]).map((sp,i)=>(
                      <div key={sp.id} style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 40px",gap:0,padding:"5px 10px",borderTop:`1px solid ${T.surfaceAlt}`,alignItems:"center",fontSize:"0.78rem"}}>
                        <div style={{fontWeight:700,color:T.midnight}}>{i+1}</div>
                        <div>
                          <input value={sp.label||""} placeholder="optional label"
                            onChange={e=>{const sps=[...(q.snapPoints||[])]; sps[i]={...sp,label:e.target.value}; update("snapPoints",sps);}}
                            style={{width:"100%",padding:"3px 6px",border:`1px solid ${T.border}`,borderRadius:"3px",fontSize:"0.78rem"}}/>
                        </div>
                        <div>
                          <select value={(q.answer||{})[sp.id]??""}
                            onChange={e=>{const ans={...(q.answer||{})}; if(e.target.value==="") delete ans[sp.id]; else ans[sp.id]=e.target.value; update("answer",ans);}}
                            style={{width:"100%",padding:"3px 6px",border:`1px solid ${T.border}`,borderRadius:"3px",fontSize:"0.78rem",background:T.surface}}>
                            <option value="">— not a correct target —</option>
                            {(q.items||[]).filter(x=>x).length===0 && <option disabled>⚠ Add assets above first</option>}
                            {[...new Set((q.items||[]).filter(x=>x))].map((item,j)=><option key={j} value={item}>{item}</option>)}
                          </select>
                        </div>
                        <div>
                          <button onClick={()=>{
                            const sps=(q.snapPoints||[]).filter((_,j)=>j!==i);
                            const ans={...(q.answer||{})}; delete ans[sp.id];
                            onChange({...q,snapPoints:sps,answer:ans});
                          }} style={{border:"none",background:"none",cursor:"pointer",fontSize:"0.75rem",color:"#8b1a1a"}}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{padding:"1rem",background:T.warningBg,border:`1px solid ${T.warningBd}`,borderRadius:T.xs,fontSize:"0.8rem",color:"#78350f"}}>
                ⚠ Paste a question diagram first — snap points are placed on the image.
              </div>
            )}
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
                ) : isHotspot ? (
                  <HotspotPreview q={q} />
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

// ── Hotspot Student Preview ────────────────────────────────
function HotspotPreview({ q }) {
  const [previewVal, setPreviewVal] = useState(null);
  const [previewRevealed, setPreviewRevealed] = useState(false);
  const isDotPin = q.assetType === "dot" || q.assetType === "pin";

  return (
    <div style={{marginTop:"0.5rem"}}>
      <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.5rem"}}>
        <span style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",color:T.teal}}>👁 STUDENT PREVIEW</span>
        <button onClick={() => { setPreviewVal(null); setPreviewRevealed(false); }}
          style={{border:`1px solid ${T.border}`,background:T.surface,borderRadius:T.xs,padding:"3px 10px",fontSize:"0.68rem",fontWeight:600,cursor:"pointer",color:"#555"}}>
          Reset
        </button>
        <button onClick={() => setPreviewRevealed(true)} disabled={previewRevealed}
          style={{border:`1px solid ${T.teal}`,background:previewRevealed?"#ddeaf7":T.white,borderRadius:T.xs,padding:"3px 10px",fontSize:"0.68rem",fontWeight:600,cursor:previewRevealed?"default":"pointer",color:T.teal}}>
          {previewRevealed ? "✓ Revealed" : "Check Answer"}
        </button>
      </div>
      {q.questionImage && (q.snapPoints||[]).length > 0 ? (
        <HotspotAnswer
          questionImage={q.questionImage}
          snapPoints={q.snapPoints||[]}
          assets={q.items||[]}
          assetType={q.assetType||"tile"}
          assetReuse={q.assetReuse!==false}
          assetSize={q.assetSize||"md"}
          value={previewVal}
          onChange={v => { if (!previewRevealed) setPreviewVal(v); }}
          revealed={previewRevealed}
          answer={q.answer}
        />
      ) : (
        <div style={{fontSize:"0.78rem",color:T.textMuted,fontStyle:"italic"}}>
          Add an image and at least one snap point to preview.
        </div>
      )}
      <div style={{marginTop:"0.5rem",fontSize:"0.65rem",color:T.textSecondary}}>
        {isDotPin ? "Students will click directly on the image (no visible targets)" : "Students will drag tiles to the labeled drop zones"}
        {" · "}{(q.snapPoints||[]).length} snap point{(q.snapPoints||[]).length!==1?"s":""} · {Object.keys(q.answer||{}).length} correct target{Object.keys(q.answer||{}).length!==1?"s":""}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────
function EMPTY_Q() {
  return { id: uid(), type: "mcq", standard: "5.NR.1.1", short: "Place Value Relationships", subject: "math", question: "", questionImage: null, choices: ["","","",""], choiceImages: [null,null,null,null], correct: "", answer: null, dok: null };
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
      ...(q.type==="hotspot" ? { snapPoints:q.snapPoints, items:q.items, assetType:q.assetType, assetReuse:q.assetReuse, assetSize:q.assetSize, answer:q.answer } : {}),
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
      if (q.type === "hotspot") { return !!q.questionImage && (q.snapPoints||[]).length >= 1 && (q.items||[]).length >= 1 && q.answer && Object.keys(q.answer).length >= 1; }
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
          type: (Array.isArray(q.answer) && q.answer.length === 2 && (q.choices||[]).filter(c=>c).length === 0)
            ? "plotpoint"
          : (["multiselect","keypad","plotpoint","dragdrop","hotspot","mcq"].includes(q.type) ? q.type : "mcq")
        };
        const resp = await fetch(`${API}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSave),
        });
        if (!resp.ok) { console.error("Save failed:", resp.status); }
        else count++;
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

  // ── JSON Import ─────────────────────────────────────────
  const jsonRef = useRef();
  const [jsonPanel,     setJsonPanel]     = useState(false);
  const [jsonPreview,   setJsonPreview]   = useState(null);   // { rows:[], errs:[] }
  const [jsonErr,       setJsonErr]       = useState("");
  const [jsonImporting, setJsonImporting] = useState(false);
  const [jsonResult,    setJsonResult]    = useState(null);
  const [jsonChecked,   setJsonChecked]   = useState({});     // { idx: bool } for select/deselect
  const [importMenu,    setImportMenu]    = useState(false);
  const [importSubject, setImportSubject] = useState("math");

  const VALID_TYPES = ["mcq","multiselect","keypad","plotpoint","dragdrop","hotspot"];
  const [aiPromptCopied, setAiPromptCopied] = useState(false);

  const SCIENCE_STANDARD_LIST = [
    "S5E1.a — Water Cycle","S5E1.b — Weather & Climate","S5E1.c — Earth's Surface Changes",
    "S5P1.a — Physical & Chemical Changes","S5P1.b — Mixtures & Solutions","S5P1.c — Properties of Matter",
    "S5P2.a — Force & Motion","S5P2.b — Simple Machines","S5P2.c — Gravity & Friction",
    "S5P3.a — Light & Sound","S5P3.b — Electricity & Magnetism",
    "S5L1.a — Cell Structure","S5L1.b — Microorganisms",
    "S5L2.a — Food Webs & Chains","S5L2.b — Decomposers",
    "S5L3.a — Animal Classification","S5L3.b — Inherited Traits","S5L3.c — Adaptations",
    "S5L4.a — Ecosystems","S5L4.b — Human Impact on Environment",
  ];

  function copyAIPrompt() {
    const isMath = importSubject === "math";
    const standards = isMath
      ? Object.entries(STANDARD_MAP).map(([k,v])=>`${k} — ${v.short}`).join("\n")
      : SCIENCE_STANDARD_LIST.join("\n");
    const example = isMath
      ? `    "question": "What is 1/2 + 1/4?",\n    "choices": ["3/4", "1/3", "2/4", "1/2"],\n    "correct": "3/4",\n    "standard": "5.NR.3.3",\n    "dok": 2`
      : `    "question": "Which process causes water to change from liquid to gas?",\n    "choices": ["Condensation", "Evaporation", "Precipitation", "Freezing"],\n    "correct": "Evaporation",\n    "standard": "S5E1.a",\n    "dok": 1`;
    const mathTip = isMath ? `\n- Use LaTeX in dollar signs for math: $\\frac{1}{2}$, $10^{2}$, $\\sqrt{x}$` : "";
    const prompt = `Create 20 Georgia Milestones 5th grade ${isMath?"math":"science"} multiple-choice questions. Return ONLY a JSON array, no other text.

Format:
[
  {
${example}
  }
]

Rules:
- Every question needs exactly 4 choices
- "correct" must exactly match one of the 4 choices
- dok: 1=recall, 2=skill/concept, 3=strategic reasoning, 4=extended thinking
- Mix dok levels (mostly 1-2, some 3)${mathTip}
- If a question would need a picture or diagram, add "needsImage": true

Available standards:
${standards}`;
    navigator.clipboard.writeText(prompt);
    setAiPromptCopied(true);
    setTimeout(()=>setAiPromptCopied(false), 3000);
  }

  function validateJsonQuestion(q, idx) {
    const errs = [];
    if (!q.question?.trim()) errs.push("missing question text");
    if (!q.standard?.trim()) errs.push("missing standard");
    if (!q.dok || isNaN(parseInt(q.dok)) || q.dok < 1 || q.dok > 4) errs.push("dok must be 1–4");
    const type = VALID_TYPES.includes(q.type) ? q.type : "mcq";
    if (type === "mcq") {
      if (!Array.isArray(q.choices) || q.choices.filter(c=>c?.trim()).length < 4) errs.push("need 4 choices");
      if (!q.correct?.trim()) errs.push("missing correct answer");
    }
    if (type === "multiselect") {
      if (!Array.isArray(q.choices) || q.choices.filter(c=>c?.trim()).length < 4) errs.push("need 4 choices");
      if (!Array.isArray(q.answer) || q.answer.length < 2) errs.push("need at least 2 answers");
    }
    if (type === "keypad") {
      if (q.answer == null || String(q.answer).trim() === "") errs.push("missing answer");
    }
    if (type === "plotpoint") {
      if (!Array.isArray(q.answer) || q.answer.length !== 2) errs.push("answer must be [x, y]");
    }
    if (type === "hotspot") {
      if (!(q.snapPoints||[]).length) errs.push("missing snapPoints");
      if (!(q.items||[]).length) errs.push("missing items");
    }
    return errs;
  }

  function handleJSONFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonErr(""); setJsonPreview(null); setJsonResult(null); setJsonChecked({});
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        let data = JSON.parse(ev.target.result);
        if (!Array.isArray(data)) data = [data]; // wrap single question
        const rows = [], errs = [];
        data.forEach((q, i) => {
          const qErrs = validateJsonQuestion(q, i);
          if (qErrs.length) { errs.push(`Q${i+1}: ${qErrs.join(", ")}`); }
          else {
            const type = VALID_TYPES.includes(q.type) ? q.type : "mcq";
            const short = q.short || STANDARD_MAP[q.standard]?.short || "";
            rows.push({ ...q, type, short, _idx: i, needsImage: !!q.needsImage || (q.questionImage === undefined && ["hotspot","plotpoint"].includes(type)) });
          }
        });
        if (!rows.length && errs.length) { setJsonErr(errs.join(" · ")); return; }
        const checked = {};
        rows.forEach((_, i) => { checked[i] = true; });
        setJsonChecked(checked);
        setJsonPreview({ rows, errs });
      } catch { setJsonErr("Invalid JSON file. Check syntax and try again."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function importJSONQuestions() {
    if (!jsonPreview?.rows?.length) return;
    const selected = jsonPreview.rows.filter((_, i) => jsonChecked[i]);
    if (!selected.length) return;
    setJsonImporting(true); setJsonErr("");
    try {
      const toUpload = selected.map(r => {
        const { _idx, needsImage, ...rest } = r;
        return { ...rest, subject: importSubject, ...(needsImage ? { needsImage: true } : {}) };
      });
      const resp = await fetch(`${API}/questions/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toUpload),
      });
      const d = await resp.json();
      setJsonResult(d);
      if (!d.pendingDuplicates) setJsonPreview(null);
    } catch { setJsonErr("Upload failed. Check your connection."); }
    setJsonImporting(false);
  }

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
    if (q.type === "hotspot") return !!q.questionImage && (q.snapPoints||[]).length >= 1 && (q.items||[]).length >= 1 && q.answer && Object.keys(q.answer).length >= 1;
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
          <div style={{position:"relative",display:"inline-block"}}>
            <button onClick={()=>setImportMenu(p=>!p)}
              style={{ background:"#4a7fa5", border:"none", borderRadius:T.xs, padding:"6px 14px", fontSize:"0.78rem", fontWeight:700, color:T.white, cursor:"pointer" }}>
              📥 Import ▾
            </button>
            {importMenu && (
              <div style={{position:"absolute",top:"100%",left:0,marginTop:"4px",background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",boxShadow:"0 4px 12px rgba(0,0,0,.15)",zIndex:10,minWidth:"140px",overflow:"hidden"}}>
                <div onClick={()=>{setJsonPanel(true);setJsonPreview(null);setJsonErr("");setJsonResult(null);setJsonChecked({});setCsvPanel(false);setImportMenu(false);}}
                  style={{padding:"8px 14px",fontSize:"0.78rem",fontWeight:600,cursor:"pointer",borderBottom:"1px solid #eee"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0f4f8"}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                  📄 JSON
                </div>
                <div onClick={()=>{setCsvPanel(true);setCsvPreview(null);setCsvErr("");setCsvResult(null);setJsonPanel(false);setImportMenu(false);}}
                  style={{padding:"8px 14px",fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0f4f8"}
                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                  📊 CSV
                </div>
              </div>
            )}
          </div>
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

      {/* JSON Import Panel */}
      {jsonPanel && (
        <div style={{background:"#fff",border:"1px solid #c5b8f0",borderRadius:"6px",padding:"1.25rem",marginBottom:"1rem",boxShadow:"0 2px 12px rgba(107,92,231,.08)"}}>
          <div style={{marginBottom:"1rem"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"8px"}}>
              <div style={{fontSize:"0.95rem",fontWeight:700,color:"#6b5ce7"}}>Import Questions from JSON</div>
              <div style={{display:"flex",gap:"0",border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden"}}>
                {[["math","Math"],["science","Science"]].map(([key,label])=>(
                  <button key={key} onClick={()=>setImportSubject(key)}
                    style={{padding:"4px 14px",fontSize:"0.75rem",fontWeight:700,border:"none",cursor:"pointer",
                      background:importSubject===key?"#1a3a5c":"#fff",color:importSubject===key?"#fff":"#555"}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:"0.75rem",color:T.textSecondary}}>
                Copy prompt → Paste into ChatGPT/Claude → Upload the JSON
              </div>
              <button onClick={copyAIPrompt}
                style={{background:aiPromptCopied?"#d4edda":"#6b5ce7",border:"none",borderRadius:T.xs,padding:"6px 14px",fontSize:"0.78rem",fontWeight:600,cursor:"pointer",color:aiPromptCopied?"#1a6e2e":"#fff",whiteSpace:"nowrap",flexShrink:0}}>
                {aiPromptCopied ? "✓ Copied!" : "🤖 Copy AI Prompt"}
              </button>
            </div>
          </div>

          {/* Upload area */}
          <input ref={jsonRef} type="file" accept=".json" onChange={handleJSONFile} style={{display:"none"}}/>
          <div onClick={()=>jsonRef.current?.click()}
            style={{border:"2px dashed #c5b8f0",borderRadius:"6px",padding:"1.5rem",textAlign:"center",cursor:"pointer",background:"#faf9ff",marginBottom:"1rem"}}
            onDragOver={e=>{e.preventDefault();e.currentTarget.style.background="#eeebfa";}}
            onDragLeave={e=>{e.currentTarget.style.background="#faf9ff";}}
            onDrop={e=>{e.preventDefault();e.currentTarget.style.background="#faf9ff";const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);jsonRef.current.files=dt.files;handleJSONFile({target:{files:[f],value:""}})}}}>
            <div style={{fontSize:"1.5rem",marginBottom:"6px"}}>{ }</div>
            <div style={{fontSize:"0.85rem",fontWeight:600,color:"#6b5ce7"}}>Click to choose a JSON file</div>
            <div style={{fontSize:"0.72rem",color:"#aaa",marginTop:"4px"}}>or drag and drop here</div>
          </div>

          {/* Errors */}
          {jsonErr && (
            <div style={{background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"4px",padding:"0.65rem 0.9rem",fontSize:"0.78rem",color:"#8b1a1a",marginBottom:"0.75rem"}}>
              ⚠ {jsonErr}
            </div>
          )}

          {/* Row-level warnings */}
          {jsonPreview?.errs?.length > 0 && (
            <div style={{background:"#fff8e1",border:"1px solid #ffd166",borderRadius:"4px",padding:"0.65rem 0.9rem",fontSize:"0.75rem",color:"#7a4e00",marginBottom:"0.75rem"}}>
              <strong>⚠ {jsonPreview.errs.length} question{jsonPreview.errs.length!==1?"s":""} skipped:</strong>
              <ul style={{margin:"4px 0 0",paddingLeft:"1.25rem"}}>
                {jsonPreview.errs.map((e,i)=><li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {/* Preview with checkboxes */}
          {jsonPreview?.rows?.length > 0 && !jsonResult && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",color:"#555"}}>
                  REVIEW — {Object.values(jsonChecked).filter(Boolean).length} of {jsonPreview.rows.length} selected
                </div>
                <div style={{display:"flex",gap:"6px"}}>
                  <button onClick={()=>{const c={};jsonPreview.rows.forEach((_,i)=>{c[i]=true});setJsonChecked(c);}}
                    style={{...smBtn,fontSize:"0.65rem"}}>Select All</button>
                  <button onClick={()=>setJsonChecked({})}
                    style={{...smBtn,fontSize:"0.65rem"}}>Deselect All</button>
                </div>
              </div>
              <div style={{border:"1px solid #c8d3dd",borderRadius:"4px",overflow:"hidden",marginBottom:"0.85rem"}}>
                <div style={{display:"grid",gridTemplateColumns:"28px 80px 60px 30px 1fr 70px 50px",background:"#f5f3ff",padding:"0.4rem 0.75rem",gap:"0.5rem",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.08em",color:"#555"}}>
                  <span></span><span>STANDARD</span><span>TYPE</span><span>DOK</span><span>QUESTION</span><span>ANSWER</span><span></span>
                </div>
                <div style={{maxHeight:"320px",overflowY:"auto"}}>
                  {jsonPreview.rows.map((r,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"28px 80px 60px 30px 1fr 70px 50px",padding:"0.5rem 0.75rem",gap:"0.5rem",fontSize:"0.78rem",borderTop:"1px solid #eef1f4",alignItems:"center",background:jsonChecked[i]?"#fff":"#f8f8f8",opacity:jsonChecked[i]?1:0.5}}>
                      <input type="checkbox" checked={!!jsonChecked[i]} onChange={()=>setJsonChecked(c=>({...c,[i]:!c[i]}))} style={{cursor:"pointer"}}/>
                      <span style={{color:T.midnight,fontWeight:700,fontSize:"0.68rem"}}>{r.standard}</span>
                      <span style={{fontSize:"0.65rem",color:"#6b5ce7",fontWeight:600,textTransform:"uppercase"}}>{r.type}</span>
                      <span style={{color:T.textSecondary,textAlign:"center"}}>{r.dok}</span>
                      <span style={{color:"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.question}</span>
                      <span style={{color:"#1a6e2e",fontWeight:600,fontSize:"0.68rem",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {r.type==="mcq"?r.correct:r.type==="keypad"?r.answer:r.type==="plotpoint"?`(${r.answer})`:"✓"}
                      </span>
                      <span>{r.needsImage && <span title="Needs an image" style={{fontSize:"0.72rem",cursor:"help"}}>🖼️</span>}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Needs-image summary */}
              {jsonPreview.rows.some(r=>r.needsImage && jsonChecked[jsonPreview.rows.indexOf(r)]) && (
                <div style={{background:"#fff8e1",border:"1px solid #ffd166",borderRadius:"4px",padding:"0.6rem 0.9rem",fontSize:"0.75rem",color:"#7a4e00",marginBottom:"0.75rem",display:"flex",alignItems:"center",gap:"8px"}}>
                  🖼️ <span><strong>{jsonPreview.rows.filter((r,i)=>r.needsImage&&jsonChecked[i]).length} question{jsonPreview.rows.filter((r,i)=>r.needsImage&&jsonChecked[i]).length!==1?"s":""}</strong> flagged as needing an image. You can add images later in the Question Builder.</span>
                </div>
              )}

              <button onClick={importJSONQuestions} disabled={jsonImporting || !Object.values(jsonChecked).some(Boolean)}
                style={{background:"#1a6e2e",color:"#fff",border:"none",borderRadius:"4px",padding:"0.65rem 1.5rem",fontSize:"0.85rem",fontWeight:700,cursor:"pointer",opacity:jsonImporting||!Object.values(jsonChecked).some(Boolean)?0.5:1,width:"100%"}}>
                {jsonImporting ? "Importing…" : `✓ Add ${Object.values(jsonChecked).filter(Boolean).length} Question${Object.values(jsonChecked).filter(Boolean).length!==1?"s":""} to Bank`}
              </button>
            </div>
          )}

          {/* Result */}
          {jsonResult && (
            <div>
              {jsonResult.added > 0 && (
                <div style={{background:"#f0faf2",border:"1px solid #b3dfc0",borderRadius:"4px",padding:"0.75rem 1rem",marginBottom:"0.75rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
                  <span style={{fontSize:"1.3rem"}}>✅</span>
                  <div>
                    <div style={{fontWeight:700,color:"#1a6e2e",fontSize:"0.9rem"}}>{jsonResult.added} question{jsonResult.added!==1?"s":""} added to bank</div>
                    <div style={{fontSize:"0.72rem",color:T.textSecondary}}>Bank now has {jsonResult.total} total questions</div>
                  </div>
                </div>
              )}
              {jsonResult.duplicate_count > 0 && (
                <div style={{background:"#fff8e1",border:"1px solid #ffd166",borderRadius:"4px",padding:"0.65rem 0.9rem",fontSize:"0.75rem",color:"#7a4e00",marginBottom:"0.75rem"}}>
                  ⚠ {jsonResult.duplicate_count} duplicate ID{jsonResult.duplicate_count!==1?"s":""} skipped: {(jsonResult.duplicates||[]).join(", ")}
                </div>
              )}
              <button onClick={()=>{ setJsonPanel(false); setJsonResult(null); setJsonPreview(null); }}
                style={{width:"100%",background:"#1a6e2e",color:"#fff",border:"none",borderRadius:"3px",padding:"7px",cursor:"pointer",fontSize:"0.82rem",fontWeight:700}}>
                Done
              </button>
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
