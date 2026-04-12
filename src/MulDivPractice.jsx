import { useState, useEffect, useRef } from "react";
import MathText from "./shared/MathText";
import { generateParametric, updateSessionWeights, MUL_DIV_STANDARDS } from "./adaptive";
import { T, S, API } from "./shared/constants";

const LIMIT    = 20;
const TIER_PTS = { easy: 1, medium: 2, hard: 3 };
const MAX_PTS  = LIMIT * 3; // 60 — max possible weighted score

const CAT = {
  'MUL.TRAD': { label: 'Multiplication — Computation', color: T.teal,     bg: T.tealLight   },
  'MUL.WORD': { label: 'Multiplication — Word Problems', color: '#7c3aed', bg: '#ede9fe'     },
  'DIV.TRAD': { label: 'Division — Computation',         color: '#d97706', bg: '#fef3c7'     },
  'DIV.WORD': { label: 'Division — Word Problems',       color: '#db2777', bg: '#fce7f3'     },
};

const GRADE_BANDS = [
  { min: 95, label: 'Distinguished Learner', color: '#059669' },
  { min: 85, label: 'Proficient Learner',    color: T.teal    },
  { min: 75, label: 'Developing Learner',    color: '#d97706' },
  { min: 65, label: 'Beginning Learner',     color: '#dc2626' },
];
function gradeBand(pct) {
  return GRADE_BANDS.find(b => pct >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1];
}

function computeTier(standard, history) {
  const recent = history.filter(h => h.q.standard === standard).slice(-5);
  if (recent.length < 3) return 'easy';
  const acc = recent.filter(h => h.correct).length / recent.length;
  if (acc >= 0.8) return 'hard';
  if (acc >= 0.5) return 'medium';
  return 'easy';
}

function pickNext(weights, history, seenTexts) {
  const total = MUL_DIV_STANDARDS.reduce((s, std) => s + (weights[std] || 0.5), 0);
  let r = Math.random() * total;
  let chosen = MUL_DIV_STANDARDS[MUL_DIV_STANDARDS.length - 1];
  for (const std of MUL_DIV_STANDARDS) {
    r -= (weights[std] || 0.5);
    if (r <= 0) { chosen = std; break; }
  }
  const tier = computeTier(chosen, history);
  for (let i = 0; i < 12; i++) {
    const q = generateParametric(chosen, { tier });
    if (q && !seenTexts.has(q.question)) return { ...q, tier };
  }
  for (const std of MUL_DIV_STANDARDS) {
    for (let i = 0; i < 4; i++) {
      const t = computeTier(std, history);
      const q = generateParametric(std, { tier: t });
      if (q && !seenTexts.has(q.question)) return { ...q, tier: t };
    }
  }
  const q = generateParametric(chosen, { tier });
  return q ? { ...q, tier } : null;
}

function initWeights() {
  return Object.fromEntries(MUL_DIV_STANDARDS.map(s => [s, 0.5]));
}

