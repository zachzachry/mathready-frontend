// Avatar.jsx — Peanuts-style cartoon avatar + shop system
// Students earn US currency ($) during drills; spend it here.
// Decimal display is intentional — subliminal place-value reinforcement.

import { useState, useEffect, useRef } from "react";
import { API } from "./shared/constants";

// ── Palette ───────────────────────────────────────────────
const SKIN_TONES = [
  { id:"s1", hex:"#FDDCB5", shadow:"#E8B885" },
  { id:"s2", hex:"#F0C27F", shadow:"#D4A055" },
  { id:"s3", hex:"#C68642", shadow:"#A0631E" },
  { id:"s4", hex:"#8D5524", shadow:"#6A3A10" },
  { id:"s5", hex:"#4A2912", shadow:"#301508" },
];

const HAIR_COLORS = [
  { id:"hc1", hex:"#1a1a1a" },
  { id:"hc2", hex:"#5C3A1E" },
  { id:"hc3", hex:"#D4A017" },
  { id:"hc4", hex:"#8B3A1E" },
  { id:"hc5", hex:"#999999" },
];

const SHIRT_FILL = {
  shirt_white:  "#F0F0F0",
  shirt_red:    "#CC3333",
  shirt_blue:   "#2255CC",
  shirt_green:  "#2E8B57",
  shirt_purple: "#7B2D8B",
  shirt_yellow: "#E8B800",
};

const PANTS_FILL = {
  pants_blue:  "#2244AA",
  pants_black: "#282828",
  pants_khaki: "#C8A96E",
  pants_red:   "#CC2233",
  pants_gray:  "#667788",
};

// ── Gracie color themes (CSS filters applied to Rive canvas) ──────────────
export const GRACIE_THEMES = {
  gracie_default: { name:"Default",  filter:"none",                                                               preview:"#C68642" },
  gracie_ocean:   { name:"Ocean",    filter:"hue-rotate(200deg) saturate(1.4) brightness(1.05)",                  preview:"#2288CC" },
  gracie_sunset:  { name:"Sunset",   filter:"hue-rotate(22deg) saturate(1.5) brightness(1.05)",                   preview:"#E8612A" },
  gracie_forest:  { name:"Forest",   filter:"hue-rotate(115deg) saturate(1.3)",                                   preview:"#3E8B3E" },
  gracie_rose:    { name:"Rose",     filter:"hue-rotate(308deg) saturate(1.35) brightness(1.05)",                 preview:"#CC4488" },
  gracie_purple:  { name:"Purple",   filter:"hue-rotate(262deg) saturate(1.25)",                                  preview:"#7733CC" },
  gracie_gold:    { name:"Gold",     filter:"sepia(0.55) saturate(2.8) hue-rotate(14deg) brightness(1.15)",       preview:"#D4A017" },
  gracie_night:   { name:"Night",    filter:"hue-rotate(230deg) saturate(0.7) brightness(0.75)",                  preview:"#334466" },
};

