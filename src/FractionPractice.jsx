import { useState, useEffect, useRef } from "react";
import MathText from "./shared/MathText";
import { generateParametric, updateSessionWeights, FRAC_STANDARDS } from "./adaptive";
import { T, S, API } from "./shared/constants";

const LIMIT    = 20;
const TIER_PTS = { easy: 1, medium: 2, hard: 3 };

const CAT = {
  'FRA.DIV':      { label: 'Fraction as Division',   color: T.teal,     bg: T.tealLight },
  'FRA.MUL':      { label: 'Multiply Fractions',     color: '#7c3aed',  bg: '#ede9fe'  },
  'FRA.SCALE':    { label: 'Fraction Scaling',       color: '#d97706',  bg: '#fef3c7'  },
  'FRA.DIV_UNIT': { label: 'Divide Unit Fractions',  color: '#db2777',  bg: '#fce7f3'  },
};

const CAT_FULL = {
  'FRA.DIV':      '5.NR.3.1 — Fraction as Division',
  'FRA.MUL':      '5.NR.3.4 — Multiply Fractions',
  'FRA.SCALE':    '5.NR.3.5 — Fraction Scaling',
  'FRA.DIV_UNIT': '5.NR.3.6 — Divide Unit Fractions',
};

const GRADE_BANDS = [
  { min: 90, label: 'Distinguished Learner', color: '#059669' },
  { min: 75, label: 'Proficient Learner',    color: T.teal    },
  { min: 60, label: 'Approaching Learner',   color: '#d97706' },
  { min: 0,  label: 'Beginning Learner',     color: '#dc2626' },
];
function gradeBand(pct) {
  return GRADE_BANDS.find(b => pct >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1];
}

function computeTier(standard, history) {
  const recent = history.filter(h => h.q.standard === standard).slice(-5);
  if (recent.length < 2) return 'easy';
  const acc = recent.filter(h => h.correct).length / recent.length;
  if (acc >= 0.7) return 'hard';
  if (acc >= 0.5) return 'medium';
  return 'easy';
}

function pickNext(activeStds, weights, history, seenTexts) {
  // Per-session cap: suppress standards with ≥2 attempts and <50% accuracy
  const sessionStats = {};
  history.forEach(item => {
    const std = item.q?.standard;
    if (!std) return;
    if (!sessionStats[std]) sessionStats[std] = { correct: 0, total: 0 };
    sessionStats[std].total++;
    if (item.correct) sessionStats[std].correct++;
  });
  const capped = new Set(
    activeStds.filter(std => {
      const s = sessionStats[std];
      return s && s.total >= 2 && (s.correct / s.total) < 0.5;
    })
  );
  const available = activeStds.filter(s => !capped.has(s));
  const pool = available.length > 0 ? available : activeStds;

  const total = pool.reduce((s, std) => s + (weights[std] || 0.5), 0);
  let r = Math.random() * total;
  let chosen = pool[pool.length - 1];
  for (const std of pool) {
    r -= (weights[std] || 0.5);
    if (r <= 0) { chosen = std; break; }
  }
  const tier = computeTier(chosen, history);
  for (let i = 0; i < 12; i++) {
    const q = generateParametric(chosen, { tier });
    if (q && !seenTexts.has(q.question)) return { ...q, tier };
  }
  for (const std of pool) {
    for (let i = 0; i < 4; i++) {
      const t = computeTier(std, history);
      const q = generateParametric(std, { tier: t });
      if (q && !seenTexts.has(q.question)) return { ...q, tier: t };
    }
  }
  const q = generateParametric(chosen, { tier });
  return q ? { ...q, tier } : null;
}

function initWeights(stds) {
  return Object.fromEntries(stds.map(s => [s, 0.5]));
}


// Determine if current time falls within the class period window.
function checkInClass(cls) {
  const start = cls?.periodStartTime;
  const end   = cls?.periodEndTime;
  if (start || end) {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const afterStart = !start || hhmm >= start;
    const beforeEnd  = !end   || hhmm <  end;
    return afterStart && beforeEnd;
  }
  return cls?.fractionsOpen !== false && cls?.practiceOpen !== false;
}

