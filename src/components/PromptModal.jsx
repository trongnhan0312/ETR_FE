import { useState } from "react";

/**
 * PromptModal — thay thế window.prompt() bằng modal nhập liệu đẹp, nhất quán với
 * ConfirmModal (dùng cho các thao tác cần nhập lý do: Reopen ETR, Reject/Return evidence...).
 */
const PromptModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Nhập thông tin",
  message = "",
  placeholder = "Nhập nội dung...",
  confirmText = "XÁC NHẬN",
  cancelText = "HỦY BỎ",
  variant = "primary", // "primary" | "danger" | "gold"
  defaultValue = "",
  required = true,
  maxLength = 500,
}) => {
  const [value, setValue] = useState(defaultValue || "");
  const [prevOpen, setPrevOpen] = useState(false);

  // Reset giá trị mỗi lần modal mở — điều chỉnh state trong lúc render (khuyến nghị của React,
  // tránh gọi setState trong effect).
  if (isOpen && !prevOpen) {
    setValue(defaultValue || "");
  }
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
  }

  if (!isOpen) return null;

  const handleInput = (e) => {
    setValue(e.target.value);
  };

  const getConfirmStyle = () => {
    switch (variant) {
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

  const canSubmit = !required || value.trim().length > 0;

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
          width: "460px",
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
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(197,160,89,0.15)",
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z"
                fill="#c5a059"
              />
            </svg>
          </div>

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
            {message && (
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
            )}
          </div>
        </div>

        {/* Body with input */}
        <div
          style={{
            padding: "20px 24px",
            background: "#ffffff",
          }}
        >
          <textarea
            autoFocus
            value={value}
            onChange={handleInput}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && canSubmit) {
                onConfirm(value.trim());
              }
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "10px 14px",
              borderRadius: "10px",
              border: `1px solid ${required && !value.trim() ? "#fca5a5" : "#d9e1ec"}`,
              fontSize: "13px",
              color: "#002147",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
          {required && !value.trim() && (
            <p
              style={{
                margin: "6px 2px 0",
                fontSize: "11px",
                color: "#ef4444",
                fontWeight: "600",
              }}
            >
              Vui lòng nhập nội dung (bắt buộc).
            </p>
          )}
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
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "1px solid #dfe6f1",
              backgroundColor: "#ffffff",
              color: "#002147",
              fontSize: "12px",
              fontWeight: "700",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#c5a059";
              e.currentTarget.style.color = "#c5a059";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#dfe6f1";
              e.currentTarget.style.color = "#002147";
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={() => canSubmit && onConfirm(value.trim())}
            className="create-btn"
            type="button"
            disabled={!canSubmit}
            style={{
              ...getConfirmStyle(),
              opacity: canSubmit ? 1 : 0.5,
              cursor: canSubmit ? "pointer" : "not-allowed",
              transition: "all 0.15s",
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptModal;
