import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import '../Academic/academic.scss';
import './qa.scss';

const iconDocument = (
  <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.95 16L12.6 10.35L11.15 8.9L6.925 13.125L4.825 11.025L3.4 12.45L6.95 16ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H10L16 6V18C16 18.55 15.8042 19.0208 15.4125 19.4125C15.0208 19.8042 14.55 20 14 20H2ZM9 7V2H2V18H14V7H9ZM2 2V7V2V7V18V2Z" />
  </svg>
);

const navigationGroups = [
  {
    label: 'Dashboard',
    items: [
      { label: 'DASHBOARD', to: '/qa' },
      { label: 'PENDING EVIDENCE', to: '/qa/evidence' },
      { label: 'PENDING ETR REVIEWS', to: '/qa/reviews' },
      { label: 'RECENTLY REVIEWED', to: '/qa/recent' },
    ],
  },
  {
    label: 'Evidence Management',
    items: [
      { label: 'VERIFY EVIDENCE', to: '/qa/evidence' },
      { label: 'REJECTED EVIDENCE', to: '/qa/rejected' },
      { label: 'EVIDENCE HISTORY', to: '/qa/history' },
    ],
  },
  {
    label: 'ETR Review',
    items: [
      { label: 'SUBMITTED ETR QUEUE', to: '/qa/reviews' },
      { label: 'REVIEW ETR', to: '/qa/details' },
      { label: 'RETURN FOR CORRECTION', to: '/qa/return' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { label: 'SEARCH ETR RECORDS', to: '/qa/search' },
      { label: 'EXPORT TRAINING PKG', to: '/qa/export' },
      { label: 'VIEW AUDIT TRAIL', to: '/qa/audit' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'MY PROFILE', to: '/qa/profile' },
      { label: 'CHANGE PASSWORD', to: '/qa/password' },
    ],
  },
];

const QALayout = () => {
  const navigate = useNavigate();

  return (
    <div className="academic-page">
      {/* Sidebar */}
      <aside className="academic-sidebar qa-sidebar-extended">
        <div>
          <div className="sidebar-brand">
            <div className="logo-box">
              <svg width="21" height="19" viewBox="0 0 21 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 18.15V16.15H20V18.15H2ZM3.75 13.15L0 6.9L2.4 6.25L5.2 8.6L8.7 7.675L3.525 0.775L6.425 0L13.9 6.275L18.15 5.125C18.6833 4.975 19.1875 5.0375 19.6625 5.3125C20.1375 5.5875 20.45 5.99167 20.6 6.525C20.75 7.05833 20.6875 7.5625 20.4125 8.0375C20.1375 8.5125 19.7333 8.825 19.2 8.975L3.75 13.15Z" />
              </svg>
            </div>
            <div className="brand-text">
              <div className="brand-title">ETR</div>
              <div className="brand-subtitle">QA Portal</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navigationGroups.map((group) => (
              <div key={group.label} className="qa-nav-group">
                <div className="qa-nav-label">
                  {group.label}
                </div>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.to === '/qa'}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    {iconDocument}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar-container">
              <div className="avatar-fallback">Q</div>
            </div>
            <div className="user-info">
              <div className="user-name">QA Staff</div>
              <div className="user-role">Quality Assurance</div>
            </div>
          </div>
          <button
            className="ghost-btn sidebar-logout"
            type="button"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              navigate('/login');
            }}
            style={{ marginTop: '16px', width: '100%' }}
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
            <div className="search-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.6 18L10.3 11.7C9.8 12.1 9.225 12.4167 8.575 12.65C7.925 12.8833 7.23333 13 6.5 13C4.68333 13 3.14583 12.3708 1.8875 11.1125C0.629167 9.85417 0 8.31667 0 6.5C0 4.68333 0.629167 3.14583 1.8875 1.8875C3.14583 0.629167 4.68333 0 6.5 0C8.31667 0 9.85417 0.629167 11.1125 1.8875C12.3708 3.14583 13 4.68333 13 6.5C13 7.23333 12.8833 7.925 12.65 8.575C12.4167 9.225 12.1 9.8 11.7 10.3L18 16.6L16.6 18ZM6.5 11C7.75 11 8.8125 10.5625 9.6875 9.6875C10.5625 8.8125 11 7.75 11 6.5C11 5.25 10.5625 4.1875 9.6875 3.3125C8.8125 2.4375 7.75 2 6.5 2C5.25 2 4.1875 2.4375 3.3125 3.3125C2.4375 4.1875 2 5.25 2 6.5C2 7.75 2.4375 8.8125 3.3125 9.6875C4.1875 10.5625 5.25 11 6.5 11Z" fill="currentColor" />
              </svg>
            </div>
            <input type="text" className="search-input" placeholder="Tìm kiếm ETR, bằng chứng..." />
          </div>

          <div className="topbar-right">
            <button className="notification-btn" type="button" aria-label="Notifications">
              <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 17V15H2V8C2 6.61667 2.41667 5.3875 3.25 4.3125C4.08333 3.2375 5.16667 2.53333 6.5 2.2V1.5C6.5 1.08333 6.64583 0.729167 6.9375 0.4375C7.22917 0.145833 7.58333 0 8 0C8.41667 0 8.77083 0.145833 9.0625 0.4375C9.35417 0.729167 9.5 1.08333 9.5 1.5V2.2C10.8333 2.53333 11.9167 3.2375 12.75 4.3125C13.5833 5.3875 14 6.61667 14 8V15H16V17H0ZM8 20C7.45 20 6.97917 19.8042 6.5875 19.4125C6.19583 19.0208 6 18.55 6 18H10C10 18.55 9.80417 19.0208 9.4125 19.4125C9.02083 19.8042 8.55 20 8 20ZM4 15H12V8C12 6.9 11.6083 5.95833 10.825 5.175C10.0417 4.39167 9.1 4 8 4C6.9 4 5.95833 4.39167 5.175 5.175C4.39167 5.95833 4 6.9 4 8V15Z" fill="currentColor" />
              </svg>
              <span className="dot"></span>
            </button>

            <div className="divider"></div>

            <button className="lang-switcher" type="button">
              <span>VIETNAMESE (VN)</span>
              <svg width="7" height="5" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 4.31667L0 0.816667L0.816667 0L3.5 2.68333L6.18333 0L7 0.816667L3.5 4.31667Z" fill="currentColor" />
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

export default QALayout;
