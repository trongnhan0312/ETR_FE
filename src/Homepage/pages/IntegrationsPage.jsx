import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const IntegrationsPage = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();

  useEffect(() => {
    document.title = `${tr('System Integrations')} | ETR Aviation`;
  }, []);

  const integrationsList = [
    {
      title: "Enterprise LMS Sync",
      category: "Learning Management",
      icon: "🎓",
      desc: "Bi-directional SCORM, xAPI, and REST API sync with Moodles, Cornerstone, and custom LMS platforms for roster and course completion import."
    },
    {
      title: "MRO & Fleet Software",
      category: "Operations & HRIS",
      icon: "✈️",
      desc: "Connect directly with AMOS, SAP Aviation, and Maintenix to sync technician ratings, authorizations, and maintenance duty capabilities."
    },
    {
      title: "Assessment & Exam Systems",
      category: "Testing Platforms",
      icon: "📝",
      desc: "Automated ingestion of computer-based theoretical test results, question bank scores, and candidate authorization codes."
    },
    {
      title: "Cloud Document Repositories",
      category: "Document Vaults",
      icon: "☁️",
      desc: "Secure export and backup of signed PDF ETR packages to Azure Blob Storage, AWS S3, SharePoint Enterprise, or local server SANs."
    },
    {
      title: "SSO & Identity Providers",
      category: "Authentication",
      icon: "🔑",
      desc: "OAuth 2.0, SAML 2.0, Azure Active Directory / Entra ID, and Okta integration for single sign-on across maintenance bases."
    },
    {
      title: "RESTful Webhooks & API Gateway",
      category: "Developer Platform",
      icon: "⚡",
      desc: "Subscribe to real-time webhook events for ETR completion, evidence submission, authorization renewal, and QA rejection."
    }
  ];

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> {tr('OPEN API & ECOSYSTEM CONNECTIVITY')}
          </div>
          <h1 className="hero-title">
            {tr('Seamlessly integrated with')} <span className="highlight-text-cyan">{tr('your aviation stack.')}</span>
          </h1>
          <p className="hero-subtitle">
            {tr('ETR doesn\'t replace your existing systems — it connects them. Bridge your LMS, HRIS, MRO maintenance software, and cloud storage into a unified training record network.')}
          </p>
          <div className="hero-cta-group">
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/docs')}>
              {tr('View API Documentation')}
            </button>
          </div>
        </div>

        {/* ECOSYSTEM VISUAL WIDGET */}
        <div className="hero-widget">
          <div className="widget-card">
            <div className="widget-header">
              <div className="widget-dots">
                <span className="w-dot red"></span>
                <span className="w-dot yellow"></span>
                <span className="w-dot green"></span>
              </div>
              <div className="widget-tag">{tr('ETR API & INTEGRATION ARCHITECTURE')}</div>
            </div>

            <div className="ecosystem-diagram">
              <div className="node-center font-bold">
                <span className="logo-main">ETR CORE</span>
                <span className="text-cyan font-mono" style={{ fontSize: '0.75rem' }}>REST API</span>
              </div>
              <div className="node-sat n-top">{tr('Enterprise LMS')}</div>
              <div className="node-sat n-right">MRO / AMOS</div>
              <div className="node-sat n-bottom">{tr('Cloud S3 Vault')}</div>
              <div className="node-sat n-left">Azure AD SSO</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS & INTEGRATION CARDS */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">{tr('— INTEGRATION CONNECTORS')}</span>
          <h2 className="section-title">{tr('Pre-built integrations and customizable webhooks.')}</h2>
        </div>

        <div className="features-grid">
          {integrationsList.map((item, idx) => (
            <div key={idx} className="feature-card">
              <div className="card-icon-box">{item.icon}</div>
              <span className="badge-tag-category">{tr(item.category)}</span>
              <h3 style={{ marginTop: '8px' }}>{tr(item.title)}</h3>
              <p>{tr(item.desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bottom-cta-section">
        <div className="cta-container">
          <h2 className="cta-title">{tr('Need a custom enterprise integration?')}</h2>
          <p className="cta-desc">{tr('Our technical solutions team assists with custom REST API connectors, data migrations, and webhook routing.')}</p>
          <div className="hero-cta-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              {tr('Contact Integration Engineers')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default IntegrationsPage;