// ── Shop catalog ─────────────────────────────────────────
export const SHOP_ITEMS = [
  { id:"hair_basic",    cat:"hair",  name:"Simple",    price:0.00 },
  { id:"hair_curly",    cat:"hair",  name:"Curly",     price:0.25 },
  { id:"hair_spiky",    cat:"hair",  name:"Spiky",     price:0.35 },
  { id:"hair_bun",      cat:"hair",  name:"Top Bun",   price:0.50 },
  { id:"hair_long",     cat:"hair",  name:"Long",      price:0.45 },
  { id:"hair_pigtails", cat:"hair",  name:"Pigtails",  price:0.60 },
  { id:"shirt_white",   cat:"shirt", name:"White",     price:0.00 },
  { id:"shirt_red",     cat:"shirt", name:"Red",       price:0.20 },
  { id:"shirt_blue",    cat:"shirt", name:"Blue",      price:0.20 },
  { id:"shirt_green",   cat:"shirt", name:"Green",     price:0.20 },
  { id:"shirt_purple",  cat:"shirt", name:"Purple",    price:0.30 },
  { id:"shirt_yellow",  cat:"shirt", name:"Yellow",    price:0.25 },
  { id:"pants_blue",    cat:"pants", name:"Jeans",     price:0.00 },
  { id:"pants_black",   cat:"pants", name:"Black",     price:0.25 },
  { id:"pants_khaki",   cat:"pants", name:"Khaki",     price:0.25 },
  { id:"pants_red",     cat:"pants", name:"Red",       price:0.35 },
  { id:"pants_gray",    cat:"pants", name:"Gray",      price:0.20 },
  { id:"acc_none",      cat:"acc",   name:"None",      price:0.00 },
  { id:"acc_glasses",   cat:"acc",   name:"Glasses",   price:0.40 },
  { id:"acc_crown",     cat:"acc",   name:"Crown",     price:1.00 },
  { id:"acc_bow",       cat:"acc",   name:"Bow Tie",   price:0.55 },
  { id:"acc_hat",       cat:"acc",   name:"Party Hat", price:0.75 },
  // Gracie color themes
  { id:"gracie_default", cat:"theme", name:"Default",   price:0.00 },
  { id:"gracie_ocean",   cat:"theme", name:"Ocean",     price:0.35 },
  { id:"gracie_sunset",  cat:"theme", name:"Sunset",    price:0.35 },
  { id:"gracie_forest",  cat:"theme", name:"Forest",    price:0.30 },
  { id:"gracie_rose",    cat:"theme", name:"Rose",      price:0.35 },
  { id:"gracie_purple",  cat:"theme", name:"Purple",    price:0.40 },
  { id:"gracie_gold",    cat:"theme", name:"Gold",      price:0.75 },
  { id:"gracie_night",   cat:"theme", name:"Night",     price:0.60 },
];

export const FREE_ITEMS = ["hair_basic","shirt_white","pants_blue","acc_none","gracie_default"];

export const DEFAULT_EQUIPPED = {
  skinTone:    "s2",
  hairColor:   "hc2",
  hairStyle:   "hair_basic",
  shirt:       "shirt_white",
  pants:       "pants_blue",
  acc:         "acc_none",
  gracieTheme: "gracie_default",
};

// ── CSS keyframe animations ────────────────────────────────
const ANIM_CSS = `
@keyframes av-wave {
  0%,100% { transform:rotate(0deg); }
  20%      { transform:rotate(-40deg); }
  55%      { transform:rotate(15deg); }
  80%      { transform:rotate(-28deg); }
}
@keyframes av-bounce {
  0%,100% { transform:translateY(0); }
  45%      { transform:translateY(-13px); }
}
@keyframes av-dance {
  0%,100% { transform:rotate(-7deg); }
  25%      { transform:rotate(7deg) translateY(-5px); }
  75%      { transform:rotate(7deg) translateY(-5px); }
}
@keyframes av-jump {
  0%   { transform:translateY(0); }
  35%  { transform:translateY(-22px); }
  65%  { transform:translateY(-20px); }
  100% { transform:translateY(0); }
}
@keyframes av-spin {
  from { transform:rotate(0deg); }
  to   { transform:rotate(360deg); }
}
.av-arm-wave {
  animation: av-wave 0.9s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: 50% 0%;
}
.av-body-bounce {
  animation: av-bounce 0.65s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center center;
}
.av-body-dance {
  animation: av-dance 0.55s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center center;
}
.av-body-jump {
  animation: av-jump 0.75s ease-in-out 1;
  transform-box: fill-box;
  transform-origin: center bottom;
}
.av-body-spin {
  animation: av-spin 0.65s linear 1;
  transform-box: fill-box;
  transform-origin: center center;
}
`;

// ── Sub-components ────────────────────────────────────────

function HairBack({ style, color }) {
  const cap = `M18,57 A42,42 0 0,1 102,57 Q102,14 60,11 Q18,14 18,57 Z`;
  if (style === "hair_long") return (
    <>
      <path d={cap} fill={color}/>
      <rect x="12" y="57" width="14" height="62" rx="7" fill={color}/>
      <rect x="94" y="57" width="14" height="62" rx="7" fill={color}/>
    </>
  );
  if (style === "hair_pigtails") return (
    <>
      <path d={cap} fill={color}/>
      <ellipse cx="9"   cy="84" rx="9" ry="25" fill={color} transform="rotate(-12,9,84)"/>
      <ellipse cx="111" cy="84" rx="9" ry="25" fill={color} transform="rotate(12,111,84)"/>
    </>
  );
  if (style === "hair_curly") return (
    <>
      <circle cx="19"  cy="57" r="11" fill={color}/>
      <circle cx="101" cy="57" r="11" fill={color}/>
      <path d={cap} fill={color}/>
    </>
  );
  return <path d={cap} fill={color}/>;
}

