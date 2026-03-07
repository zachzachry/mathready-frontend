export default function TopBar({ title, right }) {
  return (
    <div style={{background:"#003865",color:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 1.25rem",height:"52px",flexShrink:0,boxShadow:"0 2px 6px rgba(0,0,0,0.3)"}}>
      <div>
        <div style={{fontSize:"0.58rem",opacity:.65,letterSpacing:"0.14em"}}>GEORGIA MILESTONES READINESS TRAINER</div>
        <div style={{fontSize:"0.9rem",fontWeight:600}}>{title}</div>
      </div>
      {right}
    </div>
  );
}
