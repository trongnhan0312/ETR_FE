import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CompliancePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Aviation Training Compliance & Audit Readiness | ETR Aviation";
  }, []);

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> REGULATORY & QUALITY ASSURANCE
          </div>
          <h1 className="hero-title">
            Compliance by design for <span className="highlight-text-orange">FAA & EASA audits.</span>
          </h1>
          <p className="hero-subtitle">
            ETR transforms regulatory compliance from a stressful pre-audit panic into a continuous, automated state of audit readiness. Every record is verified, sealed, and traceable.
          </p>
          <div className="hero-cta-group">
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              Discuss Regulatory Aligned Solutions
            </button>
          </div>
        </div>

        {/* COMPLIANCE SEAL DEMO */}
        <div className="hero-widget">
          <div className="widget-card">
            <div className="widget-header">
              <div className="widget-dots">
                <span className="w-dot green"></span>
                <span className="w-dot green"></span>
                <span className="w-dot green"></span>
              </div>
              <div className="widget-tag">AUDIT LEDGER SEAL #CAAV-145-SEAL</div>
            </div>

            <div className="compliance-preview-box">
              <div className="audit-status-strip">
                <div className="status-icon">🛡️</div>
                <div className="status-text">
                  <h4>PART 145 / 147 AUDIT STATUS: 100% PASS</h4>
                  <p>Read-only evidence ledger cryptographically sealed</p>
                </div>
              </div>

              <div className="seal-details">
                <div className="s-row">
                  <span>CHAIN-OF-CUSTODY:</span>
                  <span className="font-mono text-cyan">VERIFIED (12/12 CHECKS)</span>
                </div>
                <div className="s-row">
                  <span>QA EVIDENCE STATUS:</span>
                  <span className="text-white font-bold">ALL PHOTOS & SCORES APPROVED</span>
                </div>
                <div className="s-row">
                  <span>RECORD RETENTION:</span>
                  <span className="text-white">PERPETUAL SECURE VAULT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">— COMPLIANCE ARCHITECTURE</span>
          <h2 className="section-title">Built to satisfy the stringent requirements of aviation authorities.</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon-box">🔍</div>
            <h3>Compliance Monitoring</h3>
            <p>Automated rules verify course structures, instructor qualifications, and practical assessment criteria before records can be submitted.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">✅</div>
            <h3>Evidence Verification</h3>
            <p>Quality Assurance (QA) officers review attached photos, test results, and attendance records with built-in conflict-of-interest prevention.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">🛡️</div>
            <h3>ETR Validation</h3>
            <p>Once validated, ETR records enter a read-only locked state. Any attempt to modify a finalized record requires formal administrative unlock logs.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">✍️</div>
            <h3>Multi-Tier Approval Workflow</h3>
            <p>Structured approval path across Instructor &rarr; QA Officer &rarr; Training Manager with mandatory rejection comments and retake tracking.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📜</div>
            <h3>Immutable Audit Trail</h3>
            <p>Complete historical logs capture who performed every action, when, from which IP, and what data changed.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">🔗</div>
            <h3>Training Record Traceability</h3>
            <p>Instantly trace an authorization back to the specific practical evaluation session, instructor signature, and underlying curriculum version.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bottom-cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Turn audits into a 2-minute export process.</h2>
          <p className="cta-desc">Learn how ETR's dedicated Auditor Portal provides read-only inspection access without exposing sensitive administrative data.</p>
          <div className="hero-cta-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              Request Auditor Portal Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CompliancePage;
