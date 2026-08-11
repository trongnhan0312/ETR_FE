import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const settings = [
  'File upload limits',
  'Password policy',
  'Session timeout',
];

const SystemConfiguration = () => {
  const { tr } = useLanguage();

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{tr('Administrator page 5 of 5')}</p>
          <h1>{tr('System Configuration')}</h1>
          <p className="page-description">
            {tr('Optional configuration page for system-level controls that support the admin portal later.')}
          </p>
        </div>

        <button className="primary-btn" type="button">
          {tr('Save Settings')}
        </button>
      </section>

      <section className="split-panel">
        {settings.map((setting) => (
          <article key={setting} className="info-card">
            <p className="section-label">{tr('Configuration')}</p>
            <h2>{tr(setting)}</h2>
            <p className="hero-copy">
              {tr('Placeholder control for future backend integration. This page will be updated when the system config endpoints are ready.')}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default SystemConfiguration;