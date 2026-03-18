import { T } from "./constants";

export default function TopBar({ title, right }) {
  return (
    <div style={{background:T.midnight,color:T.white,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.25rem",height:"52px",flexShrink:0,boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
      <div>
        <div style={{fontSize:"0.6rem",opacity:.45,letterSpacing:"0.16em",fontWeight:600}}>GEORGIA MILESTONES READINESS TRAINER</div>
        <div style={{fontSize:"0.9rem",fontWeight:600}}>{title}</div>
      </div>
      {right}
    </div>
  );
}
