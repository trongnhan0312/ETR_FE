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

  // Giảng viên phân công theo Môn học (InstructorAssignments / ClassSubjects / InstructorAccountId)
  const existingAssignments =
    Array.isArray(targetClass.instructorAssignments) && targetClass.instructorAssignments.length > 0
      ? targetClass.instructorAssignments
      : Array.isArray(targetClass.classSubjects) && targetClass.classSubjects.length > 0
        ? targetClass.classSubjects
        : Array.isArray(targetClass.ClassSubjects) && targetClass.ClassSubjects.length > 0
          ? targetClass.ClassSubjects
          : targetClass.instructorAccountId || targetClass.InstructorAccountId
            ? [
                {
                  subjectId: targetClass.subjectId || targetClass.SubjectId || 1,
                  instructorAccountId: targetClass.instructorAccountId || targetClass.InstructorAccountId
                }
              ]
            : [];

  const [courseSubjects, setCourseSubjects] = useState([]);
  const [instructorBySubject, setInstructorBySubject] = useState(() => {
    const init = {};
    existingAssignments.forEach((a) => {
      const sid = a.subjectId ?? a.SubjectId;
      const iid = a.instructorAccountId ?? a.InstructorAccountId;
      if (sid != null) {
        init[String(sid)] = iid != null ? String(iid) : '';
      }
    });
    return init;
  });

  // Tự động đồng bộ giảng viên vào từng môn khi danh sách courseSubjects được tải
  useEffect(() => {
    if (courseSubjects.length === 0) return;
    setInstructorBySubject((prev) => {
      const updated = { ...prev };
      let changed = false;
      courseSubjects.forEach((cs) => {
        const sidStr = String(cs.subjectId);
        if (updated[sidStr] === undefined || updated[sidStr] === '') {
          const match = existingAssignments.find(
            (a) => String(a.subjectId ?? a.SubjectId) === sidStr
          );
          if (match && (match.instructorAccountId != null || match.InstructorAccountId != null)) {
            updated[sidStr] = String(match.instructorAccountId ?? match.InstructorAccountId);
            changed = true;
          } else if (targetClass.instructorAccountId != null || targetClass.InstructorAccountId != null) {
            updated[sidStr] = String(targetClass.instructorAccountId ?? targetClass.InstructorAccountId);
            changed = true;
          }
        }
      });
      return changed ? updated : prev;
    });
  }, [courseSubjects]);

  // Load danh sách Môn học của Khóa (để hiển thị dropdown gán giảng viên theo từng môn)
  useEffect(() => {
    if (!targetClass?.courseId) return;
    api.get(`/Courses/${targetClass.courseId}`)
      .then((cDetail) => {
        if (!cDetail) return;
        const candidates = [
          cDetail.courseSubjects,
          cDetail.subjects,
          cDetail.CourseSubjects,
          cDetail.Subjects,
          cDetail.selectedSubjectIds,
          cDetail.subjectIds,
        ];
        for (const item of candidates) {
          if (Array.isArray(item) && item.length > 0) {
            setCourseSubjects(
              item.map((s, idx) => {
                if (typeof s === 'object' && s !== null) {
                  const sid = s.subjectId ?? s.SubjectId ?? s.id ?? s.Id;
                  const subDetails = subjects.find((sub) => String(sub.subjectId) === String(sid));
                  return {
                    subjectId: Number(sid) || sid,
                    sequenceNo: s.sequenceNo ?? s.SequenceNo ?? idx + 1,
                    subjectCode: s.subjectCode || s.SubjectCode || subDetails?.subjectCode || '',
                    subjectName: s.subjectName || s.SubjectName || subDetails?.subjectName || '',
                  };
                }
                const sid = Number(s) || s;
                const subDetails = subjects.find((sub) => String(sub.subjectId) === String(sid));
                return {
                  subjectId: sid,
                  sequenceNo: idx + 1,
                  subjectCode: subDetails?.subjectCode || '',
                  subjectName: subDetails?.subjectName || '',
                };
              })
            );
            return;
          }
        }
      })
      .catch(() => {});
  }, [targetClass?.courseId, subjects]);

  const subjectName = (subjectId) => {
    const sub = subjects.find((s) => String(s.subjectId) === String(subjectId));
    if (sub) {
      return `[${sub.subjectCode || 'MÔN'}] ${sub.subjectName || ''}`;
    }
    const fromCs = courseSubjects.find((cs) => String(cs.subjectId) === String(subjectId));
    if (fromCs && (fromCs.subjectCode || fromCs.subjectName)) {
      return `[${fromCs.subjectCode || 'MÔN'}] ${fromCs.subjectName || ''}`;
    }
    return `Môn #${subjectId}`;
  };

  const setSubjectInstructor = (subjectId, accountId) => {
    setInstructorBySubject((prev) => ({ ...prev, [subjectId]: accountId }));
  };

  const parseToInputDate = (dateVal) => {
    if (!dateVal) return '';
    try {
      if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
        return dateVal.slice(0, 10);
      }
      if (typeof dateVal === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateVal)) {
        const [d, m, y] = dateVal.split('/');
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      const d = new Date(dateVal);
      if (Number.isNaN(d.getTime())) return '';
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const [startDate, setStartDate] = useState(() => parseToInputDate(targetClass.startDateRaw || targetClass.startDate));
  const [endDate, setEndDate] = useState(() => parseToInputDate(targetClass.endDateRaw || targetClass.endDate));

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    // Gán giảng viên theo Môn học (ClassSubjects)
    // Neu courseSubjects chua load xong (rong) thi gui null de BE giu nguyen assignments cu
    const instructorAssignments = courseSubjects.length > 0
      ? courseSubjects.map((cs) => ({
          subjectId: cs.subjectId,
          instructorAccountId: instructorBySubject[String(cs.subjectId)]
            ? Number(instructorBySubject[String(cs.subjectId)])
            : null
        }))
      : null;

    const sDate = startDate
      ? new Date(startDate + 'T00:00:00.000Z').toISOString()
      : (targetClass.startDateRaw || new Date().toISOString());
    const eDate = endDate
      ? new Date(endDate + 'T23:59:59.999Z').toISOString()
      : (targetClass.endDateRaw || new Date(Date.now() + 30 * 86400000).toISOString());

    const firstAssigned = instructorAssignments.find((a) => a.instructorAccountId != null)?.instructorAccountId || null;

    try {
      await onSave(targetClass.classId, {
        classId: targetClass.classId,
        classCode: classCode.trim(),
        className: className.trim(),
        courseId: targetClass.courseId,
        startDate: sDate,
        endDate: eDate,
        location: targetClass.location || 'Phòng Sim A320',
        capacity: targetClass.capacity || 30,
        status: status,
        instructorAccountId: firstAssigned,
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
                  <div style={{ marginTop: '8px' }}>
                    {tr('📌 Lưu ý: hệ thống sẽ từ chối nếu lớp vẫn còn buổi học chưa được confirm. Hãy confirm toàn bộ buổi học trước khi hoàn thành lớp.')}
                  </div>
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
