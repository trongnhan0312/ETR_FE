import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ApexChart from '../components/ApexChart';
import { fetchMyDashboard } from '../utils/dashboardApi';
import { useLanguage } from '../context/LanguageContext';
import '../dashboard.scss';

const InstructorDashboard = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [myClasses, setMyClasses] = useState([]);
  const [lowAttendance, setLowAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const d = await fetchMyDashboard();
        setMyClasses(d?.myClasses ?? []);
        setLowAttendance(d?.lowAttendanceStudents ?? []);
      } catch (err) {
        console.error('Error loading Instructor Dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalStudents = myClasses.reduce((sum, c) => sum + (Number(c.studentCount) || 0), 0);

  const classBar = useMemo(() => {
    return {
      chart: { type: 'bar', fontFamily: 'inherit', toolbar: { show: false } },
      series: [{ name: tr('Students'), data: myClasses.map((c) => Number(c.studentCount) || 0) }],
      xaxis: {
        categories: myClasses.map((c) => c.classCode || `#${c.classId}`),
        labels: { style: { colors: 'rgba(0,33,71,0.65)', fontSize: '11px' } },
      },
      colors: ['#0a2c55'],
      plotOptions: { bar: { borderRadius: 5, columnWidth: '52%' } },
      dataLabels: { enabled: false },
      grid: { borderColor: '#eef2f7' },
      tooltip: { y: { formatter: (v) => `${v} ${tr('students')}` } },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myClasses]);

  const kpis = [
    {
      label: tr('Tổng lớp phụ trách'),
      value: myClasses.length,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      iconBg: 'rgba(10,44,85,0.08)',
      iconColor: '#0a2c55',
    },
    {
      label: tr('Tổng học viên'),
      value: totalStudents,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
      ),
      iconBg: 'rgba(99,102,241,0.12)',
      iconColor: '#6366f1',
    },
    {
      label: tr('Học viên điểm danh thấp'),
      value: lowAttendance.length,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      iconBg: 'rgba(239,68,68,0.1)',
      iconColor: '#dc2626',
    },
  ];

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

      <section className="freedash-kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="freedash-kpi">
            <div className="freedash-kpi-icon" style={{ background: kpi.iconBg, color: kpi.iconColor }}>
              {kpi.icon}
            </div>
            <div className="freedash-kpi-body">
              <div className="freedash-kpi-value" style={{ color: kpi.iconColor }}>
                {loading ? '...' : kpi.value}
              </div>
              <div className="freedash-kpi-label">{kpi.label}</div>
              <div className="freedash-kpi-sub">{tr('Live from API')}</div>
            </div>
          </div>
        ))}
      </section>

      {myClasses.length > 0 && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="freedash-dist-card">
            <h3 className="freedash-dist-title">{tr('HỌC VIÊN THEO LỚP')}</h3>
            <p className="freedash-dist-sub">{tr('Số học viên hiện tại của từng lớp bạn phụ trách.')}</p>
            <ApexChart options={classBar} height={280} />
          </div>
        </section>
      )}

      <section className="table-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>{tr('LỚP CỦA TÔI')}</h2>
            <p style={{ fontSize: '12px', color: 'rgba(0,33,71,0.5)', margin: '4px 0 0' }}>{tr('Các lớp được phân công giảng dạy.')}</p>
          </div>
          <button className="dash-btn-sm" type="button" onClick={() => navigate('/instructor/classes')}>
            {tr('Xem tất cả')} →
          </button>
        </div>
        {loading ? (
          <div className="dash-empty">{tr('Đang tải dữ liệu...')}</div>
        ) : myClasses.length === 0 ? (
          <div className="dash-empty">{tr('Bạn chưa được phân công lớp nào.')}</div>
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
                <div>{Number(cls.studentCount) || 0} {tr('HV')}</div>
                <div style={{ textAlign: 'right' }}>
                  <button className="dash-btn-sm" type="button" onClick={() => navigate('/instructor/attendance')}>
                    {tr('Điểm danh')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="table-card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>{tr('CẢNH BÁO ĐIỂM DANH THẤP')}</h2>
            <p style={{ fontSize: '12px', color: 'rgba(0,33,71,0.5)', margin: '4px 0 0' }}>
              {tr('Học viên có tỉ lệ điểm danh dưới ngưỡng tối thiểu.')}
            </p>
          </div>
          <span className="dash-badge dash-badge-danger">{lowAttendance.length} {tr('học viên')}</span>
        </div>
        {loading ? (
          <div className="dash-empty">{tr('Đang tải dữ liệu...')}</div>
        ) : lowAttendance.length === 0 ? (
          <div className="dash-empty">{tr('Không có học viên nào dưới ngưỡng điểm danh.')}</div>
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
                  <span className="dash-badge dash-badge-danger">{s.attendanceRate}%</span>
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
