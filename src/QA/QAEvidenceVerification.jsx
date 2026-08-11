import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { api } from "../utils/api";
import PromptModal from "../components/PromptModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';
import {
  buildSrToAccountMap,
  resolveEvidenceLearner,
} from "../utils/evidenceEnrich";

const QAEvidenceVerification = () => {
  const { tr, trEn } = useLanguage();
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  // Toast notifications (thay banner + window.prompt cũ)
  const toast = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);
  // Evidence đang bị từ chối (nút Reject trên từng dòng)
  const [rejectTarget, setRejectTarget] = useState(null);
  // Trang Review / xem trước evidence khi bấm vào một evidence
  const [reviewTarget, setReviewTarget] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [reviewRejectOpen, setReviewRejectOpen] = useState(false);

  useEffect(() => {
    loadEvidences();
  }, []);

  const loadEvidences = async () => {
    setLoading(true);
    try {
      const data = await api.get("/Evidences").catch(() => []);
      const evfs = Array.isArray(data) ? data : [];
      // EvidenceFile trả về AccountId (học viên) + SubjectResultId — nối tên học viên qua AccountId,
      // fallback qua subjectResultId (bản ghi tải lên cũ bị lưu nhầm accountId của giảng viên).
      const [profiles, srData] = await Promise.all([
        api.get("/UserProfiles/learners").catch(() => []),
        buildSrToAccountMap(),
      ]);
      const profilesArr = Array.isArray(profiles) ? profiles : [];
      const srToAccount = srData?.srToAccount || {};
      // subjectResultId thuộc ETR đang Completed/Locked — backend chặn sửa evidence (không Verify/Reject được)
      const lockedSrIds = srData?.lockedSrIds || new Set();

      const mapped = evfs.map((ev) => {
        return {
          id: ev.evidenceFileId,
          learner: resolveEvidenceLearner(ev, profilesArr, srToAccount),
          locked: lockedSrIds.has(ev.subjectResultId),
          evidence: ev.fileName || "File",
          fileName: ev.fileName || "File",
          uploadedAt: ev.uploadedAt
            ? new Date(ev.uploadedAt).toLocaleString("vi-VN")
            : "",
          status: ev.verificationStatus === "Verified"
            ? "Verified"
            : ev.verificationStatus === "Rejected"
              ? "Rejected"
              : "Pending",
          mimeType: ev.mimeType || "",
          fileSize: ev.fileSize || 0,
          verificationComment: ev.verificationComment || "",
          subjectResultId: ev.subjectResultId,
          accountId: ev.accountId,
        };
      });

      setEvidenceList(mapped);
    } catch (err) {
      console.error("Error loading evidence list:", err);
    } finally {
      setLoading(false);
    }
  };

  // Verify nhanh từng evidence ngay trên dòng (QA được phép verify)
  const handleVerifyRow = async (row) => {
    if (!row || processing) return;
    setProcessing(true);
    try {
      await api.put(`/Evidences/${row.id}/verify`, {
        VerificationStatus: "Verified",
      });
      toast.success(tr("Xác thực thành công"));
      await loadEvidences();
    } catch (err) {
      toast.error(tr("Xác thực thất bại"));
    } finally {
      setProcessing(false);
    }
  };

  // Từ chối qua PromptModal nhập lý do (thay window.prompt)
  const handleRejectRow = (row) => {
    if (!row || processing) return;
    setRejectTarget(row);
    setRejectOpen(true);
  };

  const handleRejectWithReason = async (reason) => {
    if (!rejectTarget || processing) return;
    if (!reason || !reason.trim()) {
      toast.error(tr("Cần nêu lý do"));
      setRejectOpen(false);
      return;
    }
    setProcessing(true);
    try {
      await api.put(`/Evidences/${rejectTarget.id}/verify`, {
        VerificationStatus: "Rejected",
        VerificationComment: reason.trim(),
      });
      toast.warning(tr("Đã từ chối"));
      setRejectTarget(null);
      await loadEvidences();
    } catch (err) {
      toast.error(tr("Từ chối thất bại"));
    } finally {
      setProcessing(false);
      setRejectOpen(false);
    }
  };

  // ===== Trang Review / xem trước evidence =====
  const isImageType = (mime) => (mime || "").startsWith("image/");
  const isPdfType = (mime) =>
    (mime || "").toLowerCase() === "application/pdf";

  const loadPreview = async (row) => {
    if (!row) return;
    setPreviewLoading(true);
    try {
      const blob = await api.downloadFile(`/Evidences/${row.id}/download`);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      toast.error(tr("Không tải được bản xem trước"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const openReview = (row) => {
    setReviewTarget(row);
    setPreviewUrl("");
    loadPreview(row);
  };

  const closeReview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setReviewTarget(null);
  };

  // Thu hồi object URL khi component unmount để tránh rò rỉ bộ nhớ
  const previewUrlRef = useRef("");
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(
    () => () => {
      if (previewUrlRef.current) window.URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const handleReviewVerify = async () => {
    if (!reviewTarget || processing) return;
    setProcessing(true);
    try {
      await api.put(`/Evidences/${reviewTarget.id}/verify`, {
        VerificationStatus: "Verified",
      });
      toast.success(tr("Xác thực thành công"));
      closeReview();
      await loadEvidences();
    } catch (err) {
      toast.error(tr("Xác thực thất bại"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReviewReject = async (reason) => {
    if (!reviewTarget || processing) return;
    if (!reason || !reason.trim()) {
      toast.error(tr("Cần nêu lý do"));
      setReviewRejectOpen(false);
      return;
    }
    setProcessing(true);
    try {
      await api.put(`/Evidences/${reviewTarget.id}/verify`, {
        VerificationStatus: "Rejected",
        VerificationComment: reason.trim(),
      });
      toast.warning(tr("Đã từ chối"));
      closeReview();
      await loadEvidences();
    } catch (err) {
      toast.error(tr("Từ chối thất bại"));
    } finally {
      setProcessing(false);
      setReviewRejectOpen(false);
    }
  };

  // Tải file minh chứng về máy (GET /Evidences/{id}/download)
  const handleDownload = async (row) => {
    try {
      const blob = await api.downloadFile(`/Evidences/${row.id}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = row.fileName || `evidence-${row.id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(tr("Tải xuống thất bại"));
    }
  };

  // QA KHÔNG có chức năng xóa evidence (backend DELETE /Evidences/{id} chỉ cho Instructor/Admin/Academic)
  const pendingCount = evidenceList.filter((e) => e.status === "Pending").length;

  return (
    <div className="qa-shell">
      {/* Toast notifications */}
      <toast.ToastContainer />

      <section className="qa-page-card">
        <p className="qa-eyebrow">{trEn('Evidence management')}</p>
        <h1>{trEn('Evidence Verification')}</h1>
        <p className="qa-page-description">
          {trEn('Verify or reject uploaded evidence before it is used in ETR review.')}
        </p>
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>{trEn('Pending Evidence')} ({pendingCount})</h2>
            <p className="qa-page-description">
              {trEn('All evidence awaiting QA attention appears here in one queue.')}
            </p>
          </div>
        </div>

        <div className="qa-list">
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              {tr('Đang tải...')}
            </div>
          ) : evidenceList.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
              {tr('Chưa có evidence nào cần xác thực.')}
            </div>
          ) : (
            evidenceList.map((row) => (
              <div key={row.id} className="qa-list-item">
                <div
                  style={{ flex: 1, cursor: "pointer", minWidth: 0 }}
                  onClick={() => openReview(row)}
                  title={trEn('Xem trước / Review')}
                >
                  <p className="qa-list-title">{row.learner}</p>
                  <p className="qa-list-desc">
                    {row.evidence}
                    {row.uploadedAt ? ` · ${row.uploadedAt}` : ""}
                  </p>
                </div>
                <span
                  className={`qa-status ${row.status === "Rejected" ? "rejected" : row.status === "Verified" ? "verified" : "pending"}`}
                >
                  {trEn(row.status)}
                </span>
                <div className="qa-actions" style={{ gap: "8px", flexShrink: 0 }}>
                  <button
                    className="qa-btn-secondary"
                    type="button"
                    onClick={() => openReview(row)}
                    style={{ padding: "6px 10px", fontSize: "11px" }}
                  >
                    {trEn('Review')}
                  </button>
                  {row.status === "Pending" && !row.locked && (
                    <>
                      <button
                        className="qa-btn"
                        type="button"
                        onClick={() => handleVerifyRow(row)}
                        disabled={processing}
                        style={{ padding: "6px 10px", fontSize: "11px" }}
                      >
                        {trEn('Verify')}
                      </button>
                      <button
                        className="qa-btn-secondary"
                        type="button"
                        onClick={() => handleRejectRow(row)}
                        disabled={processing}
                        style={{ padding: "6px 10px", fontSize: "11px" }}
                      >
                        {trEn('Reject')}
                      </button>
                    </>
                  )}
                  {row.locked && (
                    <span
                      className="qa-chip warn"
                      title={tr('Hồ sơ ETR liên quan đã hoàn tất/khóa nên không thể thay đổi minh chứng này.')}
                      style={{ whiteSpace: "nowrap", fontSize: "10px" }}
                    >
                      🔒 {trEn('ETR Locked')}
                    </span>
                  )}
                  <button
                    className="qa-btn-secondary"
                    type="button"
                    onClick={() => handleDownload(row)}
                    style={{ padding: "6px 10px", fontSize: "11px" }}
                  >
                    {trEn('Download')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Modal nhập lý do từ chối evidence (thay window.prompt) */}
      <PromptModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleRejectWithReason}
        title={`${tr('Từ chối Evidence')} — ${rejectTarget?.fileName || ""}`}
        message={tr('Lý do từ chối sẽ được lưu vào hồ sơ minh chứng để học viên/giảng viên biết cách chỉnh sửa.')}
        placeholder={tr('Nhập lý do từ chối...')}
        confirmText={tr('TỪ CHỐI')}
        cancelText={tr('HỦY BỎ')}
        variant="danger"
      />

      {/* ===== Trang Review Evidence: bấm vào evidence để xem trước rồi mới xử lý ===== */}
      {/* Render qua portal vào document.body để popup to, căn giữa CẢ màn hình (che luôn sidebar trái) */}
      {reviewTarget &&
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
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={closeReview}
        >
          <style>
            {`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
            `}
          </style>
          <div
            className="qa-panel"
            style={{
              width: "1240px",
              maxWidth: "96vw",
              maxHeight: "95vh",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
              borderRadius: "20px",
              overflow: "hidden",
              padding: 0,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
              animation: "scaleIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: "#002147",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                borderBottom: "3px solid #c5a059",
                flexShrink: 0,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {trEn('Review Evidence')}
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.6)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {reviewTarget.fileName}
                </p>
              </div>
              <span
                className={`qa-status ${reviewTarget.status === "Rejected" ? "rejected" : reviewTarget.status === "Verified" ? "verified" : "pending"}`}
              >
                {trEn(reviewTarget.status)}
              </span>
              <button
                type="button"
                onClick={closeReview}
                aria-label={tr('Close')}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  color: "#ffffff",
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 15,
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Body: preview + info/actions */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.35fr 280px",
                gap: "18px",
                padding: "18px 22px",
                overflow: "auto",
              }}
            >
              {/* Preview pane */}
              <div
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  minHeight: "520px",
                  maxHeight: "74vh",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {previewLoading ? (
                  <div style={{ color: "#64748b", fontSize: "12px" }}>
                    {tr('Đang tải bản xem trước...')}
                  </div>
                ) : previewUrl ? (
                  isImageType(reviewTarget.mimeType) ? (
                    <img
                      src={previewUrl}
                      alt={reviewTarget.fileName}
                      style={{ maxWidth: "100%", maxHeight: "74vh", objectFit: "contain" }}
                    />
                  ) : isPdfType(reviewTarget.mimeType) ? (
                    <iframe
                      src={previewUrl}
                      title={reviewTarget.fileName}
                      style={{ width: "100%", height: "74vh", border: "none" }}
                    />
                  ) : (
                    <div style={{ textAlign: "center", color: "#64748b", padding: 24 }}>
                      <p style={{ fontSize: 26, margin: "0 0 8px" }}>📄</p>
                      <p style={{ margin: 0, fontSize: 12 }}>
                        {tr('Loại tệp này không xem trước được trong trình duyệt.')}
                      </p>
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: "center", color: "#64748b", padding: 24 }}>
                    <p style={{ margin: 0, fontSize: 12, fontStyle: "italic" }}>
                      {tr('Không tải được bản xem trước — dùng nút Tải xuống để mở tệp.')}
                    </p>
                  </div>
                )}
              </div>

              {/* Info + actions */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "14px" }}
              >
                <div className="qa-kv-grid">
                  <div className="qa-kv">
                    <strong>{trEn('Learner')}</strong>
                    <span>{reviewTarget.learner}</span>
                  </div>
                  <div className="qa-kv">
                    <strong>{trEn('File')}</strong>
                    <span style={{ wordBreak: "break-word" }}>{reviewTarget.fileName}</span>
                  </div>
                  <div className="qa-kv">
                    <strong>{trEn('Uploaded')}</strong>
                    <span>{reviewTarget.uploadedAt || "N/A"}</span>
                  </div>
                  <div className="qa-kv">
                    <strong>{trEn('Size')}</strong>
                    <span>
                      {reviewTarget.fileSize
                        ? `${(reviewTarget.fileSize / (1024 * 1024)).toFixed(2)} MB`
                        : "—"}
                    </span>
                  </div>
                  <div className="qa-kv">
                    <strong>{trEn('Type')}</strong>
                    <span>{reviewTarget.mimeType || "—"}</span>
                  </div>
                  <div className="qa-kv">
                    <strong>{tr('Subject Result')}</strong>
                    <span>#{reviewTarget.subjectResultId ?? "—"}</span>
                  </div>
                </div>

                {reviewTarget.locked && (
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "rgba(0,33,71,0.05)",
                      border: "1px solid rgba(0,33,71,0.12)",
                      borderRadius: 10,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#475569",
                        textTransform: "uppercase",
                      }}
                    >
                      🔒 {trEn('ETR Completed / Locked')}
                    </p>
                    <p
                      style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(0,33,71,0.7)" }}
                    >
                      {tr('Hồ sơ ETR liên quan đã hoàn tất và bị khóa nên minh chứng này không thể xác thực hoặc từ chối.')}
                    </p>
                  </div>
                )}

                {reviewTarget.verificationComment && (
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "rgba(239,68,68,0.05)",
                      border: "1px solid rgba(239,68,68,0.15)",
                      borderRadius: 10,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#b00020",
                        textTransform: "uppercase",
                      }}
                    >
                      {trEn('QA Comment')}
                    </p>
                    <p
                      style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(0,33,71,0.75)" }}
                    >
                      {reviewTarget.verificationComment}
                    </p>
                  </div>
                )}

                <div
                  className="qa-actions"
                  style={{
                    flexDirection: "column",
                    alignItems: "stretch",
                    marginTop: "auto",
                  }}
                >
                  {reviewTarget.status === "Pending" && !reviewTarget.locked && (
                    <>
                      <button
                        className="qa-btn"
                        type="button"
                        onClick={handleReviewVerify}
                        disabled={processing}
                      >
                        {processing ? trEn('Processing...') : trEn('Verify')}
                      </button>
                      <button
                        className="qa-btn-secondary"
                        type="button"
                        onClick={() => setReviewRejectOpen(true)}
                        disabled={processing}
                      >
                        {trEn('Reject')}
                      </button>
                    </>
                  )}
                  <button
                    className="qa-btn-secondary"
                    type="button"
                    onClick={() => handleDownload(reviewTarget)}
                  >
                    {trEn('Download')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal nhập lý do từ chối từ trang Review */}
      <PromptModal
        isOpen={reviewRejectOpen}
        onClose={() => setReviewRejectOpen(false)}
        onConfirm={handleReviewReject}
        title={tr('Từ chối Evidence')}
        message={tr('Lý do từ chối sẽ được lưu vào hồ sơ minh chứng để học viên/giảng viên biết cách chỉnh sửa.')}
        placeholder={tr('Nhập lý do từ chối...')}
        confirmText={tr('TỪ CHỐI')}
        cancelText={tr('HỦY BỎ')}
        variant="danger"
      />
    </div>
  );
};

export default QAEvidenceVerification;
