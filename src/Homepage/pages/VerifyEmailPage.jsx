import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEnvelope,
  FaExclamationCircle,
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

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tr } = useLanguage();

  const tokenFromUrl = searchParams.get("token") || "";
  const emailFromUrl = searchParams.get("email") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [email, setEmail] = useState(emailFromUrl);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("idle"); // idle, verifying, success, error
  const [message, setMessage] = useState("");

  const verifyToken = async (tokenToVerify, emailToVerify) => {
    if (!tokenToVerify) return;
    setLoading(true);
    setStatus("verifying");

    const response = await tryFetchWithFallback("/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: tokenToVerify.trim(),
        email: emailToVerify ? emailToVerify.trim() : undefined,
      }),
    });

    if (!response) {
      setStatus("error");
      setMessage(
        tr("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng."),
      );
      setLoading(false);
      return;
    }

    const data = await response.json().catch(() => null);

    if (response.ok) {
      setStatus("success");
      setMessage(
        data?.message ||
          tr("Địa chỉ email của bạn đã được xác thực thành công!"),
      );
    } else {
      setStatus("error");
      setMessage(
        data?.detail ||
          data?.message ||
          tr("Mã xác thực email không hợp lệ hoặc đã hết hạn."),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (tokenFromUrl) {
      verifyToken(tokenFromUrl, emailFromUrl);
    }
  }, [tokenFromUrl, emailFromUrl]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setStatus("error");
      setMessage(tr("Vui lòng nhập mã xác thực OTP hoặc token."));
      return;
    }
    verifyToken(token, email);
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
          <h1>{tr("Xác thực địa chỉ Email tài khoản ETR Management.")}</h1>
          <p>
            {tr(
              "Xác thực email giúp bảo vệ thông tin đào tạo cá nhân của bạn và đảm bảo nhận được các thông báo chứng chỉ quan trọng.",
            )}
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <h2 className="login-title">{tr("Xác thực Email")}</h2>
          <p className="login-subtitle">
            {email
              ? `${tr("Đang xác thực cho")}: ${email}`
              : tr("Kích hoạt và xác thực địa chỉ email tài khoản")}
          </p>

          {status === "verifying" && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <span
                className="spinner"
                style={{
                  width: "36px",
                  height: "36px",
                  borderWidth: "3px",
                  borderTopColor: "#0a2c55",
                  borderColor: "rgba(10, 44, 85, 0.2)",
                  marginBottom: "16px",
                }}
              />
              <p style={{ color: "#475569", fontWeight: "600" }}>
                {tr("Đang tiến hành xác thực email của bạn...")}
              </p>
            </div>
          )}

          {status === "success" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <FaCheckCircle
                style={{ fontSize: "3rem", color: "#16a34a", marginBottom: "16px" }}
              />
              <h3
                style={{
                  color: "#15803d",
                  fontSize: "1.25rem",
                  margin: "0 0 10px",
                }}
              >
                {tr("Xác thực thành công!")}
              </h3>
              <p
                style={{
                  color: "#475569",
                  fontSize: "0.95rem",
                  marginBottom: "24px",
                }}
              >
                {message}
              </p>
              <button
                type="button"
                className="login-submit-btn"
                onClick={() => navigate("/login")}
              >
                <span>{tr("Đến trang đăng nhập")}</span>
                <FaArrowLeft
                  style={{ transform: "rotate(180deg)" }}
                  aria-hidden="true"
                />
              </button>
            </div>
          )}

          {status === "error" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  marginBottom: "20px",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  color: "#dc2626",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                }}
              >
                <FaExclamationCircle
                  style={{ fontSize: "1.2rem", flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.92rem", fontWeight: "600" }}>
                  {message}
                </span>
              </div>

              <form className="login-form" onSubmit={handleManualSubmit}>
                <div className="form-group">
                  <label htmlFor="verify-token">
                    {tr("Nhập lại mã xác thực (OTP)")}
                  </label>
                  <div className="input-shell">
                    <FaEnvelope className="input-icon" aria-hidden="true" />
                    <input
                      id="verify-token"
                      type="text"
                      placeholder={tr("Nhập mã OTP 6 số từ email")}
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      disabled={loading}
                    />
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
                      {tr("Đang xác thực...")}
                    </span>
                  ) : (
                    <span>{tr("Xác nhận mã OTP")}</span>
                  )}
                </button>
              </form>

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
            </div>
          )}

          {status === "idle" && (
            <form className="login-form" onSubmit={handleManualSubmit}>
              <div className="form-group">
                <label htmlFor="verify-email-input">{tr("Email của bạn")}</label>
                <div className="input-shell">
                  <FaEnvelope className="input-icon" aria-hidden="true" />
                  <input
                    id="verify-email-input"
                    type="email"
                    placeholder={tr("Nhập địa chỉ email")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="verify-token-input">
                  {tr("Mã xác thực OTP / Token")}
                </label>
                <div className="input-shell">
                  <FaShieldAlt className="input-icon" aria-hidden="true" />
                  <input
                    id="verify-token-input"
                    type="text"
                    placeholder={tr("Nhập mã OTP 6 số từ email")}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                <span>{tr("Xác thực Email")}</span>
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

export default VerifyEmailPage;
