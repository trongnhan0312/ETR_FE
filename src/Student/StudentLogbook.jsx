import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';

const StudentLogbook = ({ studentId }) => {
  const { tr } = useLanguage();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logbook, setLogbook] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogbook();
  }, [studentId]);

  const fetchLogbook = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = studentId ? `/Logbook/student/${studentId}` : '/Logbook/my-summary';
      const data = await api.get(endpoint, { suppressAuthRedirect: true });
      if (data) {
        setLogbook(data);
      }
    } catch (err) {
      console.error('Fetch logbook failed:', err);
      const msg = err.response?.data?.message || err.message || tr('Không thể tải dữ liệu sổ bay');
      setError(msg);
      toast.error(tr('Không thể tải dữ liệu sổ bay'), msg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '--';
    try {
      return new Date(d).toLocaleDateString('vi-VN');
    } catch {
      return '--';
    }
  };

  const formatDateTime = (d) => {
    if (!d) return '--';
    try {
      return new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
    } catch {
      return '--';
    }
  };

  const entries = logbook?.entries ?? logbook?.Entries ?? [];
  const filteredEntries = entries.filter((entry) => {
    const type = entry.trainingType ?? entry.TrainingType;
    if (filterType === 'FLIGHT' && type !== 'Flight' && (entry.flightHours ?? entry.FlightHours ?? 0) <= 0) return false;
    if (filterType === 'SIM' && type !== 'Simulator' && (entry.simulatorHours ?? entry.SimulatorHours ?? 0) <= 0) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const title = (entry.sessionTitle ?? entry.SessionTitle ?? '').toLowerCase();
      const code = (entry.lessonCode ?? entry.LessonCode ?? '').toLowerCase();
      const aircraft = (entry.aircraftRegistration ?? entry.AircraftRegistration ?? '').toLowerCase();
      const sim = (entry.simulatorDevice ?? entry.SimulatorDevice ?? '').toLowerCase();
      const route = (entry.route ?? entry.Route ?? '').toLowerCase();
      return title.includes(q) || code.includes(q) || aircraft.includes(q) || sim.includes(q) || route.includes(q);
    }
    return true;
  });

  return (
    <div className="page-shell">
      <toast.ToastContainer />

      {/* ── Header ── */}
      <section className="student-welcome" style={{ marginBottom: 20 }}>
        <div className="student-welcome-left">
          <p className="eyebrow">{tr('Pilot Training Records')}</p>
          <h1>{tr('Sổ bay & Huấn luyện Buồng lái')}</h1>
          <p className="welcome-sub">
            {tr('Tổng hợp chi tiết giờ bay thực tế (Flight Hours), giờ mô phỏng (FSTD/SIM Hours) và các chỉ số tích lũy.')}
          </p>
        </div>
      </section>

      {/* ── Notice / Disclaimer Banner ── */}
      <div
        style={{
          background: 'rgba(0, 74, 153, 0.06)',
          borderLeft: '4px solid #004a99',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '24px',
          color: '#002855',
          fontSize: '13px',
          lineHeight: '1.5',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '18px' }}>ℹ️</span>
        <div>
          <strong>{tr('Quy chuẩn ghi nhận:')}</strong> {logbook?.disclaimer || logbook?.Disclaimer || tr('Tổng giờ logbook phản ánh thời gian đào tạo thực tế đã được ký nhận, độc lập với đánh giá hoàn thành môn học.')}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{tr('Đang tải dữ liệu sổ bay...')}</div>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>{tr('Không thể tải dữ liệu sổ bay')}</div>
          <div style={{ fontSize: '13px', color: '#7f1d1d', marginBottom: '16px' }}>{error}</div>
          <button
            type="button"
            className="primary-btn"
            onClick={fetchLogbook}
            style={{ padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', background: '#002147', color: '#fff', border: 'none' }}
          >
            {tr('Thử lại')}
          </button>
        </div>
      ) : !logbook ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', color: '#64748b' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>{tr('Chưa có dữ liệu sổ bay')}</div>
          <div style={{ fontSize: '13px', maxWidth: '480px', margin: '0 auto', lineHeight: '1.5' }}>
            {tr('Sổ bay chỉ ghi nhận các buổi học bay/mô phỏng có mặt (Present), đã được Giảng viên ký số hoặc buổi học đã được xác nhận hoàn thành.')}
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary Cards Grid ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            {/* Total Flight Hours */}
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#004a99', textTransform: 'uppercase', marginBottom: '6px' }}>✈️ {tr('Giờ bay thực tế (Flight)')}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#002855' }}>{(logbook.totalFlightHours ?? logbook.TotalFlightHours ?? 0).toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs</span></div>
              <div style={{ fontSize: '11px', color: '#7a8ba0', marginTop: '4px' }}>{tr('Chuyến bay cuối:')} {formatDate(logbook.lastFlightDate ?? logbook.LastFlightDate)}</div>
            </div>

            {/* Total Simulator Hours */}
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b3ba6', textTransform: 'uppercase', marginBottom: '6px' }}>🕹️ {tr('Giờ mô phỏng (SIM / FSTD)')}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#3d1b6b' }}>{(logbook.totalSimulatorHours ?? logbook.TotalSimulatorHours ?? 0).toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs</span></div>
              <div style={{ fontSize: '11px', color: '#7a8ba0', marginTop: '4px' }}>{tr('Tách biệt hoàn toàn với giờ bay')}</div>
            </div>

            {/* Dual Hours */}
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#334e68', textTransform: 'uppercase', marginBottom: '6px' }}>👨‍🏫 {tr('Giờ kèm (Dual)')}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#102a43' }}>{(logbook.totalDualHours ?? logbook.TotalDualHours ?? 0).toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs</span></div>
              <div style={{ fontSize: '11px', color: '#7a8ba0', marginTop: '4px' }}>
                {tr('Bay')}: {(logbook.flightDualHours ?? logbook.FlightDualHours ?? 0).toFixed(1)}h | SIM: {(logbook.simulatorDualHours ?? logbook.SimulatorDualHours ?? 0).toFixed(1)}h
              </div>
            </div>

            {/* Solo Hours */}
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0b69a3', textTransform: 'uppercase', marginBottom: '6px' }}>🧑‍✈️ {tr('Bay đơn (Solo)')}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#044e54' }}>{(logbook.totalSoloHours ?? logbook.TotalSoloHours ?? 0).toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs</span></div>
              <div style={{ fontSize: '11px', color: '#7a8ba0', marginTop: '4px' }}>{tr('Tự lái không có GV')}</div>
            </div>

            {/* PIC Hours */}
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#27ab83', textTransform: 'uppercase', marginBottom: '6px' }}>⭐ {tr('Chỉ huy (PIC)')}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#0b694b' }}>{(logbook.totalPicHours ?? logbook.TotalPicHours ?? 0).toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs</span></div>
              <div style={{ fontSize: '11px', color: '#7a8ba0', marginTop: '4px' }}>{tr('Pilot-in-Command')}</div>
            </div>

            {/* Night Hours */}
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', textTransform: 'uppercase', marginBottom: '6px' }}>🌙 {tr('Bay đêm (Night)')}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>{(logbook.totalNightHours ?? logbook.TotalNightHours ?? 0).toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs</span></div>
              <div style={{ fontSize: '11px', color: '#7a8ba0', marginTop: '4px' }}>{tr('Điều kiện ban đêm')}</div>
            </div>

            {/* Instrument Hours */}
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#d97706', textTransform: 'uppercase', marginBottom: '6px' }}>🧭 {tr('Thiết bị (Instrument)')}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#92400e' }}>{(logbook.totalInstrumentHours ?? logbook.TotalInstrumentHours ?? 0).toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs</span></div>
              <div style={{ fontSize: '11px', color: '#7a8ba0', marginTop: '4px' }}>
                {tr('Bay')}: {(logbook.flightInstrumentHours ?? logbook.FlightInstrumentHours ?? 0).toFixed(1)}h | SIM: {(logbook.simulatorInstrumentHours ?? logbook.SimulatorInstrumentHours ?? 0).toFixed(1)}h
              </div>
            </div>

            {/* Cross-Country Hours */}
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', marginBottom: '6px' }}>🗺️ {tr('Đường dài (Cross-Country)')}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e40af' }}>{(logbook.totalCrossCountryHours ?? logbook.TotalCrossCountryHours ?? 0).toFixed(1)} <span style={{ fontSize: '14px', fontWeight: 400 }}>hrs</span></div>
              <div style={{ fontSize: '11px', color: '#7a8ba0', marginTop: '4px' }}>{tr('Chuyển sân / XC')}</div>
            </div>

            {/* Landings */}
            <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#059669', textTransform: 'uppercase', marginBottom: '6px' }}>🛬 {tr('Hạ cánh (Landings)')}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#065f46' }}>{logbook.totalLandings ?? logbook.TotalLandings ?? 0} <span style={{ fontSize: '13px', fontWeight: 400 }}>lần</span></div>
              <div style={{ fontSize: '11px', color: '#7a8ba0', marginTop: '4px' }}>Ngày: {logbook.totalDayLandings ?? logbook.TotalDayLandings ?? 0} | Đêm: {logbook.totalNightLandings ?? logbook.TotalNightLandings ?? 0}</div>
            </div>
          </div>

          {/* ── Filter and Search Bar ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`secondary-btn ${filterType === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterType('ALL')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ccd6e0',
                  background: filterType === 'ALL' ? '#004a99' : '#fff',
                  color: filterType === 'ALL' ? '#fff' : '#102a43',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tr('Tất cả')} ({entries.length})
              </button>
              <button
                type="button"
                className={`secondary-btn ${filterType === 'FLIGHT' ? 'active' : ''}`}
                onClick={() => setFilterType('FLIGHT')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ccd6e0',
                  background: filterType === 'FLIGHT' ? '#004a99' : '#fff',
                  color: filterType === 'FLIGHT' ? '#fff' : '#102a43',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ✈️ {tr('Bay thực (Flight)')}
              </button>
              <button
                type="button"
                className={`secondary-btn ${filterType === 'SIM' ? 'active' : ''}`}
                onClick={() => setFilterType('SIM')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #ccd6e0',
                  background: filterType === 'SIM' ? '#004a99' : '#fff',
                  color: filterType === 'SIM' ? '#fff' : '#102a43',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                🕹️ {tr('Mô phỏng (SIM)')}
              </button>
            </div>

            <div>
              <input
                type="text"
                placeholder={tr('Tìm kiếm bài học, máy bay, lộ trình...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #ccd6e0',
                  fontSize: '13px',
                  minWidth: '240px',
                }}
              />
            </div>
          </div>

          {/* ── Detailed Logbook Table ── */}
          <div style={{ background: '#fff', border: '1px solid #e0e6ed', borderRadius: '12px', overflowX: 'auto', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafd', borderBottom: '2px solid #e0e6ed', color: '#334e68' }}>
                  <th style={{ padding: '12px 14px' }}>{tr('Ngày')}</th>
                  <th style={{ padding: '12px 14px' }}>{tr('Bài học / Tiêu đề')}</th>
                  <th style={{ padding: '12px 14px' }}>{tr('Loại')}</th>
                  <th style={{ padding: '12px 14px' }}>{tr('Máy bay / SIM')}</th>
                  <th style={{ padding: '12px 14px' }}>{tr('Lộ trình')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{tr('Bay')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{tr('SIM')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{tr('Dual')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{tr('Solo')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{tr('PIC')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{tr('Night')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>{tr('Inst')}</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>{tr('Hạ cánh (D/N)')}</th>
                  <th style={{ padding: '12px 14px' }}>{tr('Giảng viên ký')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="14" style={{ textAlign: 'center', padding: '32px', color: '#888' }}>
                      {tr('Không tìm thấy bản ghi huấn luyện phù hợp.')}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((e, idx) => {
                    const tType = e.trainingType ?? e.TrainingType;
                    const isFlight = tType === 'Flight';
                    const isSim = tType === 'Simulator';
                    const flightH = e.flightHours ?? e.FlightHours ?? 0;
                    const simH = e.simulatorHours ?? e.SimulatorHours ?? 0;
                    const dualH = e.dualHours ?? e.DualHours ?? 0;
                    const soloH = e.soloHours ?? e.SoloHours ?? 0;
                    const picH = e.picHours ?? e.PicHours ?? 0;
                    const nightH = e.nightHours ?? e.NightHours ?? 0;
                    const instH = e.instrumentHours ?? e.InstrumentHours ?? 0;
                    const dayL = e.dayLandings ?? e.DayLandings ?? 0;
                    const nightL = e.nightLandings ?? e.NightLandings ?? 0;
                    const insSignedAt = e.instructorSignedAt ?? e.InstructorSignedAt;

                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #eef2f6' }}>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {formatDate(e.sessionDate ?? e.SessionDate)}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#102a43' }}>{e.sessionTitle ?? e.SessionTitle}</div>
                          {e.lessonCode || e.LessonCode ? (
                            <div style={{ fontSize: '11px', color: '#627d98' }}>{e.lessonCode || e.LessonCode}</div>
                          ) : null}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: isFlight ? '#e0f2fe' : isSim ? '#f3e8ff' : '#f1f5f9',
                              color: isFlight ? '#0369a1' : isSim ? '#6b21a8' : '#475569',
                            }}
                          >
                            {isFlight ? 'Flight' : isSim ? 'Simulator' : 'Theory'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {e.aircraftRegistration || e.AircraftRegistration ? (
                            <span style={{ fontWeight: 600, color: '#0369a1' }}>{e.aircraftRegistration || e.AircraftRegistration}</span>
                          ) : e.simulatorDevice || e.SimulatorDevice ? (
                            <span style={{ fontWeight: 600, color: '#6b21a8' }}>{e.simulatorDevice || e.SimulatorDevice}</span>
                          ) : (
                            '--'
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          {e.route || e.Route || (e.departureIcao && e.arrivalIcao ? `${e.departureIcao}-${e.arrivalIcao}` : '--')}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: flightH > 0 ? 600 : 400, color: flightH > 0 ? '#004a99' : '#888' }}>
                          {flightH > 0 ? flightH.toFixed(1) : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: simH > 0 ? 600 : 400, color: simH > 0 ? '#6b3ba6' : '#888' }}>
                          {simH > 0 ? simH.toFixed(1) : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{dualH > 0 ? dualH.toFixed(1) : '-'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{soloH > 0 ? soloH.toFixed(1) : '-'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{picH > 0 ? picH.toFixed(1) : '-'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{nightH > 0 ? nightH.toFixed(1) : '-'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>{instH > 0 ? instH.toFixed(1) : '-'}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {dayL > 0 || nightL > 0 ? `${dayL} / ${nightL}` : '-'}
                        </td>
                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                          {insSignedAt ? (
                            <span style={{ color: '#059669', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>✓</span> {formatDateTime(insSignedAt)}
                            </span>
                          ) : (
                            <span style={{ color: '#d97706', fontSize: '12px' }}>Chờ ký</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentLogbook;
