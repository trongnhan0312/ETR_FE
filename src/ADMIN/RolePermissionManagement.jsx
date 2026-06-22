import React from 'react';

const roles = [
  'Administrator',
  'Academic Staff',
  'Instructor',
  'QA Staff',
  'Training Manager',
  'Management Viewer',
];

const permissions = [
  'Create role',
  'Assign permissions',
  'Modify permissions',
  'View access matrix',
];

const RolePermissionManagement = () => {
  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">Administrator page 3 of 5</p>
          <h1>Role & Permission Management</h1>
          <p className="page-description">
            Define access boundaries and keep business responsibilities separated from administrative oversight.
          </p>
        </div>

        <button className="primary-btn" type="button">
          Create Role
        </button>
      </section>

      <section className="split-panel">
        <div className="info-card">
          <p className="section-label">Functions</p>
          <div className="pill-row">
            {permissions.map((permission) => (
              <span key={permission} className="tag-chip">
                {permission}
              </span>
            ))}
          </div>
        </div>

        <div className="info-card">
          <p className="section-label">Roles</p>
          <div className="pill-row">
            {roles.map((role) => (
              <span key={role} className="restricted-chip">
                {role}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="table-section">
        <div className="section-header">
          <div>
            <p className="section-label">Access matrix</p>
            <h2>Permission preview</h2>
          </div>
        </div>

        <div className="data-table">
          <div className="table-header table-layout role-layout">
            <div>Role</div>
            <div>Can create</div>
            <div>Can edit</div>
            <div>Can assign</div>
            <div>Can configure</div>
          </div>

          <div className="table-row table-layout role-layout">
            <div className="font-medium">Administrator</div>
            <div>Yes</div>
            <div>Yes</div>
            <div>Yes</div>
            <div>Yes</div>
          </div>

          <div className="table-row table-layout role-layout">
            <div className="font-medium">Academic Staff</div>
            <div>No</div>
            <div>No</div>
            <div>No</div>
            <div>No</div>
          </div>

          <div className="table-row table-layout role-layout">
            <div className="font-medium">QA Staff</div>
            <div>No</div>
            <div>No</div>
            <div>No</div>
            <div>No</div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RolePermissionManagement;