function HairFront({ style, color }) {
  const fringe = `M22,44 Q60,22 98,44 Q90,52 60,47 Q30,52 22,44 Z`;
  if (style === "hair_basic")    return <path d={fringe} fill={color}/>;
  if (style === "hair_long")     return <path d={fringe} fill={color}/>;
  if (style === "hair_bun")      return (
    <>
      <path d={fringe} fill={color}/>
      <circle cx="60" cy="10" r="14" fill={color}/>
    </>
  );
  if (style === "hair_pigtails") return (
    <>
      <path d={fringe} fill={color}/>
      <circle cx="17"  cy="63" r="5.5" fill={color}/>
      <circle cx="103" cy="63" r="5.5" fill={color}/>
    </>
  );
  if (style === "hair_curly") return (
    <>
      <circle cx="35" cy="30" r="10" fill={color}/>
      <circle cx="60" cy="19" r="11" fill={color}/>
      <circle cx="85" cy="30" r="10" fill={color}/>
      <path d={fringe} fill={color}/>
    </>
  );
  if (style === "hair_spiky") return (
    <>
      <path d={fringe} fill={color}/>
      <polygon points="48,42 54,11 61,42" fill={color}/>
      <polygon points="59,42 65,7 72,42"  fill={color}/>
      <polygon points="35,46 38,19 47,43" fill={color}/>
      <polygon points="73,46 82,19 85,43" fill={color}/>
    </>
  );
  return null;
}

function AccShape({ acc }) {
  if (acc === "acc_glasses") return (
    <g>
      <circle cx="48" cy="55" r="10" fill="none" stroke="#333" strokeWidth="2.5"/>
      <circle cx="72" cy="55" r="10" fill="none" stroke="#333" strokeWidth="2.5"/>
      <line x1="58" y1="55" x2="62" y2="55" stroke="#333" strokeWidth="2.5"/>
      <line x1="20" y1="55" x2="38" y2="55" stroke="#333" strokeWidth="2"/>
      <line x1="82" y1="55" x2="100" y2="55" stroke="#333" strokeWidth="2"/>
    </g>
  );
  if (acc === "acc_crown") return (
    <g>
      <path d="M26,30 L26,16 L42,27 L60,11 L78,27 L94,16 L94,30 Z"
            fill="#FFD700" stroke="#C8A000" strokeWidth="1.5"/>
      <circle cx="60" cy="13" r="4.5" fill="#FF4444"/>
      <circle cx="37" cy="21" r="3"   fill="#55AAFF"/>
      <circle cx="83" cy="21" r="3"   fill="#55AAFF"/>
    </g>
  );
  if (acc === "acc_bow") return (
    <g>
      <polygon points="44,102 60,109 44,116" fill="#CC2244"/>
      <polygon points="76,102 60,109 76,116" fill="#CC2244"/>
      <circle cx="60" cy="109" r="5" fill="#AA1133"/>
    </g>
  );
  if (acc === "acc_hat") return (
    <g>
      <polygon points="60,1 32,31 88,31" fill="#FF6BAA" stroke="#E04090" strokeWidth="1.5"/>
      <ellipse cx="60" cy="31" rx="28" ry="7" fill="#FF99CC"/>
      <circle cx="60" cy="3"  r="3.5" fill="#FFD700"/>
      <circle cx="50" cy="18" r="2.5" fill="#55AAFF"/>
      <circle cx="69" cy="13" r="2"   fill="#FF4444"/>
    </g>
  );
  return null;
}

