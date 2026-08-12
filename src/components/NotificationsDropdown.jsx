import { useState, useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";
import { readActivities, clearActivities } from "../utils/activityLog";

// Màu badge theo method
const METHOD_STYLES = {
  POST: { bg: "#dcfce7", color: "#15803d" },
  PUT: { bg: "#dbeafe", color: "#1d4ed8" },
  PATCH: { bg: "#fef3c7", color: "#b45309" },
  DELETE: { bg: "#fee2e2", color: "#b91c1c" },
};

const fmtTime = (ts) => {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} · ${dd}/${mo}`;
};

// Rút gọn endpoint: bỏ query params và phần /api
const shortEndpoint = (endpoint) => {
  const clean = String(endpoint || "").replace(/^\//, "");
  const noQuery = clean.split("?")[0];
  return noQuery.length > 46 ? `${noQuery.slice(0, 44)}…` : noQuery;
};

const NotificationsDropdown = () => {
  const { tr } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => readActivities());
  const [panelStyle, setPanelStyle] = useState({ top: "calc(100% + 10px)", maxHeight: 430 });
  const wrapRef = useRef(null);

  // Lắng nghe sự kiện "có thao tác mới" do activityLog phát → cập nhật danh sách
  useEffect(() => {
    const onUpdate = () => setItems(readActivities());
    window.addEventListener("etr-activity-updated", onUpdate);
    return () => window.removeEventListener("etr-activity-updated", onUpdate);
  }, []);

  // Định vị panel: nếu không đủ chỗ bên dưới (màn hình thấp) thì lật LÊN TRÊN
  useEffect(() => {
    if (!open) return;
    const compute = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const wr = wrap.getBoundingClientRect();
      const below = window.innerHeight - wr.bottom;
      const above = wr.top;
      // Mở xuống khi có đủ chỗ (hoặc chỗ dưới >= chỗ trên); ngược lại lật lên
      if (below >= 300 || below >= above) {
        setPanelStyle({
          top: "calc(100% + 10px)",
          bottom: "auto",
          maxHeight: Math.max(200, Math.min(430, below - 20)),
        });
      } else {
        setPanelStyle({
          top: "auto",
          bottom: "calc(100% + 10px)",
          maxHeight: Math.max(200, Math.min(430, above - 20)),
        });
      }
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [open]);

  // Click ra ngoài hoặc Escape → đóng
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleClear = () => {
    clearActivities();
    setItems([]);
  };

  const failedCount = items.filter((i) => i.type === "error").length;

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={wrapRef}>
      <button
        className="notification-btn"
        type="button"
        aria-label={tr("Thông báo")}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z"
            fill="currentColor"
          />
        </svg>
        {items.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ef4444",
              border: "2px solid #ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            }}
          ></span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: panelStyle.top,
            bottom: panelStyle.bottom,
            width: 370,
            maxHeight: panelStyle.maxHeight,
            overflow: "auto",
            background: "#ffffff",
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            boxShadow: "0 20px 50px rgba(0,33,71,0.25)",
            zIndex: 99999,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              marginBottom: "10px",
            }}
          >
            <strong style={{ fontSize: 13, color: "#002147" }}>
              {tr("Lịch sử thao tác")}{" "}
              <span style={{ color: failedCount > 0 ? "#b91c1c" : "#64748b" }}>
                ({items.length})
                {failedCount > 0 ? ` · ${tr("Thất bại")}: ${failedCount}` : ""}
              </span>
            </strong>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  border: "none",
                  background: "none",
                  color: "#b91c1c",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                {tr("Xóa lịch sử")}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div
              style={{
                padding: "24px 0",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              {tr("Chưa có thao tác nào.")}
            </div>
          ) : (
            items.map((it) => {
              const ms = METHOD_STYLES[it.method] || { bg: "#f1f5f9", color: "#475569" };
              const ok = it.type === "success";
              return (
                <div
                  key={it.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "9px 10px",
                    borderRadius: 10,
                    marginBottom: 6,
                    background: ok ? "#f8fafc" : "#fef2f2",
                    border: `1px solid ${ok ? "#e2e8f0" : "#fecaca"}`,
                  }}
                >
                  <span
                    style={{
                      padding: "2px 7px",
                      borderRadius: 5,
                      fontSize: 10,
                      fontWeight: 900,
                      background: ms.bg,
                      color: ms.color,
                      flexShrink: 0,
                    }}
                  >
                    {it.method}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0f172a",
                        fontFamily: "monospace",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {shortEndpoint(it.endpoint)}
                    </div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                      {fmtTime(it.time)}
                      {it.status ? ` · HTTP ${it.status}` : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "3px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 900,
                      flexShrink: 0,
                      background: ok ? "#dcfce7" : "#fee2e2",
                      color: ok ? "#15803d" : "#b91c1c",
                    }}
                  >
                    {ok ? tr("Thành công") : tr("Thất bại")}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
