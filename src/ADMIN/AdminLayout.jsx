import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import './admin.scss';

const navigationItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'User Management', to: '/admin/users' },
  { label: 'Role & Permission', to: '/admin/roles' },
  { label: 'Audit Log', to: '/admin/audit' },
  { label: 'System Configuration', to: '/admin/config' },
];

const AdminLayout = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="logo-text">
              <span className="brand-name">ETR Aviation Training</span>
              <span className="brand-sub">ADMIN PORTAL</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">A</div>
            <div className="user-info">
              <div className="user-name">Administrator</div>
              <div className="user-role">FULL ACCESS</div>
            </div>
          </div>

          <button className="ghost-btn sidebar-logout" type="button" onClick={() => navigate('/login')}>
            Logout
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;