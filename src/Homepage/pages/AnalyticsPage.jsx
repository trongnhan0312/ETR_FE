import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPublicAnalyticsOverview } from '../../utils/api';

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Training Analytics & Reporting | ETR Aviation";
    let isMounted = true;
    fetchPublicAnalyticsOverview()
      .then(res => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error("Failed to load public analytics data", err);
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="public-page-container">
      {/* HERO */}
      <section className="page-hero">
        <div className="hero-content">
          <div className="trust-pill">
            <span className="dot">•</span> ENTERPRISE REPORTING & INTELLIGENCE
          </div>
          <h1 className="hero-title">
            Actionable insights across <span className="highlight-text">fleets and cohorts.</span>
          </h1>
          <p className="hero-subtitle">
            Monitor qualification trends, identify skill bottlenecks, track practical evidence submission rates, and generate executive compliance reports in seconds.
          </p>
          <div className="hero-cta-group">
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              Explore Analytics Features
            </button>
          </div>
        </div>

        {/* DEMO KPI CARDS WIDGET */}
        <div className="hero-widget">
          <div className="widget-card">
            <div className="widget-header">
              <div className="widget-dots">
                <span className="w-dot red"></span>
                <span className="w-dot yellow"></span>
                <span className="w-dot green"></span>
              </div>
              <div className="widget-tag">PUBLIC PERFORMANCE OVERVIEW</div>
            </div>

            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>Loading public analytics preview...</div>
            ) : (
              <div className="analytics-kpi-grid">
                <div className="kpi-mini-card">
                  <span className="kpi-label">CERTIFIED TECHNICIANS</span>
                  <span className="kpi-value text-white">{data?.totalTechnicians?.toLocaleString()}</span>
                  <span className="kpi-sub positive">+312 this quarter</span>
                </div>

                <div className="kpi-mini-card">
                  <span className="kpi-label">ACTIVE CERTIFICATES</span>
                  <span className="kpi-value text-cyan">{data?.activeCertifications?.toLocaleString()}</span>
                  <span className="kpi-sub">Cryptographically signed</span>
                </div>

                <div className="kpi-mini-card">
                  <span className="kpi-label">AUDIT PASS RATE</span>
                  <span className="kpi-value text-orange">{data?.auditPassRate}</span>
                  <span className="kpi-sub">Zero critical findings</span>
                </div>

                <div className="kpi-mini-card">
                  <span className="kpi-label">AVG. SIGNOFF TIME</span>
                  <span className="kpi-value text-white">{data?.averageSignoffTime}</span>
                  <span className="kpi-sub">From practical demo</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DETAILED FEATURES */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">— INTELLIGENCE SUITE</span>
          <h2 className="section-title">Comprehensive visibility into aviation training performance.</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon-box">📊</div>
            <h3>Training Overview Dashboards</h3>
            <p>Real-time high-level summaries for Directors of Training, Training Managers, and QA Chiefs showing program readiness at a glance.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📈</div>
            <h3>Completion Rate Metrics</h3>
            <p>Track cohort progression curves against scheduled milestones. Automatically highlight lagging students before course deadlines.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📅</div>
            <h3>Attendance Statistics</h3>
            <p>Monitor session presence rates, excused absences, and makeup session schedules across ground school and simulator labs.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📝</div>
            <h3>Assessment Result Distribution</h3>
            <p>Analyze pass rates, average scores, and retake frequency by subject, exam version, or instructor evaluator.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">⚠️</div>
            <h3>Missing Evidence Detection</h3>
            <p>Automated warning engine flags practical checklist evaluations missing mandatory photo/video proof prior to final sign-off.</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📄</div>
            <h3>Exportable Training Reports</h3>
            <p>Generate one-click PDF, Excel, and CSV report packages formatted for internal quality audits and aviation regulatory submission.</p>
          </div>
        </div>

        {/* FLEET READINESS DEMO TABLE */}
        <div className="demo-data-section">
          <h3 style={{ color: '#ffffff', fontSize: '1.25rem', marginBottom: '16px', fontWeight: '700' }}>Fleet Training Readiness Metrics</h3>
          <div className="public-table-responsive">
            <table className="public-table">
              <thead>
                <tr>
                  <th>PROGRAM / COURSE</th>
                  <th>READINESS SCORE</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {data?.fleetReadiness?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="font-bold text-white">{item.program}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span className="text-cyan font-bold">{item.readiness}%</span>
                        <div className="bar-track" style={{ flex: 1, height: '6px' }}>
                          <div className="bar-fill cyan" style={{ width: `${item.readiness}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td><span className="status-tag status-certified">{item.status}</span></td>
                    <td><button type="button" className="btn-sm-action" onClick={() => navigate('/contact')}>Request Package</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bottom-cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Unlock precision reporting for your organization.</h2>
          <p className="cta-desc">Connect with an ETR analytics specialist to see custom reporting workflows in action.</p>
          <div className="hero-cta-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              Request Analytics Consultation
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsPage;
