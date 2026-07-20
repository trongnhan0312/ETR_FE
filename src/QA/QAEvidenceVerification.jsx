import { useState, useEffect } from "react";
import { api } from "../utils/api";

const QAEvidenceVerification = () => {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

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
          learner: profile?.fullName || `Học viên #${enrollment?.accountId || ""}`,
          evidence: ev.fileName || "Tập tin",
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
      console.error("Lỗi tải danh sách evidence:", err);
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
    setMessage({ type: "", text: "" });
    try {
      await Promise.all(
        selectedIds.map((id) =>
          api.patch(`/Evidences/${id}/verify`, { verificationStatus: "Verified" })
        )
      );
      setMessage({ type: "success", text: `Đã xác thực ${selectedIds.length} evidence.` });
      setSelectedIds([]);
      await loadEvidences();
    } catch (err) {
      setMessage({ type: "error", text: "Xác thực thất bại: " + (err.message || "") });
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectSelected = async () => {
    if (selectedIds.length === 0) return;
    const reason = prompt("Nhập lý do từ chối:");
    if (!reason) return;
    setProcessing(true);
    setMessage({ type: "", text: "" });
    try {
      await Promise.all(
        selectedIds.map((id) =>
          api.patch(`/Evidences/${id}/verify`, {
            verificationStatus: "Rejected",
            qAComment: reason,
          })
        )
      );
      setMessage({ type: "warning", text: `Đã từ chối ${selectedIds.length} evidence.` });
      setSelectedIds([]);
      await loadEvidences();
    } catch (err) {
      setMessage({ type: "error", text: "Từ chối thất bại: " + (err.message || "") });
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = evidenceList.filter((e) => e.status === "Pending").length;

  return (
    <div className="qa-shell">
      {message.text && (
        <div className={`tm-alert-banner ${message.type}`} style={{ marginBottom: "16px" }}>
          <p>{message.text}</p>
          <button onClick={() => setMessage({ type: "", text: "" })}>✕</button>
        </div>
      )}

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
            Chọn tất cả
          </span>
        </div>

        <div className="qa-list">
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              Đang tải...
            </div>
          ) : evidenceList.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
              Chưa có evidence nào cần xác thực.
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
    </div>
  );
};

export default QAEvidenceVerification;
