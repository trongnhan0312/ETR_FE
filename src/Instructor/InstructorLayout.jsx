import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  FaChalkboardTeacher,
  FaCalendarCheck,
  FaClipboardList,
  FaFileAlt,
  FaCalendarAlt,
  FaListOl,
} from "react-icons/fa";
import LanguageSwitcher from "../components/LanguageSwitcher";
import NotificationsDropdown from "../components/NotificationsDropdown";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../components/Toast";
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
    label: "CẤU TRÚC ĐÁNH GIÁ",
    to: "/instructor/structure",
    icon: <FaListOl size={18} />,
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
  const toast = useToast();
  const { tr } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/instructor/classes";

  // Try to retrieve user information from localStorage
  let user = { fullName: "Giảng viên", roleName: "Instructor" };
  try {
    const userJson = localStorage.getItem("user");
    if (userJson) {
      const parsedUser = JSON.parse(userJson);
      user = {
        ...user,
        ...parsedUser,
        fullName: parsedUser.fullName || parsedUser.username || user.fullName,
      };
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
              <div className="brand-subtitle">{tr('Instructor Portal')}</div>
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
                <span>{tr(item.label)}</span>
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
                {(user.fullName || tr("Giảng viên")).length > 15
                  ? (user.fullName || tr("Giảng viên")).substring(0, 13) + "..."
                  : user.fullName || tr("Giảng viên")}
              </div>
              <div className="user-role">{tr("Giảng viên")}</div>
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
            {tr("Đăng xuất")}
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
                aria-label={tr("Quay lại")}
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
              {tr('AeroMetric Aviation Systems / Instructor Space')}
            </div>
          </div>

          <div className="topbar-right">
            {/* Notifications */}
            <NotificationsDropdown />

            <div className="divider"></div>

            <LanguageSwitcher />
          </div>
        </header>

        {/* Content Body */}
        <main className="academic-content">
          <Outlet />
        </main>
      </div>

      {/* Toast notifications */}
      <toast.ToastContainer />
    </div>
  );
};

export default InstructorLayout;
