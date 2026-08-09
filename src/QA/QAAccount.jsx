import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useToast } from "../components/Toast";
import { useLanguage } from '../context/LanguageContext';

const QAAccount = () => {
  const { tr, trEn } = useLanguage();
  const [profile, setProfile] = useState({
    name: "QA Staff",
    role: "Quality Assurance Officer",
    email: "qa.staff@etr-aviation.local",
    status: "Active",
  });
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  // Toast notifications (thay banner tm-alert-banner cũ)
  const toast = useToast();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setProfile((prev) => ({
          ...prev,
          name: user.fullName || user.username || prev.name,
          role: user.roleName || prev.role,
        }));
      } catch {}
    }
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error(tr("Thiếu thông tin"), tr("Vui lòng điền đầy đủ thông tin."));
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error(tr("Mật khẩu không khớp"), tr("Mật khẩu mới không khớp."));
      return;
    }
    try {
      await api.post("/auth/change-password", {
        oldPassword: currentPwd,
        newPassword: newPwd,
      });
      toast.success(tr("Cập nhật mật khẩu thành công"), tr("Mật khẩu của bạn đã được cập nhật."));
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(tr("Đổi mật khẩu thất bại"), err.message || tr("Lỗi không xác định"));
    }
  };

  return (
    <div className="qa-shell">
      {/* Toast notifications */}
      <toast.ToastContainer />

      <section className="qa-page-card">
        <p className="qa-eyebrow">{trEn('Account')}</p>
        <h1>{trEn('My Profile')}</h1>
        <p className="qa-page-description">
          {trEn('Manage your own account, update your profile information, and change your password here.')}
        </p>
      </section>

      <section className="qa-grid-2">
        <div className="qa-panel">
          <h2>{trEn('Profile')}</h2>
          <div className="qa-kv-grid">
            <div className="qa-kv">
              <strong>{trEn('Name')}</strong>
              <span>{trEn(profile.name)}</span>
            </div>
            <div className="qa-kv">
              <strong>{trEn('Role')}</strong>
              <span>{trEn(profile.role)}</span>
            </div>
            <div className="qa-kv">
              <strong>{trEn('Email')}</strong>
              <span>{trEn(profile.email)}</span>
            </div>
            <div className="qa-kv">
              <strong>{trEn('Status')}</strong>
              <span>{trEn(profile.status)}</span>
            </div>
          </div>
        </div>

        <div className="qa-panel">
          <h2>{trEn('Change Password')}</h2>
          <form className="qa-list" onSubmit={handleChangePassword}>
            <input
              className="qa-input"
              type="password"
              placeholder={trEn('Current password')}
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
            />
            <input
              className="qa-input"
              type="password"
              placeholder={trEn('New password')}
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
            <input
              className="qa-input"
              type="password"
              placeholder={trEn('Confirm new password')}
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
            />
            <button className="qa-btn" type="submit">
              {trEn('Update Password')}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default QAAccount;
