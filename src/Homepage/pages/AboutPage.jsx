import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const AboutPage = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();

  useEffect(() => {
    document.title = `${tr('About ETR Aviation Platform')} | ETR Aviation`;
  }, []);

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> {tr('ABOUT ETR AVIATION')}
          </div>
          <h1 className="hero-title">
            {tr('Empowering safer skies through')} <span className="highlight-text">{tr('digital training precision.')}</span>
          </h1>
          <p className="hero-subtitle">
            {tr('ETR was engineered specifically to solve the unique compliance, safety, and operational challenges of aviation maintenance and technical flight crew training.')}
          </p>
        </div>

        {/* MISSION STAT CARD */}
        <div className="hero-widget">
          <div className="widget-card">
            <div className="widget-header">
              <div className="widget-dots">
                <span className="w-dot red"></span>
                <span className="w-dot yellow"></span>
                <span className="w-dot green"></span>
              </div>
              <div className="widget-tag">{tr('OUR MISSION & IMPACT')}</div>
            </div>

            <div className="about-stat-grid">
              <div className="stat-unit">
                <span className="num text-cyan">100%</span>
                <span className="lbl">{tr('Digital Traceability')}</span>
              </div>
              <div className="stat-unit">
                <span className="num text-orange">0%</span>
                <span className="lbl">{tr('Paper Binder Dependency')}</span>
              </div>
              <div className="stat-unit">
                <span className="num text-white">24/7</span>
                <span className="lbl">{tr('Continuous Audit Readiness')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTIONS */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">{tr('— OUR FOUNDATION')}</span>
          <h2 className="section-title">{tr('Designed for aviation operators, by aviation training experts.')}</h2>
        </div>

        <div className="about-content-blocks">
          <div className="about-block">
            <h3>{tr('About the ETR Platform')}</h3>
            <p>
              {tr('The Electronic Training Record (ETR) system is a high-availability enterprise web application built to digitize, verify, and store technical training logbooks for airlines, repair stations (Part 145), approved training organizations (Part 147), and flight academies.')}
            </p>
          </div>

          <div className="about-block">
            <h3>{tr('Our Purpose')}</h3>
            <p>
              {tr('In commercial and general aviation, maintenance errors account for a significant percentage of preventable incidents. Ensuring that every technician who touches an aircraft component has verifiably completed required training and practical evaluations is critical to airworthiness. ETR eliminates lost records, incomplete sign-offs, and compliance loopholes.')}
            </p>
          </div>

          <div className="about-block">
            <h3>{tr('Our Vision')}</h3>
            <p>
              {tr('To become the global standard for electronic training record management, enabling seamless, instant, and tamper-evident credential verification across civil aviation authorities worldwide.')}
            </p>
          </div>

          <div className="about-block">
            <h3>{tr('Aviation Training Focus')}</h3>
            <p>
              {tr('Unlike generic HR software or basic LMS tools, ETR is tailored around aviation-specific workflows: practical assessment checklists, instructor sign-offs, evidence verification, retake histories, and multi-tier quality assurance reviews.')}
            </p>
          </div>

          <div className="about-block">
            <h3>{tr('Why Electronic Training Records Matter')}</h3>
            <p>
              {tr('Traditional paper logbooks suffer from legibility issues, physical degradation, risk of loss during facility moves, and laborious audit prep. Electronic records with cryptographic seals ensure perpetual durability, instant query capability, and ironclad legal audit defense.')}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bottom-cta-section">
        <div className="cta-container">
          <h2 className="cta-title">{tr('Join the leading aviation training organizations on ETR.')}</h2>
          <p className="cta-desc">{tr('Speak with our aviation specialists to discuss your organization\'s transition to digital ETR.')}</p>
          <div className="hero-cta-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              {tr('Contact Our Team')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
