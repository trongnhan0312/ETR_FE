import { useState, useEffect } from "react";
import { api } from "../utils/api";

const QARETRReturn = () => {
  const [etrList, setEtrList] = useState([]);
  const [selectedEtrId, setSelectedEtrId] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(true);

  const returnReasons = [
    "Missing evidence file",
    "Attendance record incomplete",
    "Assessment not attached",
    "Wrong learner details",
  ];

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

      const mapped = etrs
        .filter((e) => e.status === "Submitted" || e.status === "Draft")
        .map((etr) => {
          const etrId = etr.etrCourseRecordId || etr.eTRCourseRecordId;
          const enrollment = enrollmentsArr.find(
            (enr) => enr.enrollmentId === etr.enrollmentId
          );
          const profile = enrollment
            ? profilesArr.find((p) => p.accountId === enrollment.accountId)
            : null;
          return {
            id: `#ETR-${String(etrId).padStart(4, "0")}`,
            etrId,
            learner:
              profile?.fullName ||
              `Học viên #${enrollment?.accountId || ""}`,
            status: etr.status,
          };
        });

      setEtrList(mapped);
    } catch (err) {
      console.error("Error loading ETRs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendBack = async () => {
    if (!selectedEtrId) {
      setMessage({ type: "error", text: "Vui lòng chọn ETR để trả lại." });
      return;
    }
    if (!returnReason.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập lý do trả lại." });
      return;
    }
    setSending(true);
    try {
      await api.post(`/Etr/${selectedEtrId}/verify`, {
        comment: returnReason,
      });
      setMessage({ type: "warning", text: `ETR #${String(selectedEtrId).padStart(4, "0")} đã được trả lại.` });
      setSelectedEtrId("");
      setReturnReason("");
      await loadEtrs();
    } catch (err) {
      setMessage({
        type: "error",
        text: "Trả lại thất bại: " + (err.message || ""),
      });
    } finally {
      setSending(false);
    }
  };

  const handleSelectReason = (reason) => {
    setReturnReason(reason);
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
        <h1>Return for Correction</h1>
        <p className="qa-page-description">
          Send the ETR back to the training team with a clear reason so they can
          correct and resubmit it.
        </p>
      </section>

      <section className="qa-grid-2">
        <div className="qa-panel">
          <h2>Select ETR</h2>
          <div className="qa-list">
            {loading ? (
              <div style={{ padding: "12px", color: "#64748b" }}>
                Đang tải...
              </div>
            ) : etrList.length === 0 ? (
              <div style={{ padding: "12px", color: "#64748b", fontStyle: "italic" }}>
                Không có ETR nào để trả lại.
              </div>
            ) : (
              etrList.map((etr) => (
                <div
                  key={etr.etrId}
                  className="qa-list-item"
                  onClick={() => setSelectedEtrId(etr.etrId)}
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      selectedEtrId === etr.etrId
                        ? "rgba(197, 160, 89, 0.05)"
                        : "#ffffff",
                    borderLeft:
                      selectedEtrId === etr.etrId
                        ? "4px solid #c5a059"
                        : "4px solid transparent",
                  }}
                >
                  <div>
                    <p className="qa-list-title">
                      {etr.learner}
                    </p>
                    <p className="qa-list-desc">{etr.id}</p>
                  </div>
                  <span className="qa-status pending">{etr.status}</span>
                </div>
              ))
            )}
          </div>

          <h2 style={{ marginTop: "24px" }}>Common Return Reasons</h2>
          <div className="qa-badge-row">
            {returnReasons.map((reason) => (
              <span
                key={reason}
                className="qa-chip warn"
                style={{
                  cursor: "pointer",
                  opacity: returnReason === reason ? 1 : 0.6,
                  border:
                    returnReason === reason
                      ? "2px solid #c5a059"
                      : "2px solid transparent",
                }}
                onClick={() => handleSelectReason(reason)}
              >
                {reason}
              </span>
            ))}
          </div>
        </div>

        <div className="qa-panel">
          <h2>Return Message</h2>
          <textarea
            className="qa-textarea"
            placeholder="Explain what must be corrected before resubmission."
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          />
          <div className="qa-actions" style={{ marginTop: "14px" }}>
            <button
              className="qa-btn-secondary"
              type="button"
              onClick={() => {
                setSelectedEtrId("");
                setReturnReason("");
              }}
            >
              Clear
            </button>
            <button
              className="qa-btn"
              type="button"
              onClick={handleSendBack}
              disabled={sending || !selectedEtrId || !returnReason.trim()}
            >
              {sending ? "Sending..." : "Send Back"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QARETRReturn;
