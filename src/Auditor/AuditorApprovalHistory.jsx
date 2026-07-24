import { useState } from 'react';
import { MOCK_APPROVAL_TIMELINE, MOCK_LOCKED_ETRS } from './mockAuditorData';

const AuditorApprovalHistory = () => {
  const [selectedEtrId, setSelectedEtrId] = useState('ETR-2026-0891');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>Approval History & Workflow Verification</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            Audit inspection of multi-stage approval workflows, personnel authorizations, timestamps, and cryptographic lock state.
          </p>
        </div>

        <div style={{ minWidth: '240px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Select Locked ETR
          </label>
          <select
            className="search-input"
            style={{ width: '100%', background: '#ffffff' }}
            value={selectedEtrId}
            onChange={(e) => setSelectedEtrId(e.target.value)}
          >
            {MOCK_LOCKED_ETRS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id} - {item.learnerName} ({item.courseId})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Workflow Diagram Banner */}
      <section className="table-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
          Mandatory Aviation Approval Sequence Flow
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ padding: '12px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Step 1</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>Academic Staff</div>
          </div>
          <div style={{ color: '#c5a059', fontWeight: '900', fontSize: '18px' }}>↓</div>

          <div style={{ padding: '12px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Step 2</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>QA Verification</div>
          </div>
          <div style={{ color: '#c5a059', fontWeight: '900', fontSize: '18px' }}>↓</div>

          <div style={{ padding: '12px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Step 3</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>Training Manager Approval</div>
          </div>
          <div style={{ color: '#c5a059', fontWeight: '900', fontSize: '18px' }}>↓</div>

          <div style={{ padding: '12px 18px', borderRadius: '12px', background: '#0a2c55', color: '#ffffff', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#d4af37', textTransform: 'uppercase' }}>Step 4</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>System Locked</div>
          </div>
          <div style={{ color: '#c5a059', fontWeight: '900', fontSize: '18px' }}>↓</div>

          <div style={{ padding: '12px 18px', borderRadius: '12px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', opacity: 0.8 }}>Step 5</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>Audited</div>
          </div>
        </div>
      </section>

      {/* Approval Timeline Detail Card */}
      <section className="table-card" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', marginTop: 0, marginBottom: '24px' }}>
          Detailed Execution Log for {selectedEtrId}
        </h2>

        <div className="approval-timeline">
          {MOCK_APPROVAL_TIMELINE.map((step) => (
            <div key={step.stage} className="timeline-item">
              <div className="timeline-dot">{step.stage}</div>
              <div className="timeline-header">
                <span className="timeline-title">{step.roleTitle}</span>
                <span className="timeline-timestamp">{step.timestamp}</span>
              </div>
              <div className="timeline-user">
                <strong>User:</strong> {step.user} &nbsp;|&nbsp; <strong>Role:</strong> {step.role}
              </div>
              <div className="timeline-action" style={{ marginTop: '6px' }}>
                <strong>Action Executed:</strong> {step.action}
              </div>
              <div className="timeline-hash">
                Cryptographic Signature: {step.hash}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AuditorApprovalHistory;
