import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import "./instructor.scss";

const InstructorAssessments = () => {
  const [classesData, setClassesData] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);

  // Grading sheets state
  const [selectedAssessmentType, setSelectedAssessmentType] =
    useState("assessment"); // "assessment" | "practical" | "both"
  const [studentScores, setStudentScores] = useState([]);
  const [editingScores, setEditingScores] = useState([]);
  const [isEditingScores, setIsEditingScores] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Confirm publish modal state
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Toast notifications
  const toast = useToast();

  // Remarks note modal state
  const [assessmentsList, setAssessmentsList] = useState([]);

  const getAssessmentDisplayName = (assessment) => {
    if (!assessment) return "Assessment";
    return (
      (
        assessment.componentName ||
        assessment.assessmentName ||
        assessment.name ||
        assessment.title ||
        assessment.assessmentTitle ||
        assessment.assessmentType ||
        `Assessment ${assessment.assessmentId || ""}`
      )
        .toString()
        .trim() || "Assessment"
    );
  };

  const getSessionAssessmentName = (session) => {
    if (!session) return "Assessment";
    const matchAssessment = assessmentsList.find(
      (assessment) =>
        assessment.subjectId === session.subjectId ||
        assessment.assessmentId === session.assessmentId,
    );
    return getAssessmentDisplayName(matchAssessment || session);
  };

  const getAssessmentTypeLabel = (type = selectedAssessmentType) => {
    switch (type) {
      case "practical":
        return "Practical (Thực hành)";
      case "both":
        return "Assessment + Practical";
      default:
        return "Assessment (Lý thuyết)";
    }
  };

  const getSelectedTypes = (type = selectedAssessmentType) => {
    switch (type) {
      case "practical":
        return ["practical"];
      case "both":
        return ["assessment", "practical"];
      default:
        return ["assessment"];
    }
  };

  // Load all assigned classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        const [apiClasses, apiCourses, apiAssessments] = await Promise.all([
          api.get("/classes").catch(() => []),
          api.get("/courses").catch(() => []),
          api
            .get("/Assessments")
            .catch(() => api.get("/assessments").catch(() => [])),
        ]);

        const mapped = apiClasses.map((cls, idx) => {
          const course = apiCourses.find((c) => c.courseId === cls.courseId);
          return {
            classId: cls.classId,
            stt: String(idx + 1).padStart(2, "0"),
            code: cls.classCode || `CL-${cls.classId}`,
            name: cls.className || "Lớp đào tạo",
            subName: course ? course.courseName : "Chuyên đề huấn luyện",
            courseKey: course ? String(course.courseId) : "N/A",
            schedule: cls.schedule || "Chưa sắp lịch",
            time: cls.time || "08:00 - 11:30",
            status: cls.status || "Đang diễn ra",
            subjectId: cls.subjectId || 1,
          };
        });
        setClassesData(mapped);
        setAssessmentsList(Array.isArray(apiAssessments) ? apiAssessments : []);
        if (mapped.length > 0) {
          setSelectedClassId(mapped[0].classId);
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp học:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  // Fetch sessions when a class is selected
  useEffect(() => {
    if (!selectedClassId) return;
    const fetchSessions = async () => {
      try {
        const apiSessions = await api.get("/sessions").catch(() => []);
        const filtered = apiSessions.filter(
          (s) => s.classId === parseInt(selectedClassId),
        );

        const mapped = filtered.map((s, idx) => {
          const rawDate = s.sessionDate;
          let dateStr = "N/A";
          if (rawDate) {
            const d = new Date(rawDate);
            dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
          }

          return {
            sessionId: s.sessionId,
            stt: String(idx + 1).padStart(2, "0"),
            date: dateStr,
            name: s.sessionTitle || "Buổi học",
            room: s.location || "Phòng học",
            instructor: "Nguyễn Văn A",
            isConfirmed: s.isConfirmed || false,
            subjectId: s.subjectId || 1,
            assessmentId:
              s.assessmentId ??
              s.assessment?.assessmentId ??
              s.sessionAssessmentId ??
              s.assessment?.id ??
              null,
          };
        });
        setSessions(mapped);
      } catch (err) {
        console.error("Lỗi khi tải danh sách buổi học:", err);
      }
    };
    fetchSessions();
  }, [selectedClassId]);

  // Load students of selected class
  const loadStudents = async () => {
    try {
      const [allEnrollments, allProfiles] = await Promise.all([
        api.get("/enrollments").catch(() => []),
        api.get("/userprofiles").catch(() => []),
      ]);

      const classEnrollments = allEnrollments.filter(
        (e) => e.classId === parseInt(selectedClassId),
      );
      const mappedStudents = classEnrollments.map((en) => {
        const profile = allProfiles.find((p) => p.accountId === en.accountId);
        return {
          code: profile
            ? profile.employeeCode || `HV${en.accountId}`
            : `HV${en.accountId}`,
          name: profile ? profile.fullName : "Học viên",
          accountId: en.accountId,
          enrollmentId: en.enrollmentId,
          classStudentId: en.enrollmentId,
        };
      });

      console.log("[InstructorAssessments] loadStudents:", {
        selectedClassId,
        totalEnrollments: allEnrollments.length,
        matchedStudents: mappedStudents.length,
        students: mappedStudents,
      });

      return mappedStudents;
    } catch (err) {
      console.error("Lỗi khi tải danh sách học viên:", err);
      return [];
    }
  };

  // Load all assessment results at once — filter by accountId/assessmentId in caller
  const getAllAssessmentResults = async () => {
    // Backend: GET /api/AssessmentResults
    const result = await api.get("/AssessmentResults").catch(() => []);
    return Array.isArray(result) ? result : [];
  };

  // Load all practical checklist results — filter by subjectResultId in caller
  const getAllPracticalResults = async () => {
    // Backend: GET /api/PracticalChecklistResults
    const result = await api.get("/PracticalChecklistResults").catch(() => []);
    return Array.isArray(result) ? result : [];
  };

  const loadSessionScores = async (session, type = selectedAssessmentType) => {
    console.log("[InstructorAssessments] loadSessionScores start", {
      selectedSession: session,
      selectedAssessmentType: type,
    });
    setLoading(true);
    try {
      const mappedStudents = await loadStudents();
      const scoresData = [];
      const allEtrs = await api.get("/etr").catch(() => []);
      const selectedTypes = getSelectedTypes(type);

      console.log("[InstructorAssessments] loadSessionScores fetched", {
        studentCount: mappedStudents.length,
        etrCount: allEtrs.length,
        selectedTypes,
      });

      // Pre-fetch all assessment results once (instead of per-student)
      const allAssessmentResults = selectedTypes.includes("assessment")
        ? await getAllAssessmentResults()
        : [];

      // Pre-fetch all practical results once (instead of per-student)
      const allPracticalResults = selectedTypes.includes("practical")
        ? await getAllPracticalResults()
        : [];

      // Get the assessmentId and sessionId for this session to filter results correctly
      const sessionAssessmentId = getAssessmentIdForSession(session);
      const currentSessionId = session?.sessionId;

      // Pre-fetch ETR details for all students in parallel (batch)
      const etrDetailsMap = {};
      await Promise.all(
        mappedStudents.map(async (student) => {
          const studentEtr = allEtrs.find(
            (e) =>
              e.accountId === student.accountId ||
              e.enrollmentId === student.enrollmentId,
          );
          if (studentEtr) {
            const details = await api
              .get(`/etr/${studentEtr.etrCourseRecordId}`)
              .catch(() => null);
            if (details) {
              etrDetailsMap[student.accountId] = details;
            }
          }
        }),
      )

      // Build list of students with their scores
      for (const student of mappedStudents) {
        let assessmentScore = 0;
        let assessmentComment = "";
        let assessmentResultId = null;
        let practicalScore = 0;
        let practicalComment = "";
        let practicalResultId = null;
        let subjectResultId = 1;
        let assessmentIsPublished = false;
        let practicalIsPublished = false;

        const etrDetails = etrDetailsMap[student.accountId];
        if (etrDetails && etrDetails.subjectResults) {
          const subRes = etrDetails.subjectResults.find(
            (sr) => sr.subjectId === session.subjectId,
          );
          if (subRes) {
            subjectResultId = subRes.subjectResultId;

            if (selectedTypes.includes("assessment")) {
              // Filter pre-fetched assessment results by accountId, assessmentId, AND sessionId.
              // Fallback: if no session-specific result found, look for legacy records with null sessionId.
              let sessionScore = allAssessmentResults.find(
                (ar) =>
                  ar.accountId === student.accountId &&
                  ar.assessmentId === sessionAssessmentId &&
                  ar.subjectResultId === subRes.subjectResultId &&
                  ar.sessionId === currentSessionId,
              );
              // Fallback: allow legacy records (sessionId == null) to show up
              if (!sessionScore) {
                sessionScore = allAssessmentResults.find(
                  (ar) =>
                    ar.accountId === student.accountId &&
                    ar.assessmentId === sessionAssessmentId &&
                    ar.subjectResultId === subRes.subjectResultId &&
                    ar.sessionId == null,
                );
              }
              if (sessionScore) {
                assessmentScore = sessionScore.score || 0;
                assessmentComment = sessionScore.remark || "";
                assessmentResultId =
                  sessionScore.assessmentResultId ||
                  sessionScore.resultId ||
                  sessionScore.id ||
                  null;
                assessmentIsPublished = sessionScore.isPublished || false;
              }
            }

            if (selectedTypes.includes("practical")) {
              // Filter pre-fetched practical results by subjectResultId AND sessionId
              // Fallback: if no session-specific result found, look for legacy records with null sessionId
              let sessionScore = allPracticalResults.find(
                (pr) =>
                  pr.subjectResultId === subRes.subjectResultId &&
                  pr.sessionId === currentSessionId,
              );
              // Fallback: allow legacy records (sessionId == null) to show up
              if (!sessionScore) {
                sessionScore = allPracticalResults.find(
                  (pr) =>
                    pr.subjectResultId === subRes.subjectResultId &&
                    pr.sessionId == null,
                );
              }
              if (sessionScore) {
                // PracticalChecklistResult now has Score field
                practicalScore = sessionScore.score || 0;
                practicalComment = sessionScore.verificationComment || "";
                practicalResultId =
                  sessionScore.practicalChecklistResultId ||
                  sessionScore.resultId ||
                  sessionScore.id ||
                  null;
                // Published status from API
                practicalIsPublished = sessionScore.isPublished || false;
              }
            }
          }
        }

        const isPublished =
          type === "assessment"
            ? assessmentIsPublished
            : type === "practical"
              ? practicalIsPublished
              : assessmentIsPublished || practicalIsPublished;

        scoresData.push({
          code: student.code,
          name: student.name,
          accountId: student.accountId,
          enrollmentId: student.enrollmentId,
          classStudentId: student.classStudentId,
          subjectResultId,
          assessmentResultId,
          assessmentScore,
          assessmentComment,
          practicalResultId,
          practicalScore,
          practicalComment,
          assessmentIsPublished,
          practicalIsPublished,
          isPublished,
        });
      }

      setStudentScores(scoresData);
    } catch (err) {
      console.error("Lỗi khi tải bảng điểm:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGradingSheet = (session) => {
    setSelectedSession(session);
    setIsEditingScores(false);
    loadSessionScores(session, selectedAssessmentType);
  };

  const handleStartEdit = () => {
    setEditingScores(JSON.parse(JSON.stringify(studentScores)));
    setIsEditingScores(true);
  };

  const getAssessmentIdForSession = (session) => {
    const directId =
      session?.assessmentId ??
      session?.assessment?.assessmentId ??
      session?.sessionAssessmentId ??
      session?.assessment?.id;

    if (directId) {
      return Number(directId);
    }

    const matchAssessment = assessmentsList.find(
      (assessment) =>
        assessment.subjectId === session?.subjectId ||
        assessment.assessmentId === session?.assessmentId,
    );

    return matchAssessment?.assessmentId || session?.assessmentId || 1;
  };

  const handleScoreChange = (enrollmentId, value, field = "assessment") => {
    const scoreVal =
      value === "" ? "" : Math.min(100, Math.max(0, parseFloat(value) || 0));
    setEditingScores((prev) =>
      prev.map((s) => {
        if (s.enrollmentId !== enrollmentId || s.isPublished) {
          return s;
        }
        return field === "practical"
          ? { ...s, practicalScore: scoreVal }
          : { ...s, assessmentScore: scoreVal };
      }),
    );
  };

  const handleCommentChange = (enrollmentId, value, field = "assessment") => {
    setEditingScores((prev) =>
      prev.map((s) => {
        if (s.enrollmentId !== enrollmentId || s.isPublished) {
          return s;
        }
        return field === "practical"
          ? { ...s, practicalComment: value }
          : { ...s, assessmentComment: value };
      }),
    );
  };

  const handleSaveScores = async () => {
    setSaving(true);
    try {
      const changedScores = editingScores.filter((student) => {
        const original = studentScores.find(
          (s) => s.enrollmentId === student.enrollmentId,
        );

        if (student.isPublished || original?.isPublished) {
          return false;
        }

        if (!original) return true;

        if (selectedAssessmentType === "assessment") {
          return (
            student.assessmentScore !== original.assessmentScore ||
            student.assessmentComment !== original.assessmentComment
          );
        }

        if (selectedAssessmentType === "practical") {
          return (
            student.practicalScore !== original.practicalScore ||
            student.practicalComment !== original.practicalComment
          );
        }

        return (
          student.assessmentScore !== original.assessmentScore ||
          student.assessmentComment !== original.assessmentComment ||
          student.practicalScore !== original.practicalScore ||
          student.practicalComment !== original.practicalComment
        );
      });

      if (changedScores.length === 0) {
        setIsEditingScores(false);
        setSaving(false);
        toast.warning(
          "Không có thay đổi!",
          "Các bản ghi đã được công bố hoặc không có thay đổi.",
        );
        return;
      }

      const assessmentId = getAssessmentIdForSession(selectedSession);
      const selectedTypes = getSelectedTypes(selectedAssessmentType);
      const saveRequests = [];

      if (selectedTypes.includes("assessment")) {
        saveRequests.push(
          ...changedScores.map((student) => ({
            endpoint: "/AssessmentResults/record",
            body: {
              assessmentId: assessmentId,
              accountId: student.accountId,
              subjectResultId: student.subjectResultId || 1,
              sessionId: selectedSession?.sessionId,
              score: parseFloat(student.assessmentScore) || 0,
              remark: student.assessmentComment || "",
            },
          })),
        );
      }

      if (selectedTypes.includes("practical")) {
        for (const student of changedScores) {
          if (student.practicalResultId) {
            // Update existing practical result
            const practicalScore = parseFloat(student.practicalScore) || 0;
            saveRequests.push({
              endpoint: `/PracticalChecklistResults/${student.practicalResultId}/progress`,
              method: "put",
              body: {
                score: practicalScore,
                verificationComment: student.practicalComment || "",
                sessionId: selectedSession?.sessionId,
              },
            });
          } else {
            // No existing result — create a new PracticalChecklistResult via POST
            const practicalScore = parseFloat(student.practicalScore) || 0;
            saveRequests.push({
              endpoint: "/PracticalChecklistResults",
              method: "post",
              body: {
                subjectResultId: student.subjectResultId || 1,
                sessionId: selectedSession?.sessionId,
                score: practicalScore,
                verificationComment: student.practicalComment || "",
              },
            });
          }
        }
      }

      await Promise.all(
        saveRequests.map((request) =>
          request.method === "put"
            ? api.put(request.endpoint, request.body)
            : api.post(request.endpoint, request.body),
        ),
      );

      await Promise.all(
        changedScores.map((student) => {
          if (student.subjectResultId) {
            return api
              .post("/AssessmentResults/signoff", {
                subjectResultId: student.subjectResultId,
                role: "Instructor",
                comment: "Đã hoàn thành đánh giá chuyên đề.",
              })
              .catch(() => null);
          }
          return Promise.resolve(null);
        }),
      );

      setStudentScores(editingScores);
      setIsEditingScores(false);
      toast.success(
        "Lưu điểm thành công!",
        "Đã cập nhật bảng điểm đánh giá.",
      );
    } catch (err) {
      console.error("Lỗi khi lưu bảng điểm:", err);
      toast.error("Lưu điểm thất bại!", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setSelectedAssessmentType(newType);
    if (selectedSession) {
      loadSessionScores(selectedSession, newType);
    }
  };

  const selectedClass = useMemo(() => {
    return classesData.find((c) => c.classId === parseInt(selectedClassId));
  }, [classesData, selectedClassId]);

  // Check if all scores are published (for lock button state)
  const allPublished = useMemo(() => {
    const displayScores = isEditingScores ? editingScores : studentScores;
    if (displayScores.length === 0) return false;
    return displayScores.every((s) => s.isPublished);
  }, [isEditingScores, editingScores, studentScores]);

  // Publish (confirm + lock) all scores — called after ConfirmModal confirms
  const handlePublishScores = async () => {
    if (allPublished) return;

    setPublishing(true);
    try {
      // Step 1: Save any pending changed scores first
      const changedScores = editingScores.filter((student) => {
        const original = studentScores.find(
          (s) => s.enrollmentId === student.enrollmentId,
        );
        if (student.isPublished || original?.isPublished) return false;
        if (!original) return true;

        if (selectedAssessmentType === "assessment") {
          return (
            student.assessmentScore !== original.assessmentScore ||
            student.assessmentComment !== original.assessmentComment
          );
        }
        if (selectedAssessmentType === "practical") {
          return (
            student.practicalScore !== original.practicalScore ||
            student.practicalComment !== original.practicalComment
          );
        }
        return (
          student.assessmentScore !== original.assessmentScore ||
          student.assessmentComment !== original.assessmentComment ||
          student.practicalScore !== original.practicalScore ||
          student.practicalComment !== original.practicalComment
        );
      });

      if (changedScores.length > 0) {
        const assessmentId = getAssessmentIdForSession(selectedSession);
        const selectedTypes = getSelectedTypes(selectedAssessmentType);
        const saveRequests = [];

        if (selectedTypes.includes("assessment")) {
          saveRequests.push(
            ...changedScores.map((student) => ({
              endpoint: "/AssessmentResults/record",
              body: {
                assessmentId: assessmentId,
                accountId: student.accountId,
                subjectResultId: student.subjectResultId || 1,
                sessionId: selectedSession?.sessionId,
                score: parseFloat(student.assessmentScore) || 0,
                remark: student.assessmentComment || "",
              },
            })),
          );
        }

        if (selectedTypes.includes("practical")) {
          for (const student of changedScores) {
            const practicalScore = parseFloat(student.practicalScore) || 0;
            if (student.practicalResultId) {
              saveRequests.push({
                endpoint: `/PracticalChecklistResults/${student.practicalResultId}/progress`,
                method: "put",
                body: {
                  score: practicalScore,
                  verificationComment: student.practicalComment || "",
                  sessionId: selectedSession?.sessionId,
                },
              });
            } else {
              saveRequests.push({
                endpoint: "/PracticalChecklistResults",
                method: "post",
                body: {
                  subjectResultId: student.subjectResultId || 1,
                  sessionId: selectedSession?.sessionId,
                  score: practicalScore,
                  verificationComment: student.practicalComment || "",
                },
              });
            }
          }
        }

        await Promise.all(
          saveRequests.map((request) =>
            request.method === "put"
              ? api.put(request.endpoint, request.body)
              : api.post(request.endpoint, request.body),
          ),
        );

        await Promise.all(
          changedScores.map((student) => {
            if (student.subjectResultId) {
              return api
                .post("/AssessmentResults/signoff", {
                  subjectResultId: student.subjectResultId,
                  role: "Instructor",
                  comment: "Đã hoàn thành đánh giá chuyên đề.",
                })
                .catch(() => null);
            }
            return Promise.resolve(null);
          }),
        );

        setStudentScores(editingScores);
      }

      // Step 2: Publish all unpublished results
      // Use editingScores (latest data) instead of studentScores (stale closure)
      const selectedTypes = getSelectedTypes(selectedAssessmentType);
      const publishRequests = [];

      const scoresToPublish = changedScores.length > 0 ? editingScores : studentScores;
      for (const student of scoresToPublish) {
        if (
          selectedTypes.includes("assessment") &&
          student.assessmentResultId &&
          !student.assessmentIsPublished
        ) {
          publishRequests.push(
            api.patch(
              `/AssessmentResults/${student.assessmentResultId}/publish`,
            ),
          );
        }
        if (
          selectedTypes.includes("practical") &&
          student.practicalResultId &&
          !student.practicalIsPublished
        ) {
          publishRequests.push(
            api.patch(
              `/PracticalChecklistResults/${student.practicalResultId}/publish`,
            ),
          );
        }
      }

      if (publishRequests.length > 0) {
        await Promise.all(publishRequests);
      }

      setConfirmPublishOpen(false);
      toast.success(
        "Chốt điểm thành công!",
        "Bảng điểm đã được khóa.",
      );
      setIsEditingScores(false);
      loadSessionScores(selectedSession, selectedAssessmentType);
    } catch (err) {
      console.error("Lỗi khi chốt điểm:", err);
      toast.error("Chốt điểm thất bại!", err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Grading Spreadsheet View
  if (selectedSession) {
    const displayScores = isEditingScores ? editingScores : studentScores;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <nav className="breadcrumb-nav">
          <span
            className="breadcrumb-item"
            onClick={() => setSelectedSession(null)}
            style={{ cursor: "pointer" }}
          >
            ĐÁNH GIÁ
          </span>
          <svg width="4" height="6" viewBox="0 0 4 6" fill="none">
            <path
              d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z"
              fill="currentColor"
            />
          </svg>
          <span className="breadcrumb-item active">{selectedSession.name}</span>
        </nav>

        <section className="content-header">
          <div className="header-left">
            <h1>Nhập điểm đánh giá — {selectedSession.name}</h1>
            <div className="divider-gold" />
            <p className="header-description">
              {getAssessmentTypeLabel(selectedAssessmentType)} · Assessment:{" "}
              {getSessionAssessmentName(selectedSession)} · Lớp:{" "}
              {selectedClass ? selectedClass.code : "N/A"}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isEditingScores ? (
              <>
                <button
                  onClick={() => setIsEditingScores(false)}
                  type="button"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "1px solid #dfe6f1",
                    backgroundColor: "#ffffff",
                    color: "#002147",
                    fontSize: "12px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSaveScores}
                  className="create-btn"
                  type="button"
                  disabled={saving}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <span>LƯU ĐIỂM</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEdit}
                className="create-btn"
                type="button"
                disabled={loading}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 18 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 16H3.425L13.2 6.225L11.775 4.8L2 14.575V16ZM0 18V13.75L13.2 0.575C13.4 0.391667 13.6208 0.25 13.8625 0.15C14.1042 0.05 14.3583 0 14.625 0C14.8917 0 15.15 0.05 15.4 0.15C15.65 0.25 15.8667 0.4 16.05 0.6L17.425 2C17.625 2.18333 17.7708 2.4 17.8625 2.65C17.9542 2.9 18 3.15 18 3.4C18 3.66667 17.9542 3.92083 17.8625 4.1625C17.7708 4.40417 17.625 4.625 17.425 4.825L4.25 18H0Z"
                    fill="currentColor"
                  />
                </svg>
                <span>NHẬP ĐIỂM ĐÁNH GIÁ</span>
              </button>
            )}

            {/* Publish / Lock button — always visible, matching attendance style */}
            <button
              onClick={() => setConfirmPublishOpen(true)}
              className="create-btn"
              type="button"
              disabled={allPublished || saving || publishing}
              style={{
                background: allPublished
                  ? "linear-gradient(159.93deg, #475569 -27.55%, #334155 127.55%)"
                  : "linear-gradient(159.93deg, #e11d48 -27.55%, #be123c 127.55%)",
                opacity: allPublished ? 0.9 : 1,
                cursor: allPublished ? "not-allowed" : "pointer",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ marginRight: "4px" }}
              >
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="11"
                  rx="2"
                  ry="2"
                />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>
                {allPublished ? "ĐÃ KHÓA ĐIỂM" : "CHỐT ĐIỂM"}
              </span>
            </button>
          </div>
        </section>

        {/* Assessment Type dropdown */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 20px",
            background: "#ffffff",
            border: "1px solid #dfe6f1",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,33,71,0.04)",
          }}
        >
          <label
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "rgba(0,33,71,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Hình thức đánh giá:
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
              cursor: "pointer",
            }}
            value={selectedAssessmentType}
            onChange={handleTypeChange}
          >
            <option value="assessment">Đánh giá lý thuyết (Assessment)</option>
            <option value="practical">Đánh giá thực hành (Practical)</option>
            <option value="both">Cả Assessment và Practical</option>
          </select>
        </div>

        {/* Score Table */}
        <section className="table-card">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 140px 220px 140px 1fr 100px",
              alignItems: "center",
              gap: "12px",
              background: "linear-gradient(135deg, #06234a 0%, #041b39 100%)",
              color: "#ffffff",
              padding: "14px 20px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <div style={{ textAlign: "center" }}>STT</div>
            <div>Mã học viên</div>
            <div>Học viên</div>
            <div style={{ textAlign: "center" }}>Điểm số (0 - 100)</div>
            <div>Ghi chú nhận xét chuyên môn</div>
            <div style={{ textAlign: "center" }}>Khóa sửa</div>
          </div>

          <div className="table-body">
            {loading ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "rgba(0,33,71,0.4)",
                  fontStyle: "italic",
                }}
              >
                Đang tải bảng điểm...
              </div>
            ) : (
              displayScores.map((student, idx) => (
                <div
                  key={student.enrollmentId ?? student.code}
                  className="table-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 140px 220px 140px 1fr 100px",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 20px",
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
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#002147",
                    }}
                  >
                    {student.code}
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "#002147",
                    }}
                  >
                    {student.name}
                  </span>

                  {/* Score input cell */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {isEditingScores ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          width: "100%",
                        }}
                      >
                        {(selectedAssessmentType === "assessment" ||
                          selectedAssessmentType === "both") && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                color: "rgba(0,33,71,0.6)",
                                textTransform: "uppercase",
                              }}
                            >
                              Assessment
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={student.assessmentScore}
                              disabled={student.isPublished}
                              onChange={(e) =>
                                handleScoreChange(
                                  student.enrollmentId,
                                  e.target.value,
                                  "assessment",
                                )
                              }
                              style={{
                                width: "80px",
                                padding: "6px 10px",
                                border: "1px solid #d9e1ec",
                                borderRadius: "8px",
                                textAlign: "center",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: student.isPublished
                                  ? "#94a3b8"
                                  : "#002147",
                                backgroundColor: student.isPublished
                                  ? "#f1f5f9"
                                  : "#ffffff",
                                outline: "none",
                                cursor: student.isPublished
                                  ? "not-allowed"
                                  : "text",
                              }}
                            />
                          </div>
                        )}
                        {(selectedAssessmentType === "practical" ||
                          selectedAssessmentType === "both") && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                color: "rgba(0,33,71,0.6)",
                                textTransform: "uppercase",
                              }}
                            >
                              Practical
                            </span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={student.practicalScore}
                              disabled={student.isPublished}
                              onChange={(e) =>
                                handleScoreChange(
                                  student.enrollmentId,
                                  e.target.value,
                                  "practical",
                                )
                              }
                              style={{
                                width: "80px",
                                padding: "6px 10px",
                                border: "1px solid #d9e1ec",
                                borderRadius: "8px",
                                textAlign: "center",
                                fontSize: "13px",
                                fontWeight: "700",
                                color: student.isPublished
                                  ? "#94a3b8"
                                  : "#002147",
                                backgroundColor: student.isPublished
                                  ? "#f1f5f9"
                                  : "#ffffff",
                                outline: "none",
                                cursor: student.isPublished
                                  ? "not-allowed"
                                  : "text",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {(selectedAssessmentType === "assessment" ||
                          selectedAssessmentType === "both") && (
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              backgroundColor:
                                student.assessmentScore >= 50
                                  ? "rgba(34,197,94,0.08)"
                                  : "rgba(239,68,68,0.08)",
                              color:
                                student.assessmentScore >= 50
                                  ? "#16a34a"
                                  : "#ef4444",
                            }}
                          >
                            A: {student.assessmentScore} / 100
                          </span>
                        )}
                        {(selectedAssessmentType === "practical" ||
                          selectedAssessmentType === "both") && (
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              backgroundColor:
                                student.practicalScore >= 50
                                  ? "rgba(34,197,94,0.08)"
                                  : "rgba(239,68,68,0.08)",
                              color:
                                student.practicalScore >= 50
                                  ? "#16a34a"
                                  : "#ef4444",
                            }}
                          >
                            P: {student.practicalScore} / 100
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comment Column */}
                  <div>
                    {isEditingScores ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {(selectedAssessmentType === "assessment" ||
                          selectedAssessmentType === "both") && (
                          <input
                            type="text"
                            value={student.assessmentComment}
                            disabled={student.isPublished}
                            onChange={(e) =>
                              handleCommentChange(
                                student.enrollmentId,
                                e.target.value,
                                "assessment",
                              )
                            }
                            placeholder={
                              student.isPublished
                                ? "Đã khóa không thể sửa"
                                : "Nhập nhận xét Assessment..."
                            }
                            style={{
                              width: "100%",
                              padding: "6px 12px",
                              border: "1px solid #d9e1ec",
                              borderRadius: "8px",
                              fontSize: "12px",
                              color: student.isPublished
                                ? "#94a3b8"
                                : "#17314f",
                              backgroundColor: student.isPublished
                                ? "#f1f5f9"
                                : "#ffffff",
                              outline: "none",
                              cursor: student.isPublished
                                ? "not-allowed"
                                : "text",
                            }}
                          />
                        )}
                        {(selectedAssessmentType === "practical" ||
                          selectedAssessmentType === "both") && (
                          <input
                            type="text"
                            value={student.practicalComment}
                            disabled={student.isPublished}
                            onChange={(e) =>
                              handleCommentChange(
                                student.enrollmentId,
                                e.target.value,
                                "practical",
                              )
                            }
                            placeholder={
                              student.isPublished
                                ? "Đã khóa không thể sửa"
                                : "Nhập nhận xét Practical..."
                            }
                            style={{
                              width: "100%",
                              padding: "6px 12px",
                              border: "1px solid #d9e1ec",
                              borderRadius: "8px",
                              fontSize: "12px",
                              color: student.isPublished
                                ? "#94a3b8"
                                : "#17314f",
                              backgroundColor: student.isPublished
                                ? "#f1f5f9"
                                : "#ffffff",
                              outline: "none",
                              cursor: student.isPublished
                                ? "not-allowed"
                                : "text",
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {(selectedAssessmentType === "assessment" ||
                          selectedAssessmentType === "both") && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "rgba(0,33,71,0.6)",
                            }}
                          >
                            {student.assessmentComment ||
                              "— Chưa có nhận xét Assessment"}
                          </span>
                        )}
                        {(selectedAssessmentType === "practical" ||
                          selectedAssessmentType === "both") && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "rgba(0,33,71,0.6)",
                            }}
                          >
                            {student.practicalComment ||
                              "— Chưa có nhận xét Practical"}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lock Status Column */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {student.isPublished ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#be123c",
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        Khóa
                      </span>
                    ) : (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#16a34a",
                        }}
                      >
                        Mở
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Toast notifications */}
        <toast.ToastContainer />

        {/* Confirm publish modal */}
        <ConfirmModal
          isOpen={confirmPublishOpen}
          onClose={() => setConfirmPublishOpen(false)}
          onConfirm={handlePublishScores}
          title="Xác nhận chốt điểm"
          message="Bạn có chắc chắn muốn chốt và khóa bảng điểm này?"
          confirmText="CHỐT ĐIỂM"
          cancelText="HỦY BỎ"
          confirmVariant="danger"
          loading={publishing}
        />
      </div>
    );
  }

  // Session-based assessment selector view
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <section className="content-header">
        <div className="header-left">
          <h1>Đánh giá theo buổi học</h1>
          <div className="divider-gold" />
          <p className="header-description">
            Chọn lớp học và buổi học để nhập điểm theo loại Assessment,
            Practical hoặc cả hai.
          </p>
        </div>
      </section>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 20px",
          background: "#ffffff",
          border: "1px solid #dfe6f1",
          borderRadius: "16px",
          boxShadow: "0 4px 12px rgba(0,33,71,0.04)",
        }}
      >
        <label
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "rgba(0,33,71,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Chọn lớp:
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
            cursor: "pointer",
          }}
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          {classesData.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {selectedClassId && (
        <section className="table-card">
          <div
            style={{
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "#002147" }}>
                {selectedClass ? selectedClass.name : "Chọn lớp học"}
              </h3>
              <p style={{ margin: "6px 0 0", color: "rgba(0,33,71,0.7)" }}>
                {selectedClass
                  ? `Danh sách buổi học cho lớp ${selectedClass.code} - ${selectedClass.subName}`
                  : "Vui lòng chọn lớp để xem danh sách buổi học."}
              </p>
            </div>

            {loading ? (
              <div style={{ color: "rgba(0,33,71,0.5)", fontStyle: "italic" }}>
                Đang tải danh sách buổi học...
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ color: "rgba(0,33,71,0.5)", fontStyle: "italic" }}>
                Chưa có buổi học nào được tạo cho lớp này.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                      padding: "16px 18px",
                      border: "1px solid #dfe6f1",
                      borderRadius: "12px",
                      background: "#f8fbff",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 6px", color: "#002147" }}>
                        {session.name}
                      </h4>
                      <p style={{ margin: 0, color: "rgba(0,33,71,0.7)" }}>
                        {session.date} · {session.room}
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenGradingSheet(session)}
                      className="ghost-btn"
                      type="button"
                      disabled={loading}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                        backgroundColor: '#c5a059', color: 'white', border: 'none', cursor: 'pointer',
                        textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(197, 160, 89, 0.2)'
                      }}
                    >
                      NHẬP ĐIỂM BUỔI HỌC
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default InstructorAssessments;
