const reviewQueue = [
  {
    id: 'ETR-2026-041',
    learner: 'Nguyen Van A',
    course: 'Aircraft Maintenance Basics',
    stage: 'Submitted',
  },
  {
    id: 'ETR-2026-042',
    learner: 'Tran Thi B',
    course: 'Safety Procedure Review',
    stage: 'Waiting QA',
  },
  {
    id: 'ETR-2026-043',
    learner: 'Le Van C',
    course: 'Cabin Crew Induction',
    stage: 'Return Needed',
  },
];

const QARETRReviewQueue = () => (
  <div className="qa-shell">
    <section className="qa-page-card">
      <p className="qa-eyebrow">ETR review</p>
      <h1>ETR Review Queue</h1>
      <p className="qa-page-description">
        View all submitted ETRs awaiting QA review. Open a record to inspect learner information, attendance, assessment results, evidence, and approval history.
      </p>
    </section>

    <section className="qa-table-card">
      <div className="qa-table-header">
        <div>
          <h2>Submitted ETRs</h2>
          <p className="qa-page-description">Select one record to review, verify completeness, or return it for correction.</p>
        </div>
        <button className="qa-btn" type="button">Review ETR</button>
      </div>

      <div className="qa-list">
        {reviewQueue.map((record) => (
          <div key={record.id} className="qa-list-item">
            <div>
              <p className="qa-list-title">{record.id} - {record.learner}</p>
              <p className="qa-list-desc">{record.course}</p>
            </div>
            <span className="qa-status pending">{record.stage}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);

export default QARETRReviewQueue;
