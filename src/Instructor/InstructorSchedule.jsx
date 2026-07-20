import { useState, useEffect } from "react";
import { api } from "../utils/api";
import "./instructor.scss";

const InstructorSchedule = () => {
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

        apiSessions.forEach(session => {
          const rawDate = session.sessionDate;
          if (!rawDate) return;
          const d = new Date(rawDate);
          
          const dayIndex = d.getDay();
          const dayName = daysOfWeek[dayIndex];
          const targetDay = weeklyData.find(item => item.day === dayName);
          
          if (targetDay) {
            const cls = apiClasses.find(c => c.classId === session.classId);
            
            // Format time (from sessionDate)
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes} - ${hours}:${minutes}`;

            targetDay.sessions.push({
              time: timeStr,
              code: cls ? cls.classCode : "CL-N/A",
              name: session.sessionTitle || "Buổi học",
              room: session.location || "Phòng LAB"
            });
          }
        });

        setSchedule(weeklyData);
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
          <h1>Lịch giảng dạy trong tuần</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Lịch trình giảng dạy chi tiết của giảng viên theo từng ngày trong tuần.
          </p>
        </div>
      </section>

      {/* Schedule Calendar View */}
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2>Lịch biểu Tuần học hiện tại</h2>
          <div className="panel-action">Tuần này</div>
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
                  <span>{dayData.day}</span>
                  {dayData.sessions.length > 0 && <span className="dot-indicator" />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flexGrow: 1 }}>
                  {dayData.sessions.length === 0 ? (
                    <div className="no-classes-text">
                      Không có giờ dạy
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
                          {session.name}
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
    </div>
  );
};

export default InstructorSchedule;
