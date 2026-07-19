import { useState } from 'react';

const mockSessions = [
  { stt: '01', date: '24/05/2024', name: 'Buổi 1: Giới thiệu hệ thống thủy lực', room: 'Phòng LAB-04', class: 'AV-2024-001' },
  { stt: '02', date: '26/05/2024', name: 'Buổi 2: Kiểm tra van xả áp', room: 'Xưởng bảo trì A1', class: 'AV-2024-001' },
  { stt: '03', date: '28/05/2024', name: 'Buổi 3: Quy trình an toàn động cơ', room: 'Phòng LAB-04', class: 'AV-2024-045' },
  { stt: '04', date: '31/05/2024', name: 'Buổi 4: Thực hành chẩn đoán lỗi', room: 'Hangar B7', class: 'AV-2024-001' },
];

const initialStudents = [
  { code: 'SV2024001', name: 'Nguyễn Văn An', avatar: 'AN', morning: 'P', afternoon: 'P' },
  { code: 'SV2024002', name: 'Trần Thị Bình', avatar: 'TB', morning: 'AE', afternoon: 'P' },
  { code: 'SV2024003', name: 'Lê Hoàng Cường', avatar: 'LC', morning: 'P', afternoon: 'P' },
  { code: 'SV2024004', name: 'Phạm Minh Đức', avatar: 'MĐ', morning: 'P', afternoon: 'AU' },
  { code: 'SV2024005', name: 'Vũ Thị Hà', avatar: 'VH', morning: 'P', afternoon: 'P' },
  { code: 'SV2024006', name: 'Hoàng Quốc Khánh', avatar: 'HK', morning: 'AU', afternoon: 'AU' },
];

