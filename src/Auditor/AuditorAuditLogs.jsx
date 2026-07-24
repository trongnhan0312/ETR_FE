import { useState } from 'react';
import { getAuditLogs } from './mockAuditorData';

const AuditorAuditLogs = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');

  const modules = ['All', 'ETR Inspection', 'Export Packages', 'Security Enforcer', 'ETR Workflow', 'QA Verification', 'Advanced Search'];
  const logs = getAuditLogs(selectedModule, searchQuery);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>System Audit Logs</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            Complete, immutable audit trail of system interactions, access verifications, and compliance enforcement events.
          </p>
        </div>
      </section>

      {/* Table Card */}
      <section className="table-card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="toolbar-left">
            <div className="search-box">
              <span className="search-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search audit logs by user, action, details, ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="toolbar-right" style={{ flexWrap: 'wrap' }}>
            {modules.map((mod) => (
              <button
                key={mod}
                type="button"
                className={`filter-btn${selectedModule === mod ? ' active' : ''}`}
                onClick={() => setSelectedModule(mod)}
              >
                {mod}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="table-responsive-scroll">
          <div className="table-header auditor-logs-grid">
            <div>Timestamp</div>
            <div>User</div>
            <div>Role</div>
            <div>Module</div>
            <div>Action</div>
            <div style={{ textAlign: 'right' }}>Result</div>
          </div>

          <div className="table-body">
            {logs.length === 0 ? (
              <div className="empty-table-state">No audit logs found matching criteria.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="table-row auditor-logs-grid">
                  <div style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{log.timestamp}</div>
                  <div className="col-name">{log.user}</div>
                  <div>{log.role}</div>
                  <div style={{ fontWeight: '600', color: '#002147' }}>{log.module}</div>
                  <div style={{ fontWeight: '700', color: '#c5a059' }}>{log.action}</div>
                  <div style={{ textAlign: 'right' }}>
                    <span 
                      className={log.result.includes('FORBIDDEN') ? 'badge-locked' : 'badge-compliant'} 
                      style={{ fontSize: '10px' }}
                    >
                      {log.result}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Table Footer */}
        <div className="table-footer">
          <div className="footer-info">Showing {logs.length} of {logs.length} audit trail events</div>
          <div className="pagination">
            <button className="page-arrow" disabled>‹</button>
            <button className="page-num active">1</button>
            <button className="page-arrow" disabled>›</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuditorAuditLogs;
