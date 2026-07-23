import { useState, useEffect } from 'react';
import { api } from '../utils/api';

/** Format a Date or ISO string → yyyy-MM-dd for <input type="date"> */
const toDateInputValue = (d) => {
  if (!d) return '';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt.getTime())) return '';
    return dt.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/** Format an ISO string → dd/MM/yyyy for display */
const formatDate = (d) => {
  if (!d) return '--';
  try {
    return new Date(d).toLocaleDateString('vi-VN');
  } catch {
    return '--';
  }
};

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

const StudentProfile = () => {
  /* ── Profile state (mirrors UpdateUserProfileRequest) ── */
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Other',
    organization: '',
    username: '',
    roleName: 'Student',
    userCode: '',
  });

  /* ── Form states ── */
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  /* ── Password states ── */
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loadingPwd, setLoadingPwd] = useState(false);

  /* ── Load profile ── */
  useEffect(() => {
    (async () => {
      setProfileLoading(true);

      // 1. Quick-fill from localStorage
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        setProfile((prev) => ({
          ...prev,
          fullName: u.fullName || '',
          username: u.username || '',
          roleName: u.roleName || 'Student',
        }));
      } catch { /* ignore */ }

      // 2. Full profile from API (includes Phone, DateOfBirth, Gender)
      try {
        const data = await api.get('/UserProfiles/me', { suppressAuthRedirect: true });
        if (data) {
          setProfile({
            fullName: data.FullName ?? data.fullName ?? '',
            email: data.Email ?? data.email ?? '',
            phone: data.Phone ?? data.phone ?? '',
            dateOfBirth: data.DateOfBirth ?? data.dateOfBirth ?? '',
            gender: data.Gender ?? data.gender ?? 'Other',
            organization: data.Organization ?? data.organization ?? '',
            username: data.username ?? profile.username ?? '',
            roleName: data.RoleName ?? data.roleName ?? 'Student',
            userCode: data.UserCode ?? data.userCode ?? '',
          });
        }
      } catch {
        // fallback to localStorage data already set above
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  const initials = (name) => {
    if (!name) return 'HV';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  /* ── Save profile ── */
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);

    try {
      await api.put(
        '/UserProfiles/me',
        {
          fullName: profile.fullName.trim(),
          email: profile.email.trim(),
          phone: profile.phone?.trim() || null,
          dateOfBirth: profile.dateOfBirth
            ? new Date(profile.dateOfBirth).toISOString()
            : new Date('2000-01-01').toISOString(),
          gender: profile.gender || 'Other',
          organization: profile.organization?.trim() || null,
        },
        { suppressAuthRedirect: true },
      );
      setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Cập nhật thất bại: ' + (err.message || 'Lỗi không xác định'),
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Change password ── */
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!currentPwd || !newPwd || !confirmPwd) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin.' });
      return;
    }
    if (newPwd !== confirmPwd) {
      setMessage({ type: 'error', text: 'Mật khẩu mới không khớp.' });
      return;
    }
    if (newPwd.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự.' });
      return;
    }

    setLoadingPwd(true);
    try {
      await api.post(
        '/auth/change-password',
        { currentPassword: currentPwd, newPassword: newPwd },
        { suppressAuthRedirect: true },
      );
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Đổi mật khẩu thất bại: ' + (err.message || 'Lỗi không xác định'),
      });
    } finally {
      setLoadingPwd(false);
    }
  };

  return (
    <div className="page-shell">
      {/* ── Header ── */}
      <section className="student-welcome" style={{ marginBottom: 24 }}>
        <div className="student-welcome-left">
          <p className="eyebrow">Student Portal</p>
          <h1>Hồ sơ của tôi</h1>
          <p className="welcome-sub">
            Quản lý thông tin cá nhân, ngày sinh, số điện thoại và mật khẩu.
          </p>
        </div>
        <div className="student-welcome-right">
          <div className="student-avatar-large">{initials(profile.fullName)}</div>
          <span className="welcome-role">
            {profile.userCode || profile.roleName}
          </span>
        </div>
      </section>

      {/* ── Message Banner ── */}
      {message.text && (
        <div className={`student-message student-message--${message.type}`}>
          <span>{message.text}</span>
          <button
            className="student-message-dismiss"
            type="button"
            onClick={() => setMessage({ type: '', text: '' })}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Two-column grid ── */}
      <section className="student-info-grid">
        {/* ===== LEFT: Edit Profile ===== */}
        <div className="student-info-card">
          <div className="student-profile-header">
            <div className="student-profile-avatar">{initials(profile.fullName)}</div>
            <div>
              <h2 className="student-profile-name">
                {profile.fullName || 'Học viên'}
              </h2>
              <p className="student-profile-role">
                {profile.roleName === 'Student' ? 'Học viên' : profile.roleName}
              </p>
            </div>
          </div>

          {profileLoading ? (
            <p style={{ color: 'rgba(0,33,71,0.4)', fontSize: 13 }}>Đang tải...</p>
          ) : (
            <form className="student-pwd-form" onSubmit={handleSaveProfile}>
              {/* Full Name (display only) */}
              <div className="form-group">
                <label>Họ và tên</label>
                <div className="student-field-value" style={{ padding: '11px 14px', border: '1px solid #e4eaf3', borderRadius: '10px', background: '#f0f4f9', color: 'rgba(0,33,71,0.6)', fontSize: '14px' }}>
                  {profile.fullName || '--'}
                </div>
              </div>

              {/* Email (display only) */}
              <div className="form-group">
                <label>Email</label>
                <div className="student-field-value" style={{ padding: '11px 14px', border: '1px solid #e4eaf3', borderRadius: '10px', background: '#f0f4f9', color: 'rgba(0,33,71,0.6)', fontSize: '14px' }}>
                  {profile.email || '--'}
                </div>
              </div>

              {/* Phone */}
              <div className="form-group">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="Nhập số điện thoại"
                  value={profile.phone || ''}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>

              {/* Date of Birth */}
              <div className="form-group">
                <label>Ngày sinh</label>
                <input
                  type="date"
                  value={toDateInputValue(profile.dateOfBirth)}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, dateOfBirth: e.target.value }))
                  }
                />
              </div>

              {/* Gender */}
              <div className="form-group">
                <label>Giới tính</label>
                <select
                  value={profile.gender || 'Other'}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, gender: e.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #d9e1ec',
                    fontSize: '14px',
                    color: '#17314f',
                    outline: 'none',
                    background: '#f8faff',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                >
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g === 'Male' ? 'Nam' : g === 'Female' ? 'Nữ' : 'Khác'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
                style={{ width: '100%', marginTop: 8 }}
              >
                {saving ? 'Đang lưu...' : 'Lưu thông tin'}
              </button>
            </form>
          )}
        </div>

        {/* ===== RIGHT: Change Password ===== */}
        <div className="student-info-card">
          <p className="info-eyebrow">Bảo mật</p>
          <h3>Đổi mật khẩu</h3>
          <form className="student-pwd-form" onSubmit={handleChangePassword}>
            <div className="form-group">
              <label htmlFor="sp-current">Mật khẩu hiện tại</label>
              <input
                id="sp-current"
                type="password"
                placeholder="Nhập mật khẩu hiện tại"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                disabled={loadingPwd}
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="sp-new">Mật khẩu mới</label>
              <input
                id="sp-new"
                type="password"
                placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                disabled={loadingPwd}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="sp-confirm">Xác nhận mật khẩu mới</label>
              <input
                id="sp-confirm"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                disabled={loadingPwd}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="primary-btn"
              disabled={loadingPwd}
              style={{ width: '100%', marginTop: 4 }}
            >
              {loadingPwd ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default StudentProfile;
