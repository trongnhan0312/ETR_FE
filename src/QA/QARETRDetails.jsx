import { useState, useEffect } from "react";
import { api } from "../utils/api";
import ApprovalHistory from "../components/ApprovalHistory";

const QARETRDetails = () => {
  const [etrList, setEtrList] = useState([]);
  const [selectedEtr, setSelectedEtr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

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
          const etrEvfs = evfsArr.filter(
            (ev) => (ev.eTRCourseRecordId || ev.etrCourseRecordId) === etrId
          );

          return {
            etrId,
            id: `#ETR-${String(etrId).padStart(4, "0")}`,
            learner: profile?.fullName || `Học viên #${enrollment?.accountId || ""}`,
            course: `Lớp #${enrollment?.classId || ""}`,
            status: etr.status,
            evidenceCount: etrEvfs.length,
            verifiedCount: etrEvfs.filter(
              (ev) => ev.verificationStatus === "Verified"
            ).length,
            submittedAt: etr.submittedAt
              ? new Date(etr.submittedAt).toLocaleString("vi-VN")
              : "N/A",
          };
        });

      setEtrList(mapped);
      if (mapped.length > 0) setSelectedEtr(mapped[0]);
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEtr = async () => {
    if (!selectedEtr) return;
    if (!window.confirm(`Xác nhận xác thực ${selectedEtr.id}?`)) return;
    setVerifying(true);
    try {
      await api.post(`/Etr/${selectedEtr.etrId}/verify`, {
        comment: reviewNotes,
      });
      setMessage({
        type: "success",
        text: `${selectedEtr.id} đã được xác thực thành công.`,
      });
      await loadData();
    } catch (err) {
      setMessage({
        type: "error",
        text: "Xác thực thất bại: " + (err.message || ""),
      });
    } finally {
      setVerifying(false);
      setReviewNotes("");
    }
  };

  const handleReturnEtr = async () => {
    if (!selectedEtr) return;
    if (!reviewNotes.trim()) {
      alert("Vui lòng nhập lý do trả lại.");
      return;
    }
    if (!window.confirm(`Trả lại ${selectedEtr.id} để chỉnh sửa?`)) return;
    setVerifying(true);
    try {
      await api.post(`/Etr/${selectedEtr.etrId}/return`, {
        comment: reviewNotes,
      });
      setMessage({
        type: "warning",
        text: `${selectedEtr.id} đã được trả lại để chỉnh sửa.`,
      });
      await loadData();
    } catch (err) {
      setMessage({
        type: "error",
        text: "Trả lại thất bại: " + (err.message || ""),
      });
    } finally {
      setVerifying(false);
      setReviewNotes("");
    }
  };

  const handleSelectEtr = (etr) => {
    setSelectedEtr(etr);
    setReviewNotes("");
  };

  return (
    <div className="qa-shell">
      {message.text && (
        <div className={`tm-alert-banner ${message.type}`} style={{ marginBottom: "16px" }}>
          <p>{message.text}</p>
          <button onClick={() => setMessage({ type: "", text: "" })}>✕</button>
        </div>
      )}

      <section className="qa-page-card">
        <p className="qa-eyebrow">ETR details</p>
        <h1>Review ETR Details</h1>
        <p className="qa-page-description">
          Inspect the learner profile, attendance, assessment, evidence, and
          approval history before approving or returning the ETR.
        </p>
      </section>

      {/* ETR Selector */}
      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>Select ETR Record</h2>
          </div>
          <button className="qa-btn" type="button" onClick={loadData} disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="qa-list">
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              Đang tải...
            </div>
          ) : etrList.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
              Chưa có ETR nào.
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
                  {etr.status === "Submitted" ? "Pending QA" : "Verified"}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {selectedEtr && (
        <section className="qa-detail-grid">
          <div className="qa-panel">
            <h2 className="qa-section-title">Record Summary</h2>
            <h2 className="qa-section-title" style={{ marginTop: "24px" }}>Approval History</h2>
            <ApprovalHistory etrId={selectedEtr.etrId} />
            <div className="qa-kv-grid">
              <div className="qa-kv">
                <strong>ETR ID</strong>
                <span>{selectedEtr.id}</span>
              </div>
              <div className="qa-kv">
                <strong>Learner</strong>
                <span>{selectedEtr.learner}</span>
              </div>
              <div className="qa-kv">
                <strong>Course / Class</strong>
                <span>{selectedEtr.course}</span>
              </div>
              <div className="qa-kv">
                <strong>Evidence</strong>
                <span>
                  {selectedEtr.verifiedCount}/{selectedEtr.evidenceCount} verified
                </span>
              </div>
              <div className="qa-kv">
                <strong>Submitted At</strong>
                <span>{selectedEtr.submittedAt}</span>
              </div>
            </div>
          </div>

          <div className="qa-panel">
            <h2 className="qa-section-title">QA Review Form</h2>
            <div className="qa-list">
              <div>
                <label className="qa-section-title">Review Notes</label>
                <textarea
                  className="qa-textarea"
                  placeholder="Add verification notes, missing items, or approval remarks."
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
                  Verify ETR
                </button>
                <button
                  className="qa-btn-secondary"
                  type="button"
                  onClick={handleReturnEtr}
                  disabled={verifying}
                >
                  Return for Correction
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default QARETRDetails;
