import React from 'react';
import { useNavigate } from 'react-router-dom';
import './homepage.scss';

const moduleCards = [
  {
    title: 'User & Role Management',
    description:
      'Create accounts, update profiles, lock or unlock users, and assign permissions by role.',
    items: ['Create user', 'Update user', 'Assign role', 'Lock / unlock'],
  },
  {
    title: 'Learner & Enrollment Control',
    description:
      'Maintain learner profiles, track class enrollment, and keep records aligned with training activity.',
    items: ['Learner profile', 'Search learner', 'Enrollment', 'Training history'],
  },
  {
    title: 'ETR Workflow Oversight',
    description:
      'Monitor ETR creation, submission, verification, and approvals across training teams.',
    items: ['Submit', 'Review', 'Verify', 'Approve / reject'],
  },
  {
    title: 'Attendance & Assessment',
    description:
      'Track attendance sessions, assessment results, and evidence linked to each training record.',
    items: ['Attendance', 'Assessment', 'Evidence upload', 'Pass / fail'],
  },
  {
    title: 'Reporting & Audit',
    description:
      'Export reports, review dashboard status, and inspect activity logs for audit readiness.',
    items: ['PDF / Excel', 'Audit trail', 'Dashboard', 'Export package'],
  },
  {
    title: 'Course & Class Admin',
    description:
      'Manage courses, classes, instructor assignment, and the status of training sessions.',
    items: ['Create course', 'Create class', 'Assign instructor', 'Track status'],
  },
];

const quickUseCases = [
  'Create and manage staff accounts',
  'Assign roles for Administrator, QA Staff, Training Manager, and Instructor',
  'Track learner onboarding and enrollment status',
  'Review ETR records pending verification or approval',
];

const dashboardMetrics = [
  { label: 'Active users', value: '48' },
  { label: 'Roles configured', value: '8' },
  { label: 'ETR awaiting review', value: '16' },
  { label: 'Audit logs today', value: '124' },
];

const Homepage = () => {
  const navigate = useNavigate();

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="logo-section sidebar-brand">
          <div className="logo-text">
            <span className="brand-name">ETR Aviation Training</span>
            <span className="brand-sub">ADMIN PORTAL</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active" type="button">
            User Management
          </button>
          <button className="nav-item" type="button">
            Learner Profiles
          </button>
          <button className="nav-item" type="button">
            Courses & Classes
          </button>
          <button className="nav-item" type="button">
            ETR Workflow
          </button>
          <button className="nav-item" type="button">
            Attendance & Assessment
          </button>
          <button className="nav-item" type="button">
            Reporting & Audit
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">A</div>
            <div className="user-info">
              <div className="user-name">Administrator</div>
              <div className="user-role">FULL ACCESS</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">ETR aviation training administration</p>
            <h1>Admin Dashboard</h1>
            <p className="page-description">
              Manage users, permissions, learner records, and ETR operations across the full training lifecycle.
            </p>
          </div>

          <div className="topbar-actions">
            <button className="ghost-btn" type="button" onClick={() => navigate('/login')}>
              Logout
            </button>
            <button className="primary-btn" type="button">
              Create User
            </button>
          </div>
        </header>

        <section className="metrics-grid">
          {dashboardMetrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <span className="metric-label">{metric.label}</span>
              <strong className="metric-value">{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="hero-panel">
          <div>
            <p className="section-label">Functional focus</p>
            <h2>User management is the primary admin responsibility.</h2>
            <p className="hero-copy">
              The system supports creating accounts, updating information, locking and unlocking users,
              assigning roles, and controlling access across all ETR workflows.
            </p>
          </div>

          <ul className="usecase-list">
            {quickUseCases.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="module-grid">
          {moduleCards.map((card) => (
            <article key={card.title} className="module-card">
              <p className="section-label">Module</p>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <div className="tag-row">
                {card.items.map((item) => (
                  <span key={item} className="tag-chip">
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="table-section">
          <div className="section-header">
            <div>
              <p className="section-label">Admin actions</p>
              <h2>Users and access control</h2>
            </div>
            <button className="primary-btn" type="button">
              Add New Account
            </button>
          </div>

          <div className="data-table">
            <div className="table-header table-layout">
              <div>Name</div>
              <div>Role</div>
              <div>Email</div>
              <div>Status</div>
              <div>Last Updated</div>
              <div>Action</div>
            </div>

            <div className="table-row table-layout">
              <div className="font-medium">Nguyen Van A</div>
              <div className="text-gray">Academic Staff</div>
              <div className="text-gray">vana.nguyen@example.com</div>
              <div><span className="status status-active">Active</span></div>
              <div className="text-gray">Today</div>
              <div><button className="action-btn" type="button">Edit</button></div>
            </div>

            <div className="table-row table-layout">
              <div className="font-medium">Tran Thi B</div>
              <div className="text-gray">QA Staff</div>
              <div className="text-gray">tha.b@example.com</div>
              <div><span className="status status-pending">Locked</span></div>
              <div className="text-gray">2 days ago</div>
              <div><button className="action-btn" type="button">Unlock</button></div>
            </div>

            <div className="table-row table-layout">
              <div className="font-medium">Le Hoang C</div>
              <div className="text-gray">Training Manager</div>
              <div className="text-gray">hoang.c@example.com</div>
              <div><span className="status status-active">Active</span></div>
              <div className="text-gray">Yesterday</div>
              <div><button className="action-btn" type="button">Edit</button></div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Homepage;
