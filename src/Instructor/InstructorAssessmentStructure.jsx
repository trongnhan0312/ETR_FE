import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { api } from "../utils/api";
import { announce } from "../utils/crudNotify";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";
import "./instructor.scss";

const ASSESSMENT_TYPES = [
  { value: "Theory", label: "Lý thuyết (Theory)" },
  { value: "Practical", label: "Thực hành (Practical)" },
];

const EMPTY_ASSESSMENT = {
  componentName: "",
  assessmentType: "Theory",
  weight: 0,
  passingScore: 0,
  isRequired: true,
  displayOrder: 0,
};

const EMPTY_CHECKLIST = {
  itemName: "",
  description: "",
  isRequired: true,
  displayOrder: 0,
};

const getAssessmentTypeName = (type) => {
  const found = ASSESSMENT_TYPES.find(
    (t) => t.value.toLowerCase() === String(type || "").toLowerCase(),
  );
  return found ? found.label : type || "—";
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
  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-container"
        style={{ width: "560px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{isEdit ? "Cập nhật Assessment" : "Tạo Assessment"}</h2>
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
            <label>{tr('Tên đánh giá (ComponentName)')}</label>
            <input
              type="text"
              value={form.componentName}
              placeholder={tr('VD: Kiểm tra cuối kỳ LT')}
              onChange={(e) => onFormUpdate({ ...form, componentName: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{tr('Loại đánh giá')}</label>
              <select
                value={form.assessmentType}
                onChange={(e) => onFormUpdate({ ...form, assessmentType: e.target.value })}
              >
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>{tr('Trọng số (%)')}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={form.weight}
                onChange={(e) =>
                  onFormUpdate({ ...form, weight: parseFloat(e.target.value) || 0 })
                }
              />
              <small style={{ fontSize: "10px", color: "rgba(0,33,71,0.5)" }}>
                Tổng trọng số các assessment = 100%
              </small>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{tr('Điểm đạt (PassingScore)')}</label>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                value={form.passingScore}
                onChange={(e) =>
                  onFormUpdate({
                    ...form,
                    passingScore: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>{tr('Thứ tự hiển thị (DisplayOrder)')}</label>
              <input
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) =>
                  onFormUpdate({
                    ...form,
                    displayOrder: parseInt(e.target.value, 10) || 0,
                  })
                }
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
                checked={form.isRequired}
                onChange={(e) => onFormUpdate({ ...form, isRequired: e.target.checked })}
                style={{ cursor: "pointer" }}
              />
              <span style={{ textTransform: "none" }}>{tr('Bắt buộc (IsRequired)')}</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" type="button" onClick={onCancel}>
            Hủy bỏ
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
            {saving ? "Đang lưu..." : "Lưu"}
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
  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-container"
        style={{ width: "560px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{isEdit ? "Cập nhật Mục thực hành" : "Tạo Mục thực hành"}</h2>
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
            <label>{tr('Tên mục thực hành (ItemName)')}</label>
            <input
              type="text"
              value={form.itemName}
              placeholder={tr('VD: Ghi nhận và xử lý thông số chuyến bay')}
              onChange={(e) => onFormUpdate({ ...form, itemName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>{tr('Mô tả (Description)')}</label>
            <textarea
              value={form.description}
              rows={3}
              placeholder={tr('Mô tả yêu cầu / tiêu chí đánh giá')}
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
            <label>{tr('Thứ tự hiển thị (DisplayOrder)')}</label>
            <input
              type="number"
              min="0"
              value={form.displayOrder}
              onChange={(e) =>
                onFormUpdate({
                  ...form,
                  displayOrder: parseInt(e.target.value, 10) || 0,
                })
              }
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
              <span style={{ textTransform: "none" }}>{tr('Mục bắt buộc (bắt buộc Pass)')}</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" type="button" onClick={onCancel}>
            Hủy bỏ
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
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

const InstructorAssessmentStructure = () => {
  const { tr } = useLanguage();
  const toast = useToast();

  const [coursesList, setCoursesList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
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
        const [apiCourses, apiSubjects] = await Promise.all([
          api.get("/courses").catch(() => []),
          api.get("/Subjects").catch(() => api.get("/subjects").catch(() => [])),
        ]);
        setCoursesList(Array.isArray(apiCourses) ? apiCourses : []);
        setSubjectsList(Array.isArray(apiSubjects) ? apiSubjects : []);
        if (Array.isArray(apiCourses) && apiCourses.length > 0) {
          setSelectedCourseId(String(apiCourses[0].courseId));
        }
      } catch (err) {
        console.error("Lỗi khi tải khóa học/môn học:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBase();
  }, []);

  const loadItems = useCallback(async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    try {
      const courseId = parseInt(selectedCourseId, 10);
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
  }, [selectedCourseId, selectedSubjectId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedCourseId) {
        void loadItems();
      } else {
        setAssessments([]);
        setChecklists([]);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedCourseId, selectedSubjectId, loadItems]);

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
    setEditingAssessment(item);
    setAssessmentForm({
      componentName: item.componentName || "",
      assessmentType: item.assessmentType || "Theory",
      weight: Number(item.weight) || 0,
      passingScore: Number(item.passingScore) || 0,
      isRequired: item.isRequired ?? true,
      displayOrder: Number(item.displayOrder) || 0,
    });
    setAssessmentError("");
    setShowAssessmentModal(true);
  };

  const handleSaveAssessment = async () => {
    if (!assessmentForm.componentName.trim()) {
      setAssessmentError("Vui lòng nhập tên đánh giá.");
      return;
    }
    if (!(assessmentForm.weight >= 0 && assessmentForm.weight <= 100)) {
      setAssessmentError("Trọng số phải nằm trong khoảng 0 – 100.");
      return;
    }
    setSavingAssessment(true);
    setAssessmentError("");
    try {
      const payload = {
        subjectId: parseInt(selectedSubjectId, 10),
        componentName: assessmentForm.componentName.trim(),
        assessmentType: assessmentForm.assessmentType,
        weight: Number(assessmentForm.weight),
        passingScore: Number(assessmentForm.passingScore) || 0,
        isRequired: assessmentForm.isRequired,
        displayOrder: Number(assessmentForm.displayOrder) || 0,
      };
      let saved;
      if (editingAssessment) {
        saved = await api.put(
          `/Assessments/${editingAssessment.assessmentId}`,
          { ...payload, assessmentId: editingAssessment.assessmentId },
        );
        toast.success(tr("Đã cập nhật"), announce("edit", tr("Assessment")));
      } else {
        saved = await api.post("/Assessments", {
          ...payload,
          courseId: parseInt(selectedCourseId, 10),
        });
        toast.success(tr("Đã tạo"), announce("add", tr("Assessment")));
      }
      const newItem = saved || {
        ...payload,
        assessmentId: editingAssessment?.assessmentId || Date.now(),
        courseId: parseInt(selectedCourseId, 10),
      };
      setAssessments((prev) => {
        if (editingAssessment) {
          return prev.map((a) =>
            a.assessmentId === editingAssessment.assessmentId ? newItem : a,
          );
        }
        return [...prev, newItem];
      });
      setShowAssessmentModal(false);
    } catch (err) {
      toast.error("Không lưu được");
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
      displayOrder: Number(item.displayOrder) || 0,
    });
    setChecklistError("");
    setShowChecklistModal(true);
  };

  const handleSaveChecklist = async () => {
    if (!checklistForm.itemName.trim()) {
      setChecklistError("Vui lòng nhập tên mục thực hành.");
      return;
    }
    setSavingChecklist(true);
    setChecklistError("");
    try {
      const payload = {
        itemName: checklistForm.itemName.trim(),
        description: checklistForm.description || null,
        isRequired: checklistForm.isRequired,
        displayOrder: Number(checklistForm.displayOrder) || 0,
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
          courseId: parseInt(selectedCourseId, 10),
          subjectId: parseInt(selectedSubjectId, 10),
        });
        toast.success(tr("Đã tạo"), announce("add", tr("Practical Checklist")));
      }
      const newItem = saved || {
        ...payload,
        practicalChecklistId:
          editingChecklist?.practicalChecklistId || Date.now(),
        courseId: parseInt(selectedCourseId, 10),
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
      toast.error("Không lưu được");
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
      toast.error("Không xóa được");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: "24px" }}>
      <section className="content-header">
        <div className="header-left">
          <h1>{tr("Cấu trúc đánh giá")}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr("Tạo Assessments & Practical Checklists cho từng môn")}
          </p>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div className="form-group">
          <label>{tr("Khóa học")}</label>
          <select
            value={selectedCourseId}
            onChange={(e) => {
              setSelectedCourseId(e.target.value);
              setSelectedSubjectId("");
            }}
            style={{ padding: "12px 14px", borderRadius: "12px", fontSize: "13px" }}
          >
            <option value="">{tr("Chọn khóa học")}</option>
            {coursesList.map((c) => (
              <option key={c.courseId} value={String(c.courseId)}>
                {c.courseCode || `K${c.courseId}`} · {c.courseName}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{tr("Môn học")}</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            style={{ padding: "12px 14px", borderRadius: "12px", fontSize: "13px" }}
            disabled={!selectedCourseId}
          >
            <option value="">{tr("Chọn môn (tùy chọn)")}</option>
            {subjectsList.map((s) => (
              <option key={s.subjectId} value={String(s.subjectId)}>
                {s.subjectCode} · {s.subjectName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedSubjectId ? (
        <div
          className="empty-table-state"
          style={{ padding: "60px", textAlign: "center" }}
        >
          <p style={{ color: "rgba(0,33,71,0.5)", fontSize: "14px" }}>
            {tr(
              "Chọn môn học để cấu hình Assessments & Practical Checklists cho môn đó.",
            )}
          </p>
        </div>
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
                  {tr("Assessments (Lý thuyết)")}
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(0,33,71,0.5)",
                    margin: "4px 0 0",
                  }}
                >
                  {tr("Cấu trúc đề thi cho môn được chọn")}
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
                  {tr("Tổng trọng số")}: {totalWeight}%
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
                    {tr("Phải bằng 100%")}
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
                  {tr("+ Tạo Assessment")}
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
                {tr("Đang tải...")}
              </div>
            ) : assessments.length === 0 ? (
              <div
                className="empty-table-state"
                style={{ padding: "40px", textAlign: "center" }}
              >
                <p style={{ color: "rgba(0,33,71,0.5)", fontSize: "14px", margin: 0 }}>
                  {tr("Chưa có Assessment nào cho môn này.")}
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
                  <div>{tr("Tên")}</div>
                  <div>{tr("Loại")}</div>
                  <div>{tr("Trọng số")}</div>
                  <div>{tr("Điểm đạt")}</div>
                  <div>{tr("Bắt buộc")}</div>
                  <div>{tr("Thứ tự")}</div>
                  <div>{tr("Thao tác")}</div>
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
                          {getAssessmentTypeName(a.assessmentType)}
                        </div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#c5a059" }}>
                          {Number(a.weight) || 0}%
                        </div>
                        <div style={{ fontSize: "13px", color: "#002147" }}>
                          {Number(a.passingScore) || 0}
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "700" }}>
                          {a.isRequired ? (
                            <span style={{ color: "#15803d" }}>✓ {tr("Có")}</span>
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
                            {tr("Sửa")}
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
                            {tr("Xóa")}
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
                  {tr("Practical Checklists (Thực hành)")}
                </h3>
                <p
                  style={{
                    fontSize: "12px",
                    color: "rgba(0,33,71,0.5)",
                    margin: "4px 0 0",
                  }}
                >
                  {tr("Các mục thực hành bắt buộc / tự chọn")}
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
                {tr("+ Tạo Mục thực hành")}
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
                {tr("Đang tải...")}
              </div>
            ) : checklists.length === 0 ? (
              <div
                className="empty-table-state"
                style={{ padding: "40px", textAlign: "center" }}
              >
                <p style={{ color: "rgba(0,33,71,0.5)", fontSize: "14px", margin: 0 }}>
                  {tr("Chưa có mục thực hành nào cho môn này.")}
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
                  <div>{tr("Tên mục")}</div>
                  <div>{tr("Mô tả")}</div>
                  <div>{tr("Bắt buộc")}</div>
                  <div>{tr("Thứ tự")}</div>
                  <div>{tr("Thao tác")}</div>
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
                              {tr("Bắt buộc Pass")}
                            </span>
                          ) : (
                            <span style={{ color: "rgba(0,33,71,0.4)" }}>
                              {tr("Tự chọn")}
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
                            {tr("Sửa")}
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
                            {tr("Xóa")}
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
          title={tr('Xác nhận xóa')}
          message={confirmDelete.name}
          bodyMessage={tr('Mục này sẽ bị xóa vĩnh viễn. Bạn chắc chắn chứ?')}
          confirmText="XÓA"
        />
      )}
    </div>
  );
};

export default InstructorAssessmentStructure;