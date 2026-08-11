import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const CreateClass = ({ courses = [], initialCourseId = null, instructors = [], onSave, onCancel }) => {
  const { tr } = useLanguage();
  const getInitialCourseId = () => {
    if (initialCourseId && courses.some(c => String(c.courseId) === String(initialCourseId))) {
      return String(initialCourseId);
    }
    return courses[0]?.courseId ? String(courses[0].courseId) : '';
  };

  const [parentCourse, setParentCourse] = useState(getInitialCourseId);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  // Default dates: Today & Today + 30 days — dùng ngày LOCAL (không dùng toISOString/UTC)
  // để tránh lệch ngày do múi giờ (VD ở Việt Nam trước 7h sáng UTC sẽ tính ra ngày hôm trước).
  const toLocalDateStr = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = toLocalDateStr(new Date());
  const nextMonthStr = toLocalDateStr(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(nextMonthStr);
  const [instructorAccountId, setInstructorAccountId] = useState('');
  const [status, setStatus] = useState('Sắp diễn ra');
  const [subjectWarning, setSubjectWarning] = useState('');

  useEffect(() => {
    if (!parentCourse) return;
    setSubjectWarning('');

    api.get(`/Courses/${parentCourse}`).then((cDetail) => {
      if (cDetail && Array.isArray(cDetail.courseSubjects) && cDetail.courseSubjects.length === 0) {
        setSubjectWarning(`${tr('⚠️ Khóa học')} "${cDetail.courseName || cDetail.courseCode}" ${tr('chưa có Môn học (Subject). Theo quy định ETR, Khóa học cần có môn học trước khi mở Lớp & Ghi danh.')}`);
      }
    }).catch(() => {});
  }, [parentCourse]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!parentCourse) {
      alert(tr('Vui lòng chọn Khóa học đào tạo.'));
      return;
    }

    const newClass = {
      code: code.trim(),
      name: name.trim(),
      startDate: startDate || todayStr,
      endDate: endDate || nextMonthStr,
      status,
      attendanceRate: 0,
      instructorAccountId: instructorAccountId ? Number(instructorAccountId) : null
    };

    onSave(Number(parentCourse), newClass);
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
          <h2>{tr('TẠO LỚP HỌC MỚI')}</h2>
          <button className="close-btn" type="button" onClick={onCancel} aria-label={tr('Đóng')}>
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px' }}>
            {/* Subject warning banner if course has no subjects */}
            {subjectWarning && (
              <div style={{
                backgroundColor: '#fff7ed',
                borderLeft: '4px solid #f97316',
                color: '#c2410c',
                padding: '12px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '20px',
                lineHeight: '1.5'
              }}>
                {subjectWarning}
              </div>
            )}

            {/* Parent Course selection */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="class-parent-select" style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                {tr('Thuộc khóa học đào tạo *')}
              </label>
              <select
                id="class-parent-select"
                className="premium-input"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e0e4e8', fontSize: '14px', outline: 'none' }}
                value={parentCourse}
                onChange={(e) => setParentCourse(e.target.value)}
                required
              >
                {courses.length === 0 ? (
                  <option value="">{tr('Chưa có khóa học nào trong CSDL')}</option>
                ) : (
                  courses.map((course) => (
                    <option key={course.courseId} value={course.courseId}>
                      {course.courseCode || course.code} - {course.courseName || course.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Basic Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                {tr('THÔNG TIN LỚP HỌC')}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="class-code-input">{tr('Mã lớp học (Tối đa 20 ký tự) *')}</label>
                  <input
                    id="class-code-input"
                    type="text"
                    placeholder={tr('Ví dụ: JET-2024-Q3')}
                    value={code}
                    maxLength={20}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="class-instructor-select">{tr('Giảng viên giảng dạy')}</label>
                  <select
                    id="class-instructor-select"
                    value={instructorAccountId}
                    onChange={(e) => setInstructorAccountId(e.target.value)}
                  >
                    <option value="">{tr('Chưa phân công')}</option>
                    {instructors.map((ins) => (
                      <option key={ins.accountId} value={ins.accountId}>
                        {ins.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="class-name-input">{tr('Tên lớp học *')}</label>
                <input
                  id="class-name-input"
                  type="text"
                  placeholder={tr('Ví dụ: Lớp Động cơ Jet - Khóa 3/2024')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Training Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                {tr('THỜI GIAN ĐÀO TẠO')}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="class-start-date">{tr('Ngày bắt đầu *')}</label>
                  <input
                    id="class-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="class-end-date">{tr('Ngày kết thúc *')}</label>
                  <input
                    id="class-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Class Initial Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                {tr('TRẠNG THÁI LỚP HỌC')}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#002147', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="class-status"
                    value="Sắp diễn ra"
                    checked={status === 'Sắp diễn ra'}
                    onChange={() => setStatus('Sắp diễn ra')}
                  />
                  <span>{tr('Sắp diễn ra')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#002147', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="class-status"
                    value="Đang diễn ra"
                    checked={status === 'Đang diễn ra'}
                    onChange={() => setStatus('Đang diễn ra')}
                  />
                  <span>{tr('Đang diễn ra')}</span>
                </label>
              </div>
            </div>
          </div>

          <footer className="modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e0e4e9' }}>
            <button className="cancel-btn" type="button" onClick={onCancel}>
              {tr('HỦY BỎ')}
            </button>
            <button className="save-btn gold-gradient-btn" type="submit" disabled={courses.length === 0}>
              {tr('TẠO LỚP HỌC')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
};

export default CreateClass;
