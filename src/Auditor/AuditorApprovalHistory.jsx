import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { fetchApprovals, fetchEtrList } from './auditorApi';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

// Trích số thật từ id — chấp nhận "891", "ETR-2026-0891", "#ETR-0891".
const toNumericId = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
};

const AuditorApprovalHistory = () => {
  const { trEn } = useLanguage();
  const [searchParams] = useSearchParams();
  // Đọc id từ URL (?id=...) — trước đây trang bỏ qua tham số này nên luôn mặc định
  // 'ETR-2026-0891' (id giả) và timeline luôn rỗng.
  const [selectedEtrId, setSelectedEtrId] = useState(toNumericId(searchParams.get('id')));
  const [etrList, setEtrList] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [etrs, approvals] = await Promise.all([
          fetchEtrList(),
          fetchApprovals(selectedEtrId)
        ]);

        if (Array.isArray(etrs) && etrs.length > 0) {
          setEtrList(etrs);
          // Chưa chọn (mở trang trực tiếp) → mặc định hồ sơ đầu tiên THẬT
          if (!selectedEtrId) {
            setSelectedEtrId(etrs[0]?.etrCourseRecordId ?? null);
          }
        }
        setTimeline(approvals);
      } catch (err) {
        console.error('Error fetching approval history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedEtrId]);

  const { page, setPage, pageCount, pageItems, total } = usePagination(timeline, {
    pageSize: 10,
    resetKey: selectedEtrId,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>{trEn('Approval History & Workflow Verification')}</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            {trEn('Audit inspection of multi-stage approval workflows, personnel authorizations, timestamps, and cryptographic lock state.')}
          </p>
        </div>

        <div style={{ minWidth: '240px' }}>
          <label style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            {trEn('Select Locked ETR')}
          </label>
          <select
            className="search-input"
            style={{ width: '100%', background: '#ffffff' }}
            value={selectedEtrId ?? ''}
            onChange={(e) => setSelectedEtrId(Number(e.target.value) || null)}
          >
            {etrList.map((item) => (
              <option key={item.etrCourseRecordId} value={item.etrCourseRecordId}>
                {item.id} - {item.learnerName} ({item.courseId})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Workflow Diagram Banner */}
      <section className="table-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
          {trEn('Mandatory Aviation Approval Sequence Flow')}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ padding: '12px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Step 1')}</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>{trEn('Academic Staff')}</div>
          </div>
          <div style={{ color: '#c5a059', fontWeight: '900', fontSize: '18px' }}>↓</div>

          <div style={{ padding: '12px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Step 2')}</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>{trEn('QA Verification')}</div>
          </div>
          <div style={{ color: '#c5a059', fontWeight: '900', fontSize: '18px' }}>↓</div>

          <div style={{ padding: '12px 18px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase' }}>{trEn('Step 3')}</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#002147', marginTop: '4px' }}>{trEn('Training Manager Approval')}</div>
          </div>
          <div style={{ color: '#c5a059', fontWeight: '900', fontSize: '18px' }}>↓</div>

          <div style={{ padding: '12px 18px', borderRadius: '12px', background: '#0a2c55', color: '#ffffff', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#d4af37', textTransform: 'uppercase' }}>{trEn('Step 4')}</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>{trEn('System Locked')}</div>
          </div>
          <div style={{ color: '#c5a059', fontWeight: '900', fontSize: '18px' }}>↓</div>

          <div style={{ padding: '12px 18px', borderRadius: '12px', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)', color: '#ffffff', textAlign: 'center', flex: 1, minWidth: '140px' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', textTransform: 'uppercase', opacity: 0.8 }}>{trEn('Step 5')}</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>{trEn('Audited')}</div>
          </div>
        </div>
      </section>

      {/* Approval Timeline Detail Card */}
      <section className="table-card" style={{ padding: '28px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', marginTop: 0, marginBottom: '24px' }}>
          {trEn('Detailed Execution Log for')} {selectedEtrId}
        </h2>

        {loading ? (
          <div className="empty-table-state">{trEn('Loading approval history...')}</div>
        ) : (
          <div className="approval-timeline">
            {pageItems.map((step) => (
              <div key={step.stage || step.stepNumber} className="timeline-item">
                <div className="timeline-dot">{step.stage || step.stepNumber}</div>
                <div className="timeline-header">
                  <span className="timeline-title">{step.roleTitle}</span>
                  <span className="timeline-timestamp">{step.timestamp}</span>
                </div>
                <div className="timeline-user">
                  <strong>{trEn('User:')}</strong> {step.user} &nbsp;|&nbsp; <strong>{trEn('Role:')}</strong> {step.role}
                </div>
                <div className="timeline-action" style={{ marginTop: '6px' }}>
                  <strong>{trEn('Action Executed:')}</strong> {step.action}
                </div>
                <div className="timeline-hash">
                  {trEn('Cryptographic Signature:')} {step.hash}
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          total={total}
          pageSize={10}
        />
      </section>
    </div>
  );
};

export default AuditorApprovalHistory;
