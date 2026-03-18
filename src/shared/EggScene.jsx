/**
 * EggScene — elemental hatching egg companion for the fluency drill.
 *
 * Phase 1: CSS-animated PNG sprite.
 * Phase 2: swap for a glTF model via R3F — same props, same slot.
 *
 * Props
 *   accuracy     {number}  0–100  drives shake intensity + crack depth
 *   correct      {bool}    edge-triggers a glow flash on correct answer
 *   sessionStars {number}  0–5    star row shown below the egg
 *   element      {string}  "earth" | "fire" | "water" | "wind"
 */
import React, { useEffect, useRef, useState } from "react";

/* ─── inject keyframes once ─────────────────────────────────── */
(function injectStyles() {
  if (document.getElementById("egg-scene-styles")) return;
  const el = document.createElement("style");
  el.id = "egg-scene-styles";
  el.textContent = `
    @keyframes eggBreath {
      0%,100% { transform: scale(1) rotate(0deg); }
      50%      { transform: scale(1.025) rotate(0.4deg); }
    }
    @keyframes eggRockSlow {
      0%,100% { transform: rotate(0deg)   translateY(0px); }
      25%     { transform: rotate(-4deg)  translateY(-3px); }
      75%     { transform: rotate( 4deg)  translateY(-1px); }
    }
    @keyframes eggRockMed {
      0%,100% { transform: rotate(0deg)   translateY(0px); }
      20%     { transform: rotate(-6deg)  translateY(-5px); }
      50%     { transform: rotate( 6deg)  translateY(-2px); }
      80%     { transform: rotate(-5deg)  translateY(-4px); }
    }
    @keyframes eggShakeFast {
      0%,100% { transform: translate(0,0)        rotate(0deg);  }
      10%     { transform: translate(-4px,-2px)  rotate(-5deg); }
      25%     { transform: translate( 4px,-3px)  rotate( 5deg); }
      40%     { transform: translate(-3px, 2px)  rotate(-4deg); }
      55%     { transform: translate( 3px, 1px)  rotate( 4deg); }
      70%     { transform: translate(-4px,-2px)  rotate(-6deg); }
      85%     { transform: translate( 4px, 2px)  rotate( 6deg); }
    }
    @keyframes eggCorrect {
      0%   { filter: var(--egg-base-f) brightness(1);   }
      20%  { filter: var(--egg-glow-f) brightness(1.5); }
      60%  { filter: var(--egg-glow-f) brightness(1.3); }
      100% { filter: var(--egg-base-f) brightness(1);   }
    }
    @keyframes crackPulse {
      0%,100% { opacity: 0.55; }
      50%     { opacity: 0.9;  }
    }
    @keyframes auraGlow {
      0%,100% { opacity: 0.5; transform: scale(1);    }
      50%     { opacity: 0.9; transform: scale(1.06); }
    }
  `;
  document.head.appendChild(el);
})();

/* ─── element config ─────────────────────────────────────────── */
const ELEMENTS = {
  earth: {
    src:      "/eggs/earth-egg.png",
    glow:     "rgba(163,230,53,0.65)",
    auraFrom: "rgba(101,163,13,0.22)",
    auraTo:   "rgba(101,163,13,0)",
    crackClr: "#fbbf24",
  },
  fire: {
    src:      "/eggs/fire-egg.png",
    glow:     "rgba(249,115,22,0.7)",
    auraFrom: "rgba(239,68,68,0.22)",
    auraTo:   "rgba(239,68,68,0)",
    crackClr: "#ef4444",
  },
  water: {
    src:      "/eggs/water-egg.png",
    glow:     "rgba(56,189,248,0.65)",
    auraFrom: "rgba(14,165,233,0.2)",
    auraTo:   "rgba(14,165,233,0)",
    crackClr: "#38bdf8",
  },
  wind: {
    src:      "/eggs/wind-egg.png",
    glow:     "rgba(167,139,250,0.65)",
    auraFrom: "rgba(139,92,246,0.2)",
    auraTo:   "rgba(139,92,246,0)",
    crackClr: "#a78bfa",
  },
};

