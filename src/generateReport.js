import jsPDF from 'jspdf';
import 'jspdf-autotable';

const W = 612, H = 792, MARGIN = 48;

const lvlLabel = p => p >= 80 ? 'Proficient' : p >= 60 ? 'Developing' : 'Beginning';
const lvlRGB   = p => p >= 80 ? [26,110,46]  : p >= 60 ? [122,78,0]   : [139,26,26];

function pageHeader(doc, title, subtitle = '') {
  doc.setFillColor(0, 78, 148);
  doc.rect(0, 0, W, 48, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, MARGIN, 30);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(subtitle, W - MARGIN, 30, { align: 'right' });
  }
}

function pageFooters(doc) {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `MathReady GA — Confidential   ·   Page ${i} of ${total}`,
      W / 2, H - 22,
      { align: 'center' }
    );
  }
}

export async function generateClassReport(sessions, bankQ, filterClass = 'all') {
  const filtered = filterClass && filterClass !== 'all'
    ? sessions.filter(s => s.className === filterClass)
    : sessions;

  if (!filtered.length) {
    alert('No session data to export.');
    return;
  }

  // Fetch saved tests for code→name lookup
  let testNameMap = {};
  try {
    const API = process.env.REACT_APP_API_URL || 'https://mathready-backend-production.up.railway.app';
    const saved = await fetch(`${API}/tests/saved`).then(r=>r.json());
    if (Array.isArray(saved)) saved.forEach(t => { if (t.code) testNameMap[t.code.toUpperCase()] = t.name; });
  } catch {}

  // ── Build per-student map ──────────────────────────────────────────────
  const studentMap = {};
  filtered.forEach(s => {
    const key = s.studentId || s.studentName || s.name || 'Unknown';
    if (!studentMap[key]) {
      studentMap[key] = {
        name: s.studentName || s.name || key,
        className: s.className || '',
        sessions: [],
      };
    }
    studentMap[key].sessions.push(s);
  });
  Object.values(studentMap).forEach(st => {
    st.sessions.sort((a, b) => new Date(a.submitted) - new Date(b.submitted));
  });

  const students = Object.values(studentMap);
  const avgPerStudent = students.map(st => {
    const pts = st.sessions.map(s => s.pct);
    return Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);
  });
  const classAvg = Math.round(avgPerStudent.reduce((a, b) => a + b, 0) / avgPerStudent.length);
  const profC = avgPerStudent.filter(p => p >= 80).length;
  const devC  = avgPerStudent.filter(p => p >= 60 && p < 80).length;
  const begC  = avgPerStudent.filter(p => p < 60).length;

  const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const clsLabel = filterClass !== 'all' ? filterClass : 'All Classes';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  // ════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER / CLASS SUMMARY
  // ════════════════════════════════════════════════════════════════
  doc.setFillColor(0, 78, 148);
  doc.rect(0, 0, W, 72, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MathReady GA — Class Report', MARGIN, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Generated ${now}   ·   ${clsLabel}`, MARGIN, 60);

  // Section label
  doc.setTextColor(0, 56, 101);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CLASS SUMMARY', MARGIN, 104);
  doc.setDrawColor(0, 78, 148);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, 109, W - MARGIN, 109);

  // Stat boxes
  const boxes = [
    { label: 'Students',      value: students.length, bg:[221,234,247], fg:[0,56,101] },
    { label: 'Class Average', value: `${classAvg}%`,  bg: classAvg>=80?[240,250,242]:classAvg>=60?[255,248,225]:[253,242,242], fg: lvlRGB(classAvg) },
    { label: 'Proficient',    value: profC,            bg:[240,250,242], fg:[26,110,46] },
    { label: 'Developing',    value: devC,             bg:[255,248,225], fg:[122,78,0]  },
    { label: 'Beginning',     value: begC,             bg:[253,242,242], fg:[139,26,26] },
  ];
  const boxW = (W - MARGIN * 2 - 16) / 5;
  boxes.forEach((b, i) => {
    const x = MARGIN + i * (boxW + 4);
    doc.setFillColor(...b.bg);
    doc.roundedRect(x, 120, boxW, 64, 4, 4, 'F');
    doc.setTextColor(...b.fg);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(String(b.value), x + boxW / 2, 155, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(b.label.toUpperCase(), x + boxW / 2, 174, { align: 'center' });
  });

  // Proficiency bar
  const barY = 204, barH = 20, barW = W - MARGIN * 2;
  const pW = students.length ? barW * profC / students.length : 0;
  const dW = students.length ? barW * devC  / students.length : 0;
  const bW = students.length ? barW * begC  / students.length : 0;
  doc.setFillColor(26, 110, 46);  doc.rect(MARGIN,          barY, pW, barH, 'F');
  doc.setFillColor(245, 158, 11); doc.rect(MARGIN + pW,     barY, dW, barH, 'F');
  doc.setFillColor(139, 26, 26);  doc.rect(MARGIN + pW + dW, barY, bW, barH, 'F');
  // Pct labels inside bar
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  if (pW > 32) doc.text(`${Math.round(profC/students.length*100)}%`, MARGIN + pW/2,          barY+13, { align:'center' });
  if (dW > 32) doc.text(`${Math.round(devC /students.length*100)}%`, MARGIN + pW + dW/2,     barY+13, { align:'center' });
  if (bW > 32) doc.text(`${Math.round(begC /students.length*100)}%`, MARGIN + pW + dW + bW/2, barY+13, { align:'center' });

  // Legend
  const legend = [['Proficient (≥80%)',[26,110,46]],['Developing (60–79%)',[245,158,11]],['Beginning (<60%)',[139,26,26]]];
  legend.forEach(([lbl, rgb], i) => {
    const lx = MARGIN + i * 170;
    doc.setFillColor(...rgb);
    doc.rect(lx, barY + 28, 10, 8, 'F');
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(lbl, lx + 14, barY + 35);
  });

  // ════════════════════════════════════════════════════════════════
  // PAGE 2 — ALL STUDENT SCORES
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader(doc, 'Student Scores', clsLabel);

  const scoreRows = students
    .map(st => {
      const pts = st.sessions.map(s => s.pct);
      const avg2 = Math.round(pts.reduce((a,b)=>a+b,0)/pts.length);
      const latest = st.sessions[st.sessions.length - 1];
      const latestDate = latest.submitted
        ? new Date(latest.submitted).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
        : '—';
      const latestTime = latest.timeUsed || '—';
      return { name: st.name, cls: st.className||'—', tests: st.sessions.length, avg: avg2, latest: latest.pct, date: latestDate, time: latestTime };
    })
    .sort((a, b) => b.avg - a.avg);

  doc.autoTable({
    startY: 64,
    margin: { left: MARGIN, right: MARGIN },
    head: [['#', 'Student', 'Class / Period', 'Tests', 'Avg', 'Latest', 'Time (Latest)', 'Date (Latest)', 'Level']],
    body: scoreRows.map((r, i) => [
      i + 1, r.name, r.cls, r.tests, `${r.avg}%`, `${r.latest}%`, r.time, r.date, lvlLabel(r.avg),
    ]),
    headStyles: { fillColor: [0, 56, 101], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, cellPadding: 5 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 72 },
      3: { cellWidth: 34, halign: 'center' },
      4: { cellWidth: 36, halign: 'center' },
      5: { cellWidth: 36, halign: 'center' },
      6: { cellWidth: 54, halign: 'center' },
      7: { cellWidth: 70, halign: 'center' },
      8: { cellWidth: 60, halign: 'center' },
    },
    didParseCell: ({ column, section, cell }) => {
      if (section !== 'body') return;
      if (column.index === 8) {
        const v = cell.raw;
        cell.styles.textColor = v === 'Proficient' ? [26,110,46] : v === 'Developing' ? [122,78,0] : [139,26,26];
        cell.styles.fontStyle = 'bold';
      }
      if (column.index === 4) {
        cell.styles.textColor = lvlRGB(parseInt(cell.raw));
        cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ════════════════════════════════════════════════════════════════
  // PAGE 3 — STANDARD BREAKDOWN
  // ════════════════════════════════════════════════════════════════
  doc.addPage();
  pageHeader(doc, 'Standard-by-Standard Breakdown', clsLabel);

  const stdMap = {};
  filtered.forEach(sess => {
    Object.entries(sess.answers || {}).forEach(([qid, ans]) => {
      const q = bankQ.find(x => x.id === qid);
      if (!q) return;
      if (!stdMap[q.standard]) stdMap[q.standard] = { correct: 0, total: 0, students: new Set() };
      stdMap[q.standard].total++;
      stdMap[q.standard].students.add(sess.studentId || sess.studentName || sess.name);
      if (ans === q.correct) stdMap[q.standard].correct++;
    });
  });

  const stdRows = Object.entries(stdMap)
    .map(([std, d]) => {
      const pct = Math.round(d.correct / d.total * 100);
      return { std, students: d.students.size, attempts: d.total, correct: d.correct, pct };
    })
    .sort((a, b) => a.pct - b.pct); // weakest first

  doc.autoTable({
    startY: 64,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Standard', 'Students', 'Attempts', 'Correct', '% Correct', 'Status']],
    body: stdRows.map(r => [r.std, r.students, r.attempts, r.correct, `${r.pct}%`, lvlLabel(r.pct)]),
    headStyles: { fillColor: [0, 56, 101], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, cellPadding: 5 },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 58,  halign: 'center' },
      2: { cellWidth: 58,  halign: 'center' },
      3: { cellWidth: 58,  halign: 'center' },
      4: { cellWidth: 58,  halign: 'center' },
      5: { cellWidth: 80,  halign: 'center' },
    },
    didParseCell: ({ column, section, cell }) => {
      if (section !== 'body') return;
      if (column.index === 5) {
        const v = cell.raw;
        cell.styles.textColor = v === 'Proficient' ? [26,110,46] : v === 'Developing' ? [122,78,0] : [139,26,26];
        cell.styles.fontStyle = 'bold';
      }
      if (column.index === 4) {
        cell.styles.textColor = lvlRGB(parseInt(cell.raw));
        cell.styles.fontStyle = 'bold';
      }
    },
  });

  // ════════════════════════════════════════════════════════════════
  // PAGES 4+ — PER-STUDENT ITEM DETAIL
  // ════════════════════════════════════════════════════════════════
  students.forEach(st => {
    doc.addPage();
    pageHeader(doc, st.name, st.className || '');

    let y = 64;

    const ensureSpace = (needed) => {
      if (y + needed > H - 48) {
        doc.addPage();
        pageHeader(doc, `${st.name} (continued)`, st.className || '');
        y = 64;
      }
    };

    st.sessions.forEach((sess, idx) => {
      const dateStr = sess.submitted
        ? new Date(sess.submitted).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
        : '';
      const testLabel = sess.testCode ? (testNameMap[sess.testCode.toUpperCase()] || sess.testCode) : `Session ${idx+1}`;
      const modeTag   = sess.mode === 'practice' ? ' [PRACTICE]' : '';
      const timeTag   = sess.timeUsed ? `  ·  ${sess.timeUsed}` : '';
      const label = `${testLabel}${modeTag}  —  ${sess.pct}%  (${sess.score}/${sess.total})${timeTag}${dateStr ? `   |   ${dateStr}` : ''}`; 

      ensureSpace(24);

      // Session row header
      doc.setFillColor(240, 244, 248);
      doc.rect(MARGIN, y, W - MARGIN * 2, 18, 'F');
      doc.setTextColor(0, 56, 101);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(label, MARGIN + 8, y + 12);
      y += 22;

      // Question grid
      const entries = Object.entries(sess.answers || {});
      if (!entries.length) {
        y += 8;
        return;
      }

      const CELL = 28, GAP = 4;
      const cols = Math.floor((W - MARGIN * 2 + GAP) / (CELL + GAP));
      const rows = Math.ceil(entries.length / cols);
      const gridH = rows * (CELL + GAP);

      ensureSpace(gridH + 16);

      entries.forEach(([qid, ans], qi) => {
        const q = bankQ.find(x => x.id === qid);
        const ok = q && ans === q.correct;
        const col = qi % cols;
        const row = Math.floor(qi / cols);
        const cx = MARGIN + col * (CELL + GAP);
        const cy = y + row * (CELL + GAP);

        doc.setFillColor(...(ok ? [26,110,46] : [139,26,26]));
        doc.roundedRect(cx, cy, CELL, CELL, 3, 3, 'F');

        // ✓ / ✗  symbol
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(ok ? '\u2713' : '\u2717', cx + CELL / 2, cy + 14, { align: 'center' });

        // Standard label (bottom of cell)
        if (q?.standard) {
          doc.setFontSize(4.5);
          doc.text(q.standard.slice(-7), cx + CELL / 2, cy + 26, { align: 'center' });
        }
      });

      y += gridH + 16;

      // Per-session standard mini-summary
      const sessMastery = {};
      entries.forEach(([qid, ans]) => {
        const q = bankQ.find(x => x.id === qid);
        if (!q) return;
        if (!sessMastery[q.standard]) sessMastery[q.standard] = { correct:0, total:0 };
        sessMastery[q.standard].total++;
        if (ans === q.correct) sessMastery[q.standard].correct++;
      });

      const stdSummary = Object.entries(sessMastery).map(([std, d]) => {
        const pct = Math.round(d.correct / d.total * 100);
        return [std, `${d.correct}/${d.total}`, `${pct}%`, lvlLabel(pct)];
      });

      if (stdSummary.length) {
        ensureSpace(stdSummary.length * 18 + 32);
        doc.autoTable({
          startY: y,
          margin: { left: MARGIN + 8, right: MARGIN + 8 },
          head: [['Standard', 'Score', '%', 'Level']],
          body: stdSummary,
          headStyles: { fillColor: [220, 230, 242], textColor: [0,56,101], fontStyle:'bold', fontSize:7.5, cellPadding:3 },
          bodyStyles: { fontSize:7.5, cellPadding:3 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 150 },
            1: { cellWidth: 48, halign:'center' },
            2: { cellWidth: 48, halign:'center' },
            3: { cellWidth: 80, halign:'center' },
          },
          didParseCell: ({ column, section, cell }) => {
            if (section !== 'body') return;
            if (column.index === 3) {
              const v = cell.raw;
              cell.styles.textColor = v==='Proficient'?[26,110,46]:v==='Developing'?[122,78,0]:[139,26,26];
              cell.styles.fontStyle = 'bold';
            }
          },
          tableLineColor: [200, 210, 220],
          tableLineWidth: 0.3,
        });
        y = doc.lastAutoTable.finalY + 20;
      }
    });
  });

  // ── Footer on every page ──
  pageFooters(doc);

  // ── Save ──
  const dateStr = new Date().toISOString().slice(0, 10);
  const clsSlug = filterClass !== 'all' ? `_${filterClass.replace(/\s+/g, '_')}` : '';
  doc.save(`MathReady_ClassReport${clsSlug}_${dateStr}.pdf`);
}
