import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const PublicFooter = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();

  return (
    <footer className="landing-footer">
      <div className="footer-top">
        <div className="footer-brand-col">
          <div className="nav-brand" onClick={() => navigate('/')}>
            <div className="brand-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#FF7A36" stroke="#FF7A36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="brand-logo-text">
              <span className="logo-main">ETR</span>
              <span className="logo-sub">AVIATION</span>
            </div>
          </div>
          <p className="footer-tagline">
            {tr('The enterprise Electronic Training Record platform for aviation. Certification, competency, and compliance — audit-ready by default.')}
          </p>
        </div>

        <div className="footer-links-grid">
          <div className="link-col">
            <h4>{tr('PLATFORM')}</h4>
            <Link to="/records">{tr('Records')}</Link>
            <Link to="/competency">{tr('Competency')}</Link>
            <Link to="/compliance">{tr('Compliance')}</Link>
            <Link to="/analytics">{tr('Analytics')}</Link>
            <Link to="/integrations">{tr('Integrations')}</Link>
          </div>

          <div className="link-col">
            <h4>{tr('COMPANY')}</h4>
            <Link to="/about">{tr('About')}</Link>
            <Link to="/customers">{tr('Customers')}</Link>
            <Link to="/careers">{tr('Careers')}</Link>
            <Link to="/newsroom">{tr('Newsroom')}</Link>
          </div>

          <div className="link-col">
            <h4>{tr('RESOURCES')}</h4>
            <Link to="/docs">{tr('Docs')}</Link>
            <Link to="/security">{tr('Security')}</Link>
            <Link to="/regulatory-library">{tr('Regulatory Library')}</Link>
            <Link to="/contact">{tr('Contact')}</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="copyright">&copy; {new Date().getFullYear()} ETR Aviation, Inc. {tr('All rights reserved.')}</span>
        <div className="legal-links">
          <Link to="/security">{tr('Privacy')}</Link>
          <Link to="/docs">{tr('Terms')}</Link>
          <Link to="/security">{tr('Security')}</Link>
          <Link to="/contact">{tr('Status')}</Link>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
