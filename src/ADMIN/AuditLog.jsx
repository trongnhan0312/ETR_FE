import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const AuditLog = () => {
  const { tr } = useLanguage();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await api.get("/Audit?page=1&pageSize=50").catch(() => []);
        const audits = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setAuditLogs(audits.slice(0, 50).map((a) => ({
          user: `Account #${a.accountId || 'System'}`,
          action: a.actionType || a.entityName || 'UPDATE',
          date: a.recordedAt ? new Date(a.recordedAt).toLocaleDateString('vi-VN') : 'N/A',
          status: 'Success',
        })));
      } catch (err) {
        console.error("Error loading audit logs:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);
  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">Administrator page 4 of 5</p>
          <h1>Audit Log</h1>
          <p className="page-description">
            View audit entries, search by activity, and filter by user or date. Logs are read-only and cannot be edited or deleted.
          </p>
        </div>

        <button className="ghost-btn" type="button">
          Search Audit Logs
        </button>
      </section>

      <section className="split-panel">
        <div className="info-card">
          <p className="section-label">Functions</p>
          <div className="pill-row">
            <span className="tag-chip">View audit logs</span>
            <span className="tag-chip">Search audit logs</span>
            <span className="tag-chip">Filter by user</span>
            <span className="tag-chip">Filter by date</span>
          </div>
        </div>

        <div className="info-card warning-card">
          <p className="section-label">Not allowed</p>
          <div className="pill-row">
            <span className="restricted-chip">Edit logs</span>
            <span className="restricted-chip">Delete logs</span>
          </div>
        </div>
      </section>

      <section className="table-section">
        <div className="section-header">
          <div>
            <p className="section-label">Recent activity</p>
            <h2>Immutable log trail</h2>
          </div>
        </div>

        <div className="data-table user-table">
          <div className="table-header table-layout audit-layout">
            <div>User</div>
            <div>Action</div>
            <div>Date</div>
            <div>Status</div>
          </div>

          {loading ? (
            <div className="table-row table-layout audit-layout" style={{ justifyContent: 'center', padding: '24px', color: '#64748b' }}>
              {tr('Đang tải...')}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="table-row table-layout audit-layout" style={{ justifyContent: 'center', padding: '24px', color: '#64748b', fontStyle: 'italic' }}>
              {tr('Chưa có bản ghi audit nào.')}
            </div>
          ) : (
            auditLogs.map((entry, idx) => (
            // Key phải DUY NHẤT: trước đây `${user}-${action}` trùng khi có 2 bản ghi
            // audit cùng Account + cùng Action (VD 2 lần "Account #4-INSERT" khi tạo tài khoản)
            // → React cảnh báo "Encountered two children with the same key".
            <div key={`${entry.user}-${entry.action}-${idx}`} className="table-row table-layout audit-layout">
              <div className="font-medium">{entry.user}</div>
              <div className="text-gray">{entry.action}</div>
              <div className="text-gray">{entry.date}</div>
              <div>
                <span className="status status-active">{entry.status}</span>
              </div>
            </div>
          )))}
        </div>
      </section>
    </div>
  );
};

export default AuditLog;