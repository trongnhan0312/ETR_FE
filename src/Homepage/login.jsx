import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaEye, FaEyeSlash, FaLock, FaShieldAlt, FaUser } from 'react-icons/fa';
import './login.scss';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5129/api';

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Đăng nhập thất bại.';
        try {
          const errData = await response.json();
          errorMsg = errData.message || errData.error || errorMsg;
        } catch {
          try {
            const rawText = await response.text();
            if (rawText) errorMsg = rawText;
          } catch {}
        }
        setError(errorMsg);
        setLoading(false);
        return;
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        userId: data.userId,
        username: data.username,
        fullName: data.fullName,
        roleName: data.roleName,
      }));

      const roleLower = (data.roleName || '').toLowerCase();
      if (roleLower === 'admin') {
        navigate('/admin');
      } else if (roleLower === 'instructor') {
        navigate('/introductor');
      } else if (roleLower === 'qa' || roleLower === 'qualityassurance') {
        navigate('/qa');
      } else if (roleLower === 'academic' || roleLower === 'academicstaff') {
        navigate('/academic');
      } else if (roleLower === 'trainingmanager') {
        navigate('/trainingmanager');
      } else {
        navigate('/admin');
      }
    } catch (err) {
      setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.');
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
              <linearGradient id="runwayLine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
                <stop offset="100%" stopColor="rgba(212,175,55,0.42)" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#runwayLine)" strokeLinecap="round" strokeLinejoin="round">
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
            Manage learners, courses, attendance, evidence, and ETR approval flows
            from one central aviation training portal.
          </p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <button type="button" className="back-link" onClick={() => navigate('/') }>
            ← Về trang chủ
          </button>

          <div className="login-badge" aria-hidden="true">
            <FaShieldAlt />
          </div>

          <h2 className="login-title">Đăng nhập</h2>
          <p className="login-subtitle">Vui lòng đăng nhập để truy cập hệ thống ETR</p>

          {error && <div className="error-message" role="alert">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Tên đăng nhập / Email</label>
              <div className="input-shell">
                <FaUser className="input-icon" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Nhập tên đăng nhập hoặc email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="input-shell input-shell--password">
                <FaLock className="input-icon" aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  disabled={loading}
                >
                  {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" disabled={loading} />
                <span className="custom-checkbox" aria-hidden="true" />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <a href="#" className="forgot-password">
                Quên mật khẩu?
              </a>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
              {!loading && <FaArrowRight aria-hidden="true" />}
            </button>

            <div className="login-divider" aria-hidden="true" />

            <p className="assistance-text">Need assistance?</p>
            <p className="assistance-text assistance-text--muted">Contact your system administrator.</p>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Login;