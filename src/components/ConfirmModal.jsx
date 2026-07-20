const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện thao tác này?",
  confirmText = "XÁC NHẬN",
  cancelText = "HỦY BỎ",
  confirmVariant = "danger", // "danger" | "primary" | "gold"
  loading = false,
  icon,
}) => {
  if (!isOpen) return null;

  const getConfirmStyle = () => {
    switch (confirmVariant) {
      case "danger":
        return {
          background: "linear-gradient(159.93deg, #e11d48 -27.55%, #be123c 127.55%)",
        };
      case "gold":
        return {
          background: "linear-gradient(159.93deg, #c5a059 -27.55%, #a07d3e 127.55%)",
        };
      default:
        return {
          background: "linear-gradient(159.93deg, #002147 -27.55%, #001530 127.55%)",
        };
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
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
        className="dashboard-panel"
        style={{
          width: "440px",
          maxWidth: "90vw",
          borderRadius: "20px",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)",
          animation: "scaleIn 0.2s ease-out",
          padding: 0,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div
          style={{
            background: "#002147",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            borderBottom: "3px solid #c5a059",
          }}
        >
          {/* Icon */}
          {icon || (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background:
                  confirmVariant === "danger"
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(197,160,89,0.15)",
                flexShrink: 0,
              }}
            >
              {confirmVariant === "danger" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                    fill="#ef4444"
                  />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                    fill="#c5a059"
                  />
                </svg>
              )}
            </div>
          )}

          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: "700",
                color: "#ffffff",
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "12px",
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.5,
              }}
            >
              {message}
            </p>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "20px 24px",
            background: "#ffffff",
          }}
        >
          {/* Warning box */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "12px 14px",
              background: "rgba(239,68,68,0.06)",
              borderRadius: "10px",
              border: "1px solid rgba(239,68,68,0.15)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              style={{ flexShrink: 0, marginTop: "1px" }}
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                fill="#ef4444"
              />
            </svg>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "rgba(0,33,71,0.7)",
                lineHeight: 1.5,
                fontWeight: "500",
              }}
            >
              Sau khi chốt, dữ liệu sẽ được khóa và không thể chỉnh sửa. Bạn vẫn có thể mở khóa sau nếu cần.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "16px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={onClose}
            type="button"
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "1px solid #dfe6f1",
              backgroundColor: "#ffffff",
              color: "#002147",
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = "#c5a059";
                e.currentTarget.style.color = "#c5a059";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#dfe6f1";
              e.currentTarget.style.color = "#002147";
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            className="create-btn"
            type="button"
            disabled={loading}
            style={{
              ...getConfirmStyle(),
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s",
            }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: "spin 1s linear infinite" }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray="31.4 31.4"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                ĐANG XỬ LÝ...
              </span>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
