import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { api, parseApiError } from "../utils/api";
import { useToast } from "../components/Toast";
import ConfirmModal from "../components/ConfirmModal";
import ExcelPreviewTable from "../components/ExcelPreviewTable";
import { parseExcelPreview } from "../utils/excelPreview";
import { protectExcelTemplate } from "../utils/excelTemplateProtect";
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";
import { useLanguage } from "../context/LanguageContext";
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

const InstructorAttendance = () => {
  const { tr } = useLanguage();
  const [classesData, setClassesData] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState(""); // "" = tất cả môn
  const [selectedSession, setSelectedSession] = useState(null);

  // Student list and attendance records
  const [students, setStudents] = useState([]);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedBy, setConfirmedBy] = useState("");

  // Note remarks modal state
  const [remarkModalStudent, setRemarkModalStudent] = useState(null);
  const [remarkText, setRemarkText] = useState("");

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
          api.get("/classes").catch(() => []),
          api.get("/courses").catch(() => []),
          api.get("/subjects").catch(() => []),
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
            studentsCount: "0/0",
            status: cls.status || tr("Đang diễn ra"),
            // Giữ nguyên danh sách phân công giảng viên theo môn của lớp (từ BE) —
            // dùng để chỉ hiển thị buổi của môn mình được phân công.
            assignments: Array.isArray(cls.instructorAssignments)
              ? cls.instructorAssignments
              : [],
          };
        });
        setClassesData(mapped);
        setSubjectsList(Array.isArray(apiSubjects) ? apiSubjects : []);
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

            return {
              sessionId: s.sessionId,
              subjectId: s.subjectId ?? null,
              stt: String(idx + 1).padStart(2, "0"),
              date: dateStr,
              name: s.sessionTitle || tr("Buổi học"),
              room: s.location || tr("Phòng học"),
              instructor: getCurrentInstructorName(),
              attendance: s.isConfirmed ? tr("Đã chốt") : tr("Chưa chốt"),
              isConfirmed: s.isConfirmed || false,
            };
          }),
        );
        setSessions(mapped);
      } catch (err) {
        console.error("Lỗi khi tải danh sách buổi học:", err);
      }
    };
    fetchSessions();
  }, [selectedClassId, classesData]);

  // Load students and attendance records when a session is selected
  const loadAttendance = async (session) => {
    setSelectedSession(session);
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
        (a) => a.sessionId === session.sessionId,
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

      const mappedAttendance = mappedStudents.map((student) => {
        // Match by enrollmentId instead of accountId
        const record = sessionRecords.find(
          (r) => r.enrollmentId === student.enrollmentId,
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
    if (isConfirmed || fileStaged) return; // Buổi đã chốt / đang có file import
    setSessionAttendance((prev) =>
      prev.map((s) => (s.code === code ? { ...s, status } : s)),
    );
  };

  const handleSaveAttendance = async () => {
    if (isConfirmed) return;
    setSaving(true);
    try {
      await Promise.all(
        sessionAttendance.map(async (record) => {
          const payload = {
            sessionId: selectedSession.sessionId,
            enrollmentId: record.enrollmentId || 1,
            status: record.status,
            remarks: record.remarks || "",
          };

          if (record.attendanceRecordId) {
            // Update
            return api.put(`/attendance/${record.attendanceRecordId}`, {
              status: record.status,
              remarks: record.remarks || "",
            });
          } else {
            // Create
            return api.post("/attendance/record", payload);
          }
        }),
      );

      toast.success(tr("Lưu điểm danh thành công!"));
      // Reload records to fetch new IDs
      loadAttendance(selectedSession);
    } catch (err) {
      console.error("Lỗi khi lưu điểm danh:", err);
      toast.error(tr("Lưu điểm danh thất bại!"));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAttendance = async () => {
    if (isConfirmed) return;

    setPublishing(true);
    try {
      // First save any unsaved changes
      await Promise.all(
        sessionAttendance.map(async (record) => {
          const payload = {
            sessionId: selectedSession.sessionId,
            enrollmentId: record.enrollmentId || 1,
            status: record.status,
            remarks: record.remarks || "",
          };

          if (record.attendanceRecordId) {
            return api.put(`/attendance/${record.attendanceRecordId}`, {
              status: record.status,
              remarks: record.remarks || "",
            });
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
      toast.success(tr("Chốt điểm danh thành công!"));

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
      toast.error(tr("Chốt điểm danh thất bại!"));
    } finally {
      setPublishing(false);
    }
  };

  const selectedClass = useMemo(() => {
    return classesData.find((c) => c.classId === parseInt(selectedClassId));
  }, [classesData, selectedClassId]);

  // Lớp ĐÃ KẾT THÚC / BỊ HỦY → ETR học viên thường đã Completed/Locked → BE chặn mọi thay đổi
  // điểm danh (ImmutabilityValidator: "Cannot modify ... because the related ETRCourseRecord
  // is Completed or Locked"). Hiển thị cảnh báo, KHÔNG khóa cứng nút — vì sau khi dữ liệu/trạng
  // thái được sửa (lớp mở lại / ETR mở khóa) luồng import phải chạy được ngay.
  // Lớp đã kết thúc/hủy → ETR học viên thường đã Completed/Locked → BE chặn ghi điểm danh
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

  const isClassClosed = isLockedStatus(selectedClass?.status);

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
        toast.success(tr("Import điểm danh thành công!"));
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

  // Buổi hiển thị theo bộ lọc môn (trống = tất cả)
  const visibleSessions = useMemo(() => {
    if (!subjectFilter) return sessions;
    return sessions.filter((s) => String(s.subjectId) === subjectFilter);
  }, [sessions, subjectFilter]);

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
            onClick={() => setSelectedSession(null)}
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

        {/* Cảnh báo: lớp đã kết thúc/hủy — BE chặn ghi điểm danh (ETR học viên đã khóa) */}
        {isClassClosed && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 18px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderLeft: "4px solid #ef4444",
              borderRadius: "10px",
              fontSize: "12px",
              color: "#991b1b",
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: "16px", lineHeight: 1 }}>⚠️</span>
            <div>
              <strong>{tr("Lớp học đã kết thúc / bị hủy")}.</strong>{" "}
              {tr(
                "Nếu hồ sơ ETR của học viên đã hoàn tất và bị khóa, hệ thống sẽ từ chối khi lưu / chốt / import điểm danh cho các buổi của lớp này. Hãy kiểm tra trạng thái lớp và ETR của học viên.",
              )}
            </div>
          </div>
        )}

        <section className="content-header">
          <div className="header-left">
            <h1>
              {tr("Điểm danh")} — {tr(selectedSession.name)}
            </h1>
            <div className="divider-gold" />
            <p className="header-description">
              {selectedSession.date} · {selectedSession.room} · {tr("Lớp: ")}
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
              disabled={isConfirmed}
              style={{
                background:
                  "linear-gradient(159.93deg, #0369a1 -27.55%, #075985 127.55%)",
                opacity: isConfirmed ? 0.6 : 1,
                cursor: isConfirmed ? "not-allowed" : "pointer",
              }}
            >
              <span>{tr("NHẬP DỮ LIỆU EXCEL")}</span>
            </button>

            <button
              onClick={handleSaveAttendance}
              className="create-btn"
              type="button"
              disabled={isConfirmed || saving || publishing}
              style={{
                opacity: isConfirmed ? 0.6 : 1,
                cursor: isConfirmed ? "not-allowed" : "pointer",
              }}
            >
              <span>{tr("LƯU ĐIỂM DANH")}</span>
            </button>

            <button
              onClick={() => setConfirmPublishOpen(true)}
              className="create-btn"
              type="button"
              disabled={isConfirmed || saving}
              style={{
                background: isConfirmed
                  ? "linear-gradient(159.93deg, #475569 -27.55%, #334155 127.55%)"
                  : "linear-gradient(159.93deg, #e11d48 -27.55%, #be123c 127.55%)",
                opacity: isConfirmed ? 0.9 : 1,
                cursor: isConfirmed ? "not-allowed" : "pointer",
              }}
            >
              <span>
                {isConfirmed ? tr("ĐÃ KHÓA ĐIỂM DANH") : tr("CHỐT ĐIỂM DANH")}
              </span>
            </button>
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 140px 1fr 180px 140px 100px",
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
            <div style={{ textAlign: "center" }}>{tr("STT")}</div>
            <div>{tr("Mã học viên")}</div>
            <div>{tr("Học viên")}</div>
            <div style={{ textAlign: "center" }}>
              {tr("Trạng thái điểm danh")}
            </div>
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
                  gridTemplateColumns: "60px 140px 1fr 180px 140px 100px",
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

                {/* Status Toggles */}
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div
                    className="attendance-toggle-group"
                    style={{ maxWidth: "180px" }}
                  >
                    {ATTENDANCE_STATUSES.map((st) => (
                      <button
                        key={st.value}
                        onClick={() =>
                          handleToggleStatus(student.code, st.value)
                        }
                        className={`status-${st.value.toLowerCase()}${student.status === st.value ? " active" : ""}`}
                        disabled={isConfirmed || fileStaged}
                        style={{
                          cursor: isConfirmed || fileStaged ? "not-allowed" : "pointer",
                          opacity: fileStaged ? 0.5 : 1,
                        }}
                      >
                        {st.short}
                      </button>
                    ))}
                  </div>
                </div>

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
                    disabled={isConfirmed || fileStaged}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "700",
                      border: "1px solid #dfe6f1",
                      backgroundColor: student.remarks ? "#fffbeb" : "#f8fafc",
                      color: student.remarks ? "#d97706" : "#64748b",
                      cursor: isConfirmed || fileStaged ? "not-allowed" : "pointer",
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
                        maxWidth: "130px",
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
                  {isConfirmed ? (
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
                    disabled={isConfirmed || fileStaged}
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
                        if (!isConfirmed && !fileStaged) {
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
              {isLockedStatus(c.status) ? "🔒 " : ""}
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
            sessionPager.pageItems.map((session) => (
              <div
                key={session.sessionId}
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
                    fontWeight: "700",
                    color: "#002147",
                  }}
                >
                  {tr(session.name)}
                  {session.subjectId != null &&
                    getSubjectName(session.subjectId) && (
                      <span
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "rgba(0,33,71,0.5)",
                          marginTop: "2px",
                        }}
                      >
                        {getSubjectName(session.subjectId)}
                      </span>
                    )}
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
                      backgroundColor: session.isConfirmed
                        ? "rgba(239, 68, 68, 0.08)"
                        : "rgba(34, 197, 94, 0.08)",
                      color: session.isConfirmed ? "#ef4444" : "#16a34a",
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
            ))
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
