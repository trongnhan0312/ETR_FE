import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useLanguage } from '../context/LanguageContext';

const TOAST_TYPES = {
  success: {
    icon: (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <path
          d="M8.6 14.6L15.65 7.55L14.25 6.15L8.6 11.8L5.75 8.95L4.35 10.35L8.6 14.6ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2167 18 14.1042 17.2208 15.6625 15.6625C17.2208 14.1042 18 12.2167 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 12.2167 2.77917 14.1042 4.3375 15.6625C5.89583 17.2208 7.78333 18 10 18Z"
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
  info: {
    icon: (
      <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <path
          d="M9 14H11V9H9V14ZM9 7H11V5H9V7ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2167 18 14.1042 17.2208 15.6625 15.6625C17.2208 14.1042 18 12.2167 18 10C18 7.78333 17.2208 5.89583 15.6625 4.3375C14.1042 2.77917 12.2167 2 10 2C7.78333 2 5.89583 2.77917 4.3375 4.3375C2.77917 5.89583 2 7.78333 2 10C2 12.2167 2.77917 14.1042 4.3375 15.6625C5.89583 17.2208 7.78333 18 10 18Z"
          fill="#3b82f6"
        />
      </svg>
    ),
    borderColor: "#3b82f6",
  },
};

// ── Toast store (module-level, dùng chung cho MỌI useToast) ─────────────
// Trước đây mỗi useToast() giữ state riêng và định nghĩa `ToastContainer` MỚI
// ở mỗi lần render → React thấy component khác kiểu tại <toast.ToastContainer />
// nên unmount + remount toàn bộ danh sách toast mỗi khi trang re-render (gõ phím,
// đổi trạng thái, loading...) → toast biến mất rồi trượt vào lại ("hiện 2 lần")
// và chuyển động giật.
//
// Giờ state nằm ngoài component: ToastContainer là component ỔN ĐỊNH (module-level)
// dùng useSyncExternalStore → chỉ re-render khi store thực sự đổi (thêm/xóa toast).
// Mọi useToast() gọi chung 1 store → dù trang có bao nhiêu container đang mount,
// danh sách toast luôn là một nguồn duy nhất.
let toasts = [];
const listeners = new Set();

const emitChange = () => {
  listeners.forEach((l) => l());
};

const MAX_VISIBLE_TOASTS = 5;

const store = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return toasts;
  },
  show(type, title, message, duration) {
    // Hậu tố ngẫu nhiên đảm bảo id luôn duy nhất — tránh trùng id khi 2 toast
    // được bắn đồng thời trong cùng một tick.
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    toasts = [...toasts, { id, type, title, message, duration }].slice(
      -MAX_VISIBLE_TOASTS,
    );
    emitChange();
    return id;
  },
  dismiss(id) {
    toasts = toasts.filter((t) => t.id !== id);
    emitChange();
  },
};

const ToastItem = ({ toast, onDismiss }) => {
  const { tr } = useLanguage();
  const { id, type, title, message, duration = 4000 } = toast;
  const config = TOAST_TYPES[type] || TOAST_TYPES.success;
  const [leaving, setLeaving] = useState(false);

  // Trượt ra trước khi xóa khỏi store — để animation toastSlideOut chạy mượt
  // thay vì toast biến mất đột ngột (gây giật khi các toast phía dưới nhảy lên).
  const dismissWithAnim = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(id), 250);
  }, [id, onDismiss]);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(dismissWithAnim, duration);
    return () => clearTimeout(timer);
  }, [duration, dismissWithAnim]);

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
        animation: leaving
          ? "toastSlideOut 0.25s ease-in forwards"
          : "toastSlideIn 0.3s ease-out",
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
                : type === "info"
                  ? "rgba(59,130,246,0.15)"
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
          {tr(title)}
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
            {tr(message)}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={dismissWithAnim}
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

// Container ổn định (module-level) — đọc trực tiếp từ store chung.
// Giữ nguyên tên/props để mọi call-site `<toast.ToastContainer />` không cần sửa.
export const ToastContainer = () => {
  const list = useSyncExternalStore(store.subscribe, store.getSnapshot);

  if (list.length === 0) return null;

  return (
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
        // An toàn phòng ngừa: không bao giờ để danh sách toast tràn quá chiều cao màn hình
        maxHeight: "calc(100vh - 40px)",
        overflowY: "auto",
      }}
    >
      {/* @keyframes toastSlideIn/toastSlideOut được định nghĩa TOÀN CỤC trong src/index.css
          (không nằm trong <style> inline) — đảm bảo animation trượt vào từ cạnh phải
          luôn hoạt động trên mọi màn hình. */}
      {list.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={toast} onDismiss={store.dismiss} />
        </div>
      ))}
    </div>
  );
};

// Hook — chỉ trả về các hàm bắn toast (không còn state/container riêng).
// Mọi instance dùng chung 1 store module-level.
export const useToast = () => {
  const success = useCallback(
    (title, message, duration) => store.show("success", title, message, duration),
    [],
  );
  const error = useCallback(
    (title, message, duration) => store.show("error", title, message, duration),
    [],
  );
  const warning = useCallback(
    (title, message, duration) => store.show("warning", title, message, duration),
    [],
  );
  const info = useCallback(
    (title, message, duration) => store.show("info", title, message, duration),
    [],
  );
  const dismissToast = useCallback((id) => store.dismiss(id), []);

  return { success, error, warning, info, dismissToast, ToastContainer };
};

export default ToastItem;
