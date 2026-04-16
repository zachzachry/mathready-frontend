import { T } from "./shared/constants";
import MathText from "./shared/MathText";

const TIER_PTS  = { easy: 1, medium: 2, hard: 3 };
const BANDS = [
  { min: 90, label: 'Distinguished Learner', color: '#059669' },
  { min: 75, label: 'Proficient Learner',    color: '#0d9488' },
  { min: 60, label: 'Approaching Learner',   color: '#d97706' },
  { min: 0,  label: 'Beginning Learner',     color: '#dc2626' },
];
function band(p) { return BANDS.find(b => p >= b.min) || BANDS[BANDS.length - 1]; }

function smartScoreFromAnswers(answers) {
  let score = 0;
  const qs = Object.values(answers || {}).sort((a, b) =>
    (parseInt(a._idx) || 0) - (parseInt(b._idx) || 0)
  );
  for (const q of qs) {
    const pts = TIER_PTS[q.tier] || 1;
    if (q.isCorrect) {
      const gain = Math.max(1, Math.round((pts + 2) * (100 - score) / 30));
      score = Math.min(100, score + gain);
    } else {
      score = Math.max(0, score - ((4 - pts) + 2));
    }
  }
  return Math.round(score);
}

function fmtTime(ms) {
  if (!ms || ms < 0) return '—';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    + '  ·  Submitted: ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PracticeParentReport({ session, classAvgScore, todayInClass, title, onClose }) {
  if (!session) return null;
  const answers = session.answers || {};
  const qKeys   = Object.keys(answers).filter(k => /^Q\d+$/.test(k)).sort((a, b) => {
    const ai = parseInt(a.replace('Q', '')) || 0;
    const bi = parseInt(b.replace('Q', '')) || 0;
    return ai - bi;
  });
  const didNotParticipate = qKeys.length === 0 && session.total === 0;
  const totalQs  = qKeys.length || (didNotParticipate ? 0 : 20);
  const correct  = qKeys.filter(k => answers[k]?.isCorrect).length;
  const smartScore = smartScoreFromAnswers(answers);
  const b        = band(smartScore);
  const totalMs  = qKeys.reduce((s, k) => s + (answers[k]?.timeMs || 0), 0);
  const classAvg = todayInClass?.length > 0
    ? Math.round(todayInClass.reduce((s, x) => s + (x.pct || 0), 0) / todayInClass.length)
    : null;
  const classAvgCount = todayInClass?.length || 0;
  const studentName = session.studentName || session.name || 'Student';
  const className   = session.className || '';

  // Standard labels
  const STD_LABELS = {
    'FRA.DIV':      '5.NR.3.1 — Fraction as Division',
    'FRA.MUL':      '5.NR.3.4 — Multiply Fractions',
    'FRA.SCALE':    '5.NR.3.5 — Fraction Scaling',
    'FRA.DIV_UNIT': '5.NR.3.6 — Divide Unit Fractions',
    'MUL.TRAD':     '5.NR.2.1 — Multiplication Computation',
    'MUL.WORD':     '5.NR.2.1 — Multiplication Word Problems',
    'DIV.TRAD':     '5.NR.2.2 — Division Computation',
    'DIV.WORD':     '5.NR.2.2 — Division Word Problems',
  };

  // Per-standard breakdown
  const stdMap = {};
  qKeys.forEach(k => {
    const q = answers[k];
    if (!q) return;
    const std = q.standard || 'Other';
    if (!stdMap[std]) stdMap[std] = { correct: 0, total: 0 };
    stdMap[std].total++;
    if (q.isCorrect) stdMap[std].correct++;
  });

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .practice-report-print { display: block !important; position: static !important; }
          .no-print { display: none !important; }
        }
        .practice-report-print { font-family: Georgia, serif; }
      `}</style>

      {/* Overlay */}
      <div className="no-print" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
        zIndex: 9000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '1.5rem 1rem', overflowY: 'auto' }}>
        <div style={{ background: T.white, borderRadius: 8, width: '100%', maxWidth: 680,
          boxShadow: '0 16px 48px rgba(0,0,0,.35)', overflow: 'hidden' }}>

          {/* Modal header */}
          <div className="no-print" style={{ background: T.midnight, color: T.white,
            padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>📄 Parent Report — {studentName}</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => window.print()}
                style={{ background: T.teal, border: 'none', color: T.white, borderRadius: 4,
                  padding: '6px 14px', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                🖨️ Print / Save as PDF
              </button>
              <button onClick={onClose}
                style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
                  color: T.white, borderRadius: 4, padding: '6px 12px', fontSize: '0.82rem',
                  cursor: 'pointer', fontFamily: 'inherit' }}>
                ✕ Close
              </button>
            </div>
          </div>

          {/* Report body */}
          <div className="practice-report-print" style={{ padding: '1.75rem 2rem', fontSize: '0.9rem', lineHeight: 1.6 }}>

            {/* Header */}
            <div style={{ borderBottom: '2px solid #1e293b', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.04em' }}>
                MILESTONEREADY · PRACTICE REPORT
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 4 }}>
                <strong>Student:</strong> {studentName}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                <strong>Class:</strong> {className}
                {session.inClass ? ' · 🏫 In-class session' : ' · 🏠 Home practice (ungraded)'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                <strong>Practice:</strong> {title}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                {fmtDateTime(session.submittedAt || session.submitted)}
              </div>
            </div>

            {/* Did-not-participate notice */}
            {didNotParticipate && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6,
                padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.88rem', color: '#92400e' }}>
                <strong>⚑ No participation recorded.</strong> This student did not start the practice session.
                This record was submitted by the teacher.
              </div>
            )}

            {/* Score summary */}
            {!didNotParticipate && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140, background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 6, padding: '0.75rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: b.color }}>{smartScore}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b' }}>SMARTSCORE / 100</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: b.color, marginTop: 2 }}>{b.label}</div>
              </div>
              <div style={{ flex: 2, minWidth: 180, background: '#f8fafc', border: '1px solid #e2e8f0',
                borderRadius: 6, padding: '0.75rem 1rem' }}>
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '0.4rem', fontSize: '0.82rem' }}>
                  {correct} of {totalQs} questions correct
                </div>
                {totalMs > 0 && (
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Total time: {fmtTime(totalMs)} · Avg per question: {fmtTime(totalQs > 0 ? Math.round(totalMs / totalQs) : 0)}
                  </div>
                )}
                {session.inClass && classAvg !== null && classAvgCount > 1 && (
                  <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #e2e8f0',
                    fontSize: '0.82rem', color: '#64748b' }}>
                    <strong>Class average today:</strong> {classAvg}% SmartScore
                    &nbsp;·&nbsp;
                    <strong>{studentName.split(' ')[0]}:</strong> {smartScore}%
                    &nbsp;({smartScore > classAvg ? `+${smartScore - classAvg}` : smartScore - classAvg} vs. class)
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Per-standard breakdown */}
            {Object.keys(stdMap).length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem',
                  marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Standards Practiced
                </div>
                {Object.entries(stdMap).map(([std, d]) => {
                  const p = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0;
                  return (
                    <div key={std} style={{ marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between',
                        fontSize: '0.82rem', marginBottom: 2 }}>
                        <span style={{ color: '#374151' }}>{STD_LABELS[std] || std}</span>
                        <span style={{ color: '#64748b', fontWeight: 600 }}>{d.correct}/{d.total} ({p}%)</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${p}%`,
                          background: p >= 75 ? '#059669' : p >= 60 ? '#d97706' : '#dc2626',
                          borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Question-by-question transcript */}
            {!didNotParticipate && (<>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.82rem',
              marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {studentName.split(' ')[0]}'s Work — {correct} of {totalQs} correct
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontWeight: 700,
                    color: '#64748b', width: 28 }}>#</th>
                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>
                    Problem</th>
                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'left', fontWeight: 700,
                    color: '#64748b', width: 100 }}>Answer</th>
                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center', fontWeight: 700,
                    color: '#64748b', width: 30 }}>✓/✗</th>
                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: 700,
                    color: '#64748b', width: 60 }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {qKeys.map((k, i) => {
                  const q  = answers[k];
                  if (!q) return null;
                  const ok = q.isCorrect;
                  return (
                    <tr key={k} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc',
                      borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.35rem 0.5rem', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '0.35rem 0.5rem', color: '#1e293b' }}>
                        <MathText text={q.question}/>
                        {!ok && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#dc2626' }}>
                            (correct: <MathText text={q.correct}/>)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.35rem 0.5rem', color: ok ? '#059669' : '#dc2626',
                        fontWeight: 600 }}><MathText text={q.chosen || '—'}/></td>
                      <td style={{ padding: '0.35rem 0.5rem', textAlign: 'center',
                        fontWeight: 700, fontSize: '1rem', color: ok ? '#059669' : '#dc2626' }}>
                        {ok ? '✓' : '✗'}
                      </td>
                      <td style={{ padding: '0.35rem 0.5rem', textAlign: 'right', color: '#94a3b8' }}>
                        {fmtTime(q.timeMs)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </>)}

            {/* Footer */}
            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem',
              borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#94a3b8',
              display: 'flex', justifyContent: 'space-between' }}>
              <span>milestoneready.com</span>
              <span>Georgia Milestones Grade 5 Review</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
