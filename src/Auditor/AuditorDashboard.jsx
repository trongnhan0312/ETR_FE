import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import {
  fetchDashboardStats,
  fetchEtrList,
  fetchAuditLogs,
  fetchExportJobs,
} from './auditorApi';
import { fetchMyDashboard } from '../utils/dashboardApi';

const AuditorDashboard = () => {
  const navigate = useNavigate();
  const { trEn } = useLanguage();
  const [stats, setStats] = useState({
    totalLockedRecords: '...',
    complianceRate: '...',
    pendingAudit: '...',
    auditPackagesExported: '...',
  });
  const [recentETRs, setRecentETRs] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentExports, setRecentExports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [statsData, etrsData, logsData, exportJobs, dashboard] = await Promise.all([
          fetchDashboardStats(),
          fetchEtrList(),
          fetchAuditLogs(),
          fetchExportJobs(),
          fetchMyDashboard(),
        ]);

        const ov = dashboard?.overview ?? null;
        const lockedCount = Array.isArray(etrsData)
          ? etrsData.filter((e) => e.isLocked).length
          : 0;
        setStats({
          totalLockedRecords: lockedCount || statsData?.totalLockedRecords || '...',
          complianceRate: ov ? ov.completionRatePercent : (statsData?.complianceRate ?? '...'),
          pendingAudit: ov ? ov.pendingApprovalCount : (statsData?.pendingAudit ?? '...'),
          auditPackagesExported: Array.isArray(exportJobs)
            ? exportJobs.length
            : (statsData?.auditPackagesExported ?? '...'),
        });
        if (Array.isArray(etrsData)) setRecentETRs(etrsData.slice(0, 3));
        if (Array.isArray(logsData)) setRecentLogs(logsData.slice(0, 3));
        if (Array.isArray(exportJobs)) setRecentExports(exportJobs.slice(0, 2));
      } catch (err) {
        console.error('Error loading Auditor Dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Card */}
      <section className="content-header">
        <div className="header-left">
          <h1>{trEn('Independent Auditor Portal')}</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            {trEn('Read-only regulatory compliance inspection and automated record integrity verification.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="create-btn" 
            onClick={() => navigate('/auditor/search')}
            type="button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {trEn('Search Locked Records')}
          </button>
          <button 
            className="outline-btn font-gold-btn" 
            onClick={() => navigate('/auditor/export-packages')}
            type="button"
            style={{ borderRadius: '14px', padding: '10px 18px', fontWeight: '700' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            {trEn('Export Package')}
          </button>
          <button 
            className="outline-btn font-gold-btn" 
            onClick={() => navigate('/auditor/audit-logs')}
            type="button"
            style={{ borderRadius: '14px', padding: '10px 18px', fontWeight: '700' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>
            {trEn('View Audit Logs')}
          </button>
        </div>
      </section>

      {/* KPI Cards Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        <div className="stats-card-dark">
          <div className="stats-content">
            <div className="stats-title-label">{trEn('Total Locked Records')}</div>
            <div className="stat-value">{stats.totalLockedRecords}</div>
            <div style={{ fontSize: '11px', opacity: '0.6', marginTop: '6px' }}>{trEn('IsLocked = true Records')}</div>
          </div>
        </div>

        <div className="stats-card-dark" style={{ background: 'linear-gradient(180deg, #0a2c55 0%, #061e3d 100%)' }}>
          <div className="stats-content">
            <div className="stats-title-label" style={{ color: '#22c55e' }}>{trEn('Compliance Rate')}</div>
            <div className="stat-value" style={{ color: '#22c55e' }}>{stats.complianceRate}%</div>
            <div style={{ fontSize: '11px', opacity: '0.6', marginTop: '6px' }}>{trEn('0 Compliance Breaches')}</div>
          </div>
        </div>

        <div className="stats-card-dark" style={{ background: 'linear-gradient(180deg, #112d4e 0%, #081a30 100%)' }}>
          <div className="stats-content">
            <div className="stats-title-label" style={{ color: '#d4af37' }}>{trEn('Pending Audit')}</div>
            <div className="stat-value" style={{ color: '#d4af37' }}>{stats.pendingAudit}</div>
            <div style={{ fontSize: '11px', opacity: '0.6', marginTop: '6px' }}>{trEn('Scheduled Inspections')}</div>
          </div>
        </div>

        <div className="stats-card-dark">
          <div className="stats-content">
            <div className="stats-title-label">{trEn('Audit Packages Exported')}</div>
            <div className="stat-value">{stats.auditPackagesExported}</div>
            <div style={{ fontSize: '11px', opacity: '0.6', marginTop: '6px' }}>{trEn('Regulatory Archives')}</div>
          </div>
        </div>
      </section>

      {/* Section 1: Recently Locked Records */}
      <section className="table-card">
        <div className="table-toolbar">
          <div className="toolbar-left">
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>
              {trEn('Recently Locked Records (Finalized ETRs)')}
            </h2>
          </div>
          <div className="toolbar-right">
            <button 
              className="auditor-btn-sm"
              onClick={() => navigate('/auditor/etrs')}
            >
              {trEn('View All')} ({recentETRs.length}) →
            </button>
          </div>
        </div>

        <div className="table-responsive-scroll">
          <div className="table-header auditor-table-grid">
            <div>{trEn('ETR ID')}</div>
            <div>{trEn('Learner')}</div>
            <div>{trEn('Course')}</div>
            <div>{trEn('Completion')}</div>
            <div>{trEn('Locked Date')}</div>
            <div>{trEn('Approved By')}</div>
            <div>{trEn('Status')}</div>
            <div style={{ textAlign: 'right' }}>{trEn('Actions')}</div>
          </div>
          <div className="table-body">
            {loading ? (
              <div className="empty-table-state">{trEn('Loading locked records...')}</div>
            ) : recentETRs.length === 0 ? (
              <div className="empty-table-state">{trEn('No locked ETR records available.')}</div>
            ) : (
              recentETRs.map((etr) => (
                <div key={etr.id} className="table-row auditor-table-grid">
                  <div className="col-id">{etr.id}</div>
                  <div className="col-name">{etr.learnerName}</div>
                  <div className="col-course">{etr.courseName}</div>
                  <div>{etr.completionDate}</div>
                  <div>{etr.lockedDate}</div>
                  <div>{etr.approvedBy}</div>
                  <div>
                    <span className="badge-locked">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      {etr.status || trEn('Locked')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button 
                      className="auditor-btn-sm" 
                      onClick={() => navigate(`/auditor/details?id=${etr.id}`)}
                    >
                      {trEn('View Details')}
                    </button>
                    <button 
                      className="auditor-btn-sm" 
                      onClick={() => navigate('/auditor/export-packages')}
                    >
                      {trEn('Export')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Grid containing Recent Audit Logs & Recent Export History */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        {/* Section 2: Recent Audit Logs */}
        <section className="table-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#002147', margin: 0 }}>
              {trEn('Recent Audit Trail Events')}
            </h2>
            <button className="auditor-btn-sm" onClick={() => navigate('/auditor/audit-logs')}>
              {trEn('View All Logs')} →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentLogs.map((log) => (
              <div key={log.id} style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#c5a059' }}>{log.action}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(0,33,71,0.5)' }}>{log.timestamp}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#002147', fontWeight: '600' }}>{log.user}</div>
                <div style={{ fontSize: '12px', color: 'rgba(0,33,71,0.7)', marginTop: '4px' }}>{log.details}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Recent Export History */}
        <section className="table-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#002147', margin: 0 }}>
              {trEn('Recent Export History')}
            </h2>
            <button className="auditor-btn-sm" onClick={() => navigate('/auditor/export-packages')}>
              {trEn('Export Center')} →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentExports.map((pkg) => (
              <div key={pkg.id} style={{ padding: '12px 14px', borderRadius: '12px', background: '#f8fafc', border: '1px solid #dfe6f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#002147' }}>{pkg.name}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(0,33,71,0.5)', marginTop: '2px' }}>
                    {pkg.type} • {pkg.size} • {pkg.generatedDate}
                  </div>
                </div>
                <span className="badge-compliant" style={{ fontSize: '10px' }}>{trEn('Verified')}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AuditorDashboard;
