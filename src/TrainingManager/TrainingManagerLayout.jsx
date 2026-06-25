import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import "./training-manager.scss";

const TrainingManagerLayout = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sample notifications
  const notifications = [
    {
      id: 1,
      text: "ETR for Batch 42 requires final approval",
      time: "10m ago",
      unread: true,
    },
    {
      id: 2,
      text: "Capt. Henderson workload is high (above 85%)",
      time: "1h ago",
      unread: true,
    },
    {
      id: 3,
      text: "Simulator SIM-04 maintenance complete",
      time: "4h ago",
      unread: false,
    },
  ];

  const handleExport = () => {
    setToastMessage("REPORT GENERATED & EXPORTED SUCCESSFULLY.");
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  return (
    <div className="flex w-full min-h-screen bg-[#f7f9fc]">
      {/* SIDEBAR */}
      <aside className="w-[280px] bg-[#002147] text-white flex flex-col justify-between flex-shrink-0 border-r border-[#74777f]/10 h-screen sticky top-0 overflow-y-auto z-20">
        <div>
          {/* Logo Section */}
          <div className="flex flex-col justify-start items-start self-stretch px-6 pt-12 pb-20">
            <div className="flex flex-col justify-start items-start self-stretch gap-1 px-3">
              <div className="flex flex-col justify-start items-start self-stretch relative">
                <h2 className="self-stretch text-2xl font-semibold text-left text-[#ffe088] leading-tight m-0">
                  Aeronaut
                  <br />
                  Executive
                </h2>
              </div>
              <div className="flex flex-col justify-start items-start self-stretch relative opacity-70 mt-1">
                <p className="self-stretch text-xs font-semibold text-left text-[#2f486a] m-0">
                  Elite Aviation Systems
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col justify-start items-start self-stretch gap-2 px-3">
            <NavLink
              to="/training-manager"
              end
              className={({ isActive }) =>
                `flex justify-start items-center self-stretch gap-3 p-3 rounded transition-all text-decoration-none ${
                  isActive
                    ? "bg-[#001f3f]/50 border-l-4 border-[#ffe088] text-[#ffe088] font-bold"
                    : "text-[#2f486a] hover:text-white hover:bg-white/5"
                }`
              }
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 18 18"
                fill="none"
                className="flex-grow-0 flex-shrink-0"
              >
                <path
                  d="M10 6V0H18V6H10ZM0 10V0H8V10H0ZM10 18V8H18V18H10ZM0 18V12H8V18H0ZM2 8H6V2H2V8ZM12 16H16V10H12V16ZM12 4H16V2H12V4ZM2 16H6V14H2V16Z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-base text-left">Analytics Dashboard</span>
            </NavLink>

            <NavLink
              to="/training-manager/etr-approval"
              className={({ isActive }) =>
                `flex justify-start items-center self-stretch gap-3 p-3 rounded transition-all text-decoration-none ${
                  isActive
                    ? "bg-[#001f3f]/50 border-l-4 border-[#ffe088] text-[#ffe088] font-bold"
                    : "text-[#2f486a] hover:text-white hover:bg-white/5"
                }`
              }
            >
              <svg
                width={22}
                height={21}
                viewBox="0 0 22 21"
                fill="none"
                className="flex-grow-0 flex-shrink-0"
              >
                <path
                  d="M7.6 21L5.7 17.8L2.1 17L2.45 13.3L0 10.5L2.45 7.7L2.1 4L5.7 3.2L7.6 0L11 1.45L14.4 0L16.3 3.2L19.9 4L19.55 7.7L22 10.5L19.55 13.3L19.9 17L16.3 17.8L14.4 21L11 19.55L7.6 21ZM8.45 18.45L11 17.35L13.6 18.45L15 16.05L17.75 15.4L17.5 12.6L19.35 10.5L17.5 8.35L17.75 5.55L15 4.95L13.55 2.55L11 3.65L8.4 2.55L7 4.95L4.25 5.55L4.5 8.35L2.65 10.5L4.5 12.6L4.25 15.45L7 16.05L8.45 18.45ZM9.95 14.05L15.6 8.4L14.2 6.95L9.95 11.2L7.8 9.1L6.4 10.5L9.95 14.05Z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-base text-left">ETR Final Approval</span>
            </NavLink>

            <NavLink
              to="/training-manager/classes"
              className={({ isActive }) =>
                `flex justify-start items-center self-stretch gap-3 p-3 rounded transition-all text-decoration-none ${
                  isActive
                    ? "bg-[#001f3f]/50 border-l-4 border-[#ffe088] text-[#ffe088] font-bold"
                    : "text-[#2f486a] hover:text-white hover:bg-white/5"
                }`
              }
            >
              <svg
                width={22}
                height={18}
                viewBox="0 0 22 18"
                fill="none"
                className="flex-grow-0 flex-shrink-0"
              >
                <path
                  d="M11 18L4 14.2V8.2L0 6L11 0L22 6V14H20V7.1L18 8.2V14.2L11 18ZM11 9.7L17.85 6L11 2.3L4.15 6L11 9.7ZM11 15.725L16 13.025V9.25L11 12L6 9.25V13.025L11 15.725Z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-base text-left">Trạng thái lớp học</span>
            </NavLink>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="flex flex-col justify-start items-start self-stretch px-6 pt-12 pb-6 gap-4">
          <div
            onClick={() => {
              setToastMessage("CERTIFICATION UPGRADE WORKFLOW INITIALIZED.");
              setShowToast(true);
            }}
            className="flex justify-center items-center self-stretch gap-2 px-4 py-3 rounded bg-[#fed65b] cursor-pointer hover:bg-[#fed65b]/90 transition-all text-decoration-none"
          >
            <svg
              width={16}
              height={21}
              viewBox="0 0 16 21"
              fill="none"
              className="flex-grow-0 flex-shrink-0"
            >
              <path
                d="M5.675 11.7L6.55 8.85L4.25 7H7.1L8 4.2L8.9 7H11.75L9.425 8.85L10.3 11.7L8 9.925L5.675 11.7ZM2 21V13.275C1.36667 12.575 0.875 11.775 0.525 10.875C0.175 9.975 0 9.01667 0 8C0 5.76667 0.775 3.875 2.325 2.325C3.875 0.775 5.76667 0 8 0C10.2333 0 12.125 0.775 13.675 2.325C15.225 3.875 16 5.76667 16 8C16 9.01667 15.825 9.975 15.475 10.875C15.125 11.775 14.6333 12.575 14 13.275V21L8 19L2 21ZM8 14C9.66667 14 11.0833 13.4167 12.25 12.25C13.4167 11.0833 14 9.66667 14 8C14 6.33333 13.4167 4.91667 12.25 3.75C11.0833 2.58333 9.66667 2 8 2C6.33333 2 4.91667 2.58333 3.75 3.75C2.58333 4.91667 2 6.33333 2 8C2 9.66667 2.58333 11.0833 3.75 12.25C4.91667 13.4167 6.33333 14 8 14ZM4 18.025L8 17L12 18.025V14.925C11.4167 15.2583 10.7875 15.5208 10.1125 15.7125C9.4375 15.9042 8.73333 16 8 16C7.26667 16 6.5625 15.9042 5.8875 15.7125C5.2125 15.5208 4.58333 15.2583 4 14.925V18.025Z"
                fill="#745C00"
              />
            </svg>
            <p className="text-base font-bold text-center text-[#745c00] m-0">
              Upgrade Status
            </p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* TOPBAR */}
        <header className="h-20 border-b border-[#c4c6cf]/30 bg-[#f7f9fc]/80 backdrop-blur-[10px] flex justify-between items-center px-12 sticky top-0 z-10">
          {/* Left search */}
          <div className="flex items-center flex-grow max-w-[450px]">
            <div className="flex justify-center items-center w-full relative pl-10 pr-4 py-2.5 rounded-xl bg-[#f2f4f7]">
              <input
                type="text"
                className="w-full bg-transparent border-none text-sm text-gray-800 placeholder-gray-500 focus:outline-none"
                placeholder="Tìm kiếm lớp học, học viên..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
                  <path
                    d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z"
                    fill="#43474E"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Right items */}
          <div className="flex justify-start items-center gap-12 ml-6">
            <div className="flex flex-col justify-start items-start relative">
              <p className="text-lg font-bold text-left text-[#000613] m-0">
                AeroMetric ETR
              </p>
            </div>

            <div className="flex justify-start items-center gap-3">
              {/* Notification icon */}
              <div
                className="flex flex-col justify-center items-center relative p-2 cursor-pointer hover:bg-black/5 rounded-full"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <div className="flex justify-center items-start relative text-gray-700">
                  <svg width={16} height={20} viewBox="0 0 16 20" fill="none">
                    <path
                      d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div className="w-2 h-2 rounded-xl bg-[#ba1a1a] absolute top-2 right-2 border border-white" />

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div
                    className="tm-notif-dropdown"
                    style={{ top: "48px", right: "0" }}
                  >
                    <div className="tm-notif-header">
                      <span>Notifications</span>
                      <button onClick={() => setShowNotifications(false)}>
                        Close
                      </button>
                    </div>
                    <div className="tm-notif-list">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`tm-notif-item${notif.unread ? " unread" : ""}`}
                        >
                          <div className="tm-notif-top">
                            <p className="tm-notif-text">{notif.text}</p>
                            {notif.unread && <span className="tm-notif-dot" />}
                          </div>
                          <span className="tm-notif-time">{notif.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Help icon */}
              <div
                className="flex flex-col justify-center items-center relative p-2 cursor-pointer hover:bg-black/5 rounded-full"
                onClick={() => alert("Hệ thống trợ giúp AeroMetric ETR")}
              >
                <div className="flex justify-center items-start relative text-gray-700">
                  <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                    <path
                      d="M9.95 16C10.3 16 10.5958 15.8792 10.8375 15.6375C11.0792 15.3958 11.2 15.1 11.2 14.75C11.2 14.4 11.0792 14.1042 10.8375 13.8625C10.5958 13.6208 10.3 13.5 9.95 13.5C9.6 13.5 9.30417 13.6208 9.0625 13.8625C8.82083 14.1042 8.7 14.4 8.7 14.75C8.7 15.1 8.82083 15.3958 9.0625 15.6375C9.30417 15.8792 9.6 16 9.95 16ZM9.05 12.15H10.9C10.9 11.6 10.9625 11.1667 11.0875 10.85C11.2125 10.5333 11.5667 10.1 12.15 9.55C12.5833 9.11667 12.925 8.70417 13.175 8.3125C13.425 7.92083 13.55 7.45 13.55 6.9C13.55 5.96667 13.2083 5.25 12.525 4.75C11.8417 4.25 11.0333 4 10.1 4C9.15 4 8.37917 4.25 7.7875 4.75C7.19583 5.25 6.78333 5.85 6.55 6.55L8.2 7.2C8.28333 6.9 8.47083 6.575 8.7625 6.225C9.05417 5.875 9.5 5.7 10.1 5.7C10.6333 5.7 11.0333 5.84583 11.3 6.1375C11.5667 6.42917 11.7 6.75 11.7 7.1C11.7 7.43333 11.6 7.74583 11.4 8.0375C11.2 8.32917 10.95 8.6 10.65 8.85C9.91667 9.5 9.46667 9.99167 9.3 10.325C9.13333 10.6583 9.05 11.2667 9.05 12.15ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20ZM10 18C12.2333 18 14.125 17.225 15.675 15.675C17.225 14.125 18 12.2333 18 10C18 7.76667 17.225 5.875 15.675 4.325C14.125 2.775 12.2333 2 10 2C7.76667 2 5.875 2.775 4.325 4.325C2.775 5.875 2 7.76667 2 10C2 12.2333 2.775 14.125 4.325 15.675C5.875 17.225 7.76667 18 10 18Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
              </div>

              {/* Vertical line divider */}
              <div className="w-px h-8 bg-[#c4c6cf]/50 mx-2" />

              {/* Profile button */}
              <div className="flex justify-start items-center gap-2 cursor-pointer p-1 hover:bg-black/5 rounded">
                <div className="w-8 h-8 rounded-full border border-[#c4c6cf] bg-gray-300 flex items-center justify-center font-bold text-[#012248] text-xs">
                  CH
                </div>
                <div className="flex flex-col justify-start items-start">
                  <p className="text-sm font-bold text-left text-[#000613] m-0">
                    Profile
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>

      {/* DYNAMIC TOAST NOTIFICATION */}
      {showToast && (
        <div className="tm-toast">
          <svg width={20} height={20} viewBox="0 0 20 20" fill="none">
            <path
              d="M8.6 14.6L15.65 7.55L14.25 6.15L8.6 11.8L5.75 8.95L4.35 10.35L8.6 14.6ZM10 20C8.61667 20 7.31667 19.7375 6.1 19.2125C4.88333 18.6875 3.825 17.975 2.925 17.075C2.025 16.175 1.3125 15.1167 0.7875 13.9C0.2625 12.6833 0 11.3833 0 10C0 8.61667 0.2625 7.31667 0.7875 6.1C1.3125 4.88333 2.025 3.825 2.925 2.925C3.825 2.025 4.88333 1.3125 6.1 0.7875C7.31667 0.2625 8.61667 0 10 0C11.3833 0 12.6833 0.2625 13.9 0.7875C15.1167 1.3125 16.175 2.025 17.075 2.925C17.975 3.825 18.6875 4.88333 19.2125 6.1C19.7375 7.31667 20 8.61667 20 10C20 11.3833 19.7375 12.6833 19.2125 13.9C18.6875 15.1167 17.975 16.175 17.075 17.075C16.175 17.975 15.1167 18.6875 13.9 19.2125C12.6833 19.7375 11.3833 20 10 20Z"
              fill="#C5A022"
            />
          </svg>
          <p>{toastMessage}</p>
        </div>
      )}
    </div>
  );
};

export default TrainingManagerLayout;
