import React from 'react';

const users = [
  {
    username: 'admin01',
    fullName: 'Nguyen Van A',
    email: 'vana.nguyen@example.com',
    role: 'Administrator',
    status: 'Active',
  },
  {
    username: 'staff02',
    fullName: 'Tran Thi B',
    email: 'tha.b@example.com',
    role: 'Academic Staff',
    status: 'Locked',
  },
  {
    username: 'qa03',
    fullName: 'Le Hoang C',
    email: 'hoang.c@example.com',
    role: 'QA Staff',
    status: 'Active',
  },
];

const UserManagement = () => {
  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">Administrator page 2 of 5</p>
          <h1>User Management</h1>
          <p className="page-description">
            Create users, edit profiles, disable accounts, reset passwords, and search by username or email.
          </p>
        </div>

        <button className="primary-btn" type="button">
          Create User
        </button>
      </section>

      <section className="split-panel">
        <div className="info-card">
          <p className="section-label">Functions</p>
          <div className="pill-row">
            <span className="tag-chip">Create User</span>
            <span className="tag-chip">Edit User</span>
            <span className="tag-chip">Disable User</span>
            <span className="tag-chip">Reset Password</span>
            <span className="tag-chip">Search User</span>
          </div>
        </div>

        <div className="info-card">
          <p className="section-label">Fields</p>
          <div className="field-grid">
            <div className="field-box">Username</div>
            <div className="field-box">Full Name</div>
            <div className="field-box">Email</div>
            <div className="field-box">Role</div>
            <div className="field-box">Status</div>
          </div>
        </div>
      </section>

      <section className="table-section">
        <div className="section-header">
          <div>
            <p className="section-label">Account list</p>
            <h2>Searchable pseudo user table</h2>
          </div>
          <button className="ghost-btn" type="button">
            Search User
          </button>
        </div>

        <div className="data-table user-table">
          <div className="table-header table-layout user-layout">
            <div>Username</div>
            <div>Full Name</div>
            <div>Email</div>
            <div>Role</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          {users.map((user) => (
            <div key={user.username} className="table-row table-layout user-layout">
              <div className="font-medium">{user.username}</div>
              <div className="text-gray">{user.fullName}</div>
              <div className="text-gray">{user.email}</div>
              <div className="text-gray">{user.role}</div>
              <div>
                <span className={user.status === 'Active' ? 'status status-active' : 'status status-pending'}>
                  {user.status}
                </span>
              </div>
              <div><button className="action-btn" type="button">Edit</button></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default UserManagement;