// ── Period end timer ──────────────────────────────────────────
function msUntilPeriodEnd(periodEndTime) {
  if (!periodEndTime) return null;
  const [hh, mm] = periodEndTime.split(':').map(Number);
  const now = new Date(), end = new Date(now);
  end.setHours(hh, mm, 0, 0);
  if (end <= now) return null;
  return end - now;
}

// ── Session draft helpers ────────────────────────────────────
function draftKey(studentId)    { return studentId ? `nr3prac_draft_${studentId}` : null; }
function loadDraft(studentId) {
  const key = draftKey(studentId);
  if (!key) return null;
  try {
    const d = JSON.parse(localStorage.getItem(key) || 'null');
    if (d && Array.isArray(d.history) && d.history.length > 0 && d.history.length < LIMIT) return d;
    return null;
  } catch { return null; }
}
function saveDraft(studentId, data) {
  const key = draftKey(studentId);
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}
function clearDraft(studentId) {
  const key = draftKey(studentId);
  if (key) try { localStorage.removeItem(key); } catch {}
}

// ── Persisted weights ────────────────────────────────────────
function weightsKey(studentId) { return studentId ? `nr3prac_weights_${studentId}` : null; }
function loadPersistedWeights(studentId, stds) {
  const key = weightsKey(studentId);
  if (!key) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || 'null');
    if (parsed && stds.every(s => typeof parsed[s] === 'number')) return parsed;
    return null;
  } catch { return null; }
}
function savePersistedWeights(studentId, weights) {
  const key = weightsKey(studentId);
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(weights)); } catch {}
}

