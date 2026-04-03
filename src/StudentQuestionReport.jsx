/**
 * StudentQuestionReport — per-question detail for a single test session.
 * Shows question text, student answer, correct answer, time spent, standard/DOK.
 * Printable for parent/guardian distribution.
 *
 * Props
 *   session      {object}   the test session ({ answers, questionTimes, studentName, testCode, pct, ... })
 *   bankQ        {array}    full question bank — used to look up question text/choices/correct
 *   teacherName  {string}
 *   onClose      {function}
 */
import React, { useRef } from "react";
import { T } from "./shared/constants";
import MathText from "./shared/MathText";

const LETTERS = ["a", "b", "c", "d", "e", "f"];

/* ── helpers ─────────────────────────────────────────────────── */
function gradeAnswer(q, ans) {
  if (!q || ans === undefined || ans === null) return false;
  if (q.type === "multiselect") {
    try { return JSON.stringify([...JSON.parse(ans)].sort()) === JSON.stringify([...(Array.isArray(q.answer)?q.answer:[])].sort()); }
    catch { return false; }
  }
  if (q.type === "keypad") return String(q.answer??"").trim().toLowerCase() === String(ans).trim().toLowerCase();
  if (q.type === "plotpoint") { try { return ans === JSON.stringify(Array.isArray(q.answer)?q.answer:JSON.parse(q.answer)); } catch { return false; } }
  if (q.type === "dragdrop") {
    try {
      const g = JSON.parse(ans);
      const cm = q.correct || q.answer || {};
      return (q.items||[]).every(item => {
        const c = cm[item];
        if (c === "distractor") return g[item] === undefined;
        return g[item] === c;
      });
    } catch { return false; }
  }
  return ans === q.correct;
}

function formatStudentAnswer(q, ans) {
  if (ans === undefined || ans === null) return { text: "—", label: null };
  if (!q) {
    // Try to detect JSON blob and show nicely
    try { const p = JSON.parse(ans); if (Array.isArray(p) && p.length && typeof p[0] === "object") return { text: "Response recorded", label: null }; } catch {}
    return { text: String(ans), label: null };
  }

  if (q.type === "multiselect") {
    try {
      const arr = JSON.parse(ans);
      const labels = arr.map(v => {
        const idx = (q.choices||[]).indexOf(v);
        return idx >= 0 ? `(${LETTERS[idx]}) ${v}` : v;
      });
      return { text: labels.join("; ") || "—", label: null };
    } catch { return { text: String(ans), label: null }; }
  }
  if (q.type === "keypad") return { text: String(ans), label: null };
  if (q.type === "plotpoint") {
    try {
      const parsed = JSON.parse(ans);
      if (Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === "number") {
        return { text: `(${parsed[0]}, ${parsed[1]})`, label: null };
      }
      return { text: "Point plotted", label: null };
    } catch { return { text: "Point plotted", label: null }; }
  }
  if (q.type === "hotspot") {
    try {
      const pts = JSON.parse(ans);
      if (Array.isArray(pts) && pts.length) return { text: `${pts.length} point${pts.length!==1?"s":""} placed`, label: null };
    } catch {}
    return { text: "Response recorded", label: null };
  }
  if (q.type === "dragdrop") return { text: "Items arranged", label: null };

  // MCQ — find index in choices
  const idx = (q.choices||[]).indexOf(ans);
  if (idx >= 0) return { text: ans, label: LETTERS[idx] };
  return { text: String(ans), label: null };
}

function formatCorrectAnswer(q) {
  if (!q) return "—";
  if (q.type === "multiselect") {
    const arr = Array.isArray(q.answer) ? q.answer : [];
    return arr.map(v => {
      const idx = (q.choices||[]).indexOf(v);
      return idx >= 0 ? `(${LETTERS[idx]}) ${v}` : v;
    }).join("; ") || "—";
  }
  if (q.type === "keypad") return String(q.answer ?? "—");
  if (q.type === "plotpoint") {
    try {
      const a = Array.isArray(q.answer) ? q.answer : JSON.parse(q.answer);
      if (Array.isArray(a) && a.length === 2 && typeof a[0] === "number") return `(${a[0]}, ${a[1]})`;
    } catch {}
    return "Correct position on grid";
  }
  if (q.type === "hotspot") return "Correct placement on image";
  if (q.type === "dragdrop") return "See key";
  // MCQ
  const idx = (q.choices||[]).indexOf(q.correct);
  if (idx >= 0) return `(${LETTERS[idx]}) ${q.correct}`;
  return q.correct ?? "—";
}

