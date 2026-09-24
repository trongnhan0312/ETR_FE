import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationCircle,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaShieldAlt,
} from "react-icons/fa";
import { getApiBaseUrlCandidates } from "../../utils/api";
import { useLanguage } from "../../context/LanguageContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import "../login.scss";

async function tryFetchWithFallback(path, fetchOptions) {
  const baseUrl = getApiBaseUrlCandidates()[0];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const url = `${baseUrl}${path}`;
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } catch (err) {
    console.warn(`[Fetch] Cannot reach ${baseUrl}${path}:`, err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tr } = useLanguage();

  const tokenFromUrl = searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [email, setEmail] = useState(emailFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [tokenFromUrl, emailFromUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!token.trim()) {
      setMessage({
        type: "error",
        text: tr("Mã xác thực hoặc token không được để trống."),
      });
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setMessage({
        type: "error",
        text: tr("Mật khẩu mới phải có ít nhất 6 ký tự."),
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: tr("Mật khẩu xác nhận không khớp với mật khẩu mới."),
      });
      return;
    }

    setLoading(true);

    const response = await tryFetchWithFallback("/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: token.trim(),
        newPassword: newPassword,
        email: email.trim() || undefined,
      }),
    });

    if (!response) {
      setMessage({
        type: "error",
        text: tr("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại."),
      });
      setLoading(false);
      return;
    }

    const data = await response.json().catch(() => null);

    if (response.ok) {
      setIsSuccess(true);
      setMessage({
        type: "success",
        text:
          data?.message ||
          tr("Mật khẩu đã được đặt lại thành công! Bạn có thể đăng nhập ngay."),
      });
    } else {
      setMessage({
        type: "error",
        text:
          data?.detail ||
          data?.message ||
          tr("Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn."),
      });
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <button
        type="button"
        className="login-home-btn"
        onClick={() => navigate("/login")}
        title={tr("Quay lại đăng nhập")}
      >
        <FaArrowLeft />
        <span>{tr("Quay lại đăng nhập")}</span>
      </button>

      <div className="login-lang-switcher">
        <LanguageSwitcher dark />
      </div>

      <section className="login-intro">
        <div className="aviation-blobs" aria-hidden="true" />
        <div className="logo-section login-logo">
          <div className="logo-text">
            <span className="brand-name">{tr("ETR Aviation Training")}</span>
            <span className="brand-sub">
              {tr("Electronic Training Record Portal")}
            </span>
          </div>
        </div>

        <div className="intro-copy">
          <span className="eyebrow">{tr("Aviation security")}</span>
          <h1>{tr("Thiết lập mật khẩu mới an toàn cho tài khoản của bạn.")}</h1>
          <p>
            {tr(
              "Đặt lại mật khẩu với tiêu chuẩn bảo mật hàng không. Mật khẩu mới cần tối thiểu 6 ký tự để bảo vệ dữ liệu hồ sơ đào tạo.",
            )}
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2 className="login-title">{tr("Đặt lại mật khẩu")}</h2>
          <p className="login-subtitle">
            {email
              ? `${tr("Đang đặt lại mật khẩu cho")}: ${email}`
              : tr("Nhập thông tin xác thực và mật khẩu mới của bạn")}
          </p>

          {message.text && (
            <div
              className={`forgot-message ${message.type}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 16px",
                borderRadius: "10px",
                marginBottom: "18px",
                backgroundColor:
                  message.type === "success"
                    ? "rgba(34, 197, 94, 0.12)"
                    : "rgba(239, 68, 68, 0.12)",
                color: message.type === "success" ? "#15803d" : "#dc2626",
                border: `1px solid ${
                  message.type === "success"
                    ? "rgba(34, 197, 94, 0.3)"
                    : "rgba(239, 68, 68, 0.3)"
                }`,
              }}
            >
              {message.type === "success" ? (
                <FaCheckCircle style={{ fontSize: "1.1rem", flexShrink: 0 }} />
              ) : (
                <FaExclamationCircle
                  style={{ fontSize: "1.1rem", flexShrink: 0 }}
                />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {isSuccess ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <button
                type="button"
                className="login-submit-btn"
                onClick={() => navigate("/login")}
              >
                <span>{tr("Đăng nhập ngay")}</span>
                <FaArrowLeft
                  style={{ transform: "rotate(180deg)" }}
                  aria-hidden="true"
                />
              </button>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit} noValidate>
              {!tokenFromUrl && (
                <div className="form-group">
                  <label htmlFor="reset-token">
                    {tr("Mã xác thực OTP / Token")}
                  </label>
                  <div className="input-shell">
                    <FaKey className="input-icon" aria-hidden="true" />
                    <input
                      id="reset-token"
                      type="text"
                      placeholder={tr("Nhập mã OTP 6 số hoặc token từ email")}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="reset-new-password">
                  {tr("Mật khẩu mới (tối thiểu 6 ký tự)")}
                </label>
                <div className="input-shell input-shell--password">
                  <FaLock className="input-icon" aria-hidden="true" />
                  <input
                    id="reset-new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder={tr("Nhập mật khẩu mới")}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={
                      showPassword ? tr("Ẩn mật khẩu") : tr("Hiện mật khẩu")
                    }
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reset-confirm-password">
                  {tr("Xác nhận mật khẩu mới")}
                </label>
                <div className="input-shell input-shell--password">
                  <FaShieldAlt className="input-icon" aria-hidden="true" />
                  <input
                    id="reset-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder={tr("Nhập lại mật khẩu mới")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword
                        ? tr("Ẩn mật khẩu")
                        : tr("Hiện mật khẩu")
                    }
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner" aria-hidden="true" />
                    {tr("Đang cập nhật...")}
                  </span>
                ) : (
                  <span>{tr("Cập nhật mật khẩu")}</span>
                )}
              </button>

              <div style={{ textAlign: "center", marginTop: "16px" }}>
                <Link
                  to="/login"
                  style={{
                    color: "#0a2c55",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  {tr("Quay lại màn hình đăng nhập")}
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default ResetPasswordPage;
