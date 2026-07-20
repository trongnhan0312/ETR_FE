import { useState, useEffect } from "react";
import { api } from "../utils/api";

const QAAccount = () => {
  const [profile, setProfile] = useState({
    name: "QA Staff",
    role: "Quality Assurance Officer",
    email: "qa.staff@etr-aviation.local",
    status: "Active",
  });
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

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
      setMessage({ type: "error", text: "Vui lòng điền đầy đủ thông tin." });
      return;
    }
    if (newPwd !== confirmPwd) {
      setMessage({ type: "error", text: "Mật khẩu mới không khớp." });
      return;
    }
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      await api.put(`/Accounts/${userData.accountId}/password`, {
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      setMessage({ type: "success", text: "Cập nhật mật khẩu thành công!" });
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      setMessage({ type: "error", text: "Đổi mật khẩu thất bại: " + (err.message || "") });
    }
  };

  return (
    <div className="qa-shell">
      {message.text && (
        <div className={`tm-alert-banner ${message.type}`} style={{ marginBottom: "16px" }}>
          <p>{message.text}</p>
          <button onClick={() => setMessage({ type: "", text: "" })}>✕</button>
        </div>
      )}

      <section className="qa-page-card">
        <p className="qa-eyebrow">Account</p>
        <h1>My Profile</h1>
        <p className="qa-page-description">
          Manage your own account, update your profile information, and change
          your password here.
        </p>
      </section>

      <section className="qa-grid-2">
        <div className="qa-panel">
          <h2>Profile</h2>
          <div className="qa-kv-grid">
            <div className="qa-kv">
              <strong>Name</strong>
              <span>{profile.name}</span>
            </div>
            <div className="qa-kv">
              <strong>Role</strong>
              <span>{profile.role}</span>
            </div>
            <div className="qa-kv">
              <strong>Email</strong>
              <span>{profile.email}</span>
            </div>
            <div className="qa-kv">
              <strong>Status</strong>
              <span>{profile.status}</span>
            </div>
          </div>
        </div>

        <div className="qa-panel">
          <h2>Change Password</h2>
          <form className="qa-list" onSubmit={handleChangePassword}>
            <input
              className="qa-input"
              type="password"
              placeholder="Current password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
            />
            <input
              className="qa-input"
              type="password"
              placeholder="New password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
            <input
              className="qa-input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
            />
            <button className="qa-btn" type="submit">
              Update Password
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default QAAccount;
