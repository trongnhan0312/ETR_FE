import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRealBackendStats } from '../../utils/api';

const RecordsPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    document.title = "Electronic Training Records (ETR) | ETR Aviation";
    let isMounted = true;
    fetchRealBackendStats().then(res => {
      if (isMounted) setStats(res);
    });
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> PART 145 & PART 147 AUDITABLE RECORDS
          </div>
          <h1 className="hero-title">
            Centralized <span className="highlight-text">Electronic Training Records.</span>
          </h1>
          <p className="hero-subtitle">
            Say goodbye to fragmented binder logs and spreadsheet errors. ETR provides a unified digital standard for tracking every technician's qualifications, practical evaluations, and compliance sign-offs.
          </p>
          <div className="hero-cta-group">
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/login')}>
              Sign In to View Your ETR
            </button>
            <button type="button" className="btn-sign-in" onClick={() => navigate('/contact')}>
              Request Demo
            </button>
          </div>
        </div>

        {/* DEMO ETR CARD */}
        <div className="hero-widget">
          <div className="widget-card">
            <div className="widget-header">
              <div className="widget-dots">
                <span className="w-dot red"></span>
                <span className="w-dot yellow"></span>
                <span className="w-dot green"></span>
              </div>
              <div className="widget-tag">SAMPLE ETR RECORD #ETR-2026-889</div>
            </div>

            <div className="etr-preview-card">
              <div className="etr-person-header">
                <div className="person-avatar">AV</div>
                <div className="person-info">
                  <h4>Alex Vance</h4>
                  <span className="person-role">Senior Avionics Technician — ID #AV-9041</span>
                </div>
                <span className="status-tag status-certified">COMPLIANT</span>
              </div>

              <div className="etr-detail-grid">
                <div className="detail-item">
                  <span className="lbl">OPERATOR / MRO</span>
                  <span className="val">Skyline Aero MRO</span>
                </div>
                <div className="detail-item">
                  <span className="lbl">AUTHORIZATION</span>
                  <span className="val">B1.1 & B2 Avionics</span>
                </div>
                <div className="detail-item">
                  <span className="lbl">RECURRENCE</span>
                  <span className="val text-cyan">Valid thru Sep 2027</span>
                </div>
                <div className="detail-item">
                  <span className="lbl">PROOF SEAL</span>
                  <span className="val font-mono">0x9F4A...82B1</span>
                </div>
              </div>

              <div className="etr-timeline-preview">
                <h5>Recent Signoff & Evidence Trail</h5>
                <div className="timeline-item">
                  <div className="tl-dot green"></div>
                  <div className="tl-content">
                    <span className="tl-title">EWIS Harness Inspection (Practical #884)</span>
                    <span className="tl-meta">Evaluated by Capt. J. Miller • Verified by QA Board</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="tl-dot cyan"></div>
                  <div className="tl-content">
                    <span className="tl-title">Part 145 Recurrent Safety Regulations</span>
                    <span className="tl-meta">Score: 98% • Exam Code #EX-441</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT SECTIONS */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">— ETR CORE CAPABILITIES</span>
          <h2 className="section-title">Built for absolute traceability and aviation integrity.</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon-box">📜</div>
            <h3>Electronic Training Records</h3>
            <p>Complete digitized logbooks for every technician, recording theory courses, practical demonstrations, and recurrences in one unified system.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">👨‍✈️</div>
            <h3>Centralized Learner Profiles</h3>
            <p>Track ratings, licenses, company approvals, and medical status alongside training progression with zero data duplication.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">⏳</div>
            <h3>Training History & Recurrence</h3>
            <p>Maintain full historical timelines. Automated alerts trigger well before recurrence expiration dates to prevent grounded authorization status.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📋</div>
            <h3>Attendance Tracking</h3>
            <p>Digital roll call logs with GPS and timestamp verification, ensuring class attendance criteria are verifiably fulfilled.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📊</div>
            <h3>Assessment Results</h3>
            <p>Store theory exam scores and practical checklist evaluations with complete question-level analytics and retake history.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📁</div>
            <h3>Training Evidence Storage</h3>
            <p>Attach photo, video, and signed document evidence directly to specific practical checklist tasks for quality review.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">✍️</div>
            <h3>Approval & Signoff Workflows</h3>
            <p>Multi-stage digital signatures between Instructors, Quality Assurance Officers, and Training Managers with role-based checks.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">🔒</div>
            <h3>Immutable Audit Trail</h3>
            <p>Every edit, status change, and approval action is permanently logged with user ID, IP address, and timestamp for auditor inspection.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bottom-cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to digitize your aviation training records?</h2>
          <p className="cta-desc">Experience how ETR streamlines compliance and audit readiness across your maintenance organization.</p>
          <div className="hero-cta-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              Schedule Technical Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RecordsPage;
