import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

const TopbarUserWidget = ({ profilePath = "/academic/profile" }) => {
  const navigate = useNavigate();
  const { tr } = useLanguage();

  let user = { fullName: "User", username: "user", roleName: "User" };
  try {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      const parsed = JSON.parse(userJson);
      user = {
        ...user,
        ...parsed,
        fullName: parsed.fullName || parsed.username || user.fullName,
        roleName: parsed.roleName || parsed.role || user.roleName,
      };
    }
  } catch (e) {
    console.error("Error parsing user info in TopbarUserWidget", e);
  }

  const getInitials = (name) => {
    if (!name) return "US";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      onClick={() => navigate(profilePath)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        cursor: "pointer",
        padding: "5px 12px 5px 6px",
        borderRadius: "24px",
        background: "rgba(0, 33, 71, 0.04)",
        border: "1px solid rgba(0, 33, 71, 0.1)",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(197, 160, 89, 0.12)";
        e.currentTarget.style.borderColor = "#c5a059";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(0, 33, 71, 0.04)";
        e.currentTarget.style.borderColor = "rgba(0, 33, 71, 0.1)";
      }}
      title={tr("Xem thông tin cá nhân & cài đặt tài khoản")}
    >
      <div
        style={{
          width: "30px",
          height: "30px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #002147 0%, #003366 100%)",
          color: "#c5a059",
          fontSize: "11px",
          fontWeight: "800",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1.5px solid #c5a059",
          flexShrink: 0,
        }}
      >
        {getInitials(user.fullName)}
      </div>

      <div style={{ display: "flex", flexDirection: "column", textAlign: "left", lineHeight: "1.15" }}>
        <span
          style={{
            fontSize: "12px",
            fontWeight: "700",
            color: "#002147",
            maxWidth: "140px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {user.fullName}
        </span>
        <span
          style={{
            fontSize: "10px",
            fontWeight: "700",
            color: "#c5a059",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
          }}
        >
          {user.roleName}
        </span>
      </div>
    </div>
  );
};

export default TopbarUserWidget;
