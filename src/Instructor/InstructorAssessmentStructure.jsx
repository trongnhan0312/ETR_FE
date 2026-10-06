import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { api, parseApiError } from "../utils/api";
import { announce } from "../utils/crudNotify";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";
import "./instructor.scss";

const ASSESSMENT_TYPES = [
  { value: "Theory", label: "Lý thuyết (Tính điểm %)" },
  { value: "Practical", label: "Thực hành (Tính điểm %)" },
];

const EMPTY_ASSESSMENT = {
  componentName: "",
  assessmentType: "Theory",
  weight: "",
  passingScore: "",
  isRequired: true,
  displayOrder: 1,
};

const EMPTY_CHECKLIST = {
  itemName: "",
  description: "",
  isRequired: true,
  displayOrder: 1,
};

const getAssessmentTypeName = (type, tr, lang) => {
  if (lang === "en") {
    if (String(type).toLowerCase() === "theory") return "Theory (Graded %)";
    if (String(type).toLowerCase() === "practical") return "Practical (Graded %)";
  }
  const found = ASSESSMENT_TYPES.find(
    (t) => t.value.toLowerCase() === String(type || "").toLowerCase(),
  );
  return found ? (tr ? tr(found.label) : found.label) : type || "—";
};

const AssessmentModal = ({
  form,
  isEdit,
  error,
  saving,
  onCancel,
  onSubmit,
  onFormUpdate,
}) => {
  const { tr, lang } = useLanguage();
  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-container"
        style={{ width: "560px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            {isEdit
              ? (lang === 'en' ? 'Update Assessment' : tr("Cập nhật Assessment"))
              : (lang === 'en' ? 'Create Assessment' : tr("Tạo Assessment"))}
          </h2>
          <button
            className="close-btn"
            onClick={onCancel}
            type="button"
            aria-label={tr('Đóng')}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              fontSize: "12px",
              color: "#1e40af",
              lineHeight: 1.4,
              marginBottom: "12px",
            }}
          >
            💡 {lang === 'en'
              ? "Assessments are tests graded 0-100 weighted (%) into course average. Mandatory Pass/Fail skill checks are configured in Practical Checklists below."
              : tr("Assessment là bài thi/kiểm tra tính điểm số (0-100) và quy đổi theo Trọng số (%) vào điểm tổng kết môn. Bảng kiểm thao tác bắt buộc Đạt/Không đạt (Pass/Fail) được cấu hình tại Practical Checklists bên dưới.")}
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#be123c",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label>{lang === 'en' ? "Assessment Name" : tr('Tên đánh giá')}</label>
            <input
              type="text"
              value={form?.componentName || ""}
              placeholder={lang === 'en' ? "e.g., Final Theory Exam" : tr('VD: Kiểm tra cuối kỳ LT')}
              onChange={(e) => onFormUpdate({ ...form, componentName: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'en' ? "Assessment Type" : tr('Loại đánh giá')}</label>
              <select
                value={form?.assessmentType || "Theory"}
                onChange={(e) => onFormUpdate({ ...form, assessmentType: e.target.value })}
              >
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {lang === 'en'
                      ? (t.value === 'Theory' ? 'Theory (Graded %)' : 'Practical (Graded %)')
                      : tr(t.label)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{lang === 'en' ? "Weight (%)" : tr('Trọng số (%)')}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={form?.weight === "" || form?.weight == null ? "" : form.weight}
                placeholder={lang === 'en' ? "e.g., 30" : "VD: 30"}
                onChange={(e) => {
                  const val = e.target.value;
                  onFormUpdate({ ...form, weight: val === "" ? "" : val });
                }}
              />
              <small style={{ fontSize: "10px", color: "rgba(0,33,71,0.5)" }}>
                {lang === 'en' ? "Total weight of all assessments = 100%" : tr('Tổng trọng số các assessment = 100%')}
              </small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{lang === 'en' ? "Passing Score" : tr('Điểm đạt')}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={form?.passingScore === "" || form?.passingScore == null ? "" : form.passingScore}
                placeholder={lang === 'en' ? "e.g., 80" : "VD: 80"}
                onChange={(e) => {
                  const val = e.target.value;
                  onFormUpdate({ ...form, passingScore: val === "" ? "" : val });
                }}
              />
            </div>
            <div className="form-group">
              <label>{lang === 'en' ? "Display Order" : tr('Thứ tự hiển thị')}</label>
              <input
                type="number"
                min="0"
                value={form?.displayOrder === "" || form?.displayOrder == null ? "" : form.displayOrder}
                placeholder="1"
                onChange={(e) => {
                  const val = e.target.value;
                  onFormUpdate({ ...form, displayOrder: val === "" ? "" : val });
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={!!form?.isRequired}
                onChange={(e) => onFormUpdate({ ...form, isRequired: e.target.checked })}
                style={{ cursor: "pointer" }}
              />
              <span style={{ textTransform: "none" }}>{lang === 'en' ? "Mandatory" : tr('Bắt buộc')}</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" type="button" onClick={onCancel}>
            {lang === 'en' ? "Cancel" : tr('Hủy bỏ')}
          </button>
          <button
            className="modal-submit-btn"
            type="button"
            onClick={onSubmit}
            disabled={saving}
            style={{
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? (lang === 'en' ? "Saving..." : tr("Đang lưu...")) : (lang === 'en' ? "Save" : tr("Lưu"))}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const ChecklistModal = ({
  form,
  isEdit,
  error,
  saving,
  onCancel,
  onSubmit,
  onFormUpdate,
}) => {
  const { tr, lang } = useLanguage();
  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-container"
        style={{ width: "560px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>
            {isEdit
              ? (lang === 'en' ? 'Update Practical Item' : tr("Cập nhật Mục thực hành"))
              : (lang === 'en' ? 'Create Practical Item' : tr("Tạo Mục thực hành"))}
          </h2>
          <button
            className="close-btn"
            onClick={onCancel}
            type="button"
            aria-label={tr('Đóng')}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              fontSize: "12px",
              color: "#166534",
              lineHeight: 1.4,
              marginBottom: "12px",
            }}
          >
            💡 {lang === 'en'
              ? "Practical Checklist covers mandatory Pass/Fail skills required for subject sign-off (not weighted in average)."
              : tr("Practical Checklist là bảng kiểm thao tác / kỹ năng thực hành bắt buộc phải Đạt (Pass/Fail) để đủ điều kiện ký xác nhận hoàn thành môn học (không tính % trọng số vào điểm trung bình).")}
          </div>

          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#be123c",
                fontSize: "12px",
                fontWeight: "600",
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label>{lang === 'en' ? "Practical Item Name" : tr('Tên mục thực hành')}</label>
            <input
              type="text"
              value={form.itemName}
              placeholder={lang === 'en' ? "e.g., Record and analyze flight parameters" : tr('VD: Ghi nhận và xử lý thông số chuyến bay')}
              onChange={(e) => onFormUpdate({ ...form, itemName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>{lang === 'en' ? "Description" : tr('Mô tả')}</label>
            <textarea
              value={form.description}
              rows={3}
              placeholder={lang === 'en' ? "Requirement description / grading criteria" : tr('Mô tả yêu cầu / tiêu chí đánh giá')}
              onChange={(e) => onFormUpdate({ ...form, description: e.target.value })}
              style={{
                padding: "10px 14px",
                border: "1px solid #e0e4e8",
                borderRadius: "4px",
                fontSize: "14px",
                color: "#002147",
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          <div className="form-group">
            <label>{lang === 'en' ? "Display Order" : tr('Thứ tự hiển thị')}</label>
            <input
              type="number"
              min="0"
              value={form?.displayOrder === "" || form?.displayOrder == null ? "" : form.displayOrder}
              placeholder="1"
              onChange={(e) => {
                const val = e.target.value;
                onFormUpdate({
                  ...form,
                  displayOrder: val === "" ? "" : val,
                });
              }}
            />
          </div>

          <div className="form-group">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.isRequired}
                onChange={(e) => onFormUpdate({ ...form, isRequired: e.target.checked })}
                style={{ cursor: "pointer" }}
              />
              <span style={{ textTransform: "none" }}>{lang === 'en' ? "Mandatory Item (Pass Required)" : tr('Mục bắt buộc đạt')}</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" type="button" onClick={onCancel}>
            {lang === 'en' ? "Cancel" : tr('Hủy bỏ')}
          </button>
          <button
            className="modal-submit-btn"
            type="button"
            onClick={onSubmit}
            disabled={saving}
            style={{
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? (lang === 'en' ? "Saving..." : tr("Đang lưu...")) : (lang === 'en' ? "Save" : tr("Lưu"))}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// Giảng viên hiện tại = người đang đăng nhập (giống các màn Instructor khác) —
// dùng để lọc "lớp/môn mình được phân công" (Sân nhà ai nấy đá).
const getCurrentAccountId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.accountId ?? user.userId ?? null;
  } catch {
    return null;
  }
};

const InstructorAssessmentStructure = () => {
  const { tr, lang } = useLanguage();
  const toast = useToast();

  // "Sân nhà ai nấy đá" — giống các màn Instructor khác: dropdown chọn LỚP của giảng
  // viên đang đăng nhập (lọc theo ClassSubject.InstructorAccountId), KHÔNG hiển thị
  // toàn bộ Course hệ thống (trước đây Course/Subject bị trùng, khó nhìn). Từ lớp
  // suy ra Course để load Assessments; môn chọn = môn ĐƯỢC PHÂN CÔNG trong lớp đó.
  const [classesData, setClassesData] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [subjectsList, setSubjectsList] = useState([]); // môn được phân công trong lớp
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [assessments, setAssessments] = useState([]);
  const [checklists, setChecklists] = useState([]);

  const assessmentPager = usePagination(assessments, { pageSize: 10 });
  const checklistPager = usePagination(checklists, { pageSize: 10 });

  const [loading, setLoading] = useState(true);

  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [assessmentForm, setAssessmentForm] = useState(EMPTY_ASSESSMENT);
  const [assessmentError, setAssessmentError] = useState("");
  const [savingAssessment, setSavingAssessment] = useState(false);

  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [checklistForm, setChecklistForm] = useState(EMPTY_CHECKLIST);
  const [checklistError, setChecklistError] = useState("");
  const [savingChecklist, setSavingChecklist] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      setLoading(true);
      try {
        const currentAccountId = getCurrentAccountId();
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

        const mapped = (Array.isArray(apiClasses) ? apiClasses : [])
          .map((cls, idx) => {
            const course = (Array.isArray(apiCourses) ? apiCourses : []).find(
              (c) => String(c.courseId) === String(cls.courseId),
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

            const statusLower = String(cls.status || "").toLowerCase();
            const isLocked =
              statusLower === "completed" ||
              statusLower === "đã kết thúc" ||
              statusLower === "cancelled" ||
              statusLower === "đã hủy" ||
              statusLower === "closed";

            return {
              classId: cls.classId,
              stt: String(idx + 1).padStart(2, "0"),
              code: cls.classCode || `CL-${cls.classId}`,
              name: cls.className || tr("Lớp đào tạo"),
              subName: course ? course.courseName : tr("Chuyên đề huấn luyện"),
              schedule: cls.schedule || tr("Chưa sắp lịch"),
              status: cls.status || tr("Đang diễn ra"),
              courseId: course ? course.courseId : (cls.courseId ?? null),
              assignments: resolvedAssignments,
              isLocked,
            };
          })
          // Lớp ĐÃ KẾT THÚC / BỊ HỦY → BE chặn mọi thay đổi cấu trúc đánh giá → bỏ khỏi dropdown.
          .filter((c) => !c.isLocked)
          // Chỉ giữ lớp mà giảng viên hiện tại được phân công dạy ít nhất 1 môn.
          .filter(
            (c) =>
              currentAccountId == null ||
              (c.assignments || []).some(
                (a) =>
                  a.instructorAccountId != null &&
                  String(a.instructorAccountId) === String(currentAccountId),
              ),
          );

        setClassesData(mapped);
        setSubjectsList(Array.isArray(apiSubjects) ? apiSubjects : []);
        if (mapped.length > 0) {
          setSelectedClassId(mapped[0].classId);
        }
      } catch (err) {
        console.error("Lỗi khi tải lớp học:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBase();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedClass = useMemo(
    () => classesData.find((c) => c.classId === parseInt(selectedClassId)),
    [classesData, selectedClassId],
  );
  const currentCourseId = selectedClass?.courseId ?? null;

  // Các môn ĐƯỢC PHÂN CÔNG cho giảng viên trong lớp đang chọn — dropdown Subject chỉ
  // gồm các môn này (hết cảnh tượng trùng/lộn xộn do dùng Subjects global).
  const assignedSubjects = useMemo(() => {
    const currentAccountId = getCurrentAccountId();
    const ids = [
      ...new Set(
        (selectedClass?.assignments || [])
          .filter(
            (a) =>
              a.subjectId != null &&
              (currentAccountId == null ||
                String(a.instructorAccountId) === String(currentAccountId)),
          )
          .map((a) => a.subjectId),
      ),
    ];
    return ids
      .map((id) => {
        const sub = (subjectsList || []).find(
          (s) => s.subjectId === id,
        );
        return {
          subjectId: id,
          subjectCode: sub?.subjectCode || `SUB${id}`,
          subjectName: sub?.subjectName || tr("Môn học"),
        };
      })
      .sort((a, b) => a.subjectId - b.subjectId);
  }, [selectedClass, subjectsList, tr]);

  const loadItems = useCallback(async () => {
    if (!currentCourseId) return;
    setLoading(true);
    try {
      const courseId = parseInt(currentCourseId, 10);
      const subjectId = parseInt(selectedSubjectId, 10) || 0;
      const [apiAssessments, apiChecklists] = await Promise.all([
        api
          .get("/Assessments")
          .catch(() => api.get("/assessments").catch(() => [])),
        api
          .get("/PracticalChecklists")
          .catch(() => api.get("/practicalchecklists").catch(() => [])),
      ]);

      const assArr = Array.isArray(apiAssessments) ? apiAssessments : [];
      const chkArr = Array.isArray(apiChecklists) ? apiChecklists : [];

      const filteredAssessments = subjectId
        ? assArr.filter(
            (a) =>
              Number(a.courseId) === courseId && Number(a.subjectId) === subjectId,
          )
        : assArr.filter((a) => Number(a.courseId) === courseId);

      const filteredChecklists = subjectId
        ? chkArr.filter(
            (c) =>
              Number(c.courseId) === courseId && Number(c.subjectId) === subjectId,
          )
        : chkArr.filter((c) => Number(c.courseId) === courseId);

      setAssessments(filteredAssessments);
      setChecklists(filteredChecklists);
    } catch (err) {
      console.error("Lỗi tải cấu trúc đánh giá:", err);
      setAssessments([]);
      setChecklists([]);
    } finally {
      setLoading(false);
    }
  }, [currentCourseId, selectedSubjectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (currentCourseId) {
        void loadItems();
      } else {
        setAssessments([]);
        setChecklists([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentCourseId, selectedSubjectId, loadItems]);

  const totalWeight = useMemo(
    () => assessments.reduce((sum, a) => sum + (Number(a.weight) || 0), 0),
    [assessments],
  );
  const weightValid = Math.abs(totalWeight - 100) < 0.0001;

  const openCreateAssessment = () => {
    setEditingAssessment(null);
    const nextOrder =
      assessments.length > 0
        ? Math.max(...assessments.map((a) => a.displayOrder || 0)) + 1
        : 1;
    setAssessmentForm({ ...EMPTY_ASSESSMENT, displayOrder: nextOrder });
    setAssessmentError("");
    setShowAssessmentModal(true);
  };

  const openEditAssessment = (item) => {
    if (!item) return;
    setEditingAssessment(item);
    setAssessmentForm({
      componentName: item.componentName || item.ComponentName || "",
      assessmentType: item.assessmentType || item.AssessmentType || "Theory",
      weight: item.weight ?? item.Weight ?? "",
      passingScore: item.passingScore ?? item.PassingScore ?? "",
      isRequired: (item.isRequired ?? item.IsRequired) ?? true,
      displayOrder: item.displayOrder ?? item.DisplayOrder ?? 1,
    });
    setAssessmentError("");
    setShowAssessmentModal(true);
  };

  const handleSaveAssessment = async () => {
    if (!assessmentForm.componentName.trim()) {
      setAssessmentError(
        lang === "en"
          ? "Please enter assessment name."
          : tr("Vui lòng nhập tên đánh giá.")
      );
      return;
    }
    const w = assessmentForm.weight === "" ? NaN : Number(assessmentForm.weight);
    if (isNaN(w) || w < 0 || w > 100) {
      setAssessmentError(
        lang === "en"
          ? "Weight must be between 0 and 100."
          : tr("Trọng số phải nằm trong khoảng 0 – 100.")
      );
      return;
    }
    const ps = assessmentForm.passingScore === "" ? NaN : Number(assessmentForm.passingScore);
    if (isNaN(ps) || ps < 0 || ps > 100) {
      setAssessmentError(
        lang === "en"
          ? "Passing score must be between 0 and 100."
          : tr("Điểm đạt phải nằm trong khoảng 0 – 100.")
      );
      return;
    }
    setSavingAssessment(true);
    setAssessmentError("");
    try {
      const payload = {
        subjectId: parseInt(selectedSubjectId, 10),
        componentName: assessmentForm.componentName.trim(),
        assessmentType: assessmentForm.assessmentType,
        weight: Number(assessmentForm.weight) || 0,
        passingScore: Number(assessmentForm.passingScore) || 0,
        isRequired: assessmentForm.isRequired,
        displayOrder: Number(assessmentForm.displayOrder) || 1,
      };
      let saved;
      const aId = editingAssessment?.assessmentId ?? editingAssessment?.AssessmentId;
      if (editingAssessment && aId) {
        saved = await api.put(
          `/Assessments/${aId}`,
          { ...payload, assessmentId: Number(aId) },
        );
        toast.success(tr("Đã cập nhật"), announce("edit", tr("Assessment")));
      } else {
        saved = await api.post("/Assessments", {
          ...payload,
          courseId: parseInt(currentCourseId, 10),
        });
        toast.success(tr("Đã tạo"), announce("add", tr("Assessment")));
      }
      const newItem = saved || {
        ...payload,
        assessmentId: aId || Date.now(),
        courseId: parseInt(currentCourseId, 10),
      };
      setAssessments((prev) => {
        if (editingAssessment) {
          return prev.map((a) =>
            (a.assessmentId ?? a.AssessmentId) === aId ? newItem : a,
          );
        }
        return [...prev, newItem];
      });
      setShowAssessmentModal(false);
    } catch (err) {
      toast.error(parseApiError(err, tr("Không lưu được")));
    } finally {
      setSavingAssessment(false);
    }
  };

  const openCreateChecklist = () => {
    setEditingChecklist(null);
    const nextOrder =
      checklists.length > 0
        ? Math.max(...checklists.map((c) => c.displayOrder || 0)) + 1
        : 1;
    setChecklistForm({ ...EMPTY_CHECKLIST, displayOrder: nextOrder });
    setChecklistError("");
    setShowChecklistModal(true);
  };

  const openEditChecklist = (item) => {
    setEditingChecklist(item);
    setChecklistForm({
      itemName: item.itemName || "",
      description: item.description || "",
      isRequired: item.isRequired ?? true,
      displayOrder: item.displayOrder ?? item.DisplayOrder ?? 1,
    });
    setChecklistError("");
    setShowChecklistModal(true);
  };

  const handleSaveChecklist = async () => {
    if (!checklistForm.itemName.trim()) {
      setChecklistError(
        lang === "en"
          ? "Please enter practical checklist item name."
          : tr("Vui lòng nhập tên mục thực hành.")
      );
      return;
    }
    setSavingChecklist(true);
    setChecklistError("");
    try {
      const payload = {
        itemName: checklistForm.itemName.trim(),
        description: checklistForm.description || null,
        isRequired: checklistForm.isRequired,
        displayOrder: Number(checklistForm.displayOrder) || 1,
      };
      let saved;
      if (editingChecklist) {
        saved = await api.put(
          `/PracticalChecklists/${editingChecklist.practicalChecklistId}`,
          {
            ...payload,
            practicalChecklistId: editingChecklist.practicalChecklistId,
          },
        );
        toast.success(tr("Đã cập nhật"), announce("edit", tr("Practical Checklist")));
      } else {
        saved = await api.post("/PracticalChecklists", {
          ...payload,
          courseId: parseInt(currentCourseId, 10),
          subjectId: parseInt(selectedSubjectId, 10),
        });
        toast.success(tr("Đã tạo"), announce("add", tr("Practical Checklist")));
      }
      const newItem = saved || {
        ...payload,
        practicalChecklistId:
          editingChecklist?.practicalChecklistId || Date.now(),
        courseId: parseInt(currentCourseId, 10),
        subjectId: parseInt(selectedSubjectId, 10),
      };
      setChecklists((prev) => {
        if (editingChecklist) {
          return prev.map((c) =>
            c.practicalChecklistId === editingChecklist.practicalChecklistId
              ? newItem
              : c,
          );
        }
        return [...prev, newItem];
      });
      setShowChecklistModal(false);
    } catch (err) {
      toast.error(parseApiError(err, tr("Không lưu được")));
    } finally {
      setSavingChecklist(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { kind, item } = confirmDelete;
      if (kind === "assessment") {
        await api.delete(`/Assessments/${item.assessmentId}`);
        setAssessments((prev) =>
          prev.filter((a) => a.assessmentId !== item.assessmentId),
        );
        toast.success(tr("Đã xóa"), announce("delete", tr("Assessment")));
      } else {
        await api.delete(`/PracticalChecklists/${item.practicalChecklistId}`);
        setChecklists((prev) =>
          prev.filter((c) => c.practicalChecklistId !== item.practicalChecklistId),
        );
        toast.success(tr("Đã xóa"), announce("delete", tr("Practical Checklist")));
      }
      setConfirmDelete(null);
    } catch (err) {
      toast.error(parseApiError(err, tr("Không xóa được")));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: "24px" }}>
      <section className="content-header">
        <div className="header-left">
          <h1>{lang === 'en' ? "Assessment Structure" : tr("Cấu trúc đánh giá")}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {lang === 'en'
              ? "Create Assessments & Practical Checklists for each subject"
              : tr("Tạo Assessments & Practical Checklists cho từng môn")}
          </p>
        </div>
      </section>

      {/* Card trắng cho khu chọn lớp/môn — label màu tối đọc được trên nền trắng,
          thay vì nằm trực tiếp trên nền gradient navy đậm của trang */}
      <div
        className="structure-selector-card"
        style={{ marginBottom: "20px" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            alignItems: "start",
          }}
        >
        <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
          <label>{lang === 'en' ? "My Classes" : tr("Lớp của tôi")}</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSubjectId("");
            }}
            style={{ padding: "12px 14px", borderRadius: "12px", fontSize: "13px", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}
          >
            <option value="">{lang === 'en' ? "Select Class" : tr("Chọn lớp")}</option>
            {classesData.map((c) => (
              <option key={c.classId} value={String(c.classId)}>
                {c.name} ({c.code}) · {c.subName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: 0, minWidth: 0 }}>
          <label>{lang === 'en' ? "Subject" : tr("Môn học")}</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: "12px", fontSize: "13px", width: "100%", maxWidth: "100%", boxSizing: "border-box", minWidth: 0 }}
            disabled={!selectedClassId || assignedSubjects.length === 0}
          >
            <option value="">
              {assignedSubjects.length === 0
                ? (lang === 'en' ? "No subjects assigned to you in this class" : tr("Bạn chưa được phân công môn nào trong lớp này"))
                : (lang === 'en' ? "Select Subject" : tr("Chọn môn"))}
            </option>
            {assignedSubjects.map((s) => (
              <option key={s.subjectId} value={String(s.subjectId)}>
                {s.subjectCode} · {s.subjectName}
              </option>
            ))}
          </select>
        </div>
        </div>
      </div>

      {!selectedClassId ||
      assignedSubjects.length === 0 ||
      !selectedSubjectId ? (
        !selectedClassId || assignedSubjects.length === 0 ? (
          <div
            className="empty-table-state"
            style={{ padding: "60px", textAlign: "center" }}
          >
            <p style={{ color: "rgba(0,33,71,0.5)", fontSize: "14px" }}>
              {!selectedClassId
                ? (lang === 'en'
                    ? "Select your class to configure Assessments & Practical Checklists."
                    : tr("Chọn lớp của bạn để cấu hình Assessments & Practical Checklists."))
                : (lang === 'en'
                    ? "You are not assigned to any subjects in this class. Please contact Academic Staff."
                    : tr("Bạn chưa được phân công môn nào trong lớp này. Liên hệ Academic để được phân công."))}
            </p>
          </div>
        ) : null
      ) : (
        <>
          <section className="table-card" style={{ marginBottom: "24px" }}>
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
                  {lang === 'en' ? "Assessments (Graded Tests / Exams %)" : tr("Assessments (Bài kiểm tra / Thi tính điểm %)")}
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(0,33,71,0.5)",
                    margin: "4px 0 0",
                  }}
                >
                  {lang === 'en'
                    ? "Structure of theory & practical tests weighted (%) toward overall grade"
                    : tr("Cấu trúc các bài kiểm tra / thi lý thuyết & thực hành có tính điểm số (%) vào điểm trung bình môn")}
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
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "10px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    backgroundColor: weightValid
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(239,68,68,0.12)",
                    color: weightValid ? "#15803d" : "#b91c1c",
                    border: `1px solid ${
                      weightValid
                        ? "rgba(34,197,94,0.3)"
                        : "rgba(239,68,68,0.3)"
                    }`,
                  }}
                >
                  {lang === 'en' ? "Total Weight" : tr("Tổng trọng số")}: {totalWeight}%
                </span>
                {!weightValid && (
                  <span
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      fontWeight: "700",
                      color: "#b45309",
                      backgroundColor: "rgba(245,158,11,0.12)",
                      border: "1px solid rgba(245,158,11,0.3)",
                    }}
                  >
                    {lang === 'en' ? "Must equal 100%" : tr("Phải bằng 100%")}
                  </span>
                )}
                <button
                  onClick={openCreateAssessment}
                  type="button"
                  style={{
                    padding: "10px 16px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#ffffff",
                    backgroundColor: "#c5a059",
                    boxShadow: "0 2px 8px rgba(197,160,89,0.2)",
                  }}
                >
                  {lang === 'en' ? "+ Create Assessment" : tr("+ Tạo Assessment")}
                </button>
              </div>
            </div>

            {loading && !assessments.length ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "rgba(0,33,71,0.4)",
                }}
              >
                {lang === 'en' ? "Loading..." : tr("Đang tải...")}
              </div>
            ) : assessments.length === 0 ? (
              <div
                className="empty-table-state"
                style={{ padding: "40px", textAlign: "center" }}
              >
                <p style={{ color: "rgba(0,33,71,0.5)", fontSize: "14px", margin: 0 }}>
                  {lang === 'en' ? "No assessments for this subject yet." : tr("Chưa có Assessment nào cho môn này.")}
                </p>
              </div>
            ) : (
              <div className="table-responsive-scroll">
                <div
                  className="table-header"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "3fr 2fr 1fr 1.2fr 1fr 1fr 1.4fr",
                  }}
                >
                  <div>{lang === 'en' ? "Name" : tr("Tên")}</div>
                  <div>{lang === 'en' ? "Type" : tr("Loại")}</div>
                  <div>{lang === 'en' ? "Weight" : tr("Trọng số")}</div>
                  <div>{lang === 'en' ? "Passing Score" : tr("Điểm đạt")}</div>
                  <div>{lang === 'en' ? "Mandatory" : tr("Bắt buộc")}</div>
                  <div>{lang === 'en' ? "Order" : tr("Thứ tự")}</div>
                  <div>{lang === 'en' ? "Actions" : tr("Thao tác")}</div>
                </div>
                <div className="table-body">
                  {assessmentPager.pageItems
                    .slice()
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((a) => (
                      <div
                        key={a.assessmentId}
                        className="table-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "3fr 2fr 1fr 1.2fr 1fr 1fr 1.4fr",
                          alignItems: "center",
                        }}
                      >
                        <div
                          className="col-name"
                          style={{ fontSize: "13px", fontWeight: "600", color: "#002147" }}
                        >
                          {a.componentName || `Assessment ${a.assessmentId}`}
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(0,33,71,0.7)" }}>
                          {getAssessmentTypeName(a.assessmentType, tr, lang)}
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#c5a059" }}>
                          {Number(a.weight) || 0}%
                        </div>
                        <div style={{ fontSize: "13px", color: "#002147" }}>
                          {Number(a.passingScore) || 0}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "700" }}>
                          {a.isRequired ? (
                            <span style={{ color: "#15803d" }}>✓ {lang === 'en' ? "Mandatory" : tr("Bắt buộc")}</span>
                          ) : (
                            <span style={{ color: "rgba(0,33,71,0.4)" }}>—</span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(0,33,71,0.6)" }}>
                          {a.displayOrder || 0}
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => openEditAssessment(a)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid #dfe6f1",
                              background: "#fff",
                              color: "#002147",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            {lang === 'en' ? "Edit" : tr("Sửa")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                kind: "assessment",
                                item: a,
                                name: a.componentName,
                              })
                            }
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid rgba(239,68,68,0.3)",
                              background: "#fff",
                              color: "#be123c",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            {lang === 'en' ? "Delete" : tr("Xóa")}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="table-footer">
              <Pagination
                page={assessmentPager.page}
                pageCount={assessmentPager.pageCount}
                onChange={assessmentPager.setPage}
                total={assessmentPager.total}
                pageSize={10}
              />
            </div>
          </section>

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
                  {lang === 'en' ? "Practical Checklists (Mandatory Pass Skills)" : tr("Practical Checklists (Bảng kiểm kỹ năng bắt buộc Đạt)")}
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(0,33,71,0.5)",
                    margin: "4px 0 0",
                  }}
                >
                  {lang === 'en'
                    ? "Prerequisite practical checklist (Pass/Fail) for subject sign-off"
                    : tr("Bảng kiểm kỹ năng / thao tác thực hành điều kiện tiên quyết (Pass/Fail) để ký xác nhận môn học")}
                </p>
              </div>
              <button
                onClick={openCreateChecklist}
                type="button"
                style={{
                  padding: "10px 16px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#ffffff",
                  backgroundColor: "#002147",
                  boxShadow: "0 2px 8px rgba(0,33,71,0.2)",
                }}
              >
                {lang === 'en' ? "+ Create Practical Item" : tr("+ Tạo Mục thực hành")}
              </button>
            </div>

            {loading && !checklists.length ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                  color: "rgba(0,33,71,0.4)",
                }}
              >
                {lang === 'en' ? "Loading..." : tr("Đang tải...")}
              </div>
            ) : checklists.length === 0 ? (
              <div
                className="empty-table-state"
                style={{ padding: "40px", textAlign: "center" }}
              >
                <p style={{ color: "rgba(0,33,71,0.5)", fontSize: "14px", margin: 0 }}>
                  {lang === 'en' ? "No practical checklist items for this subject yet." : tr("Chưa có mục thực hành nào cho môn này.")}
                </p>
              </div>
            ) : (
              <div className="table-responsive-scroll">
                <div
                  className="table-header"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2.2fr 2.5fr 1fr 1fr 1.4fr",
                  }}
                >
                  <div>{lang === 'en' ? "Item Name" : tr("Tên mục")}</div>
                  <div>{lang === 'en' ? "Description" : tr("Mô tả")}</div>
                  <div>{lang === 'en' ? "Mandatory" : tr("Bắt buộc")}</div>
                  <div>{lang === 'en' ? "Order" : tr("Thứ tự")}</div>
                  <div>{lang === 'en' ? "Actions" : tr("Thao tác")}</div>
                </div>
                <div className="table-body">
                  {checklistPager.pageItems
                    .slice()
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((c) => (
                      <div
                        key={c.practicalChecklistId}
                        className="table-row"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2.2fr 2.5fr 1fr 1fr 1.4fr",
                          alignItems: "center",
                        }}
                      >
                        <div
                          className="col-name"
                          style={{ fontSize: "13px", fontWeight: "600", color: "#002147" }}
                        >
                          {c.itemName}
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(0,33,71,0.7)" }}>
                          {c.description || "—"}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "700" }}>
                          {c.isRequired ? (
                            <span style={{ color: "#b91c1c" }}>
                              {lang === 'en' ? "Mandatory Pass" : tr("Bắt buộc Pass")}
                            </span>
                          ) : (
                            <span style={{ color: "rgba(0,33,71,0.4)" }}>
                              {lang === 'en' ? "Optional" : tr("Tự chọn")}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "12px", color: "rgba(0,33,71,0.6)" }}>
                          {c.displayOrder || 0}
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => openEditChecklist(c)}
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid #dfe6f1",
                              background: "#fff",
                              color: "#002147",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            {lang === 'en' ? "Edit" : tr("Sửa")}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmDelete({
                                kind: "checklist",
                                item: c,
                                name: c.itemName,
                              })
                            }
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid rgba(239,68,68,0.25)",
                              background: "#fff",
                              color: "#be123c",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            {lang === 'en' ? "Delete" : tr("Xóa")}
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="table-footer">
              <Pagination
                page={checklistPager.page}
                pageCount={checklistPager.pageCount}
                onChange={checklistPager.setPage}
                total={checklistPager.total}
                pageSize={10}
              />
            </div>
          </section>
        </>
      )}

      {showAssessmentModal && (
        <AssessmentModal
          form={assessmentForm}
          isEdit={!!editingAssessment}
          error={assessmentError}
          saving={savingAssessment}
          onCancel={() => setShowAssessmentModal(false)}
          onSubmit={handleSaveAssessment}
          onFormUpdate={setAssessmentForm}
        />
      )}

      {showChecklistModal && (
        <ChecklistModal
          form={checklistForm}
          isEdit={!!editingChecklist}
          error={checklistError}
          saving={savingChecklist}
          onCancel={() => setShowChecklistModal(false)}
          onSubmit={handleSaveChecklist}
          onFormUpdate={setChecklistForm}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          isOpen
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleConfirmDelete}
          loading={deleting}
          confirmVariant="danger"
          title={lang === 'en' ? "Confirm Delete" : tr('Xác nhận xóa')}
          message={confirmDelete.name}
          bodyMessage={lang === 'en' ? "This item will be permanently deleted. Are you sure?" : tr('Mục này sẽ bị xóa vĩnh viễn. Bạn chắc chắn chứ?')}
          confirmText={lang === 'en' ? "DELETE" : "XÓA"}
        />
      )}
    </div>
  );
};

export default InstructorAssessmentStructure;