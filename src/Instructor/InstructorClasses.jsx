import { useState, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "../utils/api";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";
import "./instructor.scss";

const InstructorClasses = () => {
  const { tr } = useLanguage();
  const toast = useToast();
  const [classesData, setClassesData] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tất cả");

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [courseKey, setCourseKey] = useState("");
  const [hasScheduleOnly, setHasScheduleOnly] = useState(false);

  // Sessions list for selected class
  const [sessions, setSessions] = useState([]);
  const [sessionSearch, setSessionSearch] = useState("");
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    classId: "",
    subjectId: "",
    sessionTitle: "",
    sessionDate: "",
    location: "",
    assessmentId: "",
    practicalChecklistId: "",
  });
  const [assessmentsList, setAssessmentsList] = useState([]);
  const [practicalChecklistsList, setPracticalChecklistsList] = useState([]);
  const [sessionError, setSessionError] = useState("");
  const [submittingSession, setSubmittingSession] = useState(false);
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedSubjectDescription, setSelectedSubjectDescription] =
    useState("");

  // Load all assigned classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const [apiClasses, apiCourses, apiSubjects, apiAssessments, apiPracticalChecklists] =
          await Promise.all([
            api.get("/classes").catch(() => []),
            api.get("/courses").catch(() => []),
            api.get("/subjects").catch(() => []),
            api
              .get("/Assessments")
              .catch(() => api.get("/assessments").catch(() => [])),
            api
              .get("/PracticalChecklists")
              .catch(() => api.get("/practicalchecklists").catch(() => [])),
          ]);

        setSubjectsList(Array.isArray(apiSubjects) ? apiSubjects : []);
        setAssessmentsList(Array.isArray(apiAssessments) ? apiAssessments : []);
        setPracticalChecklistsList(
          Array.isArray(apiPracticalChecklists) ? apiPracticalChecklists : [],
        );

        const mapped = apiClasses.map((cls, idx) => {
          const course = apiCourses.find((c) => c.courseId === cls.courseId);
          return {
            classId: cls.classId,
            stt: String(idx + 1).padStart(2, "0"),
            code: cls.classCode || `CL-${cls.classId}`,
            name: cls.className || tr("Lớp đào tạo"),
            subName: course ? course.courseName : tr("Chuyên đề huấn luyện"),
            courseKey: course ? String(course.courseId) : "N/A",
            schedule: cls.schedule || tr("Chưa sắp lịch"),
            time: cls.time || "08:00 - 11:30",
            studentsCount: "0/0",
            status: cls.status || tr("Đang diễn ra"),
            subjectId: cls.subjectId || 1,
          };
        });
        setClassesData(mapped);
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp học:", err);
      }
    };
    fetchClasses();
  }, []);

  const loadSessions = useCallback(async () => {
    if (!selectedClass) return;
    try {
      const apiSessions = await api.get("/sessions").catch(() => []);
      const filtered = apiSessions.filter(
        (s) => s.classId === selectedClass.classId,
      );

      const mapped = filtered.map((s, idx) => {
        const rawDate = s.sessionDate;
        // SessionDate có thể null (buổi nháp chưa xếp lịch) → hiển thị TBA
        let dateStr = "TBA";
        if (rawDate) {
          const d = new Date(rawDate);
          dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        }

        return {
          sessionId: s.sessionId,
          stt: String(idx + 1).padStart(2, "0"),
          date: dateStr,
          name: s.sessionTitle || tr("Buổi học"),
          room: s.location || tr("Phòng học"),
          instructor: "Nguyễn Văn A",
          attendanceCount: s.isConfirmed ? tr("Đã chốt") : tr("Chưa chốt"),
          isConfirmed: s.isConfirmed || false,
          rate: 100,
          sessionDateValue: s.sessionDate || "",
          subjectId: s.subjectId || selectedClass.subjectId || 1,
          classId: s.classId || selectedClass.classId,
          assessmentId: s.assessmentId != null ? Number(s.assessmentId) : null,
          isAssessmentRequired: !!s.isAssessmentRequired,
          isChecklistRequired: !!s.isChecklistRequired,
          practicalChecklistId:
            s.practicalChecklistId != null
              ? Number(s.practicalChecklistId)
              : null,
        };
      });
      setSessions(mapped);
    } catch (err) {
      console.error("Lỗi khi tải danh sách buổi học:", err);
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    const timer = window.setTimeout(() => {
      void loadSessions();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [selectedClass, loadSessions]);

  // Compute list stats
  const stats = useMemo(() => {
    const ongoing = classesData.filter(
      (c) => c.status === "Đang diễn ra",
    ).length;
    const upcoming = classesData.filter((c) => c.status === "Sắp tới").length;
    const completed = classesData.filter(
      (c) => c.status === "Hoàn thành",
    ).length;
    return { ongoing, upcoming, completed };
  }, [classesData]);

  // Filter classes
  const filteredClasses = useMemo(() => {
    return classesData.filter((cls) => {
      const matchesSearch =
        cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.subName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "Tất cả" || cls.status === statusFilter;
      const matchesCourse = !courseKey || cls.courseKey === courseKey;
      const matchesSchedule =
        !hasScheduleOnly || cls.schedule !== "Chưa sắp lịch";

      return matchesSearch && matchesStatus && matchesCourse && matchesSchedule;
    });
  }, [classesData, searchTerm, statusFilter, courseKey, hasScheduleOnly]);

  const classesPager = usePagination(filteredClasses, {
    pageSize: 10,
    resetKey: `${searchTerm}|${statusFilter}|${courseKey}|${hasScheduleOnly}`,
  });

  // Filter sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(
      (s) =>
        s.name.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.instructor.toLowerCase().includes(sessionSearch.toLowerCase()) ||
        s.room.toLowerCase().includes(sessionSearch.toLowerCase()),
    );
  }, [sessions, sessionSearch]);

  const sessionPager = usePagination(filteredSessions, {
    pageSize: 10,
    resetKey: sessionSearch,
  });

  // Assessments for the selected subject that are not already signed to another session.
  // While editing, keep the currently assigned assessment selectable.
  const availableAssessments = useMemo(() => {
    const subjectId = Number(sessionForm.subjectId);
    const selectedSubjectId = Number(selectedClass?.subjectId || 1);
    const usedAssessmentIds = new Set(
      sessions
        .filter(
          (s) =>
            s.assessmentId != null &&
            s.sessionId !== editingSessionId,
        )
        .map((s) => Number(s.assessmentId)),
    );
    return (assessmentsList || []).filter((a) => {
      const aSubject = Number(a.subjectId);
      const matchesSubject =
        subjectId > 0 ? aSubject === subjectId : aSubject === selectedSubjectId;
      return matchesSubject && !usedAssessmentIds.has(Number(a.assessmentId));
    });
  }, [assessmentsList, sessions, sessionForm.subjectId, selectedClass, editingSessionId]);

  // Practical checklists scoped to the selected subject
  const subjectPracticalChecklists = useMemo(() => {
    const subjectId = Number(sessionForm.subjectId);
    const selectedSubjectId = Number(selectedClass?.subjectId || 1);
    return (practicalChecklistsList || []).filter((pc) => {
      const pcSubject = Number(pc.subjectId);
      return subjectId > 0
        ? pcSubject === subjectId
        : pcSubject === selectedSubjectId;
    });
  }, [practicalChecklistsList, sessionForm.subjectId, selectedClass]);

  // Lưu ý: BE đã KHÓA API tạo buổi học (Create Session) — Giảng viên chỉ được UPDATE các khung buổi
  // do hệ thống tự sinh khi tạo Lớp (auto-provision theo RequiredSessions). Nút "+ Tạo buổi học" đã bị xóa.
  const openEditSessionModal = (session) => {
    setEditingSessionId(session.sessionId);
    setSessionError("");
    const selectedSubject =
      subjectsList.find(
        (subject) =>
          subject.subjectId ===
          (session.subjectId || selectedClass?.subjectId || 1),
      ) || subjectsList[0];
    setSessionForm({
      classId: session.classId || selectedClass?.classId || "",
      subjectId: selectedSubject?.subjectId || 1,
      sessionTitle: session.name,
      sessionDate: session.sessionDateValue || new Date().toISOString(),
      location: session.room,
      assessmentId:
        session.assessmentId != null ? String(session.assessmentId) : "",
      practicalChecklistId:
        session.practicalChecklistId != null
          ? String(session.practicalChecklistId)
          : "",
    });
    setSelectedSubjectDescription(selectedSubject?.description || "");
    setShowSessionModal(true);
  };

  const handleSessionFormChange = (field, value) => {
    setSessionForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "subjectId"
        ? { assessmentId: "", practicalChecklistId: "" }
        : {}),
    }));
    if (field === "subjectId") {
      const selectedSubject = subjectsList.find(
        (subject) => subject.subjectId === Number(value),
      );
      setSelectedSubjectDescription(selectedSubject?.description || "");
    }
  };

  const handleSubmitSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.sessionTitle.trim() || !sessionForm.location.trim()) {
      setSessionError(tr("Vui lòng nhập đầy đủ tên buổi học và phòng học."));
      return;
    }

    // SessionDate hiển thị trống (TBA) khi chưa xếp lịch — nhưng UpdateSessionRequest của BE
    // vẫn bắt buộc SessionDate (DateTime không nullable), nên phải chọn ngày trước khi lưu.
    if (!sessionForm.sessionDate) {
      setSessionError(tr("Vui lòng chọn Ngày học trước khi lưu buổi học (buổi nháp hiển thị TBA cho đến khi có ngày)."));
      return;
    }

    setSubmittingSession(true);
    setSessionError("");

    try {
      const payload = {
        sessionTitle: sessionForm.sessionTitle.trim(),
        sessionDate: sessionForm.sessionDate,
        location: sessionForm.location.trim(),
        assessmentId: sessionForm.assessmentId
          ? Number(sessionForm.assessmentId)
          : null,
        isAssessmentRequired: !!sessionForm.assessmentId,
        isChecklistRequired: !!sessionForm.practicalChecklistId,
        practicalChecklistId: sessionForm.practicalChecklistId
          ? Number(sessionForm.practicalChecklistId)
          : null,
      };

      // Chỉ cho phép UPDATE (BE đã khóa tạo buổi học mới)
      if (editingSessionId) {
        await api.put(`/sessions/${editingSessionId}`, payload);
      } else {
        setSessionError(tr("Không thể tạo buổi học mới — hệ thống tự sinh buổi học khi tạo Lớp."));
        return;
      }

      await loadSessions();
      setShowSessionModal(false);
      setEditingSessionId(null);
    } catch (err) {
      console.error("Lỗi khi lưu buổi học:", err);
      setSessionError(err.message || tr("Không thể lưu buổi học."));
    } finally {
      setSubmittingSession(false);
    }
  };

  // Xóa buổi học qua ConfirmModal (thay window.confirm)
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState(null);

  const handleConfirmDeleteSession = async () => {
    if (!confirmDeleteSessionId) return;
    try {
      await api.delete(`/sessions/${confirmDeleteSessionId}`);
      toast.success(tr("Xóa thành công"));
      await loadSessions();
    } catch (err) {
      console.error("Lỗi khi xóa buổi học:", err);
      toast.error(tr("Xóa buổi học thất bại"));
    } finally {
      setConfirmDeleteSessionId(null);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Đang diễn ra":
        return {
          bg: "rgba(34, 197, 94, 0.08)",
          color: "#16a34a",
          border: "rgba(34, 197, 94, 0.2)",
          dot: "#22c55e",
        };
      case "Sắp tới":
        return {
          bg: "rgba(59, 130, 246, 0.08)",
          color: "#2563eb",
          border: "rgba(59, 130, 246, 0.2)",
          dot: "#3b82f6",
        };
      case "Hoàn thành":
        return {
          bg: "rgba(0, 33, 71, 0.04)",
          color: "rgba(0, 33, 71, 0.5)",
          border: "rgba(0, 33, 71, 0.08)",
          dot: "#94a3b8",
        };
      default:
        return {
          bg: "#f8fafc",
          color: "#64748b",
          border: "#e2e8f0",
          dot: "#94a3b8",
        };
    }
  };

  // Class Detail View (Session List Explorer)
  if (selectedClass) {
    const s = getStatusStyle(selectedClass.status);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Breadcrumb */}
        <nav className="breadcrumb-nav">
          <span
            className="breadcrumb-item"
            onClick={() => setSelectedClass(null)}
            style={{ cursor: "pointer" }}
          >
            {tr('LỚP CỦA TÔI')}
          </span>
          <svg width="4" height="6" viewBox="0 0 4 6" fill="none">
            <path
              d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z"
              fill="currentColor"
            />
          </svg>
          <span className="breadcrumb-item active">{selectedClass.code}</span>
        </nav>

        {/* Page Header */}
        <section className="content-header">
          <div className="header-left">
            <h1>{selectedClass.name}</h1>
            <div className="divider-gold" />
            <p className="header-description">
              {selectedClass.subName} · {tr('Mã lớp: ')}{selectedClass.code}
            </p>
          </div>
          <div>
            <span
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                fontSize: "10px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                backgroundColor: s.bg,
                color: s.color,
                border: `1px solid ${s.border}`,
              }}
            >
              {selectedClass.status}
            </span>
          </div>
        </section>

        {/* Class Info Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            { label: tr("Lịch học"), value: selectedClass.schedule },
            { label: tr("Thời gian"), value: selectedClass.time || "—" },
            { label: tr("Sĩ số"), value: selectedClass.studentsCount },
            { label: tr("Khóa học"), value: `K${selectedClass.courseKey}` },
          ].map((info) => (
            <div
              key={info.label}
              className="stat-card"
              style={{ padding: "16px" }}
            >
              <div className="stat-header">
                <span className="stat-label">{info.label}</span>
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#002147",
                }}
              >
                {info.value}
              </div>
            </div>
          ))}
        </div>

        {/* Sessions Table */}
        <section className="table-card">
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e0e4e8",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#002147",
                  margin: 0,
                }}
              >
                {tr('Danh sách buổi học')}
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(0,33,71,0.5)",
                  margin: "4px 0 0",
                }}
              >
                {sessions.length}{tr(' buổi đã tạo')}
              </p>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder={tr('Tìm buổi học...')}
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  style={{
                    padding: "10px 14px 10px 36px",
                    borderRadius: "12px",
                    border: "1px solid #d9e1ec",
                    fontSize: "13px",
                    color: "#17314f",
                    outline: "none",
                    width: "240px",
                    background:
                      "linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)",
                  }}
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 18 18"
                  fill="none"
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    opacity: 0.4,
                  }}
                >
                  <path
                    d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Sessions List Header & Rows */}
          <div style={{ overflowX: "auto", width: "100%" }}>
            <div
              className="table-header"
              style={{
                display: "grid",
                gridTemplateColumns: "60px 100px 1fr 1fr 1fr 120px 120px",
                alignItems: "center",
                gap: "12px",
                background: "linear-gradient(135deg, #06234a 0%, #041b39 100%)",
                color: "#ffffff",
                padding: "14px 20px",
                fontSize: "11px",
                fontWeight: "700",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                minWidth: "780px",
              }}
            >
              <div style={{ textAlign: "center" }}>{tr('STT')}</div>
              <div>{tr('Ngày học')}</div>
              <div>{tr('Tên buổi học')}</div>
              <div>{tr('Phòng học')}</div>
              <div>{tr('Giảng viên')}</div>
              <div style={{ textAlign: "center" }}>{tr('Trạng thái')}</div>
              <div style={{ textAlign: "right" }}>{tr('Thao tác')}</div>
            </div>

            <div className="table-body" style={{ minWidth: "780px" }}>
              {sessionPager.pageItems.map((session) => (
                <div
                  key={session.sessionId}
                  className="table-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 100px 1fr 1fr 1fr 120px 120px",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 20px",
                    borderTop: "1px solid #e0e4e8",
                    cursor: "default",
                  }}
                >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "rgba(0,33,71,0.4)",
                    textAlign: "center",
                  }}
                >
                  {session.stt}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#002147",
                  }}
                >
                  {session.date}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#002147",
                  }}
                >
                  {session.name}
                </span>
                <span style={{ fontSize: "12px", color: "rgba(0,33,71,0.6)" }}>
                  {session.room}
                </span>
                <span style={{ fontSize: "12px", color: "rgba(0,33,71,0.6)" }}>
                  {session.instructor}
                </span>
                <div style={{ textAlign: "center" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      backgroundColor: session.isConfirmed
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(34, 197, 94, 0.08)",
                      color: session.isConfirmed ? "#ef4444" : "#16a34a",
                    }}
                  >
                    {session.attendanceCount}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                  }}
                >
                  <button
                    onClick={() => openEditSessionModal(session)}
                    type="button"
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      border: "1px solid #d9e1ec",
                      backgroundColor: "#ffffff",
                      color: "#002147",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "700",
                    }}
                  >
                    {tr('Sửa')}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteSessionId(session.sessionId)}
                    type="button"
                    style={{
                      padding: "6px 10px",
                      borderRadius: "8px",
                      border: "1px solid #fecaca",
                      backgroundColor: "#fff1f2",
                      color: "#b91c1c",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "700",
                    }}
                  >
                    {tr('Xóa')}
                  </button>
                </div>
              </div>
            ))}
            </div>
          </div>

          {/* Footer */}
          <div className="table-footer">
            <Pagination
              page={sessionPager.page}
              pageCount={sessionPager.pageCount}
              onChange={sessionPager.setPage}
              total={sessionPager.total}
              pageSize={10}
            />
          </div>
        </section>

        {showSessionModal && createPortal(
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100vh",
              backgroundColor: "rgba(0, 33, 71, 0.75)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 999999,
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "480px",
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 12px 40px rgba(0,0,0,0.16)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "#002147",
                    margin: 0,
                  }}
                >
                  {tr("Cập nhật buổi học")}
                </h3>
                <button
                  onClick={() => setShowSessionModal(false)}
                  type="button"
                  style={{
                    border: "none",
                    background: "transparent",
                    fontSize: "20px",
                    cursor: "pointer",
                    color: "#64748b",
                  }}
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleSubmitSession}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.55)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr('Tên buổi học')}
                  </label>
                  <input
                    value={sessionForm.sessionTitle}
                    onChange={(e) =>
                      handleSessionFormChange("sessionTitle", e.target.value)
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d9e1ec",
                      fontSize: "13px",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.55)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr('Phòng học')}
                  </label>
                  <input
                    value={sessionForm.location}
                    onChange={(e) =>
                      handleSessionFormChange("location", e.target.value)
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d9e1ec",
                      fontSize: "13px",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.55)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr('Ngày học')} {tr('(trống = TBA — bắt buộc chọn trước khi lưu)')}
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      sessionForm.sessionDate
                        ? sessionForm.sessionDate.slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      handleSessionFormChange(
                        "sessionDate",
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : "",
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d9e1ec",
                      fontSize: "13px",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.55)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr('Tên môn học')}
                  </label>
                  <select
                    value={sessionForm.subjectId}
                    onChange={(e) =>
                      handleSessionFormChange("subjectId", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d9e1ec",
                      fontSize: "13px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    {subjectsList.map((subject) => (
                      <option key={subject.subjectId} value={subject.subjectId}>
                        {subject.subjectName} ({subject.subjectCode})
                      </option>
                    ))}
                  </select>
                  {selectedSubjectDescription && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        color: "rgba(0,33,71,0.7)",
                        fontSize: "12px",
                      }}
                    >
                      <strong style={{ color: "#002147" }}>{tr('Mô tả:')}</strong>{" "}
                      {selectedSubjectDescription}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.55)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr('Assessment (tùy chọn)')}
                  </label>
                  <select
                    value={sessionForm.assessmentId}
                    onChange={(e) =>
                      handleSessionFormChange("assessmentId", e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d9e1ec",
                      fontSize: "13px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="">{tr('Không chọn assessment')}</option>
                    {availableAssessments.map((assessment) => (
                      <option
                        key={assessment.assessmentId}
                        value={assessment.assessmentId}
                      >
                        {assessment.componentName ||
                          assessment.assessmentName ||
                          assessment.name ||
                          `Assessment ${assessment.assessmentId}`}
                        {assessment.assessmentType
                          ? ` (${assessment.assessmentType})`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {availableAssessments.length === 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        color: "rgba(0,33,71,0.6)",
                        fontSize: "12px",
                      }}
                    >
                      {tr('Không có assessment chưa được chọn cho môn này.')}
                    </div>
                  )}
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "rgba(0,33,71,0.55)",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    {tr('Danh sách kiểm tra thực hành (Practical Checklist)')}
                  </label>
                  <select
                    value={sessionForm.practicalChecklistId}
                    onChange={(e) =>
                      handleSessionFormChange(
                        "practicalChecklistId",
                        e.target.value,
                      )
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: "1px solid #d9e1ec",
                      fontSize: "13px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <option value="">
                      {tr('Không yêu cầu kiểm tra thực hành')}
                    </option>
                    {subjectPracticalChecklists.map((pc) => (
                      <option
                        key={pc.practicalChecklistId}
                        value={pc.practicalChecklistId}
                      >
                        {pc.itemName ||
                          pc.name ||
                          `Practical Checklist ${pc.practicalChecklistId}`}
                      </option>
                    ))}
                  </select>
                  {subjectPracticalChecklists.length === 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        backgroundColor: "#f8fafc",
                        color: "rgba(0,33,71,0.6)",
                        fontSize: "12px",
                      }}
                    >
                      {tr('Chưa có mục thực hành cho môn này.')}
                    </div>
                  )}
                </div>

                {sessionError && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      backgroundColor: "#fef2f2",
                      color: "#b91c1c",
                      fontSize: "12px",
                    }}
                  >
                    {sessionError}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowSessionModal(false)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "1px solid #d9e1ec",
                      backgroundColor: "#ffffff",
                      color: "#002147",
                      cursor: "pointer",
                      fontWeight: "700",
                    }}
                  >
                    {tr('Hủy')}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSession}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "none",
                      backgroundColor: "#c5a059",
                      color: "#ffffff",
                      cursor: "pointer",
                      fontWeight: "700",
                    }}
                  >
                    {submittingSession
                      ? tr("Đang lưu...")
                      : editingSessionId
                        ? tr("Cập nhật")
                        : tr("Tạo mới")}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* Xác nhận xóa buổi học (view chi tiết lớp) */}
        <ConfirmModal
          isOpen={!!confirmDeleteSessionId}
          onClose={() => setConfirmDeleteSessionId(null)}
          onConfirm={handleConfirmDeleteSession}
          title={tr("Xóa buổi học")}
          message={tr("Bạn có chắc chắn muốn xóa buổi học này?")}
          confirmText="XÓA"
          cancelText="HỦY BỎ"
          confirmVariant="danger"
          bodyMessage={tr("Lịch sử điểm danh của buổi học này cũng sẽ bị xóa theo.")}
        />

        {/* Toast notifications (view chi tiết lớp) */}
        <toast.ToastContainer />
      </div>
    );
  }

  // DEFAULT CLASS LIST PAGE
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Content Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>{tr('Lớp học được phân công')}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr('Danh sách các lớp huấn luyện hàng không mà bạn được phân công giảng dạy.')}
          </p>
        </div>
      </section>

      {/* Stats Row */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">{tr('Đang diễn ra')}</span>
            <div
              className="stat-icon"
              style={{
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                color: "#22c55e",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
          </div>
          <div className="stat-value">
            {stats.ongoing.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">{tr('Sắp tới')}</span>
            <div
              className="stat-icon"
              style={{
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                color: "#3b82f6",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
          </div>
          <div className="stat-value">
            {stats.upcoming.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">{tr('Hoàn thành')}</span>
            <div
              className="stat-icon"
              style={{
                backgroundColor: "rgba(0,33,71,0.05)",
                color: "rgba(0,33,71,0.4)",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          </div>
          <div className="stat-value">
            {(stats.completed + 15).toString().padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          padding: "16px 20px",
          background: "#ffffff",
          border: "1px solid #dfe6f1",
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,33,71,0.04)",
        }}
      >
        <div
          style={{ position: "relative", flex: "1 1 280px", maxWidth: "400px" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 18 18"
            fill="none"
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.4,
            }}
          >
            <path
              d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z"
              fill="currentColor"
            />
          </svg>
          <input
            type="text"
            placeholder={tr('Tìm lớp theo mã hoặc tên...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 42px",
              borderRadius: "12px",
              border: "1px solid #d9e1ec",
              fontSize: "13px",
              color: "#17314f",
              outline: "none",
              background: "linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "4px",
              background: "#f1f5f9",
              padding: "4px",
              borderRadius: "999px",
            }}
          >
            {["Tất cả", "Đang diễn ra", "Sắp tới", "Hoàn thành"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                type="button"
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  fontWeight: "700",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  ...(statusFilter === f
                    ? {
                        backgroundColor: "#002147",
                        color: "#d4af37",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                      }
                    : {
                        backgroundColor: "transparent",
                        color: "rgba(0,33,71,0.6)",
                      }),
                }}
              >
                {tr(f)}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: "700",
              border: "1px solid #dfe6f1",
              cursor: "pointer",
              transition: "all 0.15s",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              ...(showAdvanced || courseKey || hasScheduleOnly
                ? {
                    backgroundColor: "#002147",
                    borderColor: "#002147",
                    color: "#d4af37",
                  }
                : {
                    backgroundColor: "transparent",
                    color: "rgba(0,33,71,0.6)",
                  }),
            }}
          >
            <svg
              width={12}
              height={8}
              viewBox="0 0 15 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.83333 10V8.33333H9.16667V10H5.83333ZM2.5 5.83333V4.16667H12.5V5.83333H2.5ZM0 1.66667V0H15V1.66667H0Z"
                fill="currentColor"
              />
            </svg>
            {tr('Bộ lọc nâng cao')}
          </button>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showAdvanced && (
        <div
          className="dashboard-panel"
          style={{
            padding: "20px",
            borderRadius: "16px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <div
            className="flex flex-col gap-1.5"
            style={{ display: "flex", flexDirection: "column", gap: "6px" }}
          >
            <label
              style={{
                fontSize: "10px",
                fontWeight: "700",
                color: "rgba(0,33,71,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {tr('Chọn Khóa Học')}
            </label>
            <select
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #d9e1ec",
                fontSize: "12px",
                fontWeight: "700",
                color: "#002147",
                outline: "none",
              }}
              value={courseKey}
              onChange={(e) => setCourseKey(e.target.value)}
            >
              <option value="">{tr('Tất cả các khóa')}</option>
              <option value="22">{tr('Khóa 22')}</option>
              <option value="24">{tr('Khóa 24')}</option>
              <option value="25">{tr('Khóa 25')}</option>
              <option value="26">{tr('Khóa 26')}</option>
            </select>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              paddingTop: "20px",
            }}
          >
            <input
              type="checkbox"
              id="hasScheduleOnly"
              style={{
                width: "14px",
                height: "14px",
                accentColor: "#c5a059",
                cursor: "pointer",
              }}
              checked={hasScheduleOnly}
              onChange={(e) => setHasScheduleOnly(e.target.checked)}
            />
            <label
              htmlFor="hasScheduleOnly"
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "rgba(0,33,71,0.6)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              {tr('Chỉ hiển thị lớp đã sắp xếp lịch dạy')}
            </label>
          </div>
        </div>
      )}

      {/* Class List Table */}
      <section className="table-card">
        <div style={{ overflowX: "auto", width: "100%" }}>
          <div
            className="table-header"
            style={{
              display: "grid",
              gridTemplateColumns: "60px 120px 1fr 100px 150px 100px 140px 160px",
              alignItems: "center",
              gap: "12px",
              background: "linear-gradient(135deg, #06234a 0%, #041b39 100%)",
              color: "#ffffff",
              padding: "12px 20px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              minWidth: "900px",
            }}
          >
            <div style={{ textAlign: "center" }}>{tr('STT')}</div>
            <div>{tr('Mã lớp')}</div>
            <div>{tr('Tên khóa học / chuyên đề')}</div>
            <div style={{ textAlign: "center" }}>{tr('Khóa')}</div>
            <div>{tr('Lịch học')}</div>
            <div style={{ textAlign: "center" }}>{tr('Sĩ số')}</div>
            <div>{tr('Trạng thái')}</div>
            <div style={{ textAlign: "right", paddingRight: "24px" }}>
              {tr('Thao tác')}
            </div>
          </div>

          <div className="table-body" style={{ minWidth: "900px" }}>
            {filteredClasses.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "rgba(0,33,71,0.4)",
                  fontStyle: "italic",
                }}
              >
                {tr('Không tìm thấy lớp học nào khớp với bộ lọc hiện tại.')}
              </div>
            ) : (
              classesPager.pageItems.map((cls) => {
                const statusColors = getStatusStyle(cls.status);

                return (
                  <div
                    key={cls.code}
                    className="table-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "60px 120px 1fr 100px 150px 100px 140px 160px",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 20px",
                      cursor: "default",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "rgba(0,33,71,0.4)",
                        textAlign: "center",
                      }}
                    >
                      {cls.stt}
                    </span>
                    <span
                      className="col-id"
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#002147",
                      }}
                    >
                      {cls.code}
                    </span>
                    <div
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedClass(cls)}
                    >
                      <p
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#002147",
                          margin: 0,
                        }}
                      >
                        {cls.name}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "rgba(0,33,71,0.5)",
                          margin: "2px 0 0",
                        }}
                      >
                        {cls.subName}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "rgba(0,33,71,0.7)",
                        textAlign: "center",
                      }}
                    >
                      {tr('Khóa ')}{cls.courseKey}
                    </span>
                    <span style={{ fontSize: "12px", color: "rgba(0,33,71,0.7)" }}>
                      {cls.schedule}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#002147",
                        textAlign: "center",
                      }}
                    >
                      {cls.studentsCount}
                    </span>
                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "5px 12px",
                          borderRadius: "999px",
                          fontSize: "10px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                          backgroundColor: statusColors.bg,
                          color: statusColors.color,
                          border: `1px solid ${statusColors.border}`,
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: statusColors.dot,
                          }}
                        />
                        {cls.status}
                      </span>
                    </div>
                    <div style={{ textAlign: "right", paddingRight: "12px" }}>
                      <button
                        onClick={() => setSelectedClass(cls)}
                        className="ghost-btn"
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontSize: "11px",
                          fontWeight: "700",
                          backgroundColor: "#c5a059",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          transition: "all 0.2s",
                          boxShadow: "0 2px 4px rgba(197, 160, 89, 0.2)",
                        }}
                      >
                        {tr('Xem chi tiết')}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>

        <div className="table-footer">
          <Pagination
            page={classesPager.page}
            pageCount={classesPager.pageCount}
            onChange={classesPager.setPage}
            total={classesPager.total}
            pageSize={10}
          />
        </div>
      </section>

      {/* Xác nhận xóa buổi học */}
      <ConfirmModal
        isOpen={!!confirmDeleteSessionId}
        onClose={() => setConfirmDeleteSessionId(null)}
        onConfirm={handleConfirmDeleteSession}
        title={tr("Xóa buổi học")}
        message={tr("Bạn có chắc chắn muốn xóa buổi học này?")}
        confirmText="XÓA"
        cancelText="HỦY BỎ"
        confirmVariant="danger"
        bodyMessage={tr("Lịch sử điểm danh của buổi học này cũng sẽ bị xóa theo.")}
      />

      {/* Toast notifications */}
      <toast.ToastContainer />
    </div>
  );
};

export default InstructorClasses;
