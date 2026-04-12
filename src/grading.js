/**
 * Unified question grading utility.
 *
 * @param {object} q     Question object from the question bank.
 * @param {*}      given The student's stored answer (string, JSON string, etc.)
 * @returns {boolean|null}  true = correct, false = wrong,
 *   null = hotspot with no configured snap-points (indeterminate; callers may
 *   fall back to comparing against q.correct directly).
 */
export function gradeAnswer(q, given) {
  if (!given) return false;

  if (q.type === "plotpoint") {
    const ans = Array.isArray(q.answer)
      ? q.answer
      : (() => { try { return JSON.parse(q.answer); } catch { return null; } })();
    return given === JSON.stringify(ans);
  }

  if (q.type === "multiselect") {
    const correct = Array.isArray(q.answer) ? q.answer : [];
    try {
      return JSON.stringify([...JSON.parse(given)].sort()) ===
             JSON.stringify([...correct].sort());
    } catch { return false; }
  }

  if (q.type === "keypad") {
    return String(q.answer ?? "").trim().toLowerCase() ===
           String(given).trim().toLowerCase();
  }

  if (q.type === "dragdrop") {
    try {
      const g = JSON.parse(given);
      const correct = q.correct || q.answer || {};
      return (q.items || []).every(item => {
        const c = correct[item];
        if (c === "distractor") return g[item] === undefined;
        return g[item] === c;
      });
    } catch { return false; }
  }

  if (q.type === "hotspot") {
    try {
      const g = Array.isArray(given) ? given : JSON.parse(given);
      const c = q.answer || {};
      const sps = q.snapPoints || [];
      const correctSps = sps.filter(sp => c[sp.id]);
      if (!correctSps.length) return null; // unconfigured — caller may fall back
      const isDot = q.assetType === "dot" || q.assetType === "pin";
      const TOL = 8;
      if (!Array.isArray(g) || g.length !== correctSps.length) return false;
      const matched = correctSps.filter(sp =>
        g.some(pt => {
          const d = Math.sqrt((sp.x - pt.x) ** 2 + (sp.y - pt.y) ** 2);
          return d <= TOL && (isDot || pt.val === c[sp.id]);
        })
      );
      return matched.length === correctSps.length;
    } catch { return false; }
  }

  // MCQ — compare by choice index (robust against whitespace/encoding differences);
  // fall back to string equality when choices array is absent.
  const correctVal = q.correct ?? q.answer;
  const choices = q.choices || [];
  const ansIdx = choices.indexOf(given);
  const correctIdx = choices.indexOf(correctVal);
  if (ansIdx >= 0 && correctIdx >= 0) return ansIdx === correctIdx;
  return String(given).trim() === String(correctVal ?? "").trim();
}
