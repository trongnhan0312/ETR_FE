import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { useLanguage } from "../context/LanguageContext";
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

const getMondayOfDate = (d) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const toLocalDateStr = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const InstructorSchedule = () => {
  const { tr } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [allSessions, setAllSessions] = useState([]);
  const [myClassesList, setMyClassesList] = useState([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedMonday, setSelectedMonday] = useState(() => getMondayOfDate(new Date()));
  const [tbaSessions, setTbaSessions] = useState([]);

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      try {
        const [apiSessions, apiClasses] = await Promise.all([
          api.get("/Sessions").catch(() => api.get("/sessions").catch(() => [])),
          api.get("/Classes").catch(() => api.get("/classes").catch(() => []))
        ]);

        const currentAccountId = getCurrentAccountId();
        const storedOverrides = (() => {
          try {
            return JSON.parse(localStorage.getItem("etr_class_instructors") || "{}");
          } catch {
            return {};
          }
        })();

        const myClasses = new Map();
        const classesArr = [];

        (Array.isArray(apiClasses) ? apiClasses : []).forEach((cls) => {
          const cached =
            storedOverrides[String(cls.classId)] ||
            (cls.classCode ? storedOverrides[String(cls.classCode).trim().toUpperCase()] : null);
          const rawAssignments =
            Array.isArray(cls.instructorAssignments) && cls.instructorAssignments.length > 0
              ? cls.instructorAssignments
              : Array.isArray(cls.classSubjects) && cls.classSubjects.length > 0
                ? cls.classSubjects
                : Array.isArray(cls.ClassSubjects) && cls.ClassSubjects.length > 0
                  ? cls.ClassSubjects
                  : Array.isArray(cached) && cached.length > 0
                    ? cached
                    : cls.instructorAccountId || cls.InstructorAccountId
                      ? [{ subjectId: cls.subjectId || 1, instructorAccountId: cls.instructorAccountId || cls.InstructorAccountId }]
                      : [];

          const assignedSubjectIds = rawAssignments
            .filter(
              (a) =>
                (a.instructorAccountId != null &&
                  currentAccountId != null &&
                  String(a.instructorAccountId) === String(currentAccountId)) ||
                (a.InstructorAccountId != null &&
                  currentAccountId != null &&
                  String(a.InstructorAccountId) === String(currentAccountId)),
            )
            .map((a) => a.subjectId ?? a.SubjectId);

          const classCode = cls.classCode || `CL-${cls.classId}`;
          const isAssigned = currentAccountId == null || assignedSubjectIds.length > 0;

          if (isAssigned) {
            classesArr.push({
              classId: cls.classId,
              classCode,
              className: cls.className || classCode,
            });
          }

          myClasses.set(cls.classId, {
            code: classCode,
            subjectIds: new Set(assignedSubjectIds),
            isAssigned,
          });
        });

        setMyClassesList(classesArr);

        // Lọc các buổi thuộc lớp/môn mà giảng viên hiện tại được phân công
        const isMySession = (session) => {
          const cls = myClasses.get(session.classId);
          if (!cls) return false;
          if (currentAccountId != null && !cls.isAssigned) return false;
          if (cls.subjectIds.size === 0) return true;
          return cls.subjectIds.has(session.subjectId);
        };

        const validSessions = [];
        const rawTba = [];

        (Array.isArray(apiSessions) ? apiSessions : []).forEach((session) => {
          if (!isMySession(session)) return;

          const cls = myClasses.get(session.classId);
          const code = cls ? cls.code : `CL-${session.classId}`;
          const name = session.sessionTitle || tr("Buổi học");
          const room = session.location || tr("Phòng LAB");

          if (!session.sessionDate) {
            rawTba.push({ code, name, room, classId: session.classId });
            return;
          }

          const d = new Date(session.sessionDate);
          if (isNaN(d.getTime())) {
            rawTba.push({ code, name, room, classId: session.classId });
            return;
          }

          const hours = String(d.getHours()).padStart(2, "0");
          const minutes = String(d.getMinutes()).padStart(2, "0");
          const end = new Date(d.getTime() + DEFAULT_SESSION_DURATION_MINUTES * 60 * 1000);
          const endHours = String(end.getHours()).padStart(2, "0");
          const endMinutes = String(end.getMinutes()).padStart(2, "0");
          const timeStr = `${hours}:${minutes} - ${endHours}:${endMinutes}`;

          validSessions.push({
            sessionId: session.sessionId,
            classId: session.classId,
            subjectId: session.subjectId,
            sessionDate: session.sessionDate,
            dateStr: toLocalDateStr(d),
            time: timeStr,
            startTimeMinutes: d.getHours() * 60 + d.getMinutes(),
            code,
            name,
            room,
          });
        });

        // Tự động chuyển tuần hiển thị về tuần gần nhất có buổi học nếu tuần hiện tại không có dữ liệu
        const todayMonday = getMondayOfDate(new Date());
        const hasSessionThisWeek = validSessions.some((s) => {
          const m = getMondayOfDate(new Date(s.sessionDate));
          return m.getTime() === todayMonday.getTime();
        });

        if (!hasSessionThisWeek && validSessions.length > 0) {
          // Tìm buổi học gần với ngày hiện tại nhất
          const nowMs = Date.now();
          let closest = validSessions[0];
          let minDiff = Math.abs(new Date(closest.sessionDate).getTime() - nowMs);

          validSessions.forEach((s) => {
            const diff = Math.abs(new Date(s.sessionDate).getTime() - nowMs);
            if (diff < minDiff) {
              minDiff = diff;
              closest = s;
            }
          });

          setSelectedMonday(getMondayOfDate(new Date(closest.sessionDate)));
        }

        setAllSessions(validSessions);

        const seenTba = new Set();
        const uniqueTba = [];
        rawTba.forEach((s) => {
          const key = `${s.code}|${s.name}|${s.room}`;
          if (seenTba.has(key)) return;
          seenTba.add(key);
          uniqueTba.push(s);
        });
        setTbaSessions(uniqueTba);
      } catch (err) {
        console.error("Lỗi khi tải lịch học:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [tr]);

  // Danh sách 7 ngày trong tuần được chọn (Thứ 2 đến Chủ nhật)
  const weekDays = useMemo(() => {
    const daysConfig = [
      { day: "Thứ 2", offset: 0 },
      { day: "Thứ 3", offset: 1 },
      { day: "Thứ 4", offset: 2 },
      { day: "Thứ 5", offset: 3 },
      { day: "Thứ 6", offset: 4 },
      { day: "Thứ 7", offset: 5 },
      { day: "Chủ Nhật", offset: 6 },
    ];

    const todayStr = toLocalDateStr(new Date());

    return daysConfig.map(({ day, offset }) => {
      const d = new Date(selectedMonday);
      d.setDate(selectedMonday.getDate() + offset);
      const dateStr = toLocalDateStr(d);
      const displayDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const isToday = dateStr === todayStr;

      // Lọc các buổi học có ngày diễn ra thực tế trùng với ngày này
      const daySessions = allSessions.filter((s) => {
        if (s.dateStr !== dateStr) return false;
        if (selectedClassFilter && String(s.classId) !== String(selectedClassFilter)) return false;
        return true;
      });

      // Sắp xếp thứ tự buổi theo giờ bắt đầu
      daySessions.sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);

      // Loại bỏ thẻ trùng lặp hoàn toàn
      const seen = new Set();
      const uniqueSessions = daySessions.filter((s) => {
        const key = `${s.time}|${s.code}|${s.name}|${s.room}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Phát hiện xung đột ca dạy (nếu 2 buổi khác lớp hoặc khác môn có cùng giờ bắt đầu)
      const sessionsWithConflict = uniqueSessions.map((session, sIdx) => {
        const hasConflict = uniqueSessions.some((other, oIdx) => {
          if (sIdx === oIdx) return false;
          return Math.abs(session.startTimeMinutes - other.startTimeMinutes) < 110;
        });
        return {
          ...session,
          hasConflict,
        };
      });

      return {
        day,
        dateStr,
        displayDate,
        isToday,
        sessions: sessionsWithConflict,
      };
    });
  }, [selectedMonday, allSessions, selectedClassFilter]);

  const sunday = useMemo(() => {
    const d = new Date(selectedMonday);
    d.setDate(selectedMonday.getDate() + 6);
    return d;
  }, [selectedMonday]);

  const weekRangeLabel = useMemo(() => {
    const startStr = `${String(selectedMonday.getDate()).padStart(2, "0")}/${String(selectedMonday.getMonth() + 1).padStart(2, "0")}/${selectedMonday.getFullYear()}`;
    const endStr = `${String(sunday.getDate()).padStart(2, "0")}/${String(sunday.getMonth() + 1).padStart(2, "0")}/${sunday.getFullYear()}`;
    return `${startStr} — ${endStr}`;
  }, [selectedMonday, sunday]);

  const isCurrentWeek = useMemo(() => {
    const nowMonday = getMondayOfDate(new Date());
    return selectedMonday.getTime() === nowMonday.getTime();
  }, [selectedMonday]);

  const hasAnyConflictThisWeek = useMemo(() => {
    return weekDays.some((d) => d.sessions.some((s) => s.hasConflict));
  }, [weekDays]);

  const handlePrevWeek = () => {
    setSelectedMonday((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setSelectedMonday((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleThisWeek = () => {
    setSelectedMonday(getMondayOfDate(new Date()));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Content Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>{tr("Lịch giảng dạy trong tuần")}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr("Lịch trình giảng dạy chi tiết của giảng viên theo từng ngày trong tuần.")}
          </p>
        </div>
      </section>

      {/* Schedule Calendar View */}
      <div className="dashboard-panel">
        <div
          className="panel-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
            paddingBottom: "16px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", color: "#002147", fontWeight: 700 }}>
              {tr("Lịch biểu Tuần học")}
            </h2>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px", fontWeight: 600 }}>
              🗓️ {weekRangeLabel}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {myClassesList.length > 0 && (
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  color: "#002147",
                  fontWeight: 600,
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                <option value="">{tr("Tất cả lớp học")}</option>
                {myClassesList.map((c) => (
                  <option key={c.classId} value={String(c.classId)}>
                    {c.classCode} - {c.className}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handlePrevWeek}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#002147",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              ◀ {tr("Tuần trước")}
            </button>

            <button
              type="button"
              onClick={handleThisWeek}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: isCurrentWeek ? "1px solid #c5a059" : "1px solid #cbd5e1",
                background: isCurrentWeek ? "#c5a059" : "#f1f5f9",
                color: isCurrentWeek ? "#fff" : "#002147",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {tr("Tuần này")}
            </button>

            <button
              type="button"
              onClick={handleNextWeek}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#002147",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {tr("Tuần sau")} ▶
            </button>
          </div>
        </div>

        {/* Cảnh báo xung đột lịch ca dạy nếu có 2 lớp học cùng giờ */}
        {hasAnyConflictThisWeek && !selectedClassFilter && (
          <div
            style={{
              padding: "10px 16px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: "8px",
              color: "#be123c",
              fontSize: "12px",
              fontWeight: "600",
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>⚠️</span>
            <span>
              {tr("Phát hiện lịch dạy của nhiều lớp bị trùng khung giờ trong tuần này. Bạn có thể sử dụng bộ lọc")} <strong>"{tr("Tất cả lớp học")}"</strong> {tr("ở trên để chọn xem từng lớp riêng biệt.")}
            </span>
          </div>
        )}

        {/* Weekly Grid */}
        <div className="schedule-weekly-grid" style={{ marginTop: "16px" }}>
          {weekDays.map((dayData) => (
            <div
              key={dayData.day}
              className={`day-column${dayData.isToday ? " today-column" : ""}`}
            >
              <div className="day-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 700 }}>{tr(dayData.day)}</span>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      color: dayData.isToday ? "#c5a059" : "#64748b",
                      fontWeight: 600,
                    }}
                  >
                    {dayData.displayDate}
                  </span>
                </div>
                {dayData.sessions.length > 0 && <span className="dot-indicator" />}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", flexGrow: 1, marginTop: "8px" }}>
                {loading ? (
                  <div className="no-classes-text">{tr("Đang tải...")}</div>
                ) : dayData.sessions.length === 0 ? (
                  <div className="no-classes-text">{tr("Không có giờ dạy")}</div>
                ) : (
                  dayData.sessions.map((session, sIdx) => (
                    <div
                      key={sIdx}
                      className="session-schedule-card"
                      style={{
                        borderLeft: session.hasConflict ? "3px solid #ef4444" : "1px solid #e2e8f0",
                        background: session.hasConflict ? "#fffbfb" : "#ffffff",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="session-time">{session.time}</span>
                        {session.hasConflict && (
                          <span
                            style={{
                              background: "#fee2e2",
                              color: "#b91c1c",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              fontSize: "10px",
                              fontWeight: "700",
                            }}
                          >
                            ⚠️ {tr("Trùng ca")}
                          </span>
                        )}
                      </div>
                      <span className="session-title">{tr(session.name)}</span>
                      <span className="session-code">{session.code}</span>
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
          ))}
        </div>
      </div>

      {/* Buổi học chưa xếp lịch (SessionDate null → TBA) */}
      {tbaSessions.length > 0 && (
        <div className="dashboard-panel" style={{ padding: "20px" }}>
          <div className="panel-header">
            <h2>{tr("Buổi học chưa xếp lịch (TBA)")}</h2>
            <div className="panel-action">
              {tbaSessions.length} {tr("buổi")}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
            {tbaSessions.map((session, sIdx) => (
              <div
                key={sIdx}
                className="session-schedule-card"
                style={{ borderLeft: "4px solid #c5a059" }}
              >
                <span className="session-time" style={{ color: "#c5a059", fontWeight: 800 }}>
                  TBA
                </span>
                <span className="session-title">{tr(session.name)}</span>
                <span className="session-code">{session.code}</span>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorSchedule;
