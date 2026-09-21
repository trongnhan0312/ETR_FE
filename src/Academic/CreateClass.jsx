import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const CreateClass = ({ courses = [], initialCourseId = null, instructors = [], subjects = [], onSave, onCancel }) => {
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
  const [location, setLocation] = useState('Phòng Sim A320');
  const [capacity, setCapacity] = useState(30);

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
  const [status, setStatus] = useState('Sắp diễn ra');
  const [subjectWarning, setSubjectWarning] = useState('');

  // Danh sách môn học của khóa đã chọn (từ /Courses/{id} hoặc props) — dùng để gán Giảng viên theo từng Môn học
  const [courseSubjects, setCourseSubjects] = useState([]);
  // instructorBySubject: subjectId -> instructorAccountId ('' = Chưa phân công)
  const [instructorBySubject, setInstructorBySubject] = useState({});

  // Tính thời lượng tối thiểu chuẩn ICAO/CAAV: Ground <= 8h/ngày, SIM <= 4h/ngày, đệm 15%
  const calculateMinDays = (subs) => {
    if (!subs || subs.length === 0) return { minTrainingDays: 1, minBufferDays: 1, totalMinDays: 2 };
    let totalDays = 0;
    for (const s of subs) {
      const hours = Number(s.requiredHours) || 0;
      if (hours <= 0) continue;
      const type = String(s.subjectType || '').toLowerCase();
      const isSim = type.includes('practical') || type.includes('sim') || type.includes('simulator');
      const maxDaily = isSim ? 4 : 8;
      totalDays += hours / maxDaily;
    }
    const minTrainingDays = Math.ceil(totalDays) || 1;
    const minBufferDays = Math.ceil(minTrainingDays * 0.15);
    return { minTrainingDays, minBufferDays, totalMinDays: minTrainingDays + minBufferDays };
  };

  const durationInfo = calculateMinDays(courseSubjects);

  const computeMinEndDateStr = (startStr, days) => {
    if (!startStr) return '';
    const parts = startStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    return toLocalDateStr(d);
  };

  const minEndDateStr = computeMinEndDateStr(startDate, durationInfo.totalMinDays);

  const extractSubjectsFromCourse = (courseObj) => {
    if (!courseObj) return [];
    const candidates = [
      courseObj.courseSubjects,
      courseObj.subjects,
      courseObj.CourseSubjects,
      courseObj.Subjects,
      courseObj.selectedSubjectIds,
      courseObj.subjectIds,
      courseObj.SubjectIds,
    ];
    for (const item of candidates) {
      if (Array.isArray(item) && item.length > 0) {
        return item.map((s, idx) => {
          if (typeof s === 'object' && s !== null) {
            const sid = s.subjectId ?? s.SubjectId ?? s.id ?? s.Id;
            const subDetails = subjects.find((sub) => String(sub.subjectId) === String(sid));
            return {
              subjectId: Number(sid) || sid,
              sequenceNo: s.sequenceNo ?? s.SequenceNo ?? idx + 1,
              requiredHours: s.requiredHours ?? s.RequiredHours ?? subDetails?.defaultHours ?? 0,
              requiredSessions: s.requiredSessions ?? s.RequiredSessions ?? subDetails?.minSessions ?? 1,
              isMandatory: s.isMandatory ?? s.IsMandatory ?? true,
              passingScore: s.passingScore ?? s.PassingScore ?? 5,
              subjectCode: s.subjectCode || s.SubjectCode || subDetails?.subjectCode || '',
              subjectName: s.subjectName || s.SubjectName || subDetails?.subjectName || '',
            };
          }
          const sid = Number(s) || s;
          const subDetails = subjects.find((sub) => String(sub.subjectId) === String(sid));
          return {
            subjectId: sid,
            sequenceNo: idx + 1,
            requiredHours: subDetails?.defaultHours ?? 0,
            requiredSessions: subDetails?.minSessions ?? 1,
            isMandatory: true,
            passingScore: 5,
            subjectCode: subDetails?.subjectCode || '',
            subjectName: subDetails?.subjectName || '',
          };
        });
      }
    }
    return [];
  };

  useEffect(() => {
    if (!parentCourse) return;
    setSubjectWarning('');
    setInstructorBySubject({});

    // 1. Immediately check course from props for instant subject display
    const foundCourse = courses.find((c) => String(c.courseId) === String(parentCourse));
    const initialSubs = extractSubjectsFromCourse(foundCourse);
    if (initialSubs.length > 0) {
      setCourseSubjects(initialSubs);
    } else {
      setCourseSubjects([]);
    }

    // 2. Fetch fresh course detail from API
    api.get(`/Courses/${parentCourse}`)
      .then((cDetail) => {
        if (!cDetail) return;
        const apiSubs = extractSubjectsFromCourse(cDetail);
        if (apiSubs.length > 0) {
          setCourseSubjects(apiSubs);
          setSubjectWarning('');
        } else if (initialSubs.length === 0) {
          const cName = cDetail.courseName || cDetail.courseCode || foundCourse?.name || foundCourse?.code || '';
          setSubjectWarning(
            `${tr('⚠️ Khóa học')} "${cName}" ${tr('chưa có Môn học (Subject). Theo quy định ETR, Khóa học cần có môn học trước khi mở Lớp & Ghi danh.')}`
          );
        }
      })
      .catch((err) => {
        console.error('Error fetching course subjects in CreateClass:', err);
      });
  }, [parentCourse, courses, subjects]);

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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!parentCourse) {
      alert(tr('Vui lòng chọn Khóa học đào tạo.'));
      return;
    }

    if (startDate < todayStr) {
      alert(tr('Ngày bắt đầu đào tạo không được ở trong quá khứ.'));
      return;
    }

    if (endDate <= startDate) {
      alert(tr('Ngày kết thúc phải sau ngày bắt đầu.'));
      return;
    }

    if (minEndDateStr && endDate < minEndDateStr) {
      alert(`${tr('Thời gian kết thúc quá ngắn so với tổng số giờ học chuẩn ICAO/CAAV. Lớp học yêu cầu tối thiểu')} ${durationInfo.totalMinDays} ${tr('ngày (kết thúc từ ngày')} ${minEndDateStr}).`);
      return;
    }

    // Giảng viên được phân công theo từng Môn học (ClassSubjects) — không còn 1 giảng viên cấp lớp.
    const instructorAssignments = courseSubjects.map((cs) => ({
      subjectId: cs.subjectId,
      instructorAccountId: instructorBySubject[String(cs.subjectId)]
        ? Number(instructorBySubject[String(cs.subjectId)])
        : null
    }));

    const newClass = {
      code: code.trim(),
      name: name.trim(),
      startDate: startDate || todayStr,
      endDate: endDate || minEndDateStr || nextMonthStr,
      location: location.trim() || 'Phòng Sim A320',
      capacity: Number(capacity) || 30,
      status,
      attendanceRate: 0,
      instructorAssignments
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

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="class-location-input">{tr('Địa điểm đào tạo (Location)')}</label>
                  <input
                    id="class-location-input"
                    type="text"
                    placeholder={tr('Ví dụ: Phòng Sim A320, Hangar 1...')}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="class-capacity-input">{tr('Sĩ số tối đa (Capacity) *')}</label>
                  <input
                    id="class-capacity-input"
                    type="number"
                    min="1"
                    max="500"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Instructor Assignment per Subject */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                {tr('PHÂN CÔNG GIẢNG VIÊN THEO MÔN HỌC')}
              </div>
              {courseSubjects.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                  {tr('Khóa học này chưa có môn học. Vui lòng cấu hình môn học cho khóa trước khi phân công giảng viên.')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {courseSubjects.map((cs, idx) => (
                    <div key={cs.subjectId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#002147', flex: '1 1 auto' }}>
                        <span style={{ color: '#c5a059', fontWeight: 800 }}>#{idx + 1}</span> {subjectName(cs.subjectId)}
                      </span>
                      <select
                        style={{ width: '260px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #e0e4e8', fontSize: '13px', outline: 'none', backgroundColor: '#fff' }}
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
                  ))}
                </div>
              )}
            </div>

            {/* Training Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                {tr('THỜI GIAN ĐÀO TẠO')}
              </div>
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="class-start-date">{tr('Ngày bắt đầu *')}</label>
                  <input
                    id="class-start-date"
                    type="date"
                    min={todayStr}
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      const computedMinEnd = computeMinEndDateStr(newStart, durationInfo.totalMinDays);
                      if (endDate < computedMinEnd) {
                        setEndDate(computedMinEnd);
                      }
                    }}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="class-end-date">{tr('Ngày kết thúc *')}</label>
                  <input
                    id="class-end-date"
                    type="date"
                    min={minEndDateStr || startDate}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* ICAO Standard Duration Badge */}
              <div style={{
                fontSize: '12px',
                color: '#1e40af',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '10px 14px',
                lineHeight: '1.5'
              }}>
                <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                  ✈️ {tr('Quy định thời gian đào tạo chuẩn ICAO / CAAV:')}
                </div>
                <div>
                  {tr('Khóa học yêu cầu tối thiểu')} <strong>{durationInfo.totalMinDays} {tr('ngày')}</strong> ({durationInfo.minTrainingDays} {tr('ngày học')} + {durationInfo.minBufferDays} {tr('ngày đệm 15% cho retake & bảo trì')}).
                  {minEndDateStr && (
                    <span> {tr('Ngày kết thúc sớm nhất cho phép:')} <strong style={{ color: '#0369a1' }}>{minEndDateStr}</strong>.</span>
                  )}
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