const InstructorAttendance = () => {
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState(initialStudents);
  const [searchTerm, setSearchTerm] = useState('');

  const handleToggle = (studentCode, timeOfDay, status) => {
    setAttendance((prev) =>
      prev.map((s) => (s.code === studentCode ? { ...s, [timeOfDay]: status } : s))
    );
  };

  const handleSaveAttendance = () => {
    alert('Lưu điểm danh thành công!');
    setSelectedSession(null);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'P': return 'Có mặt';
      case 'AE': return 'Vắng CP';
      case 'AU': return 'Vắng KP';
      default: return '—';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'P': return '#22c55e';
      case 'AE': return '#eab308';
      case 'AU': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  // Session Detail: Attendance Recording
  if (selectedSession) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <nav className="breadcrumb-nav">
          <span className="breadcrumb-item" onClick={() => setSelectedSession(null)} style={{ cursor: 'pointer' }}>ĐIỂM DANH</span>
          <svg width="4" height="6" viewBox="0 0 4 6" fill="none"><path d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z" fill="currentColor" /></svg>
          <span className="breadcrumb-item active">{selectedSession.name}</span>
        </nav>

        <section className="content-header">
          <div className="header-left">
            <h1>Điểm danh — {selectedSession.name}</h1>
            <div className="divider-gold" />
            <p className="header-description">{selectedSession.date} · {selectedSession.room} · Lớp: {selectedSession.class}</p>
          </div>
          <button
            onClick={handleSaveAttendance}
            className="create-btn"
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            <span>LƯU ĐIỂM DANH</span>
          </button>
        </section>

        {/* Attendance Table */}
        <section className="table-card">
          <div style={{
            display: 'grid', gridTemplateColumns: '60px 1fr 180px 180px',
            alignItems: 'center', gap: '12px',
            background: 'linear-gradient(135deg, #06234a 0%, #041b39 100%)',
            color: '#ffffff', padding: '14px 20px', fontSize: '11px', fontWeight: '700',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            <div style={{ textAlign: 'center' }}>STT</div>
            <div>Học viên</div>
            <div style={{ textAlign: 'center' }}>Buổi sáng</div>
            <div style={{ textAlign: 'center' }}>Buổi chiều</div>
          </div>

          <div className="table-body">
            {attendance.map((student, idx) => (
              <div key={student.code} className="table-row" style={{
                display: 'grid', gridTemplateColumns: '60px 1fr 180px 180px',
                alignItems: 'center', gap: '12px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(0,33,71,0.4)', textAlign: 'center' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '800',
                    background: 'linear-gradient(135deg, #002147, #003366)', color: '#ffffff',
                    border: '1px solid rgba(197,160,89,0.3)',
                  }}>
                    {student.avatar}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#002147', margin: 0 }}>{student.name}</p>
                    <p style={{ fontSize: '10px', color: 'rgba(0,33,71,0.5)', margin: '2px 0 0', textTransform: 'uppercase', fontWeight: '600' }}>ID: {student.code}</p>
                  </div>
                </div>

                {/* Morning Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div className="attendance-toggle-group">
                    {['P', 'AE', 'AU'].map((status) => (
                      <button
                        key={status}
                        className={`status-${status.toLowerCase()} ${student.morning === status ? 'active' : ''}`}
                        onClick={() => handleToggle(student.code, 'morning', status)}
                        type="button"
                      >
                        {status === 'P' ? 'CM' : status === 'AE' ? 'CP' : 'KP'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Afternoon Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div className="attendance-toggle-group">
                    {['P', 'AE', 'AU'].map((status) => (
                      <button
                        key={status}
                        className={`status-${status.toLowerCase()} ${student.afternoon === status ? 'active' : ''}`}
                        onClick={() => handleToggle(student.code, 'afternoon', status)}
                        type="button"
                      >
                        {status === 'P' ? 'CM' : status === 'AE' ? 'CP' : 'KP'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Footer */}
          <div className="table-footer">
            <div style={{ display: 'flex', gap: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#22c55e' }}>
                ● CM: {attendance.filter((s) => s.morning === 'P' && s.afternoon === 'P').length}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#eab308' }}>
                ● CP: {attendance.filter((s) => s.morning === 'AE' || s.afternoon === 'AE').length}
              </span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444' }}>
                ● KP: {attendance.filter((s) => s.morning === 'AU' || s.afternoon === 'AU').length}
              </span>
            </div>
            <span className="footer-info">Tổng: {attendance.length} học viên</span>
          </div>
        </section>
      </div>
    );
  }

  // Sessions List View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <section className="content-header">
        <div className="header-left">
          <h1>Điểm danh</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Chọn buổi học để ghi nhận điểm danh cho học viên. Trạng thái: CM (Có mặt), CP (Vắng có phép), KP (Vắng không phép).
          </p>
        </div>
      </section>

      {/* Sessions Table */}
      <section className="table-card">
        <div style={{
          display: 'grid', gridTemplateColumns: '60px 100px 1fr 1fr 120px 100px',
          alignItems: 'center', gap: '12px',
          background: 'linear-gradient(135deg, #06234a 0%, #041b39 100%)',
          color: '#ffffff', padding: '12px 20px', fontSize: '11px', fontWeight: '700',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <div style={{ textAlign: 'center' }}>STT</div>
          <div>Ngày</div>
          <div>Tên buổi học</div>
          <div>Địa điểm</div>
          <div>Mã lớp</div>
          <div style={{ textAlign: 'center' }}>Thao tác</div>
        </div>

        <div className="table-body">
          {mockSessions.map((session) => (
            <div key={session.stt} className="table-row" style={{
              display: 'grid', gridTemplateColumns: '60px 100px 1fr 1fr 120px 100px',
              alignItems: 'center', gap: '12px',
            }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(0,33,71,0.4)', textAlign: 'center' }}>{session.stt}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#002147' }}>{session.date}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#002147' }}>{session.name}</span>
              <span style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{session.room}</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#c5a059' }}>{session.class}</span>
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => setSelectedSession(session)}
                  type="button"
                  style={{
                    padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                    border: '1px solid rgba(197,160,89,0.4)', backgroundColor: 'transparent',
                    color: '#c5a059', cursor: 'pointer', textTransform: 'uppercase',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(197,160,89,0.05)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  Điểm danh
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="table-footer">
          <span className="footer-info">Hiển thị {mockSessions.length} buổi học</span>
          <div className="pagination">
            <button className="page-num active" type="button">1</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InstructorAttendance;