/* ── print helper ──────────────────────────────────────────────── */
function printReport(ref, studentName, testCode, pct) {
  if (!ref.current) return;
  const clone = ref.current.cloneNode(true);
  clone.querySelectorAll(".no-print").forEach(el => el.remove());
  clone.style.cssText = "overflow:visible;max-height:none;";

  const win = window.open("", "_blank");
  if (!win) { alert("Please allow popups to print."); return; }
  win.document.write(`<!DOCTYPE html>
<html><head><title>MathReady — Question Report: ${studentName}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:#fff; font-size:12px; }
  .q-row { page-break-inside:avoid; border-bottom:1px solid #e2e8f0; padding:10px 14px; display:flex; gap:12px; align-items:flex-start; }
  .q-num { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; flex-shrink:0; margin-top:2px; }
  .q-correct { background:#d1fae5; color:#065f46; border:1.5px solid #6ee7b7; }
  .q-wrong   { background:#fee2e2; color:#991b1b; border:1.5px solid #fca5a5; }
  .q-skip    { background:#f1f5f9; color:#64748b; border:1.5px solid #cbd5e1; }
  .meta { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:4px; }
  .badge { font-size:9px; font-weight:700; padding:1px 5px; border-radius:3px; }
  .badge-std { background:#e0f2fe; color:#0369a1; }
  .badge-dok { background:#fef9c3; color:#713f12; }
  .badge-time { background:#f3f0ff; color:#5b21b6; }
  .q-text { font-family:Georgia,serif; font-size:12px; line-height:1.5; color:#1e293b; margin-bottom:6px; }
  .ans-row { display:flex; gap:16px; flex-wrap:wrap; margin-top:4px; }
  .ans-lbl { font-size:10px; font-weight:700; letter-spacing:0.06em; color:#64748b; }
  .ans-val { font-size:11px; font-weight:600; }
  .ans-correct { color:#065f46; }
  .ans-wrong { color:#991b1b; }
  .ans-skip { color:#94a3b8; }
  .header { padding:14px 16px; border-bottom:2px solid #1e3a5f; margin-bottom:0; }
  .header h1 { font-size:16px; font-weight:800; color:#1e3a5f; }
  .header .sub { font-size:11px; color:#64748b; margin-top:2px; }
</style>
</head><body>
<div class="header">
  <h1>Question-by-Question Report</h1>
  <div class="sub">${studentName} · Test ${testCode} · Score: ${pct}%</div>
</div>
${clone.innerHTML}
</body></html>`);
  win.document.close();
  setTimeout(() => { win.print(); }, 400);
}

