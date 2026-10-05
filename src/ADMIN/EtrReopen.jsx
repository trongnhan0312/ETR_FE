import { useState, useEffect } from 'react';
import { api, parseApiError, formatDateTime } from '../utils/api';
import { announce } from '../utils/crudNotify';
import PromptModal from '../components/PromptModal';
import EtrDossierModal from '../components/EtrDossierModal';
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

  const [viewingEtrId, setViewingEtrId] = useState(null);
  const [reopenTarget, setReopenTarget] = useState(null);

  const loadLockedEtrs = async () => {
    setLoading(true);
    try {
      const [etrs, enrollments, profiles, classes, courses] = await Promise.all([
        api.get('/Etr').catch(() => []),
        api.get('/Enrollments').catch(() => []),
        api.get('/UserProfiles/learners').catch(() => api.get('/UserProfiles').catch(() => [])),
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
          const etrId = e.etrCourseRecordId ?? e.eTRCourseRecordId ?? e.ETRCourseRecordId;
          const rawEid = e.enrollmentId ?? e.EnrollmentId;
          const enr = enrArr.find((e2) => String(e2.enrollmentId ?? e2.EnrollmentId) === String(rawEid));
          const accountId = enr?.accountId ?? enr?.AccountId;
          const prof = accountId != null
            ? profArr.find((p) => String(p.accountId ?? p.AccountId) === String(accountId))
            : null;
          const classId = enr?.classId ?? enr?.ClassId;
          const cls = classId != null
            ? clsArr.find((c) => String(c.classId ?? c.ClassId) === String(classId))
            : null;
          const courseId = cls?.courseId ?? cls?.CourseId;
          const course = courseId != null
            ? courseArr.find((c) => String(c.courseId ?? c.CourseId) === String(courseId))
            : null;
          return {
            etrId,
            id: `#ETR-${String(etrId).padStart(4, '0')}`,
            enrollmentId: rawEid,
            accountId,
            studentName: prof?.fullName || prof?.FullName || enr?.fullName || enr?.FullName || (accountId != null ? `Learner #${accountId}` : tr('Học viên')),
            studentCode: prof?.userCode || prof?.UserCode || prof?.employeeCode || '',
            courseName: course?.courseName || course?.CourseName || course?.name || cls?.className || cls?.ClassName || '',
            className: cls?.className || cls?.ClassName || cls?.classCode || cls?.ClassCode || '',
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

      // Async enrich with dossier if any field is still missing
      Promise.all(mapped.map(async (rec) => {
        if (!rec.courseName || rec.studentName.includes('#')) {
          try {
            const dos = await api.get(`/Etr/${rec.etrId}/dossier`);
            if (dos?.student?.fullName) rec.studentName = dos.student.fullName;
            if (dos?.student?.userCode) rec.studentCode = dos.student.userCode;
            if (dos?.course?.courseName) rec.courseName = dos.course.courseName;
            if (dos?.class?.className) rec.className = dos.class.className;
          } catch {}
        }
      })).then(() => setRecords([...mapped]));
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

  const handleView = (rec) => {
    setViewingEtrId(rec.etrId);
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
      setViewingEtrId(null);
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
                    📂 {tr('Xem hồ sơ (Dossier)')}
                  </button>
                  <button
                    className="action-btn"
                    type="button"
                    onClick={() => setReopenTarget(r.etrId)}
                    style={{ padding: '4px 12px', fontSize: '12px', cursor: 'pointer', color: '#b45309', borderColor: 'rgba(180,83,9,0.35)', background: '#fffbeb', fontWeight: '700' }}
                  >
                    🔓 {tr('Mở lại (Reopen)')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination page={pager.page} pageCount={pager.pageCount} onChange={pager.setPage} total={pager.total} pageSize={10} />
      </section>

      {/* COMPREHENSIVE 6-TAB ETR DOSSIER MODAL */}
      <EtrDossierModal
        etrId={viewingEtrId}
        isOpen={!!viewingEtrId}
        onClose={() => setViewingEtrId(null)}
        onActionSuccess={loadLockedEtrs}
      />

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
