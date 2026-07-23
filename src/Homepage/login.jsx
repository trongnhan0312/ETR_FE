import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaArrowRight,
  FaEye,
  FaEyeSlash,
  FaExclamationCircle,
  FaLock,
  FaPaperPlane,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";
import "./login.scss";

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

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState({ type: "", text: "" });
  const [forgotLoading, setForgotLoading] = useState(false);

  const validateField = (field, value) => {
    const rules = VALIDATION_RULES[field];
    if (!rules) return "";

    // Don't trim password — preserve intentional whitespace
    const checkValue =
      field === "password" ? value || "" : (value || "").trim();

    if (!checkValue && rules.required) {
      return rules.required;
    }
    if (rules.minLength && checkValue.length < rules.minLength.value) {
      return rules.minLength.message;
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

    const API_URL =
      import.meta.env.VITE_API_URL || "https://localhost:7169/api";

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      if (!response.ok) {
        let errorMsg =
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin đăng nhập.";
        try {
          const errData = await response.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch {
          try {
            const rawText = await response.text();
            if (rawText) {
              // Map English backend messages to Vietnamese
              if (rawText.includes("Invalid credentials")) {
                errorMsg = "Tên đăng nhập hoặc mật khẩu không chính xác.";
              } else if (rawText.includes("account is inactive")) {
                errorMsg =
                  "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.";
              } else {
                errorMsg = rawText;
              }
            }
          } catch {}
        }
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("Dữ liệu API trả về:", data);
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

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("rememberedUsername", data.username || username.trim());
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
      } else {
        navigate("/admin");
      }
    } catch (err) {
      setError(
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
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
            <span className="brand-name">ETR Aviation Training</span>
            <span className="brand-sub">Electronic Training Record Portal</span>
          </div>
        </div>

        <div className="intro-copy">
          <span className="eyebrow">Aviation training operations</span>
          <h1>Secure access for ETR administration and training workflows.</h1>
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
                  setForgotMessage({ type: "", text: "" });
                  setForgotEmail("");
                }}
              >
                <FaArrowLeft />
                <span>Quay lại đăng nhập</span>
              </button>

              <h2 className="login-title">Quên mật khẩu</h2>
              <p className="login-subtitle">
                Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu
              </p>

              {forgotMessage.text && (
                <div className={`forgot-message ${forgotMessage.type}`}>
                  <FaExclamationCircle className="forgot-message-icon" />
                  <span>{forgotMessage.text}</span>
                </div>
              )}

              <form
                className="login-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!forgotEmail.trim()) {
                    setForgotMessage({
                      type: "error",
                      text: "Vui lòng nhập email.",
                    });
                    return;
                  }
                  setForgotLoading(true);
                  setForgotMessage({ type: "", text: "" });
                  try {
                    const API_URL =
                      import.meta.env.VITE_API_URL ||
                      "https://localhost:7169/api";
                    const response = await fetch(
                      `${API_URL}/auth/forgot-password`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: forgotEmail.trim() }),
                      },
                    );
                    if (response.ok) {
                      setForgotMessage({
                        type: "success",
                        text: "Yêu cầu đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.",
                      });
                    } else {
                      const errText = await response.text().catch(() => "");
                      setForgotMessage({
                        type: "error",
                        text:
                          errText ||
                          "Không thể gửi yêu cầu. Vui lòng thử lại sau.",
                      });
                    }
                  } catch (err) {
                    setForgotMessage({
                      type: "error",
                      text: "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.",
                    });
                  } finally {
                    setForgotLoading(false);
                  }
                }}
                noValidate
              >
                <div className="form-group">
                  <label htmlFor="forgot-email">Email của bạn</label>
                  <div className="input-shell">
                    <FaPaperPlane className="input-icon" aria-hidden="true" />
                    <input
                      id="forgot-email"
                      type="email"
                      placeholder="Nhập địa chỉ email"
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
                      Đang gửi...
                    </span>
                  ) : (
                    <>
                      <span>Gửi yêu cầu</span>
                      <FaArrowRight aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* ── Login Form ── */
            <>
              <h2 className="login-title">Đăng nhập</h2>
              <p className="login-subtitle">
                Vui lòng đăng nhập để truy cập hệ thống ETR
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
                  <label htmlFor="login-username">Tên đăng nhập / Email</label>
                  <div
                    className={`input-shell ${fieldErrors.username ? "input-shell--error" : ""}`}
                  >
                    <FaUser className="input-icon" aria-hidden="true" />
                    <input
                      id="login-username"
                      type="text"
                      placeholder="Nhập tên đăng nhập hoặc email"
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
                      {fieldErrors.username}
                    </p>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Mật khẩu</label>
                  <div
                    className={`input-shell input-shell--password ${fieldErrors.password ? "input-shell--error" : ""}`}
                  >
                    <FaLock className="input-icon" aria-hidden="true" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Nhập mật khẩu"
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
                      {fieldErrors.password}
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
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                  <button
                    type="button"
                    className="forgot-password"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setForgotMessage({ type: "", text: "" });
                    }}
                  >
                    Quên mật khẩu?
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
                      Đang đăng nhập...
                    </span>
                  ) : (
                    <>
                      <span>Đăng nhập</span>
                      <FaArrowRight aria-hidden="true" />
                    </>
                  )}
                </button>

                <div className="login-divider" aria-hidden="true" />

                <p className="assistance-text">Need assistance?</p>
                <p className="assistance-text assistance-text--muted">
                  Contact your system administrator.
                </p>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Login;
