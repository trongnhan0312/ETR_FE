import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const PublicFooter = () => {
  const navigate = useNavigate();

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
            The enterprise Electronic Training Record platform for aviation. Certification, competency, and compliance — audit-ready by default.
          </p>
        </div>

        <div className="footer-links-grid">
          <div className="link-col">
            <h4>PLATFORM</h4>
            <Link to="/records">Records</Link>
            <Link to="/competency">Competency</Link>
            <Link to="/compliance">Compliance</Link>
            <Link to="/analytics">Analytics</Link>
            <Link to="/integrations">Integrations</Link>
          </div>

          <div className="link-col">
            <h4>COMPANY</h4>
            <Link to="/about">About</Link>
            <Link to="/customers">Customers</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/newsroom">Newsroom</Link>
          </div>

          <div className="link-col">
            <h4>RESOURCES</h4>
            <Link to="/docs">Docs</Link>
            <Link to="/security">Security</Link>
            <Link to="/regulatory-library">Regulatory Library</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span className="copyright">&copy; {new Date().getFullYear()} ETR Aviation, Inc. All rights reserved.</span>
        <div className="legal-links">
          <Link to="/security">Privacy</Link>
          <Link to="/docs">Terms</Link>
          <Link to="/security">Security</Link>
          <Link to="/contact">Status</Link>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
