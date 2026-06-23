import { useState } from 'react';

const CreateCourse = ({ onSave, onCancel, nextCourseCode }) => {
  const [code, setCode] = useState(nextCourseCode || 'AV-MNT-102');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');

  // Grade weights
  const [theory, setTheory] = useState(40);
  const [practice, setPractice] = useState(40);
  const [assignment, setAssignment] = useState(10);
  const [attendance, setAttendance] = useState(10);

  const [status, setStatus] = useState('HOẠT ĐỘNG');

  const totalWeight = theory + practice + assignment + attendance;
  const isWeightValid = totalWeight === 100;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isWeightValid) {
      alert('Tổng trọng số điểm đánh giá phải bằng 100%!');
      return;
    }

    const structure = {};
    if (theory > 0) structure.theory = theory;
    if (practice > 0) structure.practice = practice;
    if (assignment > 0) structure.assignment = assignment;
    if (attendance > 0) structure.attendance = attendance;

    const newCourse = {
      code,
      name,
      duration: parseInt(duration) || 0,
      structure,
      attendanceProgress: 100,
      activeClassesCount: 0,
      classes: [],
      status
    };

    onSave(newCourse);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ width: '700px', maxWidth: '95%' }}>
        <header className="modal-header">
          <h2>TẠO KHÓA HỌC MỚI</h2>
          <button className="close-btn" type="button" onClick={onCancel} aria-label="Đóng">
            &times;
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px' }}>
            {/* Basic Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                THÔNG TIN CƠ BẢN
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="course-code">Mã khóa học</label>
                  <input
                    id="course-code"
                    type="text"
                    placeholder="Ví dụ: AV-MNT-102"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="course-duration">Thời lượng (Giờ)</label>
                  <input
                    id="course-duration"
                    type="number"
                    placeholder="Ví dụ: 360"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="course-name">Tên khóa học</label>
                <input
                  id="course-name"
                  type="text"
                  placeholder="Nhập tên chương trình khóa học đào tạo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="course-desc">Mô tả khóa học</label>
                <textarea
                  id="course-desc"
                  className="premium-textarea"
                  style={{ height: '80px', padding: '10px 14px', borderRadius: '4px', border: '1px solid #e0e4e8', fontSize: '14px', width: '100%', outline: 'none' }}
                  placeholder="Nhập tóm tắt nội dung chương trình đào tạo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Grade Structure */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                CẤU TRÚC ĐIỂM ĐÁNH GIÁ (TỔNG = 100%)
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="course-theory">Lý thuyết (%)</label>
                  <input
                    id="course-theory"
                    type="number"
                    min="0"
                    max="100"
                    value={theory}
                    onChange={(e) => setTheory(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="course-practice">Thực hành (%)</label>
                  <input
                    id="course-practice"
                    type="number"
                    min="0"
                    max="100"
                    value={practice}
                    onChange={(e) => setPractice(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="course-assign">Assignment (%)</label>
                  <input
                    id="course-assign"
                    type="number"
                    min="0"
                    max="100"
                    value={assignment}
                    onChange={(e) => setAssignment(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="course-attend">Chuyên cần (%)</label>
                  <input
                    id="course-attend"
                    type="number"
                    min="0"
                    max="100"
                    value={attendance}
                    onChange={(e) => setAttendance(parseInt(e.target.value) || 0)}
                    required
                  />
                </div>
              </div>

              {/* Total weight display */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: isWeightValid ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                border: `1px solid ${isWeightValid ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                borderRadius: '4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: isWeightValid ? '#22c55e' : '#ef4444'
                  }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#002147' }}>
                    TỔNG CỘNG: {totalWeight}%
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: isWeightValid ? '#16a34a' : '#dc2626' }}>
                  {isWeightValid ? 'Hợp lệ (100%)' : 'Trọng số phải bằng 100%'}
                </span>
              </div>
            </div>

            {/* Initial Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147', borderBottom: '1px solid #e0e4e9', paddingBottom: '8px' }}>
                TRẠNG THÁI HOẠT ĐỘNG
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#002147', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="course-status"
                    value="HOẠT ĐỘNG"
                    checked={status === 'HOẠT ĐỘNG'}
                    onChange={() => setStatus('HOẠT ĐỘNG')}
                  />
                  <span>Hoạt động (Hoạt động lập tức)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#002147', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="course-status"
                    value="TẠM DỪNG"
                    checked={status === 'TẠM DỪNG'}
                    onChange={() => setStatus('TẠM DỪNG')}
                  />
                  <span>Tạm dừng (Chưa mở lớp)</span>
                </label>
              </div>
            </div>
          </div>

          <footer className="modal-footer">
            <button className="modal-cancel-btn" type="button" onClick={onCancel}>
              Hủy bỏ
            </button>
            <button className="modal-submit-btn" type="submit" disabled={!isWeightValid}>
              Tạo khóa học
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateCourse;
