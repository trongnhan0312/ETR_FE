import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, parseApiError, formatDateTime } from '../utils/api';
import { announce } from '../utils/crudNotify';
import PromptModal from '../components/PromptModal';
import { useToast } from '../components/Toast';
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

/**
 * Admin Portal — ETR Reopen.
 * Hiển thị TOÀN BỘ hồ sơ ETR đang bị đóng băng/khóa (IsLocked = true) và cho phép
 * Admin mở khóa (Reopen) để chỉnh sửa. Khớp backend:
 *   GET  /Etr                    → EtrSummaryResponse (gồm IsLocked, CompletedAt...)
 *   POST /Etr/{id}/reopen        → body { comment* } (Admin-only, Completed → Verified, audit UNLOCK)
 * Không có History/Return/Approve ở trang này — Admin chỉ Xem + Reopen.
 */
const EtrReopen = () => {
  const { tr } = useLanguage();
  const toast = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [viewingEtr, setViewingEtr] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reopenTarget, setReopenTarget] = useState(null);

  const loadLockedEtrs = async () => {
    setLoading(true);
    try {
      const [etrs, enrollments, profiles, classes, courses] = await Promise.all([
        api.get('/Etr').catch(() => []),
        api.get('/Enrollments').catch(() => []),
        api.get('/UserProfiles').catch(() => []),
        api.get('/Classes').catch(() => []),
        api.get('/Courses').catch(() => []),
      ]);
      const etrsArr = Array.isArray(etrs) ? etrs : [];
      const enrArr = Array.isArray(enrollments) ? enrollments : [];
      const profArr = Array.isArray(profiles) ? profiles : [];
      const clsArr = Array.isArray(classes) ? classes : [];
      const courseArr = Array.isArray(courses) ? courses : [];

      const mapped = etrsArr
        .filter((e) => (e.isLocked ?? e.IsLocked) === true)
        .map((e) => {
          const etrId = e.etrCourseRecordId ?? e.eTRCourseRecordId;
          const enr = enrArr.find((e2) => e2.enrollmentId === e.enrollmentId);
          const accountId = enr?.accountId;
          const prof = accountId != null
            ? profArr.find((p) => String(p.accountId) === String(accountId))
            : null;
          const cls = enr?.classId != null
            ? clsArr.find((c) => String(c.classId) === String(enr.classId))
            : null;
          const course = cls?.courseId != null
            ? courseArr.find((c) => String(c.courseId) === String(cls.courseId))
            : null;
          return {
            etrId,
            id: `#ETR-${String(etrId).padStart(4, '0')}`,
            enrollmentId: e.enrollmentId,
            accountId,
            studentName: prof?.fullName || enr?.fullName || (accountId != null ? `Student #${accountId}` : tr('Học viên')),
            studentCode: prof?.userCode || prof?.employeeCode || '',
            courseName: course?.courseName || course?.name || cls?.className || '',
            className: cls?.className || cls?.classCode || '',
            status: e.status || '',
            isLocked: true,
            submittedAt: e.submittedAt ?? e.SubmittedAt ?? null,
            verifiedAt: e.verifiedAt ?? e.VerifiedAt ?? null,
            completedAt: e.completedAt ?? e.CompletedAt ?? null,
          };
        })
        // Mới bị khóa trước (completedAt giảm dần), fallback etrId giảm dần
        .sort((a, b) => {
          const ta = a.completedAt ? new Date(a.completedAt).getTime() : NaN;
          const tb = b.completedAt ? new Date(b.completedAt).getTime() : NaN;
          if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
          if (!Number.isNaN(ta) && Number.isNaN(tb)) return -1;
          if (Number.isNaN(ta) && !Number.isNaN(tb)) return 1;
          return (b.etrId || 0) - (a.etrId || 0);
        });
      setRecords(mapped);
    } catch (err) {
      console.error('Error loading locked ETRs:', err);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLockedEtrs();
  }, []);

  const filtered = records.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      r.studentName.toLowerCase().includes(q) ||
      r.studentCode.toLowerCase().includes(q) ||
      r.courseName.toLowerCase().includes(q) ||
      r.className.toLowerCase().includes(q)
    );
  });

  const pager = usePagination(filtered, { pageSize: 10, resetKey: searchTerm });

  const handleView = async (rec) => {
    setViewingEtr(rec);
    setViewDetail(null);
    setLoadingDetail(true);
    try {
      const detail = await api.get(`/Etr/${rec.etrId}`).catch(() => null);
      setViewDetail(detail);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleConfirmReopen = async (reason) => {
    const etrId = reopenTarget;
    if (!reason || !reason.trim()) {
      toast.error(tr('Cần nêu lý do để mở lại ETR.'));
      setReopenTarget(null);
      return;
    }
    setSubmitting(true);
    try {
      // POST /api/Etr/{id}/reopen { comment } — Admin-only; Completed → Verified + audit UNLOCK
      await api.post(`/Etr/${etrId}/reopen`, { comment: reason.trim() });
      await loadLockedEtrs();
      setViewingEtr(null);
      toast.success(tr('Đã mở lại ETR'), announce('edit', tr('Hồ sơ')));
    } catch (err) {
      console.error('Failed to reopen ETR:', err);
      toast.error(parseApiError(err, tr('Mở lại ETR thất bại')));
    } finally {
      setSubmitting(false);
      setReopenTarget(null);
    }
  };

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{tr('Administrator Management')}</p>
          <h1>{tr('ETR Reopen')}</h1>
          <p className="page-description">
            {tr('Danh sách toàn bộ hồ sơ ETR đang bị đóng băng/khóa (Completed + Locked). Admin xem chi tiết và mở khóa (Reopen) để chỉnh sửa — thao tác yêu cầu lý do và được ghi Audit Log.')}
          </p>
        </div>
        <div className="page-status-box">
          <span className="eyebrow" style={{ margin: 0 }}>{tr('HỒ SƠ ĐANG KHÓA')}</span>
          <strong style={{ fontSize: '24px', margin: '4px 0 0', color: '#002147' }}>
            {loading ? '...' : records.length}
          </strong>
          <p style={{ fontSize: '12px', marginTop: '2px' }}>{tr('Cần mở lại để chỉnh sửa')}</p>
        </div>
      </section>

      <section className="table-section">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="section-label">{tr('Locked ETR Records')}</p>
            <h2>{tr('Hồ sơ ETR đang bị khóa')} ({filtered.length})</h2>
          </div>
          <input
            type="text"
            placeholder={tr('Tìm theo mã ETR, học viên, khóa học...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', width: '280px' }}
          />
        </div>

        <div className="data-table" style={{ marginTop: '16px' }}>
          <div className="table-header table-layout" style={{ gridTemplateColumns: '0.8fr 1.4fr 1.4fr 1fr 1fr 1.2fr', alignItems: 'center' }}>
            <div>{tr('ETR ID')}</div>
            <div>{tr('Học viên')}</div>
            <div>{tr('Khóa học / Lớp')}</div>
            <div>{tr('Trạng thái')}</div>
            <div>{tr('Ngày hoàn thành')}</div>
            <div style={{ textAlign: 'right' }}>{tr('Thao tác')}</div>
          </div>

          {loading ? (
            <div className="table-row" style={{ justifyContent: 'center', padding: '24px', color: '#64748b' }}>
              {tr('Đang tải danh sách hồ sơ bị khóa...')}
            </div>
          ) : filtered.length === 0 ? (
            <div className="table-row" style={{ justifyContent: 'center', padding: '24px', color: '#64748b', fontStyle: 'italic' }}>
              {tr('Không có hồ sơ ETR nào đang bị khóa.')}
            </div>
          ) : (
            pager.pageItems.map((r) => (
              <div key={r.etrId} className="table-row table-layout" style={{ gridTemplateColumns: '0.8fr 1.4fr 1.4fr 1fr 1fr 1.2fr', alignItems: 'center' }}>
                <div className="font-medium" style={{ color: '#b45309', fontWeight: '700' }}>{r.id}</div>
                <div>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>{r.studentName}</div>
                  {r.studentCode && <div style={{ fontSize: '11px', color: '#64748b' }}>{r.studentCode}</div>}
                </div>
                <div>
                  <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{r.courseName || '—'}</div>
                  {r.className && <div style={{ fontSize: '11px', color: '#64748b' }}>{r.className}</div>}
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px', background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                    🔒 {r.status ? String(r.status).toUpperCase() : 'LOCKED'}
                  </span>
                </div>
                <div className="text-gray" style={{ fontSize: '12px' }}>
                  {r.completedAt ? formatDateTime(r.completedAt) : '—'}
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button className="action-btn" type="button" onClick={() => handleView(r)} style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}>
                    {tr('Xem')}
                  </button>
                  <button
                    className="action-btn"
                    type="button"
                    onClick={() => setReopenTarget(r.etrId)}
                    style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', color: '#b45309', borderColor: 'rgba(180,83,9,0.35)', background: '#fffbeb', fontWeight: '700' }}
                  >
                    {tr('Mở lại (Reopen)')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} total={pager.total} pageSize={10} />
      </section>

      {/* VIEW DETAIL MODAL (read-only) */}
      {viewingEtr && createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px 28px', width: '100%', maxWidth: '560px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#002147', fontWeight: '700' }}>
                {tr('Chi tiết hồ sơ')} {viewingEtr.id}
              </h2>
              <button type="button" onClick={() => { setViewingEtr(null); setViewDetail(null); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>
                &times;
              </button>
            </div>
            {loadingDetail ? (
              <p style={{ color: '#64748b', fontSize: '13px' }}>{tr('Đang tải chi tiết...')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                {[
                  [tr('Học viên'), viewingEtr.studentName + (viewingEtr.studentCode ? ` (${viewingEtr.studentCode})` : '')],
                  [tr('Khóa học'), viewingEtr.courseName || '—'],
                  [tr('Lớp'), viewingEtr.className || '—'],
                  [tr('Trạng thái'), `${viewingEtr.status || ''} (Locked)`],
                  [tr('Ngày nộp'), viewingEtr.submittedAt ? formatDateTime(viewingEtr.submittedAt) : '—'],
                  [tr('Ngày QA duyệt'), viewingEtr.verifiedAt ? formatDateTime(viewingEtr.verifiedAt) : '—'],
                  [tr('Ngày hoàn thành'), viewingEtr.completedAt ? formatDateTime(viewingEtr.completedAt) : '—'],
                  [tr('Số môn học'), Array.isArray(viewDetail?.subjectResults) ? viewDetail.subjectResults.length : '—'],
                ].map(([label, value], idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '8px 12px', background: idx % 2 === 0 ? '#f8fafc' : '#fff', borderRadius: '8px' }}>
                    <span style={{ color: '#64748b', fontWeight: '600' }}>{label}</span>
                    <span style={{ color: '#0f172a', fontWeight: '600', textAlign: 'right' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button type="button" onClick={() => { setViewingEtr(null); setViewDetail(null); }} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer' }}>
                {tr('Đóng')}
              </button>
              <button
                type="button"
                onClick={() => setReopenTarget(viewingEtr.etrId)}
                disabled={submitting}
                style={{ padding: '8px 18px', background: '#b45309', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
              >
                {tr('Mở lại (Reopen)')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* REOPEN REASON MODAL — POST /Etr/{id}/reopen { comment* } */}
      <PromptModal
        isOpen={!!reopenTarget}
        onClose={() => setReopenTarget(null)}
        onConfirm={handleConfirmReopen}
        title={`${tr('Mở lại (Reopen)')} ETR #${String(reopenTarget || '').padStart(4, '0')}`}
        message={tr('Mở khóa hồ sơ ETR đã Completed để chỉnh sửa (trạng thái chuyển về Verified). Bắt buộc nêu lý do — thao tác được ghi Audit Log.')}
        placeholder={tr('Nhập lý do mở lại ETR...')}
        confirmText={tr('XÁC NHẬN MỞ LẠI')}
        cancelText={tr('HỦY BỎ')}
        variant="gold"
        required
      />

      <toast.ToastContainer />
    </div>
  );
};

export default EtrReopen;
