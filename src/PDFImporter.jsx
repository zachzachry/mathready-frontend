import { useState, useRef } from "react";

const GRADE_OPTIONS = ["Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8"];

const SYSTEM_PROMPT = `You are an expert Georgia educator who extracts multiple choice math questions from PDFs.

Your job is to read the document and return ONLY a JSON array of question objects. No preamble, no explanation, no markdown fences — just raw JSON.

Each question object must follow this exact structure:
{
  "id": "q001",
  "standard": "MGSE5.NBT.1",
  "short": "Place Value",
  "question": "The full question text here",
  "choices": ["choice A", "choice B", "choice C", "choice D"],
  "correct": "the correct answer text (must match one of the choices exactly)"
}

Rules:
- Number questions sequentially: q001, q002, q003, etc.
- standard: use the closest Georgia GSE code you can infer from the content. If the PDF lists the standard, use it. If not, infer from the math content.
- short: a 2-3 word description of the skill (e.g. "Place Value", "Add Fractions", "Volume")
- choices: always exactly 4 answer choices
- correct: must exactly match one of the 4 choices
- If a question has a diagram or graphic you cannot extract, include the question text and note "(diagram not available)" at the end of the question field
- Skip any questions that are open-ended (non multiple choice)
- If you cannot determine the correct answer, make your best inference and flag it by appending " [REVIEW]" to the correct field

Return ONLY the JSON array. Nothing else.`;