// ── AvatarSVG ─────────────────────────────────────────────
// bust=true → shows only head + shoulders (for shop previews)
export function AvatarSVG({ equipped = DEFAULT_EQUIPPED, pose = null, onClick, bust = false }) {
  const eq     = { ...DEFAULT_EQUIPPED, ...equipped };
  const skinObj = SKIN_TONES.find(s => s.id === eq.skinTone) || SKIN_TONES[1];
  const skin    = skinObj.hex;
  const skinShadow = skinObj.shadow;
  const hair    = (HAIR_COLORS.find(h => h.id === eq.hairColor) || HAIR_COLORS[1]).hex;
  const shirt   = SHIRT_FILL[eq.shirt]  || SHIRT_FILL.shirt_white;
  const pants   = PANTS_FILL[eq.pants]  || PANTS_FILL.pants_blue;
  const isWave  = pose === "wave";
  const bodyClass = (pose && pose !== "wave") ? `av-body-${pose}` : "";
  const vb = bust ? "5 10 110 108" : "0 0 120 215";

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg"
         style={{ display:"block", cursor: onClick ? "pointer" : "default",
                  width:"100%", height:"100%" }}
         onClick={onClick}>
      <style>{ANIM_CSS}</style>
      <g className={bodyClass}
         style={bodyClass ? { transformBox:"fill-box", transformOrigin:"center center" } : {}}>

        {/* ── Feet ── */}
        {!bust && <>
          <ellipse cx="44" cy="206" rx="15" ry="8" fill={skinShadow}/>
          <ellipse cx="76" cy="206" rx="15" ry="8" fill={skinShadow}/>
        </>}

        {/* ── Legs ── */}
        {!bust && <>
          <rect x="36" y="168" width="17" height="40" rx="6" fill={pants}/>
          <rect x="67" y="168" width="17" height="40" rx="6" fill={pants}/>
        </>}

        {/* ── Left arm (back) ── */}
        <g transform="translate(33,110) rotate(22)">
          <ellipse cx="0" cy="14" rx="8" ry="19" fill={shirt}/>
          <ellipse cx="0" cy="31" rx="7" ry="8"  fill={skin}/>
        </g>

        {/* ── Body / shirt ── */}
        <ellipse cx="60" cy="143" rx="24" ry="31" fill={shirt}/>
        {/* Stripe overlay (shirt_stripe only) */}
        {eq.shirt === "shirt_stripe" && (
          <>
            <defs>
              <clipPath id="sc">
                <ellipse cx="60" cy="143" rx="24" ry="31"/>
              </clipPath>
            </defs>
            {[-16,-8,0,8,16].map((x,i) => (
              <line key={i} x1={60+x} y1="112" x2={60+x} y2="174"
                    stroke={i%2===0?"#003865":"transparent"} strokeWidth="7"
                    clipPath="url(#sc)" opacity="0.35"/>
            ))}
          </>
        )}

        {/* ── Neck ── */}
        <ellipse cx="60" cy="112" rx="11" ry="7" fill={skin}/>

        {/* ── Right arm (wave pivot at shoulder) ── */}
        <g transform="translate(87,108)">
          <g className={isWave ? "av-arm-wave" : ""}
             style={isWave ? { transformBox:"fill-box", transformOrigin:"50% 0%" } : {}}>
            <ellipse cx="0" cy="14" rx="8" ry="19" fill={shirt}/>
            <ellipse cx="0" cy="31" rx="7" ry="8"  fill={skin}/>
          </g>
        </g>

        {/* ── Hair back ── */}
        <HairBack style={eq.hairStyle} color={hair}/>

        {/* ── Head ── */}
        <circle cx="60" cy="55" r="42" fill={skin}/>

        {/* ── Cheek blush ── */}
        <circle cx="34" cy="67" r="9"  fill={skinShadow} opacity="0.35"/>
        <circle cx="86" cy="67" r="9"  fill={skinShadow} opacity="0.35"/>

        {/* ── Eyes ── */}
        <ellipse cx="48" cy="51" rx="5.5" ry="6.5" fill="#1a1a1a"/>
        <ellipse cx="72" cy="51" rx="5.5" ry="6.5" fill="#1a1a1a"/>
        <circle  cx="50" cy="49" r="2"    fill="#fff"/>
        <circle  cx="74" cy="49" r="2"    fill="#fff"/>

        {/* ── Nose ── */}
        <ellipse cx="60" cy="63" rx="4" ry="3" fill={skinShadow}/>

        {/* ── Smile ── */}
        <path d="M 47 73 Q 60 84 73 73"
              fill="none" stroke="#333" strokeWidth="2.8" strokeLinecap="round"/>

        {/* ── Hair front ── */}
        <HairFront style={eq.hairStyle} color={hair}/>

        {/* ── Accessory ── */}
        <AccShape acc={eq.acc}/>

      </g>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────
const CAT_FIELD = { hair:"hairStyle", shirt:"shirt", pants:"pants", acc:"acc", theme:"gracieTheme" };

// ── AvatarScreen (default export) ─────────────────────────
export default function AvatarScreen({ student, onBack, earnedThisSession = 0, startTab = "look", startShopCat = "hair" }) {
  const [balance,  setBalance]  = useState(0.00);
  const [owned,    setOwned]    = useState([...FREE_ITEMS]);
  const [equipped, setEquipped] = useState({ ...DEFAULT_EQUIPPED });
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState(startTab);
  const [shopCat,  setShopCat]  = useState(startShopCat);
  const [pose,     setPose]     = useState(null);
  const [toast,    setToast]    = useState(null);     // {text, ok}
  const poseTimer = useRef(null);

  // Inject animation CSS once
  useEffect(() => {
    if (!document.getElementById("av-keyframes")) {
      const s = document.createElement("style");
      s.id = "av-keyframes";
      s.textContent = ANIM_CSS;
      document.head.appendChild(s);
    }
    loadAvatar();
  }, []); // eslint-disable-line

  async function loadAvatar() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/avatar/${encodeURIComponent(student.id)}`);
      if (r.ok) {
        const d = await r.json();
        setBalance(d.balance  || 0);
        setOwned(d.owned      || [...FREE_ITEMS]);
        const eq = { ...DEFAULT_EQUIPPED, ...(d.equipped || {}) };
        setEquipped(eq);
        // Seed localStorage so DrillCharacter always has the current theme
        try { localStorage.setItem(`gracie_theme_${student.id}`, eq.gracieTheme || "gracie_default"); } catch {}
      }
    } catch {}
    setLoading(false);
  }

  function showToast(text, ok = true) {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 2800);
  }

  function triggerPose(p) {
    clearTimeout(poseTimer.current);
    // Toggle off if already active (except one-shot)
    if (p === pose && p !== "jump" && p !== "spin") { setPose(null); return; }
    setPose(p);
    if (p === "jump" || p === "spin") {
      poseTimer.current = setTimeout(() => setPose(null), p === "spin" ? 700 : 800);
    }
  }

  async function handleBuy(item) {
    if (owned.includes(item.id)) { handleEquip(item); return; }
    if (balance < item.price - 0.001) {
      showToast(`Need $${item.price.toFixed(2)} — you have $${balance.toFixed(2)}`, false);
      return;
    }
    const newBal = Math.round((balance - item.price) * 100) / 100;
    setBalance(newBal);
    setOwned(o => [...o, item.id]);
    handleEquip(item);
    showToast(`Bought ${item.name}! 🎉`);
    try {
      await fetch(`${API}/avatar/buy`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ studentId: student.id, itemId: item.id }),
      });
    } catch {}
  }

  function handleEquip(item) {
    const field = CAT_FIELD[item.cat];
    if (!field) return;
    const newEq = { ...equipped, [field]: item.id };
    setEquipped(newEq);
    saveEquip(newEq);
    // Persist Gracie theme to localStorage so DrillCharacter picks it up instantly
    if (item.cat === "theme") {
      try { localStorage.setItem(`gracie_theme_${student.id}`, item.id); } catch {}
    }
  }

  function handleSkinChange(id) {
    const newEq = { ...equipped, skinTone: id };
    setEquipped(newEq);
    saveEquip(newEq);
  }

  function handleHairColorChange(id) {
    const newEq = { ...equipped, hairColor: id };
    setEquipped(newEq);
    saveEquip(newEq);
  }

  function saveEquip(eq) {
    fetch(`${API}/avatar/equip`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ studentId: student.id, equipped: eq }),
    }).catch(() => {});
  }

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
                 background:"#e8edf2",fontFamily:"sans-serif"}}>
      <div style={{textAlign:"center",color:"#888"}}>
        <div style={{fontSize:"2.5rem",marginBottom:"0.5rem"}}>🎨</div>
        <div>Loading avatar…</div>
      </div>
    </div>
  );

  const POSES = [
    { id:"bounce", label:"🕺 Bounce" },
    { id:"dance",  label:"💃 Dance"  },
    { id:"wave",   label:"👋 Wave"   },
    { id:"jump",   label:"🚀 Jump"   },
    { id:"spin",   label:"🌀 Spin"   },
  ];

  const SHOP_TABS = [
    { id:"hair",  label:"💇 Hair"   },
    { id:"shirt", label:"👕 Shirt"  },
    { id:"pants", label:"👖 Pants"  },
    { id:"acc",   label:"🎩 Extras" },
    { id:"theme", label:"🎨 Gracie" },
  ];

  const shopItems  = SHOP_ITEMS.filter(it => it.cat === shopCat);

  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",fontFamily:"sans-serif",
                 display:"flex",flexDirection:"column"}}>

      {/* Header */}
      <div style={{background:"#003865",color:"#fff",padding:"0.85rem 1.5rem",
                   display:"flex",alignItems:"center",gap:"0.75rem",flexShrink:0}}>
        <button onClick={onBack}
          style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",
                  color:"#fff",borderRadius:"3px",padding:"4px 10px",cursor:"pointer",fontSize:"0.72rem"}}>
          ← Back
        </button>
        <div style={{fontWeight:700,fontSize:"0.95rem",flex:1}}>🎨 My Avatar</div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:"0.62rem",opacity:.7,letterSpacing:"0.08em"}}>BALANCE</div>
          <div style={{fontFamily:"monospace",fontWeight:700,fontSize:"1.1rem"}}>
            ${balance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Earned banner */}
      {earnedThisSession > 0 && (
        <div style={{background:"#1a6e2e",color:"#fff",padding:"0.5rem 1.5rem",
                     fontSize:"0.85rem",fontWeight:600,textAlign:"center"}}>
          🎉 You earned <strong>${earnedThisSession.toFixed(2)}</strong> this drill! Head to Shop to spend it.
        </div>
      )}

      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
                   padding:"1rem",gap:"0.85rem",overflowY:"auto"}}>

        {/* ── Avatar display ── */}
        <div style={{background:"#fff",borderRadius:"12px",boxShadow:"0 2px 12px rgba(0,0,0,.08)",
                     padding:"1.25rem 1.5rem",display:"flex",flexDirection:"column",
                     alignItems:"center",gap:"0.85rem",width:"100%",maxWidth:"400px"}}>

          <div style={{width:"150px",height:"150px",background:"linear-gradient(135deg,#cce8ff,#d8f0ff)",
                       borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                       overflow:"hidden",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,.12)"}}
               onClick={() => triggerPose("wave")}>
            <AvatarSVG equipped={equipped} pose={pose}/>
          </div>

          <div style={{fontWeight:700,fontSize:"0.9rem",color:"#003865"}}>{student?.name}</div>
          <div style={{fontSize:"0.7rem",color:"#888"}}>Click avatar to wave · tap a pose button</div>

          <div style={{display:"flex",flexWrap:"wrap",gap:"6px",justifyContent:"center"}}>
            {POSES.map(p => (
              <button key={p.id} onClick={() => triggerPose(p.id)}
                style={{padding:"5px 11px",fontSize:"0.73rem",fontWeight:600,
                        background: pose === p.id ? "#003865" : "#f0f4f8",
                        color:      pose === p.id ? "#fff"    : "#333",
                        border:`1px solid ${pose===p.id?"#003865":"#c8d3dd"}`,
                        borderRadius:"4px",cursor:"pointer"}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{display:"flex",width:"100%",maxWidth:"400px",
                     borderRadius:"6px",overflow:"hidden",border:"1px solid #c8d3dd"}}>
          {[["look","✏️ Customize"],["shop","🛒 Shop"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{flex:1,padding:"0.65rem",fontSize:"0.85rem",fontWeight:700,
                      background: tab===id ? "#003865" : "#fff",
                      color:      tab===id ? "#fff"    : "#555",
                      border:"none",cursor:"pointer",transition:"background 0.15s"}}>
              {label}
            </button>
          ))}
        </div>

        {/* Toast */}
        {toast && (
          <div style={{background: toast.ok?"#e8f5e9":"#fdf2f2",
                       border:`1px solid ${toast.ok?"#b3dfc0":"#f0b8b8"}`,
                       borderRadius:"4px",padding:"0.5rem 1.25rem",
                       fontSize:"0.85rem",fontWeight:600,
                       color: toast.ok?"#1a6e2e":"#8b1a1a",
                       width:"100%",maxWidth:"400px",textAlign:"center"}}>
            {toast.ok ? "✓" : "⚠"} {toast.text}
          </div>
        )}

        {/* ── CUSTOMIZE TAB ── */}
        {tab === "look" && (
          <div style={{background:"#fff",borderRadius:"8px",boxShadow:"0 1px 6px rgba(0,0,0,.06)",
                       padding:"1.25rem",width:"100%",maxWidth:"400px",
                       display:"flex",flexDirection:"column",gap:"1.1rem"}}>

            <Section label="SKIN TONE">
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {SKIN_TONES.map(t => (
                  <button key={t.id} onClick={() => handleSkinChange(t.id)}
                    style={{width:"34px",height:"34px",borderRadius:"50%",background:t.hex,
                            border: equipped.skinTone===t.id
                              ? "3px solid #003865" : "2px solid #c8d3dd",
                            cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.15)"}}/>
                ))}
              </div>
            </Section>

            <Section label="HAIR COLOR">
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {HAIR_COLORS.map(h => (
                  <button key={h.id} onClick={() => handleHairColorChange(h.id)}
                    style={{width:"34px",height:"34px",borderRadius:"50%",background:h.hex,
                            border: equipped.hairColor===h.id
                              ? "3px solid #003865" : "2px solid #c8d3dd",
                            cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.15)"}}/>
                ))}
              </div>
            </Section>

            <Section label="GRACIE'S COLOR THEME">
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {SHOP_ITEMS.filter(it => it.cat === "theme" && owned.includes(it.id)).map(it => {
                  const th = GRACIE_THEMES[it.id];
                  const active = equipped.gracieTheme === it.id;
                  return (
                    <button key={it.id} onClick={() => handleEquip(it)} title={it.name}
                      style={{width:"34px",height:"34px",borderRadius:"50%",cursor:"pointer",
                              background:`linear-gradient(135deg, ${th.preview}, #333)`,
                              border: active ? "3px solid #003865" : "2px solid #c8d3dd",
                              boxShadow: active ? "0 0 0 2px #7ecfff" : "0 1px 4px rgba(0,0,0,.15)"}}>
                    </button>
                  );
                })}
                {SHOP_ITEMS.filter(it => it.cat === "theme" && !owned.includes(it.id)).length > 0 && (
                  <div style={{fontSize:"0.72rem",color:"#aaa",alignSelf:"center"}}>
                    More in Shop →
                  </div>
                )}
              </div>
            </Section>

            {["hair","shirt","pants","acc"].map(cat => {
              const label = {hair:"HAIR STYLE",shirt:"SHIRT",pants:"PANTS",acc:"ACCESSORY"}[cat];
              const ownedCat = SHOP_ITEMS.filter(it => it.cat===cat && owned.includes(it.id));
              const activeId = equipped[CAT_FIELD[cat]];
              return (
                <Section key={cat} label={label}>
                  <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
                    {ownedCat.map(it => (
                      <button key={it.id} onClick={() => handleEquip(it)}
                        style={{padding:"4px 11px",fontSize:"0.75rem",fontWeight:600,
                                background: activeId===it.id ? "#003865" : "#f0f4f8",
                                color:      activeId===it.id ? "#fff"    : "#333",
                                border:`1px solid ${activeId===it.id?"#003865":"#c8d3dd"}`,
                                borderRadius:"4px",cursor:"pointer"}}>
                        {it.name}
                      </button>
                    ))}
                    {ownedCat.length === 0 && (
                      <div style={{fontSize:"0.75rem",color:"#aaa"}}>Nothing yet — buy from Shop!</div>
                    )}
                  </div>
                </Section>
              );
            })}
          </div>
        )}

        {/* ── SHOP TAB ── */}
        {tab === "shop" && (
          <div style={{width:"100%",maxWidth:"400px",display:"flex",flexDirection:"column",gap:"0.75rem"}}>

            {/* Category pills */}
            <div style={{display:"flex",gap:"0",borderRadius:"6px",overflow:"hidden",
                         border:"1px solid #c8d3dd"}}>
              {SHOP_TABS.map(t => (
                <button key={t.id} onClick={() => setShopCat(t.id)}
                  style={{flex:1,padding:"0.5rem 0",fontSize:"0.72rem",fontWeight:700,
                          background: shopCat===t.id ? "#7a4500" : "#fff",
                          color:      shopCat===t.id ? "#fff"    : "#555",
                          border:"none",cursor:"pointer"}}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Item grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem"}}>
              {shopItems.map(item => {
                const isOwned   = owned.includes(item.id);
                const isFree    = item.price === 0;
                const canAfford = balance >= item.price - 0.001;
                const field     = CAT_FIELD[item.cat];
                const isWearing = equipped[field] === item.id;
                const previewEq = {
                  ...equipped,
                  ...(item.cat==="hair"  ? {hairStyle:item.id} : {}),
                  ...(item.cat==="shirt" ? {shirt:item.id}     : {}),
                  ...(item.cat==="pants" ? {pants:item.id}     : {}),
                  ...(item.cat==="acc"   ? {acc:item.id}       : {}),
                };
                return (
                  <div key={item.id} style={{
                    background:"#fff",
                    border:`2px solid ${isWearing?"#003865":isOwned?"#b3dfc0":"#c8d3dd"}`,
                    borderRadius:"8px",padding:"0.85rem 0.65rem",
                    display:"flex",flexDirection:"column",alignItems:"center",gap:"0.45rem",
                    textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.06)"}}>

                    {/* Preview — color swatch for themes, mini avatar for everything else */}
                    {item.cat === "theme" ? (
                      <div style={{width:"72px",height:"72px",borderRadius:"50%",
                                   background:`linear-gradient(135deg, ${GRACIE_THEMES[item.id]?.preview}, #222)`,
                                   display:"flex",alignItems:"center",justifyContent:"center",
                                   fontSize:"1.8rem",
                                   filter: GRACIE_THEMES[item.id]?.filter,
                                   boxShadow:"0 2px 8px rgba(0,0,0,.2)"}}>
                        🧒
                      </div>
                    ) : (
                      <div style={{width:"72px",height:"72px",
                                   background:"linear-gradient(135deg,#cce8ff,#d8f0ff)",
                                   borderRadius:"50%",display:"flex",
                                   alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                        <AvatarSVG equipped={previewEq} bust/>
                      </div>
                    )}

                    <div style={{fontWeight:700,fontSize:"0.82rem",color:"#1a1a1a",lineHeight:1.2}}>
                      {item.name}
                    </div>

                    {isFree ? (
                      <div style={{fontSize:"0.7rem",color:"#1a6e2e",fontWeight:700}}>FREE</div>
                    ) : (
                      <div style={{fontFamily:"monospace",fontWeight:700,fontSize:"0.88rem",
                                   color: isOwned ? "#888" : canAfford ? "#1a6e2e" : "#8b1a1a"}}>
                        {isOwned ? "Owned" : `$${item.price.toFixed(2)}`}
                      </div>
                    )}

                    <button onClick={() => handleBuy(item)}
                      disabled={!isOwned && !canAfford && !isFree}
                      style={{
                        width:"100%",padding:"5px 0",fontSize:"0.73rem",fontWeight:700,
                        borderRadius:"4px",border:"none",cursor:"pointer",
                        background: isWearing  ? "#003865"
                                  : isOwned   ? "#1a6e2e"
                                  : canAfford ? "#7a4500"
                                  : "#ccc",
                        color:"#fff",
                        opacity: (!isOwned && !canAfford && !isFree) ? 0.6 : 1,
                      }}>
                      {isWearing  ? "✓ Wearing"
                       : isOwned  ? "Wear"
                       : isFree   ? "Get Free"
                       : canAfford? `Buy $${item.price.toFixed(2)}`
                       : "Need more $"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{height:"1rem"}}/>
      </div>
    </div>
  );
}

// ── Small helper component ────────────────────────────────
function Section({ label, children }) {
  return (
    <div>
      <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.1em",
                   color:"#888",marginBottom:"0.45rem"}}>{label}</div>
      {children}
    </div>
  );
}
