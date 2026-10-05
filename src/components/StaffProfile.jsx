import { useState, useEffect } from "react";
import { api, parseApiError } from "../utils/api";
import { useToast } from "./Toast";
import { useLanguage } from "../context/LanguageContext";

const StaffProfile = ({ portalName = "Management Portal", roleScope = "Staff Access" }) => {
  const { tr, trEn } = useLanguage();
  const toast = useToast();

  const [profile, setProfile] = useState({
    fullName: "",
    username: "",
    userCode: "",
    roleName: "",
    email: "",
    phone: "",
    department: "",
    status: "Active",
  });

  const [loading, setLoading] = useState(true);

  // Change password form state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [submittingPwd, setSubmittingPwd] = useState(false);

  useEffect(() => {
    // 1. Initial read from localStorage
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        setProfile((prev) => ({
          ...prev,
          fullName: u.fullName || u.username || "Staff User",
          username: u.username || "",
          userCode: u.userCode || u.studentCode || `ACC-#${u.accountId || ""}`,
          roleName: u.roleName || u.role || "Staff",
          email: u.email || "",
          phone: u.phone || "",
          department: u.departmentName || u.department || "",
          status: u.status || "Active",
        }));
      }
    } catch (e) {
      console.error("Error reading cached user", e);
    }

    // 2. Fetch fresh profile from API
    const fetchFreshProfile = async () => {
      try {
        const res = await api.get("/UserProfiles/my-profile");
        if (res) {
          setProfile((prev) => ({
            ...prev,
            fullName: res.fullName || prev.fullName,
            username: res.username || prev.username,
            userCode: res.userCode || prev.userCode,
            email: res.email || prev.email,
            phone: res.phone || prev.phone,
            department: res.departmentName || prev.department,
            roleName: res.roleName || prev.roleName,
            status: res.status || prev.status,
          }));
        }
      } catch (err) {
        // Fallback silently if endpoint has specific role policy
        console.warn("Could not fetch UserProfiles/my-profile, using stored credentials.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFreshProfile();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error(tr("Vui lòng điền đầy đủ các trường mật khẩu."));
      return;
    }
    if (newPwd.length < 6) {
      toast.error(tr("Mật khẩu mới phải có ít nhất 6 ký tự."));
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error(tr("Mật khẩu xác nhận không khớp."));
      return;
    }

    setSubmittingPwd(true);
    try {
      await api.post("/Auth/change-password", {
        oldPassword: currentPwd,
        newPassword: newPwd,
      });
      toast.success(tr("Cập nhật mật khẩu thành công."));
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (err) {
      toast.error(parseApiError(err, tr("Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.")));
    } finally {
      setSubmittingPwd(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "ST";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* Header */}
      <section className="content-header" style={{ marginBottom: "0" }}>
        <div className="header-left">
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#c5a059", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>
            {trEn(portalName)}
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#002147", margin: "0 0 8px 0" }}>
            {tr("Hồ sơ & Thông tin cá nhân")}
          </h1>
          <div className="divider-gold" style={{ width: "48px", height: "3px", background: "#c5a059", marginBottom: "10px" }} />
          <p className="header-description" style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>
            {tr("Xem thông tin định danh hệ thống, quản lý bảo mật và phạm vi quyền hạn được phân công.")}
          </p>
        </div>
      </section>

      {/* Main Grid: Info + Security */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px" }}>
        {/* Panel 1: Profile Info */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0, 33, 71, 0.04)",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          {/* Avatar and basic info */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", paddingBottom: "20px", borderBottom: "1px solid #f1f5f9" }}>
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #002147 0%, #003366 100%)",
                color: "#c5a059",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "800",
                boxShadow: "0 4px 12px rgba(0, 33, 71, 0.15)",
                border: "2px solid #c5a059",
                flexShrink: 0,
              }}
            >
              {getInitials(profile.fullName)}
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#002147", margin: "0 0 6px 0" }}>
                {profile.fullName || tr("Người dùng")}
              </h2>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <span
                  style={{
                    background: "rgba(197, 160, 89, 0.15)",
                    color: "#92400e",
                    border: "1px solid rgba(197, 160, 89, 0.4)",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                  }}
                >
                  {profile.roleName || "Staff"}
                </span>
                <span
                  style={{
                    background: profile.status === "Active" ? "#dcfce7" : "#fee2e2",
                    color: profile.status === "Active" ? "#15803d" : "#b91c1c",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                >
                  ● {profile.status}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed key-value pairs */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #edf2f7" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>{tr("Tên đăng nhập (Username)")}</span>
              <strong style={{ fontSize: "13px", color: "#002147" }}>{profile.username || "—"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #edf2f7" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>{tr("Mã định danh (User Code)")}</span>
              <strong style={{ fontSize: "13px", color: "#002147" }}>{profile.userCode || "—"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #edf2f7" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>{tr("Email")}</span>
              <strong style={{ fontSize: "13px", color: "#002147" }}>{profile.email || "—"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #edf2f7" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>{tr("Số điện thoại")}</span>
              <strong style={{ fontSize: "13px", color: "#002147" }}>{profile.phone || "—"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #edf2f7" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>{tr("Phòng ban / Ngành")}</span>
              <strong style={{ fontSize: "13px", color: "#002147" }}>{profile.department || "Flight Training Operations"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #edf2f7" }}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>{tr("Phạm vi quyền hạn")}</span>
              <strong style={{ fontSize: "12px", color: "#16a34a" }}>✓ {trEn(roleScope)}</strong>
            </div>
          </div>
        </section>

        {/* Panel 2: Change Password & Security */}
        <section
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 4px 12px rgba(0, 33, 71, 0.04)",
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#002147", margin: "0 0 6px 0" }}>
              🔒 {tr("Bảo mật & Đổi mật khẩu")}
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
              {tr("Cập nhật mật khẩu định kỳ để đảm bảo an toàn cho tài khoản hệ thống.")}
            </p>
          </div>

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#002147", marginBottom: "6px" }}>
                {tr("Mật khẩu hiện tại *")}
              </label>
              <input
                type="password"
                required
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder={tr("Nhập mật khẩu hiện tại...")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#002147", marginBottom: "6px" }}>
                {tr("Mật khẩu mới *")}
              </label>
              <input
                type="password"
                required
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder={tr("Nhập mật khẩu mới (tối thiểu 6 ký tự)...")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#002147", marginBottom: "6px" }}>
                {tr("Xác nhận mật khẩu mới *")}
              </label>
              <input
                type="password"
                required
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder={tr("Nhập lại mật khẩu mới...")}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginTop: "10px" }}>
              <button
                type="submit"
                disabled={submittingPwd}
                style={{
                  background: "#002147",
                  color: "#c5a059",
                  border: "1px solid #c5a059",
                  padding: "12px 24px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: submittingPwd ? "not-allowed" : "pointer",
                  width: "100%",
                  transition: "all 0.2s",
                }}
              >
                {submittingPwd ? tr("Đang xử lý...") : tr("Cập nhật mật khẩu")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default StaffProfile;
