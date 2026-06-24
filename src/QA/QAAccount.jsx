const QAAccount = () => (
  <div className="qa-shell">
    <section className="qa-page-card">
      <p className="qa-eyebrow">Account</p>
      <h1>My Profile</h1>
      <p className="qa-page-description">
        Manage your own account, update your profile information, and change your password here.
      </p>
    </section>

    <section className="qa-grid-2">
      <div className="qa-panel">
        <h2>Profile</h2>
        <div className="qa-kv-grid">
          <div className="qa-kv"><strong>Name</strong><span>QA Staff</span></div>
          <div className="qa-kv"><strong>Role</strong><span>Quality Assurance Officer</span></div>
          <div className="qa-kv"><strong>Email</strong><span>qa.staff@etr-aviation.local</span></div>
          <div className="qa-kv"><strong>Status</strong><span>Active</span></div>
        </div>
      </div>

      <div className="qa-panel">
        <h2>Change Password</h2>
        <div className="qa-list">
          <input className="qa-input" type="password" placeholder="Current password" />
          <input className="qa-input" type="password" placeholder="New password" />
          <input className="qa-input" type="password" placeholder="Confirm new password" />
          <button className="qa-btn" type="button">Update Password</button>
        </div>
      </div>
    </section>
  </div>
);

export default QAAccount;
