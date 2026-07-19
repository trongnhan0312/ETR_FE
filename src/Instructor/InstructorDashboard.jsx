import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const InstructorDashboard = () => {
  const navigate = useNavigate();

  let user = { fullName: 'Giảng viên' };
  try {
    const userJson = localStorage.getItem('user');
    if (userJson) user = JSON.parse(userJson);
  } catch (e) { /* ignore */ }

  const stats = useMemo(() => [
    { label: 'Lớp được phân công', value: '5', trend: null, icon: 'classes' },
    { label: 'Học viên đang dạy', value: '88', trend: '+3', icon: 'students' },
    { label: 'Tỷ lệ điểm danh TB', value: '96%', trend: '+2.4%', icon: 'attendance' },
    { label: 'Minh chứng chờ duyệt', value: '4', trend: null, icon: 'evidence' },
  ], []);

  const recentActivities = useMemo(() => [
    { time: '14:30', date: 'Hôm nay', desc: 'Đã điểm danh buổi 12 — Kỹ thuật Hàng không Cơ bản', type: 'attendance' },
    { time: '11:00', date: 'Hôm nay', desc: 'Tải lên minh chứng Attendance_Day_12.pdf', type: 'evidence' },
    { time: '09:15', date: 'Hôm qua', desc: 'Cập nhật điểm đánh giá — An toàn Hàng không & Quy trình', type: 'assessment' },
    { time: '16:00', date: 'Hôm qua', desc: 'Hoàn thành buổi thực hành — Khí tượng Hàng không', type: 'session' },
    { time: '08:30', date: '17/07/2026', desc: 'Tạo buổi học mới — Quản trị Không lưu Chuyên sâu', type: 'session' },
  ], []);

  const todaySchedule = useMemo(() => [
    { time: '08:00 – 11:30', name: 'Kỹ thuật Hàng không Cơ bản', code: 'AV-2024-001', room: 'Phòng B302 – Xưởng Động cơ' },
    { time: '13:30 – 17:00', name: 'An toàn Hàng không & Quy trình', code: 'AV-2024-045', room: 'Phòng A201 – Lý thuyết' },
  ], []);

  const getStatIcon = (type) => {
    switch (type) {
      case 'classes':
        return (
          <svg width="16" height="16" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 18L4 14.2V8.2L0 6L11 0L22 6V14H20V7.1L18 8.2V14.2L11 18ZM11 9.7L17.85 6L11 2.3L4.15 6L11 9.7ZM11 15.725L16 13.025V9.25L11 12L6 9.25V13.025L11 15.725Z" fill="currentColor" />
          </svg>
        );
      case 'students':
        return (
          <svg width="16" height="14" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM18 16V13C18 12.2667 17.7958 11.5625 17.3875 10.8875C16.9792 10.2125 16.4 9.63333 15.65 9.15C16.5 9.25 17.3 9.42083 18.05 9.6625C18.8 9.90417 19.5 10.2 20.15 10.55C20.75 10.8833 21.2083 11.2542 21.525 11.6625C21.8417 12.0708 22 12.5167 22 13V16H18ZM8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8Z" fill="currentColor" />
          </svg>
        );
      case 'attendance':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2zm-7 5h5v5h-5v-5z" fill="currentColor" />
          </svg>
        );
      case 'evidence':
        return (
          <svg width="16" height="16" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H10L16 6V18C16 18.55 15.8042 19.0208 15.4125 19.4125C15.0208 19.8042 14.55 20 14 20H2ZM9 7V2H2V18H14V7H9Z" fill="currentColor" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'attendance': return '#22c55e';
      case 'evidence': return '#3b82f6';
      case 'assessment': return '#c5a059';
      case 'session': return '#8b5cf6';
      default: return '#94a3b8';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Content Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>Xin chào, {user.fullName}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Tổng quan hoạt động giảng dạy và quản lý lớp học của bạn trong hệ thống ETR.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px', backgroundColor: 'rgba(197, 160, 89, 0.08)', border: '1px solid rgba(197, 160, 89, 0.2)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#002147', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Đang hoạt động
          </span>
        </div>
      </section>

      {/* Statistics Cards */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="stat-header">
              <span className="stat-label">{stat.label}</span>
              <div className="stat-icon">
                {getStatIcon(stat.icon)}
              </div>
            </div>
            <div className="stat-value">{stat.value}</div>
            {stat.trend && (
              <div className="stat-footer">
                <span className="trend-up">{stat.trend}</span> so với tuần trước
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 2-column grid: Recent Activity + Today Schedule */}
      <div className="dashboard-grid">
        {/* Recent Activity Panel */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h2>Hoạt động gần đây</h2>
            <span className="panel-action" onClick={() => navigate('/instructor/classes')}>Xem tất cả →</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {recentActivities.map((act, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  padding: '14px 0',
                  borderBottom: idx < recentActivities.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getActivityColor(act.type),
                  marginTop: '5px',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#002147', lineHeight: '1.5' }}>
                    {act.desc}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: '600', color: 'rgba(0,33,71,0.45)' }}>
                    {act.time} · {act.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Today Schedule Panel */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h2>Lịch hôm nay</h2>
            <span className="panel-action" onClick={() => navigate('/instructor/schedule')}>Xem lịch tuần →</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todaySchedule.map((item, idx) => (
              <div key={idx} className="session-schedule-card">
                <span className="session-time">{item.time}</span>
                <span className="session-title">{item.name}</span>
                <span className="session-code">{item.code}</span>
                <div className="session-location">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {item.room}
                </div>
              </div>
            ))}

            {todaySchedule.length === 0 && (
              <p style={{ fontSize: '12px', color: 'rgba(0,33,71,0.4)', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
                Không có lịch dạy hôm nay
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}>
            <p style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(0,33,71,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Truy cập nhanh
            </p>
            <div className="quick-links-grid">
              <div className="quick-link-card" onClick={() => navigate('/instructor/attendance')} style={{ cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z" /></svg>
                Điểm danh
              </div>
              <div className="quick-link-card" onClick={() => navigate('/instructor/evidence')} style={{ cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" /></svg>
                Minh chứng
              </div>
              <div className="quick-link-card" onClick={() => navigate('/instructor/assessments')} style={{ cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z" /></svg>
                Đánh giá
              </div>
              <div className="quick-link-card" onClick={() => navigate('/instructor/progress')} style={{ cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" /></svg>
                Tiến độ
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