function loadSeenTexts(key) {
  if (!key) return new Set();
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveSeenTexts(key, set) {
  if (!key) return;
  try {
    let arr = [...set];
    if (arr.length > 3000) arr = arr.slice(arr.length - 3000);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

async function submitPracticeSession(student, cls, weightedEarned) {
  if (!student) return;
  const pct = Math.round((weightedEarned / MAX_PTS) * 100);
  try {
    await fetch(`${API}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId:   student.id   || "",
        studentName: student.name || "Student",
        classId:     cls?.id      || "",
        className:   cls?.name    || "",
        testCode:    "NR2PRAC",
        testTitle:   "5.NR.2 Multiply & Divide Practice",
        score:       weightedEarned,
        total:       MAX_PTS,
        pct,
        mode:        "practice",
        submitted:   new Date().toISOString(),
      }),
    });
  } catch { /* fire-and-forget */ }
}

// True for problems that have a separate remainder field
function hasSeparateRemainder(q) {
  return q?.standard === 'DIV.TRAD';
}

function isAnswerCorrect(q, inputAnswer, inputRemainder) {
  const ans = inputAnswer.trim();
  if (hasSeparateRemainder(q)) {
    return ans === q.correct && inputRemainder.trim() === (q.remainder ?? '0');
  }
  return ans === q.correct;
}

export default function MulDivPractice({ student, cls, onBack }) {
  const SEEN_KEY   = student?.id ? `nr2prac_seen_${student.id}` : null;
  const [seenTexts, setSeenTexts] = useState(() => loadSeenTexts(SEEN_KEY));

  const [phase,         setPhase]         = useState('landing');
  const [history,       setHistory]       = useState([]);
  const [curQ,          setCurQ]          = useState(null);
  const [inputAnswer,   setInputAnswer]   = useState('');
  const [inputRemainder,setInputRemainder]= useState('');
  const [revealed,      setRevealed]      = useState(false);
  const [qNum,          setQNum]          = useState(1);
  const [weights,       setWeights]       = useState(initWeights);

  const answerRef   = useRef(null);
  const remainderRef = useRef(null);
  const nextRef      = useRef(null);

  // Auto-focus answer input when a new question appears
  useEffect(() => {
    if (phase === 'question' && !revealed) {
      setTimeout(() => answerRef.current?.focus(), 50);
    }
    if (revealed) {
      setTimeout(() => nextRef.current?.focus(), 50);
    }
  }, [curQ, revealed, phase]);

  function addSeen(text) {
    const next = new Set([...seenTexts, text]);
    setSeenTexts(next);
    saveSeenTexts(SEEN_KEY, next);
    return next;
  }

  function handleStart() {
    const w = initWeights();
    const q = pickNext(w, [], seenTexts);
    if (!q) return;
    addSeen(q.question);
    setCurQ(q);
    setWeights(w);
    setHistory([]);
    setQNum(1);
    setInputAnswer('');
    setInputRemainder('');
    setRevealed(false);
    setPhase('question');
  }

  function handleSubmit() {
    if (revealed || !inputAnswer.trim()) return;
    // For DIV.TRAD, require remainder too
    if (hasSeparateRemainder(curQ) && inputRemainder.trim() === '') return;
    setRevealed(true);
  }

  function handleNext() {
    const isCorrect  = isAnswerCorrect(curQ, inputAnswer, inputRemainder);
    const newHistory = [...history, { q: curQ, chosen: inputAnswer, correct: isCorrect }];
    setHistory(newHistory);

    if (newHistory.length >= LIMIT) {
      const earned = newHistory.reduce((sum, h) =>
        h.correct ? sum + (TIER_PTS[h.q.tier] || 1) : sum, 0);
      submitPracticeSession(student, cls, earned);
      setPhase('results');
      return;
    }

    const newWeights = updateSessionWeights(weights, newHistory, MUL_DIV_STANDARDS);
    setWeights(newWeights);
    const next = pickNext(newWeights, newHistory, seenTexts);
    if (next) addSeen(next.question);
    setCurQ(next);
    setInputAnswer('');
    setInputRemainder('');
    setRevealed(false);
    setQNum(n => n + 1);
  }

  function handleReset() {
    setPhase('landing');
    setHistory([]);
    setCurQ(null);
    setInputAnswer('');
    setInputRemainder('');
    setRevealed(false);
    setQNum(1);
    setWeights(initWeights());
  }

  // ── Landing ───────────────────────────────────────────────
  if (phase === 'landing') {
    return (
      <div style={{ minHeight:'100vh', background:T.midnight, display:'flex',
        flexDirection:'column', alignItems:'center', justifyContent:'center',
        fontFamily:T.font, padding:'2rem 1rem', gap:'2rem' }}>

        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.2em',
            color:T.teal, marginBottom:10 }}>
            MILESTONEREADY PRACTICE
          </div>
          <div style={{ fontSize:'2rem', fontWeight:800, color:T.white,
            lineHeight:1.2, marginBottom:8 }}>
            Multiplication &amp; Division
          </div>
          <div style={{ fontSize:'0.88rem', color:T.textMuted }}>
            20 adaptive questions · difficulty scales as you go
          </div>
        </div>

        <div style={{ background:T.white, borderRadius:T.rl, boxShadow:T.lg,
          padding:'2rem 2.5rem', width:'100%', maxWidth:'420px',
          display:'flex', flexDirection:'column', gap:'1.25rem' }}>

          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
            {MUL_DIV_STANDARDS.map(s => (
              <span key={s} style={{ background: CAT[s].bg, color: CAT[s].color,
                fontSize:'0.72rem', fontWeight:700, padding:'0.25rem 0.65rem',
                borderRadius:T.full, letterSpacing:'0.04em' }}>
                {CAT[s].label}
              </span>
            ))}
          </div>

          <div style={{ background:T.surface, borderRadius:T.xs, padding:'0.85rem 1rem',
            fontSize:'0.82rem', color:T.textSecondary, lineHeight:1.6 }}>
            <strong style={{ color:T.text }}>Weighted scoring:</strong> harder problems
            earn more points. Easy = 1 pt · Medium = 2 pts · Hard = 3 pts (60 pts max).
            <br/>Grade: Distinguished ≥ 90% · Proficient ≥ 75% · Approaching ≥ 60%.
          </div>

          <button onClick={handleStart} style={{ ...S.btnPri, width:'100%',
            textAlign:'center', padding:'0.85rem', fontSize:'1rem' }}>
            Start Practice →
          </button>

          <button onClick={onBack} style={{ ...S.btnSec, width:'100%',
            textAlign:'center', padding:'0.7rem' }}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── Question ──────────────────────────────────────────────
  if (phase === 'question' && curQ) {
    const pct      = Math.round((history.length / LIMIT) * 100);
    const cat      = CAT[curQ.standard] || CAT['MUL.TRAD'];
    const tierLabel = { easy:'Easy · 1 pt', medium:'Medium · 2 pts', hard:'Hard · 3 pts' }[curQ.tier] || '';
    const isDiv    = hasSeparateRemainder(curQ);
    const correct  = isAnswerCorrect(curQ, inputAnswer, inputRemainder);
    const canSubmit = inputAnswer.trim() !== '' && (!isDiv || inputRemainder.trim() !== '');

    const inputBase = {
      padding:'0.75rem 1rem', border:`2px solid ${T.border}`,
      borderRadius:T.r, fontSize:'1.15rem', fontWeight:700,
      fontFamily:T.font, outline:'none', textAlign:'center',
      background: revealed
        ? (correct ? T.successBg : T.dangerBg)
        : T.white,
      borderColor: revealed
        ? (correct ? T.successBd : T.dangerBd)
        : T.border,
      color: T.text,
      transition: 'border-color .15s, background .15s',
    };

    function onKeyDown(e) {
      if (e.key === 'Enter') {
        if (!revealed) handleSubmit();
        else handleNext();
      }
      if (e.key === 'Tab' && isDiv && !revealed && e.target === answerRef.current) {
        e.preventDefault();
        remainderRef.current?.focus();
      }
    }

    return (
      <div style={{ minHeight:'100vh', background:T.surface, display:'flex',
        flexDirection:'column', fontFamily:T.font }}>

        {/* Top bar */}
        <div style={{ background:T.midnight, padding:'0.85rem 1.5rem',
          display:'flex', alignItems:'center', gap:'1rem' }}>
          <div style={{ flex:1, color:T.white, fontWeight:700, fontSize:'0.95rem' }}>
            Multiplication &amp; Division Practice
          </div>
          <div style={{ color:T.textMuted, fontSize:'0.82rem' }}>
            {history.filter(h=>h.correct).length} correct · Q {qNum} of {LIMIT}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:5, background:T.slate }}>
          <div style={{ height:'100%', width:`${pct}%`, background:T.teal,
            transition:'width .3s' }} />
        </div>

        {/* Progress pips */}
        <div style={{ background:T.slate, padding:'0.5rem 1.5rem',
          display:'flex', gap:4, flexWrap:'wrap' }}>
          {Array.from({ length: LIMIT }, (_, i) => {
            const h = history[i];
            const isCurrent = i === history.length;
            return (
              <div key={i} style={{
                width:14, height:14, borderRadius:2,
                background: h ? (h.correct ? T.success : T.danger) : isCurrent ? T.teal : T.midnight,
                border: isCurrent ? `2px solid ${T.teal}` : `1px solid rgba(255,255,255,.12)`,
                boxSizing:'border-box',
              }}/>
            );
          })}
        </div>

        {/* Question card */}
        <div style={{ flex:1, display:'flex', alignItems:'flex-start', justifyContent:'center',
          padding:'1.5rem 1rem', paddingBottom:'2rem' }}>
          <div style={{ width:'100%', maxWidth:560 }}>

            {/* Badges */}
            <div style={{ marginBottom:'0.75rem', display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
              <span style={{ background:cat.bg, color:cat.color, fontSize:'0.7rem',
                fontWeight:700, padding:'0.2rem 0.65rem', borderRadius:T.full,
                letterSpacing:'0.04em' }}>
                {cat.label}
              </span>
              <span style={{ background:T.slate, color:T.textMuted, fontSize:'0.7rem',
                fontWeight:600, padding:'0.2rem 0.65rem', borderRadius:T.full }}>
                {tierLabel}
              </span>
            </div>

            {/* Question text */}
            <div style={{ background:T.white, border:`1px solid ${T.border}`,
              borderRadius:T.r, padding:'1.5rem', marginBottom:'1.25rem',
              boxShadow:T.sm }}>
              <div style={{ fontSize:'1.1rem', color:T.text, lineHeight:1.6,
                fontFamily:'Georgia, serif' }}>
                <MathText text={curQ.question} />
              </div>
            </div>

            {/* Answer input area */}
            {isDiv ? (
              /* Division — quotient + remainder side by side */
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', marginBottom:'0.75rem' }}>
                <div style={{ display:'flex', gap:'0.75rem', alignItems:'flex-end' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'0.72rem', fontWeight:700, color:T.textSecondary,
                      marginBottom:'0.3rem', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                      Quotient
                    </div>
                    <input
                      ref={answerRef}
                      type="number"
                      inputMode="numeric"
                      value={inputAnswer}
                      onChange={e => !revealed && setInputAnswer(e.target.value)}
                      onKeyDown={onKeyDown}
                      disabled={revealed}
                      placeholder="0"
                      style={{ ...inputBase, width:'100%', boxSizing:'border-box' }}
                    />
                  </div>
                  <div style={{ paddingBottom:'0.75rem', fontSize:'1.1rem', color:T.textMuted,
                    fontWeight:700 }}>R</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'0.72rem', fontWeight:700, color:T.textSecondary,
                      marginBottom:'0.3rem', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                      Remainder
                    </div>
                    <input
                      ref={remainderRef}
                      type="number"
                      inputMode="numeric"
                      value={inputRemainder}
                      onChange={e => !revealed && setInputRemainder(e.target.value)}
                      onKeyDown={onKeyDown}
                      disabled={revealed}
                      placeholder="0"
                      style={{ ...inputBase, width:'100%', boxSizing:'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ fontSize:'0.78rem', color:T.textMuted, fontStyle:'italic' }}>
                  Enter <strong>0</strong> in the Remainder box if there is no remainder.
                </div>
              </div>
            ) : (
              /* Multiplication or word problem — single answer */
              <div style={{ marginBottom:'0.75rem' }}>
                <div style={{ fontSize:'0.72rem', fontWeight:700, color:T.textSecondary,
                  marginBottom:'0.3rem', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                  Your Answer
                </div>
                <input
                  ref={answerRef}
                  type={curQ.correct?.startsWith('$') ? 'text' : 'number'}
                  inputMode="numeric"
                  value={inputAnswer}
                  onChange={e => !revealed && setInputAnswer(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={revealed}
                  placeholder={curQ.correct?.startsWith('$') ? '$0' : '0'}
                  style={{ ...inputBase, width:'100%', boxSizing:'border-box' }}
                />
              </div>
            )}

            {/* Submit / feedback / next */}
            {!revealed ? (
              <button onClick={handleSubmit} disabled={!canSubmit}
                style={{ ...S.btnPri, width:'100%', textAlign:'center',
                  padding:'0.85rem', fontSize:'0.95rem',
                  opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? 'pointer' : 'default' }}>
                Check Answer
              </button>
            ) : (
              <div>
                <div style={{
                  padding:'0.75rem 1rem', borderRadius:T.xs, marginBottom:'0.75rem',
                  background: correct ? T.successBg : T.dangerBg,
                  border: `1px solid ${correct ? T.successBd : T.dangerBd}`,
                  color: correct ? '#065f46' : T.dangerText,
                  fontSize:'0.92rem', fontWeight:600,
                }}>
                  {correct
                    ? `Correct! +${TIER_PTS[curQ.tier] || 1} pt${TIER_PTS[curQ.tier] !== 1 ? 's' : ''}`
                    : isDiv
                      ? <>The correct answer is <strong>{curQ.correct}</strong> remainder <strong>{curQ.remainder ?? '0'}</strong></>
                      : <>The correct answer is <strong><MathText text={curQ.correct}/></strong></>
                  }
                </div>
                <button ref={nextRef} onClick={handleNext}
                  style={{ ...S.btnPri, width:'100%', textAlign:'center',
                    padding:'0.85rem', fontSize:'0.95rem' }}>
                  {history.length + 1 >= LIMIT ? 'See Results →' : 'Next Question →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────
  if (phase === 'results') {
    const earned      = history.reduce((sum, h) =>
      h.correct ? sum + (TIER_PTS[h.q.tier] || 1) : sum, 0);
    const weightedPct = Math.round((earned / MAX_PTS) * 100);
    const band        = gradeBand(weightedPct);
    const rawCorrect  = history.filter(h => h.correct).length;

    const catStats = Object.fromEntries(
      MUL_DIV_STANDARDS.map(s => {
        const items = history.filter(h => h.q.standard === s);
        return [s, { correct: items.filter(h=>h.correct).length, total: items.length }];
      })
    );

    const tierCounts = { easy: 0, medium: 0, hard: 0 };
    history.forEach(h => { if (h.q.tier) tierCounts[h.q.tier]++; });

    return (
      <div style={{ minHeight:'100vh', background:T.midnight, display:'flex',
        flexDirection:'column', alignItems:'center', justifyContent:'center',
        fontFamily:T.font, padding:'2rem 1rem', gap:'1.5rem' }}>

        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.2em',
            color:T.teal, marginBottom:8 }}>
            PRACTICE COMPLETE
          </div>
          <div style={{ fontSize:'3rem', fontWeight:800, color:band.color, lineHeight:1 }}>
            {earned}
            <span style={{ fontSize:'1.25rem', color:T.textMuted }}> / {MAX_PTS} pts</span>
          </div>
          <div style={{ fontSize:'1.1rem', fontWeight:700, color:band.color, marginTop:6 }}>
            {band.label}
          </div>
          <div style={{ fontSize:'0.82rem', color:T.textMuted, marginTop:4 }}>
            {weightedPct}% weighted · {rawCorrect}/{LIMIT} correct
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:'0.5rem', marginTop:'0.65rem',
            flexWrap:'wrap' }}>
            {tierCounts.easy   > 0 && <span style={{ background:'rgba(255,255,255,.08)',
              color:'rgba(255,255,255,.6)', fontSize:'0.7rem', fontWeight:600,
              padding:'0.2rem 0.65rem', borderRadius:T.full }}>
              {tierCounts.easy} Easy (×1)</span>}
            {tierCounts.medium > 0 && <span style={{ background:'rgba(255,255,255,.08)',
              color:'rgba(255,255,255,.6)', fontSize:'0.7rem', fontWeight:600,
              padding:'0.2rem 0.65rem', borderRadius:T.full }}>
              {tierCounts.medium} Medium (×2)</span>}
            {tierCounts.hard   > 0 && <span style={{ background:'rgba(255,255,255,.08)',
              color:'rgba(255,255,255,.6)', fontSize:'0.7rem', fontWeight:600,
              padding:'0.2rem 0.65rem', borderRadius:T.full }}>
              {tierCounts.hard} Hard (×3)</span>}
          </div>
        </div>

        <div style={{ background:T.white, borderRadius:T.rl, boxShadow:T.lg,
          padding:'1.75rem 2rem', width:'100%', maxWidth:'420px',
          display:'flex', flexDirection:'column', gap:'1rem' }}>

          <div style={{ fontSize:'0.65rem', fontWeight:700, letterSpacing:'0.12em',
            color:T.textSecondary, textTransform:'uppercase', marginBottom:4 }}>
            Breakdown by category
          </div>

          {MUL_DIV_STANDARDS.map(s => {
            const { correct, total } = catStats[s];
            const p = total > 0 ? Math.round((correct/total)*100) : 0;
            const cat = CAT[s];
            return (
              <div key={s}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:'0.82rem', fontWeight:600, color:T.text }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize:'0.82rem', color:T.textSecondary }}>
                    {total > 0 ? `${correct}/${total} (${p}%)` : 'Not attempted'}
                  </span>
                </div>
                <div style={{ height:7, background:T.surface, borderRadius:T.full, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${p}%`, background:cat.color,
                    borderRadius:T.full, transition:'width .5s' }} />
                </div>
              </div>
            );
          })}

          <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem', marginTop:'0.5rem' }}>
            <button onClick={handleReset} style={{ ...S.btnPri, width:'100%',
              textAlign:'center', padding:'0.85rem', fontSize:'0.95rem' }}>
              Practice Again
            </button>
            <button onClick={onBack} style={{ ...S.btnSec, width:'100%',
              textAlign:'center', padding:'0.7rem' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
