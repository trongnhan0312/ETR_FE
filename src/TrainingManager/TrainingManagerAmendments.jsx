import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { announce } from "../utils/crudNotify";
import { useToast } from "../components/Toast";
import PromptModal from "../components/PromptModal";
import { useLanguage } from "../context/LanguageContext";
import { usePagination } from "../utils/usePagination";
import Pagination from "../components/Pagination";

// Trạng thái Amendment Request do BE trả về (AmendmentRequestResponse.Status)
const STATUS_META = {
  Pending: { label: "Chờ duyệt", color: "#d97706", bg: "#fef3c7" },
  Approved: { label: "Đã duyệt", color: "#15803d", bg: "#dcfce7" },
  Rejected: { label: "Đã từ chối", color: "#b91c1c", bg: "#fee2e2" },
};

const statusMeta = (status) =>
  STATUS_META[String(status || "").toLowerCase()] || {
    label: status || "—",
    color: "#475569",
    bg: "#e2e8f0",
  };

const TrainingManagerAmendments = () => {
  const { tr } = useLanguage();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  // Modal duyệt/từ chối — BE: POST /api/Amendments/{id}/approve|reject { comment }
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  // Pattern chuẩn của các trang FE: hàm thường + useEffect chạy 1 lần (không dùng
  // useCallback phụ thuộc toast/tr vì useToast trả object mới mỗi render → vòng lặp fetch).
  // Không setLoading(true) đồng bộ để tránh rule react-hooks/set-state-in-effect.
  const loadData = async (withSpinner = false) => {
    if (withSpinner) setLoading(true);
    try {
      const [amendmentData, profileData, accountData] = await Promise.all([
        api.get("/Amendments").catch(() => []),
        api.get("/UserProfiles/learners").catch(() => []),
        api.get("/Accounts").catch(() => []),
      ]);
      const reqs = Array.isArray(amendmentData) ? amendmentData : [];
      const profs = Array.isArray(profileData) ? profileData : [];
      const accs = Array.isArray(accountData) ? accountData : [];

      const nameOf = (accountId) => {
        if (accountId == null) return "—";
        const p = profs.find((x) => String(x.accountId) === String(accountId));
        if (p?.fullName) return p.fullName;
        const a = accs.find((x) => String(x.accountId) === String(accountId));
        return a?.username || `Account #${accountId}`;
      };

      setRequests(
        reqs.map((r) => ({
          id: r.amendmentRequestId,
          subjectResultId: r.subjectResultId,
          requestedBy: nameOf(r.requestedByAccountId),
          reason: r.reason || "—",
          oldValue: r.oldValue || "—",
          newValue: r.newValue || "—",
          status: r.status || "Pending",
          approvedBy: r.approvedByAccountId
            ? nameOf(r.approvedByAccountId)
            : null,
          decisionComment: r.decisionComment || "",
          createdAt: r.createdAt
            ? new Date(r.createdAt).toLocaleString("vi-VN")
            : "N/A",
        })),
      );
    } catch (err) {
      console.error("Lỗi khi tải danh sách yêu cầu mở khóa:", err);
      toast.error(tr("Không tải được danh sách yêu cầu mở khóa."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // loading khởi tạo = true sẵn → không cần setLoading(true) ở đây.
    // Bọc trong async hàm nội bộ để tránh rule react-hooks/set-state-in-effect
    // (giống pattern AuditorAuditLogs đang dùng).
    const initialLoad = async () => {
      await loadData();
    };
    initialLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { page, setPage, pageCount, pageItems, total } = usePagination(requests, {
    pageSize: 10,
  });

  const handleApprove = async (comment) => {
    if (!approveTarget) return;
    setProcessingId(approveTarget.id);
    try {
      await api.post(`/Amendments/${approveTarget.id}/approve`, {
        comment: comment || null,
      });
      toast.success(tr("Đã duyệt yêu cầu mở khóa!"), announce("edit", tr("Yêu cầu mở khóa")));
      setApproveTarget(null);
      await loadData(true);
    } catch (err) {
      console.error("Lỗi duyệt amendment:", err);
      toast.error(tr("Duyệt yêu cầu thất bại!"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (comment) => {
    if (!rejectTarget) return;
    if (!comment || !comment.trim()) {
      toast.error(tr("Vui lòng nhập lý do từ chối."));
      return;
    }
    setProcessingId(rejectTarget.id);
    try {
      await api.post(`/Amendments/${rejectTarget.id}/reject`, {
        comment: comment.trim(),
      });
      toast.warning(tr("Đã từ chối yêu cầu mở khóa."), announce("edit", tr("Yêu cầu mở khóa")));
      setRejectTarget(null);
      await loadData(true);
    } catch (err) {
      console.error("Lỗi từ chối amendment:", err);
      toast.error(tr("Từ chối yêu cầu thất bại!"));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <toast.ToastContainer />

      <section className="content-header">
        <div className="header-left">
          <h1>{tr("YÊU CẦU MỞ KHÓA MÔN HỌC")}</h1>
          <div className="divider-gold" />
          <p className="header-description">
            {tr(
              "Giảng viên xin mở khóa một SubjectResult đã ký xác nhận để sửa điểm/đánh giá. Duyệt sẽ đưa SubjectResult về Pending để giảng viên chỉnh sửa; từ chối giữ nguyên trạng thái.",
            )}
          </p>
        </div>
        <div className="page-status-box">
          <strong>{tr("Data source")}</strong>
          <p>{"GET /api/Amendments · POST /api/Amendments/{id}/approve|reject"}</p>
        </div>
      </section>

      <section className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#002147", margin: 0 }}>
              {tr("DANH SÁCH YÊU CẦU")} ({requests.length})
            </h2>
          </div>
          <div className="toolbar-right">
            <button
              className="ghost-btn"
              type="button"
              onClick={() => loadData(true)}
              disabled={loading}
            >
              {tr("Làm mới")}
            </button>
          </div>
        </div>

        <div className="table-responsive-scroll">
          <div
            className="table-header"
            style={{
              display: "grid",
              gridTemplateColumns: "70px 110px 150px 1.3fr 1fr 1fr 150px 180px",
              gap: "12px",
              alignItems: "center",
              padding: "12px 20px",
              background: "linear-gradient(135deg, #06234a 0%, #041b39 100%)",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <div>{tr("ID")}</div>
            <div>{tr("SubjectResult")}</div>
            <div>{tr("Người yêu cầu")}</div>
            <div>{tr("Lý do")}</div>
            <div>{tr("Giá trị cũ")}</div>
            <div>{tr("Giá trị mới")}</div>
            <div>{tr("Trạng thái")}</div>
            <div style={{ textAlign: "right" }}>{tr("Thao tác")}</div>
          </div>

          <div className="table-body">
            {loading ? (
              <div className="empty-table-state">{tr("Đang tải...")}</div>
            ) : requests.length === 0 ? (
              <div className="empty-table-state">
                {tr("Chưa có yêu cầu mở khóa nào.")}
              </div>
            ) : (
              pageItems.map((r) => {
                const meta = statusMeta(r.status);
                const isPending = String(r.status).toLowerCase() === "pending";
                return (
                  <div
                    key={r.id}
                    className="table-row"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 110px 150px 1.3fr 1fr 1fr 150px 180px",
                      gap: "12px",
                      alignItems: "center",
                      padding: "14px 20px",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "rgba(0,33,71,0.5)" }}>
                      #{r.id}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#002147" }}>
                      SR #{r.subjectResultId}
                    </span>
                    <span style={{ fontSize: "13px", color: "#002147" }}>{r.requestedBy}</span>
                    <span
                      title={r.reason}
                      style={{
                        fontSize: "12px",
                        color: "rgba(0,33,71,0.75)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.reason}
                    </span>
                    <span style={{ fontSize: "12px", color: "rgba(0,33,71,0.6)" }}>{r.oldValue}</span>
                    <span style={{ fontSize: "12px", color: "rgba(0,33,71,0.6)" }}>{r.newValue}</span>
                    <span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "3px 10px",
                          borderRadius: "999px",
                          background: meta.bg,
                          color: meta.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tr(meta.label)}
                      </span>
                      {r.decisionComment && (
                        <span
                          title={r.decisionComment}
                          style={{
                            display: "block",
                            marginTop: "3px",
                            fontSize: "10px",
                            color: "rgba(0,33,71,0.5)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "140px",
                          }}
                        >
                          {r.decisionComment}
                        </span>
                      )}
                    </span>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", flexWrap: "wrap" }}>
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            disabled={processingId === r.id}
                            onClick={() => setApproveTarget(r)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              border: "none",
                              background: "#16a34a",
                              color: "#fff",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: processingId === r.id ? "not-allowed" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tr("Duyệt")}
                          </button>
                          <button
                            type="button"
                            disabled={processingId === r.id}
                            onClick={() => setRejectTarget(r)}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              border: "1px solid #fecaca",
                              background: "#fff",
                              color: "#b91c1c",
                              fontSize: "11px",
                              fontWeight: "700",
                              cursor: processingId === r.id ? "not-allowed" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {tr("Từ chối")}
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: "11px", color: "rgba(0,33,71,0.4)", fontStyle: "italic" }}>
                          {r.approvedBy ? `${tr("Bởi")} ${r.approvedBy}` : "—"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="table-footer">
          <Pagination
            page={page}
            pageCount={pageCount}
            onChange={setPage}
            total={total}
            pageSize={10}
          />
        </div>
      </section>

      {/* Modal duyệt (comment tùy chọn) */}
      <PromptModal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title={`${tr("Duyệt yêu cầu mở khóa")} — SR #${approveTarget?.subjectResultId ?? ""}`}
        message={tr(
          "SubjectResult sẽ được đưa về Pending để giảng viên chỉnh sửa; chữ ký cũ bị vô hiệu hóa. Có thể ghi chú quyết định (không bắt buộc).",
        )}
        placeholder={tr("Nhập ghi chú (tùy chọn)...")}
        confirmText={tr("XÁC NHẬN DUYỆT")}
        cancelText={tr("HỦY BỎ")}
        variant="gold"
        required={false}
      />

      {/* Modal từ chối (bắt buộc lý do) */}
      <PromptModal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        title={`${tr("Từ chối yêu cầu mở khóa")} — SR #${rejectTarget?.subjectResultId ?? ""}`}
        message={tr(
          "Yêu cầu sẽ bị từ chối và SubjectResult giữ nguyên trạng thái đã ký. Bắt buộc nêu lý do từ chối.",
        )}
        placeholder={tr("Nhập lý do từ chối...")}
        confirmText={tr("TỪ CHỐI")}
        cancelText={tr("HỦY BỎ")}
        variant="danger"
      />
    </div>
  );
};

export default TrainingManagerAmendments;
