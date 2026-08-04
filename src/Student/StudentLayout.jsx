import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from 'react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import "../Academic/academic.scss";
import "../ADMIN/admin.scss";
import "./student.scss";

const navigationItems = [
  {
    label: "TỔNG QUAN",
    to: "/student",
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
    label: "HỒ SƠ ETR",
    to: "/student/etr",
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
    label: "CHỨNG CHỈ",
    to: "/student/certificates",
    icon: (
      <svg
        width="18"
        height="20"
        viewBox="0 0 19 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6.33333 17.5L4.75 14.8333L1.75 14.1667L2.04167 11.0833L0 8.75L2.04167 6.41667L1.75 3.33333L4.75 2.66667L6.33333 0L9.16667 1.20833L12 0L13.5833 2.66667L16.5833 3.33333L16.2917 6.41667L18.3333 8.75L16.2917 11.0833L16.5833 14.1667L13.5833 14.8333L12 17.5L9.16667 16.2917L6.33333 17.5ZM7.04167 15.375L9.16667 14.4583L11.3333 15.375L12.5 13.375L14.7917 12.8333L14.5833 10.5L16.125 8.75L14.5833 6.95833L14.7917 4.625L12.5 4.125L11.2917 2.125L9.16667 3.04167L7 2.125L5.83333 4.125L3.54167 4.625L3.75 6.95833L2.20833 8.75L3.75 10.5L3.54167 12.875L5.83333 13.375L7.04167 15.375ZM8.29167 11.7083L13 7L11.8333 5.79167L8.29167 9.33333L6.5 7.58333L5.33333 8.75L8.29167 11.7083Z"
          fill="currentColor"
        />
      </svg>
    ),
  },

  {
    label: "HỒ SƠ CỦA TÔI",
    to: "/student/profile",
    icon: (
      <svg
        width="18"
        height="20"
        viewBox="0 0 18 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 10C7.9 10 6.95833 9.60833 6.175 8.825C5.39167 8.04167 5 7.1 5 6C5 4.9 5.39167 3.95833 6.175 3.175C6.95833 2.39167 7.9 2 9 2C10.1 2 11.0417 2.39167 11.825 3.175C12.6083 3.95833 13 4.9 13 6C13 7.1 12.6083 8.04167 11.825 8.825C11.0417 9.60833 10.1 10 9 10ZM0 18V16C0 15.45 0.195833 14.9792 0.5875 14.5875C0.979167 14.1958 1.45 14 2 14H16C16.55 14 17.0208 14.1958 17.4125 14.5875C17.8042 14.9792 18 15.45 18 16V18H0Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

const StudentLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/student";
  const { tr } = useLanguage();

  // Get user info
  let user = { fullName: "Học viên", username: "student" };
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
    if (!name) return "HV";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (
      parts[parts.length - 2][0] + parts[parts.length - 1][0]
    ).toUpperCase();
  };

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
              <div className="brand-subtitle">Student Portal</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/student"}
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
                {(user.fullName || tr("Học viên")).length > 18
                  ? (user.fullName || tr("Học viên")).substring(0, 16) + "..."
                  : user.fullName || tr("Học viên")}
              </div>
              <div className="user-role">{tr("Học viên")}</div>
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
              AeroMetric Aviation Systems / Student Portal
            </div>
          </div>

          <div className="topbar-right">
            <button
              className="notification-btn"
              type="button"
              aria-label="Notifications"
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

export default StudentLayout;
