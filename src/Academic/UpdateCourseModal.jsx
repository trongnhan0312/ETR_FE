import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const UpdateCourseModal = ({ course, onSave, onCancel }) => {
  const { tr } = useLanguage();
  const [courseCode, setCourseCode] = useState(course.code || course.courseCode || '');
  const [courseName, setCourseName] = useState(course.name || course.courseName || '');
  const [durationHours, setDurationHours] = useState(String(course.duration || course.durationHours || '120'));
  const [description, setDescription] = useState(course.description || '');
  const [status, setStatus] = useState(course.status || 'Active');

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const [subList, cDetail] = await Promise.all([
          api.get('/Subjects').catch(() => []),
          api.get(`/Courses/${course.courseId}`).catch(() => null)
        ]);

        const subs = Array.isArray(subList) ? subList : [];
        setAvailableSubjects(subs);

        if (cDetail && Array.isArray(cDetail.courseSubjects) && cDetail.courseSubjects.length > 0) {
          setSelectedSubjectIds(cDetail.courseSubjects.map((cs) => String(cs.subjectId)));
        } else if (course.subjects && Array.isArray(course.subjects)) {
          setSelectedSubjectIds(course.subjects.map((s) => String(s.subjectId)));
        } else {
          setSelectedSubjectIds(subs.map((s) => String(s.subjectId)));
        }
      } catch (err) {
        console.error('Error loading subjects for UpdateCourseModal:', err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchSubjects();
  }, [course.courseId, course.subjects]);

  const handleSubjectToggle = (subIdStr) => {
    setSelectedSubjectIds((prev) => {
      if (prev.includes(subIdStr)) {
        return prev.filter((id) => id !== subIdStr);
      } else {
        return [...prev, subIdStr];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (selectedSubjectIds.length === 0) {
      setErrorMsg(tr('❌ Quy tắc tuân thủ (Business Rule): Khóa học bắt buộc phải được cấu hình ít nhất 1 Môn học (Subject).'));
      return;
    }

    setSubmitting(true);
    try {
      await onSave(course.courseId, {
        courseId: course.courseId,
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
        description: description.trim(),
        durationHours: parseInt(durationHours) || 0,
        status: status === 'Active' || status === 'HOẠT ĐỘNG' ? 'Active' : 'Pending'
      });
    } catch (err) {
      setErrorMsg(err?.message || tr('Cập nhật khóa học thất bại. Vui lòng thử lại.'));
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
      <div className="modal-container" style={{ width: '700px', maxWidth: '95vw', maxHeight: '90vh', margin: 'auto' }}>
        <header className="modal-header">
          <h2>{tr('CẬP NHẬT THÔNG TIN KHÓA HỌC #')}{course.courseId}</h2>
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
                {tr('Thông tin khóa học')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="update-course-code" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                    {tr('Mã khóa học *')}
                  </label>
                  <input
                    id="update-course-code"
                    type="text"
                    className="premium-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="update-course-duration" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                    {tr('Thời lượng (Giờ) *')}
                  </label>
                  <input
                    id="update-course-duration"
                    type="number"
                    className="premium-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="update-course-name" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  {tr('Tên khóa học *')}
                </label>
                <input
                  id="update-course-name"
                  type="text"
                  className="premium-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="update-course-desc" style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px', display: 'block' }}>
                  {tr('Mô tả chương trình')}
                </label>
                <textarea
                  id="update-course-desc"
                  className="premium-textarea"
                  style={{ width: '100%', height: '70px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Course Subjects Configuration */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0e4e9', paddingBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {tr('Cấu hình Môn học (COURSE_SUBJECTS) *')}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: selectedSubjectIds.length > 0 ? '#16a34a' : '#dc2626' }}>
                  {selectedSubjectIds.length > 0 ? `${tr('✓ Đã chọn')} ${selectedSubjectIds.length} ${tr('môn')}` : tr('❌ Chọn ít nhất 1 môn')}
                </span>
              </div>

              {loadingSubjects ? (
                <div style={{ fontSize: '12px', color: '#64748b' }}>{tr('Đang tải danh sách môn học...')}</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {availableSubjects.map((sub) => {
                    const subIdStr = String(sub.subjectId);
                    const isChecked = selectedSubjectIds.includes(subIdStr);
                    return (
                      <label key={sub.subjectId} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleSubjectToggle(subIdStr)}
                        />
                        <span style={{ fontWeight: isChecked ? 700 : 400, color: isChecked ? '#002147' : '#475569' }}>
                          [{sub.subjectCode}] {sub.subjectName}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="update-course-status" style={{ fontSize: '12px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                {tr('Trạng thái Khóa học *')}
              </label>
              <select
                id="update-course-status"
                className="premium-input"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 600 }}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Active">{tr('🟢 Active (Hoạt động)')}</option>
                <option value="Pending">{tr('🟡 Pending (Tạm dừng)')}</option>
              </select>
            </div>
          </div>

          <footer className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e0e4e9' }}>
            <button className="cancel-btn" type="button" onClick={onCancel} disabled={submitting}>
              {tr('HỦY BỎ')}
            </button>
            <button className="save-btn gold-gradient-btn" type="submit" disabled={submitting || selectedSubjectIds.length === 0}>
              {submitting ? tr('ĐANG LƯU...') : tr('LƯU THAY ĐỔI KHÓA HỌC')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default UpdateCourseModal;