/* ─── crack SVG overlay ──────────────────────────────────────── */
function Cracks({ progress, color }) {
  if (progress < 0.25) return null;
  const fade = (start) => Math.min(1, Math.max(0, (progress - start) / 0.25));
  return (
    <svg
      viewBox="0 0 100 125"
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
        animation: "crackPulse 1.6s ease-in-out infinite",
      }}
    >
      <path d="M50 28 L43 46 L51 54 L45 74"
        stroke={color} strokeWidth="1.6" fill="none"
        strokeLinecap="round" opacity={fade(0.25)} />
      {progress > 0.45 && (
        <path d="M63 44 L56 57 L62 66 L55 82"
          stroke={color} strokeWidth="1.2" fill="none"
          strokeLinecap="round" opacity={fade(0.45)} />
      )}
      {progress > 0.65 && (
        <path d="M37 55 L45 63 L39 73 L47 84"
          stroke={color} strokeWidth="1.2" fill="none"
          strokeLinecap="round" opacity={fade(0.65)} />
      )}
      {progress > 0.72 && (
        <circle cx="50" cy="28" r="3.5" fill={color} opacity={fade(0.72) * 0.9} />
      )}
    </svg>
  );
}

/* ─── main component ─────────────────────────────────────────── */
export default function EggScene({
  accuracy     = 0,
  correct      = false,
  sessionStars = 0,
  element      = "earth",
}) {
  const cfg = ELEMENTS[element] ?? ELEMENTS.earth;
  const [flash, setFlash] = useState(false);
  const timerRef = useRef(null);

  /* edge-trigger correct flash */
  useEffect(() => {
    if (!correct) return;
    setFlash(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(timerRef.current);
  }, [correct]);

  /* pick animation tier from accuracy */
  const { animName, animDur } = (() => {
    if (accuracy >= 90) return { animName: "eggShakeFast", animDur: "0.3s" };
    if (accuracy >= 70) return { animName: "eggShakeFast", animDur: "0.5s" };
    if (accuracy >= 50) return { animName: "eggRockMed",   animDur: "0.9s" };
    if (accuracy >= 25) return { animName: "eggRockSlow",  animDur: "1.4s" };
    return               { animName: "eggBreath",    animDur: "3s"   };
  })();

  const crackProgress = Math.min(1, accuracy / 100);
  const glowPx        = Math.round(accuracy / 10);          // 0–10 px glow radius
  const auraOpacity   = 0.4 + (accuracy / 100) * 0.6;

  const baseFilter = `drop-shadow(0 4px 10px rgba(0,0,0,0.4)) drop-shadow(0 0 ${glowPx}px ${cfg.glow})`;
  const glowFilter = `drop-shadow(0 0 20px ${cfg.glow}) drop-shadow(0 4px 10px rgba(0,0,0,0.4))`;

  return (
    <div style={{
      position: "relative",
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      borderRadius: 12, overflow: "hidden",
    }}>

      {/* radial aura */}
      <div style={{
        position: "absolute", bottom: "8%", left: "50%",
        transform: "translateX(-50%)",
        width: "85%", height: "55%", borderRadius: "50%",
        background: `radial-gradient(ellipse, ${cfg.auraFrom} 0%, ${cfg.auraTo} 75%)`,
        opacity: auraOpacity,
        animation: "auraGlow 2.5s ease-in-out infinite",
        pointerEvents: "none",
      }} />

      {/* egg wrapper — shake + glow live here */}
      <div style={{
        position: "relative",
        width: "clamp(90px, 78%, 145px)",
        aspectRatio: "1 / 1.12",
        transformOrigin: "50% 92%",
        "--egg-base-f": baseFilter,
        "--egg-glow-f": glowFilter,
        filter: baseFilter,
        animation: flash
          ? `eggCorrect 0.65s ease-out, ${animName} ${animDur} ease-in-out infinite`
          : `${animName} ${animDur} ease-in-out infinite`,
      }}>
        <img
          src={cfg.src}
          alt={`${element} egg`}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          onError={e => { e.currentTarget.style.opacity = "0.15"; }}
        />
        <Cracks progress={crackProgress} color={cfg.crackClr} />
      </div>

      {/* star row */}
      {sessionStars > 0 && (
        <div style={{ marginTop: "0.45rem", display: "flex", gap: "2px", fontSize: "0.8rem" }}>
          {[1,2,3,4,5].map(n => (
            <span key={n} style={{ opacity: n <= sessionStars ? 1 : 0.18, lineHeight: 1 }}>⭐</span>
          ))}
        </div>
      )}
    </div>
  );
}
