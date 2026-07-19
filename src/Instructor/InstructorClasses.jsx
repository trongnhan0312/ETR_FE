import { useState, useMemo } from 'react';

const classesData = [
  {
    stt: '01',
    code: 'AV-2024-001',
    name: 'Kỹ thuật Hàng không Cơ bản',
    subName: 'Hệ thống động cơ phản lực',
    courseKey: '24',
    schedule: 'Thứ 2, 4, 6',
    time: '08:00 - 11:30',
    studentsCount: '25/25',
    status: 'Đang diễn ra',
  },
  {
    stt: '02',
    code: 'AV-2024-045',
    name: 'An toàn Hàng không & Quy trình',
    subName: 'Tuân thủ ICAO Annex 14',
    courseKey: '25',
    schedule: 'Thứ 3, 5',
    time: '13:30 - 17:00',
    studentsCount: '18/20',
    status: 'Sắp tới',
  },
  {
    stt: '03',
    code: 'AV-2023-098',
    name: 'Quản trị Không lưu Chuyên sâu',
    subName: 'Mô phỏng Radar cấp độ 3',
    courseKey: '22',
    schedule: 'Cả tuần',
    time: 'Tăng cường',
    studentsCount: '15/15',
    status: 'Hoàn thành',
  },
  {
    stt: '04',
    code: 'AV-2024-012',
    name: 'Khí tượng Hàng không',
    subName: 'Dự báo thời tiết chuyên biệt',
    courseKey: '24',
    schedule: 'Thứ 7',
    time: '08:00 - 16:30',
    studentsCount: '30/30',
    status: 'Đang diễn ra',
  },
  {
    stt: '05',
    code: 'AV-2024-088',
    name: 'Vật liệu Hàng không hiện đại',
    subName: 'Composite & Nano-structures',
    courseKey: '26',
    schedule: 'Chưa sắp lịch',
    time: '',
    studentsCount: '0/25',
    status: 'Sắp tới',
  },
];

const mockSessions = [
  { stt: '01', date: '24/05/2024', name: 'Buổi 1: Giới thiệu hệ thống thủy lực', room: 'Phòng LAB-04', instructor: 'Nguyễn Văn A', attendance: '25/25', rate: 100 },
  { stt: '02', date: '26/05/2024', name: 'Buổi 2: Kiểm tra van xả áp', room: 'Xưởng bảo trì A1', instructor: 'Nguyễn Văn A', attendance: '23/25', rate: 92 },
  { stt: '03', date: '28/05/2024', name: 'Buổi 3: Quy trình an toàn động cơ', room: 'Phòng LAB-04', instructor: 'Nguyễn Văn A', attendance: '24/25', rate: 96 },
  { stt: '04', date: '31/05/2024', name: 'Buổi 4: Thực hành chẩn đoán lỗi', room: 'Hangar B7', instructor: 'Trần Văn B (Phụ tá)', attendance: '25/25', rate: 100 },
  { stt: '05', date: '02/06/2024', name: 'Buổi 5: Cấu trúc cánh máy bay', room: 'Hangar B7', instructor: 'Nguyễn Văn A', attendance: '24/25', rate: 96 },
  { stt: '06', date: '04/06/2024', name: 'Buổi 6: Bảo dưỡng càng hạ cánh', room: 'Xưởng bảo trì A1', instructor: 'Nguyễn Văn A', attendance: '25/25', rate: 100 },
];

