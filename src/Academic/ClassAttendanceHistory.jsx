import { useState } from 'react';

const mockSessions = {
  'JET-2024-Q1': [
    { stt: '01', date: '15/05/2024', name: 'Buổi 12: Hệ thống nhiên liệu', instructor: 'Nguyễn Văn A', attendance: '24/25', rate: 96, students: [
      { code: 'AM-2409-001', name: 'Nguyễn Văn A', status: 'Có mặt' },
      { code: 'AM-2409-002', name: 'Trần Thị B', status: 'Vắng có phép' },
      { code: 'AM-2409-003', name: 'Lê Hoàng C', status: 'Có mặt' },
      { code: 'AM-2409-004', name: 'Phạm Minh D', status: 'Có mặt' },
      { code: 'AM-2409-005', name: 'Vũ Thị E', status: 'Có mặt' }
    ]},
    { stt: '02', date: '13/05/2024', name: 'Buổi 11: Nguyên lý nén khí', instructor: 'Nguyễn Văn A', attendance: '22/25', rate: 88, students: [
      { code: 'AM-2409-001', name: 'Nguyễn Văn A', status: 'Có mặt' },
      { code: 'AM-2409-002', name: 'Trần Thị B', status: 'Vắng không phép' },
      { code: 'AM-2409-003', name: 'Lê Hoàng C', status: 'Vắng có phép' },
      { code: 'AM-2409-004', name: 'Phạm Minh D', status: 'Có mặt' },
      { code: 'AM-2409-005', name: 'Vũ Thị E', status: 'Có mặt' }
    ]},
    { stt: '03', date: '08/05/2024', name: 'Buổi 10: Quy trình bảo trì động cơ', instructor: 'Trần Thị B', attendance: '25/25', rate: 100, students: [
      { code: 'AM-2409-001', name: 'Nguyễn Văn A', status: 'Có mặt' },
      { code: 'AM-2409-002', name: 'Trần Thị B', status: 'Có mặt' },
      { code: 'AM-2409-003', name: 'Lê Hoàng C', status: 'Có mặt' },
      { code: 'AM-2409-004', name: 'Phạm Minh D', status: 'Có mặt' },
      { code: 'AM-2409-005', name: 'Vũ Thị E', status: 'Có mặt' }
    ]},
    { stt: '04', date: '06/05/2024', name: 'Buổi 09: Kiểm tra định kỳ', instructor: 'Nguyễn Văn A', attendance: '20/25', rate: 80, students: [
      { code: 'AM-2409-001', name: 'Nguyễn Văn A', status: 'Vắng có phép' },
      { code: 'AM-2409-002', name: 'Trần Thị B', status: 'Vắng không phép' },
      { code: 'AM-2409-003', name: 'Lê Hoàng C', status: 'Có mặt' },
      { code: 'AM-2409-004', name: 'Phạm Minh D', status: 'Vắng có phép' },
      { code: 'AM-2409-005', name: 'Vũ Thị E', status: 'Có mặt' }
    ]},
    { stt: '05', date: '01/05/2024', name: 'Buổi 08: Nhiệt động lực học căn bản', instructor: 'Nguyễn Văn A', attendance: '23/25', rate: 92, students: [
      { code: 'AM-2409-001', name: 'Nguyễn Văn A', status: 'Có mặt' },
      { code: 'AM-2409-002', name: 'Trần Thị B', status: 'Có mặt' },
      { code: 'AM-2409-003', name: 'Lê Hoàng C', status: 'Vắng có phép' },
      { code: 'AM-2409-004', name: 'Phạm Minh D', status: 'Có mặt' },
      { code: 'AM-2409-005', name: 'Vũ Thị E', status: 'Có mặt' }
    ]}
  ]
};

