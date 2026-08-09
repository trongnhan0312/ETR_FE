import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SecurityPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Platform Security & Data Governance | ETR Aviation";
  }, []);

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> ETR SECURITY & GOVERNANCE
          </div>
          <h1 className="hero-title">
            Enterprise security for <span className="highlight-text-cyan">critical aviation records.</span>
          </h1>
          <p className="hero-subtitle">
            ETR is architected around strict access controls, tamper-evident audit logs, and complete data isolation to protect technical training records across commercial airlines and MRO operators.
          </p>
        </div>

        {/* SECURITY MATRIX DEMO */}
        <div className="hero-widget">
          <div className="widget-card">
            <div className="widget-header">
              <div className="widget-dots">
                <span className="w-dot green"></span>
                <span className="w-dot green"></span>
                <span className="w-dot green"></span>
              </div>
              <div className="widget-tag">SECURITY CONTROLS MATRIX</div>
            </div>

            <div className="security-controls-list">
              <div className="sec-item">
                <span className="sec-icon">🔒</span>
                <div>
                  <strong>Role-Based Access Control (RBAC)</strong>
                  <p>Strict role checks for Admin, Academic, Instructor, QA, Training Manager, Student, Auditor</p>
                </div>
              </div>
              <div className="sec-item">
                <span className="sec-icon">📜</span>
                <div>
                  <strong>Tamper-Evident Audit Logging</strong>
                  <p>Permanent logging of user actions, timestamps, and IP addresses in CSDL audit tables</p>
                </div>
              </div>
              <div className="sec-item">
                <span className="sec-icon">🛡️</span>
                <div>
                  <strong>Read-Only Finalized ETR Records</strong>
                  <p>Completed training records are sealed and protected from unauthorized modification</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DETAILED SECURITY SECTIONS */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">— SECURITY ARCHITECTURE</span>
          <h2 className="section-title">How ETR safeguards training integrity.</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon-box">🔑</div>
            <h3>Authentication & Session Control</h3>
            <p>Secure Bearer Token authentication with automated expiration, token refresh protocols, and protected route navigation guards.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">👥</div>
            <h3>Role-Based Access Control (RBAC)</h3>
            <p>Granular route and API endpoint protection ensuring staff access is strictly restricted to authorized operational duties.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">🛡️</div>
            <h3>Data Protection & Isolation</h3>
            <p>Logical tenant isolation prevents unauthorized cross-organization visibility. Public endpoints never expose learner identity data.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📜</div>
            <h3>Tamper-Evident Audit Logging</h3>
            <p>System activities (record creation, checklist scoring, evidence verification, ETR approval, and logins) are recorded in permanent audit logs.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">🚫</div>
            <h3>Conflict of Interest Safeguards</h3>
            <p>Built-in business rules prevent instructors from approving QA reviews for evidence or evaluations they submitted themselves.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📁</div>
            <h3>Evidence Storage Integrity</h3>
            <p>Attached practical evaluation media (photos, documents) are stored in secure blob storage with access token validation and checksum verifications.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bottom-cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Have security or compliance questions?</h2>
          <p className="cta-desc">Our security architecture team can provide detailed documentation on data governance and system deployment options.</p>
          <div className="hero-cta-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              Contact Security Team
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SecurityPage;