// ── Seen texts helpers ───────────────────────────────────────
function seenKey(studentId) { return studentId ? `nr3prac_seen_${studentId}` : null; }
function loadSeenTexts(key) {
  if (!key) return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); }
}
function saveSeenTexts(key, set) {
  if (!key) return;
  try {
    let arr = [...set];
    if (arr.length > 3000) arr = arr.slice(arr.length - 3000);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch {}
}

// ── SmartScore (0-100) ────────────────────────────────────────
function computeSmartScore(history) {
  if (history.length > 0 && history.every(h => h.correct)) return 100;
  let score = 0;
  for (const h of history) {
    const pts = TIER_PTS[h.q.tier] || 1;
    if (h.correct) {
      const gain = Math.max(1, Math.round((pts + 2) * (100 - score) / 30));
      score = Math.min(100, score + gain);
    } else {
      const loss = (4 - pts) + 2;
      score = Math.max(0, score - loss);
    }
  }
  return Math.round(score);
}

// ── Submit ───────────────────────────────────────────────────
async function submitFractionSession(student, cls, history, inClass) {
  if (!student) return;
  const earned    = history.reduce((s, h) => h.correct ? s + (TIER_PTS[h.q.tier] || 1) : s, 0);
  const actualMax = history.reduce((s, h) => s + (TIER_PTS[h.q.tier] || 1), 0) || 1;
  const pct       = computeSmartScore(history);
  const answers   = Object.fromEntries(
    history.map((h, i) => [`Q${i + 1}`, {
      question: h.q.question, standard: h.q.standard, tier: h.q.tier,
      chosen: h.chosen, correct: h.q.correct, isCorrect: h.correct,
      timeMs: h.timeMs || 0,
    }])
  );
  const questionTimes = history.map(h => h.timeMs || 0);
  try {
    const resp = await fetch(`${API}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId:   student.id   || '',
        studentName: student.name || 'Student',
        classId:     cls?.id      || '',
        className:   cls?.name    || '',
        testCode:    'NR3PRAC',
        testTitle:   '5.NR.3 Fractions Practice',
        score:       earned,
        total:       actualMax,
        pct,
        mode:        'practice',
        inClass:     !!inClass,
        submitted:   new Date().toISOString(),
        timeUsed:    '',
        answers,
        questionTimes,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => String(resp.status));
      console.error('[FractionPractice] submit failed:', resp.status, detail);
      alert('Your practice session could not be saved (' + resp.status + '). Please let your teacher know.');
    }
  } catch (e) {
    console.error('[FractionPractice] submit error:', e);
    alert('Your practice session could not be saved. Please let your teacher know.');
  }
}

// ── Component ────────────────────────────────────────────────
export default function FractionPractice({ student, cls, onBack }) {
  // Determine which standards are active for this class
  const activeStds = (cls?.practiceStandards?.length > 0)
    ? cls.practiceStandards.filter(s => FRAC_STANDARDS.includes(s))
    : FRAC_STANDARDS;
  const effectiveStds = activeStds.length > 0 ? activeStds : FRAC_STANDARDS;

  const SEEN_KEY = seenKey(student?.id);
  const [seenTexts, setSeenTexts] = useState(() => loadSeenTexts(SEEN_KEY));
  const [draft]                   = useState(() => loadDraft(student?.id));
  const [inClass,       setInClass]       = useState(false);
  const [phase,         setPhase]         = useState('landing');
  const [history,       setHistory]       = useState([]);
  const [curQ,          setCurQ]          = useState(null);
  const [inputAnswer,   setInputAnswer]   = useState('');
  const [revealed,      setRevealed]      = useState(false);
  const [qNum,          setQNum]          = useState(1);
  const [weights,       setWeights]       = useState(
    () => loadPersistedWeights(student?.id, effectiveStds) || initWeights(effectiveStds)
  );

  const answerRef      = useRef(null);
  const nextRef        = useRef(null);
  const periodTimerRef = useRef(null);
  const qStartRef      = useRef(null); // timestamp when current question was shown
  const [, setTabWarnCount]   = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const tabWarnRef      = useRef(0);

  // Tab-switch detection
  useEffect(() => {
    if (phase !== 'question') return;
    function onHide() {
      if (document.hidden) {
        const count = tabWarnRef.current + 1;
        tabWarnRef.current = count;
        setTabWarnCount(count);
        if (count === 1) setShowTabWarning(true);
        else setPhase('landing');
      }
    }
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Auto-focus answer input
  useEffect(() => {
    if (phase === 'question' && !revealed)
      setTimeout(() => answerRef.current?.focus(), 50);
    if (revealed)
      setTimeout(() => nextRef.current?.focus(), 50);
  }, [curQ, revealed, phase]);

  function addSeen(text) {
    const next = new Set([...seenTexts, text]);
    setSeenTexts(next);
    saveSeenTexts(SEEN_KEY, next);
    return next;
  }

  function startPeriodTimer() {
    if (periodTimerRef.current) clearTimeout(periodTimerRef.current);
    const ms = msUntilPeriodEnd(cls?.periodEndTime);
    if (!ms) return;
    periodTimerRef.current = setTimeout(() => {
      setHistory(prev => {
        if (prev.length === 0) { setPhase('landing'); return prev; }
        clearDraft(student?.id);
        submitFractionSession(student, cls, prev, true);
        setPhase('results');
        return prev;
      });
    }, ms);
  }

  function handleStart() {
    const w = loadPersistedWeights(student?.id, effectiveStds) || initWeights(effectiveStds);
    const q = pickNext(effectiveStds, w, [], seenTexts);
    if (!q) return;
    addSeen(q.question);
    setCurQ(q);
    setWeights(w);
    setHistory([]);
    setQNum(1);
    setInputAnswer('');
    setRevealed(false);
    setTabWarnCount(0);
    tabWarnRef.current = 0;
    setShowTabWarning(false);
    setInClass(checkInClass(cls));
    startPeriodTimer();
    qStartRef.current = Date.now();
    setPhase('question');
  }

  function handleResume() {
    if (!draft) return;
    setHistory(draft.history);
    setWeights(draft.weights || initWeights(effectiveStds));
    setCurQ(draft.curQ);
    setQNum(draft.qNum || draft.history.length + 1);
    setInputAnswer('');
    setRevealed(false);
    setTabWarnCount(0);
    tabWarnRef.current = 0;
    setShowTabWarning(false);
    setInClass(checkInClass(cls));
    startPeriodTimer();
    qStartRef.current = Date.now();
    setPhase('question');
  }

  function handleSubmit() {
    if (revealed || !inputAnswer.trim()) return;
    setRevealed(true);
  }

  function handleNext() {
    const timeMs    = qStartRef.current ? Date.now() - qStartRef.current : 0;
    const isCorrect = inputAnswer.trim() === curQ.correct;
    const newHistory = [...history, { q: curQ, chosen: inputAnswer.trim(), correct: isCorrect, timeMs }];
    setHistory(newHistory);

    if (newHistory.length >= LIMIT) {
      clearDraft(student?.id);
      submitFractionSession(student, cls, newHistory, inClass);
      setPhase('results');
      return;
    }

    const newWeights = updateSessionWeights(weights, newHistory, effectiveStds);
    setWeights(newWeights);
    savePersistedWeights(student?.id, newWeights);

    const next = pickNext(effectiveStds, newWeights, newHistory, seenTexts);
    if (next) addSeen(next.question);
    setCurQ(next);
    setInputAnswer('');
    setRevealed(false);
    setQNum(n => n + 1);
    qStartRef.current = Date.now();
    saveDraft(student?.id, { history: newHistory, weights: newWeights, curQ: next, qNum: newHistory.length + 1 });
  }

  function handleReset() {
    clearDraft(student?.id);
    if (periodTimerRef.current) { clearTimeout(periodTimerRef.current); periodTimerRef.current = null; }
    setPhase('landing');
    setHistory([]);
    setCurQ(null);
    setInputAnswer('');
    setRevealed(false);
    setQNum(1);
    setWeights(loadPersistedWeights(student?.id, effectiveStds) || initWeights(effectiveStds));
  }

  // ── Landing ──────────────────────────────────────────────────
  if (phase === 'landing') {
    return (
      <div style={{ minHeight: '100vh', background: T.midnight, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.font, padding: '2rem 1rem', gap: '2rem' }}>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em',
            color: T.teal, marginBottom: 10 }}>
            MILESTONEREADY PRACTICE
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: T.white, lineHeight: 1.2, marginBottom: 8 }}>
            Fractions Practice
          </div>
          <div style={{ fontSize: '0.88rem', color: T.textMuted }}>
            20 adaptive questions · difficulty scales as you go
          </div>
        </div>

        <div style={{ background: T.white, borderRadius: T.rl, boxShadow: T.lg,
          padding: '2rem 2.5rem', width: '100%', maxWidth: '420px',
          display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {effectiveStds.map(s => (
              <span key={s} style={{ background: CAT[s]?.bg, color: CAT[s]?.color,
                fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.65rem',
                borderRadius: T.full, letterSpacing: '0.04em' }}>
                {CAT[s]?.label}
              </span>
            ))}
          </div>

          <div style={{ background: T.surface, borderRadius: T.xs, padding: '0.85rem 1rem',
            fontSize: '0.82rem', color: T.textSecondary, lineHeight: 1.6 }}>
            <strong style={{ color: T.text }}>Weighted scoring:</strong> harder problems earn more
            points. Easy = 1 pt · Medium = 2 pts · Hard = 3 pts.
            <br/>Grade: Distinguished ≥ 90 · Proficient ≥ 75 · Approaching ≥ 60.
          </div>

          {draft && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: T.xs,
              padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>
                  Session in progress — Q{draft.history.length} of {LIMIT}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
                  You have an unfinished session. Resume where you left off?
                </div>
              </div>
              <button onClick={handleResume}
                style={{ ...S.btnPri, padding: '0.5rem 1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                Resume →
              </button>
            </div>
          )}

          {!checkInClass(cls) && (
            <div style={{ background: 'rgba(13,148,136,.08)', border: '1px solid rgba(13,148,136,.2)',
              borderRadius: T.xs, padding: '0.6rem 0.85rem', fontSize: '0.8rem',
              color: T.teal, textAlign: 'center' }}>
              🏠 You're practicing on your own — this won't count toward your grade,
              but every session makes you stronger!
            </div>
          )}

          {/* In-class with a draft in progress: only allow Resume, no Start Over */}
          {!(draft && checkInClass(cls)) && (
            <button onClick={handleStart} style={{ ...S.btnPri, width: '100%',
              textAlign: 'center', padding: '0.85rem', fontSize: '1rem' }}>
              {draft ? 'Start Over' : 'Start Practice →'}
            </button>
          )}
          <button onClick={onBack} style={{ ...S.btnSec, width: '100%',
            textAlign: 'center', padding: '0.7rem' }}>
            🏠 Home
          </button>
        </div>
      </div>
    );
  }

  // ── Question ─────────────────────────────────────────────────
  if (phase === 'question' && curQ) {
    const pct       = Math.round((history.length / LIMIT) * 100);
    const tierLabel = { easy: 'Easy · 1 pt', medium: 'Medium · 2 pts', hard: 'Hard · 3 pts' }[curQ.tier] || '';
    const correct   = inputAnswer.trim() === curQ.correct;

    // Multiple choice
    const isMultiChoice = Array.isArray(curQ.choices) && curQ.choices.length > 0;

    return (
      <div style={{ minHeight: '100vh', background: T.surface, display: 'flex',
        flexDirection: 'column', fontFamily: T.font }}>

        {/* Tab-switch warning */}
        {showTabWarning && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: T.white, borderRadius: T.r, padding: '2rem', maxWidth: 380,
              width: '90%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,.3)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#b91c1c', marginBottom: '0.5rem' }}>
                Don't Switch Tabs!
              </div>
              <div style={{ fontSize: '0.9rem', color: T.textSecondary, marginBottom: '1.5rem', lineHeight: 1.5 }}>
                You switched away from the practice session. This is your <strong>warning</strong> — if
                you switch tabs again, your session will end.
              </div>
              <button onClick={() => setShowTabWarning(false)}
                style={{ ...S.btnPri, width: '100%', padding: '0.75rem' }}>
                I understand — continue practice
              </button>
            </div>
          </div>
        )}

        {/* Top bar */}
        <div style={{ background: T.midnight, padding: '0.85rem 1.5rem',
          display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1, color: T.white, fontWeight: 700, fontSize: '0.95rem' }}>
            Fractions Practice
          </div>
          <div style={{ color: T.textMuted, fontSize: '0.82rem' }}>
            {history.filter(h => h.correct).length} correct · Q {qNum} of {LIMIT}
          </div>
          <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,.3)',
            color: 'rgba(255,255,255,.75)', borderRadius: '4px', padding: '4px 10px',
            fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            🏠 Home
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 5, background: T.slate }}>
          <div style={{ height: '100%', width: `${pct}%`, background: T.teal, transition: 'width .3s' }} />
        </div>

        {/* Progress pips */}
        <div style={{ background: T.slate, padding: '0.5rem 1.5rem', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Array.from({ length: LIMIT }, (_, i) => {
            const h = history[i];
            const isCurrent = i === history.length;
            return (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: 2,
                background: h ? (h.correct ? T.success : T.danger) : isCurrent ? T.teal : T.midnight,
                border: isCurrent ? `2px solid ${T.teal}` : `1px solid rgba(255,255,255,.12)`,
                boxSizing: 'border-box',
              }}/>
            );
          })}
        </div>

        {/* Question card */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '1.5rem 1rem 2rem' }}>
          <div style={{ width: '100%', maxWidth: 560 }}>

            {/* Tier badge */}
            <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ background: T.slate, color: T.textMuted, fontSize: '0.7rem',
                fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: T.full }}>
                {tierLabel}
              </span>
            </div>

            {/* Question text */}
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: T.r,
              padding: '1.5rem', marginBottom: '1.25rem', boxShadow: T.sm }}>
              <div style={{ fontSize: '1.1rem', color: T.text, lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>
                <MathText text={curQ.question} />
              </div>
            </div>

            {/* Answer area */}
            {isMultiChoice ? (
              /* Multiple choice buttons */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {curQ.choices.map((choice, idx) => {
                  const isSelected = inputAnswer === choice;
                  const isCorrectChoice = choice === curQ.correct;
                  let bg = T.white, border = `2px solid ${T.border}`, color = T.text;
                  if (revealed) {
                    if (isCorrectChoice)      { bg = T.successBg; border = `2px solid ${T.successBd}`; color = '#065f46'; }
                    else if (isSelected)      { bg = T.dangerBg;  border = `2px solid ${T.dangerBd}`;  color = '#991b1b'; }
                  } else if (isSelected) {
                    bg = '#eff6ff'; border = `2px solid ${T.teal}`; color = T.text;
                  }
                  return (
                    <button key={idx} onClick={() => !revealed && setInputAnswer(choice)}
                      style={{ padding: '0.75rem 1rem', background: bg, border, borderRadius: T.r,
                        fontSize: '1rem', fontFamily: T.font, color, textAlign: 'left',
                        cursor: revealed ? 'default' : 'pointer', transition: 'all .15s',
                        fontWeight: isSelected || (revealed && isCorrectChoice) ? 700 : 400 }}>
                      <MathText text={choice} />
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Text input fallback */
              <div style={{ marginBottom: '0.75rem' }}>
                <input ref={answerRef} type="text"
                  value={inputAnswer}
                  onChange={e => !revealed && setInputAnswer(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { if (!revealed) handleSubmit(); else handleNext(); } }}
                  disabled={revealed}
                  placeholder="Your answer"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: `2px solid ${T.border}`,
                    borderRadius: T.r, fontSize: '1.15rem', fontWeight: 700, fontFamily: T.font,
                    outline: 'none', textAlign: 'center', boxSizing: 'border-box',
                    background: revealed ? (correct ? T.successBg : T.dangerBg) : T.white,
                    borderColor: revealed ? (correct ? T.successBd : T.dangerBd) : T.border,
                    color: T.text, transition: 'border-color .15s, background .15s' }} />
              </div>
            )}

            {/* Submit / feedback / next */}
            {!revealed ? (
              <button onClick={handleSubmit} disabled={!inputAnswer.trim()}
                style={{ ...S.btnPri, width: '100%', textAlign: 'center', padding: '0.85rem',
                  fontSize: '0.95rem', opacity: inputAnswer.trim() ? 1 : 0.4,
                  cursor: inputAnswer.trim() ? 'pointer' : 'default' }}>
                Check Answer
              </button>
            ) : (
              <div>
                <div style={{ padding: '0.75rem 1rem', borderRadius: T.xs, marginBottom: '0.75rem',
                  background: correct ? T.successBg : T.dangerBg,
                  border: `1px solid ${correct ? T.successBd : T.dangerBd}`,
                  color: correct ? '#065f46' : '#991b1b', fontSize: '0.92rem', fontWeight: 600 }}>
                  {correct
                    ? `Correct! +${TIER_PTS[curQ.tier] || 1} pt${TIER_PTS[curQ.tier] !== 1 ? 's' : ''}`
                    : <span>The correct answer is <strong><MathText text={curQ.correct}/></strong></span>}
                </div>
                <button ref={nextRef} onClick={handleNext}
                  style={{ ...S.btnPri, width: '100%', textAlign: 'center', padding: '0.85rem', fontSize: '0.95rem' }}>
                  {history.length + 1 >= LIMIT ? 'See Results →' : 'Next Question →'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Results ──────────────────────────────────────────────────
  if (phase === 'results') {
    const earned      = history.reduce((s, h) => h.correct ? s + (TIER_PTS[h.q.tier] || 1) : s, 0);
    const actualMax   = history.reduce((s, h) => s + (TIER_PTS[h.q.tier] || 1), 0) || 1;
    const smartScore  = computeSmartScore(history);
    const band        = gradeBand(smartScore);
    const rawCorrect  = history.filter(h => h.correct).length;

    const catStats = Object.fromEntries(
      effectiveStds.map(s => {
        const items = history.filter(h => h.q.standard === s);
        return [s, { correct: items.filter(h => h.correct).length, total: items.length }];
      })
    );
    const tierCounts = { easy: 0, medium: 0, hard: 0 };
    history.forEach(h => { if (h.q.tier) tierCounts[h.q.tier]++; });

    return (
      <div style={{ minHeight: '100vh', background: T.midnight, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: T.font, padding: '2rem 1rem', gap: '1.5rem' }}>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em', color: T.teal, marginBottom: 8 }}>
            PRACTICE COMPLETE
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            background: inClass ? 'rgba(5,150,105,.15)' : 'rgba(255,255,255,.08)',
            border: `1px solid ${inClass ? 'rgba(5,150,105,.4)' : 'rgba(255,255,255,.15)'}`,
            borderRadius: T.full, padding: '0.2rem 0.75rem', marginBottom: 8,
            fontSize: '0.72rem', fontWeight: 700,
            color: inClass ? '#6ee7b7' : T.textMuted }}>
            {inClass ? '🏫 In-class session — counts for your grade' : '🏠 Practice session — keeps you sharp!'}
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: band.color, lineHeight: 1 }}>
            {smartScore}
            <span style={{ fontSize: '1.25rem', color: T.textMuted }}> / 100</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: band.color, marginTop: 6 }}>
            {band.label}
          </div>
          <div style={{ fontSize: '0.82rem', color: T.textMuted, marginTop: 4 }}>
            SmartScore · {rawCorrect}/{LIMIT} correct · {earned}/{actualMax} pts
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.65rem', flexWrap: 'wrap' }}>
            {tierCounts.easy   > 0 && <span style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: T.full }}>{tierCounts.easy} Easy (×1)</span>}
            {tierCounts.medium > 0 && <span style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: T.full }}>{tierCounts.medium} Medium (×2)</span>}
            {tierCounts.hard   > 0 && <span style={{ background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.6)', fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: T.full }}>{tierCounts.hard} Hard (×3)</span>}
          </div>
        </div>

        <div style={{ background: T.white, borderRadius: T.rl, boxShadow: T.lg,
          padding: '1.75rem 2rem', width: '100%', maxWidth: '420px',
          display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em',
            color: T.textSecondary, textTransform: 'uppercase', marginBottom: 4 }}>
            Breakdown by standard
          </div>

          {effectiveStds.map(s => {
            const { correct: c, total } = catStats[s];
            const p = total > 0 ? Math.round((c / total) * 100) : 0;
            const cat = CAT[s];
            return (
              <div key={s}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: T.text }}>{cat?.label}</span>
                  <span style={{ fontSize: '0.82rem', color: T.textSecondary }}>
                    {total > 0 ? `${c}/${total} (${p}%)` : 'Not attempted'}
                  </span>
                </div>
                <div style={{ height: 7, background: T.surface, borderRadius: T.full, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p}%`, background: cat?.color,
                    borderRadius: T.full, transition: 'width .5s' }} />
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
            {/* Hide "Practice Again" for in-class sessions — prevents gaming by restarting */}
            {!inClass && (
              <button onClick={handleReset} style={{ ...S.btnPri, width: '100%', textAlign: 'center', padding: '0.85rem', fontSize: '0.95rem' }}>
                Practice Again
              </button>
            )}
            <button onClick={onBack} style={{ ...S.btnSec, width: '100%', textAlign: 'center', padding: '0.7rem' }}>
              🏠 Done — Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export { CAT_FULL, GRADE_BANDS, gradeBand };
