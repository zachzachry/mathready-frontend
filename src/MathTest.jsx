import { useState, useEffect, useRef } from "react";
// Pet/avatar placeholder — EggScene removed, will be replaced later
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import MathText from "./shared/MathText";
import TopBar from "./shared/TopBar";
import { QUESTIONS as FALLBACK_QUESTIONS, START_SECS, LETTERS, S, T, pct, lvl, lvlC, lvlBg, lvlBd, fmtTime, now, saveSession, sendHeartbeat, API } from "./shared/constants";
import { buildWeightMap, updateSessionWeights, pickAdaptiveQuestion, ALL_STANDARDS } from "./adaptive";
import PlotGrid from "./shared/PlotGrid";

/* ── Drag-and-Drop Answer Component ─────────────────────── */
function DragDropAnswer({ zones=[], items=[], value, onChange, revealed, correctMap, ddLayout="categories" }) {
  // value is a JSON string mapping item→zoneIndex, e.g. {"Melting ice":0,"Burning wood":1}
  const placement = (() => { try { return value ? JSON.parse(value) : {}; } catch { return {}; } })();
  const [dragging, setDragging] = useState(null);

  function handleDrop(zoneIdx) {
    if (revealed || !dragging) return;
    // For blanks layout: each blank accepts only one item, so clear any item already in this blank
    const next = { ...placement };
    if (ddLayout === "blanks") {
      // Remove any item currently in this blank
      for (const k of Object.keys(next)) {
        if (next[k] === zoneIdx) delete next[k];
      }
    }
    next[dragging] = zoneIdx;
    onChange(JSON.stringify(next));
    setDragging(null);
  }

  function removeItem(item) {
    if (revealed) return;
    const next = { ...placement };
    delete next[item];
    onChange(JSON.stringify(next));
  }

  const unplaced = items.filter(item => placement[item] === undefined);

  // ── Fill-in Blanks layout ──
  if (ddLayout === "blanks") return (
    <div>
      <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.75rem"}}>
        DRAG A TILE INTO EACH BLANK
      </div>

      {/* Blank slots */}
      <div style={{display:"flex",flexDirection:"column",gap:"0.5rem",marginBottom:"1rem"}}>
        {zones.map((zone, zIdx) => {
          const placedItem = items.find(item => placement[item] === zIdx);
          let slotBg = T.surface, slotBorder = `2px dashed ${T.border}`;
          if (revealed && correctMap && placedItem) {
            const isRight = correctMap[placedItem] === zIdx;
            slotBg = isRight ? T.successBg : T.dangerBg;
            slotBorder = `2px solid ${isRight ? T.success : T.dangerText}`;
          } else if (placedItem) {
            slotBg = "#e3edf7"; slotBorder = `2px solid ${T.midnight}44`;
          }
          return (
            <div key={zIdx}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(zIdx)}
              onTouchEnd={() => { if (dragging) handleDrop(zIdx); }}
              style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <span style={{fontSize:"0.85rem",fontWeight:700,color:T.midnight,minWidth:"100px"}}>{zone}</span>
              <div style={{flex:1,maxWidth:"180px",minHeight:"42px",display:"flex",alignItems:"center",justifyContent:"center",
                background:slotBg,border:slotBorder,borderRadius:"6px",padding:"0.3rem 0.6rem",transition:"all .15s"}}>
                {placedItem ? (
                  <div style={{display:"flex",alignItems:"center",gap:"0.4rem",width:"100%"}}>
                    <span style={{flex:1,fontSize:"1rem",fontWeight:700,color:T.midnight,textAlign:"center"}}><MathText text={placedItem}/></span>
                    {!revealed && <button onClick={() => removeItem(placedItem)} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:"0.75rem",padding:"0 2px"}}>✕</button>}
                    {revealed && correctMap && (
                      <span style={{fontSize:"0.8rem",fontWeight:700}}>{correctMap[placedItem]===zIdx?"✓":"✗"}</span>
                    )}
                  </div>
                ) : (
                  <span style={{fontSize:"0.78rem",color:T.textMuted,fontStyle:"italic"}}>___</span>
                )}
              </div>
              {revealed && correctMap && placedItem && correctMap[placedItem] !== zIdx && (
                <span style={{fontSize:"0.72rem",color:T.success,fontWeight:600}}>
                  → {items.find(it => correctMap[it] === zIdx) || "?"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tile pool */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",padding:"0.6rem",background:T.surface,borderRadius:T.xs,border:`1px dashed ${T.border}`,minHeight:"40px"}}>
        {unplaced.length === 0 && !revealed && <span style={{fontSize:"0.75rem",color:T.textMuted,fontStyle:"italic"}}>All tiles placed</span>}
        {unplaced.map(item => {
          const isDistractor = revealed && correctMap && correctMap[item] === "distractor";
          return (
          <div key={item}
            draggable={!revealed}
            onDragStart={() => setDragging(item)}
            onTouchStart={() => setDragging(item)}
            style={{background:isDistractor?T.successBg:T.midnight,color:isDistractor?T.success:T.white,border:isDistractor?`2px solid ${T.success}`:"none",borderRadius:T.xs,padding:"0.5rem 1rem",fontSize:"0.95rem",fontWeight:700,cursor:revealed?"default":"grab",userSelect:"none",minWidth:"36px",textAlign:"center"}}>
            <MathText text={item}/>{isDistractor && <span style={{marginLeft:"0.3rem",fontSize:"0.7rem"}}>✓</span>}
          </div>
          );
        })}
      </div>

      {/* Corrections */}
      {revealed && correctMap && (() => {
        const wrong = items.filter(item => {
          const c = correctMap[item];
          if (c === "distractor") return placement[item] !== undefined;
          return placement[item] !== undefined && placement[item] !== c;
        });
        if (wrong.length === 0) return null;
        return (
          <div style={{marginTop:"0.75rem",padding:"0.6rem",background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,color:T.dangerText,marginBottom:"0.3rem"}}>CORRECTIONS:</div>
            {wrong.map(item => (
              <div key={item} style={{fontSize:"0.78rem",color:T.text}}>
                <strong>{item}</strong> → {correctMap[item]==="distractor" ? "does not belong anywhere" : zones[correctMap[item]]}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );

  // ── Categories layout (original) ──
  return (
    <div>
      <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.75rem"}}>
        DRAG ITEMS INTO THE CORRECT CATEGORY
      </div>

      {/* Unplaced items (drag source) */}
      <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"1rem",minHeight:"40px",padding:"0.6rem",background:T.surface,borderRadius:T.xs,border:`1px dashed ${T.border}`}}>
        {unplaced.length === 0 && !revealed && <span style={{fontSize:"0.75rem",color:T.textMuted,fontStyle:"italic"}}>All items placed</span>}
        {unplaced.map(item => {
          const isDistractor = revealed && correctMap && correctMap[item] === "distractor";
          return (
          <div key={item}
            draggable={!revealed}
            onDragStart={() => setDragging(item)}
            onTouchStart={() => setDragging(item)}
            style={{background:isDistractor?T.successBg:T.midnight,color:isDistractor?T.success:T.white,border:isDistractor?`2px solid ${T.success}`:"none",borderRadius:T.xs,padding:"0.45rem 0.85rem",fontSize:"0.82rem",fontWeight:600,cursor:revealed?"default":"grab",userSelect:"none"}}>
            <MathText text={item}/>{isDistractor && <span style={{marginLeft:"0.3rem",fontSize:"0.7rem"}}>✓</span>}
          </div>
          );
        })}
      </div>

      {/* Drop zones */}
      <div style={{display:"grid",gridTemplateColumns:zones.length<=3?`repeat(${zones.length},1fr)`:"repeat(2,1fr)",gap:"0.6rem"}}>
        {zones.map((zone, zIdx) => {
          const zoneItems = items.filter(item => placement[item] === zIdx);
          const isOver = dragging !== null;
          return (
            <div key={zIdx}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={() => handleDrop(zIdx)}
              onTouchEnd={() => { if (dragging) handleDrop(zIdx); }}
              style={{border:`2px ${isOver?"dashed":"solid"} ${T.border}`,borderRadius:"6px",padding:"0.6rem",minHeight:"100px",background:T.white,transition:"border-color .15s"}}>
              <div style={{fontSize:"0.68rem",fontWeight:700,letterSpacing:"0.08em",color:T.midnight,marginBottom:"0.5rem",textAlign:"center",borderBottom:`1px solid ${T.border}`,paddingBottom:"0.4rem"}}>
                {zone}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.3rem"}}>
                {zoneItems.map(item => {
                  let bg = "#e3edf7", border = `1px solid ${T.midnight}33`, textColor = T.text;
                  if (revealed && correctMap) {
                    const isRight = correctMap[item] === zIdx && correctMap[item] !== "distractor";
                    bg = isRight ? T.successBg : T.dangerBg;
                    border = `1px solid ${isRight ? T.success : T.dangerText}`;
                    textColor = isRight ? T.success : T.dangerText;
                  }
                  return (
                    <div key={item} style={{display:"flex",alignItems:"center",gap:"0.4rem",background:bg,border,borderRadius:T.xs,padding:"0.35rem 0.6rem"}}>
                      <span style={{flex:1,fontSize:"0.8rem",fontWeight:600,color:textColor}}><MathText text={item}/></span>
                      {!revealed && <button onClick={() => removeItem(item)} style={{background:"none",border:"none",cursor:"pointer",color:T.textMuted,fontSize:"0.75rem",padding:"0 2px"}}>✕</button>}
                      {revealed && correctMap && (
                        <span style={{fontSize:"0.7rem",fontWeight:700}}>{correctMap[item]===zIdx&&correctMap[item]!=="distractor"?"✓":"✗"}</span>
                      )}
                    </div>
                  );
                })}
                {zoneItems.length===0 && <div style={{fontSize:"0.72rem",color:T.textMuted,textAlign:"center",padding:"0.5rem",fontStyle:"italic"}}>Drop here</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show misplaced items' correct zones after reveal */}
      {revealed && correctMap && (() => {
        const wrong = items.filter(item => {
          const c = correctMap[item];
          if (c === "distractor") return placement[item] !== undefined;
          return placement[item] !== c;
        });
        if (wrong.length === 0) return null;
        return (
          <div style={{marginTop:"0.75rem",padding:"0.6rem",background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,color:T.dangerText,marginBottom:"0.3rem"}}>CORRECTIONS:</div>
            {wrong.map(item => (
              <div key={item} style={{fontSize:"0.78rem",color:T.text}}>
                <strong>{item}</strong> → {correctMap[item]==="distractor" ? "does not belong anywhere" : zones[correctMap[item]]}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

/* ── Hotspot Answer Component (click-to-select + drag-to-snap) ── */
export function HotspotAnswer({ questionImage, snapPoints=[], assets=[], assetType="tile", assetReuse=true, assetSize="md", value, onChange, revealed, answer }) {
  const isDot = assetType === "dot" || assetType === "pin";
  const imgContainerRef = useRef(null);

  // All placements stored as [ {x, y, val} ] — val is "●" for dots, the tile value for tiles
  const placements = (() => {
    try { return value ? JSON.parse(value) : []; }
    catch { return []; }
  })();
  const pts = Array.isArray(placements) ? placements : [];

  const maxItems = snapPoints.length || 1;

  // Remaining assets in tray
  const trayAssets = (() => {
    if (isDot) return ["●"]; // dots always available
    if (assetReuse) return [...assets];
    const placed = pts.map(p => p.val);
    const remaining = [...assets];
    placed.forEach(v => { const idx = remaining.indexOf(v); if (idx >= 0) remaining.splice(idx, 1); });
    return remaining;
  })();

  // ── Drag from tray onto image ──
  const [dragState, setDragState] = useState(null); // {val, x, y} while dragging

  function startDrag(assetVal, e) {
    if (revealed) return;
    e.preventDefault();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    setDragState({ val: assetVal, x: cx, y: cy });

    function onMove(ev) {
      const mx = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const my = ev.touches ? ev.touches[0].clientY : ev.clientY;
      setDragState(prev => prev ? { ...prev, x: mx, y: my } : null);
      ev.preventDefault();
    }
    function onEnd(ev) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      const fx = ev.changedTouches ? ev.changedTouches[0].clientX : ev.clientX;
      const fy = ev.changedTouches ? ev.changedTouches[0].clientY : ev.clientY;
      const img = imgContainerRef.current?.querySelector("img");
      if (!img) { setDragState(null); return; }
      const rect = img.getBoundingClientRect();
      const x = Math.round(((fx - rect.left) / rect.width) * 1000) / 10;
      const y = Math.round(((fy - rect.top) / rect.height) * 1000) / 10;
      setDragState(null);
      if (x < 0 || x > 100 || y < 0 || y > 100) return;
      let next = [...pts];
      // For dots: replace oldest if at max; for tiles with reuse: replace oldest if at max
      if (isDot) {
        if (next.length >= maxItems) next = next.slice(1);
        next.push({ x, y, val: assetVal });
      } else {
        // For unique tiles, remove any existing placement of this value first
        if (!assetReuse) next = next.filter(p => p.val !== assetVal);
        if (next.length >= maxItems) next = next.slice(1);
        next.push({ x, y, val: assetVal });
      }
      onChange(JSON.stringify(next));
    }
    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  }

  function removePoint(idx) {
    if (revealed) return;
    const next = pts.filter((_, i) => i !== idx);
    onChange(JSON.stringify(next));
  }

  // ── Grading helpers ──
  const correctMap = answer || {};
  const TOLERANCE = 2.5; // % of image — how close a placed item must be

  function pointResult(pt) {
    if (!revealed) return null;
    for (const sp of snapPoints) {
      if (correctMap[sp.id]) {
        const d = Math.sqrt((sp.x - pt.x) ** 2 + (sp.y - pt.y) ** 2);
        if (d <= TOLERANCE) {
          // For dots (all same asset): just check proximity
          if (isDot) return "correct";
          // For tiles: check proximity AND correct value
          if (pt.val === correctMap[sp.id]) return "correct";
        }
      }
    }
    return "wrong";
  }

  function chipStyle(val, small, correct, wrong) {
    const sz = small ? "12px" : "19px";
    const fs = small ? "0.35rem" : "0.5rem";
    if (isDot) return {
      width: sz, height: sz, borderRadius: "50%",
      background: correct ? T.success : wrong ? "#888" : "#e53e3e",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: fs, fontWeight: 700, boxShadow: "0 2px 6px rgba(0,0,0,0.3)", userSelect: "none",
    };
    const sizeMap = {xs:"0.55rem",sm:"0.7rem",md:"0.9rem",lg:"1.15rem",xl:"1.4rem"};
    const padMap = {xs:"0px 2px",sm:"1px 3px",md:"2px 6px",lg:"3px 8px",xl:"4px 10px"};
    const fSize = sizeMap[assetSize] || sizeMap.md;
    const fPad = padMap[assetSize] || padMap.md;
    return {
      display: "inline-block",
      background: correct ? "#d1fae5" : wrong ? "#fee2e2" : "transparent",
      color: correct ? T.success : wrong ? T.dangerText : "#0f0f0f",
      borderRadius: "3px", padding: small ? fPad : fPad,
      fontSize: fSize, fontWeight: 600, fontFamily: "Georgia, serif",
      border: correct ? `1px solid ${T.successBd}` : wrong ? `1px solid ${T.dangerBd}` : "1px solid transparent",
      userSelect: "none", whiteSpace: "nowrap", textAlign: "center",
    };
  }

  function chipLabel(val) { return isDot ? "●" : val; }

  return (
    <div>
      <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.5rem"}}>
        {pts.length < maxItems
          ? `DRAG ${isDot ? "THE DOT" : "A VALUE"} ONTO THE IMAGE (${pts.length}/${maxItems})`
          : `${maxItems} ITEM${maxItems>1?"S":""} PLACED — DRAG TO REPOSITION`}
      </div>

      {/* Image + placed items */}
      <div ref={imgContainerRef} style={{position:"relative",display:"inline-block",maxWidth:500,width:"100%"}}>
        <img src={questionImage} alt="diagram" style={{width:"100%",display:"block",borderRadius:"6px",pointerEvents:"none"}}/>

        {/* Placed items on image */}
        {pts.map((pt, i) => {
          const res = pointResult(pt);
          const isRight = res === "correct";
          const isWrong = res === "wrong";
          return (
            <div key={i}
              onClick={() => removePoint(i)}
              style={{
                position:"absolute", left:`${pt.x}%`, top:`${pt.y}%`,
                transform:"translate(-50%,-50%)", zIndex:3,
                cursor: revealed ? "default" : "pointer",
              }}>
              <span style={chipStyle(pt.val, true, isRight, isWrong)}>
                {isDot ? "●" : pt.val}
              </span>
            </div>
          );
        })}

        {/* Correct locations shown after reveal (green markers for missed points) */}
        {revealed && snapPoints.filter(sp => correctMap[sp.id]).map(sp => {
          const matchedPt = pts.find(pt => {
            const d = Math.sqrt((sp.x - pt.x)**2 + (sp.y - pt.y)**2);
            if (d > TOLERANCE) return false;
            if (isDot) return true;
            return pt.val === correctMap[sp.id];
          });
          if (matchedPt) return null;
          return (
            <div key={sp.id} style={{
              position:"absolute", left:`${sp.x}%`, top:`${sp.y}%`,
              transform:"translate(-50%,-50%)", zIndex:2,
            }}>
              {isDot ? (
                <div style={{width:14, height:14, borderRadius:"50%", border:`2px dashed ${T.success}`, background:`${T.success}22`, display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <span style={{fontSize:"0.5rem",color:T.success,fontWeight:700}}>✓</span>
                </div>
              ) : (
                <span style={{fontSize:"0.82rem",fontFamily:"Georgia,serif",color:T.success,fontWeight:700,background:"#d1fae5",padding:"1px 6px",borderRadius:"3px",border:`1px solid ${T.successBd}`}}>
                  {correctMap[sp.id]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Asset tray — drag from here onto the image */}
      {!revealed && (
        <div style={{
          display:"flex",flexWrap:"wrap",alignItems:"center",gap:"0.75rem",marginTop:"0.75rem",
          padding:"0.6rem 0.75rem",background:T.surface,borderRadius:"6px",
          border:`1px dashed ${T.border}`,
        }}>
          {trayAssets.map((asset, i) => (
            <div key={`${asset}-${i}`}
              onMouseDown={e => startDrag(asset, e)}
              onTouchStart={e => startDrag(asset, e)}
              style={{ cursor:"grab", userSelect:"none" }}>
              {isDot ? (
                <div style={{width:19,height:19,borderRadius:"50%",background:"#e53e3e",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"0.5rem",fontWeight:700,boxShadow:"0 2px 8px rgba(229,62,62,0.4)"}}>●</div>
              ) : (
                <span style={chipStyle(asset, false, false, false)}>{asset}</span>
              )}
            </div>
          ))}
          <span style={{fontSize:"0.75rem",color:T.textSecondary,fontWeight:600,marginLeft:"auto"}}>
            ← Drag onto image{pts.length > 0 ? ` · ${pts.length} placed (tap to remove)` : ""}
          </span>
        </div>
      )}

      {/* Ghost follows cursor during drag */}
      {dragState && (
        <div style={{position:"fixed",left:dragState.x,top:dragState.y,transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:9999,opacity:0.85}}>
          {isDot ? (
            <div style={{width:19,height:19,borderRadius:"50%",background:"#e53e3e",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"0.5rem",fontWeight:700,boxShadow:"0 2px 8px rgba(229,62,62,0.4)"}}>●</div>
          ) : (
            <span style={{...chipStyle(dragState.val, false, false, false), boxShadow:"0 4px 12px rgba(0,0,0,0.15)"}}>{dragState.val}</span>
          )}
        </div>
      )}

      {/* Corrections after reveal */}
      {revealed && (() => {
        const correctSps = snapPoints.filter(sp => correctMap[sp.id]);
        const matched = correctSps.filter(sp => pts.some(pt => {
          const d = Math.sqrt((sp.x-pt.x)**2+(sp.y-pt.y)**2);
          if (d > TOLERANCE) return false;
          return isDot || pt.val === correctMap[sp.id];
        }));
        const missed = correctSps.length - matched.length;
        const extra = pts.filter(pt => !correctSps.some(sp => {
          const d = Math.sqrt((sp.x-pt.x)**2+(sp.y-pt.y)**2);
          if (d > TOLERANCE) return false;
          return isDot || pt.val === correctMap[sp.id];
        })).length;
        if (missed === 0 && extra === 0) return null;
        return (
          <div style={{marginTop:"0.5rem",padding:"0.5rem 0.75rem",background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:"6px"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,color:T.dangerText,marginBottom:"0.3rem"}}>CORRECTIONS:</div>
            {missed > 0 && <div style={{fontSize:"0.78rem",color:T.text}}>Missing {missed} correct placement{missed>1?"s":""} (shown in green)</div>}
            {extra > 0 && <div style={{fontSize:"0.78rem",color:T.text}}>{extra} item{extra>1?"s":""} placed incorrectly</div>}
          </div>
        );
      })()}
    </div>
  );
}

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

// ── Student Login ──────────────────────────────────────────
// Flow: google → choice (drill | test code) → [code → confirm] or [drill start]
function StudentLogin({ onStartTest, onStartDrill, onBack, prefillCode, prefillCredential, impersonateStudent }) {
  const [credential, setCredential] = useState(prefillCredential || null);
  const [code,       setCode]       = useState(prefillCode || "");
  const [err,        setErr]        = useState("");
  const [checking,   setChecking]   = useState(false);
  const [testInfo,   setTestInfo]   = useState(null);
  const [student,    setStudent]    = useState(null);
  const [cls,        setCls]        = useState(null);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [studentHistory, setStudentHistory] = useState([]);
  const [studentFluency, setStudentFluency] = useState(null);
  // skip google step if credential already provided from home screen sign-in
  const [step, setStep] = useState(
    impersonateStudent ? "choice"
    : prefillCredential ? (prefillCode ? "code" : "choice")
    : "google"
  );
  const googleBtnRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(!!window.google);

  // Mount Google button on the google step
  useEffect(() => {
    if (step !== "google" || !GOOGLE_CLIENT_ID) return;
    if (!window.google) {
      // Wait up to 5s for the script to load
      const timer = setTimeout(() => { if (!window.google) setGoogleReady(false); }, 5000);
      const poll = setInterval(() => { if (window.google) { setGoogleReady(true); clearInterval(poll); clearTimeout(timer); } }, 300);
      return () => { clearTimeout(timer); clearInterval(poll); };
    }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (resp) => {
        setCredential(resp.credential);
        setErr("");
        setStep(prefillCode ? "code" : "choice");
      },
      ux_mode: "popup",
      auto_select: false,
    });
    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 280,
      });
    }
  }, [step, googleReady]); // eslint-disable-line

  // Fetch student assignments, history, and fluency when reaching choice screen
  useEffect(() => {
    if (step !== "choice") return;
    (async () => {
      try {
        let sid = null;
        if (impersonateStudent) {
          setStudent(impersonateStudent.student);
          setCls(impersonateStudent.cls);
          sid = impersonateStudent.student.id;
        } else if (credential) {
          const r = await fetch(`${API}/auth/google/drill`, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({ token: credential }),
          });
          const d = await r.json();
          if (r.ok && d.student) {
            setStudent(d.student);
            setCls(d.cls);
            sid = d.student.id;
          }
        }
        if (sid) {
          try {
            const [ar, hr, fr] = await Promise.all([
              fetch(`${API}/assignments/student/${encodeURIComponent(sid)}`).catch(()=>null),
              fetch(`${API}/student/history/${encodeURIComponent(sid)}`).catch(()=>null),
              fetch(`${API}/fluency/progress/${encodeURIComponent(sid)}`).catch(()=>null),
            ]);
            if (ar?.ok) { const ad = await ar.json(); setStudentAssignments(ad.assignments || []); }
            if (hr?.ok) { setStudentHistory(await hr.json()); }
            if (fr?.ok) { setStudentFluency(await fr.json()); }
          } catch {}
        }
      } catch {}
    })();
  }, [step, credential, impersonateStudent]);

  // Step 2 — validate test code + verify stored credential against roster
  async function checkCode() {
    const c = code.trim().toUpperCase();
    if (!c) { setErr("Please enter the test code."); return; }
    setChecking(true); setErr("");
    try {
      const r = await fetch(`${API}/test/code/${encodeURIComponent(c)}`);
      const data = await r.json();
      if (!data.found || (!data.questions?.length && data.type !== "drill")) {
        setErr("Invalid test code. Check with your teacher.");
        setChecking(false); return;
      }
      const vr = await fetch(`${API}/auth/google/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credential, code: c }),
      });
      const vd = await vr.json();
      if (!vr.ok) {
        setErr(vd.detail || "Your Google account is not on the roster for this test. Check with your teacher.");
        setChecking(false); return;
      }
      if (data.oneAttempt) {
        try {
          const ar = await fetch(`${API}/test/attempt-check?code=${encodeURIComponent(c)}&studentId=${encodeURIComponent(vd.student.id)}`);
          const ad = await ar.json();
          if (ad.attempted) { setErr("You have already submitted this test. Only one attempt is allowed."); setChecking(false); return; }
        } catch { setErr("Something went wrong checking attempt status. Please try again."); setChecking(false); return; }
      }
      setTestInfo(data); setStudent(vd.student); setCls(vd.cls);
      setStep("confirm");
    } catch { setErr("Could not connect to server. Try again."); }
    setChecking(false);
  }

  // ── Google Sign-In screen ──
  if (step === "google") return (
    <div style={S.page}>
      <div style={{background:T.midnight,width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        {onBack && <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:T.white,borderRadius:T.xs,padding:"6px 14px",cursor:"pointer",fontSize:"0.8rem"}}>← Back</button>}
        <div style={{color:T.white,fontSize:"0.95rem",fontWeight:700}}>Georgia Milestones Readiness Trainer</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
        <div style={S.card}>
          <div style={S.hdr}>
            <div style={S.hdrSub}>STUDENT SIGN IN</div>
            <div style={S.hdrTitle}>Sign in with Google</div>
          </div>
          <div style={{padding:"1.75rem 2rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem"}}>
            <div style={{fontSize:"0.85rem",color:T.textSecondary,textAlign:"center",lineHeight:1.6}}>
              Use your <strong>school Google account</strong> to get started.
            </div>
            {googleReady ? <div ref={googleBtnRef}></div> : (
              <div style={{color:T.textSecondary,fontSize:"0.85rem",textAlign:"center",padding:"0.5rem",lineHeight:1.6}}>
                {window.google ? "Loading…" : "Google Sign-In could not load. Please check your internet connection and refresh the page."}
              </div>
            )}
            {err && <div style={{...S.errBox,width:"100%"}}>⚠ {err}</div>}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Student Dashboard ──
  if (step === "choice") {
    const testHistory = studentHistory.filter(s => s.mode !== "drill" && s.mode !== "practice");
    const recentTests = [...testHistory].sort((a,b) => (b.submitted||"").localeCompare(a.submitted||"")).slice(0, 5);
    const fl = studentFluency;
    const drillStreak = fl?.streakDays || 0;
    const drillSessions = fl?.sessions || [];
    const pb = fl?.personalBests || {};
    const levels = fl ? { add: fl.add, sub: fl.sub, mul: fl.mul, div: fl.div } : null;

    // Standard mastery from test history
    const stdMap = {};
    testHistory.forEach(s => {
      const ans = s.answers || {};
      // We don't have full question data here, so use questionTimes if available
      (s.questionTimes || []).forEach(qt => {
        if (!qt.standard) return;
        if (!stdMap[qt.standard]) stdMap[qt.standard] = { correct: 0, total: 0 };
        stdMap[qt.standard].total++;
        if (qt.correct) stdMap[qt.standard].correct++;
      });
    });
    const standards = Object.entries(stdMap).map(([std, d]) => ({
      standard: std, pct: Math.round(d.correct / d.total * 100), correct: d.correct, total: d.total,
    })).sort((a,b) => a.pct - b.pct);

    const cardStyle = {background:T.white,border:`1px solid ${T.border}`,borderRadius:"8px",overflow:"hidden"};
    const cardHead = {padding:"0.6rem 1rem",background:"#f1f5f9",borderBottom:`1px solid ${T.border}`,fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary};

    return (
    <div style={{...S.page,background:"linear-gradient(155deg,#0d1b2a 0%,#0f2d4a 55%,#133a5e 100%)"}}>
      <div style={{background:"rgba(0,0,0,.25)",width:"100%",padding:"0.75rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        <button onClick={()=>{setStep("google");setErr("");}} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:T.white,borderRadius:T.xs,padding:"6px 14px",cursor:"pointer",fontSize:"0.8rem"}}>← Sign Out</button>
        <div style={{flex:1,color:T.white,fontSize:"0.95rem",fontWeight:700}}>MathReady</div>
        {student && <div style={{color:"rgba(255,255,255,.7)",fontSize:"0.82rem"}}>{student.name}</div>}
      </div>

      <div style={{flex:1,overflow:"auto",padding:"1.25rem",width:"100%"}}>
        <div style={{maxWidth:"800px",margin:"0 auto"}}>

          {/* Welcome + streak */}
          <div style={{marginBottom:"1.25rem",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem"}}>
            <div>
              <div style={{fontSize:"1.4rem",fontWeight:800,color:T.white}}>
                Hi, {student?.name?.split(" ")[0] || "Student"}!
              </div>
              <div style={{fontSize:"0.82rem",color:"rgba(255,255,255,.6)",marginTop:"2px"}}>
                {studentAssignments.length > 0
                  ? `You have ${studentAssignments.length} assignment${studentAssignments.length!==1?"s":""} to complete`
                  : "You're all caught up!"}
              </div>
            </div>
            {drillStreak > 0 && (
              <div style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:"12px",padding:"0.5rem 1rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                <span style={{fontSize:"1.3rem"}}>🔥</span>
                <div>
                  <div style={{fontSize:"1.1rem",fontWeight:800,color:"#fbbf24"}}>{drillStreak}</div>
                  <div style={{fontSize:"0.6rem",fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:"0.1em"}}>DAY STREAK</div>
                </div>
              </div>
            )}
          </div>

          {/* Quick actions row */}
          <div style={{display:"flex",gap:"0.75rem",marginBottom:"1.25rem",flexWrap:"wrap"}}>
            <button onClick={async () => {
              if (student && cls) { onStartDrill(student, cls); return; }
              setChecking(true); setErr("");
              try {
                const r = await fetch(`${API}/auth/google/drill`, {
                  method:"POST", headers:{"Content-Type":"application/json"},
                  body: JSON.stringify({ token: credential }),
                });
                const d = await r.json();
                if (!r.ok) { setErr(d.detail || "Sign-in failed."); setChecking(false); return; }
                onStartDrill(d.student, d.cls);
              } catch { setErr("Could not connect. Try again."); }
              setChecking(false);
            }} disabled={checking}
              style={{flex:1,minWidth:"140px",background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:"10px",padding:"1rem 1.25rem",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.75rem",boxShadow:"0 4px 12px rgba(245,158,11,.3)",opacity:checking?0.6:1}}>
              <span style={{fontSize:"1.5rem"}}>⚡</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:"0.95rem",fontWeight:800,color:T.white}}>Fluency Drill</div>
                <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,.8)"}}>Adaptive fact practice</div>
              </div>
            </button>
            <button onClick={()=>{setErr("");setStep("code");}}
              style={{flex:1,minWidth:"140px",background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.2)",borderRadius:"10px",padding:"1rem 1.25rem",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <span style={{fontSize:"1.5rem"}}>🔑</span>
              <div style={{textAlign:"left"}}>
                <div style={{fontSize:"0.95rem",fontWeight:800,color:T.white}}>Enter Code</div>
                <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,.6)"}}>Join with a test code</div>
              </div>
            </button>
          </div>

          {err && <div style={{...S.errBox,marginBottom:"1rem"}}>⚠ {err}</div>}

          {/* Assignments */}
          {studentAssignments.length > 0 && (
            <div style={{...cardStyle,marginBottom:"1rem"}}>
              <div style={cardHead}>📝 ASSIGNMENTS DUE</div>
              {studentAssignments.map(a => (
                <div key={a.assignmentId} style={{padding:"0.75rem 1rem",borderBottom:`1px solid ${T.surfaceAlt}`,display:"flex",alignItems:"center",gap:"0.75rem",cursor:"pointer",transition:"background .15s"}}
                  onClick={async () => {
                    setChecking(true); setErr("");
                    try {
                      setTestInfo({ found:true, questions:a.questions, title:a.testTitle, adaptive:a.adaptive, untimed:a.untimed, timeLimitSecs:a.timeLimitSecs, warnSecs:a.warnSecs, oneAttempt:a.oneAttempt });
                      setCode(a.testCode); setStep("confirm");
                    } catch { setErr("Failed to load test."); }
                    setChecking(false);
                  }}
                  onMouseEnter={e=>e.currentTarget.style.background=T.surfaceAlt}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <div style={{width:"36px",height:"36px",borderRadius:"8px",background:"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>📝</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.88rem",fontWeight:700,color:T.text}}>{a.testTitle}</div>
                    <div style={{fontSize:"0.72rem",color:T.textSecondary}}>{a.className}</div>
                  </div>
                  <div style={{fontSize:"0.75rem",fontWeight:700,color:"#2e7d32",background:"#e8f5e9",padding:"4px 10px",borderRadius:"12px"}}>Start →</div>
                </div>
              ))}
            </div>
          )}

          <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",marginBottom:"1rem"}}>

            {/* Fluency stats */}
            {fl && (
              <div style={{...cardStyle,flex:1,minWidth:"220px"}}>
                <div style={cardHead}>⚡ FLUENCY PROGRESS</div>
                <div style={{padding:"0.75rem 1rem"}}>
                  <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
                    {["add","sub","mul","div"].map(op => {
                      const lv = levels?.[op] || 1;
                      const label = {add:"+",sub:"−",mul:"×",div:"÷"}[op];
                      return (
                        <div key={op} style={{flex:1,minWidth:"50px",textAlign:"center",background:"#f8fafc",border:`1px solid ${T.border}`,borderRadius:"6px",padding:"0.5rem 0.25rem"}}>
                          <div style={{fontSize:"1rem",fontWeight:800,color:T.midnight}}>{label}</div>
                          <div style={{fontSize:"1.3rem",fontWeight:800,color:lv>=7?T.success:lv>=4?"#d97706":T.dangerText}}>{lv}</div>
                          <div style={{fontSize:"0.55rem",fontWeight:700,color:T.textSecondary,letterSpacing:"0.05em"}}>LEVEL</div>
                        </div>
                      );
                    })}
                  </div>
                  {(pb.bestAccuracy > 0 || pb.bestPPM > 0) && (
                    <div style={{display:"flex",gap:"0.75rem",flexWrap:"wrap"}}>
                      <div style={{fontSize:"0.72rem",color:T.textSecondary}}>
                        🎯 Best: <strong style={{color:T.text}}>{pb.bestAccuracy}%</strong>
                      </div>
                      <div style={{fontSize:"0.72rem",color:T.textSecondary}}>
                        ⏱ Best PPM: <strong style={{color:T.text}}>{pb.bestPPM}</strong>
                      </div>
                    </div>
                  )}
                  {drillSessions.length > 1 && (
                    <div style={{marginTop:"0.5rem"}}>
                      <div style={{display:"flex",alignItems:"flex-end",gap:"2px",height:"40px"}}>
                        {drillSessions.slice(-15).map((s,i) => (
                          <div key={i} style={{flex:1,background:s.pct>=80?T.success:s.pct>=60?"#f59e0b":T.dangerText,borderRadius:"2px 2px 0 0",height:`${Math.max(4, s.pct * 0.4)}px`,opacity:0.8,transition:"height .3s"}}
                            title={`${s.pct}%`}/>
                        ))}
                      </div>
                      <div style={{fontSize:"0.55rem",color:T.textSecondary,textAlign:"center",marginTop:"2px"}}>Last {Math.min(15, drillSessions.length)} sessions</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent test scores */}
            <div style={{...cardStyle,flex:1,minWidth:"220px"}}>
              <div style={cardHead}>📊 RECENT SCORES</div>
              {recentTests.length === 0 ? (
                <div style={{padding:"1.5rem 1rem",textAlign:"center",fontSize:"0.82rem",color:T.textMuted}}>No tests taken yet</div>
              ) : (
                <div>
                  {recentTests.map((s,i) => {
                    const p = s.pct;
                    return (
                      <div key={i} style={{padding:"0.6rem 1rem",borderBottom:`1px solid ${T.surfaceAlt}`,display:"flex",alignItems:"center",gap:"0.5rem"}}>
                        <div style={{width:"32px",height:"32px",borderRadius:"50%",background:p>=70?"#dcfce7":p>=50?"#fff8e1":"#fef2f2",border:`2px solid ${p>=70?T.success:p>=50?"#f59e0b":T.dangerText}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:"0.7rem",fontWeight:800,color:p>=70?T.success:p>=50?"#d97706":T.dangerText}}>{p}%</span>
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:"0.8rem",fontWeight:600,color:T.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.testTitle || s.testCode || "Test"}</div>
                          <div style={{fontSize:"0.65rem",color:T.textSecondary}}>{s.score}/{s.total} · {new Date(s.submitted).toLocaleDateString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Standard mastery */}
          {standards.length > 0 && (
            <div style={{...cardStyle,marginBottom:"1rem"}}>
              <div style={cardHead}>📋 STANDARD MASTERY</div>
              <div style={{padding:"0.75rem 1rem",display:"flex",flexDirection:"column",gap:"6px"}}>
                {standards.map(s => (
                  <div key={s.standard} style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
                    <span style={{fontSize:"0.68rem",fontWeight:700,color:T.midnight,minWidth:"70px"}}>{s.standard}</span>
                    <div style={{flex:1,height:"8px",background:"#e8edf2",borderRadius:"4px",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${s.pct}%`,background:s.pct>=70?T.success:s.pct>=50?"#f59e0b":T.dangerText,borderRadius:"4px",transition:"width .3s"}}/>
                    </div>
                    <span style={{fontSize:"0.68rem",fontWeight:700,color:s.pct>=70?T.success:s.pct>=50?"#d97706":T.dangerText,minWidth:"35px",textAlign:"right"}}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
  }

  // ── Code entry screen ──
  if (step === "code") return (
    <div style={S.page}>
      <div style={{background:T.midnight,width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        <button onClick={()=>{setStep("choice");setErr("");}} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:T.white,borderRadius:T.xs,padding:"6px 14px",cursor:"pointer",fontSize:"0.8rem"}}>← Back</button>
        <div style={{color:T.white,fontSize:"0.95rem",fontWeight:700}}>Georgia Milestones Readiness Trainer</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
        <div style={S.card}>
          <div style={S.hdr}>
            <div style={S.hdrSub}>STUDENT SIGN IN</div>
            <div style={S.hdrTitle}>Enter Test Code</div>
          </div>
          <div style={{padding:"1.75rem 2rem"}}>
            <div style={{marginBottom:"1.25rem"}}>
              <label style={S.lbl}>TEST CODE — given to you by your teacher</label>
              <input style={{...S.inp,fontFamily:"monospace",fontSize:"1.4rem",letterSpacing:"0.3em",textTransform:"uppercase",fontWeight:700,textAlign:"center"}}
                value={code} onChange={e=>{setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""));setErr("");}}
                onKeyDown={e=>e.key==="Enter"&&checkCode()} placeholder="ABCD1234" maxLength={8} autoFocus/>
            </div>
            {err && <div style={{...S.errBox,marginBottom:"0.75rem"}}>⚠ {err}</div>}
            <button onClick={checkCode} disabled={checking||!code.trim()}
              style={{...S.btnPri,width:"100%",opacity:(checking||!code.trim())?0.6:1}}>
              {checking ? "Verifying…" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Confirm screen ──
  if (step === "confirm" && testInfo && student) return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.hdr}>
          <div style={S.hdrSub}>STUDENT SIGN IN</div>
          <div style={S.hdrTitle}>Confirm Your Information</div>
        </div>
        <div style={{padding:"1.75rem 2rem"}}>
          <div style={S.confirmBox}>
            {(testInfo.type === "drill" ? [
              ["STUDENT NAME", student?.name],
              ["CLASS",        cls?.name],
              ["DRILL",        testInfo.title || "Fact Fluency Drill"],
              ["TEST CODE",    code.toUpperCase()],
              ["FORMAT",       "Adaptive — all 4 operations"],
              ["TIME LIMIT",   "3 Minutes"],
              ["INPUT",        "Short answer (type your answer)"],
            ] : [
              ["STUDENT NAME", student?.name],
              ["CLASS",        cls?.name],
              ["TEST",         testInfo.title || "Grade 5 Mathematics"],
              ["TEST CODE",    code.toUpperCase()],
              ["QUESTIONS",    String(testInfo.questions.length)],
              ["TIME LIMIT",   testInfo.untimed ? "No Time Limit" : (() => {
                const extFactor = student?.extendedTime === "2x" ? 2 : student?.extendedTime === "1.5x" ? 1.5 : 1;
                const base = testInfo.timeLimitSecs || 1800;
                const final = Math.round(base * extFactor / 60);
                return extFactor > 1 ? `${final} min (${student.extendedTime} extended)` : `${final} Minutes`;
              })()],
              ["CALCULATOR",   "Not Permitted"],
              ...(student?.reduceChoices ? [["ANSWER CHOICES", "Reduced (3 per question)"]] : []),
              ...(testInfo.oneAttempt ? [["ATTEMPTS", "1 — Cannot retake"]] : []),
            ]).map(([k,v],i,a) => (
              <div key={k} style={{...S.confirmRow, borderBottom:i<a.length-1?"1px solid #eef1f4":"none"}}>
                <span style={S.confirmK}>{k}</span>
                <span style={{...S.confirmV, fontFamily:k==="TEST CODE"?"monospace":"inherit", letterSpacing:k==="TEST CODE"?"0.18em":"inherit"}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:T.warningBg,border:`1px solid ${T.warningBd}`,borderRadius:T.xs,padding:"0.65rem 1rem",marginBottom:"0.75rem",fontSize:"0.8rem",color:T.warning}}>
            {testInfo.type === "drill"
              ? "⚡ Once you click Begin, your 3-minute drill starts immediately. Answer as many problems as you can!"
              : "⚠ Once you click Begin Test, your timer starts immediately."}
          </div>
          {testInfo.oneAttempt && (
            <div style={{background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,padding:"0.65rem 1rem",marginBottom:"1.25rem",fontSize:"0.8rem",color:T.dangerText,display:"flex",alignItems:"center",gap:"0.5rem"}}>
              🚫 <span><strong>One attempt only.</strong> Once you submit, you cannot retake this test.</span>
            </div>
          )}
          <div style={{display:"flex",gap:"0.75rem"}}>
            <button onClick={()=>setStep("code")} style={S.btnSec}>← Go Back</button>
            <button onClick={()=>onStartTest(student, cls, code.toUpperCase(), testInfo)} style={S.btnPri}>
              {testInfo.type === "drill" ? "Begin Drill ⚡" : "Begin Test →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return null;
}

// ── Practice Mode ──────────────────────────────────────────
function PracticeMode({ student, cls, onFinish, onQuit }) {
  const [bankQ,       setBankQ]       = useState([]);
  const [weights,     setWeights]     = useState({});
  const [seenIds,     setSeenIds]     = useState(new Set());
  const [loading,     setLoading]     = useState(true);
  const [curQ,        setCurQ]        = useState(null);
  const [selected,    setSelected]    = useState(null);
  const [revealed,    setRevealed]    = useState(false);
  const [history,     setHistory]     = useState([]);
  const [qStart,      setQStart]      = useState(Date.now());
  const [totalSecs,   setTotalSecs]   = useState(0);
  const timerRef = useRef(null);
  const LIMIT = 10;

  // Fetch bank + student history to seed weights
  useEffect(() => {
    async function init() {
      let bank = FALLBACK_QUESTIONS;
      let initWeights = {};
      try {
        const [qRes, hRes] = await Promise.all([
          fetch(`${API}/questions`).then(r=>r.json()).catch(()=>[]),
          student?.id
            ? fetch(`${API}/student/history/${encodeURIComponent(student.id)}`).then(r=>r.json()).catch(()=>[])
            : Promise.resolve([]),
        ]);
        if (Array.isArray(qRes) && qRes.length) bank = qRes;
        if (Array.isArray(hRes) && hRes.length)  initWeights = buildWeightMap(hRes);
      } catch (e) { console.warn("Failed to load practice questions/history, using fallback:", e); }
      // Seed all standards at 0.5 if not in history
      ALL_STANDARDS.forEach(std => { if (!initWeights[std]) initWeights[std] = 0.5; });
      setBankQ(bank);
      setWeights(initWeights);
      // Pick first question
      const first = pickAdaptiveQuestion(bank, initWeights, new Set(), ALL_STANDARDS);
      setCurQ(first);
      setSeenIds(new Set([first.id]));
      setLoading(false);
      setQStart(Date.now());
    }
    init();
    timerRef.current = setInterval(() => setTotalSecs(s => s + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);  // eslint-disable-line

  function handleChoose(choice) {
    if (revealed) return;
    setSelected(choice);
    setRevealed(true);
  }

  function handleNext() {
    const timeSecs = Math.round((Date.now() - qStart) / 1000);
    function gradeIt(q, sel) {
      if (!sel) return false;
      if (q.type === "plotpoint") return sel === JSON.stringify(Array.isArray(q.answer)?q.answer:(()=>{try{return JSON.parse(q.answer);}catch{return null;}})());
      if (q.type === "multiselect") { try { return JSON.stringify([...JSON.parse(sel)].sort())===JSON.stringify([...(Array.isArray(q.answer)?q.answer:[])].sort()); } catch { return false; } }
      if (q.type === "keypad") return String(q.answer??"").trim().toLowerCase()===String(sel).trim().toLowerCase();
      if (q.type === "dragdrop") { try { const given=JSON.parse(sel); const correct=q.correct||q.answer||{}; return (q.items||[]).every(item=>{const c=correct[item]; if(c==="distractor") return given[item]===undefined; return given[item]===c;}); } catch { return false; } }
      if (q.type === "hotspot") { try { const g=JSON.parse(sel); const c=q.answer||{}; const sps=q.snapPoints||[]; const correctSps=sps.filter(sp=>c[sp.id]); const isDot=q.assetType==="dot"||q.assetType==="pin"; const TOL=2.5; if(!Array.isArray(g)||g.length!==correctSps.length) return false; const matched=correctSps.filter(sp=>g.some(pt=>{const d=Math.sqrt((sp.x-pt.x)**2+(sp.y-pt.y)**2); return d<=TOL&&(isDot||pt.val===c[sp.id]);})); return matched.length===correctSps.length; } catch { return false; } }
      return sel === q.correct;
    }
    const isCorrect = gradeIt(curQ, selected);
    const newHistory = [...history, { q: curQ, chosen: selected, correct: isCorrect, timeSecs }];
    setHistory(newHistory);

    if (newHistory.length >= LIMIT) {
      handleFinish(newHistory);
      return;
    }

    // Update weights based on session so far
    const newWeights = updateSessionWeights(weights, newHistory, ALL_STANDARDS);
    setWeights(newWeights);

    // Pick next question adaptively
    const newSeen = new Set([...seenIds, curQ.id]);
    const next = pickAdaptiveQuestion(bankQ, newWeights, newSeen, ALL_STANDARDS);
    setSeenIds(new Set([...newSeen, next.id]));
    setCurQ(next);
    setSelected(null);
    setRevealed(false);
    setQStart(Date.now());
  }

  function handleFinish(finalHistory) {
    clearInterval(timerRef.current);
    const h = finalHistory || history;
    const score = h.filter(x => x.correct).length;
    const session = {
      studentName: student?.name || "Student",
      studentId:   student?.id   || "",
      className:   cls?.name     || "",
      classId:     cls?.id       || "",
      score,
      total:       h.length,
      pct:         h.length ? pct(score, h.length) : 0,
      submitted:   now(),
      timeUsed:    fmtTime(totalSecs),
      mode:        "practice",
      testCode:    "PRACTICE",
      answers:     Object.fromEntries(h.map(x => [x.q.id, x.chosen])),
    };
    onFinish(session, h);
  }

  function handleQuit() {
    if (history.length === 0) { onQuit(); return; }
    handleFinish();
  }

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#e8edf2",fontFamily:T.font}}>
      <div style={{textAlign:"center",color:T.textSecondary}}>
        <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>🎯</div>
        <div>Building your practice session…</div>
      </div>
    </div>
  );

  if (!curQ) return null;

  const q = curQ;
  const correct = (() => {
    if (q.type === "plotpoint") return JSON.stringify(Array.isArray(q.answer)?q.answer:(()=>{try{return JSON.parse(q.answer);}catch{return null;}})());
    if (q.type === "multiselect") return JSON.stringify([...(Array.isArray(q.answer)?q.answer:[])].sort());
    if (q.type === "keypad") return String(q.answer??"").trim().toLowerCase();
    if (q.type === "dragdrop") return JSON.stringify(q.correct||q.answer||{});
    if (q.type === "hotspot") return JSON.stringify(q.answer||{});
    return q.correct;
  })();
  const streak  = (() => { let s=0; for(let i=history.length-1;i>=0;i--){ if(history[i].correct) s++; else break; } return s; })();
  const totalCorrect = history.filter(x=>x.correct).length;
  const questionNum  = history.length + 1;

  return (
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",fontFamily:T.font,background:"#e8edf2"}}>
      {/* Header */}
      <div style={{background:T.success,color:T.white,padding:"0.75rem 1.5rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        <div style={{fontSize:"1rem",fontWeight:700}}>🎯 Practice Mode</div>
        <div style={{marginLeft:"auto",display:"flex",gap:"1.25rem",alignItems:"center"}}>
          {streak >= 3 && <div style={{fontSize:"0.75rem",background:"rgba(255,255,255,.2)",padding:"3px 10px",borderRadius:"12px",fontWeight:700}}>🔥 {streak} streak!</div>}
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"0.75rem",opacity:.7,letterSpacing:"0.08em"}}>SCORE</div>
            <div style={{fontSize:"0.9rem",fontWeight:700}}>{totalCorrect}/{history.length}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"0.75rem",opacity:.7,letterSpacing:"0.08em"}}>TIME</div>
            <div style={{fontSize:"0.9rem",fontWeight:700,fontFamily:"monospace"}}>{fmtTime(totalSecs)}</div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:"0.75rem",opacity:.7,letterSpacing:"0.08em"}}>STUDENT</div>
            <div style={{fontSize:"0.82rem",fontWeight:600}}>{student?.name}</div>
          </div>
          <button onClick={handleQuit}
            style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:T.white,borderRadius:T.xs,padding:"5px 12px",cursor:"pointer",fontSize:"0.75rem",fontWeight:600}}>
            Quit
          </button>
        </div>
      </div>

      {/* Question counter strip */}
      <div style={{background:"#155a27",color:"#a8e6b8",padding:"0.4rem 1.5rem",fontSize:"0.8rem",display:"flex",gap:"1rem",alignItems:"center"}}>
        <span>Question {questionNum} of {LIMIT}</span>
        <span style={{opacity:.6}}>·</span>
        <span style={{color:T.white,fontWeight:700}}>{q.standard}</span>
        {q.dok && <><span style={{opacity:.6}}>·</span><span>DOK {q.dok}</span></>}
        {q.parametric && <span style={{background:"rgba(255,255,255,.2)",borderRadius:T.r,padding:"1px 7px",fontSize:"0.65rem",fontWeight:700}}>⚡ Generated</span>}
      </div>

      {/* Question area */}
      <div style={{flex:1,display:"flex",justifyContent:"center",padding:"1.5rem 1rem 2rem",overflowY:"auto"}}>
        <div style={{width:"100%",maxWidth:"680px",display:"flex",flexDirection:"column",gap:"1rem"}}>

          {/* Question card */}
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:"6px",padding:"1.5rem 1.75rem",boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>
            <p style={{fontSize:"1.08rem",fontFamily:"Georgia,serif",color:"#0f0f0f",lineHeight:1.75,margin:0}}>
              <MathText text={q.question}/>
            </p>
          </div>

          {/* Choices — by type */}
          {q.type === "plotpoint" ? (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.75rem"}}>
              <PlotGrid
                answer={revealed ? q.answer : null}
                placed={selected ? JSON.parse(selected) : null}
                onPlace={pt => !revealed && handleChoose(JSON.stringify(pt))}
                revealed={revealed}
                size={Math.min(320, window.innerWidth - 60)}
              />
            </div>
          ) : q.type === "keypad" ? (
            <div style={{display:"flex",flexDirection:"column",gap:"0.65rem",alignItems:"flex-start"}}>
              <input
                type="text" inputMode="decimal"
                value={selected ?? ""}
                onChange={e => !revealed && handleChoose(e.target.value)}
                disabled={revealed}
                placeholder="Type your answer…"
                style={{width:"100%",maxWidth:"260px",padding:"0.8rem 1rem",fontSize:"1.3rem",fontFamily:"monospace",fontWeight:700,border:`2px solid ${revealed?(String(selected??"").trim().toLowerCase()===correct?T.success:T.dangerText):T.midnight}`,borderRadius:"4px",outline:"none",background:T.surface,color:"#0f0f0f"}}
              />
              {!revealed && selected && (
                <button onClick={() => handleChoose(selected)}
                  style={{background:T.midnight,color:T.white,border:"none",borderRadius:"4px",padding:"0.65rem 1.25rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer"}}>
                  Submit →
                </button>
              )}
            </div>
          ) : q.type === "dragdrop" ? (
            <div>
              <DragDropAnswer
                zones={q.zones||[]}
                items={q.items||[]}
                value={selected}
                onChange={v => handleChoose(v)}
                revealed={revealed}
                correctMap={revealed ? (q.correct||q.answer||{}) : null}
                ddLayout={q.ddLayout||"categories"}
              />
              {!revealed && selected && (
                <button onClick={() => handleChoose(selected)}
                  style={{background:T.midnight,color:T.white,border:"none",borderRadius:"4px",padding:"0.65rem 1.25rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer",marginTop:"0.75rem"}}>
                  Submit →
                </button>
              )}
            </div>
          ) : q.type === "hotspot" ? (
            <div>
              <HotspotAnswer
                questionImage={q.questionImage}
                snapPoints={q.snapPoints||[]}
                assets={q.items||[]}
                assetType={q.assetType||"tile"}
                assetReuse={q.assetReuse!==false}
                assetSize={q.assetSize||"md"}
                value={selected}
                onChange={v => { if (!revealed) setSelected(v); }}
                revealed={revealed}
                answer={revealed ? (q.answer||{}) : null}
              />
              {!revealed && selected && (
                <button onClick={() => handleChoose(selected)}
                  style={{background:T.midnight,color:T.white,border:"none",borderRadius:"4px",padding:"0.65rem 1.25rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer",marginTop:"0.75rem"}}>
                  Submit →
                </button>
              )}
            </div>
          ) : q.type === "multiselect" ? (
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              <div style={{fontSize:"0.7rem",color:T.textSecondary,marginBottom:"4px"}}>Select all that apply.</div>
              {q.choices.map((choice, i) => {
                const selArr = (() => { try { return selected ? JSON.parse(selected) : []; } catch { return []; } })();
                const isChosen = selArr.includes(choice);
                const correctArr = Array.isArray(q.answer) ? q.answer : [];
                const isInCorrect = correctArr.includes(choice);
                let bg = T.white, border = `2px solid ${T.border}`;
                if (revealed) {
                  if (isInCorrect)    { bg=T.successBg; border=`2px solid ${T.success}`; }
                  else if (isChosen)  { bg=T.dangerBg; border=`2px solid ${T.dangerText}`; }
                  else                { bg=T.surface; border="2px solid #e0e0e0"; }
                } else if (isChosen) { bg="#ddeaf7"; border=`2px solid ${T.midnight}`; }
                return (
                  <button key={i}
                    onClick={() => {
                      if (revealed) return;
                      const next = isChosen ? selArr.filter(c=>c!==choice) : [...selArr, choice];
                      setSelected(next.length ? JSON.stringify(next) : null);
                    }}
                    disabled={revealed}
                    style={{background:bg,border,borderRadius:"6px",padding:"0.9rem 1.25rem",textAlign:"left",cursor:revealed?"default":"pointer",display:"flex",alignItems:"center",gap:"1rem",transition:"all .15s"}}>
                    <div style={{width:"22px",height:"22px",borderRadius:T.xs,border:`2px solid ${revealed?(isInCorrect?T.success:isChosen?T.dangerText:"#ddd"):"#9aabba"}`,background:revealed?(isInCorrect?T.success:isChosen?T.dangerText:"#f0f0f0"):(isChosen?T.midnight:T.white),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {(isChosen || (revealed && isInCorrect)) && <span style={{color:T.white,fontSize:"0.8rem",fontWeight:900}}>✓</span>}
                    </div>
                    <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",flex:1}}><MathText text={choice}/></span>
                  </button>
                );
              })}
              {!revealed && (
                <button onClick={() => handleChoose(selected || "[]")}
                  style={{background:T.midnight,color:T.white,border:"none",borderRadius:"4px",padding:"0.65rem 1.25rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer",marginTop:"0.25rem"}}>
                  Submit Selections →
                </button>
              )}
            </div>
          ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
            {q.choices.map((choice, i) => {
              const isChosen  = selected === choice;
              const isCorrect = choice === correct;
              let bg = T.white, border = `2px solid ${T.border}`, color = T.text;
              if (revealed) {
                if (isCorrect)       { bg=T.successBg; border=`2px solid ${T.success}`; color=T.success; }
                else if (isChosen)   { bg=T.dangerBg; border=`2px solid ${T.dangerText}`; color=T.dangerText; }
                else                 { bg=T.surface; border="2px solid #e0e0e0"; color=T.textSecondary; }
              } else if (isChosen)   { bg="#ddeaf7"; border=`2px solid ${T.midnight}`; }

              return (
                <button key={i} onClick={() => handleChoose(choice)} disabled={revealed}
                  style={{background:bg,border,borderRadius:"6px",padding:"0.9rem 1.25rem",textAlign:"left",cursor:revealed?"default":"pointer",display:"flex",alignItems:"center",gap:"1rem",transition:"all .15s"}}>
                  <div style={{width:"30px",height:"30px",borderRadius:"50%",border:`2px solid ${revealed?(isCorrect?T.success:isChosen?T.dangerText:"#ddd"):"#9aabba"}`,background:revealed?(isCorrect?T.success:isChosen?T.dangerText:"#f0f0f0"):(isChosen?T.midnight:T.white),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:"0.75rem",fontWeight:700,color:revealed?(isCorrect||isChosen?T.white:T.textSecondary):(isChosen?T.white:"#667")}}>
                      {revealed && isCorrect ? "✓" : revealed && isChosen ? "✗" : LETTERS[i]}
                    </span>
                  </div>
                  <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",color,flex:1}}>
                    <MathText text={choice}/>
                  </span>
                </button>
              );
            })}
          </div>
          )}

          {/* Feedback banner */}
          {revealed && (() => {
              let isOk;
              if (q.type === "dragdrop") {
                try { const g=JSON.parse(selected); const cm=q.correct||q.answer||{}; isOk=(q.items||[]).every(item=>{const c=cm[item]; if(c==="distractor") return g[item]===undefined; return g[item]===c;}); } catch { isOk=false; }
              } else if (q.type === "multiselect") {
                try { isOk = JSON.stringify([...JSON.parse(selected)].sort()) === correct; } catch { isOk = false; }
              } else if (q.type === "keypad") {
                isOk = String(selected??"").trim().toLowerCase() === correct;
              } else if (q.type === "hotspot") {
                try { const g=JSON.parse(selected); const c=q.answer||{}; const sps=q.snapPoints||[]; const correctSps=sps.filter(sp=>c[sp.id]); const isDot=q.assetType==="dot"||q.assetType==="pin"; const TOL=2.5; if(!Array.isArray(g)||g.length!==correctSps.length){isOk=false;}else{const matched=correctSps.filter(sp=>g.some(pt=>{const d=Math.sqrt((sp.x-pt.x)**2+(sp.y-pt.y)**2); return d<=TOL&&(isDot||pt.val===c[sp.id]);})); isOk=matched.length===correctSps.length;}} catch { isOk=false; }
              } else {
                isOk = selected === correct;
              }
              const correctLabel = q.type==="dragdrop"
                ? "See corrections above"
                : q.type==="hotspot"
                ? "See corrections above"
                : q.type==="multiselect"
                ? (Array.isArray(q.answer)?q.answer:[]).join(", ")
                : q.type==="keypad" ? String(q.answer??"")
                : correct;
              return (
            <div style={{borderRadius:"6px",padding:"1rem 1.25rem",background:isOk?T.successBg:T.dangerBg,border:`1px solid ${isOk?T.successBd:T.dangerBd}`}}>
              <div style={{fontSize:"1rem",fontWeight:700,color:isOk?T.success:T.dangerText,marginBottom:q.explanation?"6px":0}}>
                {isOk ? "✓ Correct!" : <span>✗ The correct answer is: <MathText text={correctLabel}/></span>}
              </div>
              {q.explanation && (
                <div style={{fontSize:"0.85rem",color:"#444",lineHeight:1.6}}>
                  <MathText text={q.explanation}/>
                </div>
              )}
            </div>
              ); })()}

          {/* Next button */}
          {(revealed || ((q.type==="plotpoint"||q.type==="hotspot") && selected)) && (
            <div style={{display:"flex",gap:"0.75rem"}}>
              <button onClick={handleNext}
                style={{flex:1,background:T.midnight,border:"none",borderRadius:"6px",padding:"0.85rem",fontSize:"0.95rem",cursor:"pointer",color:T.white,fontWeight:700}}>
                {(q.type==="plotpoint"||q.type==="keypad"||q.type==="multiselect"||q.type==="dragdrop"||q.type==="hotspot") && !revealed ? "Submit Answer →" : "Next Question →"}
              </button>
              <button onClick={handleQuit}
                style={{background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:"6px",padding:"0.85rem 1.25rem",fontSize:"0.85rem",cursor:"pointer",color:T.textSecondary,fontWeight:600}}>
                Finish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Practice Results ───────────────────────────────────────
function PracticeResults({ session, history, onReset }) {
  const p = session.pct;
  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",fontFamily:T.font,display:"flex",flexDirection:"column"}}>
      <div style={{background:T.success,color:T.white,padding:"0.85rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
        <div style={{fontSize:"1rem",fontWeight:700}}>🎯 Practice Session Complete</div>
      </div>
      <div style={{flex:1,display:"flex",justifyContent:"center",padding:"2rem 1rem"}}>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:"6px",width:"100%",maxWidth:"640px",boxShadow:"0 2px 12px rgba(0,0,0,.07)",overflow:"hidden"}}>
          {/* Score header */}
          <div style={{background:T.successBg,borderBottom:`1px solid ${T.border}`,padding:"1.5rem 1.75rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"4px"}}>PRACTICE SCORE</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:T.text}}>{session.studentName}</div>
              <div style={{fontSize:"2rem",fontWeight:700,color:lvlC(p),fontFamily:"Georgia,serif",marginTop:"4px"}}>{session.score}/{session.total} <span style={{fontSize:"1rem",opacity:.6}}>({p}%)</span></div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"0.62rem",color:T.textSecondary,marginBottom:"4px"}}>TIME</div>
              <div style={{fontSize:"1.1rem",fontWeight:700,color:T.midnight,fontFamily:"monospace"}}>{session.timeUsed}</div>
              <div style={{marginTop:"8px",fontSize:"0.75rem",background:"#ddeaf7",color:T.midnight,border:"1px solid #9dbfe0",borderRadius:T.xs,padding:"3px 10px",fontWeight:700}}>📝 PRACTICE</div>
            </div>
          </div>

          {/* Per-question review */}
          <div style={{padding:"1.25rem 1.5rem"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.75rem"}}>QUESTION REVIEW</div>
            {history.map((item, i) => {
              const { q, chosen, correct: isCorrect } = item;
              return (
                <div key={q.id} style={{display:"flex",gap:"0.75rem",marginBottom:"0.6rem",padding:"0.75rem 0.9rem",background:isCorrect?T.successBg:T.dangerBg,border:`1px solid ${isCorrect?T.successBd:T.dangerBd}`,borderRadius:"4px"}}>
                  <div style={{width:"22px",height:"22px",borderRadius:"50%",background:isCorrect?T.success:T.dangerText,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"2px"}}>
                    <span style={{color:T.white,fontSize:"0.7rem",fontWeight:700}}>{i+1}</span>
                  </div>
                  <div style={{flex:1,fontSize:"0.82rem"}}>
                    <div style={{color:T.textSecondary,fontSize:"0.63rem",letterSpacing:"0.08em",marginBottom:"2px"}}>{q.standard}{item.timeSecs ? ` · ${item.timeSecs}s` : ""}</div>
                    <div style={{color:T.text,fontFamily:"Georgia,serif",marginBottom:isCorrect?0:"4px"}}><MathText text={q.question}/></div>
                    {q.type==="plotpoint" && !isCorrect && (
                      <div style={{margin:"6px 0"}}>
                        <PlotGrid answer={q.answer} placed={chosen?(()=>{try{return JSON.parse(chosen);}catch{return null;}})():null} revealed readOnly size={180}/>
                      </div>
                    )}
                    {!isCorrect && q.type!=="plotpoint" && q.type!=="dragdrop" && (
                      <div style={{fontSize:"0.78rem"}}>
                        <span style={{color:T.success}}>Correct: <strong><MathText text={typeof q.correct==="object"?JSON.stringify(q.correct):q.correct}/></strong></span>
                        {chosen && <span style={{color:T.dangerText}}> · Your answer: <MathText text={chosen}/></span>}
                      </div>
                    )}
                    {!isCorrect && q.type==="dragdrop" && (
                      <div style={{fontSize:"0.78rem"}}>
                        <span style={{color:T.success}}>Correct placement: </span>
                        {(q.items||[]).filter(it=>(q.correct||{})[it]!=="distractor").map(it=>(
                          <span key={it} style={{display:"inline-block",background:"#e8f5e9",borderRadius:"3px",padding:"1px 6px",margin:"1px 2px",fontSize:"0.72rem"}}>
                            <strong>{it}</strong> → {(q.zones||[])[(q.correct||q.answer||{})[it]]||"?"}
                          </span>
                        ))}
                      </div>
                    )}
                    {q.explanation && !isCorrect && (
                      <div style={{fontSize:"0.75rem",color:T.textSecondary,marginTop:"4px",fontStyle:"italic"}}><MathText text={q.explanation}/></div>
                    )}
                  </div>
                  <span style={{fontWeight:700,fontSize:"0.9rem",color:isCorrect?T.success:T.dangerText}}>{isCorrect?"✓":"✗"}</span>
                </div>
              );
            })}
          </div>

          <div style={{padding:"1rem 1.5rem",borderTop:`1px solid ${T.border}`,display:"flex",gap:"0.75rem",justifyContent:"flex-end"}}>
            <button onClick={onReset} style={{background:T.success,color:T.white,border:"none",borderRadius:T.xs,padding:"0.65rem 1.75rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600}}>Practice Again</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Student Test ───────────────────────────────────────────
function normalizeQuestion(q) {
  // Normalize answer field — may be stored as JSON string or array
  let answer = q.answer;
  if (typeof answer === "string") {
    try { answer = JSON.parse(answer); } catch (e) { console.warn("Could not parse question answer field:", e); answer = null; }
  }
  // Detect plotpoint: explicit type OR answer is [x,y] and choices are empty
  const hasRealChoices = Array.isArray(q.choices) && q.choices.filter(c => c).length > 0;
  const isPlotAnswer   = Array.isArray(answer) && answer.length === 2 &&
                         typeof answer[0] === "number" && typeof answer[1] === "number";
  const type = (q.type === "plotpoint" || (isPlotAnswer && !hasRealChoices))
    ? "plotpoint"
    : (["multiselect","keypad","dragdrop","hotspot"].includes(q.type) ? q.type : "mcq");
  return { ...q, type, answer };
}

function StudentTest({ studentName, studentId, testCode, questions: initialQuestions, adaptive, onFinish, untimed=false, timeLimitSecs=1800, warnSecs=300 }) {
  // ── Session persistence key ──
  const sessionKey = testCode && studentId ? `mathready_test_${testCode}_${studentId}` : null;

  // Restore saved state from sessionStorage (runs once, synchronously before first render)
  const restored = useRef(null);
  if (restored.current === null) {
    restored.current = false;
    if (sessionKey) {
      try {
        const raw = sessionStorage.getItem(sessionKey);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === "object" && saved.endTime) {
            restored.current = saved;
          }
        }
      } catch (e) { console.warn("Could not restore saved test state:", e); }
    }
  }

  const [questions, setQuestions] = useState(initialQuestions.map(normalizeQuestion));
  const [weights,   setWeights]   = useState({});
  const [seenIds,   setSeenIds]   = useState(new Set(initialQuestions.map(q=>q.id)));
  const TOTAL = questions.length;
  const [cur,   setCur]   = useState(restored.current ? (restored.current.cur ?? 0) : 0);
  const [ans,   setAns]   = useState(restored.current ? (restored.current.ans ?? {}) : {});
  const [flg,   setFlg]   = useState(restored.current ? (restored.current.flg ?? {}) : {});
  const [secs,     setSecs]     = useState(untimed ? 0 : timeLimitSecs);
  const [paused,   setPaused]   = useState(false);
  const [stopped,  setStopped]  = useState(false);
  const endTimeRef    = useRef(
    untimed ? null
    : restored.current?.endTime ? restored.current.endTime
    : Date.now() + timeLimitSecs * 1000
  );
  const pausedAtRef   = useRef(null);   // timestamp when pause started
  const submittedRef  = useRef(false);
  const [modal, setModal] = useState(false);
  const [nav,   setNav]   = useState(window.innerWidth > 640);

  const qTimeRef    = useRef({});   // {questionId: accumulatedMs}
  const prevCurRef  = useRef(cur);
  const qEnteredRef = useRef(Date.now());

  // Auto-submit if restored endTime is already in the past
  useEffect(() => {
    if (restored.current && !untimed && endTimeRef.current && endTimeRef.current <= Date.now()) {
      doSubmit();
    }
  }, []); // eslint-disable-line

  // Persist test state to sessionStorage on every answer / navigation / flag change
  useEffect(() => {
    if (!sessionKey || submittedRef.current) return;
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify({
        ans, cur, flg,
        endTime: endTimeRef.current,
      }));
    } catch (e) { console.warn("Could not persist test state to sessionStorage:", e); }
  }, [ans, cur, flg, sessionKey]);

  // Track time spent per question as cur changes
  useEffect(() => {
    const prevCur = prevCurRef.current;
    const elapsed = Date.now() - qEnteredRef.current;
    const prevQId = questions[prevCur]?.id;
    if (prevQId) {
      qTimeRef.current[prevQId] = (qTimeRef.current[prevQId] || 0) + elapsed;
    }
    prevCurRef.current = cur;
    qEnteredRef.current = Date.now();
  }, [cur]); // eslint-disable-line

  // Adaptive: fetch student history and seed weights
  useEffect(() => {
    if (!adaptive) return;
    async function seedWeights() {
      try {
        const hRes = studentId
          ? await fetch(`${API}/student/history/${encodeURIComponent(studentId)}`).then(r=>r.json()).catch(()=>[])
          : [];
        const initW = buildWeightMap(Array.isArray(hRes) ? hRes : []);
        ALL_STANDARDS.forEach(std => { if (!initW[std]) initW[std] = 0.5; });
        setWeights(initW);
      } catch (e) { console.warn("Failed to seed adaptive weights:", e); }
    }
    seedWeights();
  }, [adaptive, studentId]);  // eslint-disable-line

  // Grade a single answer — handles all question types (MCQ, multiselect, keypad, plotpoint, hotspot)
  function gradeOne(q, given) {
    if (!given) return false;
    if (q.type === "plotpoint") {
      const ans = Array.isArray(q.answer) ? q.answer
        : (()=>{ try { return JSON.parse(q.answer); } catch { return null; } })();
      return given === JSON.stringify(ans);
    }
    if (q.type === "multiselect") {
      const correct = Array.isArray(q.answer) ? q.answer : [];
      try {
        const given_arr = JSON.parse(given);
        return JSON.stringify([...given_arr].sort()) === JSON.stringify([...correct].sort());
      } catch { return false; }
    }
    if (q.type === "keypad") {
      return String(q.answer ?? "").trim().toLowerCase() === String(given).trim().toLowerCase();
    }
    if (q.type === "hotspot") {
      try {
        const g = JSON.parse(given); const c = q.answer || {};
        const sps = q.snapPoints || []; const correctSps = sps.filter(sp => c[sp.id]);
        const isDot = q.assetType === "dot" || q.assetType === "pin"; const TOL = 2.5;
        if (!Array.isArray(g) || g.length !== correctSps.length) return false;
        const matched = correctSps.filter(sp => g.some(pt => {
          const d = Math.sqrt((sp.x-pt.x)**2+(sp.y-pt.y)**2);
          return d <= TOL && (isDot || pt.val === c[sp.id]);
        }));
        return matched.length === correctSps.length;
      } catch { return false; }
    }
    return given === q.correct;
  }

  // Adaptive: when student answers, swap in an adaptive next question
  function handleAdaptiveAnswer(qId, choice) {
    if (!adaptive) return;
    setAns(prev => {
      const newAns = {...prev, [qId]: choice};
      // Build mini history from current answers — use gradeOne for all question types
      const miniHistory = questions.slice(0, cur+1).map(q => ({
        q, chosen: newAns[q.id], correct: gradeOne(q, newAns[q.id])
      }));
      const newW = updateSessionWeights(weights, miniHistory, ALL_STANDARDS);
      setWeights(newW);
      // Replace the NEXT question in the queue if there is one
      if (cur + 1 < questions.length) {
        const newSeen = new Set([...seenIds]);
        const nextQ = pickAdaptiveQuestion(initialQuestions, newW, newSeen, ALL_STANDARDS);
        if (nextQ && nextQ.id !== questions[cur+1].id) {
          setQuestions(qs => {
            const updated = [...qs];
            updated[cur+1] = normalizeQuestion(nextQ);
            return updated;
          });
          setSeenIds(s => new Set([...s, nextQ.id]));
        }
      }
      return newAns;
    });
  }

  // Countdown timer (skipped if untimed) — uses Date.now() to avoid drift
  useEffect(()=>{
    if (untimed) return;
    if (paused) {
      // Record when we paused so we can shift endTime on resume
      if (!pausedAtRef.current) pausedAtRef.current = Date.now();
      return;
    }
    // Resuming from pause — shift endTime by the duration we were paused
    if (pausedAtRef.current) {
      const pausedMs = Date.now() - pausedAtRef.current;
      endTimeRef.current += pausedMs;
      pausedAtRef.current = null;
    }
    const t = setInterval(()=>{
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000));
      setSecs(remaining);
    }, 250);
    return () => clearInterval(t);
  }, [paused, untimed]);

  // Auto-submit when timer reaches 0
  const hasStartedRef = useRef(false);
  useEffect(()=>{
    if (untimed) return;
    // Skip the initial render (secs starts at timeLimitSecs, not 0, but guard anyway)
    if (!hasStartedRef.current) { hasStartedRef.current = true; return; }
    if (secs === 0 && !submittedRef.current) {
      submittedRef.current = true;
      doSubmit();
    }
  }, [secs]); // eslint-disable-line

  // Poll for teacher pause/stop/extensions every 5s
  const appliedExtRef = useRef(0); // total seconds already added to timer
  useEffect(()=>{
    const t = setInterval(async () => {
      try {
        const r = await fetch(`${API}/test/control`);
        const d = await r.json();
        setPaused(!!d.paused);
        if (d.stopped && !stopped) { setStopped(true); }
        // Apply any new time extension granted for this student
        if (!untimed && d.extensions) {
          const granted = d.extensions[studentName] || 0;
          if (granted > appliedExtRef.current) {
            const newSecs = granted - appliedExtRef.current;
            appliedExtRef.current = granted;
            endTimeRef.current += newSecs * 1000;
          }
        }
      } catch (e) { console.warn("Teacher control poll failed:", e); }
    }, 5000);
    return () => clearInterval(t);
  }, [stopped, untimed, studentName]);
  useEffect(()=>{
    sendHeartbeat(studentName, cur);
    const t = setInterval(()=>sendHeartbeat(studentName, cur), 30000);
    return()=>clearInterval(t);
  },[studentName, cur]);

  // ── Lockdown ────────────────────────────────────────────
  const containerRef = useRef();
  const [violations,    setViolations]    = useState(0);
  const [violationLog,  setViolationLog]  = useState([]); // [{reason, time, questionNum}]
  const [lockWarning,   setLockWarning]   = useState(null); // message string or null
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [graceWarning,  setGraceWarning]  = useState(false); // gentle "please return" prompt
  const fsGraceTimer    = useRef(null);

  function addViolation(reason) {
    setViolations(v => v + 1);
    setViolationLog(log => [...log, { reason, time: new Date().toISOString(), questionNum: cur + 1 }]);
    setLockWarning(reason);
  }

  // Enter fullscreen on mount
  useEffect(() => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().then(()=>setIsFullscreen(true)).catch((e)=>{ console.warn("Could not enter fullscreen:", e); });
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();

    return () => {
      if (document.exitFullscreen && document.fullscreenElement) document.exitFullscreen();
    };
  }, []);

  // Detect fullscreen exit — 3-second grace period before counting as violation
  useEffect(() => {
    function onFsChange() {
      const inFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(inFs);
      if (!inFs) {
        // Show gentle prompt immediately, start grace timer
        setGraceWarning(true);
        if (fsGraceTimer.current) clearTimeout(fsGraceTimer.current);
        fsGraceTimer.current = setTimeout(() => {
          // Still not in fullscreen after grace period — count violation
          const stillFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
          if (!stillFs) {
            setGraceWarning(false);
            addViolation("Oops! You left the test screen. Please click below to get back to your test.");
          }
        }, 3000);
      } else {
        // Returned to fullscreen — cancel grace timer, clear gentle prompt
        if (fsGraceTimer.current) { clearTimeout(fsGraceTimer.current); fsGraceTimer.current = null; }
        setGraceWarning(false);
      }
    }
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      if (fsGraceTimer.current) clearTimeout(fsGraceTimer.current);
    };
  }, []);

  // Detect tab/window blur
  useEffect(() => {
    function onBlur()       { addViolation("Looks like you clicked away from the test. Click below to get back."); }
    function onVisibility() { if (document.hidden) addViolation("Looks like you switched away from the test. Click below to get back."); }
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Block keyboard shortcuts and right-click
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    // Block keyboard shortcuts
    function onKey(e) {
      const bad = (
        (e.ctrlKey || e.metaKey) && ["c","v","u","a","s","p"].includes(e.key.toLowerCase()) ||
        (e.ctrlKey && e.shiftKey && ["i","j","c","k"].includes(e.key.toLowerCase())) ||
        e.key === "F12" || e.key === "PrintScreen" || e.key === "F5"
      );
      if (bad) { e.preventDefault(); e.stopPropagation(); setDevToolsOpen(true); setViolations(v=>v+1); }
    }
    function onContext(e) { e.preventDefault(); }
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("contextmenu", onContext, true);

    // Devtools size detection — fires when devtools panel opens/closes
    function checkDevTools() {
      const threshold = 160;
      const widthDiff  = window.outerWidth  - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const open = widthDiff > threshold || heightDiff > threshold;
      setDevToolsOpen(prev => {
        if (open && !prev) setViolations(v => v + 1);
        return open;
      });
    }
    const dtInterval = setInterval(checkDevTools, 800);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("contextmenu", onContext, true);
      clearInterval(dtInterval);
    };
  }, []);

  // Warn before leaving page
  useEffect(() => {
    function onBeforeUnload(e) { e.preventDefault(); e.returnValue = ""; }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  function reEnterFullscreen() {
    const el = document.documentElement;
    if (fsGraceTimer.current) { clearTimeout(fsGraceTimer.current); fsGraceTimer.current = null; }
    setGraceWarning(false);
    if (el.requestFullscreen) el.requestFullscreen().then(()=>{ setIsFullscreen(true); setLockWarning(null); }).catch((e)=>{ console.warn("Could not re-enter fullscreen:", e); });
    else if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); setLockWarning(null); }
  }

  const q = questions[cur];
  if (!q) return <div style={{padding:"3rem",textAlign:"center",color:T.textSecondary}}>Loading…</div>;

  const sel  = ans[q.id] ?? null;
  const isFl = flg[q.id] ?? false;
  const ansCount = Object.keys(ans).length;
  const flgCount = Object.values(flg).filter(Boolean).length;

  function gradeAnswer(q, given) {
    if (!given) return false;
    if (q.type === "plotpoint") {
      const ans = Array.isArray(q.answer) ? q.answer
        : (()=>{ try { return JSON.parse(q.answer); } catch { return null; } })();
      return given === JSON.stringify(ans);
    }
    if (q.type === "multiselect") {
      const correct = Array.isArray(q.answer) ? q.answer : [];
      try {
        const given_arr = JSON.parse(given);
        return JSON.stringify([...given_arr].sort()) === JSON.stringify([...correct].sort());
      } catch { return false; }
    }
    if (q.type === "keypad") {
      return String(q.answer ?? "").trim().toLowerCase() === String(given).trim().toLowerCase();
    }
    if (q.type === "dragdrop") {
      try { const g=JSON.parse(given); const correct=q.correct||q.answer||{}; return (q.items||[]).every(item=>{const c=correct[item]; if(c==="distractor") return g[item]===undefined; return g[item]===c;}); } catch { return false; }
    }
    if (q.type === "hotspot") {
      try {
        const g = JSON.parse(given); const c = q.answer || {};
        const sps = q.snapPoints || []; const correctSps = sps.filter(sp => c[sp.id]);
        const isDot = q.assetType === "dot" || q.assetType === "pin"; const TOL = 2.5;
        if (!Array.isArray(g) || g.length !== correctSps.length) return false;
        const matched = correctSps.filter(sp => g.some(pt => {
          const d = Math.sqrt((sp.x-pt.x)**2+(sp.y-pt.y)**2);
          return d <= TOL && (isDot || pt.val === c[sp.id]);
        }));
        return matched.length === correctSps.length;
      } catch { return false; }
    }
    return given === q.correct;
  }

  async function doSubmit() {
    if (submittedRef.current) return;   // guard against double-submit
    submittedRef.current = true;
    // Clear persisted session state on submit
    if (sessionKey) { try { sessionStorage.removeItem(sessionKey); } catch (e) { console.warn("Could not clear session state:", e); } }
    const score = questions.reduce((a,q) => {
      const given = ans[q.id] ?? null;
      return a + (gradeAnswer(q, given) ? 1 : 0);
    }, 0);
    // Finalize time on current question
    const finalElapsed = Date.now() - qEnteredRef.current;
    const curQId = questions[cur]?.id;
    if (curQId) qTimeRef.current[curQId] = (qTimeRef.current[curQId] || 0) + finalElapsed;

    const questionTimes = questions.map(q => ({
      qId:      q.id,
      standard: q.standard || "",
      dok:      q.dok || null,
      timeSecs: Math.round((qTimeRef.current[q.id] || 0) / 1000),
      correct:  gradeAnswer(q, ans[q.id] ?? null),
    }));

    const session = { score, total:TOTAL, pct:pct(score,TOTAL), submitted:now(), timeUsed:untimed ? fmtTime(0) : fmtTime(timeLimitSecs-secs), answers:{...ans}, violations, violationLog, questionTimes };
    onFinish(session);
  }

  return (
    <div ref={containerRef} style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:T.font,background:"#e8edf2",overflow:"hidden",userSelect:"none",WebkitUserSelect:"none"}}>

      {/* Teacher stopped the test */}
      {stopped && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
          <div style={{background:T.white,borderRadius:T.r,maxWidth:"420px",width:"100%",overflow:"hidden",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.5)"}}>
            <div style={{background:T.dangerText,color:T.white,padding:"1.25rem"}}>
              <div style={{fontSize:"1.5rem",marginBottom:"4px"}}>🛑</div>
              <div style={{fontWeight:700,fontSize:"1.1rem"}}>Test Stopped by Teacher</div>
            </div>
            <div style={{padding:"1.5rem"}}>
              <p style={{fontSize:"0.92rem",color:"#333",marginBottom:"1.25rem"}}>Your teacher has ended the test. Please submit your answers now.</p>
              <button onClick={()=>{ setStopped(false); setModal(true); }}
                style={{width:"100%",background:T.midnight,color:T.white,border:"none",borderRadius:"4px",padding:"0.85rem",fontSize:"0.95rem",fontWeight:700,cursor:"pointer"}}>
                Submit My Answers →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher paused the test */}
      {paused && !stopped && (
        <div style={{position:"fixed",inset:0,zIndex:9998,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:T.white,borderRadius:T.r,maxWidth:"360px",width:"100%",padding:"2rem",textAlign:"center",boxShadow:"0 8px 40px rgba(0,0,0,.4)"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"0.5rem"}}>⏸</div>
            <div style={{fontWeight:700,fontSize:"1.1rem",color:T.midnight,marginBottom:"0.5rem"}}>Test Paused</div>
            <div style={{fontSize:"0.85rem",color:T.textSecondary}}>Your teacher has paused the test. Please wait.</div>
          </div>
        </div>
      )}

      {/* Grace period gentle prompt — shown immediately when fullscreen is exited, before counting a violation */}
      {graceWarning && !lockWarning && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
          <div style={{background:T.white,borderRadius:T.r,maxWidth:"400px",width:"100%",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.3)"}}>
            <div style={{background:T.midnight,color:T.white,padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <span style={{fontSize:"1.3rem"}}>&#x1F4CB;</span>
              <div style={{fontWeight:700,fontSize:"1rem"}}>Please return to fullscreen to continue your test.</div>
            </div>
            <div style={{padding:"1.5rem"}}>
              <div style={{fontSize:"0.85rem",color:T.textSecondary,marginBottom:"1.25rem",lineHeight:1.5}}>
                It looks like you left fullscreen. Click below to go back — no worries!
              </div>
              <button onClick={reEnterFullscreen}
                style={{width:"100%",background:T.midnight,color:T.white,border:"none",borderRadius:"4px",padding:"0.75rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer"}}>
                Return to Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lockdown warning overlay — shown after grace period expires or for non-fullscreen violations */}
      {lockWarning && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
          <div style={{background:T.white,borderRadius:T.r,maxWidth:"420px",width:"100%",overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,.4)"}}>
            <div style={{background:"#d97706",color:T.white,padding:"1rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <span style={{fontSize:"1.3rem"}}>&#x1F514;</span>
              <div>
                <div style={{fontWeight:700,fontSize:"1rem"}}>Heads Up</div>
                <div style={{fontSize:"0.72rem",opacity:.85}}>Let's get back on track</div>
              </div>
            </div>
            <div style={{padding:"1.5rem"}}>
              <div style={{fontSize:"0.92rem",color:"#333",marginBottom:"1.25rem",lineHeight:1.5}}>
                {lockWarning}
              </div>
              <div style={{fontSize:"0.72rem",color:"#999",marginBottom:"1rem"}}>
                Times left fullscreen: {violations}
              </div>
              <button onClick={reEnterFullscreen}
                style={{width:"100%",background:T.midnight,color:T.white,border:"none",borderRadius:"4px",padding:"0.75rem",fontSize:"0.9rem",fontWeight:700,cursor:"pointer"}}>
                Continue My Test
              </button>
            </div>
          </div>
        </div>
      )}

      <TopBar title="Grade 5 Math" right={
        <div style={{display:"flex",gap:"1rem",alignItems:"center"}}>
          {devToolsOpen && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"1.5rem"}}>
            <div style={{fontSize:"3rem"}}>🚫</div>
            <div style={{color:T.white,fontSize:"1.3rem",fontWeight:700,textAlign:"center",maxWidth:"380px"}}>
              Please Close Developer Tools
            </div>
            <div style={{color:"#ffb3b3",fontSize:"0.95rem",textAlign:"center",maxWidth:"340px",lineHeight:1.5}}>
              Developer tools need to be closed before you can continue your test.
            </div>
            <div style={{color:T.textSecondary,fontSize:"0.75rem"}}>Press F12 or close the DevTools panel to dismiss this screen.</div>
          </div>
        )}
        {violations > 0 && (
            <div style={{background:"rgba(255,255,255,0.15)",borderRadius:T.xs,padding:"2px 8px",fontSize:"0.6rem",fontWeight:600,color:"rgba(255,255,255,0.7)"}}>
              {violations}x left fullscreen
            </div>
          )}
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"0.75rem",opacity:.6,letterSpacing:"0.08em"}}>TIME</div>
            <div style={{fontSize:"1rem",fontWeight:"bold",fontFamily:"monospace",color:(!untimed&&secs<warnSecs)?"#ffaaaa":T.white}}>
              {untimed ? "∞" : fmtTime(secs)}
            </div>
          </div>
          <div style={{textAlign:"right",display:window.innerWidth>480?"block":"none"}}>
            <div style={{fontSize:"0.75rem",opacity:.6,letterSpacing:"0.08em"}}>STUDENT</div>
            <div style={{fontSize:"0.78rem",fontWeight:600}}>{studentName}</div>
          </div>
        </div>
      }/>

      <div style={{background:"#004e94",color:"#cce0f5",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 0.75rem",height:"30px",flexShrink:0,fontSize:"0.8rem"}}>
        <div style={{display:"flex",gap:"0.75rem",alignItems:"center"}}>
          <button onClick={()=>setNav(o=>!o)} style={{background:"none",border:"none",color:"#cce0f5",cursor:"pointer",fontSize:"0.7rem",padding:0}}>{nav?"◀ Hide":"▶ Nav"}</button>
          <span style={{opacity:.5}}>|</span>
          <span>{ansCount}/{TOTAL} answered</span>
          {flgCount>0&&<><span style={{opacity:.5}}>|</span><span style={{color:T.warningBd}}>🚩{flgCount}</span></>}
        </div>
        <span style={{opacity:.65,fontSize:"0.78rem"}}>No Calculator</span>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {nav&&(
          <div style={{width:"156px",background:T.white,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
            <div style={{padding:"0.65rem 0.9rem",background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.14em",color:T.textSecondary}}>QUESTIONS</div>
            <div style={{padding:"0.5rem",display:"flex",flexWrap:"wrap",gap:"4px"}}>
              {questions.map((item,i)=>{
                const isAns=!!ans[item.id]; const isCur=i===cur; const isFg=!!flg[item.id];
                let bg=T.surface, border="#bcc8d4", color="#445";
                if (isCur)       { bg=T.midnight; border=T.midnight; color=T.white; }
                else if (isFg)   { bg=T.warningBg; border="#ffc107"; color=T.warning; }
                else if (isAns)  { bg="#d4edda"; border=T.success; color="#1a5c28"; }
                return <button key={item.id} onClick={()=>setCur(i)}
                  style={{width:"44px",height:"44px",borderRadius:T.xs,border:`2px solid ${border}`,background:bg,color,fontSize:"0.75rem",fontWeight:700,cursor:"pointer",position:"relative",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {isFg && !isCur ? <span style={{position:"absolute",top:"-4px",right:"-4px",fontSize:"0.55rem",lineHeight:1}}>🚩</span> : null}
                  {i+1}
                </button>;
              })}
            </div>
            <div style={{padding:"0.65rem 0.9rem",borderTop:`1px solid ${T.border}`,marginTop:"auto"}}>
              {[
                ["#d4edda",T.success,"Answered"],
                [T.warningBg,"#ffc107","Flagged for Review"],
                [T.surface,"#bcc8d4","Not Answered"],
              ].map(([bg,bd,lbl])=>(
                <div key={lbl} style={{display:"flex",alignItems:"center",gap:"6px",marginBottom:"4px",fontSize:"0.75rem",color:T.textSecondary}}>
                  <div style={{width:"13px",height:"13px",background:bg,border:`2px solid ${bd}`,borderRadius:"2px",flexShrink:0}}/>{lbl}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{flex:1,overflowY:"auto",padding:window.innerWidth>640?"1.25rem 1.75rem":"0.75rem",display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
              <span style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.midnight,background:"#ddeaf7",padding:"3px 8px",borderRadius:"2px",border:"1px solid #b3cde8"}}>{q.standard}</span>
              <span style={{fontSize:"0.78rem",color:T.textSecondary}}>Question {cur+1} of {TOTAL}</span>
            </div>
            <button onClick={()=>setFlg(p=>({...p,[q.id]:!p[q.id]}))}
              style={{display:"flex",alignItems:"center",gap:"5px",background:isFl?T.warningBg:"#f8f9fa",border:`1px solid ${isFl?"#ffc107":"#bcc8d4"}`,borderRadius:T.xs,padding:"5px 12px",cursor:"pointer",fontSize:"0.73rem",color:isFl?T.warning:T.textSecondary,fontWeight:isFl?700:400}}>
              🚩 {isFl?"Flagged":"Flag for Review"}
            </button>
          </div>
          <div style={{height:"1px",background:T.border}}/>
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"1.25rem 1.5rem"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.65rem"}}>QUESTION</div>
            <p style={{fontSize:"1.05rem",fontFamily:"Georgia,serif",color:"#0f0f0f",lineHeight:1.72,margin:0}}><MathText text={q.question}/></p>
            {q.questionImage&&q.type!=="hotspot"&&<img src={q.questionImage} alt="diagram" style={{maxWidth:"100%",maxHeight:"200px",marginTop:"0.75rem",borderRadius:T.xs,display:"block"}}/>}
          </div>
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"1.1rem 1.5rem"}}>
            {q.type === "plotpoint" ? (
              <>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.9rem"}}>PLOT YOUR ANSWER</div>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <PlotGrid
                    placed={sel ? (() => { try { return JSON.parse(sel); } catch { return null; } })() : null}
                    onPlace={pt => {
                      const v = JSON.stringify(pt);
                      setAns(p=>({...p,[q.id]:v}));
                      handleAdaptiveAnswer(q.id, v);
                    }}
                    size={Math.min(300, window.innerWidth - 80)}
                  />
                </div>
              </>
            ) : q.type === "keypad" ? (
              <>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.9rem"}}>TYPE YOUR ANSWER</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.65rem",alignItems:"flex-start"}}>
                  <input
                    type="text" inputMode="decimal"
                    value={sel ?? ""}
                    onChange={e => { setAns(p=>({...p,[q.id]:e.target.value})); handleAdaptiveAnswer(q.id, e.target.value); }}
                    placeholder="Enter your answer…"
                    style={{width:"100%",maxWidth:"260px",padding:"0.8rem 1rem",fontSize:"1.3rem",fontFamily:"monospace",fontWeight:700,border:`2px solid ${T.midnight}`,borderRadius:"4px",outline:"none",background:T.surface,color:"#0f0f0f",letterSpacing:"0.05em"}}
                  />
                  {sel && <div style={{fontSize:"0.72rem",color:T.textSecondary}}>Your answer: <strong>{sel}</strong></div>}
                </div>
              </>
            ) : q.type === "dragdrop" ? (
              <DragDropAnswer
                zones={q.zones||[]}
                items={q.items||[]}
                value={sel}
                onChange={v => { setAns(p=>({...p,[q.id]:v})); handleAdaptiveAnswer(q.id, v); }}
                revealed={false}
                correctMap={null}
                ddLayout={q.ddLayout||"categories"}
              />
            ) : q.type === "hotspot" ? (
              <HotspotAnswer
                questionImage={q.questionImage}
                snapPoints={q.snapPoints||[]}
                assets={q.items||[]}
                assetType={q.assetType||"tile"}
                assetReuse={q.assetReuse!==false}
                assetSize={q.assetSize||"md"}
                value={sel}
                onChange={v => { setAns(p=>({...p,[q.id]:v})); handleAdaptiveAnswer(q.id, v); }}
                revealed={false}
                answer={null}
              />
            ) : q.type === "multiselect" ? (
              <>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"4px"}}>SELECT ALL CORRECT ANSWERS</div>
                <div style={{fontSize:"0.7rem",color:T.textSecondary,marginBottom:"0.75rem"}}>Choose all that apply — there may be more than one correct answer.</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.55rem"}}>
                  {(q.choices||[]).filter(c=>c).map((choice,i)=>{
                    const selArr = (() => { try { return sel ? JSON.parse(sel) : []; } catch { return []; } })();
                    const chosen = selArr.includes(choice);
                    function toggleChoice() {
                      const next = chosen ? selArr.filter(c=>c!==choice) : [...selArr, choice];
                      const v = JSON.stringify(next);
                      setAns(p=>({...p,[q.id]: next.length ? v : null}));
                      handleAdaptiveAnswer(q.id, next.length ? v : null);
                    }
                    return <label key={i} onClick={toggleChoice}
                      style={{display:"flex",alignItems:"center",gap:"0.9rem",padding:"0.8rem 1rem",border:`2px solid ${chosen?T.midnight:T.border}`,borderRadius:T.xs,background:chosen?"#ddeaf7":T.surface,cursor:"pointer"}}>
                      <div style={{width:"22px",height:"22px",borderRadius:T.xs,border:`2px solid ${chosen?T.midnight:"#9aabba"}`,background:chosen?T.midnight:T.white,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {chosen && <span style={{color:T.white,fontSize:"0.8rem",fontWeight:900}}>✓</span>}
                      </div>
                      <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",color:"#0f0f0f"}}><MathText text={choice}/></span>
                    </label>;
                  })}
                </div>
              </>
            ) : (
              <>
                <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.9rem"}}>SELECT ONE ANSWER</div>
                <div style={{display:"flex",flexDirection:"column",gap:"0.55rem"}}>
                  {(q.choices||[]).filter(c=>c).length === 0 ? (
                    <div style={{color:T.textSecondary,fontSize:"0.85rem",padding:"1rem",textAlign:"center",border:`1px dashed ${T.border}`,borderRadius:"4px"}}>
                      ⚠ This question has no answer choices. Contact your teacher.
                    </div>
                  ) : (q.choices||[]).map((choice,i)=>{
                    const chosen = sel===choice;
                    return <label key={i} onClick={()=>{ setAns(p=>({...p,[q.id]:choice})); handleAdaptiveAnswer(q.id, choice); }}
                      style={{display:"flex",alignItems:"center",gap:"0.9rem",padding:"0.8rem 1rem",border:`2px solid ${chosen?T.midnight:T.border}`,borderRadius:T.xs,background:chosen?"#ddeaf7":T.surface,cursor:"pointer"}}>
                      <div style={{width:"26px",height:"26px",borderRadius:"50%",border:`2px solid ${chosen?T.midnight:"#9aabba"}`,background:chosen?T.midnight:T.white,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:"0.7rem",fontWeight:700,color:chosen?T.white:"#667"}}>{LETTERS[i]}</span>
                      </div>
                      <span style={{fontSize:"1rem",fontFamily:"Georgia,serif",color:"#0f0f0f"}}><MathText text={choice}/></span>
                    </label>;
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{background:T.white,borderTop:`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.65rem 1.5rem",flexShrink:0}}>
        <button onClick={()=>setCur(c=>Math.max(0,c-1))} disabled={cur===0}
          style={{background:cur===0?"#e8edf2":T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"7px 20px",fontSize:"0.83rem",cursor:cur===0?"not-allowed":"pointer",color:cur===0?T.textSecondary:"#333",fontWeight:600}}>◀ Back</button>
        <div style={{display:"flex",gap:"0.75rem",alignItems:"center",fontSize:"0.75rem"}}>
          <span style={{color:T.success,fontWeight:700}}>✓ {ansCount} answered</span>
          {flgCount>0&&<span style={{color:T.warning,fontWeight:700}}>🚩 {flgCount} flagged</span>}
          {TOTAL-ansCount>0&&<span style={{color:T.textSecondary}}>{TOTAL-ansCount} left</span>}
        </div>
        {cur<TOTAL-1
          ?<button onClick={()=>setCur(c=>c+1)} style={{background:T.midnight,border:"none",borderRadius:T.xs,padding:"7px 20px",fontSize:"0.83rem",cursor:"pointer",color:T.white,fontWeight:600}}>Next ▶</button>
          :<button onClick={()=>setModal(true)} style={{background:T.success,border:"none",borderRadius:T.xs,padding:"7px 20px",fontSize:"0.83rem",cursor:"pointer",color:T.white,fontWeight:700}}>Submit Test ✓</button>
        }
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:T.white,borderRadius:"4px",width:"100%",maxWidth:"400px",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.22)"}}>
            <div style={{background:T.midnight,color:T.white,padding:"0.9rem 1.25rem"}}>
              <div style={{fontSize:"0.65rem",letterSpacing:"0.12em",opacity:.7,marginBottom:"2px"}}>CONFIRMATION</div>
              <div style={{fontSize:"1rem",fontWeight:700}}>Submit Test?</div>
            </div>
            <div style={{padding:"1.25rem"}}>
              <div style={{display:"flex",gap:"1rem",marginBottom:"0.85rem",flexWrap:"wrap"}}>
                <div style={{flex:1,background:T.successBg,border:`1px solid ${T.successBd}`,borderRadius:"4px",padding:"0.65rem 0.85rem",textAlign:"center"}}>
                  <div style={{fontSize:"1.4rem",fontWeight:700,color:T.success}}>{ansCount}</div>
                  <div style={{fontSize:"0.65rem",color:T.textSecondary}}>Answered</div>
                </div>
                <div style={{flex:1,background:flgCount?T.warningBg:T.surface,border:`1px solid ${flgCount?"#ffc107":T.border}`,borderRadius:"4px",padding:"0.65rem 0.85rem",textAlign:"center"}}>
                  <div style={{fontSize:"1.4rem",fontWeight:700,color:flgCount?T.warning:T.textSecondary}}>{flgCount}</div>
                  <div style={{fontSize:"0.65rem",color:T.textSecondary}}>Flagged</div>
                </div>
                <div style={{flex:1,background:TOTAL-ansCount?T.dangerBg:T.surface,border:`1px solid ${TOTAL-ansCount?T.dangerBd:T.border}`,borderRadius:"4px",padding:"0.65rem 0.85rem",textAlign:"center"}}>
                  <div style={{fontSize:"1.4rem",fontWeight:700,color:TOTAL-ansCount?T.dangerText:T.textSecondary}}>{TOTAL-ansCount}</div>
                  <div style={{fontSize:"0.65rem",color:T.textSecondary}}>Unanswered</div>
                </div>
              </div>
              {flgCount>0&&(
                <div style={{background:T.warningBg,border:"1px solid #ffc107",borderRadius:T.xs,padding:"0.6rem 0.85rem",marginBottom:"0.65rem",fontSize:"0.82rem",color:T.warning,display:"flex",alignItems:"center",justifyContent:"space-between",gap:"0.5rem"}}>
                  <span>🚩 You have <strong>{flgCount}</strong> question{flgCount>1?"s":""}  flagged for review.</span>
                  <button onClick={()=>{ setModal(false); const firstFlagged=questions.findIndex((_,i)=>flg[questions[i].id]); if(firstFlagged>=0)setCur(firstFlagged); }}
                    style={{background:"#ffc107",border:"none",borderRadius:T.xs,padding:"4px 10px",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",color:T.warning,whiteSpace:"nowrap"}}>
                    Review →
                  </button>
                </div>
              )}
              {TOTAL-ansCount>0&&<div style={{fontSize:"0.82rem",color:T.dangerText,background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:T.xs,padding:"0.55rem 0.85rem",marginBottom:"0.65rem"}}>⚠ {TOTAL-ansCount} question{TOTAL-ansCount>1?"s are":" is"} unanswered — these will be marked incorrect.</div>}
              <p style={{fontSize:"0.78rem",color:T.textSecondary,margin:0}}>Once submitted you cannot return to change your answers.</p>
            </div>
            <div style={{display:"flex",gap:"0.65rem",padding:"0.9rem 1.25rem",borderTop:`1px solid ${T.border}`}}>
              <button onClick={()=>setModal(false)} style={{flex:1,background:T.surfaceAlt,border:`1px solid ${T.border}`,borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600,color:"#333"}}>← Keep Working</button>
              <button onClick={doSubmit} style={{flex:1,background:T.success,border:"none",borderRadius:T.xs,padding:"0.65rem",fontSize:"0.85rem",cursor:"pointer",color:T.white,fontWeight:700}}>Submit Final ✓</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Drill Google Sign-In (no code required) ────────────────
function DrillLogin({ onSuccess, onBack }) {
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (resp) => {
        setLoading(true); setErr("");
        try {
          const r = await fetch(`${API}/auth/google/drill`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: resp.credential }),
          });
          const d = await r.json();
          if (!r.ok) { setErr(d.detail || "Sign-in failed."); setLoading(false); return; }
          onSuccess(d.student, d.cls);
        } catch { setErr("Could not connect. Try again."); setLoading(false); }
      },
      ux_mode: "popup",
      auto_select: false,
    });
    if (btnRef.current) {
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "outline", size: "large", text: "signin_with", shape: "rectangular", width: 280,
      });
    }
  }, []); // eslint-disable-line

  return (
    <div style={S.page}>
      <div style={{background:T.warning,width:"100%",padding:"0.85rem 2rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0}}>
        {onBack && <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",color:T.white,borderRadius:T.xs,padding:"6px 14px",cursor:"pointer",fontSize:"0.8rem"}}>← Back</button>}
        <div style={{color:T.white,fontSize:"0.95rem",fontWeight:700}}>⚡ Fact Fluency Practice</div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem",width:"100%"}}>
        <div style={S.card}>
          <div style={S.hdr}>
            <div style={S.hdrSub}>FACT FLUENCY</div>
            <div style={S.hdrTitle}>Sign in to Start Drilling</div>
          </div>
          <div style={{padding:"1.75rem 2rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.25rem"}}>
            <div style={{fontSize:"0.85rem",color:T.textSecondary,textAlign:"center",lineHeight:1.6}}>
              Sign in with your <strong>school Google account</strong>.<br/>
              You must be on a class roster to access drills.
            </div>
            {loading ? (
              <div style={{color:T.textSecondary,fontSize:"0.9rem"}}>Starting your drill…</div>
            ) : (
              <div ref={btnRef}></div>
            )}
            {err && <div style={{...S.errBox,width:"100%"}}>⚠ {err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fact Fluency Drill ─────────────────────────────────────
const DRILL_SECS = 180; // 3 minutes

// LEVEL_DEFS — 10 levels per operation, aligned to GA K-5 Math Standards
// Prerequisite gates enforced in pickDrillOp:
//   mul unlocks when add >= 4  (student has reached Grade 1 add facts)
//   div unlocks when sub >= 4 AND mul >= 6  (basic × facts mastered)
// LEVEL_DEFS — 10 levels per operation, aligned to GA K-5 Math Standards
//
// Grade bands per level:
//   Add/Sub  Lv 1-2 = K   |  Lv 3-4 = Gr 1  |  Lv 5-6 = Gr 2  |  Lv 7-8 = Gr 3  |  Lv 9-10 = Gr 4
//   Mul      Lv 1   = Gr2 foundation  |  Lv 2-7 = Gr 3  |  Lv 8-9 = Gr 4  |  Lv 10 = Gr 5
//   Div      Lv 1-5 = Gr 3  |  Lv 6-8 = Gr 4  |  Lv 9-10 = Gr 5
//
// Prerequisite gates (enforced in pickDrillOp):
//   mul unlocks when add >= 6 AND sub >= 6  (K–Grade 2 mastered)
//   div unlocks when sub >= 6 AND mul >= 6  (K–Grade 2 sub + all basic × facts mastered)
const LEVEL_DEFS = {
  add: [
    { desc: "Add within 5",                            standard: "K.NR.5", grade: "Kindergarten" }, // 1
    { desc: "Add within 10",                           standard: "K.NR.5", grade: "Kindergarten" }, // 2
    { desc: "Add within 20 (single digits)",           standard: "1.NR.2", grade: "Grade 1" },      // 3
    { desc: "2-digit + 1-digit, within 100",           standard: "1.NR.5", grade: "Grade 1" },      // 4
    { desc: "2-digit + 2-digit, within 100",           standard: "2.NR",   grade: "Grade 2" },      // 5
    { desc: "3-digit + 2-digit, within 1,000",         standard: "2.NR",   grade: "Grade 2" },      // 6
    { desc: "3-digit + 3-digit, fluently within 1,000",standard: "3.NR",   grade: "Grade 3" },      // 7
    { desc: "4-digit + 3-digit, within 10,000",        standard: "3.NR",   grade: "Grade 3" },      // 8
    { desc: "5-digit + 4-digit, within 100,000",       standard: "4.NR",   grade: "Grade 4" },      // 9
    { desc: "Add through hundred-thousands",            standard: "4.NR",   grade: "Grade 4" },      // 10
  ],
  sub: [
    { desc: "Subtract within 5",                           standard: "K.NR.5", grade: "Kindergarten" }, // 1
    { desc: "Subtract within 10",                          standard: "K.NR.5", grade: "Kindergarten" }, // 2
    { desc: "Subtract within 20",                          standard: "1.NR.2", grade: "Grade 1" },      // 3
    { desc: "2-digit − 1-digit, within 100",               standard: "1.NR.5", grade: "Grade 1" },      // 4
    { desc: "2-digit − 2-digit, within 100",               standard: "2.NR",   grade: "Grade 2" },      // 5
    { desc: "3-digit − 2-digit, within 1,000",             standard: "2.NR",   grade: "Grade 2" },      // 6
    { desc: "3-digit − 3-digit, fluently within 1,000",    standard: "3.NR",   grade: "Grade 3" },      // 7
    { desc: "4-digit − 3-digit, within 10,000",            standard: "3.NR",   grade: "Grade 3" },      // 8
    { desc: "5-digit − 4-digit, within 100,000",           standard: "4.NR",   grade: "Grade 4" },      // 9
    { desc: "Subtract through hundred-thousands",           standard: "4.NR",   grade: "Grade 4" },      // 10
  ],
  mul: [
    { desc: "Equal groups / arrays to 5×5",           standard: "2.NR",    grade: "Grade 2" },      // 1 — foundation
    { desc: "× 0 and × 1",                            standard: "3.PAR.3", grade: "Grade 3" },      // 2
    { desc: "× 2, × 5, × 10",                         standard: "3.PAR.3", grade: "Grade 3" },      // 3
    { desc: "× 3 and × 4",                            standard: "3.PAR.3", grade: "Grade 3" },      // 4
    { desc: "× 6 and × 7",                            standard: "3.PAR.3", grade: "Grade 3" },      // 5
    { desc: "× 8 and × 9 (within 100)",               standard: "3.PAR.3", grade: "Grade 3" },      // 6
    { desc: "× multiples of 10 (10–90)",              standard: "3.PAR.3", grade: "Grade 3" },      // 7
    { desc: "2-digit × 1-digit",                      standard: "4.NR",    grade: "Grade 4" },      // 8
    { desc: "4-digit × 1-digit or 2-digit × 2-digit", standard: "4.NR",    grade: "Grade 4" },      // 9
    { desc: "3-digit × 2-digit",                      standard: "5.NR",    grade: "Grade 5" },      // 10
  ],
  div: [
    { desc: "÷ 1 and ÷ 2, within 100",               standard: "3.PAR.3", grade: "Grade 3" },      // 1
    { desc: "÷ 3 and ÷ 4, within 100",               standard: "3.PAR.3", grade: "Grade 3" },      // 2
    { desc: "÷ 5 and ÷ 6, within 100",               standard: "3.PAR.3", grade: "Grade 3" },      // 3
    { desc: "÷ 7, ÷ 8, ÷ 9, within 100",             standard: "3.PAR.3", grade: "Grade 3" },      // 4
    { desc: "÷ multiples of 10",                      standard: "3.PAR.3", grade: "Grade 3" },      // 5
    { desc: "2-digit ÷ 1-digit",                      standard: "4.NR",    grade: "Grade 4" },      // 6
    { desc: "3-digit ÷ 1-digit",                      standard: "4.NR",    grade: "Grade 4" },      // 7
    { desc: "4-digit ÷ 1-digit",                      standard: "4.NR",    grade: "Grade 4" },      // 8
    { desc: "÷ 2-digit (≤ 25), 2–3-digit dividend",  standard: "5.NR",    grade: "Grade 5" },      // 9
    { desc: "÷ 2-digit (≤ 25), up to 4-digit",       standard: "5.NR",    grade: "Grade 5" },      // 10
  ],
};

const OP_LABEL = { add: "Addition", sub: "Subtraction", mul: "Multiplication", div: "Division" };
const OP_COLOR = { add: T.midnight, sub: T.success, mul: T.warning, div: "#5b1a8b" };
const OP_ICON  = { add: "+", sub: "−", mul: "×", div: "÷" };

function riD(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function genDrillProblem(op, level) {
  let a = 0, b = 0;
  let attempts = 0;
  const safe = (cond, gen) => { do { gen(); attempts++; } while (!cond() && attempts < 200); };

  if (op === "add") {
    // Lv1-2: K (within 5 / within 10)
    // Lv3-4: Gr1 (within 20 / 2+1-digit within 100)
    // Lv5-6: Gr2 (2+2 within 100 / 3+2 within 1,000)
    // Lv7-8: Gr3 (3+3 fluently within 1,000 / 4+3 within 10,000)
    // Lv9-10: Gr4 (within 100,000 / through hundred-thousands)
    if      (level === 1)  { a = riD(0,4); b = riD(0, 5-a); }
    else if (level === 2)  { safe(() => a+b >= 6 && a+b <= 10, () => { a=riD(0,9); b=riD(0,9); }); }  // sum 6-10 — never looks like Lv1 (≤5)
    else if (level === 3)  { safe(() => a+b >= 10 && a+b <= 18, () => { a=riD(2,9); b=riD(2,9); }); } // teen sums only — clearly Gr1, never looks like K
    else if (level === 4)  { a = riD(10,99); b = riD(1,9); }
    else if (level === 5)  { safe(() => a+b <= 100, () => { a=riD(10,90); b=riD(10,90); }); }
    else if (level === 6)  { a = riD(100,899); b = riD(10,99); }                              // sum ≤998
    else if (level === 7)  { safe(() => a+b <= 999 && b >= 100, () => { a=riD(100,899); b=riD(100,900); }); }  // 3+3 ≤999
    else if (level === 8)  { a = riD(1000,8999); b = riD(100,999); }                          // 4+3 ≤9998
    else if (level === 9)  { a = riD(10000,89999); b = riD(1000,9999); }                      // 5+4 ≤99998
    else                   { safe(() => a+b <= 999999, () => { a=riD(100000,899999); b=riD(10000,99999); }); } // through 999,999
    return { op, level, a, b, answer: a+b, display: `${a} + ${b}` };
  }

  if (op === "sub") {
    // Lv1-2: K | Lv3-4: Gr1 | Lv5-6: Gr2 | Lv7-8: Gr3 | Lv9-10: Gr4
    if      (level === 1)  { b = riD(0,4); a = riD(b, 5); }
    else if (level === 2)  { safe(() => a >= 6 && a > b, () => { a=riD(6,10); b=riD(0,a-1); }); }     // minuend 6-10 — never looks like Lv1 (≤5)
    else if (level === 3)  { b = riD(1,9); a = riD(Math.max(b+1,10), 20); }                   // always subtracting FROM a teen number (Gr1)
    else if (level === 4)  { a = riD(20,99); b = riD(1,9); }                                  // minuend ≥20 — no overlap with Lv3 (teens)
    else if (level === 5)  { a = riD(20,99); b = riD(10, a-1); }                              // 2-2 digit, a>b always
    else if (level === 6)  { a = riD(100,999); b = riD(10,99); }                              // 3-2 digit
    else if (level === 7)  { safe(() => a-b >= 10, () => { a=riD(201,999); b=riD(100,a-10); }); }  // 3-3 digit, diff ≥10 — no trivial results like 101-100=1
    else if (level === 8)  { a = riD(1000,9999); b = riD(100,999); }                          // 4-3 digit
    else if (level === 9)  { a = riD(10000,99999); b = riD(1000,9999); }                      // 5-4 digit
    else                   { a = riD(100000,999999); b = riD(10000,99999); }                   // through hundred-thousands
    return { op, level, a, b, answer: a-b, display: `${a} − ${b}` };
  }

  if (op === "mul") {
    // Lv1: Gr2 foundation (equal groups to 5×5)
    // Lv2-7: Gr3 (×0/1, ×2/5/10, ×3/4, ×6/7, ×8/9, ×multiples of 10)
    // Lv8-9: Gr4 (2-digit×1-digit; 4-digit×1-digit or 2-digit×2-digit)
    // Lv10: Gr5 (3-digit×2-digit)
    if      (level === 1)  { a = riD(1,5); b = riD(1,5); }
    else if (level === 2)  { a = riD(0,12); b = riD(0,1); }
    else if (level === 3)  { a = riD(2,12); b = [2,5,10][riD(0,2)]; }                          // a≥2 — prevents 1×b looking like Lv2
    else if (level === 4)  { a = riD(2,12); b = [3,4][riD(0,1)]; }                            // a≥2 — prevents 1×3=3 (trivial)
    else if (level === 5)  { a = riD(2,12); b = [6,7][riD(0,1)]; }                            // a≥2 — prevents 1×6=6 (trivial)
    else if (level === 6)  { a = riD(2,12); b = [8,9][riD(0,1)]; }                            // a≥2 — prevents 1×8=8 (trivial)
    else if (level === 7)  { a = riD(2,9); b = riD(1,9) * 10; }                               // a≥2 — prevents 1×10=10 (trivial)
    else if (level === 8)  { safe(() => a%10 !== 0, () => { a=riD(11,99); b=riD(2,9); }); }   // a not multiple of 10 — no overlap with Lv7
    else if (level === 9)  {                                                                    // 4-digit×1-digit OR 2-digit×2-digit
      if (Math.random() < 0.5) { a = riD(1000,9999); b = riD(2,9); }
      else                     { a = riD(10,99);     b = riD(10,99); }
    }
    else                   { a = riD(100,999); b = riD(10,99); }
    if (Math.random() < 0.5 && level >= 2) { const t=a; a=b; b=t; }
    return { op, level, a, b, answer: a*b, display: `${a} × ${b}` };
  }

  // div — Gr3: ÷1/2, ÷3/4, ÷5/6, ÷7/8/9, ÷multiples of 10
  //        Gr4: 2÷1, 3÷1, 4÷1  → Gr5: ÷2-digit ≤25 (small), ÷2-digit ≤25 (4-digit)
  if      (level === 1)  { b = [1,2][riD(0,1)]; a = b * riD(2,12); }                          // quotient ≥2 — prevents a÷a=1 (trivial)
  else if (level === 2)  { b = [3,4][riD(0,1)]; a = b * riD(2,12); }                          // quotient ≥2 — prevents 3÷3=1 (trivial)
  else if (level === 3)  { b = [5,6][riD(0,1)]; a = b * riD(2,10); }                          // quotient ≥2 — prevents 5÷5=1 (trivial)
  else if (level === 4)  { b = [7,8,9][riD(0,2)]; a = b * riD(2,10); }                        // quotient ≥2 — prevents 7÷7=1 (trivial)
  else if (level === 5)  { b = riD(2,9) * 10; a = b * riD(2,9); }                             // divisor ≥20, quotient ≥2 — no overlap with Lv1-4
  else if (level === 6)  { safe(() => a >= 10 && a <= 99, () => { b=riD(2,9); a=b*riD(2,Math.floor(99/b)); }); }
  else if (level === 7)  { safe(() => a >= 100 && a <= 999, () => { b=riD(2,9); a=b*riD(Math.ceil(100/b), Math.floor(999/b)); }); }
  else if (level === 8)  { safe(() => a >= 1000 && a <= 9999, () => { b=riD(2,9); a=b*riD(Math.ceil(1000/b), Math.floor(9999/b)); }); }
  else if (level === 9)  { b = riD(11,25); a = b * riD(2,9); }                                // divisor ≥11 — no overlap with Lv5 (multiples of 10)
  else                   { b = riD(11,25); a = b * riD(10, Math.floor(9999/b)); }             // divisor ≥11 — consistent with Lv9
  return { op, level, a, b, answer: a/b, display: `${a} ÷ ${b}` };
}

// Prerequisite gates (aligned to GA standards progression):
//   Multiplication unlocks when BOTH addition AND subtraction reach level 6
//     → student has mastered K through Grade 2 add/sub before starting Grade 3 multiplication
//   Division unlocks when subtraction >= 6 AND multiplication >= 6
//     → student has mastered K–Grade 2 sub AND all basic × facts (×0 through ×9) before dividing
function drillGates(levels) {
  const addLv = levels.add || 1;
  const subLv = levels.sub || 1;
  const mulLv = levels.mul || 1;
  return {
    mul: addLv >= 6 && subLv >= 6,   // K–Grade 2 add/sub complete
    div: subLv >= 6 && mulLv >= 6,   // K–Grade 2 sub complete + all basic × facts (×0–×9) mastered
  };
}

function pickDrillOp(levels, streaks) {
  const gates  = drillGates(levels);
  const ops    = ["add","sub"];
  if (gates.mul) ops.push("mul");
  if (gates.div) ops.push("div");

  const weights = ops.map(op => {
    const lv = levels[op] || 1;
    const sk = streaks[op] || 0;
    let w = 11 - lv; // level 1→10, level 10→1
    if (sk <= -2) w *= 1.5; // boost struggling op
    return Math.max(w, 0.5);
  });
  const total = weights.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < ops.length; i++) { r -= weights[i]; if (r <= 0) return ops[i]; }
  return ops[0];
}

const STAR_LABELS = ["", "Keep going! 📚", "Nice work! 👍", "Good job! ✨", "Great work! 🌟", "PERFECT! 🏆"];

// ── Drill session ───────────────────────────────────────────────────────────
function DrillSession({ student, cls, testCode, onDone, priorHistory = [], drillNumber = 1, parentBests, onBestsUpdate }) {
  const drillSecs = cls?.drillDuration || DRILL_SECS;
  const drillMins = drillSecs / 60;
  const [phase,    setPhase]    = useState("loading");
  const [levels,   setLevels]   = useState({ add:1, sub:1, mul:1, div:1 });
  const [problem,  setProblem]  = useState(null);
  const [inputVal, setInputVal] = useState("");
  const [newBest,  setNewBest]  = useState(null); // {accuracy: bool, ppm: bool}
  const [countdownNum, setCountdownNum] = useState(3);
  const [lastInput,setLastInput]= useState("");
  const [feedback, setFeedback] = useState(null); // {correct, correctAnswer}
  const [log,      setLog]      = useState([]);
  const [timeLeft, setTimeLeft] = useState(drillSecs);

  const levelsRef         = useRef({ add:1, sub:1, mul:1, div:1 });
  const streaksRef        = useRef({ add:0, sub:0, mul:0, div:0 });
  const logRef            = useRef([]);
  const fbTimer           = useRef(null);
  const inputRef          = useRef(null);
  const endedRef          = useRef(false);
  const drillEndTime      = useRef(null); // Date.now() + DRILL_SECS*1000
  const personalBestsRef  = useRef(parentBests || { bestAccuracy: 0, bestPPM: 0 });
  const sessionHistoryRef = useRef([]);
  const [dayStreak, setDayStreak] = useState(0);

  // Load saved levels and start drill
  useEffect(() => {
    async function init() {
      let lv = { add:1, sub:1, mul:1, div:1 };
      if (student?.id) {
        try {
          const r = await fetch(`${API}/fluency/progress/${encodeURIComponent(student.id)}`);
          if (r.ok) {
            const d = await r.json();
            lv = {
              add: Math.max(1, Math.min(10, d.add || 1)),
              sub: Math.max(1, Math.min(10, d.sub || 1)),
              mul: Math.max(1, Math.min(10, d.mul || 1)),
              div: Math.max(1, Math.min(10, d.div || 1)),
            };
            if (d.personalBests) personalBestsRef.current = d.personalBests;
            if (d.sessions) sessionHistoryRef.current = d.sessions;
            if (d.streakDays) setDayStreak(d.streakDays);
          }
        } catch (e) { console.warn("Could not load drill progress, starting from level 1:", e); }
      }
      levelsRef.current = lv;
      setLevels(lv);
      const op = pickDrillOp(lv, {});
      setProblem(genDrillProblem(op, lv[op]));
      setPhase("countdown");
    }
    init();
  }, []); // eslint-disable-line

  // 3-2-1 countdown before drill starts
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownNum <= 0) {
      drillEndTime.current = Date.now() + drillSecs * 1000;
      setPhase("active");
      return;
    }
    const t = setTimeout(() => setCountdownNum(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownNum]);

  // Countdown timer — uses Date.now() to avoid drift
  useEffect(() => {
    if (phase !== "active") return;
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.round((drillEndTime.current - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 250);
    return () => clearInterval(t);
  }, [phase]);

  // End when timer hits 0
  useEffect(() => {
    if (phase === "active" && timeLeft === 0 && !endedRef.current) {
      endedRef.current = true;
      endSession();
    }
  }, [timeLeft, phase]); // eslint-disable-line

  // Auto-focus input
  useEffect(() => {
    if (phase === "active" && !feedback && inputRef.current) inputRef.current.focus();
  }, [problem, feedback, phase]);

  const sessionHistRef = useRef([...priorHistory]); // grows across Play Again restarts

  function endSession() {
    clearTimeout(fbTimer.current);

    const totalP   = logRef.current.length;
    const correctP = logRef.current.filter(e => e.correct).length;

    // Append this session to history for the progress chart
    sessionHistRef.current = [
      ...priorHistory,
      { n: drillNumber, accuracy: totalP ? Math.round(correctP / totalP * 100) : 0,
        correct: correctP, total: totalP, ppm: parseFloat((totalP / drillMins).toFixed(1)) },
    ];

    // Check personal bests — skip first drill (beating 0 doesn't count)
    const accuracy = totalP ? Math.round(correctP / totalP * 100) : 0;
    const ppm = parseFloat((totalP / drillMins).toFixed(1));
    const pb = personalBestsRef.current;
    const hasHistory = (pb.bestAccuracy || 0) > 0 || (pb.bestPPM || 0) > 0;
    const isBestAcc = hasHistory && accuracy > (pb.bestAccuracy || 0);
    const isBestPPM = hasHistory && ppm > (pb.bestPPM || 0);
    if (isBestAcc || isBestPPM) setNewBest({ accuracy: isBestAcc, ppm: isBestPPM });
    // Update ref so back-to-back drills compare against latest bests
    const updatedBests = {
      bestAccuracy: Math.max(pb.bestAccuracy || 0, accuracy),
      bestPPM: Math.max(pb.bestPPM || 0, ppm),
    };
    personalBestsRef.current = updatedBests;
    if (onBestsUpdate) onBestsUpdate(updatedBests);

    setPhase("summary");
    const _acc   = totalP ? Math.round(correctP / totalP * 100) : 0;
    const _stars = _acc >= 90 ? 5 : _acc >= 75 ? 4 : _acc >= 60 ? 3 : _acc >= 40 ? 2 : 1;
    fetch(`${API}/fluency/session`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId:   student?.id   || "",
        studentName: student?.name || "",
        classId:     cls?.id       || "",
        className:   cls?.name     || "",
        testCode:    testCode      || "",
        levels:      { ...levelsRef.current },
        log:         logRef.current,
        submitted:   now(),
        stars:       _stars,
        drillDuration: drillSecs,
      }),
    }).then(r => r.ok ? r.json() : null).then(d => {
      if (d?.streak) setDayStreak(d.streak);
    }).catch((e) => { console.warn("Failed to save drill session to server:", e); });
  }

  function handleDone(dest) {
    onDone(dest, sessionHistRef.current);
  }

  function submitAnswer() {
    if (!problem || !inputVal.trim() || feedback) return;
    const given = Number(inputVal.trim());
    if (isNaN(given)) return;
    const correct = given === problem.answer;

    // Record
    const entry = { ...problem, studentAnswer: given, correct };
    logRef.current = [...logRef.current, entry];
    setLog([...logRef.current]);
    setLastInput(inputVal.trim());
    setInputVal("");

    // Update streak
    const curStreak = streaksRef.current[problem.op] || 0;
    const newStreak = correct
      ? (curStreak > 0 ? curStreak + 1 : 1)
      : (curStreak < 0 ? curStreak - 1 : -1);
    streaksRef.current = { ...streaksRef.current, [problem.op]: newStreak };

    // Level adjustment
    let newLevel = levelsRef.current[problem.op];
    if (newStreak >= 5)  newLevel = Math.min(10, newLevel + 1);
    if (newStreak <= -3) newLevel = Math.max(1,  newLevel - 1);
    if (newLevel !== levelsRef.current[problem.op]) {
      streaksRef.current = { ...streaksRef.current, [problem.op]: 0 };
    }
    levelsRef.current = { ...levelsRef.current, [problem.op]: newLevel };
    setLevels({ ...levelsRef.current });

    setFeedback({ correct, correctAnswer: problem.answer });
    clearTimeout(fbTimer.current);
    fbTimer.current = setTimeout(() => {
      setFeedback(null);
      const nextOp = pickDrillOp(levelsRef.current, streaksRef.current);
      setProblem(genDrillProblem(nextOp, levelsRef.current[nextOp]));
    }, correct ? 600 : 1500);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") { e.preventDefault(); submitAnswer(); }
  }

  // Loading
  if (phase === "loading") return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#e8edf2",fontFamily:T.font}}>
      <div style={{textAlign:"center",color:T.textSecondary}}>
        <div style={{fontSize:"2rem",marginBottom:"0.5rem"}}>⚡</div>
        <div>Loading your drill…</div>
      </div>
    </div>
  );

  // 3-2-1 Countdown
  if (phase === "countdown") return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(155deg,#0d1b2a 0%,#0f2d4a 55%,#133a5e 100%)",fontFamily:T.font}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"0.85rem",fontWeight:700,letterSpacing:"0.15em",color:"rgba(255,255,255,0.5)",marginBottom:"1.5rem"}}>
          GET READY
        </div>
        <div key={countdownNum} style={{
          fontSize: countdownNum > 0 ? "8rem" : "3.5rem",
          fontWeight:900, color:"#fff",
          animation:"countPop 0.4s ease-out",
          lineHeight:1,
        }}>
          {countdownNum > 0 ? countdownNum : "GO!"}
        </div>
        <style>{`@keyframes countPop { 0% { transform:scale(1.6);opacity:0.3 } 100% { transform:scale(1);opacity:1 } }`}</style>
      </div>
    </div>
  );

  // Summary
  if (phase === "summary") {
    const totalP   = logRef.current.length;
    const correct  = logRef.current.filter(e=>e.correct).length;
    const accuracy = totalP ? Math.round(correct/totalP*100) : 0;
    const ppm      = (totalP / drillMins).toFixed(1);
    const missed   = logRef.current.filter(e=>!e.correct);
    const chartData = sessionHistRef.current.map(s => ({ name: `#${s.n}`, Accuracy: s.accuracy }));

    // Glassmorphism card style
    const glassCard = {
      background:"rgba(255,255,255,0.07)",
      border:"1px solid rgba(255,255,255,0.13)",
      borderRadius:"16px",
      backdropFilter:"blur(6px)",
    };
    const sectionLabel = {
      fontSize:"0.6rem", fontWeight:700, letterSpacing:"0.14em",
      color:"rgba(255,255,255,0.45)", marginBottom:"0.6rem",
    };

    return (
      <div style={{minHeight:"100vh",
        background:"linear-gradient(155deg,#0d1b2a 0%,#0f2d4a 55%,#133a5e 100%)",
        fontFamily:T.font,display:"flex",flexDirection:"column"}}>

        {/* ── Header ── */}
        <div style={{background:"rgba(0,0,0,0.35)",color:T.white,
          padding:"0.8rem 1.5rem",display:"flex",alignItems:"center",gap:"0.75rem",
          backdropFilter:"blur(8px)",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{fontSize:"1rem",fontWeight:800,letterSpacing:"0.04em"}}>⚡ Drill Complete</div>
          <div style={{marginLeft:"auto",fontSize:"0.8rem",opacity:.6}}>{student?.name}</div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{flex:1,overflowY:"auto",padding:"1.25rem 1rem 2rem"}}>
          <div style={{maxWidth:"760px",margin:"0 auto",display:"flex",flexDirection:"column",gap:"1rem"}}>

            {/* ── Personal Best banner ── */}
            {newBest && (
              <div style={{
                background:"linear-gradient(135deg,#ffd700 0%,#ffaa00 100%)",
                borderRadius:"12px",padding:"0.75rem 1.25rem",
                display:"flex",alignItems:"center",gap:"0.75rem",
                animation:"pulseBest 0.6s ease-out",
                boxShadow:"0 4px 20px rgba(255,215,0,0.4)"
              }}>
                <span style={{fontSize:"1.8rem"}}>🏆</span>
                <div>
                  <div style={{fontWeight:800,fontSize:"1rem",color:T.text}}>Personal Best!</div>
                  <div style={{fontSize:"0.78rem",color:"#5a4500"}}>
                    {newBest.accuracy && newBest.ppm ? "New accuracy & speed record!" :
                     newBest.accuracy ? "New accuracy record!" : "New speed record!"}
                  </div>
                </div>
              </div>
            )}

            {/* ── Day streak banner ── */}
            {dayStreak >= 2 && (
              <div style={{
                ...glassCard, padding:"0.65rem 1.25rem",
                display:"flex",alignItems:"center",gap:"0.75rem",
              }}>
                <span style={{fontSize:"1.6rem"}}>🔥</span>
                <div>
                  <div style={{fontWeight:800,fontSize:"0.95rem",color:"#fbbf24"}}>{dayStreak}-Day Streak!</div>
                  <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.55)"}}>
                    {dayStreak >= 7 ? "You're on fire! Keep it going!" :
                     dayStreak >= 3 ? "Nice consistency! Don't break the chain!" :
                     "Come back tomorrow to keep your streak alive!"}
                  </div>
                </div>
              </div>
            )}

            {/* ── Hero row: character + stats ── */}
            <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",alignItems:"stretch"}}>

              {/* Stats card */}
              <div style={{...glassCard,flex:1,minWidth:"220px",padding:"1.25rem 1.5rem",
                display:"flex",flexDirection:"column",gap:"1rem"}}>

                {/* Accuracy + stat pills */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={sectionLabel}>3-MIN FACT FLUENCY</div>
                    <div style={{color:T.white,fontWeight:900,fontSize:"3.8rem",
                      lineHeight:1,fontFamily:"Georgia,serif",letterSpacing:"-2px"}}>
                      {accuracy}<span style={{fontSize:"2rem",letterSpacing:0}}>%</span>
                    </div>
                    <div style={{color:"rgba(255,255,255,0.45)",fontSize:"0.68rem",marginTop:"2px"}}>Accuracy</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:"0.55rem",textAlign:"right",marginTop:"0.25rem"}}>
                    {[["PROBLEMS",totalP,"#7ecfff"],["CORRECT",correct,"#2ecc71"],["PER MIN",ppm,"#ffd700"]]
                      .map(([k,v,c]) => (
                        <div key={k}>
                          <div style={{color:c,fontWeight:800,fontSize:"1.55rem",lineHeight:1}}>{v}</div>
                          <div style={{color:"rgba(255,255,255,0.38)",fontSize:"0.58rem",letterSpacing:"0.09em"}}>{k}</div>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Progress sparkline (shows after 2+ sessions) */}
                {chartData.length >= 2 && (
                  <div>
                    <div style={sectionLabel}>ACCURACY — RECENT SESSIONS</div>
                    <ResponsiveContainer width="100%" height={68}>
                      <AreaChart data={chartData} margin={{top:4,right:4,bottom:0,left:0}}>
                        <defs>
                          <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="10%" stopColor="#4ecdc4" stopOpacity={0.45}/>
                            <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name"
                          tick={{fill:"rgba(255,255,255,0.35)",fontSize:9}}
                          axisLine={false} tickLine={false}/>
                        <YAxis domain={[0,100]} hide/>
                        <Tooltip
                          contentStyle={{background:"#0f2d4a",border:"1px solid rgba(255,255,255,0.15)",
                            borderRadius:T.r,fontSize:"0.72rem",color:T.white}}
                          formatter={v=>[`${v}%`,"Accuracy"]}/>
                        <Area type="monotone" dataKey="Accuracy"
                          stroke="#4ecdc4" strokeWidth={2} fill="url(#accGrad)"
                          dot={{fill:"#4ecdc4",r:3,strokeWidth:0}}
                          activeDot={{r:5,fill:T.white,stroke:"#4ecdc4"}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* ── Level Progression Chart ── */}
            {sessionHistoryRef.current.length >= 2 && (() => {
              const levelData = sessionHistoryRef.current.map((s, i) => ({
                session: i + 1,
                Addition: s.levels?.add || 1,
                Subtraction: s.levels?.sub || 1,
                Multiplication: s.levels?.mul || 1,
                Division: s.levels?.div || 1,
              }));
              // Append current session
              levelData.push({
                session: levelData.length + 1,
                Addition: levelsRef.current.add,
                Subtraction: levelsRef.current.sub,
                Multiplication: levelsRef.current.mul,
                Division: levelsRef.current.div,
              });
              return (
                <div style={{...glassCard,padding:"1rem 1.25rem"}}>
                  <div style={sectionLabel}>LEVEL PROGRESSION</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={levelData} margin={{top:4,right:4,bottom:0,left:-20}}>
                      <XAxis dataKey="session" tick={{fill:"rgba(255,255,255,0.35)",fontSize:9}}
                        axisLine={false} tickLine={false} label={{value:"Session",position:"insideBottomRight",fill:"rgba(255,255,255,0.25)",fontSize:9,offset:-2}}/>
                      <YAxis domain={[1,10]} tick={{fill:"rgba(255,255,255,0.35)",fontSize:9}}
                        axisLine={false} tickLine={false}/>
                      <Tooltip contentStyle={{background:"#0f2d4a",border:"1px solid rgba(255,255,255,0.15)",borderRadius:T.r,fontSize:"0.72rem",color:T.white}}/>
                      <Legend wrapperStyle={{fontSize:"0.68rem",color:"rgba(255,255,255,0.6)"}}/>
                      <Line type="monotone" dataKey="Addition" stroke="#4ecdc4" strokeWidth={2} dot={{r:2}} />
                      <Line type="monotone" dataKey="Subtraction" stroke="#ff6b6b" strokeWidth={2} dot={{r:2}} />
                      <Line type="monotone" dataKey="Multiplication" stroke={T.warningBd} strokeWidth={2} dot={{r:2}} />
                      <Line type="monotone" dataKey="Division" stroke="#a78bfa" strokeWidth={2} dot={{r:2}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* ── Math Levels ── */}
            <div style={{...glassCard,overflow:"hidden"}}>
              <div style={{padding:"0.7rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.08)",
                fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",color:"rgba(255,255,255,0.45)"}}>
                YOUR MATH LEVELS
              </div>
              {(() => {
                const gates = drillGates(levelsRef.current);
                const opUnlocked = { add:true, sub:true, mul:gates.mul, div:gates.div };
                const unlockHint = {
                  mul:`Unlocks when Addition AND Subtraction both reach Level 6 (K–Grade 2 mastered)`,
                  div:`Unlocks when Subtraction reaches Level 6 AND Multiplication reaches Level 6 (all basic facts ×0–×9)`,
                };
                return ["add","sub","mul","div"].map(op => {
                  const lv    = levelsRef.current[op];
                  const def   = LEVEL_DEFS[op][lv - 1];
                  const opLog = logRef.current.filter(e => e.op === op);
                  const opOk  = opLog.filter(e => e.correct).length;
                  const locked = !opUnlocked[op];
                  return (
                    <div key={op} style={{display:"flex",alignItems:"center",gap:"0.9rem",
                      padding:"0.7rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.06)",
                      opacity:locked?0.4:1}}>
                      <div style={{width:"36px",height:"36px",borderRadius:"50%",flexShrink:0,
                        background:locked?"rgba(255,255,255,0.15)":OP_COLOR[op],
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:"1rem",color:T.white,fontWeight:700}}>
                        {locked ? "🔒" : OP_ICON[op]}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:"0.88rem",color:T.white}}>
                          {OP_LABEL[op]}{locked ? " — Locked" : ` — Level ${lv}/10`}
                        </div>
                        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,0.5)",marginTop:"1px"}}>
                          {locked ? unlockHint[op] : def.desc}
                        </div>
                        {!locked && (
                          <div style={{fontSize:"0.65rem",color:OP_COLOR[op],marginTop:"2px",fontWeight:600}}>
                            {def.grade} · {def.standard}
                          </div>
                        )}
                      </div>
                      {!locked && opLog.length > 0 && (
                        <div style={{textAlign:"right",fontSize:"0.78rem",color:"rgba(255,255,255,0.45)",flexShrink:0}}>
                          <strong style={{color:"#2ecc71",fontSize:"0.9rem"}}>{opOk}</strong>/{opLog.length}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* ── Missed problems ── */}
            {missed.length > 0 && (
              <div style={{...glassCard,overflow:"hidden"}}>
                <div style={{padding:"0.7rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.08)",
                  fontSize:"0.6rem",fontWeight:700,letterSpacing:"0.14em",color:"rgba(255,255,255,0.45)"}}>
                  REVIEW — MISSED PROBLEMS
                </div>
                {missed.map((item,i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:"1rem",
                    padding:"0.6rem 1.25rem",borderBottom:"1px solid rgba(255,255,255,0.05)",
                    background:"rgba(231,76,60,0.06)"}}>
                    <span style={{color:"#e74c3c",fontWeight:700,fontSize:"0.85rem"}}>✗</span>
                    <span style={{fontFamily:"monospace",fontSize:"0.97rem",fontWeight:700,
                      flex:1,color:"rgba(255,255,255,0.85)"}}>
                      {item.display} = <span style={{color:"#e74c3c"}}>{item.studentAnswer}</span>
                    </span>
                    <span style={{fontSize:"0.85rem",color:"#2ecc71",fontWeight:700,flexShrink:0}}>
                      ✓ {item.answer}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Action buttons ── */}
            <div style={{display:"flex",gap:"0.75rem",justifyContent:"center",flexWrap:"wrap",
              padding:"0.25rem 0 0.5rem"}}>
              <button onClick={() => handleDone("again")}
                style={{background:"linear-gradient(135deg,#2ecc71,#27ae60)",color:T.white,
                  border:"none",borderRadius:"12px",padding:"0.9rem 1.75rem",
                  fontSize:"1rem",fontWeight:800,cursor:"pointer",
                  boxShadow:"0 4px 16px rgba(46,204,113,0.35)",
                  letterSpacing:"0.02em"}}>
                🎮 Play Again
              </button>
<button onClick={() => handleDone(null)}
                style={{background:"rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.7)",
                  border:"1px solid rgba(255,255,255,0.2)",borderRadius:"12px",
                  padding:"0.9rem 1.75rem",fontSize:"1rem",fontWeight:700,cursor:"pointer",
                  letterSpacing:"0.02em"}}>
                ✓ Done
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Active drill
  if (!problem) return null;
  const timeColor = timeLeft <= 30 ? "#ff6b6b" : timeLeft <= 60 ? T.warningBd : T.white;
  const opColor   = OP_COLOR[problem.op];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",fontFamily:T.font,background:"#e8edf2"}}>
      {/* Header */}
      <div style={{background:opColor,color:T.white,padding:"0.75rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem",flexShrink:0,width:"100%",boxSizing:"border-box"}}>
        {!(cls?.hideTimer ?? true) && (
        <div style={{fontFamily:"monospace",fontWeight:700,fontSize:"1.4rem",background:"rgba(0,0,0,0.25)",padding:"3px 12px",borderRadius:"4px",color:timeColor,minWidth:"68px",textAlign:"center",flexShrink:0}}>
          {String(Math.floor(timeLeft/60)).padStart(2,"0")}:{String(timeLeft%60).padStart(2,"0")}
        </div>
        )}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:"0.9rem"}}>{OP_LABEL[problem.op]} — Level {problem.level}</div>
          <div style={{fontSize:"0.72rem",opacity:.8}}>{LEVEL_DEFS[problem.op][problem.level-1].desc}</div>
        </div>
        {/* Level badges */}
        <div style={{display:"flex",gap:"5px",flexShrink:0}}>
          {["add","sub","mul","div"].map(op => {
            const gates  = drillGates(levels);
            const locked = op === "mul" ? !gates.mul : op === "div" ? !gates.div : false;
            return (
              <div key={op} style={{background:"rgba(0,0,0,0.2)",borderRadius:T.xs,padding:"2px 6px",fontSize:"0.68rem",fontWeight:op===problem.op?700:400,border:op===problem.op?"1px solid rgba(255,255,255,.4)":"1px solid transparent",opacity:locked?0.45:1}}>
                {locked ? "🔒" : OP_ICON[op]}{!locked && levels[op]}
              </div>
            );
          })}
        </div>
      </div>

      {/* Problem + input area — scrollable so keypad is always reachable */}
      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",alignItems:"center",padding:"1.5rem 1rem 2rem",gap:"1.25rem",boxSizing:"border-box",width:"100%"}}>

        {/* Problem card */}
        <div style={{
          background: feedback ? (feedback.correct ? "#e8f5e9" : "#fce4e4") : T.white,
          border: `3px solid ${feedback ? (feedback.correct ? T.success : T.dangerText) : T.border}`,
          borderRadius:"12px",
          padding:"1.75rem 2.5rem",
          textAlign:"center",
          width:"min(420px, 100%)",
          alignSelf:"center",
          transition:"border-color 0.1s, background 0.1s",
          boxShadow:"0 4px 16px rgba(0,0,0,.08)",
          boxSizing:"border-box",
        }}>
          {feedback ? (
            feedback.correct ? (
              <div style={{fontSize:"3.5rem",color:T.success}}>✓</div>
            ) : (
              <>
                <div style={{fontSize:"1.6rem",fontFamily:"monospace",color:T.text,fontWeight:700}}>{problem.display}</div>
                <div style={{fontSize:"1rem",color:T.dangerText,marginTop:"6px"}}>✗ You answered: <strong>{lastInput}</strong></div>
                <div style={{fontSize:"1.2rem",color:T.success,fontWeight:700,marginTop:"6px"}}>✓ Correct: {problem.answer}</div>
              </>
            )
          ) : (
            <div style={{fontSize:"2.5rem",fontFamily:"monospace",fontWeight:700,color:T.text,letterSpacing:"0.04em"}}>
              {problem.display} = <span style={{color:opColor}}>?</span>
            </div>
          )}
        </div>

        {/* Input + keypad */}
        {!feedback && (
          <>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              value={inputVal}
              onChange={e=>setInputVal(e.target.value.replace(/[^0-9]/g,""))}
              onKeyDown={handleKeyDown}
              maxLength={8}
              placeholder="?"
              style={{
                fontSize:"2rem",fontFamily:"monospace",fontWeight:700,textAlign:"center",
                width:"140px",padding:"0.5rem 0.75rem",
                border:`3px solid ${opColor}`,borderRadius:T.r,
                outline:"none",background:T.surface,color:opColor,
              }}
            />
            <div style={{display:"flex",flexDirection:"column",gap:"8px",alignItems:"center"}}>
              {[[1,2,3],[4,5,6],[7,8,9],[null,0,"⌫"]].map((row,ri)=>(
                <div key={ri} style={{display:"flex",gap:"8px"}}>
                  {row.map((k,ki)=>(
                    <button key={ki}
                      onClick={()=>{
                        if (k===null) return;
                        if (k==="⌫") { setInputVal(v=>v.slice(0,-1)); return; }
                        setInputVal(v=>v+String(k));
                        if (inputRef.current) inputRef.current.focus();
                      }}
                      style={{
                        width:"62px",height:"54px",
                        fontSize:"1.3rem",fontWeight:700,
                        background:k===null?"transparent":T.white,
                        border:k===null?"none":`2px solid ${T.border}`,
                        borderRadius:T.r,
                        cursor:k===null?"default":"pointer",
                        color:k==="⌫"?T.dangerText:T.text,
                        boxShadow:k===null?"none":"0 2px 4px rgba(0,0,0,.08)",
                      }}>
                      {k===null?"":k}
                    </button>
                  ))}
                </div>
              ))}
              <button onClick={submitAnswer} disabled={!inputVal.trim()}
                style={{
                  width:"198px",height:"50px",fontSize:"1rem",fontWeight:700,
                  background:inputVal.trim()?opColor:"#ccc",
                  color:T.white,border:"none",borderRadius:T.r,
                  cursor:inputVal.trim()?"pointer":"not-allowed",
                  marginTop:"2px",boxShadow:"0 2px 8px rgba(0,0,0,.12)",
                }}>
                Submit ✓
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Student Results ────────────────────────────────────────
function StudentResults({ session, questions, onReset }) {
  const p = session.pct;
  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",fontFamily:T.font,display:"flex",flexDirection:"column"}}>
      <TopBar title="Grade 5 Mathematics — Results"/>
      <div style={{flex:1,display:"flex",justifyContent:"center",padding:"2rem 1rem"}}>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:"4px",width:"100%",maxWidth:"640px",boxShadow:"0 2px 12px rgba(0,0,0,.07)",overflow:"hidden"}}>
          <div style={{background:T.surfaceAlt,borderBottom:`1px solid ${T.border}`,padding:"1.25rem 1.5rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.1em",color:T.textSecondary,marginBottom:"4px"}}>STUDENT</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:T.text}}>{session.name}</div>
              <div style={{fontSize:"1.8rem",fontWeight:700,color:lvlC(p),fontFamily:"Georgia,serif",marginTop:"4px"}}>{session.score}/{session.total} <span style={{fontSize:"1rem",opacity:.6}}>({p}%)</span></div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:"0.62rem",color:T.textSecondary,marginBottom:"4px"}}>PERFORMANCE LEVEL</div>
              <div style={{fontSize:"1rem",fontWeight:700,color:lvlC(p),padding:"6px 16px",background:lvlBg(p),border:`1px solid ${lvlBd(p)}`,borderRadius:T.xs}}>{lvl(p)}</div>
            </div>
          </div>
          <div style={{padding:"1.25rem 1.5rem"}}>
            <div style={{fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.12em",color:T.textSecondary,marginBottom:"0.75rem"}}>ITEM REVIEW</div>
            {questions.map((q,i)=>{
              const a = session.answers[q.id];
              // Grade using same logic as doSubmit
              function gradeAns(q, given) {
                if (!given) return false;
                if (q.type === "plotpoint") {
                  const ans = Array.isArray(q.answer) ? q.answer : (()=>{try{return JSON.parse(q.answer);}catch{return null;}})();
                  return given === JSON.stringify(ans);
                }
                if (q.type === "multiselect") {
                  const correct = Array.isArray(q.answer) ? q.answer : [];
                  try { const ga = JSON.parse(given); return JSON.stringify([...ga].sort())===JSON.stringify([...correct].sort()); } catch { return false; }
                }
                if (q.type === "keypad") return String(q.answer??"").trim().toLowerCase()===String(given).trim().toLowerCase();
                if (q.type === "hotspot") {
                  try { const g=JSON.parse(given); const c=q.answer||{}; const v=Object.values(c); if(v.length>0&&new Set(v).size===1) return JSON.stringify(Object.keys(g).sort())===JSON.stringify(Object.keys(c).sort()); return JSON.stringify(g)===JSON.stringify(c); } catch { return false; }
                }
                return given === q.correct;
              }
              const ok = gradeAns(q, a);
              // Human-readable correct answer
              const correctDisplay = (() => {
                if (q.type === "plotpoint") { try { const arr = Array.isArray(q.answer)?q.answer:JSON.parse(q.answer); return `(${arr[0]}, ${arr[1]})`; } catch { return "?"; } }
                if (q.type === "multiselect") { const arr = Array.isArray(q.answer)?q.answer:[]; return arr.join(", ") || "?"; }
                if (q.type === "keypad") return String(q.answer ?? "");
                if (q.type === "dragdrop") return (q.items||[]).filter(it=>(q.correct||{})[it]!=="distractor").map(it=>`${it} → ${(q.zones||[])[(q.correct||q.answer||{})[it]]||"?"}`).join(", ");
                if (q.type === "hotspot") { const c=q.answer||{}; const sps=(q.snapPoints||[]).filter(sp=>c[sp.id]); return `${sps.length} correct placement${sps.length!==1?"s":""}`;}
                return q.correct;
              })();
              // Human-readable student answer
              const studentDisplay = (() => {
                if (!a) return null;
                if (q.type === "plotpoint") { try { const arr=JSON.parse(a); return `(${arr[0]}, ${arr[1]})`; } catch { return a; } }
                if (q.type === "multiselect") { try { return JSON.parse(a).join(", "); } catch { return a; } }
                if (q.type === "dragdrop") { try { const g=JSON.parse(a); return Object.entries(g).map(([item,zi])=>`${item} → ${(q.zones||[])[zi]||"?"}`).join(", "); } catch { return a; } }
                if (q.type === "hotspot") { try { const g=JSON.parse(a); return Array.isArray(g) ? `${g.length} item${g.length!==1?"s":""} placed` : a; } catch { return a; } }
                return a;
              })();
              return <div key={q.id} style={{display:"flex",gap:"0.75rem",marginBottom:"0.6rem",padding:"0.7rem 0.85rem",background:ok?T.successBg:T.dangerBg,border:`1px solid ${ok?T.successBd:T.dangerBd}`,borderRadius:T.xs}}>
                <div style={{width:"22px",height:"22px",borderRadius:"50%",background:ok?T.success:T.dangerText,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:"1px"}}>
                  <span style={{color:T.white,fontSize:"0.7rem",fontWeight:700}}>{i+1}</span>
                </div>
                <div style={{flex:1,fontSize:"0.82rem"}}>
                  <div style={{color:T.textSecondary,fontSize:"0.63rem",letterSpacing:"0.08em",marginBottom:"2px"}}>{q.standard}</div>
                  <div style={{color:T.text,fontFamily:"Georgia,serif",marginBottom:ok?0:"4px"}}><MathText text={q.question}/></div>
                  {!ok&&<div style={{fontSize:"0.78rem"}}>
                    <span style={{color:T.success}}>Correct: <strong>{correctDisplay}</strong></span>
                    {studentDisplay&&<span style={{color:T.dangerText}}> · Your answer: {studentDisplay}</span>}
                    {!studentDisplay&&<span style={{color:T.dangerText}}> · Not answered</span>}
                  </div>}
                </div>
                <span style={{fontWeight:700,fontSize:"0.9rem",color:ok?T.success:T.dangerText}}>{ok?"✓":"✗"}</span>
              </div>;
            })}
          </div>
          <div style={{padding:"1rem 1.5rem",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end"}}>
            <button onClick={onReset} style={{background:T.midnight,color:T.white,border:"none",borderRadius:T.xs,padding:"0.65rem 1.75rem",fontSize:"0.85rem",cursor:"pointer",fontWeight:600}}>Start New Session</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GoogleSignIn: used for ?code= and ?practice= link flows ──────────────────
function GoogleSignIn({ mode, codeOrClassId, onSuccess, onBack }) {
  // mode = "test" | "practice"
  const [err,     setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const btnRef = useRef(null);
  const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!CLIENT_ID || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: handleCredential,
      ux_mode: "popup",
    });
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: 280,
    });
  // eslint-disable-line
  }, [CLIENT_ID]);

  async function handleCredential(response) {
    setLoading(true); setErr("");
    try {
      const body = { token: response.credential };
      if (mode === "test")     body.code    = codeOrClassId;
      if (mode === "practice") body.classId = codeOrClassId;
      const r = await fetch(`${API}/auth/google/verify`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.detail || "Sign-in failed. Check with your teacher."); setLoading(false); return; }
      onSuccess(data.student, data.cls);
    } catch {
      setErr("Could not connect. Try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"#e8edf2",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",fontFamily:T.font,padding:"2rem 1rem",gap:"2rem"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:"0.62rem",fontWeight:700,letterSpacing:"0.18em",color:T.textSecondary,marginBottom:"6px"}}>
          GEORGIA MILESTONES READINESS TRAINER
        </div>
        <div style={{fontSize:"1.6rem",fontWeight:700,color:mode==="practice"?T.success:T.midnight,fontFamily:"Georgia,serif"}}>
          {mode === "practice" ? "🎯 Practice Mode" : "📝 Take a Test"}
        </div>
        <div style={{fontSize:"0.85rem",color:T.textSecondary,marginTop:"4px"}}>
          Sign in with your school Google account to continue
        </div>
      </div>

      <div style={{background:T.white,borderRadius:T.r,boxShadow:"0 4px 24px rgba(0,0,0,.1)",
        padding:"2rem 2.5rem",display:"flex",flexDirection:"column",alignItems:"center",gap:"1.5rem",
        width:"100%",maxWidth:"360px"}}>
        {loading ? (
          <div style={{color:T.textSecondary,fontSize:"0.9rem"}}>Verifying…</div>
        ) : (
          <>
            <div style={{fontSize:"0.82rem",color:T.textSecondary,textAlign:"center",lineHeight:1.6}}>
              Use the Google account you use for Google Classroom.
            </div>
            <div ref={btnRef}></div>
            {!CLIENT_ID && (
              <div style={{background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:"4px",
                padding:"0.5rem 1rem",fontSize:"0.78rem",color:T.dangerText,textAlign:"center"}}>
                Google auth not configured. Contact your administrator.
              </div>
            )}
          </>
        )}
        {err && (
          <div style={{background:T.dangerBg,border:`1px solid ${T.dangerBd}`,borderRadius:"4px",
            padding:"0.55rem 1.25rem",fontSize:"0.82rem",color:T.dangerText,fontWeight:600,textAlign:"center",width:"100%",boxSizing:"border-box"}}>
            ⚠ {err}
          </div>
        )}
      </div>

      <button onClick={onBack} style={{fontSize:"0.72rem",color:T.textSecondary,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>
        ← Back
      </button>
    </div>
  );
}

// ── Session persistence (survives refresh, clears on tab close) ──────────────
const SESSION_KEY = "mathready_session";
function _loadSaved() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch (e) { console.warn("Could not load saved session:", e); return null; }
}

// ── Main shell ─────────────────────────────────────────────
export default function MathTest({ onBack, prefillCode, directPracticeClassId, directDrillMode, prefillCredential, impersonateStudent }) {
  // prefillCode           = test code from ?code= URL param (goes straight to Google step)
  // directPracticeClassId = class ID from ?practice= URL param (direct practice via Google)
  // directDrillMode       = true when launched from "Practice Drill" home button (no code)

  // Students always go through Google sign-in at the App level first;
  // never restore a saved session directly into practice mode.
  const initScreen = directDrillMode ? "drill-google"
                   : directPracticeClassId ? "google-practice"
                   : "login";

  const [screen,          setScreen]          = useState(initScreen);
  const [student,         setStudent]         = useState(null);
  const [cls,             setCls]             = useState(null);
  const [testCode,        setTestCode]        = useState("");
  const [testTitle,       setTestTitle]       = useState("");
  const [finalSession,    setFinalSession]    = useState(null);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [drillKey,        setDrillKey]        = useState(0);   // increment to remount (Play Again)
  const [drillHistory,    setDrillHistory]    = useState([]);  // grows across Play Again sessions
  const [drillBests,      setDrillBests]      = useState(null); // persists across Play Again remounts
  const [questions,       setQuestions]       = useState(FALLBACK_QUESTIONS);
  const [isAdaptive,      setIsAdaptive]      = useState(false);
  const [isDrill,         setIsDrill]         = useState(false);
  const [untimed,         setUntimed]         = useState(false);
  const [timeLimitSecs,   setTimeLimitSecs]   = useState(1800);
  const [warnSecs,        setWarnSecs]        = useState(300);

  // Keep sessionStorage in sync with login state
  useEffect(() => {
    if (student) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ student, cls }));
    }
    // don't clear here — reset() handles logout
  }, [student, cls]);

  function reset() {
    sessionStorage.removeItem(SESSION_KEY);   // ← logout clears session
    setStudent(null); setCls(null);
    if (prefillCode || directPracticeClassId || directDrillMode) { onBack(); return; }
    setFinalSession(null); setPracticeHistory([]);
    setTestCode("");
    setScreen("login");
  }

  function handleStartTest(studentObj, classObj, code, testInfo) {
    setStudent(studentObj); setCls(classObj); setTestCode(code); setTestTitle(testInfo?.title || "");
    const drill = testInfo?.type === "drill";
    setIsDrill(drill);
    setIsAdaptive(!!testInfo?.adaptive && !drill);

    // Apply accommodations from student profile
    const extFactor = studentObj?.extendedTime === "2x" ? 2
                    : studentObj?.extendedTime === "1.5x" ? 1.5 : 1;
    const reduceChoices = !!studentObj?.reduceChoices;

    if (drill) {
      // DrillSession generates problems internally — no question list needed
    } else if (testInfo?.questions?.length) {
      // Apply reduce choices: remove one wrong MCQ option per question
      const qs = testInfo.questions.map(q => {
        if (!reduceChoices || q.type !== "mcq" || !q.choices || q.choices.length < 4) return q;
        const wrongIdxs = q.choices
          .map((c,i) => i)
          .filter(i => q.choices[i] !== q.correct);
        if (wrongIdxs.length === 0) return q;
        const removeIdx = wrongIdxs[Math.floor(Math.random() * wrongIdxs.length)];
        return { ...q, choices: q.choices.filter((_,i) => i !== removeIdx) };
      });
      setQuestions(qs);
    }
    setUntimed(!!testInfo?.untimed);
    const baseTime = testInfo?.timeLimitSecs ?? 1800;
    setTimeLimitSecs(Math.round(baseTime * extFactor));
    setWarnSecs(testInfo?.warnSecs ?? 300);
    setScreen("test");
  }

  function handleStartPractice(studentObj, classObj) {
    setStudent(studentObj); setCls(classObj);
    setScreen("practice");
  }

  async function handleFinishTest(session) {
    const enriched = {
      ...session,
      studentId:   student?.id   || "",
      studentName: student?.name || "",
      classId:     cls?.id       || "",
      className:   cls?.name     || "",
      testCode,
      testTitle,
      mode: isDrill ? "drill" : "test",
    };
    try {
      const r = await fetch(`${API}/submit`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(enriched),
      });
      // Use server-authoritative score (server re-grades against answer key)
      if (r.ok) {
        const data = await r.json();
        if (data.score !== undefined) {
          enriched.score = data.score;
          enriched.total = data.total;
          enriched.pct   = data.pct;
        }
      }
    } catch (e) {
      console.warn("Failed to submit test results to server:", e);
      alert("Your test could not be saved to the server. Please let your teacher know so they can help recover your results.");
    }
    setFinalSession(enriched);
    setScreen("results");
  }

  async function handleFinishPractice(session, history) {
    try {
      await fetch(`${API}/submit`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify(session),
      });
    } catch (e) {
      console.warn("Failed to submit practice results to server:", e);
      alert("Your practice session could not be saved to the server. Your results are still shown below, but your teacher may not see them.");
    }
    setFinalSession(session);
    setPracticeHistory(history);
    setScreen("practice-results");
  }

  if (screen === "test-done") { reset(); return null; }

  if (screen === "drill-google")
    return <DrillLogin onBack={onBack} onSuccess={(studentObj, classObj) => {
      setStudent(studentObj); setCls(classObj); setIsDrill(true); setScreen("test");
    }}/>;

  if (screen === "login")
    return <StudentLogin
      onStartTest={handleStartTest}
      onStartDrill={(studentObj, classObj) => {
        setStudent(studentObj); setCls(classObj); setIsDrill(true); setScreen("test");
      }}
      onBack={onBack}
      prefillCode={prefillCode}
      prefillCredential={prefillCredential}
      impersonateStudent={impersonateStudent}
    />;

  if (screen === "google-practice")
    return <GoogleSignIn mode="practice" codeOrClassId={directPracticeClassId} onBack={onBack}
      onSuccess={(studentObj, classObj) => handleStartPractice(studentObj, classObj)} />;

  if (screen === "practice")
    return <PracticeMode student={student} cls={cls} onFinish={handleFinishPractice} onQuit={reset}/>;

  if (screen === "practice-results")
    return <PracticeResults session={finalSession} history={practiceHistory} onReset={reset}/>;

  if (screen === "test" && isDrill)
    return <DrillSession
              key={drillKey}
              student={student} cls={cls} testCode={testCode}
              priorHistory={drillHistory}
              drillNumber={drillKey + 1}
              parentBests={drillBests}
              onBestsUpdate={setDrillBests}
              onDone={(dest, history) => {
                if (history) setDrillHistory(history);
                if (dest === "again") { setDrillKey(k => k + 1); return; }
                reset();
              }}/>;

  if (screen === "test")
    return <StudentTest studentName={student?.name || ""} studentId={student?.id || ""} testCode={testCode} questions={questions} adaptive={isAdaptive} onFinish={handleFinishTest} untimed={untimed} timeLimitSecs={timeLimitSecs} warnSecs={warnSecs}/>;

  if (screen === "results")
    return <StudentResults session={finalSession} questions={questions} onReset={()=>{ reset(); onBack(); }}/>;
}
