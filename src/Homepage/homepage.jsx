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

const Homepage = () => {
  const navigate = useNavigate();
  const [dashboardMetrics, setDashboardMetrics] = useState([
    { label: 'Active users', value: '...' },
    { label: 'Roles configured', value: '...' },
    { label: 'ETR awaiting review', value: '...' },
    { label: 'Audit logs today', value: '...' },
  ]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [accounts, etrs, audit] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'https://localhost:7169/api'}/Accounts`).catch(() => null),
          fetch(`${import.meta.env.VITE_API_URL || 'https://localhost:7169/api'}/Etr`).catch(() => null),
          fetch(`${import.meta.env.VITE_API_URL || 'https://localhost:7169/api'}/Audit`).catch(() => null),
        ]);
        const accs = accounts?.ok ? await accounts.json() : [];
        const etrsData = etrs?.ok ? await etrs.json() : [];
        const auditData = audit?.ok ? await audit.json() : [];
        const pendingEtrs = (Array.isArray(etrsData) ? etrsData : []).filter((e) => e.status === 'Submitted' || e.status === 'Draft').length;
        const todayLogs = (Array.isArray(auditData) ? auditData : []).filter((a) => {
          if (!a.recordedAt) return false;
          return new Date(a.recordedAt).toDateString() === new Date().toDateString();
        }).length;
        setDashboardMetrics([
          { label: 'Active users', value: String(Array.isArray(accs) ? accs.length : 0) },
          { label: 'Roles configured', value: '6' },
          { label: 'ETR awaiting review', value: String(pendingEtrs) },
          { label: 'Audit logs today', value: String(todayLogs) },
        ]);
      } catch (err) {
        console.error('Error loading dashboard:', err);
      }
    };
    loadDashboard();
  }, []);

  // Keep existing mock user table data
  const [userRows] = useState([
    { name: 'Nguyen Van A', role: 'Academic Staff', email: 'vana.nguyen@example.com', status: 'Active', updated: 'Today' },
    { name: 'Tran Thi B', role: 'QA Staff', email: 'tha.b@example.com', status: 'Locked', updated: '2 days ago' },
    { name: 'Le Hoang C', role: 'Training Manager', email: 'hoang.c@example.com', status: 'Active', updated: 'Yesterday' },
  ]);

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
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate('/login');
              }}
            >
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

            {userRows.map((row, idx) => (
              <div key={idx} className="table-row table-layout">
                <div className="font-medium">{row.name}</div>
                <div className="text-gray">{row.role}</div>
                <div className="text-gray">{row.email}</div>
                <div><span className={`status ${row.status === 'Active' ? 'status-active' : 'status-pending'}`}>{row.status}</span></div>
                <div className="text-gray">{row.updated}</div>
                <div><button className="action-btn" type="button">Edit</button></div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Homepage;
