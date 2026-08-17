import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useLanguage } from '../context/LanguageContext';
import "./instructor.scss";

const InstructorSchedule = () => {
  const { tr } = useLanguage();
  const [schedule, setSchedule] = useState([
    { day: "Thứ 2", sessions: [] },
    { day: "Thứ 3", sessions: [] },
    { day: "Thứ 4", sessions: [] },
    { day: "Thứ 5", sessions: [] },
    { day: "Thứ 6", sessions: [] },
    { day: "Thứ 7", sessions: [] },
    { day: "Chủ Nhật", sessions: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const [tbaSessions, setTbaSessions] = useState([]);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const [apiSessions, apiClasses] = await Promise.all([
          api.get("/sessions").catch(() => []),
          api.get("/classes").catch(() => [])
        ]);

        const daysOfWeek = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        
        // Initialize weekly schedule
        const weeklyData = [
          { day: "Thứ 2", sessions: [] },
          { day: "Thứ 3", sessions: [] },
          { day: "Thứ 4", sessions: [] },
          { day: "Thứ 5", sessions: [] },
          { day: "Thứ 6", sessions: [] },
          { day: "Thứ 7", sessions: [] },
          { day: "Chủ Nhật", sessions: [] }
        ];

        // Các buổi học chưa có SessionDate (nháp/TBA) — hiển thị riêng bên dưới lịch tuần
        const tbaSessions = [];

        apiSessions.forEach(session => {
          const rawDate = session.sessionDate;
          const cls = apiClasses.find(c => c.classId === session.classId);
          if (!rawDate) {
            tbaSessions.push({
              code: cls ? cls.classCode : "CL-N/A",
              name: session.sessionTitle || tr("Buổi học"),
              room: session.location || tr("Phòng LAB")
            });
            return;
          }
          const d = new Date(rawDate);
          
          const dayIndex = d.getDay();
          const dayName = daysOfWeek[dayIndex];
          const targetDay = weeklyData.find(item => item.day === dayName);
          
          if (targetDay) {
            // Format time (from sessionDate)
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes} - ${hours}:${minutes}`;

            targetDay.sessions.push({
              time: timeStr,
              code: cls ? cls.classCode : "CL-N/A",
              name: session.sessionTitle || tr("Buổi học"),
              room: session.location || tr("Phòng LAB")
            });
          }
        });

        setSchedule(weeklyData);
        setTbaSessions(tbaSessions);
      } catch (err) {
        console.error("Lỗi khi tải lịch học:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  const getTodayDayName = () => {
    const daysOfWeek = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return daysOfWeek[new Date().getDay()];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Content Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>{tr('Lịch giảng dạy trong tuần')}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr('Lịch trình giảng dạy chi tiết của giảng viên theo từng ngày trong tuần.')}
          </p>
        </div>
      </section>

      {/* Schedule Calendar View */}
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2>{tr('Lịch biểu Tuần học hiện tại')}</h2>
          <div className="panel-action">{tr('Tuần này')}</div>
        </div>

        {/* Weekly Grid */}
        <div className="schedule-weekly-grid">
          {schedule.map((dayData) => {
            const isToday = dayData.day === getTodayDayName();
            return (
              <div
                key={dayData.day}
                className={`day-column${isToday ? ' today-column' : ''}`}
              >
                <div className="day-header">
                  <span>{tr(dayData.day)}</span>
                  {dayData.sessions.length > 0 && <span className="dot-indicator" />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
                  {dayData.sessions.length === 0 ? (
                    <div className="no-classes-text">
                      {tr('Không có giờ dạy')}
                    </div>
                  ) : (
                    dayData.sessions.map((session, sIdx) => (
                      <div
                        key={sIdx}
                        className="session-schedule-card"
                      >
                        <span className="session-time">
                          {session.time}
                        </span>
                        <span className="session-title">
                          {tr(session.name)}
                        </span>
                        <span className="session-code">
                          {session.code}
                        </span>
                        <div className="session-location">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {session.room}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Buổi học chưa xếp lịch (SessionDate null → TBA) */}
      {tbaSessions.length > 0 && (
        <div className="dashboard-panel" style={{ padding: "20px" }}>
          <div className="panel-header">
            <h2>{tr('Buổi học chưa xếp lịch (TBA)')}</h2>
            <div className="panel-action">{tbaSessions.length} {tr('buổi')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {tbaSessions.map((session, sIdx) => (
              <div key={sIdx} className="session-schedule-card" style={{ borderLeft: '4px solid #c5a059' }}>
                <span className="session-time" style={{ color: '#c5a059', fontWeight: 800 }}>TBA</span>
                <span className="session-title">{tr(session.name)}</span>
                <span className="session-code">{session.code}</span>
                <div className="session-location">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  {session.room}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorSchedule;
