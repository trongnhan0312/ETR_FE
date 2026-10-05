import { useState, useEffect } from "react";
import { api } from "../utils/api";
import ConfirmModal from "../components/ConfirmModal";
import PromptModal from "../components/PromptModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import ApprovalHistory from "../components/ApprovalHistory";
import EtrDossierModal from "../components/EtrDossierModal";
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";
const QARETRReviewQueue = () => {
  const { tr, trEn } = useLanguage();
  const [etrRecords, setEtrRecords] = useState([]);
  // Lịch sử duyệt: ETR đã được duyệt (Completed) và bị trả lại (ReturnedForCorrection)
  const [historyRecords, setHistoryRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEtr, setSelectedEtr] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Toast notifications
  const toast = useToast();

  // Confirm Verify + Prompt lý do Return (thay window.confirm / prompt)
  const [confirmVerifyId, setConfirmVerifyId] = useState(null);
  const [returnTarget, setReturnTarget] = useState(null);

  // Modal xem chi tiết đầy đủ ETR + bản đồ tên môn/đánh giá/checklist/evidence
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Lịch sử duyệt: mở rộng nội tuyến dòng history để xem ApprovalHistory của ETR đó
  const [expandedHistoryEtrId, setExpandedHistoryEtrId] = useState(null);
  // Lịch sử duyệt: dòng đang được CHỌN (bấm vào) — chỉ hiện Approval History / View Details khi chọn
  const [selectedHistoryEtrId, setSelectedHistoryEtrId] = useState(null);
  // Ô tìm kiếm trong Review History — lọc theo mã ETR / học viên / khóa / trạng thái
  const [historySearch, setHistorySearch] = useState("");
  const [subjectMap, setSubjectMap] = useState({});
  const [assessmentMap, setAssessmentMap] = useState({});
  const [checklistMap, setChecklistMap] = useState({});
  const [evidenceBySrId, setEvidenceBySrId] = useState({});

  useEffect(() => {
    loadEtrs();
    loadDetailMaps();
  }, []);

  const loadEtrs = async () => {
    setLoading(true);
    try {
      const [data, enrollments, profiles, approvals, courses, classes] = await Promise.all([
        api.get("/Etr").catch(() => []),
        api.get("/Enrollments").catch(() => []),
        api.get("/UserProfiles").catch(() => api.get("/UserProfiles/learners").catch(() => [])),
        api.get("/Approvals").catch(() => []),
        api.get("/Courses").catch(() => []),
        api.get("/Classes").catch(() => []),
      ]);
      const etrs = Array.isArray(data) ? data : [];
      const enrollmentsArr = Array.isArray(enrollments) ? enrollments : [];
      const profilesArr = Array.isArray(profiles) ? profiles : [];
      const approvalsArr = Array.isArray(approvals) ? approvals : [];
      const coursesArr = Array.isArray(courses) ? courses : [];
      const classesArr = Array.isArray(classes) ? classes : [];

      const profileMap = new Map(profilesArr.map((p) => [p.accountId, p]));
      const classMap = new Map(classesArr.map((c) => [c.classId, c]));
      const courseMap = new Map(coursesArr.map((c) => [c.courseId, c]));

      const getLearnerText = (enrollment) => {
        if (!enrollment) return "—";
        const profile = profileMap.get(enrollment.accountId);
        if (profile?.fullName) {
          return profile.userCode ? `${profile.fullName} (${profile.userCode})` : profile.fullName;
        }
        return `Student #${enrollment.accountId || ""}`;
      };

      const getCourseText = (enrollment) => {
        if (!enrollment) return "—";
        const cls = classMap.get(enrollment.classId);
        const course = courseMap.get(cls?.courseId);
        if (course?.courseName) {
          return `${course.courseName} (${cls?.classCode || cls?.className || `Lớp #${enrollment.classId}`})`;
        }
        return cls?.className || `Lớp #${enrollment.classId || ""}`;
      };

      const submitted = etrs
        .filter((e) => e.status === "Submitted")
        .map((etr) => {
          const enrollment = enrollmentsArr.find(
            (enr) => enr.enrollmentId === etr.enrollmentId
          );
          return {
            id: `ETR-${String(etr.etrCourseRecordId || etr.eTRCourseRecordId).padStart(4, "0")}`,
            etrId: etr.etrCourseRecordId || etr.eTRCourseRecordId,
            learner: getLearnerText(enrollment),
            course: getCourseText(enrollment),
            stage: "Submitted",
          };
        });

      // Lịch sử duyệt: HIỂN THỊ TẤT CẢ các ETR kèm trạng thái duyệt
      const approvalByEtr = {};
      [...approvalsArr]
        .sort(
          (a, b) =>
            new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
        )
        .forEach((r) => {
          const etrId = r.etrCourseRecordId ?? r.eTRCourseRecordId;
          if (etrId != null) {
            approvalByEtr[etrId] = r.currentStatus;
          }
        });

      const history = etrs
        .map((etr) => {
          const enrollment = enrollmentsArr.find(
            (enr) => enr.enrollmentId === etr.enrollmentId
          );
          const etrId = etr.etrCourseRecordId || etr.eTRCourseRecordId;
          const approvalStatus = approvalByEtr[etrId] || null;
          const rawStatus = approvalStatus || etr.status;

          // outcome dùng cho badge màu + nhãn hiển thị
          let outcome = "inprogress";
          if (
            rawStatus === "Approved" ||
            rawStatus === "Completed"
          ) {
            outcome = "approved";
          } else if (rawStatus === "Rejected") {
            outcome = "rejected";
          } else if (
            rawStatus === "ReturnedForCorrection" ||
            rawStatus === "Returned"
          ) {
            outcome = "returned";
          } else if (rawStatus === "Verified") {
            outcome = "verified";
          } else if (
            rawStatus === "Submitted" ||
            rawStatus === "Pending" ||
            rawStatus === "UnderReview"
          ) {
            outcome = "pending";
          }

          return {
            id: `ETR-${String(etrId).padStart(4, "0")}`,
            etrId,
            learner: getLearnerText(enrollment),
            course: getCourseText(enrollment),
            status: rawStatus,
            outcome,
            decidedAt:
              etr.completedAt ||
              etr.verifiedAt ||
              etr.updatedAt ||
              etr.submittedAt ||
              null,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.decidedAt || 0) - new Date(a.decidedAt || 0)
        );

      setEtrRecords(submitted);
      setHistoryRecords(history);
    } catch (err) {
      console.error("Error loading ETR list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Tải bản đồ tên (môn học / assessment / practical checklist) + trạng thái evidence
  const loadDetailMaps = async () => {
    const [subjects, assessments, checklists, evidences] = await Promise.all([
      api.get("/Subjects").catch(() => []),
      api.get("/Assessments").catch(() => []),
      api.get("/PracticalChecklists").catch(() => []),
      api.get("/Evidences").catch(() => []),
    ]);
    const sMap = {};
    (Array.isArray(subjects) ? subjects : []).forEach((s) => {
      sMap[s.subjectId] = s;
    });
    const aMap = {};
    (Array.isArray(assessments) ? assessments : []).forEach((a) => {
      aMap[a.assessmentId] = a;
    });
    const cMap = {};
    (Array.isArray(checklists) ? checklists : []).forEach((c) => {
      cMap[c.practicalChecklistId] = c;
    });
    const evMap = {};
    (Array.isArray(evidences) ? evidences : []).forEach((ev) => {
      if (!evMap[ev.subjectResultId]) evMap[ev.subjectResultId] = [];
      evMap[ev.subjectResultId].push(ev);
    });
    setSubjectMap(sMap);
    setAssessmentMap(aMap);
    setChecklistMap(cMap);
    setEvidenceBySrId(evMap);
  };

  // Mở modal ETR Dossier đầy đủ (6 tabs, điểm số, chuyên cần, chữ ký, minh chứng, lịch sử)
  const handleViewDetails = (record) => {
    setDetailTarget(record);
  };

  const confirmVerify = async () => {
    if (!confirmVerifyId) return;
    setVerifying(true);
    try {
      await api.post(`/Etr/${confirmVerifyId}/verify`, {});
      toast.success(tr("Xác thực thành công"));
      setSelectedEtr(null);
      await loadEtrs();
    } catch (err) {
      toast.error(tr("Xác thực ETR thất bại"));
    } finally {
      setVerifying(false);
      setConfirmVerifyId(null);
    }
  };

  const confirmReturn = async (reason) => {
    if (!returnTarget) return;
    if (!reason || !reason.trim()) {
      toast.error(tr("Cần nêu lý do"));
      setReturnTarget(null);
      return;
    }
    setVerifying(true);
    try {
      await api.post(`/Etr/${returnTarget}/return`, { comment: reason.trim() });
      toast.warning(tr("Đã trả lại ETR"));
      setSelectedEtr(null);
      await loadEtrs();
    } catch (err) {
      toast.error(tr("Trả lại ETR thất bại"));
    } finally {
      setVerifying(false);
      setReturnTarget(null);
    }
  };

  // Lọc lịch sử duyệt theo từ khóa: mã ETR (ETR-0001 / 1), tên học viên, khóa, trạng thái
  const filteredHistoryRecords = historyRecords.filter((record) => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    const statusLabel = (() => {
      switch (record.outcome) {
        case "approved":
          return "approved";
        case "rejected":
          return "rejected";
        case "returned":
          return "returned";
        case "verified":
          return "verified";
        case "pending":
          return "submitted";
        default:
          return "in progress";
      }
    })();
    return [
      record.id,
      String(record.etrId),
      record.learner,
      record.course,
      record.status,
      statusLabel,
      // Nhãn HIỂN THỊ đã dịch (trEn) — để gõ tiếng Việt như "phê duyệt"/"trả lại" vẫn tìm thấy
      trEn('Approved'),
      trEn('Rejected'),
      trEn('Returned'),
      trEn('Verified'),
      trEn('Submitted'),
      trEn('In Progress'),
    ]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q));
  });

  const queuePager = usePagination(etrRecords, {
    pageSize: 10,
    resetKey: etrRecords.length,
  });

  const historyPager = usePagination(filteredHistoryRecords, {
    pageSize: 10,
    resetKey: historySearch,
  });

  return (
    <div className="qa-shell">
      {/* Toast notifications */}
      <toast.ToastContainer />

      <section className="qa-page-card">
        <p className="qa-eyebrow">{trEn('ETR review')}</p>
        <h1>{trEn('ETR Review Queue')}</h1>
        <p className="qa-page-description">
          {trEn('View all submitted ETRs awaiting QA review. Click Verify to approve or Return to send back for correction.')}
        </p>
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>{trEn('Submitted ETRs')} ({etrRecords.length})</h2>
            <p className="qa-page-description">
              {trEn('Select one record to review and verify completeness.')}
            </p>
          </div>
          <button
            className="qa-btn"
            type="button"
            onClick={loadEtrs}
            disabled={loading}
          >
            {trEn('Refresh')}
          </button>
        </div>

        <div className="qa-list">
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              {tr('Đang tải...')}
            </div>
          ) : etrRecords.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
              {tr('Chưa có ETR nào được gửi để xác thực.')}
            </div>
          ) : (
            queuePager.pageItems.map((record) => (
              <div
                key={record.id}
                className="qa-list-item"
                style={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: "12px",
                  borderLeft:
                    selectedEtr?.etrId === record.etrId
                      ? "4px solid #c5a059"
                      : "4px solid transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{ cursor: "pointer", flex: "1 1 240px" }}
                    onClick={() => handleViewDetails(record)}
                  >
                    <p className="qa-list-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{record.id} - {record.learner}</span>
                      <span className="qa-status pending">{trEn(record.stage)}</span>
                    </p>
                    <p className="qa-list-desc">{record.course}</p>
                  </div>

                  <div
                    className="qa-actions"
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <button
                      className="qa-btn-ghost"
                      type="button"
                      onClick={() => handleViewDetails(record)}
                      disabled={
                        detailLoading &&
                        detailTarget?.etrId === record.etrId
                      }
                    >
                      {trEn('View Details')}
                    </button>
                    <button
                      className="qa-btn"
                      type="button"
                      style={{ backgroundColor: "#15803d", borderColor: "#15803d", color: "#ffffff", fontWeight: "600" }}
                      onClick={() => setConfirmVerifyId(record.etrId)}
                      disabled={verifying}
                    >
                      ✓ {trEn('Verify ETR')}
                    </button>
                    <button
                      className="qa-btn-secondary"
                      type="button"
                      style={{ color: "#b91c1c", borderColor: "#fca5a5" }}
                      onClick={() => setReturnTarget(record.etrId)}
                      disabled={verifying}
                    >
                      ↺ {trEn('Return for Correction')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination
          page={queuePager.page}
          pageCount={queuePager.pageCount}
          onChange={queuePager.setPage}
          total={queuePager.total}
          pageSize={10}
        />
      </section>

      {/* Lịch sử duyệt: hiển thị TẤT CẢ các ETR kèm trạng thái duyệt/từ chối/trả lại
          (Approved / Rejected / Returned / Verified / Submitted / In Progress) — nhấn
          "Approval History" để mở rộng nội tuyến lịch sử phê duyệt chi tiết của từng ETR. */}
      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>{trEn('Review History')} ({filteredHistoryRecords.length})</h2>
            <p className="qa-page-description">
              {trEn('All ETRs with their approval or rejection status. Click Approval History to view the full review timeline.')}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder={tr('Tìm kiếm theo mã ETR, học viên, khóa học, trạng thái...')}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #d9e1ec",
                fontSize: "12px",
                color: "#002147",
                outline: "none",
                width: "280px",
                maxWidth: "100%",
                backgroundColor: "#ffffff",
              }}
            />
            {historySearch && (
              <button
                className="qa-btn-ghost"
                type="button"
                onClick={() => setHistorySearch("")}
                style={{ whiteSpace: "nowrap" }}
              >
                {trEn('Clear')}
              </button>
            )}
          </div>
        </div>

        <div className="qa-list">
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              {tr('Đang tải...')}
            </div>
          ) : historyRecords.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#64748b",
                fontStyle: "italic",
              }}
            >
              {tr('Chưa có ETR nào.')}
            </div>
          ) : filteredHistoryRecords.length === 0 ? (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#64748b",
                fontStyle: "italic",
              }}
            >
              {tr('Không tìm thấy ETR phù hợp với từ khóa.')}
            </div>
          ) : (
            historyPager.pageItems.map((record) => (
              <div
                key={record.id}
                className="qa-list-item"
                style={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: "12px",
                  borderLeft:
                    selectedHistoryEtrId === record.etrId
                      ? "4px solid #c5a059"
                      : "4px solid transparent",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setSelectedHistoryEtrId(
                      selectedHistoryEtrId === record.etrId
                        ? null
                        : record.etrId
                    )
                  }
                >
                  <div style={{ minWidth: 0 }}>
                    <p className="qa-list-title">
                      {record.id} - {record.learner}
                    </p>
                    <p className="qa-list-desc">
                      {record.course}
                      {record.decidedAt
                        ? ` · ${new Date(record.decidedAt).toLocaleString("vi-VN")}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`qa-status ${
                      record.outcome === "approved" ||
                      record.outcome === "verified"
                        ? "reviewed"
                        : record.outcome === "rejected" ||
                            record.outcome === "returned"
                          ? "rejected"
                          : "pending"
                    }`}
                  >
                    {record.outcome === "approved"
                      ? trEn('Approved')
                      : record.outcome === "rejected"
                        ? trEn('Rejected')
                        : record.outcome === "returned"
                          ? trEn('Returned')
                          : record.outcome === "verified"
                            ? trEn('Verified')
                            : record.outcome === "pending"
                              ? trEn('Submitted')
                              : trEn('In Progress')}
                  </span>
                </div>

                {selectedHistoryEtrId === record.etrId && (
                  <div
                    className="qa-actions"
                    style={{
                      paddingTop: "8px",
                      borderTop: "1px solid #e2e8f0",
                      display: "flex",
                      gap: "8px",
                    }}
                  >
                    <button
                      className="qa-btn-ghost"
                      type="button"
                      onClick={() =>
                        setExpandedHistoryEtrId(
                          expandedHistoryEtrId === record.etrId
                            ? null
                            : record.etrId
                        )
                      }
                    >
                      {expandedHistoryEtrId === record.etrId
                        ? trEn('Hide Approval History')
                        : trEn('Approval History')}
                    </button>
                    <button
                      className="qa-btn-ghost"
                      type="button"
                      onClick={() => handleViewDetails(record)}
                      disabled={detailLoading && detailTarget?.etrId === record.etrId}
                    >
                      {trEn('View Details')}
                    </button>
                  </div>
                )}

                {/* Lịch sử phê duyệt nội tuyến của ETR này — chỉ hiện khi dòng được chọn + mở rộng */}
                {selectedHistoryEtrId === record.etrId &&
                  expandedHistoryEtrId === record.etrId && (
                  <div
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <ApprovalHistory etrId={record.etrId} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <Pagination
          page={historyPager.page}
          pageCount={historyPager.pageCount}
          onChange={historyPager.setPage}
          total={historyPager.total}
          pageSize={10}
        />
      </section>

      {/* Modal ETR Dossier Đầy Đủ — 6 Tabs (Tổng quan, Môn học, Điểm danh, Điểm kiểm tra, Minh chứng & Ký duyệt, Lịch sử phê duyệt) */}
      <EtrDossierModal
        etrId={detailTarget?.etrId}
        isOpen={!!detailTarget}
        onClose={() => setDetailTarget(null)}
        onActionSuccess={loadEtrs}
      />

      {/* Xác nhận xác thực ETR */}
      <ConfirmModal
        isOpen={!!confirmVerifyId}
        onClose={() => setConfirmVerifyId(null)}
        onConfirm={confirmVerify}
        title={tr('Xác thực ETR')}
        message={`${tr('Xác nhận xác thực')} ETR #${String(confirmVerifyId || "").padStart(4, "0")}?`}
        confirmText={tr('XÁC THỰC')}
        cancelText={tr('HỦY BỎ')}
        confirmVariant="primary"
        bodyMessage={tr('Sau khi xác thực, hồ sơ sẽ chuyển sang bước phê duyệt của Training Manager.')}
      />

      {/* Modal nhập lý do trả lại ETR (thay prompt) */}
      <PromptModal
        isOpen={!!returnTarget}
        onClose={() => setReturnTarget(null)}
        onConfirm={confirmReturn}
        title={`${tr('Trả lại ETR')} #${String(returnTarget || "").padStart(4, "0")}`}
        message={tr('Học viên/giảng viên sẽ nhận được lý do để chỉnh sửa hồ sơ.')}
        placeholder={tr('Nhập lý do trả lại ETR...')}
        confirmText={tr('TRẢ LẠI')}
        cancelText={tr('HỦY BỎ')}
        variant="danger"
      />
    </div>
  );
};

export default QARETRReviewQueue;
