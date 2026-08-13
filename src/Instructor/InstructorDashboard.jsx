import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMyDashboard } from '../utils/dashboardApi';
import { useLanguage } from '../context/LanguageContext';

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [myClasses, setMyClasses] = useState(null);
  const [lowAttendance, setLowAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const d = await fetchMyDashboard();
        if (d?.myClasses?.length) setMyClasses(d.myClasses);
        setLowAttendance(d?.lowAttendanceStudents ?? []);
      } catch (err) {
        console.error('Error loading Instructor Dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loadLabel = (flag) => (loading ? '...' : flag);

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{tr('Instructor Portal')}</p>
          <h1>{tr('Instructor Dashboard')}</h1>
          <p className="page-description">
            {tr('Các lớp bạn phụ trách và danh sách học viên có tỉ lệ điểm danh dưới ngưỡng cần nhắc nhở.')}
          </p>
        </div>
        <div className="page-status-box">
          <strong>{tr('Data source')}</strong>
          <p>GET /api/Dashboard/my-dashboard</p>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stats-card-dark">
          <span className="stats-title-label">{tr('TỔNG LỚP PHỤ TRÁCH')}</span>
          <div className="stat-value">{loadLabel(myClasses ? myClasses.length : 0).toString().padStart(2, '0')}</div>
        </div>
        <div className="stats-card-dark" style={{ background: 'linear-gradient(180deg, #112d4e 0%, #081a30 100%)' }}>
          <span className="stats-title-label">{tr('HỌC VIÊN ĐIỂM DANH THẤP')}</span>
          <div className="stat-value" style={{ color: '#d4af37' }}>
            {loadLabel(lowAttendance.length).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      <section className="dashboard-panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <h3>{tr('LỚP CỦA TÔI')}</h3>
          <button className="panel-action" type="button" onClick={() => navigate('/instructor/classes')}>
            {tr('Xem tất cả')} →
          </button>
        </div>
        {loading ? (
          <div className="empty-table-state">{tr('Đang tải dữ liệu...')}</div>
        ) : !myClasses || myClasses.length === 0 ? (
          <div className="empty-table-state">{tr('Bạn chưa được phân công lớp nào.')}</div>
        ) : (
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px 140px' }}>
              <div>{tr('Mã lớp')}</div>
              <div>{tr('Tên lớp')}</div>
              <div>{tr('Học viên')}</div>
              <div style={{ textAlign: 'right' }}>{tr('Thao tác')}</div>
            </div>
            {myClasses.map((cls) => (
              <div
                key={cls.classId}
                className="table-row"
                style={{ display: 'grid', gridTemplateColumns: '120px 1fr 140px 140px', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eef2f7' }}
              >
                <div className="col-id">{cls.classCode || `#${cls.classId}`}</div>
                <div className="col-name">{cls.className || tr('Lớp học')}</div>
                <div>{cls.studentCount} {tr('HV')}</div>
                <div style={{ textAlign: 'right' }}>
                  <button className="primary-btn" type="button" onClick={() => navigate('/instructor/attendance')}>
                    {tr('Điểm danh')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-panel">
        <div className="panel-header">
          <h3>{tr('CẢNH BÁO ĐIỂM DANH THẤP')}</h3>
          <span className="panel-action">{lowAttendance.length} {tr('học viên')}</span>
        </div>
        {loading ? (
          <div className="empty-table-state">{tr('Đang tải dữ liệu...')}</div>
        ) : lowAttendance.length === 0 ? (
          <div className="empty-table-state">{tr('Không có học viên nào dưới ngưỡng điểm danh.')}</div>
        ) : (
          <div className="table-responsive-scroll">
            <div className="table-header" style={{ display: 'grid', gridTemplateColumns: '1.4fr 120px 140px 130px' }}>
              <div>{tr('Học viên')}</div>
              <div>{tr('Lớp')}</div>
              <div>{tr('Môn')}</div>
              <div>{tr('Tỉ lệ điểm danh')}</div>
            </div>
            {lowAttendance.map((s, i) => (
              <div
                key={`${s.accountId}-${i}`}
                className="table-row"
                style={{ display: 'grid', gridTemplateColumns: '1.4fr 120px 140px 130px', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eef2f7' }}
              >
                <div className="col-name">{s.fullName || `#${s.accountId}`}</div>
                <div>{s.classCode || `#${s.classId}`}</div>
                <div>{s.subjectCode || `#${s.subjectId}`}</div>
                <div>
                  <span className="badge-locked">{s.attendanceRate}%</span>
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>
                    {tr('ngưỡng')} {s.thresholdPercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default InstructorDashboard;