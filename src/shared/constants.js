// ── App constants ──────────────────────────────────────────
export const API          = process.env.REACT_APP_API_URL || "https://mathready-backend-production.up.railway.app";
export const TOTAL        = 10;
export const START_SECS   = 30 * 60;
export const LETTERS      = ["A", "B", "C", "D"];

// ── Question bank ──────────────────────────────────────────
export const QUESTIONS = [
  { id:"q001", standard:"5.NR.1.1", short:"Place Value",
    question:"In the number 3,492, the digit 4 is in the hundreds place. What is the value of the digit 4?",
    choices:["4","40","400","4,000"], correct:"400" },

  { id:"q002", standard:"5.NR.1.2", short:"Powers of 10",
    question:"What is $4.7 \\times 10^{2}$?",
    choices:["0.047","47","470","4,700"], correct:"470" },

  { id:"q003", standard:"5.NR.2.2", short:"Division",
    question:"A school bought 144 pencils to share equally among 12 classrooms. How many pencils does each classroom get?",
    choices:["10","11","12","13"], correct:"12" },

  { id:"q004", standard:"5.NR.3.3", short:"Add Fractions",
    question:"What is $\\frac{1}{4} + \\frac{1}{2}$?",
    choices:["$\\frac{2}{6}$","$\\frac{1}{3}$","$\\frac{3}{4}$","$\\frac{2}{4}$"], correct:"$\\frac{3}{4}$" },

  { id:"q005", standard:"5.NR.3.4", short:"Multiply Fractions",
    question:"A recipe calls for $\\frac{2}{3}$ cup of sugar. If you make 3 batches, how much sugar do you need in all?",
    choices:["$\\frac{2}{9}$ cup","1 cup","2 cups","6 cups"], correct:"2 cups" },

  { id:"q006", standard:"5.NR.3.6", short:"Divide Fractions",
    question:"You have 4 yards of ribbon. You cut it into pieces that are each $\\frac{1}{2}$ yard long. How many pieces do you get?",
    choices:["2","4","6","8"], correct:"8" },

  { id:"q007", standard:"5.NR.5.1", short:"Order of Ops",
    question:"What is the value of (3 + 5) × 2 − 4?",
    choices:["6","12","14","20"], correct:"12" },

  { id:"q008", standard:"5.MDR.7.4", short:"Unit Conversion",
    question:"A table is 2 meters long. How many centimeters long is the table?",
    choices:["2","20","200","2,000"], correct:"200" },

  { id:"q009", standard:"5.GSR.8.3", short:"Volume",
    question:"A rectangular box is 4 cm long, 3 cm wide, and 2 cm tall. What is its volume?",
    choices:["9 cm³","14 cm³","18 cm³","24 cm³"], correct:"24 cm³" },

  { id:"q010", standard:"5.GSR.8.1", short:"Geometry",
    question:"Which shape ALWAYS has 4 right angles and 4 equal sides?",
    choices:["Rectangle","Rhombus","Square","Trapezoid"], correct:"Square" },
];

