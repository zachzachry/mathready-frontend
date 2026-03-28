export default function PrivacyPolicy() {
  const s = {
    page:    { fontFamily:"Georgia, serif", maxWidth:760, margin:"0 auto", padding:"3rem 2rem 6rem", color:"#1a1a2e", lineHeight:1.8 },
    logo:    { fontSize:"0.65rem", fontWeight:700, letterSpacing:"0.18em", color:"#0d9488", marginBottom:6 },
    title:   { fontSize:"2rem", fontWeight:800, marginBottom:4, color:"#1a1a2e" },
    updated: { fontSize:"0.82rem", color:"#666", marginBottom:"2.5rem" },
    h2:      { fontSize:"1.2rem", fontWeight:700, marginTop:"2.5rem", marginBottom:"0.5rem", color:"#1a1a2e", borderBottom:"2px solid #0d9488", paddingBottom:4 },
    h3:      { fontSize:"1rem", fontWeight:700, marginTop:"1.25rem", marginBottom:"0.35rem", color:"#1a1a2e" },
    p:       { marginBottom:"1rem" },
    ul:      { paddingLeft:"1.5rem", marginBottom:"1rem" },
    li:      { marginBottom:"0.4rem" },
    badge:   { display:"inline-block", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:4,
               padding:"0.15rem 0.6rem", fontSize:"0.78rem", fontWeight:700, color:"#166534", marginRight:8 },
    box:     { background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, padding:"1rem 1.5rem", marginBottom:"1rem" },
    contact: { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"1.25rem 1.5rem", marginTop:"2rem" },
    back:    { display:"inline-block", marginBottom:"2rem", color:"#0d9488", textDecoration:"none", fontFamily:"system-ui,sans-serif", fontSize:"0.88rem", fontWeight:600 },
  };

  return (
    <div style={s.page}>
      <a href="/" style={s.back}>← Back to MilestoneReady</a>

      <div style={s.logo}>MILESTONEREADY</div>
      <h1 style={s.title}>Privacy Policy</h1>
      <p style={s.updated}>Last updated: March 28, 2026</p>

      <div style={s.box}>
        <span style={s.badge}>COPPA</span>
        <span style={s.badge}>FERPA</span>
        <span style={s.badge}>CIPA</span>
        MilestoneReady is designed for use in K–12 schools and complies with the
        Children's Online Privacy Protection Act (COPPA), the Family Educational Rights
        and Privacy Act (FERPA), and the Children's Internet Protection Act (CIPA).
      </div>

      <h2 style={s.h2}>1. Who We Are</h2>
      <p style={s.p}>
        MilestoneReady is a Georgia Milestones test-preparation platform for 5th-grade
        mathematics, operated for use by Georgia public schools. References to "we," "us,"
        or "our" mean the MilestoneReady service and its operators.
      </p>

      <h2 style={s.h2}>2. Information We Collect</h2>
      <h3 style={s.h3}>From Students</h3>
      <p style={s.p}>When a student signs in with a school-issued Google account, we collect:</p>
      <ul style={s.ul}>
        <li style={s.li}>First and last name (from the Google account)</li>
        <li style={s.li}>School Google email address</li>
        <li style={s.li}>Test and drill session scores, answers, and timestamps</li>
        <li style={s.li}>Math fluency progress (levels, accuracy, practice streaks)</li>
        <li style={s.li}>Class enrollment (assigned by the teacher)</li>
      </ul>
      <p style={s.p}>We do not collect home addresses, phone numbers, photos, or any information beyond what is needed to deliver the academic service.</p>

      <h3 style={s.h3}>From Teachers and School Administrators</h3>
      <ul style={s.ul}>
        <li style={s.li}>Name and school Google email address</li>
        <li style={s.li}>Class lists and roster assignments they create</li>
        <li style={s.li}>Tests and questions they author</li>
      </ul>

      <h2 style={s.h2}>3. How We Use Information</h2>
      <p style={s.p}>We use collected information solely to:</p>
      <ul style={s.ul}>
        <li style={s.li}>Display student progress and scores to the student's own teachers and school administrators</li>
        <li style={s.li}>Generate class-level and school-level performance reports for educators</li>
        <li style={s.li}>Allow students to take tests and practice drills assigned by their teacher</li>
        <li style={s.li}>Track fluency growth over time within the platform</li>
      </ul>
      <p style={s.p}><strong>We do not sell student data. We do not use student data for advertising or marketing purposes. We do not share student data with third parties except as required to operate the service (see Section 5).</strong></p>

      <h2 style={s.h2}>4. COPPA — Children Under 13</h2>
      <p style={s.p}>
        MilestoneReady is intended to be used under the supervision of a school. We collect
        personal information from children under 13 only in the context of a school's
        educational program. Under COPPA, we rely on the school acting as the parent's
        agent to provide consent for students to use the platform.
      </p>
      <p style={s.p}>
        If you are a parent and believe your child's information has been collected without
        proper authorization, please contact us at the address in Section 8 and we will
        promptly delete the data.
      </p>

      <h2 style={s.h2}>5. Data Storage and Third-Party Services</h2>
      <p style={s.p}>Student and teacher data is stored using the following services:</p>
      <ul style={s.ul}>
        <li style={s.li}><strong>Supabase</strong> — database hosting (PostgreSQL). Data is stored in the United States.</li>
        <li style={s.li}><strong>Google Sign-In</strong> — authentication only. We receive a verified name and email; we do not receive access to Google Drive, Gmail, or any other Google service.</li>
        <li style={s.li}><strong>Railway</strong> — backend application hosting (United States).</li>
        <li style={s.li}><strong>Cloudflare</strong> — content delivery and DNS (United States).</li>
      </ul>
      <p style={s.p}>We do not use analytics services, advertising networks, or social media trackers on any page accessible to students.</p>

      <h2 style={s.h2}>6. FERPA — Student Educational Records</h2>
      <p style={s.p}>
        Student test scores and performance data are educational records under FERPA.
        Access to these records is limited to:
      </p>
      <ul style={s.ul}>
        <li style={s.li}>The student's own teachers</li>
        <li style={s.li}>School and district administrators with legitimate educational interest</li>
        <li style={s.li}>Parents or guardians (via the parent report feature)</li>
        <li style={s.li}>MilestoneReady operators, solely for the purpose of maintaining the service</li>
      </ul>

      <h2 style={s.h2}>7. Data Retention and Deletion</h2>
      <p style={s.p}>
        Student data is retained for the duration of the school's use of the platform.
        Schools and administrators may request deletion of all data for their students
        at any time by contacting us. Individual student records can be deleted by a
        school administrator within the platform.
      </p>

      <h2 style={s.h2}>8. Security</h2>
      <p style={s.p}>
        All data is transmitted over HTTPS. Database access requires authentication.
        We do not store passwords — authentication is handled entirely through Google's
        OAuth2 service. Access to student data is role-restricted so teachers can only
        see students in their own classes.
      </p>

      <h2 style={s.h2}>9. Changes to This Policy</h2>
      <p style={s.p}>
        If we make material changes to this policy, we will update the "Last updated"
        date above and notify school administrators by email where possible.
      </p>

      <h2 style={s.h2}>10. Contact Us</h2>
      <div style={s.contact}>
        <p style={{...s.p, marginBottom:4}}>
          For privacy questions, data deletion requests, or COPPA/FERPA inquiries:
        </p>
        <p style={{...s.p, marginBottom:4}}><strong>MilestoneReady</strong></p>
        <p style={{...s.p, marginBottom:0}}>
          Email: <a href="mailto:privacy@milestoneready.com" style={{color:"#0d9488"}}>privacy@milestoneready.com</a>
        </p>
      </div>
    </div>
  );
}
