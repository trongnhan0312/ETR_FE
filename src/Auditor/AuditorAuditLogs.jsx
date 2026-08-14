import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { searchAuditLogs } from './auditorApi';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';

// Nhãn + màu hiển thị cho từng ActionType mà BE ghi vào AuditLog
// (bao gồm các loại mới từ commit "Add Audit Logs for manual updates and imports":
//  UPDATE — sửa điểm danh/điểm; IMPORT_ATTENDANCE / IMPORT_ASSESSMENT — import Excel)
const ACTION_META = {
  INSERT: { label: 'Tạo mới', color: '#2563eb' },
  UPDATE: { label: 'Cập nhật', color: '#d97706' },
  DELETE: { label: 'Xóa', color: '#dc2626' },
  SUBMIT: { label: 'Gửi duyệt', color: '#7c3aed' },
  VERIFY: { label: 'Xác minh', color: '#0891b2' },
  APPROVE: { label: 'Phê duyệt', color: '#16a34a' },
  REJECT: { label: 'Từ chối', color: '#dc2626' },
  COMPLETE: { label: 'Hoàn tất', color: '#16a34a' },
  REOPEN: { label: 'Mở lại', color: '#ea580c' },
  RETURN: { label: 'Trả lại', color: '#f59e0b' },
  LOCK: { label: 'Khóa', color: '#475569' },
  UNLOCK: { label: 'Mở khóa', color: '#0d9488' },
  IMPORT_ATTENDANCE: { label: 'Import điểm danh', color: '#4f46e5' },
  IMPORT_ASSESSMENT: { label: 'Import điểm', color: '#4f46e5' },
  IMPORT: { label: 'Import dữ liệu', color: '#4f46e5' },
  LOGIN: { label: 'Đăng nhập', color: '#64748b' },
  LOGOUT: { label: 'Đăng xuất', color: '#64748b' },
  SIGN_OFF: { label: 'Ký xác nhận', color: '#0f766e' },
  SIGNOFF: { label: 'Ký xác nhận', color: '#0f766e' },
  REQUEST_UNLOCK: { label: 'Yêu cầu mở khóa', color: '#c2410c' },
  EXPORT: { label: 'Xuất dữ liệu', color: '#6d28d9' },
};

const actionMeta = (action) =>
  ACTION_META[String(action || '').toUpperCase()] || {
    label: action || '—',
    color: '#64748b',
  };

const AuditorAuditLogs = () => {
  const { trEn } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc module lấy ĐỘNG từ entityName thật mà BE trả về (AttendanceRecord,
  // AssessmentResult, ETRCourseRecord, EvidenceFile, Account, ...) thay vì danh
  // sách cứng cũ không khớp dữ liệu audit log mới.
  const modules = useMemo(() => {
    const names = [...new Set(logs.map((l) => l.module).filter(Boolean))].sort();
    return ['All', ...names];
  }, [logs]);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        // Luôn lấy danh sách đầy đủ (module='All'); lọc theo module ở render để
        // danh sách module (modules) không bị thu hẹp sau khi chọn 1 module.
        const data = await searchAuditLogs(searchQuery, 'All');
        setLogs(data);
      } catch (err) {
        console.error('Error loading audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      loadLogs();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const visibleLogs =
    selectedModule === 'All'
      ? logs
      : logs.filter((l) => l.module === selectedModule);

  const { page, setPage, pageCount, pageItems, total } = usePagination(visibleLogs, {
    pageSize: 10,
    resetKey: `${searchQuery}|${selectedModule}`,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>{trEn('System Audit Logs')}</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            {trEn('Complete, immutable audit trail of system interactions, access verifications, and compliance enforcement events.')}
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
                placeholder={trEn('Search audit logs by user, action, details, ID...')}
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
                {trEn(mod)}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="table-responsive-scroll">
          <div className="table-header auditor-logs-grid">
            <div>{trEn('Timestamp')}</div>
            <div>{trEn('Actor')}</div>
            <div>{trEn('Action')}</div>
            <div>{trEn('Module')}</div>
            <div>{trEn('Old Value')}</div>
            <div>{trEn('New Value')}</div>
            <div>{trEn('Details')}</div>
          </div>

          <div className="table-body">
            {loading ? (
              <div className="empty-table-state">{trEn('Loading audit logs...')}</div>
            ) : visibleLogs.length === 0 ? (
              <div className="empty-table-state">{trEn('No audit logs found matching criteria.')}</div>
            ) : (
              pageItems.map((log) => {
                const meta = actionMeta(log.action);
                return (
                  <div key={log.id} className="table-row auditor-logs-grid">
                    <div style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{log.timestamp}</div>
                    <div className="col-name">{log.user}</div>
                    <div>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          background: `${meta.color}1a`,
                          color: meta.color,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div style={{ fontWeight: '600', color: '#002147', fontSize: '12px' }}>{log.module}</div>
                    <div
                      title={log.oldValue}
                      style={{
                        fontSize: '12px',
                        color: 'rgba(0,33,71,0.6)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.oldValue}
                    </div>
                    <div
                      title={log.newValue}
                      style={{
                        fontSize: '12px',
                        color: 'rgba(0,33,71,0.6)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.newValue}
                    </div>
                    <div
                      title={log.details}
                      style={{
                        fontSize: '12px',
                        color: 'rgba(0,33,71,0.75)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.details}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Table Footer */}
        <div className="table-footer">
          <Pagination
            page={page}
            pageCount={pageCount}
            onChange={setPage}
            total={total}
            pageSize={10}
          />
        </div>
      </section>
    </div>
  );
};

export default AuditorAuditLogs;
