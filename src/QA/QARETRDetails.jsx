const detailItems = [
  { label: 'Learner', value: 'Nguyen Van A' },
  { label: 'Course / Class', value: 'Aircraft Maintenance Basics / A-01' },
  { label: 'Attendance', value: '96% complete' },
  { label: 'Assessment', value: 'Pass' },
  { label: 'Evidence', value: '3 uploaded files' },
  { label: 'Approval History', value: 'QA pending review' },
];

const QARETRDetails = () => (
  <div className="qa-shell">
    <section className="qa-page-card">
      <p className="qa-eyebrow">ETR details</p>
      <h1>Review ETR Details</h1>
      <p className="qa-page-description">
        Inspect the learner profile, attendance, assessment, evidence, and approval history before approving or returning the ETR.
      </p>
    </section>

    <section className="qa-detail-grid">
      <div className="qa-panel">
        <h2 className="qa-section-title">Record Summary</h2>
        <div className="qa-kv-grid">
          {detailItems.map((item) => (
            <div key={item.label} className="qa-kv">
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="qa-panel">
        <h2 className="qa-section-title">QA Review Form</h2>
        <div className="qa-list">
          <div>
            <label className="qa-section-title">Review Notes</label>
            <textarea className="qa-textarea" placeholder="Add verification notes, missing items, or approval remarks." />
          </div>
          <div className="qa-actions">
            <button className="qa-btn" type="button">Approve ETR</button>
            <button className="qa-btn-secondary" type="button">Return for Correction</button>
          </div>
        </div>
      </div>
    </section>
  </div>
);

export default QARETRDetails;
