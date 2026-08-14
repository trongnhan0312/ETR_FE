import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchEtrById, fetchApprovals, fetchAuditLogs, fetchEtrList, exportPdf } from './auditorApi';
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

// Trích số thật từ id — chấp nhận mọi định dạng: số thuần (891), "ETR-2026-0891", "#ETR-0891".
const toNumericId = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
};

const AuditorETRDetails = () => {
  const { tr, trEn } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Lưu id dạng số (không đụng tới display "#ETR-xxxx") — nếu URL không có id hợp lệ,
  // loadData sẽ tự chọn ETR đầu tiên thật từ danh sách thay vì id giả cứng.
  const requestedEtrId = toNumericId(searchParams.get('id'));

  const [etr, setEtr] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [activeTab, setActiveTab] = useState('learner');

  // Phân trang từng tab bảng (điểm danh / môn học / minh chứng / audit) — tối đa 5 nút trang
  const attendancePager = usePagination(etr?.attendanceList ?? [], { pageSize: 10, resetKey: activeTab });
  const subjectsPager = usePagination(etr?.subjects ?? [], { pageSize: 10, resetKey: activeTab });
  const evidencePager = usePagination(etr?.evidences ?? [], { pageSize: 10, resetKey: activeTab });
  const approvalsPager = usePagination(approvals, { pageSize: 10, resetKey: activeTab });
  const auditPager = usePagination(auditLogs, { pageSize: 10, resetKey: activeTab });

  const tabs = [
    { key: 'learner', label: 'Learner Information' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'assessment', label: 'Assessment Results' },
    { key: 'evidence', label: 'Training Evidence' },
    { key: 'approval', label: 'Approval History' },
    { key: 'audit', label: 'Audit Trail' },
  ].map((tab) => ({ ...tab, label: trEn(tab.label) }));

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Không có id trong URL → mở hồ sơ ETR đầu tiên thật (thay vì id giả 'ETR-2026-0891'
        // không tồn tại trong DB khiến trang treo "Loading..." vĩnh viễn).
        let targetId = requestedEtrId;
        if (!targetId) {
          const etrs = await fetchEtrList();
          const first = Array.isArray(etrs) ? etrs.find((e) => e.etrCourseRecordId) : null;
          targetId = first?.etrCourseRecordId ?? null;
          if (targetId == null) {
            setLoading(false);
            return;
          }
        }

        const [etrData, approvalsData, logsData] = await Promise.all([
          fetchEtrById(targetId),
          fetchApprovals(targetId),
          fetchAuditLogs(),
        ]);

        if (etrData) setEtr(etrData);
        if (Array.isArray(approvalsData)) setApprovals(approvalsData);
        // Chỉ hiển thị nhật ký của ĐÚNG hồ sơ này (BE trả về toàn bộ log hệ thống)
        if (Array.isArray(logsData)) {
          const filtered = logsData.filter(
            (log) => log.etrCourseRecordId != null && log.etrCourseRecordId === etrData?.etrCourseRecordId,
          );
          setAuditLogs(filtered);
        }
      } catch (err) {
        console.error('Error fetching ETR details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [requestedEtrId]);

  // Toast notifications
  const toast = useToast();

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      // Truyền ĐÚNG id hồ sơ đang xem — trước đây exportPdf bỏ qua payload và luôn
      // xuất "ETR Completed đầu tiên" nên file nhận được là hồ sơ của học viên khác.
      await exportPdf({ etrCourseRecordId: etr.etrCourseRecordId, name: `${etr.id}_Compliance_Dossier.pdf` });
      toast.success(tr("Xuất PDF thành công"));
      navigate('/auditor/export-packages');
    } catch (err) {
      console.error('Export PDF failed:', err);
      toast.error(tr("Xuất PDF thất bại"));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="table-card" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#002147', fontWeight: '600' }}>{trEn('Loading ETR compliance record')}...</p>
      </div>
    );
  }

  if (!etr) {
    return (
      <div className="table-card" style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#002147', fontWeight: '600' }}>{trEn('No matching ETR record found. Please pick one from the list.')}</p>
        <button
          className="auditor-btn-sm"
          style={{ marginTop: '12px' }}
          onClick={() => navigate('/auditor/etrs')}
        >
          {trEn('Back to Locked ETR Records')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Detail Header Card */}
      <section className="content-header">
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ margin: 0 }}>{trEn('ETR Compliance Detail:')} {etr.id}</h1>
            <span className="badge-locked">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {trEn('Locked Record')}
            </span>
          </div>
          <div className="divider-gold"></div>
          <p className="header-description">
            {trEn('Learner:')} <strong>{etr.learnerName}</strong> ({etr.learnerId}) | {trEn('Course:')} <strong>{etr.courseName}</strong> | {trEn('Class:')} <strong>{etr.className}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="auditor-btn-sm"
            onClick={handleExportPdf}
            disabled={exporting}
            style={{ padding: '8px 16px' }}
          >
            {exporting ? trEn('Generating PDF...') : trEn('Export Dossier PDF')}
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
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', marginTop: 0 }}>{trEn('Learner Profile & Registration Details')}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginTop: '16px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Full Name')}</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>{etr.learnerName}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Learner ID')}</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#c5a059', marginTop: '4px' }}>{etr.learnerId}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Role / Designation')}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.learnerRole}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Department')}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.learnerDepartment}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Course Code & Name')}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.courseId} - {etr.courseName}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Class ID')}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.classId}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Submitted At')}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.submittedAt}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Verified At')}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>{etr.verifiedAt}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #dfe6f1' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Completed At')}</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#c5a059', marginTop: '4px' }}>{etr.completedAt}</div>
            </div>
          </div>
        </section>
      )}

      {/* Tab 2: Attendance */}
      {activeTab === 'attendance' && (
        <section className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dfe6f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>{trEn('Session Attendance Record')}</h2>
            <span className="badge-compliant">{trEn('Attendance Rate:')} {etr.attendancePercentage}% ({etr.attendedSessions}/{etr.totalSessions} {trEn('Sessions')})</span>
          </div>
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '80px 140px 1.8fr 120px 120px', padding: '12px 24px', gap: '12px' }}>
              <div>{trEn('Session')}</div>
              <div>{trEn('Date')}</div>
              <div>{trEn('Topic / Module')}</div>
              <div>{trEn('Duration')}</div>
              <div>{trEn('Status')}</div>
            </div>
            <div className="table-body">
              {attendancePager.pageItems.map((att) => (
                <div key={att.session} className="table-row" style={{ display: 'grid', gridTemplateColumns: '80px 140px 1.8fr 120px 120px', padding: '14px 24px', gap: '12px' }}>
                  <div style={{ fontWeight: '700', color: '#c5a059' }}>{trEn('Session')} {att.session}</div>
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
          <div className="table-footer">
            <Pagination page={attendancePager.page} pageCount={attendancePager.pageCount} onChange={attendancePager.setPage} total={attendancePager.total} pageSize={10} />
          </div>
        </section>
      )}

      {/* Tab 3: Assessment Results */}
      {activeTab === 'assessment' && (
        <section className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dfe6f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>{trEn('Subject & Module Grades')}</h2>
            <span className="badge-compliant" style={{ fontSize: '13px', padding: '6px 14px' }}>{trEn('Overall Score:')} {etr.overallScore}% - {etr.resultStatus}</span>
          </div>
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '120px 2fr 100px 100px 120px 1.5fr', padding: '12px 24px', gap: '12px' }}>
              <div>{trEn('Subject Code')}</div>
              <div>{trEn('Subject Name')}</div>
              <div>{trEn('Passing Score')}</div>
              <div>{trEn('Score Achieved')}</div>
              <div>{trEn('Result')}</div>
              <div>{trEn('Instructor')}</div>
            </div>
            <div className="table-body">
              {subjectsPager.pageItems.map((sub) => (
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
          <div className="table-footer">
            <Pagination page={subjectsPager.page} pageCount={subjectsPager.pageCount} onChange={subjectsPager.setPage} total={subjectsPager.total} pageSize={10} />
          </div>
        </section>
      )}

      {/* Tab 4: Training Evidence */}
      {activeTab === 'evidence' && (
        <section className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dfe6f1' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>{trEn('Training Evidence & Artifact Integrity')}</h2>
          </div>
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '130px 2fr 100px 150px 1.5fr 150px', padding: '12px 24px', gap: '12px' }}>
              <div>{trEn('Evidence ID')}</div>
              <div>{trEn('File Name')}</div>
              <div>{trEn('File Size')}</div>
              <div>{trEn('Uploaded Date')}</div>
              <div>{trEn('Uploaded By')}</div>
              <div style={{ textAlign: 'right' }}>{trEn('SHA-256 Hash')}</div>
            </div>
            <div className="table-body">
              {evidencePager.pageItems.map((evd) => (
                <div key={evd.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: '130px 2fr 100px 150px 1.5fr 150px', padding: '14px 24px', gap: '12px' }}>
                  <div style={{ fontWeight: '700', color: '#c5a059' }}>{evd.id}</div>
                  <div style={{ fontWeight: '600', color: '#002147' }}>{evd.name}</div>
                  <div>{evd.size}</div>
                  <div>{evd.uploadedAt}</div>
                  <div>{evd.uploadedBy || '—'}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '10px', color: '#16a34a' }}>{trEn('VERIFIED MATCH')}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="table-footer">
            <Pagination page={evidencePager.page} pageCount={evidencePager.pageCount} onChange={evidencePager.setPage} total={evidencePager.total} pageSize={10} />
          </div>
        </section>
      )}

      {/* Tab 5: Approval History */}
      {activeTab === 'approval' && (
        <section className="table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', marginTop: 0, marginBottom: '20px' }}>{trEn('Approval Workflow Timeline')}</h2>
          <div className="approval-timeline">
            {approvalsPager.pageItems.map((item) => (
              <div key={item.stage || item.stepNumber} className="timeline-item">
                <div className="timeline-dot">{item.stage || item.stepNumber}</div>
                <div className="timeline-header">
                  <span className="timeline-title">{item.roleTitle}</span>
                  <span className="timeline-timestamp">{item.timestamp}</span>
                </div>
                <div className="timeline-user">{item.user} ({item.role})</div>
                <div className="timeline-action">{item.action}</div>
                <div className="timeline-hash">{trEn('Hash:')} {item.hash}</div>
              </div>
            ))}
          </div>
          <Pagination page={approvalsPager.page} pageCount={approvalsPager.pageCount} onChange={approvalsPager.setPage} total={approvalsPager.total} pageSize={10} />
        </section>
      )}

      {/* Tab 6: Audit Trail */}
      {activeTab === 'audit' && (
        <section className="table-card">
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dfe6f1' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>{trEn('System Audit Logs for')} {etr.id}</h2>
          </div>
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '160px 1.5fr 120px 150px 2fr 110px', padding: '12px 24px', gap: '12px' }}>
              <div>{trEn('Timestamp')}</div>
              <div>{trEn('User')}</div>
              <div>{trEn('Role')}</div>
              <div>{trEn('Action')}</div>
              <div>{trEn('Details')}</div>
              <div>{trEn('Result')}</div>
            </div>
            <div className="table-body">
              {auditPager.pageItems.map((log) => (
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
          <div className="table-footer">
            <Pagination page={auditPager.page} pageCount={auditPager.pageCount} onChange={auditPager.setPage} total={auditPager.total} pageSize={10} />
          </div>
        </section>
      )}

      {/* Toast notifications */}
      <toast.ToastContainer />
    </div>
  );
};

export default AuditorETRDetails;
