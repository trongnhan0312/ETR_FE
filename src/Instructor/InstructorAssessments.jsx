import { useState } from 'react';

const initialStudentScores = [
  { code: 'HV-2024-001', name: 'Nguyễn Văn An', score: 85, comment: 'Kỹ năng tháo lắp linh kiện xuất sắc, tuân thủ nghiêm ngặt quy định.' },
  { code: 'HV-2024-002', name: 'Lê Thị Bình', score: 92, comment: 'Nắm vững quy trình an toàn bay, lý thuyết đạt điểm tuyệt đối.' },
  { code: 'HV-2024-003', name: 'Trần Văn Cường', score: 45, comment: 'Cần cải thiện kỹ năng đọc bản vẽ kỹ thuật và quy trình bảo dưỡng.' },
  { code: 'HV-2024-004', name: 'Phạm Minh Đức', score: 78, comment: 'Thái độ học tập tốt, hoàn thành bài thực hành đúng hạn.' },
  { code: 'HV-2024-005', name: 'Vũ Thị Hà', score: 88, comment: 'Khả năng phân tích lỗi nhanh, giao tiếp tốt trong nhóm.' },
  { code: 'HV-2024-006', name: 'Hoàng Quốc Khánh', score: 62, comment: 'Cần rèn luyện thêm thực hành kiểm tra hệ thống điện.' },
];

const classOptions = [
  { code: 'AV-2024-001', name: 'Kỹ thuật Hàng không Cơ bản' },
  { code: 'AV-2024-045', name: 'An toàn Hàng không & Quy trình' },
  { code: 'AV-2024-012', name: 'Khí tượng Hàng không' },
];

const InstructorAssessments = () => {
  const [selectedClass, setSelectedClass] = useState(classOptions[0].code);
  const [studentScores, setStudentScores] = useState(initialStudentScores);
  const [isEditing, setIsEditing] = useState(false);
  const [editingScores, setEditingScores] = useState([]);

  const handleStartEdit = () => {
    setEditingScores(JSON.parse(JSON.stringify(studentScores)));
    setIsEditing(true);
  };

  const handleScoreChange = (code, value) => {
    const scoreVal = value === '' ? '' : Math.min(100, Math.max(0, parseInt(value) || 0));
    setEditingScores((prev) => prev.map((s) => (s.code === code ? { ...s, score: scoreVal } : s)));
  };

  const handleCommentChange = (code, value) => {
    setEditingScores((prev) => prev.map((s) => (s.code === code ? { ...s, comment: value } : s)));
  };

  const handleSave = () => {
    setStudentScores(editingScores);
    setIsEditing(false);
    alert('Lưu bảng điểm đánh giá thành công!');
  };

  const displayScores = isEditing ? editingScores : studentScores;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Content Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>Đánh giá kết quả học viên</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Nhập điểm và nhận xét chuyên môn cho từng học viên theo buổi huấn luyện.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                type="button"
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: '1px solid #dfe6f1',
                  backgroundColor: '#ffffff', color: '#002147', fontSize: '12px', fontWeight: '700',
                  textTransform: 'uppercase', cursor: 'pointer',
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                className="create-btn"
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                <span>LƯU ĐIỂM</span>
              </button>
            </>
          ) : (
            <button onClick={handleStartEdit} className="create-btn" type="button">
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 16H3.425L13.2 6.225L11.775 4.8L2 14.575V16ZM0 18V13.75L13.2 0.575C13.4 0.391667 13.6208 0.25 13.8625 0.15C14.1042 0.05 14.3583 0 14.625 0C14.8917 0 15.15 0.05 15.4 0.15C15.65 0.25 15.8667 0.4 16.05 0.6L17.425 2C17.625 2.18333 17.7708 2.4 17.8625 2.65C17.9542 2.9 18 3.15 18 3.4C18 3.66667 17.9542 3.92083 17.8625 4.1625C17.7708 4.40417 17.625 4.625 17.425 4.825L4.25 18H0Z" fill="currentColor" />
              </svg>
              <span>NHẬP ĐIỂM ĐÁNH GIÁ</span>
            </button>
          )}
        </div>
      </section>

      {/* Class Selector */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px',
        background: '#ffffff', border: '1px solid #dfe6f1', borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,33,71,0.04)',
      }}>
        <label style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(0,33,71,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Chọn lớp:
        </label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          style={{
            padding: '10px 14px', borderRadius: '10px', border: '1px solid #d9e1ec',
            fontSize: '13px', fontWeight: '600', color: '#002147', outline: 'none',
            background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)',
          }}
        >
          {classOptions.map((c) => (
            <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
          ))}
        </select>
      </div>

      {/* Grades Table */}
      <section className="table-card">
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px 1fr',
          alignItems: 'center', gap: '12px',
          background: 'linear-gradient(135deg, #06234a 0%, #041b39 100%)',
          color: '#ffffff', padding: '14px 20px', fontSize: '11px', fontWeight: '700',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <div style={{ textAlign: 'center' }}>STT</div>
          <div>Học viên</div>
          <div style={{ textAlign: 'center' }}>Điểm số</div>
          <div style={{ textAlign: 'center' }}>Xếp loại</div>
          <div>Nhận xét chuyên môn</div>
        </div>

        <div className="table-body">
          {displayScores.map((student, idx) => {
            const isPass = student.score >= 50;
            return (
              <div key={student.code} className="table-row" style={{
                display: 'grid', gridTemplateColumns: '60px 1fr 100px 100px 1fr',
                alignItems: 'center', gap: '12px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(0,33,71,0.4)', textAlign: 'center' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#002147', margin: 0 }}>{student.name}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(0,33,71,0.5)', margin: '2px 0 0', textTransform: 'uppercase', fontWeight: '600' }}>ID: {student.code}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={student.score}
                      onChange={(e) => handleScoreChange(student.code, e.target.value)}
                      style={{
                        width: '64px', textAlign: 'center', height: '36px', border: '1px solid #d9e1ec',
                        borderRadius: '8px', fontSize: '14px', fontWeight: '700', color: '#002147', outline: 'none',
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#002147' }}>{student.score}</span>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px', fontSize: '10px', fontWeight: '700',
                    borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.03em',
                    border: '1px solid',
                    ...(isPass
                      ? { backgroundColor: '#e8f5e9', borderColor: '#c8e6c9', color: '#2e7d32' }
                      : { backgroundColor: '#ffebee', borderColor: '#ffcdd2', color: '#c62828' }
                    ),
                  }}>
                    {isPass ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={student.comment}
                      onChange={(e) => handleCommentChange(student.code, e.target.value)}
                      style={{
                        width: '100%', height: '36px', padding: '0 12px', border: '1px solid #d9e1ec',
                        borderRadius: '8px', fontSize: '13px', color: '#002147', outline: 'none',
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '13px', color: 'rgba(0,33,71,0.7)', margin: 0 }}>{student.comment}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="table-footer">
          <span className="footer-info">
            Trung bình: {Math.round(studentScores.reduce((acc, s) => acc + s.score, 0) / studentScores.length)} điểm
            · Pass: {studentScores.filter((s) => s.score >= 50).length}/{studentScores.length}
          </span>
          <div className="pagination">
            <button className="page-num active" type="button">1</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InstructorAssessments;
