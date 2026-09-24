import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaExclamationCircle,
  FaKey,
  FaLock,
  FaPaperPlane,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";
import { getApiBaseUrlCandidates } from "../utils/api";
import { useLanguage } from "../context/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./login.scss";

/** Helper: gọi API deploy duy nhất (FE không còn fallback local) */
async function tryFetchWithFallback(path, fetchOptions) {
  const baseUrl = getApiBaseUrlCandidates()[0];
  // Timeout 12s — nếu backend treo (không phản hồi, không trả lỗi),
  // FE phải báo lỗi rõ ràng, KHÔNG được spinner vô hạn.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const url = `${baseUrl}${path}`;
    console.log(`[Fetch] Trying: ${url}`);
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

const VALIDATION_RULES = {
  username: {
    required: "Vui lòng nhập tên đăng nhập.",
    minLength: { value: 3, message: "Tên đăng nhập phải có ít nhất 3 ký tự." },
  },
  password: {
    required: "Vui lòng nhập mật khẩu.",
    minLength: { value: 6, message: "Mật khẩu phải có ít nhất 6 ký tự." },
  },
};

const Login = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  // Remember me
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("rememberMe") === "true";
  });

  // Load remembered username on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem("rememberedUsername");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  // Forgot password state (2-step flow: 1. Request OTP, 2. Enter OTP & Reset Password)
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState({ type: "", text: "" });
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const validateField = (field, value) => {
    const rules = VALIDATION_RULES[field];
    if (!rules) return "";

    // Don't trim password — preserve intentional whitespace
    const checkValue =
      field === "password" ? value || "" : (value || "").trim();

    if (!checkValue && rules.required) {
      return tr(rules.required);
    }
    if (rules.minLength && checkValue.length < rules.minLength.value) {
      return tr(rules.minLength.message);
    }
    return "";
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    if (fieldErrors.username) clearFieldError("username");
    if (error) setError("");
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (fieldErrors.password) clearFieldError("password");
    if (error) setError("");
  };

  const validate = () => {
    const errors = {
      username: validateField("username", username),
      password: validateField("password", password),
    };
    setFieldErrors(errors);
    return !errors.username && !errors.password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!validate()) return;

    setLoading(true);

    const response = await tryFetchWithFallback("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        password,
      }),
    });

    // Không kết nối được backend → báo lỗi rõ ràng.
    // KHÔNG có demo login — 100% dữ liệu/tài khoản phải từ API thật.
    if (!response) {
      setError(
        tr(
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.",
        ),
      );
      setLoading(false);
      return;
    }

    if (!response.ok) {
      // Server đã phản hồi nhưng từ chối đăng nhập (401 sai mật khẩu / tài khoản bị vô hiệu)...
      let message = tr(
        "Đăng nhập thất bại. Vui lòng kiểm tra lại tên đăng nhập hoặc mật khẩu.",
      );
      try {
        const body = await response.json();
        if (body && typeof body === "object") {
          message = body.message || body.detail || body.title || message;
        }
      } catch {
        const text = await response.text().catch(() => "");
        if (text && !text.startsWith("<")) message = text;
      }
      setError(message);
      setLoading(false);
      return;
    }

    try {
      const data = await response.json();
      console.log("Dữ liệu API trả về:", data);

      // Phòng thủ: server trả 200 nhưng thiếu token (body lạ) → không lưu undefined,
      // hiện lỗi thay vì điều hướng sang trang chính với phiên hỏng.
      if (!data || typeof data !== "object" || !data.token) {
        setError(
          tr(
            "Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại sau.",
          ),
        );
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          accountId: data.accountId || data.userId,
          userId: data.userId || data.accountId,
          username: data.username,
          fullName: data.fullName,
          roleName: data.role,
        }),
      );

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem(
          "rememberedUsername",
          data.username || username.trim(),
        );
      } else {
        localStorage.removeItem("rememberMe");
        localStorage.removeItem("rememberedUsername");
      }

      const roleLower = (data.role || "").toLowerCase();
      if (roleLower === "admin") {
        navigate("/admin");
      } else if (roleLower === "instructor") {
        navigate("/instructor");
      } else if (roleLower === "qa" || roleLower === "qualityassurance") {
        navigate("/qa");
      } else if (roleLower === "academic" || roleLower === "academicstaff") {
        navigate("/academic");
      } else if (roleLower === "trainingmanager") {
        navigate("/trainingmanager");
      } else if (roleLower === "student" || roleLower === "learner") {
        navigate("/student");
      } else if (roleLower === "auditor" || roleLower === "audit") {
        navigate("/auditor");
      } else {
        navigate("/admin");
      }
    } catch (err) {
      setError(
        tr(
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendForgotOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotMessage({
        type: "error",
        text: tr("Vui lòng nhập email."),
      });
      return;
    }
    setForgotLoading(true);
    setForgotMessage({ type: "", text: "" });

    const response = await tryFetchWithFallback("/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail.trim() }),
    });

    if (!response) {
      setForgotMessage({
        type: "error",
        text: tr(
          "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
        ),
      });
      setForgotLoading(false);
      return;
    }

    if (response.ok) {
      setForgotStep(2);
      setResendCountdown(60);
      setForgotMessage({
        type: "success",
        text: tr(
          "Mã OTP xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.",
        ),
      });
    } else {
      const data = await response.json().catch(() => null);
      setForgotMessage({
        type: "error",
        text:
          data?.detail ||
          data?.message ||
          tr("Không thể gửi yêu cầu. Vui lòng thử lại sau."),
      });
    }
    setForgotLoading(false);
  };

  const handleResetPasswordWithOtp = async (e) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      setForgotMessage({
        type: "error",
        text: tr("Vui lòng nhập mã xác thực OTP 6 số từ email."),
      });
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotMessage({
        type: "error",
        text: tr("Mật khẩu mới phải có ít nhất 6 ký tự."),
      });
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotMessage({
        type: "error",
        text: tr("Mật khẩu xác nhận không khớp."),
      });
      return;
    }

    setForgotLoading(true);
    setForgotMessage({ type: "", text: "" });

    const response = await tryFetchWithFallback("/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: forgotEmail.trim(),
        token: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      }),
    });

    if (!response) {
      setForgotMessage({
        type: "error",
        text: tr("Không thể kết nối đến máy chủ. Vui lòng thử lại."),
      });
      setForgotLoading(false);
      return;
    }

    const data = await response.json().catch(() => null);

    if (response.ok) {
      setForgotMessage({
        type: "success",
        text: tr(
          "Mật khẩu đã được đặt lại thành công! Đang chuyển về trang đăng nhập...",
        ),
      });
      setUsername(forgotEmail.trim());
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotStep(1);
        setForgotOtp("");
        setForgotNewPassword("");
        setForgotConfirmPassword("");
        setForgotMessage({ type: "", text: "" });
      }, 2000);
    } else {
      setForgotMessage({
        type: "error",
        text:
          data?.detail ||
          data?.message ||
          tr("Mã OTP không hợp lệ hoặc đã hết hạn (15 phút)."),
      });
    }
    setForgotLoading(false);
  };

  return (
    <div className="login-container">
      <button
        type="button"
        className="login-home-btn"
        onClick={() => navigate("/")}
        title={tr("Quay về trang chủ")}
      >
        <FaArrowLeft />
        <span>{tr("Quay về trang chủ")}</span>
      </button>

      <div className="login-lang-switcher">
        <LanguageSwitcher dark />
      </div>
      <section className="login-intro">
        <div className="aviation-blobs" aria-hidden="true" />
        <div className="aviation-illustration" aria-hidden="true">
          <svg viewBox="0 0 760 640" role="presentation" focusable="false">
            <defs>
              <linearGradient
                id="runwayLine"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
                <stop offset="100%" stopColor="rgba(212,175,55,0.42)" />
              </linearGradient>
            </defs>
            <g
              fill="none"
              stroke="url(#runwayLine)"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M74 462h540" opacity="0.34" />
              <path d="M108 410h468" opacity="0.22" />
              <path d="M146 358h390" opacity="0.18" />
              <path d="M150 160c84 42 136 110 160 202" opacity="0.2" />
              <path d="M506 132c-84 34-150 90-198 174" opacity="0.18" />
              <circle cx="520" cy="206" r="112" opacity="0.18" />
              <circle cx="520" cy="206" r="68" opacity="0.16" />
              <path d="M154 230l414 0" opacity="0.14" />
              <path d="M180 182l342 0" opacity="0.1" />
              <path d="M382 116v322" opacity="0.08" />
              <path d="M260 320l212-126 22 24-212 126-22-24Z" opacity="0.2" />
              <path d="M274 338l184-110 30 36-184 110-30-36Z" opacity="0.12" />
              <path d="M194 500l390-214" opacity="0.1" />
            </g>
            <g fill="rgba(255,255,255,0.16)">
              <circle cx="212" cy="168" r="4" />
              <circle cx="286" cy="212" r="4" />
              <circle cx="610" cy="248" r="4" />
              <circle cx="452" cy="354" r="4" />
            </g>
          </svg>
        </div>
        <div className="logo-section login-logo">
          <div className="logo-text">
            <span className="brand-name">{tr('ETR Aviation Training')}</span>
            <span className="brand-sub">{tr('Electronic Training Record Portal')}</span>
          </div>
        </div>

        <div className="intro-copy">
          <span className="eyebrow">{tr('Aviation training operations')}</span>
          <h1>{tr('Secure access for ETR administration and training workflows.')}</h1>
          <p>
            Manage learners, courses, attendance, evidence, and ETR approval
            flows from one central aviation training portal.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          {showForgotPassword ? (
            /* ── Forgot Password View ── */
            <div className="forgot-password-view">
              <button
                type="button"
                className="forgot-back-btn"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotStep(1);
                  setForgotMessage({ type: "", text: "" });
                  setForgotEmail("");
                  setForgotOtp("");
                  setForgotNewPassword("");
                  setForgotConfirmPassword("");
                }}
              >
                <FaArrowLeft />
                <span>{tr("Quay lại đăng nhập")}</span>
              </button>

              <h2 className="login-title">
                {forgotStep === 1 ? tr("Quên mật khẩu") : tr("Đặt lại mật khẩu")}
              </h2>
              <p className="login-subtitle">
                {forgotStep === 1
                  ? tr("Nhập email của bạn để nhận mã xác thực OTP đặt lại mật khẩu")
                  : tr("Nhập mã OTP 6 số được gửi về email và thiết lập mật khẩu mới")}
              </p>

              {forgotMessage.text && (
                <div
                  className={`forgot-message ${forgotMessage.type}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    marginBottom: "18px",
                    backgroundColor:
                      forgotMessage.type === "success"
                        ? "rgba(34, 197, 94, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                    color: forgotMessage.type === "success" ? "#15803d" : "#dc2626",
                    border: `1px solid ${
                      forgotMessage.type === "success"
                        ? "rgba(34, 197, 94, 0.3)"
                        : "rgba(239, 68, 68, 0.3)"
                    }`,
                  }}
                >
                  {forgotMessage.type === "success" ? (
                    <FaCheckCircle style={{ fontSize: "1.1rem", flexShrink: 0 }} />
                  ) : (
                    <FaExclamationCircle style={{ fontSize: "1.1rem", flexShrink: 0 }} />
                  )}
                  <span>{forgotMessage.text}</span>
                </div>
              )}

              {forgotStep === 1 ? (
                /* Step 1: Input Email */
                <form
                  className="login-form"
                  onSubmit={handleSendForgotOtp}
                  noValidate
                >
                  <div className="form-group">
                    <label htmlFor="forgot-email">{tr("Email tài khoản")}</label>
                    <div className="input-shell">
                      <FaPaperPlane className="input-icon" aria-hidden="true" />
                      <input
                        id="forgot-email"
                        type="email"
                        placeholder={tr("Nhập địa chỉ email")}
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          setForgotMessage({ type: "", text: "" });
                        }}
                        disabled={forgotLoading}
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-submit-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <span className="btn-loading">
                        <span className="spinner" aria-hidden="true" />
                        {tr("Đang gửi...")}
                      </span>
                    ) : (
                      <>
                        <span>{tr("Gửi mã xác thực OTP")}</span>
                        <FaArrowRight aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Input OTP + New Password */
                <form
                  className="login-form"
                  onSubmit={handleResetPasswordWithOtp}
                  noValidate
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "rgba(10, 44, 85, 0.06)",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      color: "#334155",
                      marginBottom: "14px",
                    }}
                  >
                    <span>
                      {tr("Gửi đến")}: <strong>{forgotEmail}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep(1);
                        setForgotMessage({ type: "", text: "" });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#0a2c55",
                        fontWeight: "700",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0,
                      }}
                    >
                      {tr("Đổi email")}
                    </button>
                  </div>

                  <div className="form-group">
                    <label htmlFor="forgot-otp">{tr("Mã OTP (6 chữ số)")}</label>
                    <div className="input-shell">
                      <FaKey className="input-icon" aria-hidden="true" />
                      <input
                        id="forgot-otp"
                        type="text"
                        placeholder={tr("Nhập mã OTP 6 số")}
                        value={forgotOtp}
                        onChange={(e) => {
                          setForgotOtp(e.target.value);
                          setForgotMessage({ type: "", text: "" });
                        }}
                        maxLength={8}
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="forgot-new-pwd">
                      {tr("Mật khẩu mới (tối thiểu 6 ký tự)")}
                    </label>
                    <div className="input-shell input-shell--password">
                      <FaLock className="input-icon" aria-hidden="true" />
                      <input
                        id="forgot-new-pwd"
                        type={showForgotNewPassword ? "text" : "password"}
                        placeholder={tr("Nhập mật khẩu mới")}
                        value={forgotNewPassword}
                        onChange={(e) => {
                          setForgotNewPassword(e.target.value);
                          setForgotMessage({ type: "", text: "" });
                        }}
                        disabled={forgotLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        tabIndex={-1}
                      >
                        {showForgotNewPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="forgot-confirm-pwd">
                      {tr("Xác nhận mật khẩu mới")}
                    </label>
                    <div className="input-shell input-shell--password">
                      <FaShieldAlt className="input-icon" aria-hidden="true" />
                      <input
                        id="forgot-confirm-pwd"
                        type={showForgotConfirmPassword ? "text" : "password"}
                        placeholder={tr("Nhập lại mật khẩu mới")}
                        value={forgotConfirmPassword}
                        onChange={(e) => {
                          setForgotConfirmPassword(e.target.value);
                          setForgotMessage({ type: "", text: "" });
                        }}
                        disabled={forgotLoading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowForgotConfirmPassword(!showForgotConfirmPassword)
                        }
                        tabIndex={-1}
                      >
                        {showForgotConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "16px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span style={{ color: "#64748b" }}>
                      {tr("Chưa nhận được mã?")}
                    </span>
                    <button
                      type="button"
                      disabled={resendCountdown > 0 || forgotLoading}
                      onClick={handleSendForgotOtp}
                      style={{
                        background: "none",
                        border: "none",
                        color: resendCountdown > 0 ? "#94a3b8" : "#0a2c55",
                        fontWeight: "700",
                        cursor: resendCountdown > 0 ? "not-allowed" : "pointer",
                        padding: 0,
                      }}
                    >
                      {resendCountdown > 0
                        ? `${tr("Gửi lại sau")} (${resendCountdown}s)`
                        : tr("Gửi lại mã OTP")}
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="login-submit-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <span className="btn-loading">
                        <span className="spinner" aria-hidden="true" />
                        {tr("Đang xác thực...")}
                      </span>
                    ) : (
                      <>
                        <span>{tr("Xác nhận đặt lại mật khẩu")}</span>
                        <FaArrowRight aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ── Login Form ── */
            <>
              <h2 className="login-title">{tr("Đăng nhập")}</h2>
              <p className="login-subtitle">
                {tr("Vui lòng đăng nhập để truy cập hệ thống ETR")}
              </p>

              {error && (
                <div className="error-message" role="alert">
                  <FaExclamationCircle
                    className="error-icon"
                    aria-hidden="true"
                  />
                  <span>{error}</span>
                </div>
              )}

              <form className="login-form" onSubmit={handleSubmit} noValidate>
                <div className="form-group">
                  <label htmlFor="login-username">
                    {tr("Tên đăng nhập / Email")}
                  </label>
                  <div
                    className={`input-shell ${fieldErrors.username ? "input-shell--error" : ""}`}
                  >
                    <FaUser className="input-icon" aria-hidden="true" />
                    <input
                      id="login-username"
                      type="text"
                      placeholder={tr("Nhập tên đăng nhập hoặc email")}
                      value={username}
                      onChange={handleUsernameChange}
                      onBlur={() => {
                        const err = validateField("username", username);
                        setFieldErrors((prev) => ({ ...prev, username: err }));
                      }}
                      disabled={loading}
                      autoComplete="username"
                      aria-invalid={!!fieldErrors.username}
                      aria-describedby={
                        fieldErrors.username ? "username-error" : undefined
                      }
                    />
                  </div>
                  {fieldErrors.username && (
                    <p className="field-error" id="username-error" role="alert">
                      <FaExclamationCircle aria-hidden="true" />
                      {tr(fieldErrors.username)}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">{tr("Mật khẩu")}</label>
                  <div
                    className={`input-shell input-shell--password ${fieldErrors.password ? "input-shell--error" : ""}`}
                  >
                    <FaLock className="input-icon" aria-hidden="true" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder={tr("Nhập mật khẩu")}
                      value={password}
                      onChange={handlePasswordChange}
                      onBlur={() => {
                        const err = validateField("password", password);
                        setFieldErrors((prev) => ({ ...prev, password: err }));
                      }}
                      disabled={loading}
                      autoComplete="current-password"
                      aria-invalid={!!fieldErrors.password}
                      aria-describedby={
                        fieldErrors.password ? "password-error" : undefined
                      }
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={
                        showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                      }
                      disabled={loading}
                    >
                      {showPassword ? (
                        <FaEyeSlash aria-hidden="true" />
                      ) : (
                        <FaEye aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="field-error" id="password-error" role="alert">
                      <FaExclamationCircle aria-hidden="true" />
                      {tr(fieldErrors.password)}
                    </p>
                  )}
                </div>

                <div className="form-options">
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                    />
                    <span className="custom-checkbox" aria-hidden="true" />
                    <span>{tr("Ghi nhớ đăng nhập")}</span>
                  </label>
                  <button
                    type="button"
                    className="forgot-password"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotMessage({ type: "", text: "" });
                    }}
                  >
                    {tr("Quên mật khẩu?")}
                  </button>
                </div>

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="btn-loading">
                      <span className="spinner" aria-hidden="true" />
                      {tr("Đang đăng nhập...")}
                    </span>
                  ) : (
                    <>
                      <span>{tr("Đăng nhập")}</span>
                      <FaArrowRight aria-hidden="true" />
                    </>
                  )}
                </button>

                <div className="login-divider" aria-hidden="true" />

                <p className="assistance-text">{tr('Need assistance?')}</p>
                <p className="assistance-text assistance-text--muted">
                  {tr('Contact your system administrator.')}
                </p>

                <div style={{ marginTop: "16px", textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => navigate("/")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#c5a059",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <FaArrowLeft />
                    <span>{tr("Quay về trang chủ")}</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Login;
