import React from 'react';

const settings = [
  'File upload limits',
  'Password policy',
  'Session timeout',
];

const SystemConfiguration = () => {
  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">Administrator page 5 of 5</p>
          <h1>System Configuration</h1>
          <p className="page-description">
            Optional configuration page for system-level controls that support the admin portal later.
          </p>
        </div>

        <button className="primary-btn" type="button">
          Save Settings
        </button>
      </section>

      <section className="split-panel">
        {settings.map((setting) => (
          <article key={setting} className="info-card">
            <p className="section-label">Configuration</p>
            <h2>{setting}</h2>
            <p className="hero-copy">
              Placeholder control for future backend integration. This page will be updated when the system config endpoints are ready.
            </p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default SystemConfiguration;