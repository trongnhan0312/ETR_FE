import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { announce } from "../utils/crudNotify";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';

const QARETRReturn = () => {
  const { tr, trEn } = useLanguage();
  const [etrList, setEtrList] = useState([]);
  const [selectedEtrId, setSelectedEtrId] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Toast notifications (thay banner tm-alert-banner cũ)
  const toast = useToast();

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
              `Student #${enrollment?.accountId || ""}`,
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
      toast.error(tr("Chưa chọn ETR"));
      return;
    }
    if (!returnReason.trim()) {
      toast.error(tr("Thiếu lý do"));
      return;
    }
    setSending(true);
    try {
      await api.post(`/Etr/${selectedEtrId}/return`, {
        comment: returnReason,
      });
      toast.warning(tr("Đã trả lại ETR"), announce("edit", tr("Hồ sơ")));
      setSelectedEtrId("");
      setReturnReason("");
      await loadEtrs();
    } catch (err) {
      toast.error(tr("Trả lại thất bại"));
    } finally {
      setSending(false);
    }
  };

  const handleSelectReason = (reason) => {
    setReturnReason(reason);
  };

  return (
    <div className="qa-shell">
      {/* Toast notifications */}
      <toast.ToastContainer />

      <section className="qa-page-card">
        <p className="qa-eyebrow">{trEn('ETR review')}</p>
        <h1>{trEn('Return for Correction')}</h1>
        <p className="qa-page-description">
          {trEn('Send the ETR back to the training team with a clear reason so they can correct and resubmit it.')}
        </p>
      </section>

      <section className="qa-grid-2">
        <div className="qa-panel">
          <h2>{trEn('Select ETR')}</h2>
          <div className="qa-list">
            {loading ? (
              <div style={{ padding: "12px", color: "#64748b" }}>
                {tr('Đang tải...')}
              </div>
            ) : etrList.length === 0 ? (
              <div style={{ padding: "12px", color: "#64748b", fontStyle: "italic" }}>
                {tr('Không có ETR nào để trả lại.')}
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
                  <span className="qa-status pending">{trEn(etr.status)}</span>
                </div>
              ))
            )}
          </div>

          <h2 style={{ marginTop: "24px" }}>{trEn('Common Return Reasons')}</h2>
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
                {trEn(reason)}
              </span>
            ))}
          </div>
        </div>

        <div className="qa-panel">
          <h2>{trEn('Return Message')}</h2>
          <textarea
            className="qa-textarea"
            placeholder={trEn('Explain what must be corrected before resubmission.')}
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
              {trEn('Clear')}
            </button>
            <button
              className="qa-btn"
              type="button"
              onClick={handleSendBack}
              disabled={sending || !selectedEtrId || !returnReason.trim()}
            >
              {sending ? trEn('Sending...') : trEn('Send Back')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QARETRReturn;
