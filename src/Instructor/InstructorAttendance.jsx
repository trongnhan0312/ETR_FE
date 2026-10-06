import { Fragment, useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { api, parseApiError } from "../utils/api";
import { announce } from "../utils/crudNotify";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import ExcelPreviewTable from "../components/ExcelPreviewTable";
import { parseExcelPreview } from "../utils/excelPreview";
import { protectExcelTemplate } from "../utils/excelTemplateProtect";
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";
import { useLanguage } from "../context/LanguageContext";
import { useSubViewBack } from "../utils/navigation";
import {
  groupSessionsBySubject,
  sessionGroupsBySubjectId,
} from "../utils/attendanceSessions";
import "./instructor.scss";

// Status constants enforced by the backend (RegularExpression "^(Present|Absent)$")
const ATTENDANCE_STATUSES = [
  { value: "Present", short: "P", label: "Có mặt", color: "#10b981" },
  { value: "Absent", short: "A", label: "Vắng mặt", color: "#ef4444" },
];

// Giảng viên hiện tại = người đang đăng nhập (lưu trong localStorage khi login)
const getCurrentInstructorName = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.fullName || user.displayName || user.name || "";
  } catch {
    return "";
  }
};

const getCurrentAccountId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.accountId ?? user.userId ?? null;
  } catch {
    return null;
  }
};

// Lớp ĐÃ KẾT THÚC / BỊ HỦY → ETR học viên thường đã Completed/Locked → BE chặn mọi thay đổi
// điểm danh (ImmutabilityValidator: "Cannot modify ... because the related ETRCourseRecord
// is Completed or Locked"). Đặt ở module scope để fetchClasses dùng được trong useEffect([]).
const isLockedStatus = (status) => {
  const st = String(status || "").toLowerCase();
  return (
    st === "completed" ||
    st === "đã kết thúc" ||
    st === "cancelled" ||
    st === "đã hủy" ||
    st === "closed"
  );
};

const isClassInProgress = (status) => {
  const st = String(status || "").toLowerCase();
  return st === "inprogress" || st === "in_progress" || st === "đang diễn ra";
};

const isClassNotStarted = (status) => {
  const st = String(status || "").toLowerCase();
  return st === "planned" || st === "scheduled" || st === "chưa bắt đầu" || st === "upcoming";
};

// BE (AttendanceService.RecordAttendanceAsync + BusinessRuleEngine.AttendanceGracePeriodHours = 48)
// chỉ cho phép Instructor điểm danh bù trong vòng 48h sau ngày học; quá hạn → 400 và yêu cầu
// liên hệ Academic Staff. Hàm này ở module scope (không gọi Date.now() khi render).
const ATTENDANCE_GRACE_PERIOD_HOURS = 48;
const isBeyondAttendanceGrace = (rawSessionDate) => {
  if (!rawSessionDate) return false;
  const d = new Date(rawSessionDate);
  if (Number.isNaN(d.getTime())) return false;
  // BE tính: sessionDate.Date.AddDays(1).AddHours(48) → hết hạn lúc 00:00 ngày kế tiếp + 48h
  const expiry =
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() +
    (24 + ATTENDANCE_GRACE_PERIOD_HOURS) * 60 * 60 * 1000;
  return Date.now() > expiry;
};

