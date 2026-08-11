import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const CompetencyPage = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();

  useEffect(() => {
    document.title = `${tr('Competency Tracking & Evaluation')} | ETR Aviation`;
  }, []);

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> {tr('COMPETENCY MANAGEMENT SYSTEM')}
          </div>
          <h1 className="hero-title">
            {tr('Verifiable competency')} <span className="highlight-text-cyan">{tr('on the hangar floor.')}</span>
          </h1>
          <p className="hero-subtitle">
            {tr('Bridge the gap between theoretical knowledge and practical execution. Track skill mastery, evaluate tasks against standardized rubrics, and monitor cohort progress in real time.')}
          </p>
          <div className="hero-cta-group">
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              {tr('Request Competency Walkthrough')}
            </button>
          </div>
        </div>

        {/* STATIC COMPETENCY MATRIX DEMO */}
        <div className="hero-widget">
          <div className="widget-card">
            <div className="widget-header">
              <div className="widget-dots">
                <span className="w-dot red"></span>
                <span className="w-dot yellow"></span>
                <span className="w-dot green"></span>
              </div>
              <div className="widget-tag">{tr('PRACTICAL EVALUATION MATRIX')}</div>
            </div>

            <div className="competency-demo-box">
              <div className="comp-row">
                <div className="comp-name">
                  <strong>EWIS Wiring Harness Splicing</strong>
                  <span>Module 04 • Task #EW-102</span>
                </div>
                <div className="comp-score">
                  <span className="badge-pass font-bold">{tr('100% PASS')}</span>
                </div>
              </div>

              <div className="comp-row">
                <div className="comp-name">
                  <strong>Avionics Bus Connector Pinning</strong>
                  <span>Module 07 • Task #AV-401</span>
                </div>
                <div className="comp-score">
                  <span className="badge-pass font-bold">{tr('95% PASS')}</span>
                </div>
              </div>

              <div className="comp-row">
                <div className="comp-name">
                  <strong>Heat Shrink & Lacing Standard</strong>
                  <span>Module 09 • Task #HS-009</span>
                </div>
                <div className="comp-score">
                  <span className="badge-review font-bold">{tr('IN REVIEW')}</span>
                </div>
              </div>

              <div className="comp-progress-overall">
                <div className="lbl-row">
                  <span>{tr('Cohort Competency Completion')}</span>
                  <span className="text-cyan font-bold">88.4%</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill cyan" style={{ width: '88.4%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">{tr('— COMPETENCY FRAMEWORK')}</span>
          <h2 className="section-title">{tr('Objective evaluation standards for technical excellence.')}</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon-box">🎯</div>
            <h3>{tr('Competency Tracking')}</h3>
            <p>{tr('Define clear competency goals for each aircraft type, avionics suite, and maintenance rating. Monitor individual skill progression effortlessly.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">🛠️</div>
            <h3>{tr('Practical Assessment Checklists')}</h3>
            <p>{tr('Granular checklist items for hands-on tasks, requiring evaluators to verify specific safety steps, tool usage, and quality tolerances.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">✍️</div>
            <h3>{tr('Instructor Evaluation Workbench')}</h3>
            <p>{tr('Instructors evaluate learners directly on mobile or tablet devices, adding comments, rating skill execution, and requesting photo proof.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📈</div>
            <h3>{tr('Real-Time Training Progress')}</h3>
            <p>{tr('Visual progress indicators highlight completed modules, pending evaluations, and retake requirements across training cohorts.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">🏁</div>
            <h3>{tr('Completion Requirements Verification')}</h3>
            <p>{tr('Automated rules verify that attendance thresholds, pass rates, and required evidence attachments are satisfied before issuing ETR completion.')}</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bottom-cta-section">
        <div className="cta-container">
          <h2 className="cta-title">{tr('Elevate your practical assessment standards today.')}</h2>
          <p className="cta-desc">{tr('Discover how ETR ensures true technician readiness before authorization.')}</p>
          <div className="hero-cta-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/login')}>
              {tr('Log In to Portal')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CompetencyPage;
