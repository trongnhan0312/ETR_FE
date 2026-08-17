import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useLanguage } from '../context/LanguageContext';
import "./instructor.scss";

// BE chỉ lưu giờ bắt đầu (SessionDate), không có cột giờ kết thúc (EndTime).
// → Frontend tự tính: EndTime = StartTime + duration mặc định (2 giờ) để hiển thị
// khung giờ hợp lý thay vì "11:16 - 11:16" (lấy luôn giờ bắt đầu làm giờ kết thúc).
const DEFAULT_SESSION_DURATION_MINUTES = 120;

// Giảng viên hiện tại = người đang đăng nhập (lưu trong localStorage khi login)
const getCurrentAccountId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.accountId ?? user.userId ?? null;
  } catch {
    return null;
  }
};

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

        // /sessions trả về buổi học của MỌI lớp/môn trong hệ thống (không lọc theo
        // giảng viên), trong khi /classes (BE) đã lọc sẵn chỉ còn lớp của giảng viên
        // hiện tại. → Lập bản đồ classId → mã lớp + các môn được phân công để chỉ
        // hiển thị đúng buổi của lớp/môn mình giảng dạy, bỏ hẳn buổi lớp khác (CL-N/A).
        const currentAccountId = getCurrentAccountId();
        const myClasses = new Map();
        apiClasses.forEach((cls) => {
          const assignedSubjectIds = (Array.isArray(cls.instructorAssignments) ? cls.instructorAssignments : [])
            .filter(
              (a) =>
                a.instructorAccountId != null &&
                currentAccountId != null &&
                String(a.instructorAccountId) === String(currentAccountId),
            )
            .map((a) => a.subjectId);
          myClasses.set(cls.classId, {
            code: cls.classCode || `CL-${cls.classId}`,
            subjectIds: new Set(assignedSubjectIds),
          });
        });

        // Buổi thuộc lớp/môn mà giảng viên hiện tại được phân công giảng dạy
        const isMySession = (session) => {
          const cls = myClasses.get(session.classId);
          if (!cls) return false;
          // Không có thông tin phân công môn → giữ nguyên buổi của lớp này
          if (cls.subjectIds.size === 0) return true;
          return cls.subjectIds.has(session.subjectId);
        };

        // Các buổi học chưa có SessionDate (nháp/TBA) — hiển thị riêng bên dưới lịch tuần
        const tbaSessions = [];

        apiSessions.forEach(session => {
          if (!isMySession(session)) return;

          const rawDate = session.sessionDate;
          const cls = myClasses.get(session.classId);
          const code = cls ? cls.code : "CL-N/A";
          const name = session.sessionTitle || tr("Buổi học");
          const room = session.location || tr("Phòng LAB");

          if (!rawDate) {
            tbaSessions.push({ code, name, room });
            return;
          }
          const d = new Date(rawDate);
          
          const dayIndex = d.getDay();
          const dayName = daysOfWeek[dayIndex];
          const targetDay = weeklyData.find(item => item.day === dayName);
          
          if (targetDay) {
            // Format time (from sessionDate) — BE chỉ có giờ bắt đầu nên giờ kết
            // thúc = giờ bắt đầu + duration mặc định (xử lý đúng cả buổi qua nửa đêm).
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const end = new Date(d.getTime() + DEFAULT_SESSION_DURATION_MINUTES * 60 * 1000);
            const endHours = String(end.getHours()).padStart(2, '0');
            const endMinutes = String(end.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes} - ${endHours}:${endMinutes}`;

            targetDay.sessions.push({ time: timeStr, code, name, room });
          }
        });

        // Gộp buổi trùng hiển thị: mỗi môn của lớp đều tự sinh bộ buổi cùng tên
        // ("Session 1", "Session 2"...) cùng ngày/giờ/phòng → chỉ giữ 1 thẻ mỗi khung.
        weeklyData.forEach((dayData) => {
          const seen = new Set();
          dayData.sessions = dayData.sessions.filter((s) => {
            const key = `${s.time}|${s.code}|${s.name}|${s.room}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });

        const seenTba = new Set();
        const uniqueTba = [];
        tbaSessions.forEach((s) => {
          const key = `${s.code}|${s.name}|${s.room}`;
          if (seenTba.has(key)) return;
          seenTba.add(key);
          uniqueTba.push(s);
        });

        setSchedule(weeklyData);
        setTbaSessions(uniqueTba);
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