function DropZone({ onFile, file }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") onFile(f);
  }

  return (
    <div
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? "#003865" : file ? "#1a6e2e" : "#c8d3dd"}`,
        borderRadius: "6px",
        padding: "2.5rem",
        textAlign: "center",
        cursor: "pointer",
        background: dragging ? "#f0f4ff" : file ? "#f0faf2" : "#fafbfc",
        transition: "all 0.2s",
      }}
    >
      <input ref={inputRef} type="file" accept="application/pdf" style={{ display: "none" }}
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>{file ? "📄" : "📂"}</div>
      {file ? (
        <>
          <div style={{ fontWeight: 700, color: "#1a6e2e", fontSize: "0.95rem" }}>{file.name}</div>
          <div style={{ color: "#888", fontSize: "0.75rem", marginTop: "4px" }}>
            {(file.size / 1024).toFixed(0)} KB · Click to change
          </div>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 600, color: "#334", fontSize: "0.95rem" }}>Drop a PDF here or click to browse</div>
          <div style={{ color: "#aaa", fontSize: "0.75rem", marginTop: "4px" }}>Supports typed PDFs · Max 10MB</div>
        </>
      )}
    </div>
  );
}

function QuestionCard({ q, index, onEdit, onRemove, onToggleCorrect }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(q);
  const needsReview = q.correct?.includes("[REVIEW]") || q.question?.includes("(diagram not available)");

  function save() { onEdit(index, draft); setEditing(false); }

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${needsReview ? "#ffc107" : "#c8d3dd"}`,
      borderLeft: `4px solid ${needsReview ? "#ffc107" : "#1a6e2e"}`,
      borderRadius: "4px",
      overflow: "hidden",
      marginBottom: "0.75rem",
    }}>
      <div style={{ padding: "0.85rem 1.1rem", display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
        {/* Number */}
        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: needsReview ? "#fff3cd" : "#d4edda", border: `2px solid ${needsReview ? "#ffc107" : "#1a6e2e"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: needsReview ? "#7a4e00" : "#1a6e2e" }}>{index + 1}</span>
        </div>

        <div style={{ flex: 1 }}>
          {needsReview && (
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#7a4e00", background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "3px", padding: "2px 8px", display: "inline-block", marginBottom: "0.4rem" }}>
              ⚠ Needs Review
            </div>
          )}

          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div>
                <label style={lbl}>STANDARD</label>
                <input style={inp} value={draft.standard} onChange={e => setDraft(d => ({ ...d, standard: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>QUESTION</label>
                <textarea style={{ ...inp, height: "80px", resize: "vertical" }} value={draft.question} onChange={e => setDraft(d => ({ ...d, question: e.target.value }))} />
              </div>
              <div>
                <label style={lbl}>ANSWER CHOICES (one per line)</label>
                <textarea style={{ ...inp, height: "90px", fontFamily: "monospace", fontSize: "0.82rem" }}
                  value={draft.choices.join("\n")}
                  onChange={e => setDraft(d => ({ ...d, choices: e.target.value.split("\n") }))} />
              </div>
              <div>
                <label style={lbl}>CORRECT ANSWER</label>
                <input style={inp} value={draft.correct} onChange={e => setDraft(d => ({ ...d, correct: e.target.value }))} />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={save} style={{ ...btn, background: "#003865", color: "#fff", border: "none" }}>Save</button>
                <button onClick={() => { setDraft(q); setEditing(false); }} style={{ ...btn, background: "#f0f4f8", border: "1px solid #c8d3dd" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#003865", background: "#ddeaf7", padding: "2px 7px", borderRadius: "2px", border: "1px solid #b3cde8" }}>{q.standard}</span>
                <span style={{ fontSize: "0.62rem", color: "#888", padding: "2px 7px" }}>{q.short}</span>
              </div>
              <p style={{ fontSize: "0.9rem", fontFamily: "Georgia, serif", color: "#1a1a1a", lineHeight: 1.6, margin: "0 0 0.6rem" }}>{q.question}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                {q.choices.map((c, i) => (
                  <div key={i} style={{ fontSize: "0.8rem", color: c === q.correct?.replace(" [REVIEW]", "") ? "#1a6e2e" : "#555", fontWeight: c === q.correct?.replace(" [REVIEW]", "") ? 700 : 400, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "16px", height: "16px", borderRadius: "50%", border: `1px solid ${c === q.correct?.replace(" [REVIEW]", "") ? "#1a6e2e" : "#c8d3dd"}`, background: c === q.correct?.replace(" [REVIEW]", "") ? "#d4edda" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", flexShrink: 0 }}>
                      {["A","B","C","D"][i]}
                    </span>
                    {c}
                    {c === q.correct?.replace(" [REVIEW]","") && <span style={{ fontSize: "0.65rem", color: "#1a6e2e" }}>✓ correct</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {!editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flexShrink: 0 }}>
            <button onClick={() => setEditing(true)} style={{ ...btn, fontSize: "0.68rem", padding: "4px 8px" }}>✏ Edit</button>
            <button onClick={() => onRemove(index)} style={{ ...btn, fontSize: "0.68rem", padding: "4px 8px", color: "#8b1a1a", borderColor: "#f0b8b8" }}>✕ Remove</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PDFImporter() {
  const [file, setFile]         = useState(null);
  const [grade, setGrade]       = useState("Grade 5");
  const [status, setStatus]     = useState("idle");   // idle | reading | extracting | done | error
  const [questions, setQuestions] = useState([]);
  const [errMsg, setErrMsg]     = useState("");
  const [copied, setCopied]     = useState(false);

  async function handleExtract() {
    if (!file) return;
    setStatus("reading");
    setQuestions([]);
    setErrMsg("");

    try {
      // Read PDF as base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = () => rej(new Error("Could not read file"));
        r.readAsDataURL(file);
      });

      setStatus("extracting");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          messages: [{
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 },
              },
              {
                type: "text",
                text: `Extract all multiple choice math questions from this PDF. This is a ${grade} document. Return only the JSON array.`,
              },
            ],
          }],
        }),
      });

      const data = await response.json();
      const raw = data.content?.map(i => i.text || "").join("");

      // Strip any accidental markdown fences
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      setQuestions(parsed);
      setStatus("done");
    } catch (e) {
      console.error(e);
      setErrMsg(e.message || "Something went wrong. Make sure the PDF contains typed (not scanned) text.");
      setStatus("error");
    }
  }

  function handleEdit(index, updated) {
    setQuestions(qs => qs.map((q, i) => i === index ? updated : q));
  }

  function handleRemove(index) {
    setQuestions(qs => qs.filter((_, i) => i !== index));
  }

  function handleCopyJSON() {
    const clean = questions.map((q, i) => ({
      ...q,
      id: `q${String(i + 1).padStart(3, "0")}`,
      correct: q.correct?.replace(" [REVIEW]", ""),
    }));
    navigator.clipboard.writeText(JSON.stringify(clean, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const reviewCount = questions.filter(q => q.correct?.includes("[REVIEW]") || q.question?.includes("diagram")).length;

  return (
    <div style={{ minHeight: "100vh", background: "#e8edf2", fontFamily: "sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#003865", color: "#fff", padding: "0 1.5rem", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
        <div>
          <div style={{ fontSize: "0.58rem", opacity: 0.65, letterSpacing: "0.14em" }}>GEORGIA MILESTONES READINESS TRAINER</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>PDF Question Importer</div>
        </div>
        {questions.length > 0 && (
          <div style={{ fontSize: "0.78rem", opacity: 0.8 }}>{questions.length} questions extracted</div>
        )}
      </div>

      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "1.75rem 1rem" }}>

        {/* Upload card */}
        <div style={{ background: "#fff", border: "1px solid #c8d3dd", borderRadius: "4px", padding: "1.5rem", marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", color: "#555", marginBottom: "1rem" }}>STEP 1 — UPLOAD YOUR PDF</div>
          <DropZone file={file} onFile={setFile} />

          <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <label style={lbl}>GRADE LEVEL</label>
              <select style={{ ...inp, width: "140px" }} value={grade} onChange={e => setGrade(e.target.value)}>
                {GRADE_OPTIONS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ marginTop: "18px" }}>
              <button
                onClick={handleExtract}
                disabled={!file || status === "extracting" || status === "reading"}
                style={{
                  background: !file ? "#e8edf2" : "#003865",
                  color: !file ? "#aaa" : "#fff",
                  border: "none", borderRadius: "3px",
                  padding: "0.7rem 1.5rem",
                  fontSize: "0.88rem", fontWeight: 700,
                  cursor: !file ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {status === "reading" ? "📖 Reading PDF…"
                  : status === "extracting" ? "🤖 Extracting Questions…"
                  : "Extract Questions →"}
              </button>
            </div>
          </div>

          {/* Progress indicator */}
          {(status === "reading" || status === "extracting") && (
            <div style={{ marginTop: "1rem", background: "#f0f4f8", borderRadius: "3px", padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#555", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
              {status === "reading" ? "Reading your PDF…" : "Claude is extracting questions — this takes 10–20 seconds…"}
            </div>
          )}

          {status === "error" && (
            <div style={{ marginTop: "1rem", background: "#fdf2f2", border: "1px solid #f0b8b8", borderRadius: "3px", padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#8b1a1a" }}>
              ⚠ {errMsg}
            </div>
          )}
        </div>

        {/* Results */}
        {status === "done" && questions.length > 0 && (
          <>
            {/* Summary bar */}
            <div style={{ background: "#fff", border: "1px solid #c8d3dd", borderRadius: "4px", padding: "1rem 1.5rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: "#888" }}>EXTRACTED</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1a6e2e" }}>{questions.length}</div>
                </div>
                {reviewCount > 0 && (
                  <div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: "#888" }}>NEEDS REVIEW</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#7a4e00" }}>{reviewCount}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", color: "#888" }}>READY</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#003865" }}>{questions.length - reviewCount}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.65rem" }}>
                <button onClick={handleCopyJSON} style={{ ...btn, background: copied ? "#d4edda" : "#003865", color: copied ? "#1a6e2e" : "#fff", border: "none", padding: "0.6rem 1.25rem", fontWeight: 700, fontSize: "0.82rem" }}>
                  {copied ? "✓ Copied!" : "📋 Copy JSON"}
                </button>
                <button onClick={() => { setFile(null); setStatus("idle"); setQuestions([]); }}
                  style={{ ...btn, padding: "0.6rem 1.25rem", fontSize: "0.82rem" }}>
                  Start Over
                </button>
              </div>
            </div>

            {reviewCount > 0 && (
              <div style={{ background: "#fff8e1", border: "1px solid #ffd166", borderRadius: "3px", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#7a4e00" }}>
                ⚠ <strong>{reviewCount} question{reviewCount > 1 ? "s" : ""}</strong> need your attention — either the correct answer was unclear or the question contained a diagram. Review and edit them before adding to your bank.
              </div>
            )}

            <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", color: "#555", marginBottom: "0.75rem" }}>
              STEP 2 — REVIEW & EDIT
            </div>

            {questions.map((q, i) => (
              <QuestionCard key={i} q={q} index={i} onEdit={handleEdit} onRemove={handleRemove} />
            ))}

            <div style={{ background: "#f0f4f8", border: "1px solid #dde3e9", borderRadius: "3px", padding: "1rem 1.25rem", fontSize: "0.82rem", color: "#555", marginTop: "0.5rem" }}>
              <strong>Step 3 — Add to your question bank:</strong> Click <strong>Copy JSON</strong> above, then paste into your <code>questions.json</code> file alongside your existing questions. Make sure to renumber the IDs so they don't conflict.
            </div>
          </>
        )}

        {status === "done" && questions.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid #c8d3dd", borderRadius: "4px", padding: "2rem", textAlign: "center", color: "#888" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤔</div>
            <div style={{ fontWeight: 600, color: "#555" }}>No multiple choice questions found</div>
            <div style={{ fontSize: "0.82rem", marginTop: "4px" }}>This PDF may be scanned, image-based, or contain only open-ended questions.</div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const lbl = { display: "block", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", color: "#555", marginBottom: "5px" };
const inp = { width: "100%", padding: "0.6rem 0.85rem", border: "1px solid #c8d3dd", borderRadius: "3px", fontSize: "0.9rem", color: "#1a1a1a", background: "#fafbfc", boxSizing: "border-box" };
const btn = { background: "#f0f4f8", border: "1px solid #c8d3dd", borderRadius: "3px", padding: "5px 10px", cursor: "pointer", fontSize: "0.75rem", color: "#333", fontWeight: 600 };
