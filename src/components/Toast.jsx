import { useState, useEffect, useCallback } from "react";

const TOAST_TYPES = {
  success: {
    icon: (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <path
          d="M8.6 14.6L15.65 7.55L14.25 6.15L8.6 11.8L5.75 8.95L4.35 10.35L8.6 14.6ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z"
          fill="#22c55e"
        />
      </svg>
    ),
    borderColor: "#22c55e",
  },
  error: {
    icon: (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <path
          d="M10 0C4.47 0 0 4.47 0 10C0 15.53 4.47 20 10 20C15.53 20 20 15.53 20 10C20 4.47 15.53 0 10 0ZM13.59 5L10 8.59L6.41 5L5 6.41L8.59 10L5 13.59L6.41 15L10 11.41L13.59 15L15 13.59L11.41 10L15 6.41L13.59 5Z"
          fill="#ef4444"
        />
      </svg>
    ),
    borderColor: "#ef4444",
  },
  warning: {
    icon: (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <path
          d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z"
          fill="#eab308"
        />
      </svg>
    ),
    borderColor: "#eab308",
  },
};

const ToastItem = ({ toast, onDismiss }) => {
  const { id, type, title, message, duration = 4000 } = toast;
  const config = TOAST_TYPES[type] || TOAST_TYPES.success;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "14px 16px",
        background: "#002147",
        borderTop: "none",
        borderRight: "none",
        borderBottom: "none",
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: "8px",
        boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)",
        minWidth: "380px",
        maxWidth: "480px",
        animation: "toastSlideIn 0.3s ease-out",
        position: "relative",
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background:
            type === "success"
              ? "rgba(34,197,94,0.15)"
              : type === "error"
                ? "rgba(239,68,68,0.15)"
                : "rgba(234,179,8,0.15)",
          flexShrink: 0,
        }}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: "700",
            color: "#ffffff",
            lineHeight: 1.4,
          }}
        >
          {title}
        </p>
        {message && (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "12px",
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.4,
            }}
          >
            {message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={() => onDismiss(id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          opacity: 0.5,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
      >
        <svg
          width={10}
          height={10}
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M1.16667 11.6667L0 10.5L4.66667 5.83333L0 1.16667L1.16667 0L5.83333 4.66667L10.5 0L11.6667 1.16667L7 5.83333L11.6667 10.5L10.5 11.6667L5.83333 7L1.16667 11.6667Z"
            fill="white"
          />
        </svg>
      </button>
    </div>
  );
};

// Toast container + hook
export const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const [counter, setCounter] = useState(0);

  const showToast = useCallback(
    (type, title, message, duration) => {
      const id = `toast-${Date.now()}-${counter}`;
      setCounter((c) => c + 1);
      setToasts((prev) => [
        ...prev,
        { id, type, title, message, duration },
      ]);
      return id;
    },
    [counter],
  );

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title, message, duration) =>
      showToast("success", title, message, duration),
    [showToast],
  );
  const error = useCallback(
    (title, message, duration) =>
      showToast("error", title, message, duration),
    [showToast],
  );
  const warning = useCallback(
    (title, message, duration) =>
      showToast("warning", title, message, duration),
    [showToast],
  );

  const ToastContainer = () =>
    toasts.length > 0 ? (
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          pointerEvents: "none",
        }}
      >
        <style>
          {`
            @keyframes toastSlideIn {
              from { opacity: 0; transform: translateX(100%); }
              to { opacity: 1; transform: translateX(0); }
            }
            @keyframes toastSlideOut {
              from { opacity: 1; transform: translateX(0); }
              to { opacity: 0; transform: translateX(100%); }
            }
          `}
        </style>
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "auto" }}>
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    ) : null;

  return { toasts, showToast, dismissToast, success, error, warning, ToastContainer };
};

export default ToastItem;