const InstructorClasses = () => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [sessionSearch, setSessionSearch] = useState('');

  const filteredClasses = useMemo(() => {
    return classesData.filter((cls) => {
      const matchesSearch =
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.subName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'Tất cả' || cls.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const ongoing = classesData.filter((c) => c.status === 'Đang diễn ra').length;
    const upcoming = classesData.filter((c) => c.status === 'Sắp tới').length;
    const completed = classesData.filter((c) => c.status === 'Hoàn thành').length;
    return { ongoing, upcoming, completed };
  }, []);

  const filteredSessions = useMemo(() => {
    return mockSessions.filter(
      (s) =>
        s.name.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.instructor.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.room.toLowerCase().includes(sessionSearch.toLowerCase())
    );
  }, [sessionSearch]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Đang diễn ra':
        return { bg: 'rgba(34, 197, 94, 0.08)', color: '#16a34a', border: 'rgba(34, 197, 94, 0.2)', dot: '#22c55e' };
      case 'Sắp tới':
        return { bg: 'rgba(59, 130, 246, 0.08)', color: '#2563eb', border: 'rgba(59, 130, 246, 0.2)', dot: '#3b82f6' };
      case 'Hoàn thành':
        return { bg: 'rgba(0, 33, 71, 0.04)', color: 'rgba(0, 33, 71, 0.5)', border: 'rgba(0, 33, 71, 0.08)', dot: '#94a3b8' };
      default:
        return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', dot: '#94a3b8' };
    }
  };

  const getRateColor = (rate) => {
    if (rate >= 95) return '#16a34a';
    if (rate >= 80) return '#c5a059';
    return '#ef4444';
  };

  // Class Detail View
  if (selectedClass) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Breadcrumb */}
        <nav className="breadcrumb-nav">
          <span className="breadcrumb-item" onClick={() => setSelectedClass(null)} style={{ cursor: 'pointer' }}>LỚP CỦA TÔI</span>
          <svg width="4" height="6" viewBox="0 0 4 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z" fill="currentColor" />
          </svg>
          <span className="breadcrumb-item active">{selectedClass.code}</span>
        </nav>

        {/* Page Header */}
        <section className="content-header">
          <div className="header-left">
            <h1>{selectedClass.name}</h1>
            <div className="divider-gold" />
            <p className="header-description">{selectedClass.subName} · Mã lớp: {selectedClass.code}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {(() => {
              const s = getStatusStyle(selectedClass.status);
              return (
                <span style={{
                  padding: '6px 14px', borderRadius: '999px', fontSize: '10px', fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`
                }}>
                  {selectedClass.status}
                </span>
              );
            })()}
          </div>
        </section>

        {/* Class Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Lịch học', value: selectedClass.schedule },
            { label: 'Thời gian', value: selectedClass.time || '—' },
            { label: 'Sĩ số', value: selectedClass.studentsCount },
            { label: 'Khóa học', value: `K${selectedClass.courseKey}` },
          ].map((info) => (
            <div key={info.label} className="stat-card" style={{ padding: '16px' }}>
              <div className="stat-header">
                <span className="stat-label">{info.label}</span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#002147' }}>{info.value}</div>
            </div>
          ))}
        </div>

        {/* Sessions Table */}
        <section className="table-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e0e4e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>Danh sách buổi học</h3>
              <p style={{ fontSize: '12px', color: 'rgba(0,33,71,0.5)', margin: '4px 0 0' }}>{mockSessions.length} buổi đã tạo</p>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm buổi học..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                style={{
                  padding: '10px 14px 10px 36px', borderRadius: '12px', border: '1px solid #d9e1ec',
                  fontSize: '13px', color: '#17314f', outline: 'none', width: '240px',
                  background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)',
                }}
              />
              <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                <path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="currentColor" />
              </svg>
            </div>
          </div>

          {/* Sessions List */}
          <div className="table-body">
            {filteredSessions.map((session) => (
              <div key={session.stt} className="table-row" style={{
                display: 'grid', gridTemplateColumns: '60px 100px 1fr 1fr 1fr 100px 80px',
                alignItems: 'center', gap: '12px', padding: '14px 20px', borderTop: '1px solid #e0e4e8', cursor: 'default'
              }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(0,33,71,0.4)', textAlign: 'center' }}>{session.stt}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#002147' }}>{session.date}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#002147' }}>{session.name}</span>
                <span style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{session.room}</span>
                <span style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{session.instructor}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#002147', textAlign: 'center' }}>{session.attendance}</span>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    fontSize: '12px', fontWeight: '700', color: getRateColor(session.rate),
                    padding: '4px 10px', borderRadius: '999px',
                    backgroundColor: session.rate >= 95 ? 'rgba(34,197,94,0.08)' : session.rate >= 80 ? 'rgba(197,160,89,0.08)' : 'rgba(239,68,68,0.08)',
                  }}>
                    {session.rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="table-footer">
            <span className="footer-info">Hiển thị {filteredSessions.length} trên {mockSessions.length} buổi học</span>
            <div className="pagination">
              <button className="page-num active" type="button">1</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Classes List View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Content Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>Lớp học được phân công</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Danh sách các lớp huấn luyện hàng không mà bạn được phân công giảng dạy.
          </p>
        </div>
      </section>

      {/* Stats Row */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Đang diễn ra</span>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
            </div>
          </div>
          <div className="stat-value">{stats.ongoing}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Sắp tới</span>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
            </div>
          </div>
          <div className="stat-value">{stats.upcoming}</div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Hoàn thành</span>
            <div className="stat-icon" style={{ backgroundColor: 'rgba(0,33,71,0.05)', color: 'rgba(0,33,71,0.4)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
            </div>
          </div>
          <div className="stat-value">{stats.completed}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
        padding: '16px 20px', background: '#ffffff', border: '1px solid #dfe6f1', borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,33,71,0.04)'
      }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
            <path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="currentColor" />
          </svg>
          <input
            type="text"
            placeholder="Tìm lớp theo mã hoặc tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{ width: '100%', paddingLeft: '42px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['Tất cả', 'Đang diễn ra', 'Sắp tới', 'Hoàn thành'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              type="button"
              style={{
                padding: '8px 16px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                textTransform: 'uppercase', letterSpacing: '0.03em',
                ...(statusFilter === f
                  ? { backgroundColor: '#002147', borderColor: '#002147', color: '#d4af37' }
                  : { backgroundColor: 'transparent', borderColor: '#dfe6f1', color: 'rgba(0,33,71,0.6)' }
                ),
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Classes Table */}
      <section className="table-card">
        <div className="table-header" style={{
          display: 'grid', gridTemplateColumns: '60px 120px 1fr 140px 120px 120px 120px',
          alignItems: 'center', gap: '12px',
          background: 'linear-gradient(135deg, #06234a 0%, #041b39 100%)',
          color: '#ffffff', padding: '12px 20px', fontSize: '11px', fontWeight: '700',
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          <div style={{ textAlign: 'center' }}>STT</div>
          <div>Mã lớp</div>
          <div>Tên lớp</div>
          <div>Lịch học</div>
          <div>Thời gian</div>
          <div style={{ textAlign: 'center' }}>Sĩ số</div>
          <div style={{ textAlign: 'center' }}>Trạng thái</div>
        </div>

        <div className="table-body">
          {filteredClasses.map((cls) => {
            const s = getStatusStyle(cls.status);
            return (
              <div
                key={cls.code}
                className="table-row"
                onClick={() => setSelectedClass(cls)}
                style={{
                  display: 'grid', gridTemplateColumns: '60px 120px 1fr 140px 120px 120px 120px',
                  alignItems: 'center', gap: '12px', cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgba(0,33,71,0.4)', textAlign: 'center' }}>{cls.stt}</span>
                <span className="col-id">{cls.code}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#002147', margin: 0 }}>{cls.name}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(0,33,71,0.5)', margin: '2px 0 0' }}>{cls.subName}</p>
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(0,33,71,0.7)' }}>{cls.schedule}</span>
                <span style={{ fontSize: '13px', color: 'rgba(0,33,71,0.7)' }}>{cls.time || '—'}</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#002147', textAlign: 'center' }}>{cls.studentsCount}</span>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '5px 12px', borderRadius: '999px', fontSize: '10px', fontWeight: '700',
                    textTransform: 'uppercase', letterSpacing: '0.03em',
                    backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: s.dot }} />
                    {cls.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="table-footer">
          <span className="footer-info">Hiển thị {filteredClasses.length} trên {classesData.length} lớp</span>
          <div className="pagination">
            <button className="page-num active" type="button">1</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default InstructorClasses;
