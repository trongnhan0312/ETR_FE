import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './qa.scss';

const navigationGroups = [
  {
    label: 'Dashboard',
    items: [
      { label: 'Dashboard', to: '/qa' },
      { label: 'Pending Evidence', to: '/qa/evidence' },
      { label: 'Pending ETR Reviews', to: '/qa/reviews' },
      { label: 'Recently Reviewed ETRs', to: '/qa/recent' },
    ],
  },
  {
    label: 'Evidence Management',
    items: [
      { label: 'Verify Evidence', to: '/qa/evidence' },
      { label: 'Rejected Evidence', to: '/qa/rejected' },
      { label: 'Evidence History', to: '/qa/history' },
    ],
  },
  {
    label: 'ETR Review',
    items: [
      { label: 'Submitted ETR Queue', to: '/qa/reviews' },
      { label: 'Review ETR', to: '/qa/details' },
      { label: 'Return for Correction', to: '/qa/return' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { label: 'Search ETR Records', to: '/qa/search' },
      { label: 'Export Training Package', to: '/qa/export' },
      { label: 'View Audit Trail', to: '/qa/audit' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'My Profile', to: '/qa/profile' },
      { label: 'Change Password', to: '/qa/password' },
    ],
  },
];

const QALayout = () => {
  const navigate = useNavigate();

  return (
    <div className="qa-page">
      <aside className="qa-sidebar">
        <div>
          <div className="qa-brand">
            <span className="brand-name">ETR Aviation Training</span>
            <span className="brand-sub">QA STAFF PORTAL</span>
          </div>

          <nav className="qa-nav">
            {navigationGroups.map((group) => (
              <div className="qa-nav-group" key={group.label}>
                <div className="qa-nav-label">{group.label}</div>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/qa'}
                    className={({ isActive }) => `qa-nav-item${isActive ? ' active' : ''}`}
                  >
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="qa-sidebar-footer">
          <div className="qa-profile">
            <div className="qa-avatar">Q</div>
            <div>
              <div className="qa-user-name">QA Staff</div>
              <div className="qa-user-role">QUALITY ASSURANCE</div>
            </div>
          </div>

          <button className="qa-btn-ghost qa-logout" type="button" onClick={() => navigate('/login')}>
            Logout
          </button>
        </div>
      </aside>

      <main className="qa-content">
        <Outlet />
      </main>
    </div>
  );
};

export default QALayout;
