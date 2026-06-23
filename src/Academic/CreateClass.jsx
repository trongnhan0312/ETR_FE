import { useState } from 'react';

const CreateClass = ({ courses, onSave, onCancel }) => {
  const [parentCourse, setParentCourse] = useState(courses[0]?.code || '');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [instructor, setInstructor] = useState('Nguyễn Văn A');
  const [status, setStatus] = useState('Sắp diễn ra');

  const handleSubmit = (e) => {
    e.preventDefault();

    const newClass = {
      code,
      name,
      startDate,
      endDate,
      status,
      attendanceRate: 0,
      instructor
    };

    onSave(parentCourse, newClass);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ width: '700px', maxWidth: '95%' }}>
        <header className="modal-header">
          <h2>TẠO LỚP HỌC MỚI</h2>
          <button className="close-btn" type="button" onClick={onCancel} aria-label="Đóng">
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px' }}>
            {/* Parent Course selection */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label htmlFor="class-parent-select" style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' }}>
                Thuộc khóa học đào tạo
              </label>
              <select
                id="class-parent-select"
                className="premium-input"
                style={{ width: '100%', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e0e4e8', fontSize: '14px', outline: 'none' }}
                value={parentCourse}
                onChange={(e) => setParentCourse(e.target.value)}
                required
              >
                {courses.map((course) => (
                  <option key={course.code} value={course.code}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Basic Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                THÔNG TIN LỚP HỌC
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="class-code-input">Mã lớp học</label>
                  <input
                    id="class-code-input"
                    type="text"
                    placeholder="Ví dụ: JET-2024-Q3"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="class-instructor-select">Giảng viên giảng dạy</label>
                  <select
                    id="class-instructor-select"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    required
                  >
                    <option value="Nguyễn Văn A">Nguyễn Văn A</option>
                    <option value="Trần Văn B">Trần Văn B</option>
                    <option value="Lê Hoàng C">Lê Hoàng C</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="class-name-input">Tên lớp học</label>
                <input
                  id="class-name-input"
                  type="text"
                  placeholder="Ví dụ: Lớp Động cơ Jet - Khóa 3/2024"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Training Schedule */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                THỜI GIAN ĐÀO TẠO
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="class-start-date">Ngày bắt đầu</label>
                  <input
                    id="class-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="class-end-date">Ngày kết thúc</label>
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
                TRẠNG THÁI LỚP HỌC
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
                  <span>Sắp diễn ra</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#002147', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="class-status"
                    value="Đang diễn ra"
                    checked={status === 'Đang diễn ra'}
                    onChange={() => setStatus('Đang diễn ra')}
                  />
                  <span>Đang diễn ra</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#002147', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="class-status"
                    value="Đã kết thúc"
                    checked={status === 'Đã kết thúc'}
                    onChange={() => setStatus('Đã kết thúc')}
                  />
                  <span>Đã kết thúc</span>
                </label>
              </div>
            </div>
          </div>

          <footer className="modal-footer">
            <button className="modal-cancel-btn" type="button" onClick={onCancel}>
              Hủy bỏ
            </button>
            <button className="modal-submit-btn" type="submit">
              Tạo lớp học
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateClass;
