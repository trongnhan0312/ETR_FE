import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CustomersPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Target Organizations & Customers | ETR Aviation";
  }, []);

  const categories = [
    {
      title: "Maintenance Repair Organizations (Part 145 MRO)",
      icon: "🔧",
      useCase: "Manage technician electrical wiring (EWIS), avionics repair certifications, and annual recurrent authorizations across multiple hangar bases.",
      benefits: ["Instant audit readiness for FAA/EASA inspections", "Prevent unauthorized technician assignment", "Cryptographic proof of practical evaluations"]
    },
    {
      title: "Approved Maintenance Training Organizations (Part 147)",
      icon: "🏫",
      useCase: "Deliver structured basic and type-specific maintenance training courses, execute practical task checklists, and manage multi-stage student sign-offs.",
      benefits: ["Standardized practical checklist evaluation", "Detailed retake and examination tracking", "Automated student certificate issuance"]
    },
    {
      title: "Commercial & Regional Airlines",
      icon: "✈️",
      useCase: "Centralize technical training records for fleet maintenance crews, flight engineers, and ground operational staff across global outstations.",
      benefits: ["Multi-site authorization control tower", "Real-time fleet readiness dashboards", "Integration with airline HRIS and flight ops"]
    },
    {
      title: "Flight Training Organizations (ATO / FTO)",
      icon: "🛫",
      useCase: "Track ground school theory modules, simulator session evaluations, emergency procedure compliance, and instructor sign-offs for student pilots.",
      benefits: ["Complete flight and simulator session logs", "Instructor digital signature chain", "Regulatory compliance reporting"]
    },
    {
      title: "Cabin Crew & Safety Training Centers",
      icon: "👩‍✈️",
      useCase: "Manage cabin safety equipment procedures, annual emergency exit drills, first aid practical checks, and recurrent safety certifications.",
      benefits: ["Batch attendance and evaluation logging", "Automated recurrence renewal alerts", "Standardized safety drill rubrics"]
    }
  ];

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> BUILT FOR AVIATION ORGANIZATIONS
          </div>
          <h1 className="hero-title">
            Tailored solutions for every <span className="highlight-text-cyan">aviation training sector.</span>
          </h1>
          <p className="hero-subtitle">
            From regional Part 145 repair stations to international flight academies, ETR provides scalable electronic training record infrastructure customized for your operational scope.
          </p>
          <div className="hero-cta-group">
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              Request Organization Demo
            </button>
          </div>
        </div>
      </section>

      {/* CATEGORIES GRID */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">— ORGANIZATION CATEGORIES</span>
          <h2 className="section-title">How different aviation entities utilize ETR.</h2>
        </div>

        <div className="features-grid">
          {categories.map((cat, idx) => (
            <div key={idx} className="feature-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-icon-box">{cat.icon}</div>
              <h3>{cat.title}</h3>
              <p style={{ marginBottom: '16px' }}><strong>Use Case:</strong> {cat.useCase}</p>
              <div style={{ marginTop: 'auto' }}>
                <h4 style={{ fontSize: '0.85rem', color: '#38bdf8', marginBottom: '8px' }}>Key Benefits:</h4>
                <ul style={{ paddingLeft: '16px', margin: 0, color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  {cat.benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bottom-cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Is your organization ready for digital ETR?</h2>
          <p className="cta-desc">Speak with an aviation workflow consultant to map your existing training processes into ETR.</p>
          <div className="hero-cta-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              Schedule Consultation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CustomersPage;
