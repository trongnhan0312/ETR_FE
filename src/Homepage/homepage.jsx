import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import PublicFooter from './PublicFooter';
import './homepage.scss';

const Homepage = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleScrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="etr-landing-container">
      {/* ================= TOP NAVBAR ================= */}
      <header className="landing-navbar">
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

        <nav className="nav-links">
          <button type="button" onClick={() => handleScrollToSection('platform')}>{tr('Platform')}</button>
          <button type="button" onClick={() => handleScrollToSection('solutions')}>{tr('Solutions')}</button>
          <button type="button" onClick={() => handleScrollToSection('compliance')}>{tr('Compliance')}</button>
          <button type="button" onClick={() => handleScrollToSection('workflow')}>{tr('Workflow')}</button>
        </nav>

        <div className="nav-actions">
          <LanguageSwitcher dark />
          <button type="button" className="btn-sign-in" onClick={handleGoToLogin}>
            {tr('Sign in')}
          </button>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> {tr('TRUSTED BY PART 145 & PART 147 OPERATORS')}
          </div>

          <h1 className="hero-title">
            {tr('The training record')} <span className="highlight-text">{tr('aviation runs on.')}</span>
          </h1>

          <p className="hero-subtitle">
            {tr('ETR is the enterprise-grade Electrical Training Record platform for aviation. Certify, track, and audit every technician, every module, every sign-off — with cryptographic proof.')}
          </p>

          <div className="hero-cta-group">
            <button type="button" className="btn-secondary-hero" onClick={() => handleScrollToSection('platform')}>
              {tr('Explore the platform')}
            </button>
          </div>

          <div className="compliance-badges">
            <div className="badge-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              <span>{tr('SOC 2 Type II')}</span>
            </div>
            <div className="badge-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              <span>{tr('FAA & EASA aligned')}</span>
            </div>
            <div className="badge-item">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              <span>{tr('ITAR-ready deployment')}</span>
            </div>
          </div>
        </div>

        {/* FLOATING CERTIFICATION CARD WIDGET */}
        <div className="hero-widget">
          <div className="widget-card">
            <div className="widget-header">
              <div className="widget-dots">
                <span className="w-dot red"></span>
                <span className="w-dot yellow"></span>
                <span className="w-dot green"></span>
              </div>
              <div className="widget-tag">ETR / {tr('CERTIFICATION')} #23.4A</div>
            </div>

            <div className="widget-grid">
              <div className="widget-metric">
                <span className="metric-title">{tr('ACTIVE LEARNERS')}</span>
                <div className="metric-num">2,481</div>
                <span className="metric-sub positive">{tr('+312 this month')}</span>
              </div>
              <div className="widget-metric">
                <span className="metric-title">{tr('CERT. ISSUED')}</span>
                <div className="metric-num">9,416</div>
                <span className="metric-sub">{tr('cryptographically signed')}</span>
              </div>
              <div className="widget-metric">
                <span className="metric-title">{tr('COMPLIANCE')}</span>
                <div className="metric-num text-cyan">99.98%</div>
                <span className="metric-sub">{tr('audit-ready')}</span>
              </div>
              <div className="widget-metric">
                <span className="metric-title">{tr('AVG. SIGN-OFF')}</span>
                <div className="metric-num">4.2 min</div>
                <span className="metric-sub">{tr('from evaluation')}</span>
              </div>
            </div>

            <div className="widget-progress-list">
              <div className="progress-row">
                <div className="row-info">
                  <span className="module-name">Avionics Wiring — Module 07</span>
                  <span className="status-tag status-certified">{tr('CERTIFIED')}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill cyan" style={{ width: '95%' }}></div>
                </div>
              </div>

              <div className="progress-row">
                <div className="row-info">
                  <span className="module-name">EWIS Inspection — Practical</span>
                  <span className="status-tag status-review">{tr('IN REVIEW')}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill orange" style={{ width: '78%' }}></div>
                </div>
              </div>

              <div className="progress-row">
                <div className="row-info">
                  <span className="module-name">Part 145 Refresher</span>
                  <span className="status-tag status-progress">{tr('IN PROGRESS')}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill yellow" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SOCIAL PROOF & STATS ================= */}
      <section className="stats-banner">
        <div className="stats-container">
          <div className="stat-box">
            <span className="stat-value">72K+</span>
            <span className="stat-label">{tr('CERTIFIED TECHNICIANS')}</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">180</span>
            <span className="stat-label">{tr('TRAINING CENTERS')}</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">99.98%</span>
            <span className="stat-label">{tr('AUDIT PASS RATE')}</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">24 mo.</span>
            <span className="stat-label">{tr('AVG. CERTIFICATION CYCLE')}</span>
          </div>
        </div>
      </section>

      <section className="clients-strip">
        <p className="strip-title">{tr('TRUSTED ACROSS THE AVIATION INDUSTRY')}</p>
        <div className="logos-row">
          <span>NorthStar Avionics</span>
          <span>Vertex MRO</span>
          <span>Skyline Group</span>
          <span>PrattWorks</span>
          <span>TransAtlas</span>
          <span>HeliCorp</span>
        </div>
      </section>

      {/* ================= PLATFORM FEATURES ================= */}
      <section id="platform" className="platform-section">
        <div className="section-head">
          <span className="sub-tag">{tr('— THE PLATFORM')}</span>
          <h2 className="section-title">{tr('One system of record for aviation electrical competency.')}</h2>
          <p className="section-desc">
            {tr('ETR replaces spreadsheets, PDFs, and legacy LMS bolt-ons with a purpose-built platform designed around how aviation training actually happens — on the hangar floor.')}
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </div>
            <h3>{tr('Auditable Training Records')}</h3>
            <p>{tr('Every hour, module, and signature stored in an immutable ledger — ready for FAA, EASA, and internal QA audits at any time.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
            </div>
            <h3>{tr('Competency Intelligence')}</h3>
            <p>{tr('Predictive analytics surface skill gaps across fleets, hangars, and shifts before they impact airworthiness.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            </div>
            <h3>{tr('Compliance by Design')}</h3>
            <p>{tr('Aligned with 14 CFR Part 145, Part 147, and EASA Part-66. Regulatory updates roll out automatically.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg>
            </div>
            <h3>{tr('Digital Sign-off')}</h3>
            <p>{tr('PKI-backed electronic signatures with role-based delegation and full chain-of-custody visibility.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            <h3>{tr('Executive Dashboards')}</h3>
            <p>{tr('Real-time readiness scores across programs, cohorts, and certifications — from the flightline to the boardroom.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <h3>{tr('Instructor Workbench')}</h3>
            <p>{tr('Assign curriculum, evaluate practical demonstrations, and close out records without leaving the hangar floor.')}</p>
          </div>
        </div>
      </section>

      {/* ================= TARGET AUDIENCE SOLUTIONS ================= */}
      <section id="solutions" className="solutions-section">
        {/* Solution 1: Directors */}
        <div className="solution-block">
          <div className="solution-text">
            <span className="sub-tag">{tr('— FOR TRAINING DIRECTORS')}</span>
            <h2>{tr('Run every program from a single control tower.')}</h2>
            <p>
              {tr('Manage curricula, evaluators, and cohorts across multiple hangars and time zones. Real-time readiness dashboards keep leadership ahead of every audit cycle.')}
            </p>
            <ul className="check-list">
              <li><span className="check-icon">✓</span> {tr('Multi-site program management')}</li>
              <li><span className="check-icon">✓</span> {tr('Custom competency frameworks')}</li>
              <li><span className="check-icon">✓</span> {tr('Role-based delegation')}</li>
            </ul>
          </div>
          <div className="solution-visual">
            <div className="visual-card-mockup">
              <div className="mockup-header">
                <span className="mockup-dot"></span>
                <span className="mockup-title">{tr('AVIATION DASHBOARD')}</span>
              </div>
              <div className="mockup-body">
                <div className="mockup-stat-row">
                  <div className="m-stat">
                    <span>{tr('Cohorts')}</span>
                    <strong>12 {tr('Active')}</strong>
                  </div>
                  <div className="m-stat">
                    <span>{tr('Evaluators')}</span>
                    <strong>48 {tr('Certified')}</strong>
                  </div>
                  <div className="m-stat">
                    <span>{tr('Cert. Score')}</span>
                    <strong className="text-cyan">94.8%</strong>
                  </div>
                </div>
                <div className="mockup-chart-bars">
                  <div className="bar-group"><div className="b-bar" style={{ height: '60%' }}></div><span>Jan</span></div>
                  <div className="bar-group"><div className="b-bar" style={{ height: '80%' }}></div><span>Feb</span></div>
                  <div className="bar-group"><div className="b-bar" style={{ height: '75%' }}></div><span>Mar</span></div>
                  <div className="bar-group"><div className="b-bar" style={{ height: '95%' }}></div><span>Apr</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Solution 2: Instructors */}
        <div className="solution-block reverse">
          <div className="solution-text">
            <span className="sub-tag">{tr('— FOR INSTRUCTORS')}</span>
            <h2>{tr('Sign off practical evaluations from the flightline.')}</h2>
            <p>
              {tr('A mobile-first evaluator workbench that lets your best instructors capture evidence, annotate procedures, and certify competency without paper.')}
            </p>
            <ul className="check-list">
              <li><span className="check-icon">✓</span> {tr('Offline-capable mobile app')}</li>
              <li><span className="check-icon">✓</span> {tr('Photo & video evidence attach')}</li>
              <li><span className="check-icon">✓</span> {tr('Cryptographic sign-off')}</li>
            </ul>
          </div>
          <div className="solution-visual">
            <div className="visual-card-mockup instructor-mockup">
              <div className="mockup-header">
                <span className="mockup-dot orange"></span>
                <span className="mockup-title">{tr('FLIGHTLINE EVALUATION')}</span>
              </div>
              <div className="mockup-body">
                <div className="eval-item">
                  <div className="eval-title">EWIS Bundle Inspection</div>
                  <span className="eval-status status-pass">{tr('PASSED')}</span>
                </div>
                <div className="eval-item">
                  <div className="eval-title">Crimping & Splicing (M07)</div>
                  <span className="eval-status status-pass">{tr('VERIFIED')}</span>
                </div>
                <div className="photo-evidence-box">
                  <span className="camera-icon">📷</span>
                  <span>{tr('2 Evidence photos attached')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Solution 3: Compliance */}
        <div id="compliance" className="solution-block">
          <div className="solution-text">
            <span className="sub-tag">{tr('— FOR COMPLIANCE')}</span>
            <h2>{tr('Turn audits from fire drills into two-minute exports.')}</h2>
            <p>
              {tr('Every action is logged, versioned, and cryptographically sealed. When regulators call, produce the complete training history of any technician in seconds.')}
            </p>
            <ul className="check-list">
              <li><span className="check-icon">✓</span> {tr('Immutable audit ledger')}</li>
              <li><span className="check-icon">✓</span> {tr('FAA / EASA reporting templates')}</li>
              <li><span className="check-icon">✓</span> {tr('SOC 2 Type II')}</li>
            </ul>
          </div>
          <div className="solution-visual">
            <div className="visual-card-mockup compliance-mockup">
              <div className="mockup-header">
                <span className="mockup-dot green"></span>
                <span className="mockup-title">{tr('AUDIT LEDGER SEAL')}</span>
              </div>
              <div className="mockup-body">
                <div className="hash-code font-mono">
                  HASH: 8f92a10b4c810d7e...
                </div>
                <div className="compliance-row">
                  <span>{tr('FAA Part 145 Audit')}</span>
                  <span className="text-cyan font-bold">{tr('100% READY')}</span>
                </div>
                <button type="button" className="btn-export-preview" onClick={handleGoToLogin}>
                  {tr('Export PDF Package')} &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= WORKFLOW CHAIN ================= */}
      <section id="workflow" className="workflow-section">
        <div className="section-head text-center">
          <span className="sub-tag orange">{tr('— WORKFLOW')}</span>
          <h2 className="section-title text-white">{tr('From enrollment to audit — in one continuous chain of custody.')}</h2>
        </div>

        <div className="workflow-grid">
          <div className="workflow-step">
            <div className="step-header">
              <span className="step-num">{tr('STEP 01')}</span>
              <span className="step-arrow">&rarr;</span>
            </div>
            <h3>{tr('Enroll')}</h3>
            <p>{tr('Import cohorts from your LMS or HRIS. ETR provisions credentials, curricula, and training plans in minutes.')}</p>
          </div>

          <div className="workflow-step">
            <div className="step-header">
              <span className="step-num">{tr('STEP 02')}</span>
              <span className="step-arrow">&rarr;</span>
            </div>
            <h3>{tr('Train')}</h3>
            <p>{tr('Blended learning modules combine classroom, e-learning, and hands-on practical evaluations with digital sign-off.')}</p>
          </div>

          <div className="workflow-step active-step">
            <div className="step-header">
              <span className="step-num">{tr('STEP 03')}</span>
              <span className="step-arrow">&rarr;</span>
            </div>
            <h3>{tr('Certify')}</h3>
            <p>{tr('Automated competency checks route to qualified evaluators. Certificates issue with cryptographic provenance.')}</p>
            <div className="step-accent-bar orange"></div>
          </div>

          <div className="workflow-step">
            <div className="step-header">
              <span className="step-num">{tr('STEP 04')}</span>
            </div>
            <h3>{tr('Audit')}</h3>
            <p>{tr('One-click export of complete training histories for regulators, insurers, and customer audits.')}</p>
            <div className="step-accent-bar cyan"></div>
          </div>
        </div>
      </section>

      {/* ================= BOTTOM SECTION ================= */}
      <section className="bottom-cta-section">
        <div className="cta-container">
          <h2 className="cta-title">
            {tr('See the training record')} <br />
            {tr('your regulators')} <span className="highlight-text-cyan">{tr('wish you')}</span> <span className="highlight-text-orange">{tr('had.')}</span>
          </h2>
          <p className="cta-desc">
            {tr('30-minute technical walkthrough with an ETR aviation specialist. No slideware — just your workflows in the product.')}
          </p>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <PublicFooter />
    </div>
  );
};

export default Homepage;
