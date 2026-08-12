import { useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import NotificationsDropdown from "../components/NotificationsDropdown";
import { useLanguage } from "../context/LanguageContext";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import "./academic.scss";

const navigationItems = [
  {
    label: "HỌC VIÊN",
    to: "/academic/learners",
    icon: (
      <svg
        width="22"
        height="16"
        viewBox="0 0 22 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM18 16V13C18 12.2667 17.7958 11.5625 17.3875 10.8875C16.9792 10.2125 16.4 9.63333 15.65 9.15C16.5 9.25 17.3 9.42083 18.05 9.6625C18.8 9.90417 19.5 10.2 20.15 10.55C20.75 10.8833 21.2083 11.2542 21.525 11.6625C21.8417 12.0708 22 12.5167 22 13V16H18ZM8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM18 4C18 5.1 17.6083 6.04167 16.825 6.825C16.0417 7.60833 15.1 8 14 8C13.8167 8 13.5833 7.97917 13.3 7.9375C13.0167 7.89583 12.7833 7.85 12.6 7.8C13.05 7.26667 13.3958 6.675 13.6375 6.025C13.8792 5.375 14 4.7 14 4C14 3.3 13.8792 2.625 13.6375 1.975C13.3958 1.325 13.05 0.733333 12.6 0.2C12.8333 0.116667 13.0667 0.0625 13.3 0.0375C13.5333 0.0125 13.7667 0 14 0C15.1 0 16.0417 0.391667 16.825 1.175C17.6083 1.95833 18 2.9 18 4ZM2 14H14V13.2C14 13.0167 13.9542 12.85 13.8625 12.7C13.7708 12.55 13.65 12.4333 13.5 12.35C12.6 11.9 11.6917 11.5625 10.775 11.3375C9.85833 11.1125 8.93333 11 8 11C7.06667 11 6.14167 11.1125 5.225 11.3375C4.30833 11.5625 3.4 11.9 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.04167 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z" />
      </svg>
    ),
    children: [
      { label: "Danh sách học viên", to: "/academic/learners" },
      { label: "Hồ sơ học viên", to: "/academic/profiles" },
    ],
  },
  {
    label: "KHÓA & LỚP HỌC",
    to: "/academic/courses",
    icon: (
      <svg
        width="22"
        height="18"
        viewBox="0 0 22 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M11 18L4 14.2V8.2L0 6L11 0L22 6V14H20V7.1L18 8.2V14.2L11 18ZM11 9.7L17.85 6L11 2.3L4.15 6L11 9.7ZM11 15.725L16 13.025V9.25L11 12L6 9.25V13.025L11 15.725Z" />
      </svg>
    ),
  },
  {
    label: "QUẢN LÝ ETR",
    to: "/academic/etr",
    icon: (
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M6.95 16L12.6 10.35L11.15 8.9L6.925 13.125L4.825 11.025L3.4 12.45L6.95 16ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H10L16 6V18C16 18.55 15.8042 19.0208 15.4125 19.4125C15.0208 19.8042 14.55 20 14 20H2ZM9 7V2H2V18H14V7H9ZM2 2V7V2V7V18V2Z" />
      </svg>
    ),
  },
  {
    label: "CHỦ ĐỀ MÔN HỌC",
    to: "/academic/subjects",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 2H14L20 8V18C20 19.1046 19.1046 20 18 20H2C0.89543 20 0 19.1046 0 18V4C0 2.89543 0.89543 2 2 2ZM10 16C8.89543 16 8 15.1046 8 14C8 12.8954 8.89543 12 10 12C11.1046 12 12 12.8954 12 14C12 15.1046 11.1046 16 10 16ZM14 10H6V9H14V10ZM14 8H6V7H14V8Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    label: "HẾT HẠN CC",
    to: "/academic/expiring-students",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 19 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6.33333 17.5L4.75 14.8333L1.75 14.1667L2.04167 11.0833L0 8.75L2.04167 6.41667L1.75 3.33333L4.75 2.66667L6.33333 0L9.16667 1.20833L12 0L13.5833 2.66667L16.5833 3.33333L16.2917 6.41667L18.3333 8.75L16.2917 11.0833L16.5833 14.1667L13.5833 14.8333L12 17.5L9.16667 16.2917L6.33333 17.5ZM7.04167 15.375L9.16667 14.4583L11.3333 15.375L12.5 13.375L14.7917 12.8333L14.5833 10.5L16.125 8.75L14.5833 6.95833L14.7917 4.625L12.5 4.125L11.2917 2.125L9.16667 3.04167L7 2.125L5.83333 4.125L3.54167 4.625L3.75 6.95833L2.20833 8.75L3.75 10.5L3.54167 12.875L5.83333 13.375L7.04167 15.375Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

const AcademicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/academic/learners";
  const [expandedMenu, setExpandedMenu] = useState("");
  const { tr } = useLanguage();

  const isItemActive = (item) => {
    if (item.children) {
      return item.children.some((child) =>
        location.pathname.startsWith(child.to),
      );
    }
    return location.pathname === item.to;
  };

  const isMenuExpanded = (item) =>
    expandedMenu === item.label || isItemActive(item);

  return (
    <div className="academic-page">
      {/* Sidebar */}
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
                <path d="M2 18.15V16.15H20V18.15H2ZM3.75 13.15L0 6.9L2.4 6.25L5.2 8.6L8.7 7.675L3.525 0.775L6.425 0L13.9 6.275L18.15 5.125C18.6833 4.975 19.1875 5.0375 19.6625 5.3125C20.1375 5.5875 20.45 5.99167 20.6 6.525C20.75 7.05833 20.6875 7.5625 20.4125 8.0375C20.1375 8.5125 19.7333 8.825 19.2 8.975L3.75 13.15Z" />
              </svg>
            </div>
            <div className="brand-text">
              <div className="brand-title">ETR</div>
              <div className="brand-subtitle">{tr("Academic Portal")}</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navigationItems.map((item) => {
              if (item.children) {
                const expanded = isMenuExpanded(item);
                return (
                  <div key={item.to} className="nav-group">
                    <NavLink
                      to={item.to}
                      onClick={() =>
                        setExpandedMenu((current) =>
                          current === item.label ? "" : item.label,
                        )
                      }
                      className={`nav-item nav-group-toggle${isItemActive(item) ? " active" : ""}`}
                    >
                      {item.icon}
                      <span>{tr(item.label)}</span>
                      <svg
                        className={`chevron${expanded ? " open" : ""}`}
                        width="10"
                        height="6"
                        viewBox="0 0 10 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5 6L0 1L1 0L5 4L9 0L10 1L5 6Z"
                          fill="currentColor"
                        />
                      </svg>
                    </NavLink>
                    {expanded && (
                      <div className="nav-submenu">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `nav-sub-item${isActive ? " active" : ""}`
                            }
                          >
                            <span className="sub-dot" />
                            <span>{tr(child.label)}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
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
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar-container">
              <div className="avatar-fallback">AS</div>
            </div>
            <div className="user-info">
              <div className="user-name">{tr("Academic Staff")}</div>
              <div className="user-role">{tr("Premium Access")}</div>
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
            style={{ marginTop: "16px", width: "100%" }}
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
                whiteSpace: "nowrap",
              }}
            >
              {tr("AeroMetric Aviation Systems / Academic Space")}
            </div>
          </div>

          <div className="topbar-right">
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
    </div>
  );
};

export default AcademicLayout;
