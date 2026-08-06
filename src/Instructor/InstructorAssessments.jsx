import { useState, useEffect, useMemo } from "react";
import { api } from "../utils/api";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import { useLanguage } from '../context/LanguageContext';
import "./instructor.scss";

const InstructorAssessments = () => {
  const { tr } = useLanguage();
  const [classesData, setClassesData] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assessmentsForClass, setAssessmentsForClass] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

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

  // SubjectSignoff state
  const [signingOff, setSigningOff] = useState(false);
  const [confirmSignoffOpen, setConfirmSignoffOpen] = useState(false);
  const [eligibilityList, setEligibilityList] = useState([]); // per-student 4-rule signoff eligibility

  // PassingScore threshold used for subject signoff theory check
  const SIGNOFF_ATTENDANCE_THRESHOLD = 80;

  // Toast notifications
  const toast = useToast();

  // Remarks note modal state
  const [assessmentsList, setAssessmentsList] = useState([]);

  const getAssessmentTypeLabel = (type = selectedAssessmentType) => {
    switch (type) {
      case "practical":
        return tr("Practical (Thực hành)");
      case "both":
        return tr("Assessment + Practical");
      default:
        return tr("Assessment (Lý thuyết)");
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
            name: cls.className || tr("Lớp đào tạo"),
            subName: course ? course.courseName : tr("Chuyên đề huấn luyện"),
            courseKey: course ? String(course.courseId) : "N/A",
            schedule: cls.schedule || tr("Chưa sắp lịch"),
            time: cls.time || "08:00 - 11:30",
            status: cls.status || tr("Đang diễn ra"),
            subjectId: cls.subjectId || 1,
            courseId: course ? course.courseId : (cls.courseId ?? null),
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

  // Derive the gradable assessments for the selected class from its sessions.
  // Each session may have an assessment signed to it (assessmentId + assessmentName).
  // These are the assessments the class can be graded on. Sessions without a signed
  // assessment (attendance-only) are excluded.
  useEffect(() => {
    if (!selectedClassId) return;
    const fetchAssessmentsForClass = async () => {
      try {
        const classId = parseInt(selectedClassId);
        const apiSessions = await api.get("/sessions").catch(() => []);
        const classSessions = (Array.isArray(apiSessions) ? apiSessions : []).filter(
          (s) => Number(s.classId) === classId,
        );

        // Assessments signed to sessions of this class (deduplicated by assessmentId)
        const signed = classSessions.filter(
          (s) => s.assessmentId != null && s.sessionId != null,
        );

        const byId = new Map();
        for (const s of signed) {
          const id = Number(s.assessmentId);
          if (!byId.has(id)) {
            const detail = (assessmentsList || []).find(
              (a) => Number(a.assessmentId) === id,
            );
            byId.set(id, {
              assessmentId: id,
              subjectId: s.subjectId,
              courseId: detail?.courseId ?? null,
              componentName:
                s.assessmentName ||
                detail?.componentName ||
                detail?.assessmentName ||
                `Assessment ${id}`,
              assessmentType: s.assessmentType || detail?.assessmentType || "",
              weight: detail?.weight,
              passingScore: detail?.passingScore,
              isRequired: detail?.isRequired,
              displayOrder: detail?.displayOrder,
              sessionId: s.sessionId,
            });
          }
        }
        setAssessmentsForClass(Array.from(byId.values()));
      } catch (err) {
        console.error("Lỗi khi tải danh sách assessment:", err);
        setAssessmentsForClass([]);
      }
    };
    fetchAssessmentsForClass();
  }, [selectedClassId, assessmentsList]);

  // Load students of selected class
  const loadStudents = async () => {
    try {
      const [allEnrollments, allProfiles, allClassStudents] = await Promise.all([
        api.get("/enrollments").catch(() => []),
        api.get("/userprofiles").catch(() => []),
        api.get("/classStudents").catch(() => []),
      ]);

      const classEnrollments = allEnrollments.filter(
        (e) => e.classId === parseInt(selectedClassId),
      );
      const mappedStudents = classEnrollments.map((en) => {
        const profile = allProfiles.find((p) => p.accountId === en.accountId);
        // Lấy ClassStudentId thật (AttendanceRecord dùng classStudentId, không phải enrollmentId)
        const classStudentRec = Array.isArray(allClassStudents)
          ? allClassStudents.find((cs) => cs.courseEnrollmentId === en.enrollmentId)
          : null;
        return {
          code: profile
            ? profile.employeeCode || `HV${en.accountId}`
            : `HV${en.accountId}`,
          name: profile ? profile.fullName : tr("Học viên"),
          accountId: en.accountId,
          enrollmentId: en.enrollmentId,
          classStudentId: classStudentRec
            ? classStudentRec.classStudentId
            : en.enrollmentId,
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

  // Load all assessment results for a given assessment (not session-based)
  const loadAssessmentScores = async (assessment, type = selectedAssessmentType) => {
    console.log("[InstructorAssessments] loadAssessmentScores start", {
      selectedAssessment: assessment,
      selectedAssessmentType: type,
    });
    setLoading(true);
    try {
      const mappedStudents = await loadStudents();
      const scoresData = [];
      const allEtrs = await api.get("/etr").catch(() => []);
      const selectedTypes = getSelectedTypes(type);

      // Data for Subject Signoff eligibility (4 validation rules)
      const currentCourseId = classesData.find(
        (c) => c.classId === parseInt(selectedClassId),
      )?.courseId ?? 1;
      const [allEvidences, allPracticalChecklists, courseDetail] = await Promise.all([
        api.get("/Evidences").catch(() => api.get("/evidences").catch(() => [])),
        api.get("/PracticalChecklists").catch(() => api.get("/practicalchecklists").catch(() => [])),
        api.get(`/courses/${currentCourseId}`).catch(() => null),
      ]);
      const evidencesArr = Array.isArray(allEvidences) ? allEvidences : [];
      const checklistsArr = Array.isArray(allPracticalChecklists) ? allPracticalChecklists : [];
      const courseDetailArr = courseDetail
        ? (Array.isArray(courseDetail.subjects) ? courseDetail.subjects : (Array.isArray(courseDetail.courseSubjects) ? courseDetail.courseSubjects : []))
        : [];

      console.log("[InstructorAssessments] loadAssessmentScores fetched", {
        studentCount: mappedStudents.length,
        etrCount: allEtrs.length,
        selectedTypes,
      });

      // Pre-fetch all assessment results once (instead of per-student)
      const allAssessmentResults = selectedTypes.includes("assessment")
        ? await getAllAssessmentResults()
        : [];

      // Pre-fetch all practical results once (instead of per-student)
      // Always fetch: needed for both the grading tab AND signoff eligibility (Rule 3)
      const allPracticalResults = await getAllPracticalResults();

      // Practical results lookup for signoff eligibility (regardless of current tab)
      const practicalResultsBySubject = Array.isArray(allPracticalResults)
        ? allPracticalResults
        : [];

      // Assessment-based: use assessmentId directly (no sessionId needed)
      const currentAssessmentId = assessment?.assessmentId;
      const currentSubjectId = assessment?.subjectId;

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
      );

      // Build list of students with their scores
      for (const student of mappedStudents) {
        let assessmentScore = 0;
        let assessmentComment = "";
        let assessmentResultId = null;
        let practicalScore = 0;
        let practicalComment = "";
        let practicalResultId = null;
        let subjectResultId = 1;
        let subjectScore = null;
        let assessmentIsPublished = false;
        let practicalIsPublished = false;

        const etrDetails = etrDetailsMap[student.accountId];
        let attendanceRate = null;
        if (etrDetails && etrDetails.subjectResults) {
          const subRes = etrDetails.subjectResults.find(
            (sr) => sr.subjectId === currentSubjectId,
          );
          if (subRes) {
            subjectResultId = subRes.subjectResultId;
            subjectScore = subRes.score != null ? Number(subRes.score) : null;
            attendanceRate = subRes.attendanceRate != null ? subRes.attendanceRate : null;

            if (selectedTypes.includes("assessment")) {
              // Filter pre-fetched assessment results by accountId and assessmentId only (no sessionId).
              // This allows grading across all sessions for this assessment.
              let assessmentScoreResult = allAssessmentResults.find(
                (ar) =>
                  ar.accountId === student.accountId &&
                  ar.assessmentId === currentAssessmentId &&
                  ar.subjectResultId === subRes.subjectResultId,
              );
              // Fallback: allow legacy records (sessionId == null) to show up
              if (!assessmentScoreResult) {
                assessmentScoreResult = allAssessmentResults.find(
                  (ar) =>
                    ar.accountId === student.accountId &&
                    ar.assessmentId === currentAssessmentId &&
                    ar.subjectResultId === subRes.subjectResultId &&
                    ar.sessionId == null,
                );
              }
              if (assessmentScoreResult) {
                assessmentScore = assessmentScoreResult.score || 0;
                assessmentComment = assessmentScoreResult.remark || "";
                assessmentResultId =
                  assessmentScoreResult.assessmentResultId ||
                  assessmentScoreResult.resultId ||
                  assessmentScoreResult.id ||
                  null;
                assessmentIsPublished = assessmentScoreResult.isPublished || false;
              }
            }

            if (selectedTypes.includes("practical")) {
              // Filter pre-fetched practical results by subjectResultId only (no sessionId)
              let practicalScoreResult = allPracticalResults.find(
                (pr) =>
                  pr.subjectResultId === subRes.subjectResultId &&
                  pr.practicalChecklistId != null,
              );
              // Fallback: allow legacy records (sessionId == null)
              if (!practicalScoreResult) {
                practicalScoreResult = allPracticalResults.find(
                  (pr) =>
                    pr.subjectResultId === subRes.subjectResultId,
                );
              }
              if (practicalScoreResult) {
                practicalScore = practicalScoreResult.score || 0;
                practicalComment = practicalScoreResult.verificationComment || "";
                practicalResultId =
                  practicalScoreResult.practicalChecklistResultId ||
                  practicalScoreResult.resultId ||
                  practicalScoreResult.id ||
                  null;
                practicalIsPublished = practicalScoreResult.isPublished || false;
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

        // === Subject Signoff eligibility (4 validation rules) ===
        // Rule 1: Attendance >= 80%
        const attendanceOk = attendanceRate != null
          ? attendanceRate >= SIGNOFF_ATTENDANCE_THRESHOLD
          : false;

        // Rule 2: Theory score (avg of required theoretical assessments) >= PassingScore
        const courseSubject = courseDetailArr.find(
          (cs) => Number(cs.subjectId) === Number(currentSubjectId),
        );
        const passingScore = courseSubject
          ? Number(courseSubject.passingScore) || 50
          : 50;
        const theoryOk = subjectScore != null
          ? subjectScore >= passingScore
          : false;

        // Rule 3: All mandatory practical checklists for this subject have a Passed result
        const requiredChecklists = checklistsArr.filter(
          (pc) =>
            Number(pc.subjectId) === Number(currentSubjectId) &&
            (pc.isRequired || pc.isMandatory),
        );
        const practicalResultsForSubject = requiredChecklists.filter((pc) =>
          practicalResultsBySubject.some(
            (pr) =>
              Number(pr.practicalChecklistId) === Number(pc.practicalChecklistId) &&
              (pr.resultStatus === "Passed" || pr.resultStatus === "Hoàn thành"),
          ),
        );
        const practicalOk = requiredChecklists.length === 0
          ? false
          : practicalResultsForSubject.length === requiredChecklists.length;

        // Rule 4: At least one evidence file uploaded & Verified for this subject result
        const evidencesForSubject = evidencesArr.filter(
          (ev) => Number(ev.subjectResultId) === Number(subjectResultId),
        );
        const evidenceOk = evidencesForSubject.length > 0
          && evidencesForSubject.every((ev) =>
              ev.verificationStatus === "Verified"
              || ev.status === "Verified"
              || ev.verified === true,
            );

        const eligible = attendanceOk && theoryOk && practicalOk && evidenceOk;

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
          attendanceRate,
          subjectScore,
          passingScore,
          eligibility: { attendanceOk, theoryOk, practicalOk, evidenceOk, eligible },
        });
      }

      setStudentScores(scoresData);
      setEligibilityList(
        scoresData.map((s) => ({
          code: s.code,
          name: s.name,
          subjectResultId: s.subjectResultId,
          attendanceRate: s.attendanceRate,
          subjectScore: s.subjectScore,
          passingScore: s.passingScore,
          ...s.eligibility,
        })),
      );
    } catch (err) {
      console.error("Lỗi khi tải bảng điểm:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGradingSheet = (assessment) => {
    setSelectedAssessment(assessment);
    setIsEditingScores(false);
    loadAssessmentScores(assessment, selectedAssessmentType);
  };

  const handleStartEdit = () => {
    setEditingScores(JSON.parse(JSON.stringify(studentScores)));
    setIsEditingScores(true);
  };

  // Assessment-based: use the selected assessment's ID directly (no session resolution needed)
  const getCurrentAssessmentId = () => selectedAssessment?.assessmentId ?? 1;

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
          tr("Không có thay đổi!"),
          tr("Các bản ghi đã được công bố hoặc không có thay đổi."),
        );
        return;
      }

      const assessmentId = getCurrentAssessmentId();
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
              .post("/SubjectSignoff", {
                subjectResultId: student.subjectResultId,
                comment: tr("Đã hoàn thành đánh giá chuyên đề."),
              })
              .catch(() => null);
          }
          return Promise.resolve(null);
        }),
      );

      setStudentScores(editingScores);
      setIsEditingScores(false);
      toast.success(
        tr("Lưu điểm thành công!"),
        tr("Đã cập nhật bảng điểm đánh giá."),
      );
    } catch (err) {
      console.error("Lỗi khi lưu bảng điểm:", err);
      toast.error(tr("Lưu điểm thất bại!"), err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (e) => {
    const newType = e.target.value;
    setSelectedAssessmentType(newType);
    if (selectedAssessment) {
      loadAssessmentScores(selectedAssessment, newType);
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

  // Signoff eligibility summary counts
  const eligibilityStats = useMemo(() => {
    const eligibleCount = eligibilityList.filter((e) => e.eligible).length;
    return {
      eligibleCount,
      ineligibleCount: eligibilityList.length - eligibleCount,
      allEligible:
        eligibilityList.length > 0 && eligibleCount === eligibilityList.length,
    };
  }, [eligibilityList]);

  const canSignoff = useMemo(() => {
    if (loading || signingOff || allPublished) return false;
    if (eligibilityList.length === 0) return false;
    return eligibilityStats.allEligible;
  }, [loading, signingOff, allPublished, eligibilityList, eligibilityStats]);

  // Publish (confirm + lock) all scores — called after ConfirmModal confirms
  // Subject Signoff handler
  const handleSignoffAllSubjects = async () => {
    setSigningOff(true);
    try {
      // displayScores là biến trong block render (không truy cập được) — dùng state studentScores
      const subjectResultIds = [...new Set(studentScores.map(s => s.subjectResultId).filter(Boolean))];
      
      if (subjectResultIds.length === 0) {
        toast.warning(tr("Không có môn học để ký!"), tr("Vui lòng nhập điểm trước khi ký xác nhận."));
        setConfirmSignoffOpen(false);
        return;
      }

      // Subject Signoff eligibility gate: only sign off learners who satisfy ALL 4 validation rules
      const eligibleIds = eligibilityList
        .filter((e) => e.eligible)
        .map((e) => e.subjectResultId);
      const ineligible = eligibilityList.filter((e) => !e.eligible);

      if (ineligible.length > 0) {
        const names = ineligible.map((e) => e.name).join(", ");
        toast.warning(
          tr("Chưa đủ điều kiện ký xác nhận!"),
          `${tr('Học viên chưa thỏa mãn đầy đủ 4 điều kiện (điểm danh ≥ 80%, điểm lý thuyết ≥ điểm đạt, thực hành bắt buộc đạt, minh chứng đã xác thực): ')}${names}`,
        );
        setConfirmSignoffOpen(false);
        return;
      }

      if (eligibleIds.length === 0) {
        toast.warning(tr("Chưa đủ điều kiện ký xác nhận!"), tr("Không có học viên nào thỏa mãn đầy đủ các điều kiện hoàn thành."));
        setConfirmSignoffOpen(false);
        return;
      }

      await Promise.all(
        eligibleIds.map((subjectResultId) =>
          api.post("/SubjectSignoff", {
            subjectResultId,
            comment: tr("Đã hoàn thành đánh giá và ký xác nhận chuyên đề."),
          })
        )
      );

      setConfirmSignoffOpen(false);
      toast.success(tr("Ký xác nhận thành công!"), `${tr('Đã ký ')}${eligibleIds.length} ${tr('môn học.')}`);
      if (selectedAssessment) {
        loadAssessmentScores(selectedAssessment, selectedAssessmentType);
      }
    } catch (err) {
      console.error("Lỗi khi ký xác nhận:", err);
      toast.error(tr("Ký xác nhận thất bại!"), err.message);
    } finally {
      setSigningOff(false);
    }
  };

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
         const assessmentId = getCurrentAssessmentId();
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
                 },
               });
             } else {
               saveRequests.push({
                 endpoint: "/PracticalChecklistResults",
                 method: "post",
                 body: {
                   subjectResultId: student.subjectResultId || 1,
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
                .post("/SubjectSignoff", {
                  subjectResultId: student.subjectResultId,
                  comment: tr("Đã hoàn thành đánh giá chuyên đề."),
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
        tr("Chốt điểm thành công!"),
        tr("Bảng điểm đã được khóa."),
      );
      setIsEditingScores(false);
      if (selectedAssessment) {
        loadAssessmentScores(selectedAssessment, selectedAssessmentType);
      }
    } catch (err) {
      console.error("Lỗi khi chốt điểm:", err);
      toast.error(tr("Chốt điểm thất bại!"), err.message);
    } finally {
      setPublishing(false);
    }
  };

  // Grading Spreadsheet View
  if (selectedAssessment) {
    const displayScores = isEditingScores ? editingScores : studentScores;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <nav className="breadcrumb-nav">
          <span
            className="breadcrumb-item"
            onClick={() => setSelectedAssessment(null)}
            style={{ cursor: "pointer" }}
          >
            {tr('ĐÁNH GIÁ')}
          </span>
          <svg width="4" height="6" viewBox="0 0 4 6" fill="none">
            <path
              d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z"
              fill="currentColor"
            />
          </svg>
          <span className="breadcrumb-item active">
            {selectedAssessment.componentName}
          </span>
        </nav>

        <section className="content-header">
          <div className="header-left">
             <h1>{tr('Nhập điểm đánh giá')} — {selectedAssessment.componentName}</h1>
            <div className="divider-gold" />
             <p className="header-description">
               {getAssessmentTypeLabel(selectedAssessmentType)} · Assessment:{" "}
               {selectedAssessment.componentName} · {tr('Lớp: ')}{" "}
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
                  {tr('Hủy bỏ')}
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
                  <span>{tr('LƯU ĐIỂM')}</span>
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
                <span>{tr('NHẬP ĐIỂM ĐÁNH GIÁ')}</span>
              </button>
            )}

{/* Ký xác nhận (Subject Signoff) button */}
            <button
              onClick={() => setConfirmSignoffOpen(true)}
              className="create-btn"
              type="button"
              disabled={!canSignoff}
              style={{
                background: !canSignoff
                  ? "linear-gradient(159.93deg, #475569 -27.55%, #334155 127.55%)"
                  : "linear-gradient(159.93deg, #2563eb -27.55%, #1d4ed8 127.55%)",
                opacity: canSignoff ? 1 : 0.7,
                cursor: canSignoff ? "pointer" : "not-allowed",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: "4px" }}>
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
              </svg>
              <span>
                {allPublished
                  ? tr("ĐÃ KÝ")
                  : eligibilityStats.ineligibleCount > 0
                    ? tr(`CHƯA ĐỦ ĐK KÝ (${eligibilityStats.ineligibleCount})`)
                    : tr("KÝ XÁC NHẬN")}
              </span>
            </button>

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
                {allPublished ? tr("ĐÃ KHÓA ĐIỂM") : tr("CHỐT ĐIỂM")}
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
            {tr('Hình thức đánh giá:')}
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
            <option value="assessment">{tr('Đánh giá lý thuyết (Assessment)')}</option>
            <option value="practical">{tr('Đánh giá thực hành (Practical)')}</option>
            <option value="both">{tr('Cả Assessment và Practical')}</option>
          </select>
        </div>

        {/* Subject Signoff Eligibility panel */}
        <section className="table-card" style={{ border: eligibilityStats.allEligible && eligibilityList.length > 0 ? '1px solid #16a34a' : '1px solid #eab308' }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 20px", borderBottom: "1px solid #eef2f6",
            fontSize: "11px", fontWeight: "700", color: "#002147",
            textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            <span>
              {tr('ĐIỀU KIỆN KÝ XÁC NHẬN (SUBJECT SIGNOFF)')}
              <span style={{ fontSize: "10px", fontWeight: 600, color: "rgba(0,33,71,0.5)", marginLeft: "8px" }}>
                {tr('Học viên phải thỏa mãn cả 4 điều kiện')}
              </span>
            </span>
            {eligibilityList.length > 0 && (
              <span style={{
                fontSize: "10px", fontWeight: "800", padding: "4px 12px", borderRadius: "999px",
                backgroundColor: eligibilityStats.allEligible ? "rgba(34,197,94,0.1)" : "rgba(234,179,8,0.12)",
                color: eligibilityStats.allEligible ? "#16a34a" : "#d97706",
              }}>
                {tr(`Đủ điều kiện: `)}{eligibilityStats.eligibleCount}{tr('/')}{eligibilityList.length}
              </span>
            )}
          </div>

          <div style={{ padding: "12px 20px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.9fr 1fr 1.1fr 1.1fr 0.8fr", gap: "10px", alignItems: "center", padding: "6px 0", fontSize: "10px", fontWeight: "800", color: "rgba(0,33,71,0.5)", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #eef2f6" }}>
              <div>{tr('Học viên')}</div>
              <div style={{ textAlign: "center" }}>{tr('Điểm danh ≥ 80%')}</div>
              <div style={{ textAlign: "center" }}>{tr('Điểm lý thuyết ≥ Pass')}</div>
              <div style={{ textAlign: "center" }}>{tr('Thực hành bắt buộc đạt')}</div>
              <div style={{ textAlign: "center" }}>{tr('Minh chứng đã xác thực')}</div>
              <div style={{ textAlign: "center" }}>{tr('Đủ ĐK')}</div>
            </div>
            {eligibilityList.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", color: "rgba(0,33,71,0.4)", fontSize: "12px", fontStyle: "italic" }}>
                {tr("Chưa có dữ liệu. Hãy nhập điểm & ấn Lưu để tính điều kiện ký xác nhận.")}
              </div>
            ) : (
              eligibilityList.map((e) => (
                <div key={e.code} style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 1fr 1.1fr 2.1fr 0.8fr", gap: "10px", alignItems: "center", padding: "8px 0", fontSize: "12px", fontWeight: "600", color: "#002147", borderBottom: "1px solid #f5f7fa" }}>
                  <div>{e.code} · {e.name}</div>
                  {[
                    { ok: e.attendanceOk, label: e.attendanceRate != null ? `${e.attendanceRate}%` : tr("N/A") },
                    { ok: e.theoryOk, label: e.subjectScore != null ? `${e.subjectScore}/${e.passingScore}` : tr("N/A") },
                    { ok: e.practicalOk, label: tr("Bắt buộc") },
                    { ok: e.evidenceOk, label: tr("Xác thực") },
                  ].map((c, i) => (
                    <div key={i} style={{ textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 8px", borderRadius: "6px",
                        fontSize: "10px", fontWeight: "800",
                        backgroundColor: c.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        color: c.ok ? "#16a34a" : "#ef4444",
                      }}>
                        {c.ok ? `✓ ${c.label}` : `✗ ${c.label}`}
                      </span>
                    </div>
                  ))}
                  <div style={{ textAlign: "center" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 10px", borderRadius: "6px",
                      fontSize: "10px", fontWeight: "800", textTransform: "uppercase",
                      backgroundColor: e.eligible ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)",
                      color: e.eligible ? "#16a34a" : "#ef4444",
                    }}>
                      {e.eligible ? tr("Đạt") : tr("Chưa")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Score Table */}
        <section className="table-card">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 100px 200px 80px 140px 1fr 100px",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #06234a 0%, #041b39 100%)",
              color: "#ffffff",
              padding: "14px 20px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <div style={{ textAlign: "center" }}>{tr('STT')}</div>
            <div style={{ textAlign: "center" }}>{tr('Mã HV')}</div>
            <div>{tr('Học viên')}</div>
            <div style={{ textAlign: "center" }}>{tr('Điểm danh')}</div>
            <div style={{ textAlign: "center" }}>{tr('Điểm số (0-100)')}</div>
            <div>{tr('Nhận xét chuyên môn')}</div>
            <div style={{ textAlign: "center" }}>{tr('Khóa')}</div>
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
                {tr('Đang tải bảng điểm...')}
              </div>
            ) : (
              displayScores.map((student, idx) => (
                <div
                  key={student.enrollmentId ?? student.code}
                  className="table-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 100px 200px 80px 140px 1fr 100px",
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

                  {/* Attendance Rate cell */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {student.attendanceRate != null ? (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          backgroundColor:
                            student.attendanceRate >= 80
                              ? "rgba(34,197,94,0.1)"
                              : "rgba(239,68,68,0.1)",
                          color:
                            student.attendanceRate >= 80
                              ? "#16a34a"
                              : "#ef4444",
                        }}
                      >
                        {student.attendanceRate}%
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "rgba(0,33,71,0.3)",
                        }}
                      >
                        N/A
                      </span>
                    )}
                  </div>

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
                                ? tr("Đã khóa không thể sửa")
                                : tr("Nhập nhận xét Assessment...")
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
                                ? tr("Đã khóa không thể sửa")
                                : tr("Nhập nhận xét Practical...")
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
                              tr("— Chưa có nhận xét Assessment")}
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
                              tr("— Chưa có nhận xét Practical")}
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
                        {tr('Khóa')}
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
                        {tr('Mở')}
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

        {/* Confirm signoff modal */}
        <ConfirmModal
          isOpen={confirmSignoffOpen}
          onClose={() => setConfirmSignoffOpen(false)}
          onConfirm={handleSignoffAllSubjects}
          title={tr("Xác nhận ký xác nhận môn học")}
          message={tr("Bạn có chắc chắn muốn ký xác nhận (Subject Signoff) cho tất cả môn học trong buổi này? Sau khi ký, hệ thống sẽ tự động đánh giá Pass/Fail.")}
          confirmText={tr("KÝ XÁC NHẬN")}
          cancelText={tr("HỦY BỎ")}
          confirmVariant="primary"
          loading={signingOff}
        />

        {/* Confirm publish modal */}
        <ConfirmModal
          isOpen={confirmPublishOpen}
          onClose={() => setConfirmPublishOpen(false)}
          onConfirm={handlePublishScores}
          title={tr("Xác nhận chốt điểm")}
          message={tr("Bạn có chắc chắn muốn chốt và khóa bảng điểm này?")}
          confirmText={tr("CHỐT ĐIỂM")}
          cancelText={tr("HỦY BỎ")}
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
          <h1>{tr('Đánh giá theo Assessment')}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr('Chọn lớp học và assessment để nhập điểm cho học viên.')}
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
          {tr('Chọn lớp:')}
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
                {selectedClass ? selectedClass.name : tr("Chọn lớp học")}
              </h3>
              <p style={{ margin: "6px 0 0", color: "rgba(0,33,71,0.7)" }}>
                {selectedClass
                  ? `${tr('Danh sách Assessment cho lớp ')}${selectedClass.code} - ${selectedClass.subName}`
                  : tr("Vui lòng chọn lớp để xem danh sách Assessment.")}
              </p>
            </div>

            {loading ? (
              <div style={{ color: "rgba(0,33,71,0.5)", fontStyle: "italic" }}>
                {tr('Đang tải danh sách Assessment...')}
              </div>
            ) : assessmentsForClass.length === 0 ? (
              <div style={{ color: "rgba(0,33,71,0.5)", fontStyle: "italic" }}>
                {tr('Chưa có Assessment nào được tạo cho môn học này.')}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {assessmentsForClass
                  .slice()
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((assessment) => (
                    <div
                      key={assessment.assessmentId}
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
                          {assessment.componentName}
                        </h4>
                        <p style={{ margin: 0, color: "rgba(0,33,71,0.7)" }}>
                          {assessment.assessmentType} · {tr('Trọng số')}: {assessment.weight}% · {tr('Điểm đạt')}: {assessment.passingScore}
                          {assessment.isRequired ? ` · ${tr('Bắt buộc')}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenGradingSheet(assessment)}
                        className="ghost-btn"
                        type="button"
                        style={{
                          padding: "10px 20px",
                          borderRadius: "10px",
                          border: "1px solid #dfe6f1",
                          backgroundColor: "#ffffff",
                          color: "#002147",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          textTransform: "uppercase",
                        }}
                      >
                        {tr('NHẬP ĐIỂM')}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Grading Spreadsheet View */}
      {selectedAssessment && (
        <>
          <nav className="breadcrumb-nav">
            <span
              className="breadcrumb-item"
              onClick={() => setSelectedAssessment(null)}
              style={{ cursor: "pointer" }}
            >
              {tr('ĐÁNH GIÁ')}
            </span>
            <svg width="4" height="6" viewBox="0 0 4 6" fill="none">
              <path
                d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z"
                fill="currentColor"
              />
            </svg>
            <span className="breadcrumb-item active">
              {selectedAssessment.componentName}
            </span>
          </nav>

          <section className="content-header">
            <div className="header-left">
              <h1>{tr('Nhập điểm đánh giá')} — {selectedAssessment.componentName}</h1>
              <div className="divider-gold" />
              <p className="header-description">
                {getAssessmentTypeLabel(selectedAssessmentType)} · Assessment:{" "}
                {selectedAssessment.componentName} · {tr('Lớp: ')}{" "}
                {selectedClass ? selectedClass.code : "N/A"}
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default InstructorAssessments;
