import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getETRById, MOCK_APPROVAL_TIMELINE, MOCK_AUDIT_LOGS } from './mockAuditorData';

const AuditorETRDetails = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const etrId = searchParams.get('id') || 'ETR-2026-0891';
  const etr = getETRById(etrId);

  const [activeTab, setActiveTab] = useState('learner');

  const tabs = [
    { key: 'learner', label: 'Learner Information' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'assessment', label: 'Assessment Results' },
    { key: 'evidence', label: 'Training Evidence' },
    { key: 'approval', label: 'Approval History' },
    { key: 'audit', label: 'Audit Trail' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Detail Header Card */}
      <section className="content-header">
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0 }}>ETR Compliance Detail: {etr.id}</h1>
            <span className="badge-locked">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Locked Record
            </span>
          </div>
          <div className="divider-gold"></div>
          <p className="header-description">
            Learner: <strong>{etr.learnerName}</strong> ({etr.learnerId}) | Course: <strong>{etr.courseName}</strong> | Class: <strong>{etr.className}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="auditor-btn-sm"
            onClick={() => navigate('/auditor/export-packages')}
            style={{ padding: '8px 16px' }}
          >
            Export Dossier PDF
          </button>
        </div>
      </section>

      {/* Tabs Header */}
      <div className="table-card" style={{ padding: '0 20px' }}>
        <div className="auditor-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`auditor-tab-btn${activeTab === tab.key ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Learner Information */}
      {activeTab === 'learner' && (
        <section className="table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', marginTop: 0 }}>Learner Profile & Registration Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Full Name</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>{etr.learnerName}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Learner ID</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#c5a059', marginTop: '4px' }}>{etr.learnerId}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Role / Designation</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.learnerRole}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Department</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.learnerDepartment}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Course Code & Name</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.courseId} - {etr.courseName}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>Class ID</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.classId}</div>
            </div>
          </div>
        </section>
      )}

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <section className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dfe6f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>Session Attendance Record</h2>
            <span className="badge-compliant">Attendance Rate: {etr.attendancePercentage}% ({etr.attendedSessions}/{etr.totalSessions} Sessions)</span>
          </div>
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '80px 140px 1.8fr 120px 120px', padding: '12px 24px', gap: '12px' }}>
              <div>Session</div>
              <div>Date</div>
              <div>Topic / Module</div>
              <div>Duration</div>
              <div>Status</div>
            </div>
            <div className="table-body">
              {etr.attendanceList.map((att) => (
                <div key={att.session} className="table-row" style={{ display: 'grid', gridTemplateColumns: '80px 140px 1.8fr 120px 120px', padding: '14px 24px', gap: '12px' }}>
                  <div style={{ fontWeight: '700', color: '#c5a059' }}>Session {att.session}</div>
                  <div>{att.date}</div>
                  <div style={{ fontWeight: '600', color: '#002147' }}>{att.topic}</div>
                  <div>{att.duration}</div>
                  <div>
                    <span className="badge-compliant" style={{ fontSize: '10px' }}>{att.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tab 3: Assessment Results */}
      {activeTab === 'assessment' && (
        <section className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dfe6f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>Subject & Module Grades</h2>
            <span className="badge-compliant" style={{ fontSize: '13px', padding: '6px 14px' }}>Overall Score: {etr.overallScore}% - {etr.resultStatus}</span>
          </div>
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '120px 2fr 100px 100px 120px 1.5fr', padding: '12px 24px', gap: '12px' }}>
              <div>Subject Code</div>
              <div>Subject Name</div>
              <div>Passing Score</div>
              <div>Score Achieved</div>
              <div>Result</div>
              <div>Instructor</div>
            </div>
            <div className="table-body">
              {etr.subjects.map((sub) => (
                <div key={sub.code} className="table-row" style={{ display: 'grid', gridTemplateColumns: '120px 2fr 100px 100px 120px 1.5fr', padding: '14px 24px', gap: '12px' }}>
                  <div style={{ fontWeight: '700', color: '#c5a059' }}>{sub.code}</div>
                  <div style={{ fontWeight: '600', color: '#002147' }}>{sub.name}</div>
                  <div>{sub.passScore}%</div>
                  <div style={{ fontWeight: '700', color: '#16a34a' }}>{sub.score}%</div>
                  <div>
                    <span className="badge-compliant" style={{ fontSize: '10px' }}>{sub.result}</span>
                  </div>
                  <div>{sub.instructor}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tab 4: Training Evidence */}
      {activeTab === 'evidence' && (
        <section className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dfe6f1' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>Training Evidence & Artifact Integrity</h2>
          </div>
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '130px 2fr 100px 150px 1.5fr 150px', padding: '12px 24px', gap: '12px' }}>
              <div>Evidence ID</div>
              <div>File Name</div>
              <div>File Size</div>
              <div>Uploaded Date</div>
              <div>Uploaded By</div>
              <div style={{ textAlign: 'right' }}>SHA-256 Hash</div>
            </div>
            <div className="table-body">
              {etr.evidences.map((evd) => (
                <div key={evd.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: '130px 2fr 100px 150px 1.5fr 150px', padding: '14px 24px', gap: '12px' }}>
                  <div style={{ fontWeight: '700', color: '#c5a059' }}>{evd.id}</div>
                  <div style={{ fontWeight: '600', color: '#002147' }}>{evd.name}</div>
                  <div>{evd.size}</div>
                  <div>{evd.uploadedAt}</div>
                  <div>{evd.uploadedBy}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '10px', color: '#16a34a' }}>VERIFIED MATCH</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tab 5: Approval History */}
      {activeTab === 'approval' && (
        <section className="table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', marginTop: 0, marginBottom: '20px' }}>Approval Workflow Timeline</h2>
          <div className="approval-timeline">
            {MOCK_APPROVAL_TIMELINE.map((item) => (
              <div key={item.stage} className="timeline-item">
                <div className="timeline-dot">{item.stage}</div>
                <div className="timeline-header">
                  <span className="timeline-title">{item.roleTitle}</span>
                  <span className="timeline-timestamp">{item.timestamp}</span>
                </div>
                <div className="timeline-user">{item.user} ({item.role})</div>
                <div className="timeline-action">{item.action}</div>
                <div className="timeline-hash">Hash: {item.hash}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab 6: Audit Trail */}
      {activeTab === 'audit' && (
        <section className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dfe6f1' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>System Audit Logs for {etr.id}</h2>
          </div>
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '160px 1.5fr 120px 150px 2fr 110px', padding: '12px 24px', gap: '12px' }}>
              <div>Timestamp</div>
              <div>User</div>
              <div>Role</div>
              <div>Action</div>
              <div>Details</div>
              <div>Result</div>
            </div>
            <div className="table-body">
              {MOCK_AUDIT_LOGS.map((log) => (
                <div key={log.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: '160px 1.5fr 120px 150px 2fr 110px', padding: '14px 24px', gap: '12px' }}>
                  <div>{log.timestamp}</div>
                  <div style={{ fontWeight: '600', color: '#002147' }}>{log.user}</div>
                  <div>{log.role}</div>
                  <div style={{ fontWeight: '700', color: '#c5a059' }}>{log.action}</div>
                  <div>{log.details}</div>
                  <div>
                    <span className="badge-compliant" style={{ fontSize: '10px' }}>{log.result}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AuditorETRDetails;
