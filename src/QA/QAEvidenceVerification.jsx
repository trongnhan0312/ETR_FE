const evidenceRows = [
  {
    learner: 'Nguyen Van A',
    evidence: 'Flight log + photo set',
    course: 'Aircraft Maintenance Basics',
    status: 'Pending',
  },
  {
    learner: 'Tran Thi B',
    evidence: 'Attendance scan + assessment upload',
    course: 'Safety Procedure Review',
    status: 'Pending',
  },
  {
    learner: 'Le Van C',
    evidence: 'Signature sheet + checklist',
    course: 'Cabin Crew Induction',
    status: 'Rejected',
  },
];

const QAEvidenceVerification = () => (
  <div className="qa-shell">
    <section className="qa-page-card">
      <p className="qa-eyebrow">Evidence management</p>
      <h1>Evidence Verification</h1>
      <p className="qa-page-description">
        Verify or reject uploaded evidence before it is used in ETR review. Use comments to record missing signatures, invalid files, or incomplete proof.
      </p>
    </section>

    <section className="qa-table-card">
      <div className="qa-table-header">
        <div>
          <h2>Pending Evidence</h2>
          <p className="qa-page-description">All evidence awaiting QA attention appears here in one queue.</p>
        </div>
        <div className="qa-actions">
          <button className="qa-btn" type="button">Verify Selected</button>
          <button className="qa-btn-secondary" type="button">Reject Selected</button>
        </div>
      </div>

      <div className="qa-list">
        {evidenceRows.map((row) => (
          <div key={row.learner} className="qa-list-item">
            <div>
              <p className="qa-list-title">{row.learner}</p>
              <p className="qa-list-desc">{row.course} - {row.evidence}</p>
            </div>
            <span className={`qa-status ${row.status === 'Rejected' ? 'rejected' : 'pending'}`}>{row.status}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default QAEvidenceVerification;