// ── Helpers ────────────────────────────────────────────────
export const pad     = n  => String(n).padStart(2,"0");
export const fmtTime = s  => `${pad(Math.floor(s/60))}:${pad(s%60)}`;
export const pct     = (s,t) => Math.round((s/t)*100);
export const lvl     = p  => p>=80?"Proficient":p>=60?"Developing":"Beginning";
export const lvlC    = p  => p>=80?"#10b981":p>=60?"#f59e0b":"#ef4444";
export const lvlBg   = p  => p>=80?"#d1fae5":p>=60?"#fef3c7":"#fee2e2";
export const lvlBd   = p  => p>=80?"#6ee7b7":p>=60?"#fcd34d":"#fca5a5";
export const now     = () => {
  const d = new Date();
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  const hh = d.getHours(), mm = String(d.getMinutes()).padStart(2,'0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12  = String(hh % 12 || 12).padStart(2,'0');
  return `${mo} ${d.getDate()}, ${d.getFullYear()} ${h12}:${mm} ${ampm}`;
};

// ── Bold Modern Design Tokens ────────────────────────────
export const T = {
  // Colors
  midnight:    "#0f172a",
  slate:       "#1e293b",
  teal:        "#0d9488",
  tealDark:    "#0f766e",
  tealLight:   "#ccfbf1",
  tealMuted:   "#99f6e4",
  white:       "#faf9f7",
  surface:     "#f5f3ef",
  surfaceAlt:  "#f1f5f9",
  border:      "#e2e8f0",
  borderDark:  "#cbd5e1",
  text:        "#0f172a",
  textSecondary: "#64748b",
  textMuted:   "#94a3b8",
  success:     "#10b981",
  successBg:   "#d1fae5",
  successBd:   "#6ee7b7",
  warning:     "#f59e0b",
  warningBg:   "#fef3c7",
  warningBd:   "#fcd34d",
  danger:      "#ef4444",
  dangerBg:    "#fee2e2",
  dangerBd:    "#fca5a5",
  dangerText:  "#dc2626",
  // Shadows
  sm:          "0 1px 2px rgba(0,0,0,.05)",
  md:          "0 4px 12px rgba(0,0,0,.08)",
  lg:          "0 8px 30px rgba(0,0,0,.12)",
  // Radii
  xs:          "4px",
  r:           "8px",
  rl:          "12px",
  full:        "9999px",
  // Font
  font:        "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

// ── Shared style tokens (Bold Modern) ────────────────────
export const S = {
  page:      {minHeight:"100vh",background:T.surface,display:"flex",flexDirection:"column",alignItems:"center",fontFamily:T.font},
  card:      {background:T.white,border:`1px solid ${T.border}`,borderRadius:T.r,width:"100%",maxWidth:"500px",overflow:"hidden",boxShadow:T.md},
  hdr:       {background:T.midnight,color:T.white,padding:"1.1rem 2rem"},
  hdrSub:    {fontSize:"0.62rem",letterSpacing:"0.18em",opacity:.55,marginBottom:"3px",fontWeight:600},
  hdrTitle:  {fontSize:"1.15rem",fontWeight:700},
  lbl:       {display:"block",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"5px",textTransform:"uppercase"},
  inp:       {width:"100%",padding:"0.65rem 0.85rem",border:`1px solid ${T.border}`,borderRadius:T.xs,fontSize:"0.95rem",color:T.text,background:T.white,boxSizing:"border-box",transition:"border-color .15s",outline:"none"},
  errBox:    {background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,padding:"0.6rem 0.9rem",fontSize:"0.82rem",color:T.dangerText,fontWeight:600},
  confirmBox:{background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.xs,marginBottom:"1.25rem",overflow:"hidden"},
  confirmRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.65rem 1rem"},
  confirmK:  {fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:T.textMuted},
  confirmV:  {fontSize:"0.88rem",color:T.text,fontWeight:600},
  btnPri:    {background:T.teal,border:"none",borderRadius:T.xs,padding:"0.75rem 1.25rem",fontSize:"0.9rem",cursor:"pointer",color:T.white,fontWeight:700,transition:"background .15s, transform .1s"},
  btnSec:    {background:T.surface,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.7rem 1.25rem",fontSize:"0.88rem",cursor:"pointer",fontWeight:600,color:T.text,transition:"background .15s"},
  btnDanger: {background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,padding:"0.65rem 1rem",fontSize:"0.82rem",cursor:"pointer",fontWeight:600,color:T.dangerText,transition:"background .15s"},
};

// ── API helpers ────────────────────────────────────────────
export async function loadSessions() {
  try { const r = await fetch(`${API}/sessions`); return await r.json(); }
  catch { return []; }
}
export async function saveSession(session) {
  try {
    await fetch(`${API}/submit`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(session),
    });
  } catch(e) { console.error("Submit error:",e); }
}
export async function clearSessions() {
  try { await fetch(`${API}/sessions`,{method:"DELETE"}); } catch {}
}
export async function sendHeartbeat(name, current) {
  try {
    await fetch(`${API}/heartbeat`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({name,current}),
    });
  } catch {}
}
