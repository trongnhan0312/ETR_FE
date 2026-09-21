import { Component } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

/**
 * Bắt lỗi render ở TẦNG ROUTE.
 *
 * Vì sao cần: app không có boundary nào, nên chỉ cần 1 lỗi render (ví dụ 1 modal
 * tham chiếu biến không tồn tại — đã gặp ở nút "View" trang Khóa & Lớp học) là
 * React unmount cả cây #root ⇒ màn hình trắng/navy trống, người dùng hết đường
 * làm việc. Bọc component này quanh <Outlet/> của từng layout để:
 *   - chỉ VÙNG NỘI DUNG bị thay bằng thẻ báo lỗi; sidebar/topbar vẫn dùng được;
 *   - lỗi trong modal (createPortal) cũng bị bắt, vì portal vẫn thuộc cây React;
 *   - đổi route là tự xoá lỗi (boundary được `key` theo pathname);
 *   - có nút "Thử lại" để render lại route đó mà không cần tải lại trang.
 */
class ErrorBoundaryCore extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Giữ log để còn truy vết khi người dùng báo lỗi
    console.error("[RouteErrorBoundary]", error, info?.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { tr, children } = this.props;

    if (!error) return children;

    return (
      <div
        className="route-error-boundary"
        role="alert"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          minHeight: "60vh",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.08)",
            padding: "28px 28px 22px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "rgba(197, 160, 89, 0.12)",
              border: "1px solid rgba(197, 160, 89, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#c5a059"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "18px",
              fontWeight: 700,
              color: "#002147",
            }}
          >
            {tr("Không thể hiển thị nội dung này")}
          </h2>

          <p
            style={{
              margin: "0 0 16px",
              fontSize: "13px",
              lineHeight: 1.6,
              color: "#475569",
            }}
          >
            {tr(
              "Đã xảy ra lỗi khi hiển thị trang. Bạn có thể thử lại hoặc quay về trang trước.",
            )}
          </p>

          {error?.message ? (
            <div style={{ marginBottom: "18px" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "#64748b",
                  marginBottom: "6px",
                }}
              >
                {tr("Chi tiết kỹ thuật")}
              </div>
              <pre
                style={{
                  margin: 0,
                  maxHeight: "120px",
                  overflow: "auto",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: "11px",
                  lineHeight: 1.5,
                  color: "#334155",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {String(error.message)}
              </pre>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                padding: "9px 18px",
                border: "none",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #c5a059 0%, #a8842f 100%)",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {tr("Thử lại")}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              style={{
                padding: "9px 18px",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#475569",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {tr("Quay lại")}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Bọc quanh <Outlet/> của layout (hoặc quanh cả <Routes>).
 * `key` theo pathname: điều hướng sang route khác sẽ reset boundary.
 */
const RouteErrorBoundary = ({ children }) => {
  const location = useLocation();
  const { tr } = useLanguage();

  return (
    <ErrorBoundaryCore key={location.pathname} tr={tr}>
      {children}
    </ErrorBoundaryCore>
  );
};

export default RouteErrorBoundary;
