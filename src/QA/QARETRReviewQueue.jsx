import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { api } from "../utils/api";
import ConfirmModal from "../components/ConfirmModal";
import PromptModal from "../components/PromptModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import ApprovalHistory from "../components/ApprovalHistory";
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";

// Dòng hiển thị 1 bước kiểm duyệt trong modal chi tiết ETR
const StepStatusRow = ({ label, ok }) => {
  const { tr } = useLanguage();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
      <span>{tr(label)}</span>
      <span style={{ color: ok ? '#15803d' : '#d97706', fontWeight: 'bold' }}>
        {ok ? tr('✓ ĐÃ XÁC THỰC') : tr('⌛ ĐANG CHỜ')}
      </span>
    </div>
  );
};

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
  const [etrDetail, setEtrDetail] = useState(null);
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
      const data = await api.get("/Etr").catch(() => []);
      const etrs = Array.isArray(data) ? data : [];
      const enrollments = await api.get("/Enrollments").catch(() => []);
      const enrollmentsArr = Array.isArray(enrollments) ? enrollments : [];
      const profiles = await api.get("/UserProfiles/learners").catch(() => []);
      const profilesArr = Array.isArray(profiles) ? profiles : [];
      // Approval requests: CurrentStatus phân biệt Rejected vs ReturnedForCorrection
      // (ETR.Status của cả 2 đều là ReturnedForCorrection — chỉ ApprovalRequest phân biệt được).
      const approvals = await api.get("/Approvals").catch(() => []);
      const approvalsArr = Array.isArray(approvals) ? approvals : [];

      const submitted = etrs
        .filter((e) => e.status === "Submitted")
        .map((etr) => {
          const enrollment = enrollmentsArr.find(
            (enr) => enr.enrollmentId === etr.enrollmentId
          );
          const profile = enrollment
            ? profilesArr.find((p) => p.accountId === enrollment.accountId)
            : null;
          return {
            id: `ETR-${String(etr.etrCourseRecordId || etr.eTRCourseRecordId).padStart(4, "0")}`,
            etrId: etr.etrCourseRecordId || etr.eTRCourseRecordId,
            learner: profile?.fullName || `Student #${enrollment?.accountId || ""}`,
            course: `Lớp #${enrollment?.classId || ""}`,
            stage: "Submitted",
          };
        });

      // Lịch sử duyệt: HIỂN THỊ TẤT CẢ các ETR (không lọc trạng thái) kèm trạng thái duyệt:
      //   - approvalStatus ưu tiên từ ApprovalRequest (Approved/Rejected/ReturnedForCorrection/Verified/Pending)
      //   - fallback về ETR.Status (Completed/ReturnedForCorrection/Verified/Submitted/InProgress/...)
      // LƯU Ý: mỗi lần Submit tạo MỘT ApprovalRequest mới → cùng ETR có thể có nhiều request
      // theo vòng đời (Pending → Rejected → gửi lại → Pending mới). Phải sắp xếp theo
      // submittedAt giảm dần rồi mới build map (last-wins) để request MỚI NHẤT được ưu tiên.
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
          const profile = enrollment
            ? profilesArr.find((p) => p.accountId === enrollment.accountId)
            : null;
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
          } else if (rawStatus === "Submitted" || rawStatus === "Pending") {
            outcome = "pending";
          }

          return {
            id: `ETR-${String(etrId).padStart(4, "0")}`,
            etrId,
            learner: profile?.fullName || `Student #${enrollment?.accountId || ""}`,
            course: `Lớp #${enrollment?.classId || ""}`,
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
  // để modal chi tiết hiển thị tên thật thay vì chỉ mã ID.
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

  // Mở modal chi tiết ETR: lấy GET /Etr/{id} (kết quả môn học, điểm, approval history, evidence)
  const handleViewDetails = async (record) => {
    setDetailTarget(record);
    setEtrDetail(null);
    setDetailLoading(true);
    try {
      const details = await api.get(`/Etr/${record.etrId}`).catch(() => null);
      // Chống race condition: bỏ qua response cũ nếu user đã mở ETR khác trong lúc chờ
      setDetailTarget((cur) => {
        if (!cur || cur.etrId !== record.etrId) return cur;
        setEtrDetail(details);
        return cur;
      });
    } finally {
      setDetailLoading(false);
    }
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

  // —— Tính trạng thái các bước kiểm duyệt từ dữ liệu thật (không gắn vào ETR status) ——
  const detailSubjectResults = Array.isArray(etrDetail?.subjectResults)
    ? etrDetail.subjectResults
    : [];
  const detailAttendanceOk =
    detailSubjectResults.length > 0 &&
    detailSubjectResults.every((sr) => (sr.attendanceRate ?? 0) >= 80);
  const detailResultsOk =
    detailSubjectResults.length > 0 &&
    detailSubjectResults.every((sr) => {
      const all = [
        ...(sr.assessmentResults || []),
        ...(sr.practicalChecklistResults || []),
      ];
      if (sr.status === "Exempted" || all.length === 0) return true;
      return all.every((r) => r.isPublished === true);
    });
  const detailEvidenceTotal = detailSubjectResults.reduce(
    (n, sr) => n + (evidenceBySrId[sr.subjectResultId]?.length || 0),
    0
  );
  const detailEvidenceVerified = detailSubjectResults.reduce(
    (n, sr) =>
      n +
      (evidenceBySrId[sr.subjectResultId]?.filter(
        (e) => e.verificationStatus === "Verified"
      ).length || 0),
    0
  );
  const detailEvidenceOk =
    (detailEvidenceTotal > 0 &&
      detailEvidenceVerified === detailEvidenceTotal) ||
    etrDetail?.status === "Verified" ||
    etrDetail?.status === "Completed";

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
                    cursor: "pointer",
                  }}
                  onClick={() =>
                    setSelectedEtr(
                      selectedEtr?.etrId === record.etrId ? null : record
                    )
                  }
                >
                  <div>
                    <p className="qa-list-title">
                      {record.id} - {record.learner}
                    </p>
                    <p className="qa-list-desc">{record.course}</p>
                  </div>
                  <span className="qa-status pending">{trEn(record.stage)}</span>
                </div>

                {selectedEtr?.etrId === record.etrId && (
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
                      onClick={() => setConfirmVerifyId(record.etrId)}
                      disabled={verifying}
                    >
                      {trEn('Verify ETR')}
                    </button>
                    <button
                      className="qa-btn-secondary"
                      type="button"
                      onClick={() => setReturnTarget(record.etrId)}
                      disabled={verifying}
                    >
                      {trEn('Return for Correction')}
                    </button>
                  </div>
                )}
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

      {/* Modal xem chi tiết đầy đủ ETR (toàn bộ thông tin trước khi Verify/Return)
          Render qua createPortal → document.body: tránh bị "position: fixed" kẹt trong vùng
          nội dung (lệch phải do menu trái + animation transform của .qa-shell), giúp modal
          luôn nằm chính giữa toàn màn hình. */}
      {detailTarget &&
        createPortal(
          <div className="modal-overlay">
          <div className="modal-container" style={{ width: "860px", maxWidth: "95%" }}>
            <header className="modal-header">
              <h2>{trEn('ETR Full Details')}</h2>
              <button
                className="close-btn"
                type="button"
                onClick={() => setDetailTarget(null)}
                aria-label={tr('Đóng')}
              >
                &times;
              </button>
            </header>

            <div
              className="modal-body"
              style={{
                padding: "28px",
                maxHeight: "78vh",
                overflowY: "auto",
                backgroundColor: "#fdfdfd",
              }}
            >
              {detailLoading ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#64748b" }}>
                  {tr('Đang tải...')}
                </div>
              ) : !etrDetail ? (
                <div style={{ padding: "32px", textAlign: "center", color: "#dc2626" }}>
                  {tr('Không thể tải chi tiết ETR.')}
                </div>
              ) : (
                <>
                  {/* ETR Header Title — giống ETR FINAL SHEET bên Academic */}
                  <div style={{ textAlign: "center", marginBottom: "22px" }}>
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: 900,
                        color: "#002147",
                        textTransform: "uppercase",
                        margin: 0,
                      }}
                    >
                      ETR TRAINING ACADEMY
                    </h3>
                    <h4
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#c5a059",
                        margin: "4px 0 0",
                        letterSpacing: "0.05em",
                      }}
                    >
                      ELECTRONIC TRAINING RECORD (ETR)
                    </h4>
                    <div
                      style={{
                        width: "60px",
                        height: "2px",
                        backgroundColor: "#c5a059",
                        margin: "10px auto 0",
                      }}
                    />
                  </div>

                  {/* Thông tin hồ sơ */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "14px",
                      border: "1px solid #e0e4e8",
                      borderRadius: "8px",
                      padding: "18px",
                      backgroundColor: "#ffffff",
                      marginBottom: "18px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          color: "rgba(0,33,71,0.4)",
                          textTransform: "uppercase",
                        }}
                      >
                        {tr('MÃ ETR HỒ SƠ')}
                      </div>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          color: "#c5a059",
                          marginTop: "4px",
                        }}
                      >
                        {detailTarget.id}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          color: "rgba(0,33,71,0.4)",
                          textTransform: "uppercase",
                          marginTop: "12px",
                        }}
                      >
                        {tr('HỌC VIÊN ĐÀO TẠO')}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#002147",
                          marginTop: "4px",
                        }}
                      >
                        {detailTarget.learner}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          color: "rgba(0,33,71,0.4)",
                          textTransform: "uppercase",
                        }}
                      >
                        {tr('KHÓA ĐÀO TẠO')}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "#002147",
                          marginTop: "4px",
                        }}
                      >
                        {detailTarget.course}
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          fontWeight: 900,
                          color: "rgba(0,33,71,0.4)",
                          textTransform: "uppercase",
                          marginTop: "12px",
                        }}
                      >
                        {tr('TRẠNG THÁI')}
                      </div>
                      <span
                        className={`qa-status ${
                          etrDetail.status === "Completed" ||
                          etrDetail.status === "Verified"
                            ? "reviewed"
                            : "pending"
                        }`}
                        style={{ marginTop: "4px" }}
                      >
                        {trEn(etrDetail.status)}
                      </span>
                    </div>
                  </div>

                  {/* CHI TIẾT KIỂM DUYỆT CÁC BƯỚC HỒ SƠ */}
                  <div
                    style={{
                      border: "1px solid #e0e4e8",
                      borderRadius: "8px",
                      padding: "18px",
                      backgroundColor: "#ffffff",
                      marginBottom: "18px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "#002147",
                        textTransform: "uppercase",
                        marginBottom: "12px",
                      }}
                    >
                      {tr('CHI TIẾT KIỂM DUYỆT CÁC BƯỚC HỒ SƠ')}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <StepStatusRow label={`1. ${tr('Hồ sơ thông tin cá nhân:')}`} ok />
                      <StepStatusRow
                        label={`2. ${tr('Điểm danh / Chuyên cần:')}`}
                        ok={detailAttendanceOk}
                      />
                      <StepStatusRow
                        label={`3. ${tr('Điểm số kết quả kiểm tra:')}`}
                        ok={detailResultsOk}
                      />
                      <StepStatusRow
                        label={`4. ${tr('Minh chứng đính kèm hồ sơ:')}`}
                        ok={detailEvidenceOk}
                      />
                    </div>
                  </div>

                  {/* Kết quả môn học + điểm chi tiết */}
                  <div
                    style={{
                      border: "1px solid #e0e4e8",
                      borderRadius: "8px",
                      padding: "18px",
                      backgroundColor: "#ffffff",
                      marginBottom: "18px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "#002147",
                        textTransform: "uppercase",
                        marginBottom: "12px",
                      }}
                    >
                      {tr('KẾT QUẢ MÔN HỌC & ĐIỂM')} ({detailSubjectResults.length})
                    </div>
                    {detailSubjectResults.length === 0 ? (
                      <div
                        style={{
                          padding: "12px",
                          textAlign: "center",
                          color: "#64748b",
                          fontStyle: "italic",
                        }}
                      >
                        {tr('Chưa có kết quả môn học.')}
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {detailSubjectResults.map((sr) => {
                          const subject = subjectMap[sr.subjectId];
                          const assessments = sr.assessmentResults || [];
                          const practicals = sr.practicalChecklistResults || [];
                          const srEvidences = evidenceBySrId[sr.subjectResultId] || [];
                          return (
                            <div
                              key={sr.subjectResultId}
                              style={{
                                border: "1px solid #e5eaf2",
                                borderRadius: "10px",
                                padding: "12px 14px",
                                backgroundColor: "#fbfdff",
                              }}
                            >
                              {/* Tiêu đề môn học */}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: "8px",
                                }}
                              >
                                <strong style={{ fontSize: "13px", color: "#002147" }}>
                                  {subject
                                    ? `${subject.subjectCode || ""} — ${subject.subjectName}`
                                    : `Môn #${sr.subjectId}`}
                                </strong>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    color: "#475569",
                                  }}
                                >
                                  {tr('Trạng thái')}:{" "}
                                  <span
                                    style={{
                                      color:
                                        sr.status === "Passed"
                                          ? "#15803d"
                                          : sr.status === "Failed"
                                            ? "#b91c1c"
                                            : "#b45309",
                                    }}
                                  >
                                    {sr.status}
                                  </span>
                                  {" "}
                                  · {tr('Chuyên cần')}:{" "}
                                  <strong>{sr.attendanceRate ?? 0}%</strong>
                                  {" "}
                                  · {tr('Ký duyệt')}:{" "}
                                  <strong>{sr.isSignedOff ? "✓" : "—"}</strong>
                                </span>
                              </div>

                              {/* Điểm assessment */}
                              {assessments.length > 0 && (
                                <div style={{ marginTop: "10px" }}>
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      color: "#94a3b8",
                                      textTransform: "uppercase",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    {tr('ĐIỂM KIỂM TRA (ASSESSMENT)')}
                                  </div>
                                  {assessments.map((ar) => {
                                    const a = assessmentMap[ar.assessmentId];
                                    return (
                                      <div
                                        key={ar.assessmentResultId}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          fontSize: "12px",
                                          padding: "4px 0",
                                          borderTop: "1px dashed #e2e8f0",
                                        }}
                                      >
                                        <span style={{ color: "#475569" }}>
                                          {a
                                            ? a.componentName
                                            : `Assessment #${ar.assessmentId}`}
                                        </span>
                                        <span style={{ color: "#475569" }}>
                                          {tr('Điểm')}:{" "}
                                          <strong style={{ color: "#002147" }}>
                                            {ar.score}
                                          </strong>{" "}
                                          · {ar.resultStatus} · {tr('Lần')} {ar.attemptNo}{" "}
                                          ·{" "}
                                          <span
                                            style={{
                                              color: ar.isPublished
                                                ? "#15803d"
                                                : "#b45309",
                                              fontWeight: 700,
                                            }}
                                          >
                                            {ar.isPublished
                                              ? tr('ĐÃ CHỐT')
                                              : tr('CHƯA CHỐT')}
                                          </span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Kết quả practical checklist */}
                              {practicals.length > 0 && (
                                <div style={{ marginTop: "8px" }}>
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      color: "#94a3b8",
                                      textTransform: "uppercase",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    {tr('BẢNG KIỂM THỰC HÀNH (PRACTICAL)')}
                                  </div>
                                  {practicals.map((pr) => {
                                    const c = checklistMap[pr.practicalChecklistId];
                                    return (
                                      <div
                                        key={pr.practicalChecklistResultId}
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          fontSize: "12px",
                                          padding: "4px 0",
                                          borderTop: "1px dashed #e2e8f0",
                                        }}
                                      >
                                        <span style={{ color: "#475569" }}>
                                          {c
                                            ? c.itemName
                                            : `Checklist #${pr.practicalChecklistId}`}
                                        </span>
                                        <span style={{ color: "#475569" }}>
                                          {pr.resultStatus}{" "}
                                          ·{" "}
                                          <span
                                            style={{
                                              color: pr.isPublished
                                                ? "#15803d"
                                                : "#b45309",
                                              fontWeight: 700,
                                            }}
                                          >
                                            {pr.isPublished
                                              ? tr('ĐÃ CHỐT')
                                              : tr('CHƯA CHỐT')}
                                          </span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Evidence của môn này */}
                              {srEvidences.length > 0 && (
                                <div style={{ marginTop: "8px" }}>
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 800,
                                      color: "#94a3b8",
                                      textTransform: "uppercase",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    {tr('MINH CHỨNG')} ({srEvidences.length})
                                  </div>
                                  {srEvidences.map((ev) => (
                                    <div
                                      key={ev.evidenceFileId}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        fontSize: "12px",
                                        padding: "4px 0",
                                        borderTop: "1px dashed #e2e8f0",
                                      }}
                                    >
                                      <span
                                        style={{
                                          color: "#475569",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          maxWidth: "60%",
                                        }}
                                        title={ev.fileName}
                                      >
                                        {ev.fileName || `Evidence #${ev.evidenceFileId}`}
                                      </span>
                                      <span
                                        style={{
                                          fontWeight: 700,
                                          fontSize: "11px",
                                          color:
                                            ev.verificationStatus === "Verified"
                                              ? "#15803d"
                                              : ev.verificationStatus === "Rejected"
                                                ? "#b91c1c"
                                                : "#b45309",
                                        }}
                                      >
                                        {ev.verificationStatus || "Pending"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Lịch sử phê duyệt */}
                  <div
                    style={{
                      border: "1px solid #e0e4e8",
                      borderRadius: "8px",
                      padding: "18px",
                      backgroundColor: "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "12px",
                        color: "#002147",
                        textTransform: "uppercase",
                        marginBottom: "12px",
                      }}
                    >
                      {tr('LỊCH SỬ PHÊ DUYỆT')}
                    </div>
                    <ApprovalHistory etrId={detailTarget.etrId} />
                  </div>
                </>
              )}
            </div>
          </div>
          </div>,
          document.body
        )}

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