const ClassAttendanceHistory = ({ activeClass, onBack }) => {
  const classCode = activeClass?.code || 'JET-K124-01';
  const className = activeClass?.name || 'Lớp Động cơ Jet - Khóa 1/2024';
  const classStatus = activeClass?.status || 'Đang diễn ra';
  const classInstructor = activeClass?.instructor || 'Nguyễn Văn A';

  // Get sessions list or generic default
  const sessions = mockSessions[classCode] || [
    { stt: '01', date: '15/05/2024', name: 'Buổi 12: Hệ thống nhiên liệu', instructor: classInstructor, attendance: '24/25', rate: 96, students: [] },
    { stt: '02', date: '13/05/2024', name: 'Buổi 11: Nguyên lý nén khí', instructor: classInstructor, attendance: '22/25', rate: 88, students: [] },
    { stt: '03', date: '08/05/2024', name: 'Buổi 10: Quy trình bảo trì động cơ', instructor: classInstructor, attendance: '25/25', rate: 100, students: [] }
  ];

  const [selectedSession, setSelectedSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.instructor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="attendance-history-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Breadcrumb Area */}
      <nav className="breadcrumb-nav">
        <span className="breadcrumb-item" onClick={onBack} style={{ cursor: 'pointer' }}>KHÓA &amp; LỚP HỌC</span>
        <svg width="4" height="6" viewBox="0 0 4 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z" fill="currentColor" />
        </svg>
        <span className="breadcrumb-item active">LỊCH SỬ ĐIỂM DANH</span>
      </nav>

      {/* Page Title */}
      <div className="content-header" style={{ marginBottom: '12px' }}>
        <div className="header-left">
          <h1>Lịch sử điểm danh chi tiết</h1>
          <div className="divider-gold" />
        </div>
      </div>

      {/* Top Section: Class Info Card & Circular Chart */}
      <div className="attendance-top-grid">
        {/* Class Details Card */}
        <div className="class-info-card">
          <div className="class-info-main">
            <div className="class-info-header">
              <span className="class-code-badge">MÃ LỚP: {classCode}</span>
              <span className={`class-status-badge ${classStatus === 'Đang diễn ra' ? 'ongoing' : classStatus === 'Sắp diễn ra' ? 'upcoming' : 'completed'}`}>
                {classStatus.toUpperCase()}
              </span>
            </div>
            <h2 className="class-name-title">{className}</h2>
          </div>

          <div className="class-info-details-row">
            <div className="detail-item">
              <div className="detail-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0Z" fill="currentColor" />
                </svg>
              </div>
              <div className="detail-texts">
                <span className="detail-label">GIẢNG VIÊN CHÍNH</span>
                <span className="detail-value">{classInstructor}</span>
              </div>
            </div>

            <div className="detail-item">
              <div className="detail-icon">
                <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4C0 3.45 0.195833 2.97917 0.5875 2.5875C0.979167 2.19583 1.45 2 2 2H3V0H5V2H13V0H5L13 2H15V2H16C16.55 2 17.0208 2.19583 17.4125 2.5875C17.8042 2.97917 18 3.45 18 4V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H2ZM2 18H16V8H2V18Z" fill="currentColor" />
                </svg>
              </div>
              <div className="detail-texts">
                <span className="detail-label">THỜI GIAN HỌC</span>
                <span className="detail-value">Thứ 3, Thứ 5 (18:00 - 20:30)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Circular Percentage Card */}
        <div className="attendance-gauge-card">
          <div className="gauge-header">TỶ LỆ THAM DỰ TỔNG QUAN</div>
          <div className="gauge-body">
            <div className="gauge-radial-container">
              <svg width="120" height="120" viewBox="0 0 120 120" className="radial-svg">
                {/* Background Track */}
                <circle cx="60" cy="60" r="50" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="8" fill="transparent" />
                {/* Filled arc representing 88% */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  stroke="#c5a059"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="314"
                  strokeDashoffset={314 - (314 * 88) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="gauge-text-center">88%</div>
            </div>
            <div className="gauge-subtext">
              Xu hướng: <span className="trend-up">+2.4%</span> so với tuần trước
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <section className="table-card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <input
                type="text"
                placeholder="Tìm buổi học..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="search-icon">
                <path d="M11.5 6.5C11.5 9.26142 9.26142 11.5 6.5 11.5C3.73858 11.5 1.5 9.26142 1.5 6.5C1.5 3.73858 3.73858 1.5 6.5 1.5C9.26142 1.5 11.5 3.73858 11.5 6.5ZM16 14.5L11.5 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="toolbar-right">
            <button className="outline-btn font-gold-btn" type="button" style={{ padding: '8px 16px', borderRadius: '4px', fontSize: '12px' }}>
              <span>Theo tháng</span>
            </button>
            <span className="session-count-label">HIỂN THỊ {filteredSessions.length}/{sessions.length} BUỔI HỌC</span>
          </div>
        </div>

        {/* Sessions Table Header */}
        <div className="table-responsive-scroll">
          <div className="table-header sessions-table-grid">
          <div>STT</div>
          <div>NGÀY HỌC</div>
          <div>TÊN BUỔI HỌC</div>
          <div>GIẢNG VIÊN</div>
          <div>SĨ SỐ</div>
          <div>TỶ LỆ THAM DỰ</div>
          <div style={{ textAlign: 'right', paddingRight: '24px' }}>THAO TÁC</div>
        </div>

        {/* Sessions Table Body */}
        <div className="table-body">
          {filteredSessions.length === 0 ? (
            <div className="empty-table-state">Không tìm thấy buổi học nào.</div>
          ) : (
            filteredSessions.map((session) => (
              <div key={session.stt} className="table-row sessions-table-grid">
                <div style={{ fontWeight: '700', color: '#475569' }}>{session.stt}</div>
                <div style={{ color: '#475569', fontWeight: '500' }}>{session.date}</div>
                <div style={{ fontWeight: '700', color: '#002147' }}>{session.name}</div>
                <div style={{ color: '#1a1c1e', fontWeight: '600' }}>{session.instructor}</div>
                <div style={{ fontWeight: '700', color: '#002147' }}>{session.attendance}</div>
                <div>
                  <div className="progress-bar-wrapper">
                    <div className="progress-bar-container">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${session.rate}%`,
                          backgroundColor: session.rate >= 90 ? '#c5a059' : session.rate >= 85 ? '#e2a127' : '#b00020'
                        }}
                      ></div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: session.rate >= 85 ? '#002147' : '#b00020' }}>
                      {session.rate}%
                    </span>
                  </div>
                </div>
                <div className="col-actions text-right" style={{ paddingRight: '24px' }}>
                  <button
                    className="featured-details-link"
                    type="button"
                    onClick={() => setSelectedSession(session)}
                  >
                    <span>CHI TIẾT</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.13125 6.75H0V5.25H9.13125L4.93125 1.05L6 0L12 6L6 12L4.93125 10.95L9.13125 6.75Z" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      </section>

      {/* Modal: Detailed Attendance List of the Session */}
      {selectedSession && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ width: '600px' }}>
            <header className="modal-header">
              <h2>CHI TIẾT ĐIỂM DANH: {selectedSession.stt}</h2>
              <button className="close-btn" type="button" onClick={() => setSelectedSession(null)} aria-label="Đóng">
                &times;
              </button>
            </header>

            <div className="modal-body" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ marginBottom: '16px', backgroundColor: '#f4f7fa', padding: '12px 16px', borderRadius: '4px', border: '1px solid #e0e4e8' }}>
                <div style={{ fontWeight: '700', color: '#002147', fontSize: '14px' }}>{selectedSession.name}</div>
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
                  Ngày học: {selectedSession.date} | Giảng viên: {selectedSession.instructor} | Sĩ số: {selectedSession.attendance}
                </div>
              </div>

              <div style={{ fontWeight: '700', fontSize: '12px', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                DANH SÁCH ĐIỂM DANH HỌC VIÊN
              </div>

              <table className="classes-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Mã học viên</th>
                    <th>Họ và tên</th>
                    <th style={{ textAlign: 'right' }}>Trạng thái điểm danh</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSession.students && selectedSession.students.length > 0 ? (
                    selectedSession.students.map((student) => (
                      <tr key={student.code}>
                        <td className="class-code">{student.code}</td>
                        <td style={{ fontWeight: 600, color: '#002147' }}>{student.name}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: student.status === 'Có mặt' ? '#dcfce7' : student.status === 'Vắng có phép' ? '#fef3c7' : '#fee2e2',
                            color: student.status === 'Có mặt' ? '#15803d' : student.status === 'Vắng có phép' ? '#d97706' : '#b91c1c'
                          }}>
                            {student.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', padding: '16px', fontStyle: 'italic', color: '#64748b' }}>
                        Không có dữ liệu chi tiết học viên cho buổi học này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <footer className="modal-footer">
              <button className="modal-submit-btn" type="button" onClick={() => setSelectedSession(null)}>
                ĐÓNG
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassAttendanceHistory;
