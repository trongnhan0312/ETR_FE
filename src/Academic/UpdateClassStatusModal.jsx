import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const UpdateClassStatusModal = ({ targetClass, instructors = [], subjects = [], onSave, onCancel }) => {
  const { tr } = useLanguage();
  const [classCode, setClassCode] = useState(targetClass.code || targetClass.classCode || '');
  const [className, setClassName] = useState(targetClass.name || targetClass.className || '');
  const [status, setStatus] = useState(() => {
    const raw = targetClass.status || 'InProgress';
    if (raw === 'Đang diễn ra' || raw === 'Active') return 'InProgress';
    if (raw === 'Sắp diễn ra' || raw === 'Upcoming' || raw === 'Planned') return 'Planned';
    if (raw === 'Đã kết thúc' || raw === 'Completed') return 'Completed';
    if (raw === 'Đã hủy' || raw === 'Cancelled') return 'Cancelled';
    return raw;
  });

  // Giảng viên phân công theo Môn học (InstructorAssignments) — Class không còn InstructorAccountId cấp lớp
  const existingAssignments = Array.isArray(targetClass.instructorAssignments)
    ? targetClass.instructorAssignments
    : [];
  const [courseSubjects, setCourseSubjects] = useState([]);
  const [instructorBySubject, setInstructorBySubject] = useState(() => {
    const init = {};
    existingAssignments.forEach((a) => {
      if (a.subjectId != null) {
        init[String(a.subjectId)] = a.instructorAccountId != null ? String(a.instructorAccountId) : '';
      }
    });
    return init;
  });

  // Load danh sách Môn học của Khóa (để hiển thị dropdown gán giảng viên theo từng môn)
  useEffect(() => {
    if (!targetClass?.courseId) return;
    api.get(`/Courses/${targetClass.courseId}`)
      .then((cDetail) => {
        if (cDetail && Array.isArray(cDetail.courseSubjects)) {
          setCourseSubjects(cDetail.courseSubjects);
        }
      })
      .catch(() => {});
  }, [targetClass?.courseId]);

  const subjectName = (subjectId) => {
    const sub = subjects.find((s) => String(s.subjectId) === String(subjectId));
    return sub ? `[${sub.subjectCode}] ${sub.subjectName}` : `Môn #${subjectId}`;
  };

  const setSubjectInstructor = (subjectId, accountId) => {
    setInstructorBySubject((prev) => ({ ...prev, [subjectId]: accountId }));
  };

  const [startDate, setStartDate] = useState(() => {
    if (!targetClass.startDate) return '';
    try {
      const d = new Date(targetClass.startDate);
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  });

  const [endDate, setEndDate] = useState(() => {
    if (!targetClass.endDate) return '';
    try {
      const d = new Date(targetClass.endDate);
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    // Gán giảng viên theo Môn học (ClassSubjects)
    const instructorAssignments = courseSubjects.map((cs) => ({
      subjectId: cs.subjectId,
      instructorAccountId: instructorBySubject[String(cs.subjectId)]
        ? Number(instructorBySubject[String(cs.subjectId)])
        : null
    }));

    try {
      await onSave(targetClass.classId, {
        classId: targetClass.classId,
        classCode: classCode.trim(),
        className: className.trim(),
        courseId: targetClass.courseId,
        startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
        location: targetClass.location || '',
        capacity: targetClass.capacity || 30,
        status: status,
        instructorAssignments
      });
    } catch (err) {
      setErrorMsg(err?.message || tr('Cập nhật trạng thái lớp học thất bại. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const modalJSX = (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 33, 71, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="modal-container" style={{ width: '640px', maxWidth: '95vw', maxHeight: '90vh', margin: 'auto' }}>
        <header className="modal-header">
          <h2>{tr('CẬP NHẬT TRẠNG THÁI LỚP #')}{targetClass.classId}</h2>
          <button className="close-btn" type="button" onClick={onCancel} aria-label={tr('Đóng')}>
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px' }}>
            {errorMsg && (
              <div style={{
                backgroundColor: '#fef2f2',
                borderLeft: '4px solid #ef4444',
                color: '#991b1b',
                padding: '12px 16px',
                borderRadius: '4px',
                fontSize: '13px',
                marginBottom: '20px'
              }}>
                <strong>{tr('Lỗi Cập Nhật: ')}</strong>{errorMsg}
              </div>
            )}

            {/* Basic Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e0e4e9', paddingBottom: '6px' }}>
                {tr('Thông tin cơ bản lớp học')}
              </div>

              <div className="form-group">
                <label htmlFor="update-class-code" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  {tr('Mã lớp học *')}
                </label>
                <input
                  id="update-class-code"
                  type="text"
                  className="premium-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="update-class-name" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  {tr('Tên lớp học *')}
                </label>
                <input
                  id="update-class-name"
                  type="text"
                  className="premium-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Instructor assignment per subject */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e0e4e9', paddingBottom: '6px' }}>
                {tr('Phân công giảng viên theo môn học')}
              </div>
              {courseSubjects.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                  {tr('Khóa học này chưa có môn học được cấu hình.')}
                </div>
              ) : (
                courseSubjects.map((cs, idx) => (
                  <div key={cs.subjectId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', flex: '1 1 auto' }}>
                      <span style={{ color: '#c5a059', fontWeight: 800 }}>#{idx + 1}</span> {subjectName(cs.subjectId)}
                    </span>
                    <select
                      className="premium-input"
                      style={{ width: '240px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px', backgroundColor: '#fff' }}
                      value={instructorBySubject[String(cs.subjectId)] || ''}
                      onChange={(e) => setSubjectInstructor(String(cs.subjectId), e.target.value)}
                    >
                      <option value="">{tr('Chưa phân công')}</option>
                      {instructors.map((ins) => (
                        <option key={ins.accountId} value={ins.accountId}>
                          {ins.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>

            {/* Status selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e0e4e9', paddingBottom: '6px' }}>
                {tr('Trạng thái hoạt động lớp')}
              </div>

              <div className="form-group">
                <label htmlFor="update-class-status-select" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'block' }}>
                  {tr('Chọn trạng thái *')}
                </label>
                <select
                  id="update-class-status-select"
                  className="premium-input"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 600 }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  <option value="InProgress">{tr('🟢 InProgress (Đang diễn ra - Cho phép Ghi danh)')}</option>
                  <option value="Planned">{tr('🟡 Planned (Sắp diễn ra - Cho phép Ghi danh)')}</option>
                  <option value="Completed">{tr('🔴 Completed (Đã kết thúc - Khóa ghi danh mới)')}</option>
                  <option value="Cancelled">{tr('⚫ Cancelled (Đã hủy - Khóa lớp)')}</option>
                </select>
              </div>

              {status === 'Completed' && (
                <div style={{ fontSize: '12px', color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px 14px', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                  {tr('⚠️ Khi chuyển sang')} <strong>{tr('Completed (Đã kết thúc)')}</strong>{tr(', nút ➕ Ghi danh của lớp học này sẽ tự động chuyển thành')} <code>{tr('⛔ Đã kết thúc')}</code> {tr('để khóa ghi danh học viên mới theo quy định tuân thủ ETR.')}
                </div>
              )}
            </div>

            {/* Dates */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e0e4e9', paddingBottom: '6px' }}>
                {tr('Thời gian lịch trình')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="update-class-start" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                    {tr('Ngày bắt đầu')}
                  </label>
                  <input
                    id="update-class-start"
                    type="date"
                    className="premium-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="update-class-end" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                    {tr('Ngày kết thúc')}
                  </label>
                  <input
                    id="update-class-end"
                    type="date"
                    className="premium-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <footer className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e0e4e9' }}>
            <button className="cancel-btn" type="button" onClick={onCancel} disabled={submitting}>
              {tr('HỦY BỎ')}
            </button>
            <button className="save-btn gold-gradient-btn" type="submit" disabled={submitting}>
              {submitting ? tr('ĐANG LƯU...') : tr('LƯU THAY ĐỔI TRẠNG THÁI')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default UpdateClassStatusModal;