/* ── component ─────────────────────────────────────────────────── */
export default function StudentQuestionReport({ session, bankQ, teacherName, onClose }) {
  const bodyRef = useRef(null);
  const studentName = session.studentName || session.name || "Student";
  const testCode = session.testCode || session.code || "";
  const pct = session.pct ?? 0;
  const submitted = session.submitted ? new Date(session.submitted).toLocaleDateString() : "";

  // Build ordered question list from questionTimes (preserves test order)
  const qtMap = {};
  (session.questionTimes || []).forEach(qt => { qtMap[qt.qId] = qt; });

  // Use questionTimes order if available, else fall back to answers keys
  const qIds = session.questionTimes?.length
    ? session.questionTimes.map(qt => qt.qId)
    : Object.keys(session.answers || {});

  const rows = qIds.map((qId, idx) => {
    const q = bankQ.find(x => x.id === qId);
    const ans = (session.answers || {})[qId];
    const qt = qtMap[qId];
    const isAnswered = ans !== undefined && ans !== null;
    // Prefer qt.correct (computed at submission time) over local regrade
    const isCorrect = isAnswered
      ? (qt?.correct !== undefined ? Boolean(qt.correct) : gradeAnswer(q, ans))
      : false;
    const studentAns = formatStudentAnswer(q, ans);
    const correctAns = q ? formatCorrectAnswer(q) : "—";
    const timeSecs = qt?.timeSecs ?? null;

    return { idx, qId, q, ans, isAnswered, isCorrect, studentAns, correctAns, timeSecs, qt };
  });

  // Use stored session.score/session.total as authoritative; fall back to local count
  const storedScore = session.score ?? null;
  const storedTotal = session.total ?? rows.length;
  const correctCount = storedScore !== null ? storedScore : rows.filter(r => r.isCorrect).length;
  const skippedCount = rows.filter(r => !r.isAnswered).length;
  const wrongCount = storedScore !== null
    ? storedTotal - storedScore - skippedCount
    : rows.length - correctCount - skippedCount;

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
      onClick={onClose}
    >
      <div
        style={{ background:T.white, borderRadius:"8px", width:"100%", maxWidth:"760px", maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 16px 48px rgba(0,0,0,.35)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background:T.midnight, color:T.white, padding:"1rem 1.5rem", borderRadius:"8px 8px 0 0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:"1.05rem", fontWeight:800 }}>📄 Question Report</div>
            <div style={{ fontSize:"0.72rem", opacity:0.8, marginTop:"2px" }}>
              {studentName} · {testCode && `Test ${testCode} · `}Score: {pct}%{submitted && ` · ${submitted}`}
            </div>
          </div>
          <div style={{ display:"flex", gap:"0.5rem", alignItems:"center" }} className="no-print">
            <button
              onClick={() => printReport(bodyRef, studentName, testCode, pct)}
              style={{ background:"rgba(255,255,255,.15)", border:"1px solid rgba(255,255,255,.3)", color:T.white, borderRadius:T.xs, padding:"5px 12px", fontSize:"0.72rem", fontWeight:600, cursor:"pointer" }}
            >
              🖨 Print
            </button>
            <button
              onClick={onClose}
              style={{ background:"rgba(255,255,255,.15)", border:"none", color:T.white, fontSize:"1.2rem", width:"32px", height:"32px", borderRadius:"50%", cursor:"pointer", fontWeight:700 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Summary bar */}
        <div style={{ background:T.surfaceAlt, borderBottom:`1px solid ${T.border}`, padding:"0.6rem 1.5rem", display:"flex", gap:"1.5rem", flexShrink:0 }}>
          {[
            ["Correct",  correctCount,    T.success],
            ["Wrong",    wrongCount,      T.dangerText],
            ["Skipped",  skippedCount,    T.textSecondary],
            ["Total",    storedTotal,     T.midnight],
          ].map(([lbl, val, c]) => (
            <div key={lbl} style={{ textAlign:"center" }}>
              <div style={{ fontSize:"1.1rem", fontWeight:700, color:c }}>{val}</div>
              <div style={{ fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.1em", color:T.textSecondary }}>{lbl.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div ref={bodyRef} style={{ flex:1, minHeight:0, overflowY:"auto" }}>
          {rows.map(({ idx, q, ans, isAnswered, isCorrect, studentAns, correctAns, timeSecs, qt }) => {
            const dotColor = !isAnswered ? T.textSecondary : isCorrect ? T.success : T.dangerText;
            const dotBg    = !isAnswered ? T.surfaceAlt   : isCorrect ? "#d1fae5" : "#fee2e2";
            const dotBd    = !isAnswered ? T.border       : isCorrect ? "#6ee7b7" : "#fca5a5";

            return (
              <div key={idx} style={{ borderBottom:`1px solid ${T.surfaceAlt}`, padding:"0.85rem 1.25rem", display:"flex", gap:"0.85rem", alignItems:"flex-start" }}>
                {/* Number badge */}
                <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:dotBg, border:`2px solid ${dotBd}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"2px" }}>
                  <span style={{ fontSize:"0.65rem", fontWeight:700, color:dotColor }}>{idx + 1}</span>
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  {/* Meta badges */}
                  <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap", marginBottom:"0.35rem", alignItems:"center" }}>
                    {qt?.standard && (
                      <span style={{ fontSize:"0.58rem", fontWeight:700, background:"#e0f2fe", color:"#0369a1", padding:"1px 5px", borderRadius:"3px" }}>
                        {qt.standard}
                      </span>
                    )}
                    {qt?.dok && (
                      <span style={{ fontSize:"0.58rem", fontWeight:700, background:"#fef9c3", color:"#713f12", padding:"1px 5px", borderRadius:"3px" }}>
                        DOK {qt.dok}
                      </span>
                    )}
                    {timeSecs !== null && (
                      <span style={{ fontSize:"0.58rem", fontWeight:700, background:"#f3f0ff", color:"#5b21b6", padding:"1px 5px", borderRadius:"3px" }}>
                        ⏱ {timeSecs}s
                      </span>
                    )}
                    {!isAnswered && (
                      <span style={{ fontSize:"0.58rem", fontWeight:700, background:T.surfaceAlt, color:T.textSecondary, padding:"1px 5px", borderRadius:"3px" }}>
                        SKIPPED
                      </span>
                    )}
                  </div>

                  {/* Question text */}
                  {q ? (
                    <div style={{ fontSize:"0.85rem", fontFamily:"Georgia,serif", lineHeight:1.55, color:T.text, marginBottom:"0.5rem" }}>
                      <MathText text={q.question} />
                    </div>
                  ) : (
                    <div style={{ fontSize:"0.78rem", color:T.textMuted, fontStyle:"italic", marginBottom:"0.5rem" }}>
                      Question ID: {qt?.qId || "unknown"}
                    </div>
                  )}

                  {/* Question image */}
                  {q?.image && (
                    <img src={q.image} alt="question diagram" style={{ maxWidth:"280px", maxHeight:"140px", borderRadius:T.xs, border:`1px solid ${T.border}`, display:"block", marginBottom:"0.5rem" }} />
                  )}

                  {/* Answer comparison */}
                  <div style={{ display:"flex", gap:"1.5rem", flexWrap:"wrap" }}>
                    <div>
                      <div style={{ fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.1em", color:T.textSecondary, marginBottom:"2px" }}>STUDENT ANSWERED</div>
                      <div style={{ fontSize:"0.82rem", fontWeight:600, color: !isAnswered ? T.textMuted : isCorrect ? T.success : T.dangerText }}>
                        {isAnswered ? (
                          <>
                            {studentAns.label && (
                              <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"18px", height:"18px", borderRadius:"50%", border:`1.5px solid ${isCorrect?T.success:T.dangerText}`, background:isCorrect?"#d1fae5":"#fee2e2", fontSize:"0.65rem", fontWeight:700, marginRight:"5px", verticalAlign:"middle" }}>
                                {studentAns.label}
                              </span>
                            )}
                            {studentAns.text}
                          </>
                        ) : "—"}
                      </div>
                    </div>
                    {!isCorrect && q && (
                      <div>
                        <div style={{ fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.1em", color:T.textSecondary, marginBottom:"2px" }}>CORRECT ANSWER</div>
                        <div style={{ fontSize:"0.82rem", fontWeight:600, color:T.success }}>
                          {(() => {
                            const idx2 = (q.choices||[]).indexOf(q.correct);
                            return (
                              <>
                                {idx2 >= 0 && (
                                  <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:"18px", height:"18px", borderRadius:"50%", border:`1.5px solid ${T.success}`, background:"#d1fae5", fontSize:"0.65rem", fontWeight:700, marginRight:"5px", verticalAlign:"middle" }}>
                                    {LETTERS[idx2]}
                                  </span>
                                )}
                                {correctAns}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* MCQ choices (shown when wrong, so context is visible) */}
                  {q && q.type === "mcq" && !isCorrect && q.choices?.length > 0 && (
                    <div style={{ marginTop:"0.5rem", display:"flex", flexWrap:"wrap", gap:"0.3rem" }}>
                      {q.choices.map((ch, ci) => {
                        const isStudentChoice = ch === ans;
                        const isCorrectChoice = ch === q.correct;
                        const bg = isCorrectChoice ? "#d1fae5" : isStudentChoice ? "#fee2e2" : T.surfaceAlt;
                        const bd = isCorrectChoice ? "#6ee7b7" : isStudentChoice ? "#fca5a5" : T.border;
                        const col = isCorrectChoice ? T.success : isStudentChoice ? T.dangerText : T.textSecondary;
                        return (
                          <div key={ci} style={{ display:"flex", alignItems:"center", gap:"4px", background:bg, border:`1px solid ${bd}`, borderRadius:T.xs, padding:"2px 8px" }}>
                            <span style={{ fontSize:"0.6rem", fontWeight:700, color:col }}>({LETTERS[ci]})</span>
                            <span style={{ fontSize:"0.72rem", color:col }}>{ch}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div style={{ padding:"3rem", textAlign:"center", color:T.textMuted }}>
              No question data available for this session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
