import { useState, useEffect } from "react";
import { api } from "../utils/api";
import PromptModal from "../components/PromptModal";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';

const QAEvidenceVerification = () => {
  const { tr } = useLanguage();
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  // Toast notifications (thay banner + window.prompt cũ)
  const toast = useToast();
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    loadEvidences();
  }, []);

  const loadEvidences = async () => {
    setLoading(true);
    try {
      const data = await api.get("/Evidences").catch(() => []);
      const evfs = Array.isArray(data) ? data : [];
      // Fetch ETR records to link evidence to student names
      const etrs = await api.get("/Etr").catch(() => []);
      const etrsArr = Array.isArray(etrs) ? etrs : [];
      const enrollments = await api.get("/Enrollments").catch(() => []);
      const enrollmentsArr = Array.isArray(enrollments) ? enrollments : [];
      const profiles = await api.get("/UserProfiles/learners").catch(() => []);
      const profilesArr = Array.isArray(profiles) ? profiles : [];

      const mapped = evfs.map((ev) => {
        const etr = etrsArr.find(
          (e) =>
            (e.eTRCourseRecordId || e.etrCourseRecordId) ===
            (ev.eTRCourseRecordId || ev.etrCourseRecordId)
        );
        const enrollment = etr
          ? enrollmentsArr.find((enr) => enr.enrollmentId === etr.enrollmentId)
          : null;
        const profile = enrollment
          ? profilesArr.find((p) => p.accountId === enrollment.accountId)
          : null;

        return {
          id: ev.evidenceFileId,
          learner: profile?.fullName || `Student #${enrollment?.accountId || ""}`,
          evidence: ev.fileName || "File",
          course: `ETR #${(ev.eTRCourseRecordId || ev.etrCourseRecordId) || ""}`,
          status: ev.verificationStatus === "Verified"
            ? "Verified"
            : ev.verificationStatus === "Rejected"
              ? "Rejected"
              : "Pending",
        };
      });

      setEvidenceList(mapped);
    } catch (err) {
      console.error("Error loading evidence list:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === evidenceList.filter((e) => e.status === "Pending").length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(evidenceList.filter((e) => e.status === "Pending").map((e) => e.id));
    }
  };

  const handleVerifySelected = async () => {
    if (selectedIds.length === 0) return;
    setProcessing(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          api.put(`/Evidences/${id}/verify`, { VerificationStatus: "Verified" })
        )
      );
      toast.success(tr("Xác thực thành công"), `${tr('Đã xác thực')} ${selectedIds.length} ${tr('evidence.')}`);
      setSelectedIds([]);
      await loadEvidences();
    } catch (err) {
      toast.error(tr("Xác thực thất bại"), err.message || tr("Lỗi không xác định"));
    } finally {
      setProcessing(false);
    }
  };

  // Từ chối qua PromptModal nhập lý do (thay window.prompt)
  const handleRejectSelected = () => {
    if (selectedIds.length === 0) return;
    setRejectOpen(true);
  };

  const handleRejectWithReason = async (reason) => {
    if (selectedIds.length === 0) return;
    if (!reason || !reason.trim()) {
      toast.error(tr("Cần nêu lý do"), tr("Vui lòng nhập lý do từ chối."));
      setRejectOpen(false);
      return;
    }
    setProcessing(true);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          api.put(`/Evidences/${id}/verify`, {
            VerificationStatus: "Rejected",
            VerificationComment: reason.trim(),
          })
        )
      );
      toast.warning(tr("Đã từ chối"), `${tr('Đã từ chối')} ${selectedIds.length} ${tr('evidence.')}`);
      setSelectedIds([]);
      await loadEvidences();
    } catch (err) {
      toast.error(tr("Từ chối thất bại"), err.message || tr("Lỗi không xác định"));
    } finally {
      setProcessing(false);
      setRejectOpen(false);
    }
  };

  const pendingCount = evidenceList.filter((e) => e.status === "Pending").length;

  return (
    <div className="qa-shell">
      {/* Toast notifications */}
      <toast.ToastContainer />

      <section className="qa-page-card">
        <p className="qa-eyebrow">Evidence management</p>
        <h1>Evidence Verification</h1>
        <p className="qa-page-description">
          Verify or reject uploaded evidence before it is used in ETR review.
        </p>
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>Pending Evidence ({pendingCount})</h2>
            <p className="qa-page-description">
              All evidence awaiting QA attention appears here in one queue.
            </p>
          </div>
          <div className="qa-actions">
            <button
              className="qa-btn"
              type="button"
              onClick={handleVerifySelected}
              disabled={selectedIds.length === 0 || processing}
            >
              Verify Selected ({selectedIds.length})
            </button>
            <button
              className="qa-btn-secondary"
              type="button"
              onClick={handleRejectSelected}
              disabled={selectedIds.length === 0 || processing}
            >
              Reject Selected
            </button>
          </div>
        </div>

        {/* Select All checkbox row */}
        <div
          className="qa-list-item"
          style={{
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            cursor: "pointer",
          }}
          onClick={toggleSelectAll}
        >
          <input
            type="checkbox"
            checked={
              evidenceList.filter((e) => e.status === "Pending").length > 0 &&
              selectedIds.length === evidenceList.filter((e) => e.status === "Pending").length
            }
            onChange={() => {}}
            style={{ marginRight: "12px" }}
          />
          <span style={{ fontWeight: 700, fontSize: "11px", textTransform: "uppercase", color: "#64748b" }}>
            {tr('Chọn tất cả')}
          </span>
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
              <div
                key={row.id}
                className="qa-list-item"
                style={{
                  backgroundColor: selectedIds.includes(row.id)
                    ? "rgba(197, 160, 89, 0.03)"
                    : "#ffffff",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(row.id)}
                  onChange={() => toggleSelect(row.id)}
                  disabled={row.status !== "Pending"}
                  style={{ marginRight: "12px" }}
                />
                <div style={{ flex: 1 }}>
                  <p className="qa-list-title">{row.learner}</p>
                  <p className="qa-list-desc">
                    {row.course} - {row.evidence}
                  </p>
                </div>
                <span
                  className={`qa-status ${row.status === "Rejected" ? "rejected" : row.status === "Verified" ? "verified" : "pending"}`}
                >
                  {row.status}
                </span>
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
