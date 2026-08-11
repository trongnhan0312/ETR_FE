import { useState, useEffect } from "react";
import { api } from "../utils/api";
import ApprovalHistory from "../components/ApprovalHistory";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';

const QARETRDetails = () => {
  const { tr, trEn } = useLanguage();
  const [etrList, setEtrList] = useState([]);
  const [selectedEtr, setSelectedEtr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  // Lưu trạng thái xác thực của từng EvidenceFile (key: evidenceFileId) — lấy từ GET /Evidences
  const [evidenceById, setEvidenceById] = useState({});
  // ETR đã tải xong chi tiết evidence (GET /Etr/{id}) — để hiển thị "…" trong lúc chờ
  const [loadedEtrId, setLoadedEtrId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [etrs, enrollments, profiles, evidences] = await Promise.all([
        api.get("/Etr").catch(() => []),
        api.get("/Enrollments").catch(() => []),
        api.get("/UserProfiles/learners").catch(() => []),
        api.get("/Evidences").catch(() => []),
      ]);

      const etrsArr = Array.isArray(etrs) ? etrs : [];
      const enrollmentsArr = Array.isArray(enrollments) ? enrollments : [];
      const profilesArr = Array.isArray(profiles) ? profiles : [];
      const evfsArr = Array.isArray(evidences) ? evidences : [];

      // EvidenceResponse (GET /Evidences) KHÔNG trả ETRCourseRecordId — chỉ có SubjectResultId.
      // Lưu map evidenceFileId → verificationStatus để nối khi lấy chi tiết ETR (GET /Etr/{id}).
      const evMap = {};
      evfsArr.forEach((ev) => {
        evMap[ev.evidenceFileId] = {
          verificationStatus: ev.verificationStatus,
          fileName: ev.fileName,
        };
      });
      setEvidenceById(evMap);

      const mapped = etrsArr
        .filter((e) => e.status === "Submitted" || e.status === "Verified")
        .map((etr) => {
          const etrId = etr.etrCourseRecordId || etr.eTRCourseRecordId;
          const enrollment = enrollmentsArr.find(
            (enr) => enr.enrollmentId === etr.enrollmentId
          );
          const profile = enrollment
            ? profilesArr.find((p) => p.accountId === enrollment.accountId)
            : null;

          // evidenceCount/verifiedCount được điền chính xác khi chọn ETR (xem effect bên dưới)
          return {
            etrId,
            id: `#ETR-${String(etrId).padStart(4, "0")}`,
            learner: profile?.fullName || `Student #${enrollment?.accountId || ""}`,
            course: `Lớp #${enrollment?.classId || ""}`,
            status: etr.status,
            evidenceCount: 0,
            verifiedCount: 0,
            evidenceFiles: [],
            submittedAt: etr.submittedAt
              ? new Date(etr.submittedAt).toLocaleString("vi-VN")
              : "N/A",
          };
        });

      setEtrList(mapped);
      if (mapped.length > 0) setSelectedEtr(mapped[0]);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Toast notifications
  const toast = useToast();

  // Xác nhận trước khi Verify / Return (thay window.confirm)
  const [confirmAction, setConfirmAction] = useState(null); // 'verify' | 'return'

  const runReviewAction = async (action) => {
    if (!selectedEtr) return;
    setVerifying(true);
    try {
      if (action === "verify") {
        await api.post(`/Etr/${selectedEtr.etrId}/verify`, {
          comment: reviewNotes,
        });
        toast.success(tr("Xác thực thành công"));
      } else {
        await api.post(`/Etr/${selectedEtr.etrId}/return`, {
          comment: reviewNotes,
        });
        toast.warning(tr("Đã trả lại ETR"));
      }
      await loadData();
    } catch (err) {
      const actionLabel = action === "verify" ? tr("Xác thực thất bại") : tr("Trả lại thất bại");
      toast.error(actionLabel);
    } finally {
      setVerifying(false);
      setReviewNotes("");
      setConfirmAction(null);
    }
  };

  const handleVerifyEtr = () => {
    if (!selectedEtr) return;
    setConfirmAction("verify");
  };

  const handleReturnEtr = () => {
    if (!selectedEtr) return;
    if (!reviewNotes.trim()) {
      toast.warning(tr("Thiếu lý do"));
      return;
    }
    setConfirmAction("return");
  };

  const handleSelectEtr = (etr) => {
    setSelectedEtr(etr);
    setReviewNotes("");
  };

  // Khi chọn ETR: lấy GET /Etr/{id} (trả EvidenceFiles thuộc ETR này) rồi nối trạng thái
  // xác thực từ map /Evidences — EvidenceResponse không có ETRCourseRecordId nên không thể
  // lọc trực tiếp, phải nối qua EvidenceFileId.
  useEffect(() => {
    if (!selectedEtr) return;
    let cancelled = false;
    (async () => {
      try {
        const details = await api
          .get(`/Etr/${selectedEtr.etrId}`)
          .catch(() => null);
        if (cancelled || !details) return;
        const evfs = Array.isArray(details.evidenceFiles)
          ? details.evidenceFiles
          : [];
        const stats = evfs.map((e) => ({
          id: e.evidenceFileId,
          fileName: e.fileName,
          uploadedAt: e.uploadedAt,
          status:
            evidenceById[e.evidenceFileId]?.verificationStatus || "Pending",
        }));
        setSelectedEtr((prev) =>
          prev && prev.etrId === selectedEtr.etrId
            ? {
                ...prev,
                evidenceCount: stats.length,
                verifiedCount: stats.filter(
                  (s) => s.status === "Verified"
                ).length,
                evidenceFiles: stats,
              }
            : prev
        );
        setLoadedEtrId(selectedEtr.etrId);
      } catch {
        /* ignore — giữ nguyên số liệu nếu không tải được chi tiết */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEtr?.etrId]);

  return (
    <div className="qa-shell">
      {/* Toast notifications */}
      <toast.ToastContainer />
      <section className="qa-page-card">
        <p className="qa-eyebrow">{trEn('ETR details')}</p>
        <h1>{trEn('Review ETR Details')}</h1>
        <p className="qa-page-description">
          {trEn('Inspect the learner profile, attendance, assessment, evidence, and approval history before approving or returning the ETR.')}
        </p>
      </section>

      {/* ETR Selector */}
      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>{trEn('Select ETR Record')}</h2>
          </div>
          <button className="qa-btn" type="button" onClick={loadData} disabled={loading}>
            {trEn('Refresh')}
          </button>
        </div>

        <div className="qa-list">
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              {tr('Đang tải...')}
            </div>
          ) : etrList.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
              {tr('Chưa có ETR nào.')}
            </div>
          ) : (
            etrList.map((etr) => (
              <div
                key={etr.etrId}
                className="qa-list-item"
                onClick={() => handleSelectEtr(etr)}
                style={{
                  cursor: "pointer",
                  backgroundColor:
                    selectedEtr?.etrId === etr.etrId
                      ? "rgba(197, 160, 89, 0.05)"
                      : "#ffffff",
                  borderLeft:
                    selectedEtr?.etrId === etr.etrId
                      ? "4px solid #c5a059"
                      : "4px solid transparent",
                }}
              >
                <div>
                  <p className="qa-list-title">
                    {etr.learner}
                  </p>
                  <p className="qa-list-desc">
                    {etr.id} - {etr.course}
                  </p>
                </div>
                <span
                  className={`qa-status ${etr.status === "Verified" ? "verified" : "pending"}`}
                >
                  {etr.status === "Submitted" ? trEn('Pending QA') : trEn('Verified')}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {selectedEtr && (
        <section className="qa-detail-grid">
          <div className="qa-panel">
            <h2 className="qa-section-title">{trEn('Record Summary')}</h2>
            <h2 className="qa-section-title" style={{ marginTop: "24px" }}>{trEn('Approval History')}</h2>
            <ApprovalHistory etrId={selectedEtr.etrId} />
            <div className="qa-kv-grid">
              <div className="qa-kv">
                <strong>{trEn('ETR ID')}</strong>
                <span>{selectedEtr.id}</span>
              </div>
              <div className="qa-kv">
                <strong>{trEn('Learner')}</strong>
                <span>{selectedEtr.learner}</span>
              </div>
              <div className="qa-kv">
                <strong>{trEn('Course / Class')}</strong>
                <span>{selectedEtr.course}</span>
              </div>
              <div className="qa-kv">
                <strong>{trEn('Evidence')}</strong>
                <span>
                  {selectedEtr.etrId === loadedEtrId
                    ? `${selectedEtr.verifiedCount}/${selectedEtr.evidenceCount} ${trEn('verified')}`
                    : "…"}
                </span>
              </div>
              <div className="qa-kv">
                <strong>{trEn('Submitted At')}</strong>
                <span>{selectedEtr.submittedAt}</span>
              </div>
            </div>

            {selectedEtr.evidenceFiles?.length > 0 && (
              <div className="qa-list" style={{ marginTop: "12px" }}>
                {selectedEtr.evidenceFiles.map((f) => (
                  <div
                    key={f.id}
                    className="qa-list-item"
                    style={{ padding: "8px 10px" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="qa-list-title"
                        style={{ fontSize: "12px" }}
                        title={f.fileName}
                      >
                        {f.fileName}
                      </p>
                      {f.uploadedAt && (
                        <p className="qa-list-desc" style={{ fontSize: "10px" }}>
                          {new Date(f.uploadedAt).toLocaleString("vi-VN")}
                        </p>
                      )}
                    </div>
                    <span
                      className={`qa-status ${
                        f.status === "Rejected"
                          ? "rejected"
                          : f.status === "Verified"
                            ? "verified"
                            : "pending"
                      }`}
                      style={{ fontSize: "10px" }}
                    >
                      {trEn(f.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="qa-panel">
            <h2 className="qa-section-title">{trEn('QA Review Form')}</h2>
            <div className="qa-list">
              <div>
                <label className="qa-section-title">{trEn('Review Notes')}</label>
                <textarea
                  className="qa-textarea"
                  placeholder={trEn('Add verification notes, missing items, or approval remarks.')}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
              <div className="qa-actions">
                <button
                  className="qa-btn"
                  type="button"
                  onClick={handleVerifyEtr}
                  disabled={verifying}
                >
                  {trEn('Verify ETR')}
                </button>
                <button
                  className="qa-btn-secondary"
                  type="button"
                  onClick={handleReturnEtr}
                  disabled={verifying}
                >
                  {trEn('Return for Correction')}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Xác nhận Verify / Return ETR */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => runReviewAction(confirmAction)}
        title={confirmAction === "verify" ? tr("Xác thực ETR") : tr("Trả lại ETR")}
        message={
          confirmAction === "verify"
            ? `${tr('Xác nhận xác thực')} ${selectedEtr?.id || ""}?`
            : `${tr('Trả lại')} ${selectedEtr?.id || ""} ${tr('để chỉnh sửa?')}`
        }
        confirmText={confirmAction === "verify" ? tr("XÁC THỰC") : tr("TRẢ LẠI")}
        cancelText={tr("HỦY BỎ")}
        confirmVariant={confirmAction === "return" ? "danger" : "primary"}
        bodyMessage={
          confirmAction === "verify"
            ? tr("Sau khi xác thực, hồ sơ sẽ chuyển sang bước phê duyệt của Training Manager.")
            : tr("Học viên/giảng viên sẽ nhận được yêu cầu chỉnh sửa kèm lý do của bạn.")
        }
      />
    </div>
  );
};

export default QARETRDetails;
