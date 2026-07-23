import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FaChalkboardTeacher,
  FaCalendarCheck,
  FaClipboardList,
  FaFileAlt,
  FaCalendarAlt,
} from "react-icons/fa";
import "./instructor.scss";

const navigationItems = [
  {
    label: "LỚP CỦA TÔI",
    to: "/instructor/classes",
    icon: <FaChalkboardTeacher size={18} />,
  },
  {
    label: "ĐIỂM DANH",
    to: "/instructor/attendance",
    icon: <FaCalendarCheck size={18} />,
  },
  {
    label: "ĐÁNH GIÁ",
    to: "/instructor/assessments",
    icon: <FaClipboardList size={18} />,
  },
  {
    label: "MINH CHỨNG",
    to: "/instructor/evidence",
    icon: <FaFileAlt size={18} />,
  },
  {
    label: "LỊCH GIẢNG DẠY",
    to: "/instructor/schedule",
    icon: <FaCalendarAlt size={18} />,
  },
];

const InstructorLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/instructor/classes';

  // Try to retrieve user information from localStorage
  let user = { fullName: "Giảng viên", roleName: "Instructor" };
  try {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      user = JSON.parse(userJson);
    }
  } catch (e) {
    console.error("Error parsing user storage", e);
  }

  const getInitials = (name) => {
    if (!name) return "GV";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (
      parts[parts.length - 2][0] + parts[parts.length - 1][0]
    ).toUpperCase();
  };

  return (
    <div className="academic-page">
      {/* Sidebar - Shared layout structure with Instructor */}
      <aside className="academic-sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="logo-box">
              <svg
                width="21"
                height="19"
                viewBox="0 0 21 19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 18.15V16.15H20V18.15H2ZM3.75 13.15L0 6.9L2.4 6.25L5.2 8.6L8.7 7.675L3.525 0.775L6.425 0L13.9 6.275L18.15 5.125C18.6833 4.975 19.1875 5.0375 19.6625 5.3125C20.1375 5.5875 20.45 5.99167 20.6 6.525C20.75 7.05833 20.6875 7.5625 20.4125 8.0375C20.1375 8.5125 19.7333 8.825 19.2 8.975L3.75 13.15Z"
                  fill="#0d2f5b"
                />
              </svg>
            </div>
            <div className="brand-text">
              <div className="brand-title">ETR</div>
              <div className="brand-subtitle">Instructor Portal</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item${isActive ? " active" : ""}`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar-container">
              <div className="avatar-fallback">
                {getInitials(user.fullName)}
              </div>
            </div>
            <div className="user-info">
              <div className="user-name" title={user.fullName}>
                {user.fullName.length > 15
                  ? user.fullName.substring(0, 13) + "..."
                  : user.fullName}
              </div>
              <div className="user-role">Giảng viên</div>
            </div>
          </div>
          <button
            className="ghost-btn sidebar-logout"
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              navigate("/login");
            }}
            style={{
              marginTop: "16px",
              width: "100%",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "8px",
              padding: "8px",
              fontWeight: "700",
              fontSize: "12px",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="academic-main">
        {/* Topbar */}
        <header className="academic-topbar">
          <div className="search-wrapper">
            {/* Back button - hidden when on home page */}
            {!isHomePage && (
              <button
                onClick={() => navigate(-1)}
                type="button"
                aria-label="Quay lại"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  border: "1px solid #dfe6f1",
                  borderRadius: "8px",
                  background: "#ffffff",
                  cursor: "pointer",
                  color: "#c5a059",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c5a059";
                  e.currentTarget.style.background = "rgba(197, 160, 89, 0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#dfe6f1";
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Quick Breadcrumb indicator */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "rgba(0, 33, 71, 0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginLeft: "12px",
              }}
            >
              AeroMetric Aviation Systems / Instructor Space
            </div>
          </div>

          <div className="topbar-right">
            {/* Notifications */}
            <button
              className="notification-btn"
              type="button"
              aria-label="Notifications"
              onClick={() => alert("Không có thông báo mới.")}
            >
              <svg
                width="16"
                height="20"
                viewBox="0 0 16 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z"
                  fill="currentColor"
                />
              </svg>
              <span className="dot"></span>
            </button>

            <div className="divider"></div>

            {/* Language Selection */}
            <button
              className="lang-switcher"
              type="button"
              onClick={() => alert("Chuyển đổi ngôn ngữ đang được phát triển.")}
            >
              <span>VIETNAMESE (VN)</span>
              <svg
                width="7"
                height="5"
                viewBox="0 0 7 5"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.5 4.31667L0 0.816667L0.816667 0L3.5 2.68333L6.18333 0L7 0.816667L3.5 4.31667Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="academic-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default InstructorLayout;
