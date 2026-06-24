const returnReasons = [
  'Missing evidence file',
  'Attendance record incomplete',
  'Assessment not attached',
  'Wrong learner details',
];

const QARETRReturn = () => (
  <div className="qa-shell">
    <section className="qa-page-card">
      <p className="qa-eyebrow">ETR review</p>
      <h1>Return for Correction</h1>
      <p className="qa-page-description">
        Send the ETR back to the training team with a clear reason so they can correct and resubmit it.
      </p>
    </section>

    <section className="qa-grid-2">
      <div className="qa-panel">
        <h2>Common Return Reasons</h2>
        <div className="qa-badge-row">
          {returnReasons.map((reason) => (
            <span key={reason} className="qa-chip warn">{reason}</span>
          ))}
        </div>
      </div>

      <div className="qa-panel">
        <h2>Return Message</h2>
        <textarea className="qa-textarea" placeholder="Explain what must be corrected before resubmission." />
        <div className="qa-actions" style={{ marginTop: '14px' }}>
          <button className="qa-btn-secondary" type="button">Save Draft</button>
          <button className="qa-btn" type="button">Send Back</button>
        </div>
      </div>
    </section>
  </div>
);

export default QARETRReturn;
