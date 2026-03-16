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
export const lvlC    = p  => p>=80?"#1a6e2e":p>=60?"#7a4e00":"#8b1a1a";
export const lvlBg   = p  => p>=80?"#d4edda":p>=60?"#fff3cd":"#fdf2f2";
export const lvlBd   = p  => p>=80?"#b3dfc0":p>=60?"#ffc107":"#f0b8b8";
export const now     = () => new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

// ── Shared style tokens ────────────────────────────────────
export const S = {
  page:      {minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",alignItems:"center",fontFamily:"sans-serif"},
  card:      {background:"#fff",border:"1px solid #c8d3dd",borderRadius:"4px",width:"100%",maxWidth:"500px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,.09)"},
  hdr:       {background:"#003865",color:"#fff",padding:"1.1rem 2rem"},
  hdrSub:    {fontSize:"0.58rem",letterSpacing:"0.18em",opacity:.65,marginBottom:"3px"},
  hdrTitle:  {fontSize:"1.15rem",fontWeight:700,fontFamily:"Georgia,serif"},
  lbl:       {display:"block",fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.12em",color:"#555",marginBottom:"5px"},
  inp:       {width:"100%",padding:"0.65rem 0.85rem",border:"1px solid #c8d3dd",borderRadius:"3px",fontSize:"0.95rem",color:"#1a1a1a",background:"#fafbfc",boxSizing:"border-box"},
  errBox:    {background:"#fdf2f2",border:"1px solid #f0b8b8",borderRadius:"3px",padding:"0.6rem 0.9rem",fontSize:"0.82rem",color:"#8b1a1a"},
  confirmBox:{background:"#f8fafc",border:"1px solid #dde3e9",borderRadius:"3px",marginBottom:"1.25rem",overflow:"hidden"},
  confirmRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.65rem 1rem"},
  confirmK:  {fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:"#888"},
  confirmV:  {fontSize:"0.88rem",color:"#1a1a1a",fontWeight:600},
  btnPri:    {background:"#003865",border:"none",borderRadius:"3px",padding:"0.75rem",fontSize:"0.9rem",cursor:"pointer",color:"#fff",fontWeight:700},
  btnSec:    {background:"#f0f4f8",border:"1px solid #c8d3dd",borderRadius:"3px",padding:"0.7rem",fontSize:"0.88rem",cursor:"pointer",fontWeight:600,color:"#333"},
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
