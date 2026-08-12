import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { fetchPublicAnalyticsOverview } from '../../utils/api';

const AnalyticsPage = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${tr('Training Analytics & Reporting')} | ETR Aviation`;
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
            <span className="dot">•</span> {tr('ENTERPRISE REPORTING & INTELLIGENCE')}
          </div>
          <h1 className="hero-title">
            {tr('Actionable insights across')} <span className="highlight-text">{tr('fleets and cohorts.')}</span>
          </h1>
          <p className="hero-subtitle">
            {tr('Monitor qualification trends, identify skill bottlenecks, track practical evidence submission rates, and generate executive compliance reports in seconds.')}
          </p>
          <div className="hero-cta-group">
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              {tr('Explore Analytics Features')}
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
              <div className="widget-tag">{tr('PUBLIC PERFORMANCE OVERVIEW')}</div>
            </div>

            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>{tr('Loading public analytics preview...')}</div>
            ) : !data ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                {tr('Không có dữ liệu thống kê công khai từ API.')}
              </div>
            ) : (
              <div className="analytics-kpi-grid">
                <div className="kpi-mini-card">
                  <span className="kpi-label">{tr('CERTIFIED TECHNICIANS')}</span>
                  <span className="kpi-value text-white">{data?.totalTechnicians?.toLocaleString()}</span>
                  <span className="kpi-sub positive">{tr('+312 this quarter')}</span>
                </div>

                <div className="kpi-mini-card">
                  <span className="kpi-label">{tr('ACTIVE CERTIFICATES')}</span>
                  <span className="kpi-value text-cyan">{data?.activeCertifications?.toLocaleString()}</span>
                  <span className="kpi-sub">{tr('Cryptographically signed')}</span>
                </div>

                <div className="kpi-mini-card">
                  <span className="kpi-label">{tr('AUDIT PASS RATE')}</span>
                  <span className="kpi-value text-orange">{data?.auditPassRate}</span>
                  <span className="kpi-sub">{tr('Zero critical findings')}</span>
                </div>

                <div className="kpi-mini-card">
                  <span className="kpi-label">{tr('AVG. SIGNOFF TIME')}</span>
                  <span className="kpi-value text-white">{data?.averageSignoffTime}</span>
                  <span className="kpi-sub">{tr('From practical demo')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* DETAILED FEATURES */}
      <section className="page-section">
        <div className="section-head">
          <span className="sub-tag">{tr('— INTELLIGENCE SUITE')}</span>
          <h2 className="section-title">{tr('Comprehensive visibility into aviation training performance.')}</h2>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon-box">📊</div>
            <h3>{tr('Training Overview Dashboards')}</h3>
            <p>{tr('Real-time high-level summaries for Directors of Training, Training Managers, and QA Chiefs showing program readiness at a glance.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📈</div>
            <h3>{tr('Completion Rate Metrics')}</h3>
            <p>{tr('Track cohort progression curves against scheduled milestones. Automatically highlight lagging students before course deadlines.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📅</div>
            <h3>{tr('Attendance Statistics')}</h3>
            <p>{tr('Monitor session presence rates, excused absences, and makeup session schedules across ground school and simulator labs.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📝</div>
            <h3>{tr('Assessment Result Distribution')}</h3>
            <p>{tr('Analyze pass rates, average scores, and retake frequency by subject, exam version, or instructor evaluator.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">⚠️</div>
            <h3>{tr('Missing Evidence Detection')}</h3>
            <p>{tr('Automated warning engine flags practical checklist evaluations missing mandatory photo/video proof prior to final sign-off.')}</p>
          </div>

          <div className="feature-card">
            <div className="card-icon-box">📄</div>
            <h3>{tr('Exportable Training Reports')}</h3>
            <p>{tr('Generate one-click PDF, Excel, and CSV report packages formatted for internal quality audits and aviation regulatory submission.')}</p>
          </div>
        </div>

        {/* FLEET READINESS TABLE — dữ liệu từ API (trống nếu không có) */}
        <div className="demo-data-section">
          <h3 style={{ color: '#ffffff', fontSize: '1.25rem', marginBottom: '16px', fontWeight: '700' }}>{tr('Fleet Training Readiness Metrics')}</h3>
          <div className="public-table-responsive">
            <table className="public-table">
              <thead>
                <tr>
                  <th>{tr('PROGRAM / COURSE')}</th>
                  <th>{tr('READINESS SCORE')}</th>
                  <th>{tr('STATUS')}</th>
                  <th>{tr('ACTION')}</th>
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
                    <td><button type="button" className="btn-sm-action" onClick={() => navigate('/contact')}>{tr('Request Package')}</button></td>
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
          <h2 className="cta-title">{tr('Unlock precision reporting for your organization.')}</h2>
          <p className="cta-desc">{tr('Connect with an ETR analytics specialist to see custom reporting workflows in action.')}</p>
          <div className="hero-cta-group" style={{ justifyContent: 'center', marginTop: '24px' }}>
            <button type="button" className="btn-secondary-hero" onClick={() => navigate('/contact')}>
              {tr('Request Analytics Consultation')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsPage;