const InstructorAttendance = () => {
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [classesData, setClassesData] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState(""); // "" = tất cả môn
  const [selectedSession, setSelectedSession] = useState(null);

  const handleBackToSessions = useCallback(() => {
    setSelectedSession(null);
    if (location.state?.attendanceSessionId) {
      navigate(-1);
    }
  }, [location.state, navigate]);

  useSubViewBack(!!selectedSession, handleBackToSessions);

  // Sync if browser back button was clicked
  useEffect(() => {
    if (!location.state?.attendanceSessionId && selectedSession) {
      setSelectedSession(null);
    }
  }, [location.state?.attendanceSessionId]);

  // Student list and attendance records
  const [students, setStudents] = useState([]);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedBy, setConfirmedBy] = useState("");

  // Note remarks modal state
  const [remarkModalStudent, setRemarkModalStudent] = useState(null);
  const [remarkText, setRemarkText] = useState("");

  // Flight & Simulator Training Record Modal State
  const [flightSimModalStudent, setFlightSimModalStudent] = useState(null);
  const [flightSimForm, setFlightSimForm] = useState({});
  const [signingRecord, setSigningRecord] = useState(false);
  const [savingModal, setSavingModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Confirm modal & toast
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Import Excel modal (Bulk Import — khớp ImportController BE)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importValidating, setImportValidating] = useState(false);
  const [importCommitting, setImportCommitting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");
  const [excelPreview, setExcelPreview] = useState(null); // { headers, rows } để xem trước dữ liệu
  const toast = useToast();

  // File Excel đang được stage trong modal import (đã upload, chưa bỏ đi) → khóa sửa tay
  // (chọn P/A, ghi Note) trên bảng điểm danh để tránh chỉnh tay mâu thuẫn với dữ liệu file.
  // Chỉ mở khóa lại khi bỏ file đi (nút × trong modal) — theo yêu cầu sản phẩm.
  const fileStaged = importFile !== null;

  // Load all assigned classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      setLoading(true);
      try {
        const [apiClasses, apiCourses, apiSubjects] = await Promise.all([
          api.get("/Classes").catch(() => api.get("/classes").catch(() => [])),
          api.get("/Courses").catch(() => api.get("/courses").catch(() => [])),
          api.get("/Subjects").catch(() => api.get("/subjects").catch(() => [])),
        ]);

        const storedOverrides = (() => {
          try {
            return JSON.parse(localStorage.getItem("etr_class_instructors") || "{}");
          } catch {
            return {};
          }
        })();

        const mapped = (Array.isArray(apiClasses) ? apiClasses : []).map((cls, idx) => {
          const course = (Array.isArray(apiCourses) ? apiCourses : []).find(
            (c) => String(c.courseId) === String(cls.courseId)
          );
          const cached =
            storedOverrides[String(cls.classId)] ||
            (cls.classCode ? storedOverrides[String(cls.classCode).trim().toUpperCase()] : null);
          const resolvedAssignments =
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
            assignments: resolvedAssignments,
          };
        });
        // Bỏ lớp đã khóa (Completed/Cancelled/Closed) khỏi màn điểm danh — lớp này chỉ
        // đọc (BE chặn ghi điểm danh qua ImmutabilityValidator + grace period) nên không
        // thể điểm danh/sửa. Dropdown chỉ còn các lớp có thể thao tác.
        const activeClasses = mapped.filter((c) => !isLockedStatus(c.status));
        setClassesData(activeClasses);
        setSubjectsList(Array.isArray(apiSubjects) ? apiSubjects : []);
        if (activeClasses.length > 0) {
          const savedClassId =
            location.state?.attendanceClassId ||
            sessionStorage.getItem("etr_attendance_class_id");
          if (
            savedClassId &&
            activeClasses.some((c) => String(c.classId) === String(savedClassId))
          ) {
            setSelectedClassId(Number(savedClassId));
          } else {
            setSelectedClassId(activeClasses[0].classId);
          }
        }
      } catch (err) {
        console.error("Lỗi khi tải danh sách lớp học:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [location.state?.attendanceClassId]);

  useEffect(() => {
    if (selectedClassId) {
      sessionStorage.setItem("etr_attendance_class_id", String(selectedClassId));
    }
  }, [selectedClassId]);

  // Fetch sessions when a class is selected
  useEffect(() => {
    if (!selectedClassId) return;
    const fetchSessions = async () => {
      try {
        const apiSessions = await api.get("/sessions").catch(() => []);

        // "Sân nhà ai nấy đá": 1 lớp có thể có nhiều môn, mỗi môn do 1 giảng viên phụ trách
        // (ClassSubject.InstructorAccountId). Chỉ hiển thị buổi của các môn mà giảng viên hiện
        // tại được phân công — nếu không, giảng viên sẽ thấy buổi của môn khác và bị BE từ chối
        // 403 ở bước commit import ("không được phân công giảng dạy môn này trong lớp").
        const currentAccountId = getCurrentAccountId();
        const selectedClassInfo = classesData.find(
          (c) => c.classId === parseInt(selectedClassId),
        );
        const mySubjectIds = new Set(
          (selectedClassInfo?.assignments || [])
            .filter(
              (a) =>
                a.instructorAccountId != null &&
                currentAccountId != null &&
                String(a.instructorAccountId) === String(currentAccountId),
            )
            .map((a) => a.subjectId),
        );

        const filtered = apiSessions
          .filter((s) => s.classId === parseInt(selectedClassId))
          .filter((s) => mySubjectIds.has(s.subjectId))
          // Gom buổi theo môn (subjectId) rồi theo thứ tự tạo — vì mỗi môn sinh ra
          // bộ buổi cùng tên ("Session 1", "Session 2"...), nếu không gom sẽ thấy
          // danh sách lặp lại giống hệt nhau giữa các môn.
          .sort(
            (a, b) =>
              (a.subjectId ?? 0) - (b.subjectId ?? 0) ||
              (a.sessionId ?? 0) - (b.sessionId ?? 0),
          );

        // Map session attendance counts
        const mapped = await Promise.all(
          filtered.map(async (s, idx) => {
            const rawDate = s.sessionDate;
            // SessionDate có thể null (buổi nháp chưa xếp lịch) → hiển thị TBA
            let dateStr = "TBA";
            if (rawDate) {
              const d = new Date(rawDate);
              dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
            }

            const sub = subjectsList.find((subItem) => subItem.subjectId === s.subjectId);
            const isPractical =
              s.trainingType === "Flight" ||
              s.trainingType === "Simulator" ||
              sub?.subjectType === "Practical" ||
              sub?.subjectType === "Thực hành";

            return {
              sessionId: s.sessionId,
              subjectId: s.subjectId ?? null,
              stt: String(idx + 1).padStart(2, "0"),
              date: dateStr,
              // Giữ nguyên mốc thời gian gốc để kiểm tra grace period 48h của BE
              sessionDate: rawDate || null,
              graceExpired: isBeyondAttendanceGrace(rawDate),
              name: s.sessionTitle || tr("Buổi học"),
              room: s.location || tr("Phòng học"),
              instructor: getCurrentInstructorName(),
              attendance: isPractical
                ? tr("Thực hành")
                : s.isConfirmed
                  ? tr("Đã chốt")
                  : tr("Chưa chốt"),
              isConfirmed: s.isConfirmed || false,
              isPractical,
              trainingType: s.trainingType || (isPractical ? "Flight" : "Theory"),
              lessonCode: s.lessonCode || null,
            };
          }),
        );
        setSessions(mapped);
      } catch (err) {
        console.error("Lỗi khi tải danh sách buổi học:", err);
      }
    };
    fetchSessions();
  }, [selectedClassId, classesData, subjectsList]);

  // Load students and attendance records when a session is selected
  const loadAttendance = async (session) => {
    setSelectedSession(session);
    if (!location.state?.attendanceSessionId) {
      navigate(location.pathname, {
        state: {
          ...(location.state || {}),
          attendanceSessionId: session.sessionId,
          attendanceClassId: selectedClassId,
        },
      });
    }
    setLoading(true);
    try {
      // 1. Get class details, enrollments
      const [allEnrollments, allProfiles] = await Promise.all([
        api.get("/enrollments").catch(() => []),
        api.get("/userprofiles").catch(() => []),
      ]);

      const classEnrollments = allEnrollments.filter(
        (e) => e.classId === parseInt(selectedClassId),
      );
      const mappedStudents = classEnrollments.map((en, idx) => {
        const profile = allProfiles.find((p) => p.accountId === en.accountId);
        return {
          code: profile
            ? profile.employeeCode || `HV${en.accountId}`
            : `HV${en.accountId}`,
          name: profile ? profile.fullName : tr("Học viên"),
          accountId: en.accountId,
          enrollmentId: en.enrollmentId,
        };
      });
      setStudents(mappedStudents);

      // 2. Fetch attendance records
      const attendanceRecords = await api.get("/attendance").catch(() => []);
      const sessionRecords = attendanceRecords.filter(
        (a) => String(a.sessionId) === String(session.sessionId),
      );

      // Determine if session is confirmed
      // Fallback: nếu fetch chi tiết buổi thất bại thì dùng isConfirmed của buổi trong
      // danh sách đã tải — tránh trường hợp buổi ĐÃ chốt lại bị coi là chưa chốt
      // (khiến học viên mới ghi danh giữa khóa hiện nhầm thành Có mặt).
      const sessionDetails = await api
        .get(`/sessions/${session.sessionId}`)
        .catch(() => null);
      const isSessionLocked = sessionDetails
        ? sessionDetails.isConfirmed
        : session.isConfirmed || false;
      setIsConfirmed(isSessionLocked);

      const isFlightOrSim = session.trainingType === "Flight" || session.trainingType === "Simulator";

      const mappedAttendance = mappedStudents.map((student) => {
        // Match by enrollmentId instead of accountId
        const record = sessionRecords.find(
          (r) => String(r.enrollmentId) === String(student.enrollmentId),
        );
        return {
          code: student.code,
          name: student.name,
          accountId: student.accountId,
          enrollmentId: student.enrollmentId,
          // BUỔI ĐÃ CHỐT (IsConfirmed) + học viên CHƯA có bản ghi điểm danh (vd: ghi danh
          // giữa khóa, bắt đầu học từ buổi sau) → mặc định "Absent" thay vì "Present",
          // để không tự động coi học viên là CÓ MẶT ở buổi họ chưa tham gia.
          // Buổi chưa chốt giữ nguyên "Present" (giảng viên sẽ chấm trực tiếp).
          status: record
            ? record.status
            : isSessionLocked
              ? "Absent"
              : "Present",
          remarks: record ? record.remarks || "" : "",
          attendanceRecordId: record
            ? record.attendanceRecordId || record.id
            : null,
          performanceGrade: record?.performanceGrade || (isFlightOrSim ? "Satisfactory" : null),
          flightHours: record?.flightHours != null ? record.flightHours : "",
          simulatorHours: record?.simulatorHours != null ? record.simulatorHours : "",
          dualHours: record?.dualHours != null ? record.dualHours : "",
          soloHours: record?.soloHours != null ? record.soloHours : "",
          picHours: record?.picHours != null ? record.picHours : "",
          nightHours: record?.nightHours != null ? record.nightHours : "",
          instrumentHours: record?.instrumentHours != null ? record.instrumentHours : "",
          crossCountryHours: record?.crossCountryHours != null ? record.crossCountryHours : "",
          dayLandings: record?.dayLandings != null ? record.dayLandings : "",
          nightLandings: record?.nightLandings != null ? record.nightLandings : "",
          aircraftRegistration: record?.aircraftRegistration || "",
          simulatorDevice: record?.simulatorDevice || "",
          departureIcao: record?.departureIcao || "",
          arrivalIcao: record?.arrivalIcao || "",
          route: record?.route || "",
          instructorComments: record?.instructorComments || "",
          studentComments: record?.studentComments || "",
          instructorSignedAt: record?.instructorSignedAt || null,
          instructorSignedByAccountId: record?.instructorSignedByAccountId || null,
          studentSignedAt: record?.studentSignedAt || null,
          studentSignedByAccountId: record?.studentSignedByAccountId || null,
        };
      });
      setSessionAttendance(mappedAttendance);
      return mappedAttendance;
    } catch (err) {
      console.error("Lỗi khi tải bảng điểm danh:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (code, status) => {
    if ((isConfirmed && !isPracticalSession) || !isClassActive || fileStaged) return; // Buổi đã chốt / lớp không InProgress / đang có file import
    setSessionAttendance((prev) =>
      prev.map((s) => (s.code === code ? { ...s, status } : s)),
    );
  };

  const openFlightSimModal = (student) => {
    setFlightSimModalStudent(student);
    setFlightSimForm({
      performanceGrade: student.performanceGrade || "Satisfactory",
      flightHours: student.flightHours ?? "",
      simulatorHours: student.simulatorHours ?? "",
      dualHours: student.dualHours ?? "",
      soloHours: student.soloHours ?? "",
      picHours: student.picHours ?? "",
      nightHours: student.nightHours ?? "",
      instrumentHours: student.instrumentHours ?? "",
      crossCountryHours: student.crossCountryHours ?? "",
      dayLandings: student.dayLandings ?? "",
      nightLandings: student.nightLandings ?? "",
      aircraftRegistration: student.aircraftRegistration || "",
      simulatorDevice: student.simulatorDevice || "",
      departureIcao: student.departureIcao || "",
      arrivalIcao: student.arrivalIcao || "",
      route: student.route || "",
      instructorComments: student.instructorComments || "",
      studentComments: student.studentComments || "",
    });
  };

  const handleSaveFlightSimModal = async () => {
    if ((isConfirmed && !isPracticalSession) || fileStaged || !flightSimModalStudent) return;
    setSavingModal(true);

    const updatedStudent = {
      ...flightSimModalStudent,
      ...flightSimForm,
    };

    // Update local state immediately so user sees changes
    setSessionAttendance((prev) =>
      prev.map((s) =>
        s.code === flightSimModalStudent.code ? updatedStudent : s
      )
    );

    try {
      const payload = buildPayloadForRecord(updatedStudent);
      let res;
      if (updatedStudent.attendanceRecordId) {
        res = await api.put(`/attendance/${updatedStudent.attendanceRecordId}`, payload);
      } else {
        res = await api.post("/attendance/record", payload);
      }

      const savedId = res?.attendanceRecordId || res?.id || updatedStudent.attendanceRecordId;
      setSessionAttendance((prev) =>
        prev.map((s) =>
          s.code === flightSimModalStudent.code
            ? { ...s, ...updatedStudent, attendanceRecordId: savedId }
            : s
        )
      );
      toast.success(tr("Lưu thông số huấn luyện thành công!"), announce("edit", tr("Điểm danh")));
      setFlightSimModalStudent(null);
    } catch (err) {
      console.error("Lỗi khi lưu thông số huấn luyện:", err);
      toast.error(parseApiError(err, tr("Lưu thông số thất bại!")));
    } finally {
      setSavingModal(false);
    }
  };

  const handleInstructorSignRecord = async (student) => {
    if (fileStaged) return;
    setSigningRecord(true);
    try {
      let recordId = student.attendanceRecordId;
      const currentData = {
        ...student,
        ...flightSimForm,
      };
      const payload = buildPayloadForRecord(currentData);

      if (!recordId) {
        const createRes = await api.post("/attendance/record", payload);
        recordId = createRes?.attendanceRecordId || createRes?.id;
      } else {
        await api.put(`/attendance/${recordId}`, payload);
      }

      if (!recordId) {
        throw new Error(tr("Không tìm thấy mã bản ghi điểm danh để ký."));
      }

      await api.post(`/attendance/${recordId}/instructor-sign`, {
        comments: flightSimForm.instructorComments || student.instructorComments || "",
      });
      toast.success(tr("Ký xác nhận huấn luyện thành công!"), announce("edit", tr("Ký huấn luyện")));
      await loadAttendance(selectedSession);
      setFlightSimModalStudent(null);
    } catch (err) {
      console.error("Lỗi khi ký xác nhận:", err);
      toast.error(parseApiError(err, tr("Ký xác nhận thất bại!")));
    } finally {
      setSigningRecord(false);
    }
  };

  const buildPayloadForRecord = (record) => {
    const parseDecimal = (v) => (v === "" || v == null ? null : parseFloat(v));
    const parseIntVal = (v) => (v === "" || v == null ? null : parseInt(v, 10));

    // Absent check: BE throws if status == Absent and performanceGrade == Satisfactory,
    // or if status == Absent and hours/landings > 0.
    const isAbsent = record.status === "Absent";

    return {
      sessionId: selectedSession.sessionId,
      enrollmentId: record.enrollmentId || 1,
      status: record.status || "Present",
      remarks: record.remarks || "",
      performanceGrade: isAbsent ? null : (record.performanceGrade || null),
      flightHours: isAbsent ? null : parseDecimal(record.flightHours),
      simulatorHours: isAbsent ? null : parseDecimal(record.simulatorHours),
      dualHours: isAbsent ? null : parseDecimal(record.dualHours),
      soloHours: isAbsent ? null : parseDecimal(record.soloHours),
      picHours: isAbsent ? null : parseDecimal(record.picHours),
      nightHours: isAbsent ? null : parseDecimal(record.nightHours),
      instrumentHours: isAbsent ? null : parseDecimal(record.instrumentHours),
      crossCountryHours: isAbsent ? null : parseDecimal(record.crossCountryHours),
      dayLandings: isAbsent ? null : parseIntVal(record.dayLandings),
      nightLandings: isAbsent ? null : parseIntVal(record.nightLandings),
      aircraftRegistration: isAbsent ? null : (record.aircraftRegistration || null),
      simulatorDevice: isAbsent ? null : (record.simulatorDevice || null),
      departureIcao: isAbsent ? null : (record.departureIcao || null),
      arrivalIcao: isAbsent ? null : (record.arrivalIcao || null),
      route: isAbsent ? null : (record.route || null),
      instructorComments: record.instructorComments || null,
      studentComments: record.studentComments || null,
    };
  };

  const handleSaveAttendance = async () => {
    if (isConfirmed && !isPracticalSession) return;
    if (!isClassActive) {
      toast.error(isClassUpcoming
        ? tr("Không thể lưu điểm danh vì lớp học chưa bắt đầu.")
        : tr("Không thể lưu điểm danh vì lớp học đã kết thúc hoặc bị hủy."));
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.all(
        sessionAttendance.map(async (record) => {
          const payload = buildPayloadForRecord(record);

          if (record.attendanceRecordId) {
            // Update
            return api.put(`/attendance/${record.attendanceRecordId}`, payload);
          } else {
            // Create
            return api.post("/attendance/record", payload);
          }
        }),
      );

      // Cập nhật attendanceRecordId cho local state ngay
      setSessionAttendance((prev) =>
        prev.map((s, idx) => {
          const res = results[idx];
          const newId = res?.attendanceRecordId || res?.id;
          return newId ? { ...s, attendanceRecordId: newId } : s;
        }),
      );

      toast.success(tr("Lưu điểm danh thành công!"), announce("edit", tr("Điểm danh")));
      // Reload records to sync fresh state from server
      await loadAttendance(selectedSession);
    } catch (err) {
      console.error("Lỗi khi lưu điểm danh:", err);
      toast.error(parseApiError(err, tr("Lưu điểm danh thất bại!")));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAttendance = async () => {
    if (isConfirmed || isPracticalSession) return;
    if (!isClassActive) {
      toast.error(isClassUpcoming
        ? tr("Không thể chốt buổi học vì lớp học chưa bắt đầu.")
        : tr("Không thể chốt buổi học vì lớp học đã kết thúc hoặc bị hủy."));
      return;
    }

    setPublishing(true);
    try {
      // First save any unsaved changes
      await Promise.all(
        sessionAttendance.map(async (record) => {
          const payload = buildPayloadForRecord(record);

          if (record.attendanceRecordId) {
            return api.put(`/attendance/${record.attendanceRecordId}`, payload);
          } else {
            return api.post("/attendance/record", payload);
          }
        }),
      );

      // Confirm / Lock session
      await api.post(
        `/attendance/sessions/${selectedSession.sessionId}/confirm`,
      );
      setConfirmPublishOpen(false);
      setIsConfirmed(true);
      toast.success(tr("Chốt điểm danh thành công!"), announce("edit", tr("Điểm danh")));

      // Update local sessions state
      setSessions((prev) =>
        prev.map((s) =>
          s.sessionId === selectedSession.sessionId
            ? { ...s, isConfirmed: true, attendance: tr("Đã chốt") }
            : s,
        ),
      );
    } catch (err) {
      console.error("Lỗi khi chốt điểm danh:", err);
      toast.error(parseApiError(err, tr("Chốt điểm danh thất bại!")));
    } finally {
      setPublishing(false);
    }
  };

  const selectedClass = useMemo(() => {
    return classesData.find((c) => c.classId === parseInt(selectedClassId));
  }, [classesData, selectedClassId]);

  const isClassClosed = isLockedStatus(selectedClass?.status);
  const isClassActive = isClassInProgress(selectedClass?.status);
  const isClassUpcoming = isClassNotStarted(selectedClass?.status);

  // Môn thực hành (Practical, Flight, Simulator) chỉ cần lưu, không áp dụng xác nhận/chốt điểm danh
  const isPracticalSession = useMemo(() => {
    if (!selectedSession) return false;
    if (
      selectedSession.trainingType === "Flight" ||
      selectedSession.trainingType === "Simulator"
    ) {
      return true;
    }
    const sub = subjectsList.find((s) => s.subjectId === selectedSession.subjectId);
    return sub?.subjectType === "Practical" || sub?.subjectType === "Thực hành";
  }, [selectedSession, subjectsList]);

  // BE (AttendanceService.RecordAttendanceAsync + BusinessRuleEngine.AttendanceGracePeriodHours = 48)
  // chỉ cho phép Instructor điểm danh bù trong vòng 48h sau ngày học; quá hạn → 400 và yêu cầu
  // liên hệ Academic Staff. FE cảnh báo trước (KHÔNG khóa cứng nút, giống cảnh báo lớp đã kết thúc).
  // Đã tính sẵn ở bước map danh sách buổi (xem fetchSessions) — không gọi Date.now() khi render.
  const isGraceExpired = selectedSession?.graceExpired === true;

  // Nhãn trạng thái lớp hiển thị trong dropdown chọn lớp
  const getClassStatusLabel = (status) => {
    const st = String(status || "").toLowerCase();
    if (st === "completed" || st === "đã kết thúc") return tr("Đã kết thúc");
    if (st === "cancelled" || st === "đã hủy") return tr("Đã hủy");
    if (st === "scheduled" || st === "planned") return tr("Chưa bắt đầu");
    return tr("Đang diễn ra");
  };

  // Lấy tên môn học từ subjectId của buổi — để phân biệt các buổi trùng tên
  // (mỗi môn trong lớp sinh ra bộ buổi "Session 1", "Session 2"... giống nhau).
  const getSubjectName = (subjectId) => {
    const sub = subjectsList.find((s) => s.subjectId === subjectId);
    return sub ? sub.subjectName || sub.subjectCode || "" : "";
  };

  // ── Import Excel (Bulk Import) — khớp ImportController BE ────────────────
  // GET  /import/attendance/template?sessionId=  → file xlsx (pre-fill học viên)
  // POST /import/attendance/validate?sessionId=  → ImportValidationResult { totalRows, validRows, errorRows, canCommit, errors[] }
  // POST /import/attendance/commit?sessionId=    → ImportCommitResult { imported, skipped, updated, errors[] }
  const handleDownloadTemplate = async () => {
    setImportError("");
    try {
      // Tạo template NGAY TRÊN FE từ danh sách học viên đang hiển thị trên màn hình,
      // đúng cấu trúc BE đọc được: cột A = EnrollmentId (số), cột D = Trạng thái,
      // cột E = Ghi chú, dữ liệu bắt đầu từ dòng 4.
      //
      // Vì sao không dùng template BE: `GenerateAttendanceTemplateAsync` chỉ lấy enrollment
      // có Status == "Active", trong khi dữ liệu ghi danh thực tế có thể dùng trạng thái
      // khác ("Enrolled", "Withdrawn"...) → template tải về TRỐNG danh sách học viên →
      // file không có EnrollmentId → BE đọc 0 dòng → import báo "thành công" nhưng
      // không ghi gì (trạng thái/note không đổi theo file).
      if (!Array.isArray(students) || students.length === 0) {
        setImportError(
          tr("Lớp chưa có học viên nào để tạo template điểm danh. Hãy kiểm tra ghi danh của lớp."),
        );
        return;
      }

      const aoa = [];
      // Dòng 1: tiêu đề
      aoa.push([
        `BẢNG ĐIỂM DANH - ${selectedSession.name} - ${selectedClass ? selectedClass.code : ""}`,
        "",
        "",
        "",
        "",
      ]);
      // Dòng 2: metadata (BE không đọc, chỉ để tham chiếu)
      aoa.push([
        `SessionId: ${selectedSession.sessionId}`,
        `ClassId: ${parseInt(selectedClassId, 10)}`,
        `SubjectId: ${selectedSession.subjectId ?? ""}`,
        `Ngày: ${selectedSession.date}`,
        `Môn: ${selectedSession.subjectId != null ? getSubjectName(selectedSession.subjectId) : ""}`,
      ]);
      // Dòng 3: tiêu đề cột
      aoa.push([
        "EnrollmentId",
        "Họ và tên",
        "Mã học viên",
        "Trạng thái (Present/Absent)*",
        "Ghi chú",
      ]);
      // Dòng 4+: danh sách học viên (pre-fill, user chỉ điền cột D/E)
      students.forEach((s) => {
        aoa.push([s.enrollmentId, s.name, s.code, "", ""]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 26 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Điểm danh");

      // ── Bảo vệ template: chỉ cho phép sửa cột D (Trạng thái) và E (Ghi chú) ──
      // Các cột A/B/C (EnrollmentId, Họ và tên, Mã học viên) + 3 dòng tiêu đề giữ
      // locked mặc định → bật bảo vệ sheet là toàn bộ phần còn lại bị khóa.
      // Cột D thành dropdown Present/Absent ("tích chọn") — SheetJS community
      // không ghi được checkbox thật và checkbox Excel lưu TRUE/FALSE chứ không
      // lưu text "Present"/"Absent" (BE import đọc text) nên dùng data-validation.
      // Vì SheetJS 0.18.5 không ghi được protect/validation → tự chèn XML qua CFB.
      const firstDataRow = 4;
      const lastDataRow = 3 + students.length;
      const outB64 = protectExcelTemplate(
        XLSX.write(wb, { type: "base64", bookType: "xlsx" }),
        {
          firstDataRow,
          lastDataRow,
          // Chỉ cột D (Trạng thái) + E (Ghi chú) được sửa; cột D có dropdown Present/Absent
          unlockColumns: ["D", "E"],
          dropdowns: [{ col: "D", values: ["Present", "Absent"] }],
        },
      );

      // Tải file xlsx (đã bảo vệ) xuống
      const bin = atob(outB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance_session_${selectedSession.sessionId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(tr("Tải template thành công!"));
    } catch (err) {
      console.error("Lỗi tạo template:", err);
      setImportError(parseApiError(err, "Tải template thất bại."));
    }
  };

  const handleValidateImport = async () => {
    setImportError("");
    if (!importFile) {
      setImportError(tr("Vui lòng chọn file Excel trước khi kiểm tra."));
      return;
    }
    setImportValidating(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const result = await api.postFormData(
        `/import/attendance/validate?sessionId=${selectedSession.sessionId}`,
        fd,
      );
      setImportResult(result);
    } catch (err) {
      console.error("Lỗi validate import:", err);
      setImportResult(null);
      setImportError(parseApiError(err, "Kiểm tra file thất bại."));
    } finally {
      setImportValidating(false);
    }
  };

  // Trộn dữ liệu từ file đã upload (preview) vào mảng bảng điểm danh hiện tại — map theo
  // EnrollmentId; trạng thái/ghi chú trong file LUÔN THẮNG, các field khác (attendanceRecordId...)
  // giữ nguyên. Dùng để đảm bảo bảng phản ánh ĐÚNG file sau khi import, kể cả khi dữ liệu
  // tải lại từ server bị cũ/cache hoặc lỗi âm thầm (loadAttendance có .catch(() => [])).
  const mergeFileInto = (current, preview) => {
    if (
      !Array.isArray(current) ||
      !preview ||
      !Array.isArray(preview.headers) ||
      !Array.isArray(preview.rows)
    ) {
      return current;
    }

    const colEnrollment = preview.headers.findIndex((h) =>
      /enrollmentid|enrollment/i.test(String(h)),
    );
    const colStatus = preview.headers.findIndex((h) =>
      /trạng thái|status/i.test(String(h)),
    );
    const colRemarks = preview.headers.findIndex((h) =>
      /ghi chú|remark/i.test(String(h)),
    );
    if (colEnrollment < 0 || colStatus < 0) return current;

    const fileMap = new Map();
    preview.rows.forEach((row) => {
      const enrollmentId = parseInt(row[colEnrollment], 10);
      if (Number.isNaN(enrollmentId)) return;
      const rawStatus = String(row[colStatus] ?? "").trim();
      const remarks =
        colRemarks >= 0 ? String(row[colRemarks] ?? "").trim() : "";
      fileMap.set(enrollmentId, { rawStatus, remarks });
    });
    if (fileMap.size === 0) return current;

    return current.map((s) => {
      const entry = fileMap.get(s.enrollmentId);
      if (!entry) return s;
      const isValidStatus = ATTENDANCE_STATUSES.some(
        (st) => st.value.toLowerCase() === entry.rawStatus.toLowerCase(),
      );
      return {
        ...s,
        status: isValidStatus ? entry.rawStatus : s.status,
        remarks: entry.remarks || "",
      };
    });
  };

  const handleCommitImport = async () => {
    setImportError("");
    if (!importFile) return;
    setImportCommitting(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      const result = await api.postFormData(
        `/import/attendance/commit?sessionId=${selectedSession.sessionId}`,
        fd,
      );
      setImportResult(result);
      // BE trả 200 kèm errors khi import một phần (imported > 0 nhưng có dòng bị bỏ qua) —
      // giữ modal mở để hiển thị chi tiết dòng bị bỏ qua, chỉ đóng khi import sạch hoàn toàn.
      if (
        !result ||
        !Array.isArray(result.errors) ||
        result.errors.length === 0
      ) {
        setImportModalOpen(false);
        // Phòng trường hợp BE không đọc được DÒNG nào (file sai cấu trúc template,
        // thiếu/đổi cột EnrollmentId...) — import báo "thành công" nhưng KHÔNG ghi gì,
        // nên bảng không hề thay đổi theo file. Báo rõ để user biết thay vì im lặng.
        // (Chú ý: BE mới re-import file điểm danh = UPSERT — nếu file chỉ CẬP NHẬT bản
        // ghi đã có thì imported == 0 nhưng updated > 0 → VẪN là thành công. Nếu BE
        // chưa trả `updated`, dựa vào dữ liệu file đã parse client-side để phân biệt.)
        const updatedCount =
          typeof result?.updated === "number" ? result.updated : null;
        const fileHasDataRows = (() => {
          if (
            !excelPreview ||
            !Array.isArray(excelPreview.headers) ||
            !Array.isArray(excelPreview.rows)
          )
            return false;
          const colEnrollment = excelPreview.headers.findIndex((h) =>
            /enrollmentid|enrollment/i.test(String(h)),
          );
          if (colEnrollment < 0) return false;
          return excelPreview.rows.some((r) => {
            const v = r?.[colEnrollment];
            return (
              v !== "" && v != null && !Number.isNaN(parseInt(String(v), 10))
            );
          });
        })();
        const nothingImported =
          typeof result?.imported === "number" &&
          result.imported === 0 &&
          (updatedCount === null ? !fileHasDataRows : updatedCount === 0);
        if (nothingImported) {
          toast.warning(
            tr(
              "File không có dòng dữ liệu hợp lệ nào được import. Vui lòng dùng lại template tải từ hệ thống.",
            ),
          );
          setImportResult(result);
          return;
        }
        toast.success(tr("Import điểm danh thành công!"), announce("add", tr("Điểm danh")));
        // 1) Áp NGAY dữ liệu file cho bảng (hiển thị tức thì)
        setSessionAttendance((prev) => mergeFileInto(prev, excelPreview));
        // 2) Tải lại từ server để lấy attendanceRecordId mới, rồi ÉP dữ liệu file lên
        //    trên — phòng trường hợp server trả dữ liệu cũ/cache → bảng vẫn đúng theo file
        const refreshed = await loadAttendance(selectedSession);
        if (Array.isArray(refreshed)) {
          setSessionAttendance(mergeFileInto(refreshed, excelPreview));
        }
      } else {
        toast.warning(tr("Import hoàn tất nhưng có dòng bị bỏ qua."));
        // Vẫn tải lại để các dòng mới được import hiển thị lên bảng
        loadAttendance(selectedSession);
      }
    } catch (err) {
      console.error("Lỗi commit import:", err);
      // BE trả 400 kèm ImportCommitResult JSON khi có lỗi (errors > 0 và imported == 0)
      const raw = typeof err === "string" ? err : (err && err.message) || "";
      let detail = "";
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.errors)) {
          detail = parsed.errors
            .map((e) => `- ${tr("Dòng")} ${e.row} (${e.column}): ${e.message}`)
            .join("\n");
        }
      } catch {
        /* không phải JSON — dùng fallback chung */
      }
      setImportError(detail || parseApiError(err, "Import thất bại."));
    } finally {
      setImportCommitting(false);
    }
  };

  // Môn có buổi học trong lớp đang chọn — dùng cho bộ lọc môn
  const classSubjects = useMemo(() => {
    const ids = [
      ...new Set(
        sessions
          .map((s) => s.subjectId)
          .filter((id) => id != null),
      ),
    ];
    return ids
      .map((id) => ({
        subjectId: id,
        subjectName: getSubjectName(id) || tr("Môn học"),
      }))
      .sort((a, b) => a.subjectId - b.subjectId);
  }, [sessions, subjectsList]); // eslint-disable-line react-hooks/exhaustive-deps

  // Đánh số buổi TRONG TỪNG MÔN (Buổi 1..N) trên toàn bộ danh sách — tính trước
  // khi lọc để lọc 1 môn thì số buổi vẫn đúng.
  const numberedSessions = useMemo(
    () => groupSessionsBySubject(sessions).flatMap((group) => group.sessions),
    [sessions],
  );

  // Buổi hiển thị theo bộ lọc môn (trống = tất cả)
  const visibleSessions = useMemo(() => {
    if (!subjectFilter) return numberedSessions;
    return numberedSessions.filter(
      (s) => String(s.subjectId) === subjectFilter,
    );
  }, [numberedSessions, subjectFilter]);

  // Gom theo môn: mỗi môn 1 nhóm + số buổi/đã chốt của môn đó
  const sessionGroups = useMemo(
    () => groupSessionsBySubject(visibleSessions),
    [visibleSessions],
  );
  const sessionGroupBySubjectId = useMemo(
    () => sessionGroupsBySubjectId(sessionGroups),
    [sessionGroups],
  );

  const sessionPager = usePagination(visibleSessions, {
    pageSize: 10,
    resetKey: subjectFilter,
  });

  const attendanceSheetPager = usePagination(sessionAttendance, {
    pageSize: 10,
  });

  // Attendance Sheet View
  if (selectedSession) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <nav className="breadcrumb-nav">
          <span
            className="breadcrumb-item"
            onClick={handleBackToSessions}
            style={{ cursor: "pointer", color: "white" }}
          >
            {tr("ĐIỂM DANH")}
          </span>
          <svg width="4" height="6" viewBox="0 0 4 6" fill="none">
            <path
              d="M2.3 3L0 0.7L0.7 0L3.7 3L0.7 6L0 5.3L2.3 3Z"
              fill="currentColor"
            />
          </svg>
          <span className="breadcrumb-item active">{tr(selectedSession.name)}</span>
        </nav>

        {/* Cảnh báo: buổi học đã quá hạn điểm danh bù 48h — BE chặn Instructor ghi điểm danh */}
        {isGraceExpired && !isConfirmed && !isPracticalSession && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 18px",
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderLeft: "4px solid #d97706",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#92400e",
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: "16px", lineHeight: 1 }}>⏰</span>
            <div>
              <strong>
                {tr("Buổi học đã quá hạn điểm danh bù (48 giờ)")}.
              </strong>{" "}
              {tr(
                "Hệ thống chỉ cho phép giảng viên điểm danh bù trong vòng 48 giờ sau ngày học. Vui lòng liên hệ Academic Staff để xử lý ngoại lệ.",
              )}
            </div>
          </div>
        )}

        {/* Cảnh báo: lớp chưa bắt đầu hoặc đã kết thúc/hủy — BE chặn ghi điểm danh */}
        {!isClassActive && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 18px",
              background: isClassUpcoming ? "#fffbeb" : "#fef2f2",
              border: isClassUpcoming ? "1px solid #fde68a" : "1px solid #fecaca",
              borderLeft: isClassUpcoming ? "4px solid #f59e0b" : "4px solid #ef4444",
              borderRadius: "10px",
              fontSize: "13px",
              color: isClassUpcoming ? "#92400e" : "#991b1b",
              lineHeight: 1.5,
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "18px", lineHeight: 1 }}>{isClassUpcoming ? "⏳" : "⚠️"}</span>
            <div>
              <strong>
                {isClassUpcoming ? tr("Lớp học chưa bắt đầu") : tr("Lớp học đã kết thúc / bị hủy")} ({getClassStatusLabel(selectedClass?.status)}).
              </strong>{" "}
              {isClassUpcoming
                ? tr("Chỉ có thể điểm danh khi lớp học được Academic Staff bắt đầu và chuyển sang trạng thái 'Đang diễn ra' (InProgress).")
                : tr("Hệ thống khóa chức năng ghi/sửa điểm danh đối với các lớp đã hoàn tất hoặc bị hủy.")}
            </div>
          </div>
        )}

        <section className="content-header">
          <div className="header-left">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={handleBackToSessions}
                aria-label={tr("Quay lại")}
                title={tr("Quay lại")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  border: "1px solid #dfe6f1",
                  background: "#ffffff",
                  color: "#c5a059",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c5a059";
                  e.currentTarget.style.background = "rgba(197, 160, 89, 0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#dfe6f1";
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span>{tr("Điểm danh")} — {tr(selectedSession.name)}</span>
                {selectedSession.lessonCode && (
                  <span style={{ fontSize: "13px", fontWeight: "700", background: "#e0f2fe", color: "#0369a1", padding: "3px 10px", borderRadius: "8px" }}>
                    {selectedSession.lessonCode}
                  </span>
                )}
                {selectedSession.trainingType && (
                  <span style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    padding: "3px 10px",
                    borderRadius: "8px",
                    background: selectedSession.trainingType === "Flight" ? "rgba(3, 105, 161, 0.1)" : selectedSession.trainingType === "Simulator" ? "rgba(147, 51, 234, 0.1)" : "rgba(100, 116, 139, 0.1)",
                    color: selectedSession.trainingType === "Flight" ? "#0369a1" : selectedSession.trainingType === "Simulator" ? "#7e22ce" : "#475569",
                    border: `1px solid ${selectedSession.trainingType === "Flight" ? "#bae6fd" : selectedSession.trainingType === "Simulator" ? "#e9d5ff" : "#cbd5e1"}`
                  }}>
                    {selectedSession.trainingType === "Flight" ? tr("Bay thực tế") : selectedSession.trainingType === "Simulator" ? tr("Mô phỏng (SIM)") : tr("Lý thuyết")}
                  </span>
                )}
              </h1>
            </div>
            <div className="divider-gold" />
            <p className="header-description">
              {(selectedSession.date === "TBA" ? tr("Chưa xếp lịch (TBA)") : selectedSession.date)} · {selectedSession.room} · {tr("Lớp: ")}
              {selectedClass ? selectedClass.code : "N/A"}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={() => {
                setImportModalOpen(true);
                // GIỮ file đã upload (không reset importFile) để nút "Gỡ file" còn hiển thị
                // khi mở lại modal — sau khi import thành công bảng đang khóa P/A + Note,
                // user phải gỡ file (nút Gỡ file) mới mở khóa được.
                setImportResult(null);
                setImportError("");
              }}
              className="create-btn"
              type="button"
              disabled={(isConfirmed && !isPracticalSession) || !isClassActive}
              title={!isClassActive ? (isClassUpcoming ? tr("Lớp học chưa bắt đầu") : tr("Lớp học đã kết thúc / bị hủy")) : undefined}
              style={{
                background:
                  "linear-gradient(159.93deg, #0369a1 -27.55%, #075985 127.55%)",
                opacity: (isConfirmed && !isPracticalSession) || !isClassActive ? 0.6 : 1,
                cursor: (isConfirmed && !isPracticalSession) || !isClassActive ? "not-allowed" : "pointer",
              }}
            >
              <span>{tr("NHẬP DỮ LIỆU EXCEL")}</span>
            </button>

            <button
              onClick={handleSaveAttendance}
              className="create-btn"
              type="button"
              disabled={(isConfirmed && !isPracticalSession) || !isClassActive || saving || publishing}
              title={!isClassActive ? (isClassUpcoming ? tr("Lớp học chưa bắt đầu") : tr("Lớp học đã kết thúc / bị hủy")) : undefined}
              style={{
                opacity: (isConfirmed && !isPracticalSession) || !isClassActive ? 0.6 : 1,
                cursor: (isConfirmed && !isPracticalSession) || !isClassActive ? "not-allowed" : "pointer",
              }}
            >
              <span>{saving ? tr("ĐANG LƯU...") : tr("LƯU ĐIỂM DANH")}</span>
            </button>

            {!isPracticalSession && (
              <button
                onClick={() => setConfirmPublishOpen(true)}
                className="create-btn"
                type="button"
                disabled={isConfirmed || !isClassActive || saving}
                title={!isClassActive ? (isClassUpcoming ? tr("Lớp học chưa bắt đầu") : tr("Lớp học đã kết thúc / bị hủy")) : undefined}
                style={{
                  background: isConfirmed || !isClassActive
                    ? "linear-gradient(159.93deg, #475569 -27.55%, #334155 127.55%)"
                    : "linear-gradient(159.93deg, #e11d48 -27.55%, #be123c 127.55%)",
                  opacity: isConfirmed || !isClassActive ? 0.7 : 1,
                  cursor: isConfirmed || !isClassActive ? "not-allowed" : "pointer",
                }}
              >
                <span>
                  {isConfirmed ? tr("ĐÃ KHÓA ĐIỂM DANH") : tr("CHỐT ĐIỂM DANH")}
                </span>
              </button>
            )}
          </div>
        </section>

        {/* Legend status indicators */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            padding: "12px 20px",
            background: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            fontSize: "11px",
            fontWeight: "700",
          }}
        >
          {ATTENDANCE_STATUSES.map((st) => (
            <div
              key={st.value}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "4px",
                  backgroundColor: st.color,
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {st.short}
              </span>
              <span style={{ color: "rgba(0,33,71,0.6)" }}>{tr(st.label)}</span>
            </div>
          ))}
        </div>

        {/* Attendance Sheet Table */}
        <section className="table-card">
          {(() => {
            const isFlightOrSim = selectedSession.trainingType === "Flight" || selectedSession.trainingType === "Simulator";
            const gridTemplate = isFlightOrSim
              ? "50px 110px 1fr 140px 110px 90px 130px 110px 70px"
              : "60px 140px 1fr 180px 140px 100px";

            return (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: gridTemplate,
                    alignItems: "center",
                    gap: "10px",
                    background: "linear-gradient(135deg, #06234a 0%, #041b39 100%)",
                    color: "#ffffff",
                    padding: "14px 20px",
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  <div style={{ textAlign: "center" }}>{tr("STT")}</div>
                  <div>{tr("Mã học viên")}</div>
                  <div>{tr("Học viên")}</div>
                  <div style={{ textAlign: "center" }}>
                    {tr("Trạng thái")}
                  </div>
                  {isFlightOrSim && (
                    <>
                      <div style={{ textAlign: "center" }}>{tr("Năng lực")}</div>
                      <div style={{ textAlign: "center" }}>{tr("Giờ huấn luyện")}</div>
                      <div style={{ textAlign: "center" }}>{tr("Nhật ký & Ký")}</div>
                    </>
                  )}
                  <div style={{ textAlign: "center" }}>{tr("Đánh giá nhận xét")}</div>
                  <div style={{ textAlign: "center" }}>{tr("Khóa sửa")}</div>
                </div>

                <div className="table-body">
                  {attendanceSheetPager.pageItems.map((student, idx) => (
                    <div
                      key={student.code}
                      className="table-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: gridTemplate,
                        alignItems: "center",
                        gap: "10px",
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

                      {/* Status Toggles */}
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <div
                          className="attendance-toggle-group"
                          style={{ maxWidth: "140px" }}
                        >
                          {ATTENDANCE_STATUSES.map((st) => (
                            <button
                              key={st.value}
                              onClick={() =>
                                handleToggleStatus(student.code, st.value)
                              }
                              className={`status-${st.value.toLowerCase()}${student.status === st.value ? " active" : ""}`}
                              disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                              style={{
                                cursor: (isConfirmed && !isPracticalSession) || fileStaged ? "not-allowed" : "pointer",
                                opacity: fileStaged ? 0.5 : 1,
                              }}
                            >
                              {st.short}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Flight / Simulator Specific Columns */}
                      {isFlightOrSim && (
                        <>
                          <div style={{ textAlign: "center" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                background:
                                  student.performanceGrade === "Satisfactory"
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : student.performanceGrade === "Unsatisfactory"
                                      ? "rgba(239, 68, 68, 0.15)"
                                      : "rgba(245, 158, 11, 0.15)",
                                color:
                                  student.performanceGrade === "Satisfactory"
                                    ? "#059669"
                                    : student.performanceGrade === "Unsatisfactory"
                                      ? "#dc2626"
                                      : "#d97706",
                              }}
                            >
                              {student.performanceGrade || "Satisfactory"}
                            </span>
                          </div>

                          <div
                            style={{
                              textAlign: "center",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#002147",
                            }}
                          >
                            {selectedSession.trainingType === "Flight"
                              ? student.flightHours ? `${student.flightHours}h` : "--"
                              : student.simulatorHours ? `${student.simulatorHours}h` : "--"}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "2px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => openFlightSimModal(student)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                border: "1px solid #bae6fd",
                                background: "#f0f9ff",
                                color: "#0369a1",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <span>{tr("Nhật ký & Ký")}</span>
                            </button>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                color: student.instructorSignedAt
                                  ? "#16a34a"
                                  : "#d97706",
                              }}
                            >
                              {student.instructorSignedAt
                                ? "✓ Đã ký"
                                : "⏳ Chưa ký"}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Remarks Button + nội dung note hiển thị trực tiếp */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <button
                          onClick={() => {
                            setRemarkModalStudent(student);
                            setRemarkText(student.remarks || "");
                          }}
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            padding: "5px 12px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: "700",
                            border: "1px solid #dfe6f1",
                            backgroundColor: student.remarks ? "#fffbeb" : "#f8fafc",
                            color: student.remarks ? "#d97706" : "#64748b",
                            cursor: (isConfirmed && !isPracticalSession) || fileStaged ? "not-allowed" : "pointer",
                            opacity: fileStaged ? 0.5 : 1,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
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
                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                          </svg>
                          <span>
                            {student.remarks ? tr("Xem Note") : tr("Thêm Note")}
                          </span>
                        </button>
                        {student.remarks && (
                          <div
                            title={student.remarks}
                            style={{
                              fontSize: "10px",
                              color: "#d97706",
                              maxWidth: "110px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              textAlign: "center",
                            }}
                          >
                            {student.remarks}
                          </div>
                        )}
                      </div>

                      {/* Lock Status */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {(isConfirmed && !isPracticalSession) ? (
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
                            {tr("Khóa")}
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
                            {tr("Mở")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
          <div className="table-footer">
            <Pagination
              page={attendanceSheetPager.page}
              pageCount={attendanceSheetPager.pageCount}
              onChange={attendanceSheetPager.setPage}
              total={attendanceSheetPager.total}
              pageSize={10}
            />
          </div>
        </section>

        {/* Remarks Custom Modal Overlay */}
        {remarkModalStudent &&
          createPortal(
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,33,71,0.75)",
                zIndex: 999999,
                backdropFilter: "blur(4px)",
              }}
            >
              <div
                className="dashboard-panel"
                style={{
                  width: "480px",
                  borderRadius: "16px",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
                  margin: "auto",
                }}
              >
                <div className="panel-header">
                  <h2>
                    {tr("Ghi chú nhận xét")} — {remarkModalStudent.name}
                  </h2>
                  <div
                    className="panel-action"
                    onClick={() => setRemarkModalStudent(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {tr("Đóng")}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "12px",
                  }}
                >
                  <textarea
                    value={remarkText}
                    onChange={(e) => setRemarkText(e.target.value)}
                    disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                    placeholder={tr("Nhập ghi chú nhận xét về học viên...")}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #dfe6f1",
                      fontSize: "13px",
                      outline: "none",
                      minHeight: "120px",
                      resize: "vertical",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "end",
                      gap: "12px",
                      marginTop: "8px",
                    }}
                  >
                    <button
                      onClick={() => setRemarkModalStudent(null)}
                      type="button"
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "1px solid #dfe6f1",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      {tr("HỦY BỎ")}
                    </button>
                    <button
                      onClick={() => {
                        if ((!isConfirmed || isPracticalSession) && !fileStaged) {
                          setSessionAttendance((prev) =>
                            prev.map((s) =>
                              s.code === remarkModalStudent.code
                                ? { ...s, remarks: remarkText }
                                : s,
                            ),
                          );
                        }
                        setRemarkModalStudent(null);
                      }}
                      type="button"
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        backgroundColor: "#c5a059",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "700",
                      }}
                    >
                      {tr("CẬP NHẬT")}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* Flight & Simulator Training Record Modal */}
        {flightSimModalStudent &&
          createPortal(
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,33,71,0.75)",
                zIndex: 999999,
                backdropFilter: "blur(4px)",
              }}
            >
              <div
                className="dashboard-panel"
                style={{
                  width: "680px",
                  maxWidth: "95vw",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  borderRadius: "16px",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
                  margin: "auto",
                  background: "#ffffff",
                  padding: "24px",
                }}
              >
                <div
                  className="panel-header"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "700",
                        color: "#002147",
                      }}
                    >
                      {selectedSession.trainingType === "Flight"
                        ? tr("Nhật ký Huấn luyện Bay")
                        : tr("Nhật ký Huấn luyện Mô phỏng")}{" "}
                      — {flightSimModalStudent.name} (
                      {flightSimModalStudent.code})
                    </h2>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "12px",
                        color: "#64748b",
                      }}
                    >
                      {selectedSession.lessonCode
                        ? `Bài học: ${selectedSession.lessonCode} · `
                        : ""}
                      {selectedSession.name} · {selectedSession.date}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFlightSimModalStudent(null)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "18px",
                      color: "#64748b",
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {/* Performance Grade */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#1e293b",
                        marginBottom: "6px",
                      }}
                    >
                      {tr("Đánh giá năng lực")}
                    </label>
                    <select
                      value={flightSimForm.performanceGrade || "Satisfactory"}
                      onChange={(e) =>
                        setFlightSimForm({
                          ...flightSimForm,
                          performanceGrade: e.target.value,
                        })
                      }
                      disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "13px",
                      }}
                    >
                      <option value="Satisfactory">
                        {tr("Đạt yêu cầu")}
                      </option>
                      <option value="Unsatisfactory">
                        {tr("Chưa đạt")}
                      </option>
                      <option value="Incomplete">
                        {tr("Chưa hoàn thành")}
                      </option>
                    </select>
                  </div>

                  {/* Hours Grid */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#1e293b",
                        marginBottom: "8px",
                      }}
                    >
                      {tr("Giờ huấn luyện")}
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "10px",
                      }}
                    >
                      {selectedSession.trainingType === "Flight" ? (
                        <div>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {tr("Giờ bay thực tế")}
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0.0"
                            value={flightSimForm.flightHours}
                            onChange={(e) =>
                              setFlightSimForm({
                                ...flightSimForm,
                                flightHours: e.target.value,
                              })
                            }
                            disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              fontSize: "12px",
                            }}
                          />
                        </div>
                      ) : (
                        <div>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>
                            {tr("Giờ buồng lái mô phỏng")}
                          </span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0.0"
                            value={flightSimForm.simulatorHours}
                            onChange={(e) =>
                              setFlightSimForm({
                                ...flightSimForm,
                                simulatorHours: e.target.value,
                              })
                            }
                            disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              fontSize: "12px",
                            }}
                          />
                        </div>
                      )}
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Giờ bay kèm")}
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={flightSimForm.dualHours}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              dualHours: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Giờ bay đơn")}
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={flightSimForm.soloHours}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              soloHours: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Giờ lái chính (PIC)")}
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={flightSimForm.picHours}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              picHours: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Giờ bay đêm")}
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={flightSimForm.nightHours}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              nightHours: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Giờ bay bằng thiết bị")}
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={flightSimForm.instrumentHours}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              instrumentHours: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Giờ bay đường dài")}
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="0.0"
                          value={flightSimForm.crossCountryHours}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              crossCountryHours: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Landings & Aircraft/SIM Device */}
                  {selectedSession.trainingType === "Flight" ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Hạ cánh ban ngày")}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={flightSimForm.dayLandings}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              dayLandings: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Hạ cánh ban đêm")}
                        </span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={flightSimForm.nightLandings}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              nightLandings: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Số hiệu tàu bay")}
                        </span>
                        <input
                          type="text"
                          placeholder="VN-C172"
                          value={flightSimForm.aircraftRegistration}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              aircraftRegistration: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        {tr("Thiết bị buồng lái mô phỏng")}
                      </span>
                      <input
                        type="text"
                        placeholder="ALX-FNPT-II"
                        value={flightSimForm.simulatorDevice}
                        onChange={(e) =>
                          setFlightSimForm({
                            ...flightSimForm,
                            simulatorDevice: e.target.value,
                          })
                        }
                        disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "12px",
                        }}
                      />
                    </div>
                  )}

                  {/* Route info (for Flight) */}
                  {selectedSession.trainingType === "Flight" && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 2fr",
                        gap: "10px",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Sân bay khởi hành (ICAO)")}
                        </span>
                        <input
                          type="text"
                          placeholder="VVTS"
                          value={flightSimForm.departureIcao}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              departureIcao: e.target.value.toUpperCase(),
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Sân bay đến (ICAO)")}
                        </span>
                        <input
                          type="text"
                          placeholder="VVTS"
                          value={flightSimForm.arrivalIcao}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              arrivalIcao: e.target.value.toUpperCase(),
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                      <div>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          {tr("Đường bay / Bài huấn luyện")}
                        </span>
                        <input
                          type="text"
                          placeholder="Circuit Pattern / Local Area"
                          value={flightSimForm.route}
                          onChange={(e) =>
                            setFlightSimForm({
                              ...flightSimForm,
                              route: e.target.value,
                            })
                          }
                          disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Comments */}
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#1e293b",
                        marginBottom: "4px",
                      }}
                    >
                      {tr("Nhận xét của giảng viên")}
                    </label>
                    <textarea
                      value={flightSimForm.instructorComments}
                      onChange={(e) =>
                        setFlightSimForm({
                          ...flightSimForm,
                          instructorComments: e.target.value,
                        })
                      }
                      disabled={(isConfirmed && !isPracticalSession) || fileStaged}
                      placeholder="Nhận xét thao tác tiếp cận, hạ cánh, xử lý tình huống..."
                      style={{
                        width: "100%",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12px",
                        minHeight: "60px",
                      }}
                    />
                  </div>

                  {/* Digital Sign-off Status */}
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "#002147",
                          }}
                        >
                          {flightSimModalStudent.instructorSignedAt ? (
                            <span style={{ color: "#16a34a" }}>
                              {tr("✓ Giảng viên đã ký xác nhận")} (
                              {new Date(
                                flightSimModalStudent.instructorSignedAt,
                              ).toLocaleString("vi-VN")}
                              )
                            </span>
                          ) : (
                            <span style={{ color: "#d97706" }}>
                              {tr("⏳ Giảng viên chưa ký xác nhận")}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#64748b",
                            marginTop: "2px",
                          }}
                        >
                          {flightSimModalStudent.studentSignedAt ? (
                            <span style={{ color: "#0284c7" }}>
                              ✓ Học viên đã ký nhận (
                              {new Date(
                                flightSimModalStudent.studentSignedAt,
                              ).toLocaleString("vi-VN")}
                              )
                            </span>
                          ) : (
                            <span>Chờ học viên ký điện tử sau buổi học</span>
                          )}
                        </div>
                      </div>

                      {!flightSimModalStudent.instructorSignedAt && (
                          <button
                            type="button"
                            onClick={() =>
                              handleInstructorSignRecord(flightSimModalStudent)
                            }
                            disabled={signingRecord || (isConfirmed && !isPracticalSession)}
                            style={{
                              background:
                                "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: "700",
                              cursor:
                                signingRecord || (isConfirmed && !isPracticalSession)
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {signingRecord
                              ? tr("Đang ký...")
                              : tr("✍️ KÝ XÁC NHẬN")}
                          </button>
                        )}
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "10px",
                      marginTop: "8px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setFlightSimModalStudent(null)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      {tr("ĐÓNG")}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveFlightSimModal}
                      disabled={(isConfirmed && !isPracticalSession) || fileStaged || savingModal}
                      style={{
                        padding: "8px 18px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#c5a059",
                        color: "#ffffff",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor:
                          (isConfirmed && !isPracticalSession) || fileStaged || savingModal
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {savingModal ? tr("ĐANG LƯU...") : tr("LƯU THÔNG SỐ")}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* Toast notifications */}
        <toast.ToastContainer />

        {/* Import Excel Modal */}
        {importModalOpen &&
          createPortal(
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: "100vw",
                height: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,33,71,0.75)",
                zIndex: 999999,
                backdropFilter: "blur(4px)",
              }}
            >
              <div
                className="dashboard-panel"
                style={{
                  width: "600px",
                  borderRadius: "16px",
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
                  margin: "auto",
                }}
              >
                <div className="panel-header">
                  <h2>
                    {tr("Import điểm danh Excel")} — {tr(selectedSession.name)}
                  </h2>
                  <div
                    className="panel-action"
                    onClick={() => setImportModalOpen(false)}
                    style={{ cursor: "pointer" }}
                  >
                    {tr("Đóng")}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    marginTop: "12px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(0,33,71,0.6)",
                      margin: 0,
                    }}
                  >
                    {tr(
                      "Tải template, điền trạng thái (Present/Absent) cho từng học viên, sau đó kiểm tra và nhập dữ liệu.",
                    )}
                  </p>

                  {/* Bước 1: Tải template */}
                  <button
                    onClick={handleDownloadTemplate}
                    type="button"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "#f8fafc",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "700",
                      color: "#002147",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    ⬇ {tr("Tải template Excel (đã pre-fill học viên)")}
                  </button>

                  {/* Bước 2: Chọn file + validate */}
                  <div className="file-picker">
                    <label
                      className={`file-picker-trigger${importFile ? " has-file" : ""}`}
                    >
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={async (e) => {
                          const file = e.target.files?.[0] || null;
                          setImportFile(file);
                          setImportResult(null);
                          setImportError("");
                          if (file) {
                            try {
                              const preview = await parseExcelPreview(file);
                              setExcelPreview(preview);
                            } catch (err) {
                              console.error("Lỗi đọc file Excel:", err);
                              setExcelPreview(null);
                            }
                          } else {
                            setExcelPreview(null);
                          }
                        }}
                      />
                      <span className="file-picker-icon">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                          <polyline points="13 2 13 9 20 9" />
                        </svg>
                      </span>
                      <span className="file-picker-info">
                        <span
                          className="file-picker-title"
                          title={importFile ? importFile.name : ""}
                        >
                          {importFile
                            ? importFile.name
                            : tr("Chọn file Excel (.xlsx / .xls)")}
                        </span>
                        <span className="file-picker-sub">
                          {importFile
                            ? `${(importFile.size / 1024).toFixed(1)} KB · ${tr(
                                "Bấm để chọn file khác",
                              )}`
                            : tr("Chọn tệp để kiểm tra và nhập dữ liệu")}
                        </span>
                      </span>
                    </label>

                    {importFile && (
                      <button
                        type="button"
                        className="file-picker-clear"
                        onClick={() => {
                          setImportFile(null);
                          setImportResult(null);
                          setImportError("");
                          setExcelPreview(null);
                        }}
                        title={tr("Bỏ chọn tệp")}
                      >
                        ×
                      </button>
                    )}

                    <button
                      onClick={handleValidateImport}
                      type="button"
                      disabled={importValidating || importCommitting}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#c5a059",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "700",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {importValidating
                        ? tr("Đang kiểm tra...")
                        : tr("Kiểm tra file")}
                    </button>
                  </div>

                  {/* Xem trước dữ liệu trong file Excel */}
                  {excelPreview && (
                    <ExcelPreviewTable
                      headers={excelPreview.headers}
                      rows={excelPreview.rows}
                      tr={tr}
                    />
                  )}

                  {importError && (
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#fef2f2",
                        border: "1px solid #fca5a5",
                        borderRadius: "8px",
                        color: "#b91c1c",
                        fontSize: "12px",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {importError}
                    </div>
                  )}

                  {/* Kết quả validate (dry-run) */}
                  {importResult &&
                    typeof importResult.totalRows === "number" && (
                      <div
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "12px",
                          background: "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#334155",
                              padding: "6px 10px",
                              background: "#fff",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {tr("Tổng dòng")}: {importResult.totalRows}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#15803d",
                              padding: "6px 10px",
                              background: "#f0fdf4",
                              borderRadius: "6px",
                              border: "1px solid #bbf7d0",
                            }}
                          >
                            {tr("Hợp lệ")}: {importResult.validRows}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#b91c1c",
                              padding: "6px 10px",
                              background: "#fef2f2",
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                            }}
                          >
                            {tr("Lỗi")}: {importResult.errorRows}
                          </span>
                        </div>
                        {Array.isArray(importResult.errors) &&
                          importResult.errors.length > 0 && (
                            <div
                              style={{
                                marginTop: "10px",
                                maxHeight: "160px",
                                overflow: "auto",
                              }}
                            >
                              {importResult.errors.map((e, i) => (
                                <div
                                  key={i}
                                  style={{
                                    fontSize: "11px",
                                    padding: "4px 8px",
                                    background: "#fff",
                                    borderRadius: "6px",
                                    marginBottom: "4px",
                                    color: "#b91c1c",
                                  }}
                                >
                                  {tr("Dòng")} {e.row} · {e.column}: {e.message}
                                </div>
                              ))}
                            </div>
                          )}
                        {importResult.canCommit && (
                          <button
                            onClick={handleCommitImport}
                            type="button"
                            disabled={importCommitting}
                            style={{
                              marginTop: "12px",
                              width: "100%",
                              padding: "10px",
                              borderRadius: "8px",
                              border: "none",
                              background: "#16a34a",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "700",
                            }}
                          >
                            {importCommitting
                              ? tr("Đang nhập dữ liệu...")
                              : tr("✅ Nhập dữ liệu (Commit)")}
                          </button>
                        )}
                      </div>
                    )}

                  {/* Kết quả commit */}
                  {importResult &&
                    typeof importResult.imported === "number" && (
                      <div
                        style={{
                          border: "1px solid #bbf7d0",
                          borderRadius: "10px",
                          padding: "12px",
                          background: "#f0fdf4",
                          fontSize: "12px",
                          color: "#166534",
                          fontWeight: "600",
                        }}
                      >
                        {tr("Đã nhập")}: {importResult.imported} ·{" "}
                        {tr("Bỏ qua")}: {importResult.skipped}
                        {typeof importResult.updated === "number" &&
                          importResult.updated > 0 && (
                            <>
                              {" "}· {tr("Đã cập nhật")}: {importResult.updated}
                            </>
                          )}
                        {Array.isArray(importResult.errors) &&
                          importResult.errors.length > 0 && (
                            <div style={{ marginTop: "8px" }}>
                              {importResult.errors.map((e, i) => (
                                <div
                                  key={i}
                                  style={{ fontSize: "11px", color: "#b91c1c" }}
                                >
                                  {tr("Dòng")} {e.row} · {e.column}: {e.message}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* Confirm publish modal */}
        <ConfirmModal
          isOpen={confirmPublishOpen}
          onClose={() => setConfirmPublishOpen(false)}
          onConfirm={handleConfirmAttendance}
          title={tr("Xác nhận chốt điểm danh")}
          message={tr("Bạn có chắc chắn muốn chốt và khóa bảng điểm danh này?")}
          confirmText={tr("CHỐT ĐIỂM DANH")}
          cancelText={tr("HỦY BỎ")}
          confirmVariant="danger"
          loading={publishing}
        />
      </div>
    );
  }

  // Session Selector List
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <section className="content-header">
        <div className="header-left">
          <h1>{tr("Điểm danh lớp học")}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr(
              "Chọn lớp học và buổi học cụ thể để thực hiện điểm danh học viên.",
            )}
          </p>
        </div>
      </section>

      {/* Class Selector Bar */}
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
          {tr("Chọn lớp:")}
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
          onChange={(e) => {
            setSelectedClassId(e.target.value);
            setSubjectFilter("");
          }}
        >
          {classesData.map((c) => (
            <option key={c.classId} value={c.classId}>
              {c.name} ({c.code}) — {getClassStatusLabel(c.status)}
            </option>
          ))}
        </select>

        <label
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "rgba(0,33,71,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginLeft: "8px",
          }}
        >
          {tr("Chọn môn:")}
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
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="">{tr("Tất cả môn học")}</option>
          {classSubjects.map((sub) => (
            <option key={sub.subjectId} value={String(sub.subjectId)}>
              {sub.subjectName}
            </option>
          ))}
        </select>
      </div>

      {/* Sessions list */}
      <section className="table-card">
        <div
          className="table-header"
          style={{
            display: "grid",
            gridTemplateColumns: "60px 120px 1fr 160px 140px 140px",
            alignItems: "center",
            gap: "12px",
            background: "linear-gradient(135deg, #06234a 0%, #041b39 100%)",
            color: "#ffffff",
            padding: "12px 20px",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ textAlign: "center" }}>{tr("STT")}</div>
          <div>{tr("Ngày học")}</div>
          <div>{tr("Chuyên đề / Buổi học")}</div>
          <div>{tr("Địa điểm / Phòng")}</div>
          <div style={{ textAlign: "center" }}>{tr("Trạng thái chốt")}</div>
          <div style={{ textAlign: "right", paddingRight: "24px" }}>
            {tr("Thao tác")}
          </div>
        </div>

        <div className="table-body">
          {visibleSessions.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "rgba(0,33,71,0.4)",
                fontStyle: "italic",
              }}
            >
              {tr("Không tìm thấy buổi học nào cho lớp học hiện tại.")}
            </div>
          ) : (
            sessionPager.pageItems.map((session, rowIndex) => {
              // Buổi đầu của mỗi môn trên trang này → in tiêu đề nhóm môn
              const previous =
                rowIndex > 0 ? sessionPager.pageItems[rowIndex - 1] : null;
              const startsGroup =
                !previous ||
                String(previous.subjectId) !== String(session.subjectId);
              const continuesFromPreviousPage =
                startsGroup && rowIndex === 0 && sessionPager.page > 1;
              const group = sessionGroupBySubjectId.get(
                String(session.subjectId),
              );

              return (
                <Fragment key={session.sessionId}>
                  {startsGroup && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        flexWrap: "wrap",
                        padding: "10px 20px",
                        background: "rgba(197, 160, 89, 0.08)",
                        borderTop: "1px solid #e5e7eb",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            color: "#c5a059",
                          }}
                        >
                          {tr("Môn học")}
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#002147",
                          }}
                        >
                          {getSubjectName(session.subjectId) || tr("Môn học")}
                          {continuesFromPreviousPage
                            ? ` (${tr("tiếp theo")})`
                            : ""}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "rgba(0,33,71,0.65)",
                        }}
                      >
                        {`${group?.count ?? 1} ${tr("buổi")}`}
                        {group && !session.isPractical
                          ? ` · ${group.confirmedCount}/${group.count} ${tr("đã chốt")}`
                          : ""}
                      </span>
                    </div>
                  )}
              <div
                className="table-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 120px 1fr 160px 140px 140px",
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
                  {String(session.indexInSubject ?? 0).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "#002147",
                  }}
                >
                  {session.date === "TBA" ? tr("Chưa xếp lịch (TBA)") : session.date}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#002147",
                  }}
                >
                  {tr(session.name)}
                </span>
                <span style={{ fontSize: "12px", color: "rgba(0,33,71,0.6)" }}>
                  {session.room}
                </span>
                <div style={{ textAlign: "center" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      backgroundColor: session.isPractical
                        ? "rgba(14, 165, 233, 0.12)"
                        : session.isConfirmed
                          ? "rgba(239, 68, 68, 0.08)"
                          : "rgba(34, 197, 94, 0.08)",
                      color: session.isPractical
                        ? "#0284c7"
                        : session.isConfirmed
                          ? "#ef4444"
                          : "#16a34a",
                    }}
                  >
                    {session.attendance}
                  </span>
                </div>
                <div style={{ textAlign: "right", paddingRight: "12px" }}>
                  <button
                    onClick={() => loadAttendance(session)}
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
                    {tr("Điểm danh")}
                  </button>
                </div>
              </div>
                </Fragment>
              );
            })
          )}
        </div>

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
    </div>
  );
};

export default InstructorAttendance;
