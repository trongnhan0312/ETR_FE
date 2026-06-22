import React from 'react';
import { useNavigate } from 'react-router-dom';
import './login.scss';

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      <section className="login-intro">
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

          <h2 className="login-title">Đăng nhập</h2>
          <p className="login-subtitle">Vui lòng đăng nhập để truy cập hệ thống ETR</p>

          <form className="login-form">
            <div className="form-group">
              <label>Tên đăng nhập / Email</label>
              <input type="text" placeholder="Nhập tên đăng nhập hoặc email" />
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <input type="password" placeholder="Nhập mật khẩu" />
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" /> Ghi nhớ đăng nhập
              </label>
              <a href="#" className="forgot-password">
                Quên mật khẩu?
              </a>
            </div>

            <button type="submit" className="login-submit-btn">
              Đăng nhập
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Login;