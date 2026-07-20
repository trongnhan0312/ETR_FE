import { useState, useEffect } from "react";
import { api } from "../utils/api";

const QARETRReviewQueue = () => {
  const [etrRecords, setEtrRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEtr, setSelectedEtr] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    loadEtrs();
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
            learner: profile?.fullName || `Học viên #${enrollment?.accountId || ""}`,
            course: `Lớp #${enrollment?.classId || ""}`,
            stage: "Submitted",
          };
        });

      setEtrRecords(submitted);
    } catch (err) {
      console.error("Lỗi tải danh sách ETR:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEtr = async (etrId) => {
    if (!window.confirm(`Xác nhận xác thực ETR #${String(etrId).padStart(4, "0")}?`)) return;
    setVerifying(true);
    try {
      await api.post(`/Etr/${etrId}/verify`, {});
      setMessage({
        type: "success",
        text: `ETR #${String(etrId).padStart(4, "0")} đã được xác thực.`,
      });
      setSelectedEtr(null);
      await loadEtrs();
    } catch (err) {
      setMessage({
        type: "error",
        text: "Xác thực ETR thất bại: " + (err.message || ""),
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleReturnEtr = async (etrId) => {
    const reason = prompt("Nhập lý do trả lại ETR:");
    if (!reason) return;
    setVerifying(true);
    try {
      await api.post(`/Etr/${etrId}/verify`, {});
      setMessage({
        type: "warning",
        text: `ETR #${String(etrId).padStart(4, "0")} đã trả lại để chỉnh sửa. Lý do: ${reason}`,
      });
      setSelectedEtr(null);
      await loadEtrs();
    } catch (err) {
      setMessage({
        type: "error",
        text: "Trả lại ETR thất bại: " + (err.message || ""),
      });
    } finally {
      setVerifying(false);
    }
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
        <p className="qa-eyebrow">ETR review</p>
        <h1>ETR Review Queue</h1>
        <p className="qa-page-description">
          View all submitted ETRs awaiting QA review. Click Verify to approve
          or Return to send back for correction.
        </p>
      </section>

      <section className="qa-table-card">
        <div className="qa-table-header">
          <div>
            <h2>Submitted ETRs ({etrRecords.length})</h2>
            <p className="qa-page-description">
              Select one record to review and verify completeness.
            </p>
          </div>
          <button
            className="qa-btn"
            type="button"
            onClick={loadEtrs}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        <div className="qa-list">
          {loading ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
              Đang tải...
            </div>
          ) : etrRecords.length === 0 ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontStyle: "italic" }}>
              Chưa có ETR nào được gửi để xác thực.
            </div>
          ) : (
            etrRecords.map((record) => (
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
                  <span className="qa-status pending">{record.stage}</span>
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
                      className="qa-btn"
                      type="button"
                      onClick={() => handleVerifyEtr(record.etrId)}
                      disabled={verifying}
                    >
                      Verify ETR
                    </button>
                    <button
                      className="qa-btn-secondary"
                      type="button"
                      onClick={() => handleReturnEtr(record.etrId)}
                      disabled={verifying}
                    >
                      Return for Correction
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default QARETRReviewQueue;
