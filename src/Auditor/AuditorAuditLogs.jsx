import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { searchAuditLogs } from './auditorApi';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';
import AuditLogDetailModal from '../components/AuditLogDetailModal';

// Nhãn + màu hiển thị cho từng ActionType mà BE ghi vào AuditLog
const ACTION_META = {
  INSERT: { label: 'Tạo mới (INSERT)', color: '#2563eb', category: 'CREATE' },
  CREATE: { label: 'Tạo mới (CREATE)', color: '#2563eb', category: 'CREATE' },
  UPDATE: { label: 'Cập nhật (UPDATE)', color: '#d97706', category: 'UPDATE' },
  DELETE: { label: 'Xóa (DELETE)', color: '#dc2626', category: 'DELETE' },
  SUBMIT: { label: 'Gửi duyệt (SUBMIT)', color: '#7c3aed', category: 'APPROVAL' },
  VERIFY: { label: 'Xác minh (VERIFY)', color: '#0891b2', category: 'APPROVAL' },
  APPROVE: { label: 'Phê duyệt (APPROVE)', color: '#16a34a', category: 'APPROVAL' },
  REJECT: { label: 'Từ chối (REJECT)', color: '#dc2626', category: 'APPROVAL' },
  COMPLETE: { label: 'Hoàn tất (COMPLETE)', color: '#16a34a', category: 'APPROVAL' },
  REOPEN: { label: 'Mở lại (REOPEN)', color: '#ea580c', category: 'UPDATE' },
  RETURN: { label: 'Trả lại (RETURN)', color: '#f59e0b', category: 'APPROVAL' },
  LOCK: { label: 'Khóa (LOCK)', color: '#475569', category: 'LOCK' },
  UNLOCK: { label: 'Mở khóa (UNLOCK)', color: '#0d9488', category: 'LOCK' },
  IMPORT_ATTENDANCE: { label: 'Import điểm danh', color: '#4f46e5', category: 'CREATE' },
  IMPORT_ASSESSMENT: { label: 'Import điểm', color: '#4f46e5', category: 'CREATE' },
  IMPORT: { label: 'Import dữ liệu', color: '#4f46e5', category: 'CREATE' },
  LOGIN: { label: 'Đăng nhập', color: '#64748b', category: 'OTHER' },
  LOGOUT: { label: 'Đăng xuất', color: '#64748b', category: 'OTHER' },
  SIGN_OFF: { label: 'Ký xác nhận', color: '#0f766e', category: 'APPROVAL' },
  SIGNOFF: { label: 'Ký xác nhận', color: '#0f766e', category: 'APPROVAL' },
  REQUEST_UNLOCK: { label: 'Yêu cầu mở khóa', color: '#c2410c', category: 'LOCK' },
  EXPORT: { label: 'Xuất dữ liệu', color: '#6d28d9', category: 'OTHER' },
};

const actionMeta = (action) => {
  const act = String(action || '').toUpperCase().trim();
  for (const [k, v] of Object.entries(ACTION_META)) {
    if (act.includes(k)) return v;
  }
  return { label: action || '—', color: '#64748b', category: 'OTHER' };
};

const formatValueSnippet = (val) => {
  if (!val || val === '—') return '—';
  const str = String(val).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      const parts = [];
      if (obj.ClassId) parts.push(`Lớp #${obj.ClassId}`);
      if (obj.SubjectId) parts.push(`Môn #${obj.SubjectId}`);
      if (obj.InstructorAccountId) parts.push(`GV #${obj.InstructorAccountId}`);
      if (obj.Status) parts.push(`Trạng thái: ${obj.Status}`);
      if (obj.Score != null) parts.push(`Điểm: ${obj.Score}`);
      if (obj.AttendanceRate != null) parts.push(`Điểm danh: ${obj.AttendanceRate}%`);
      if (parts.length > 0) return parts.join(', ');

      const keys = Object.keys(obj).filter(
        (k) => obj[k] !== null && !['CreatedAt', 'UpdatedAt', 'DeletedAt', 'IsDeleted'].includes(k)
      );
      if (keys.length > 0) {
        return keys.slice(0, 3).map((k) => `${k}: ${obj[k]}`).join(', ');
      }
    } catch {
      // fallback
    }
  }
  return str.length > 60 ? `${str.slice(0, 57)}...` : str;
};

const AuditorAuditLogs = () => {
  const { trEn } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('All');
  const [selectedCrud, setSelectedCrud] = useState('ALL');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);

  // Bộ lọc module lấy ĐỘNG từ entityName thật mà BE trả về
  const modules = useMemo(() => {
    const names = [...new Set(logs.map((l) => l.module).filter(Boolean))].sort();
    return ['All', ...names];
  }, [logs]);

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
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

  const visibleLogs = useMemo(() => {
    return logs.filter((l) => {
      const matchModule = selectedModule === 'All' || l.module === selectedModule;
      const meta = actionMeta(l.action);
      const matchCrud =
        selectedCrud === 'ALL' ||
        meta.category === selectedCrud ||
        String(l.action).toUpperCase().includes(selectedCrud);
      return matchModule && matchCrud;
    });
  }, [logs, selectedModule, selectedCrud]);

  const { page, setPage, pageCount, pageItems, total } = usePagination(visibleLogs, {
    pageSize: 10,
    resetKey: `${searchQuery}|${selectedModule}|${selectedCrud}`,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <section className="content-header">
        <div className="header-left">
          <h1>{trEn('System Audit Logs')}</h1>
          <div className="divider-gold"></div>
          <p className="header-description">
            {trEn('Phục vụ công tác thanh tra, rà soát tính toàn vẹn của hồ sơ huấn luyện. Theo dõi toàn bộ lịch sử CRUD, phê duyệt, thẩm định và khóa hồ sơ.')}
          </p>
        </div>
      </section>

      {/* Table Card */}
      <section className="table-card">
        {/* Table Toolbar */}
        <div className="table-toolbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div className="search-box" style={{ minWidth: '280px' }}>
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

            {/* CRUD Filter Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                {trEn('CRUD Actions:')}
              </span>
              {[
                { key: 'ALL', label: trEn('All') },
                { key: 'CREATE', label: trEn('Create (INSERT)') },
                { key: 'UPDATE', label: trEn('Update (UPDATE)') },
                { key: 'DELETE', label: trEn('Delete (DELETE)') },
                { key: 'APPROVAL', label: trEn('Approve & Sign-off') },
                { key: 'LOCK', label: trEn('Lock & Unlock') },
              ].map((crud) => (
                <button
                  key={crud.key}
                  type="button"
                  onClick={() => setSelectedCrud(crud.key)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: selectedCrud === crud.key ? 'none' : '1px solid #cbd5e1',
                    background: selectedCrud === crud.key ? '#002147' : '#ffffff',
                    color: selectedCrud === crud.key ? '#ffffff' : '#334155',
                    fontSize: '12px',
                    fontWeight: selectedCrud === crud.key ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {crud.label}
                </button>
              ))}
            </div>
          </div>

          {/* Module Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              {trEn('Modules:')}
            </span>
            {modules.map((mod) => (
              <button
                key={mod}
                type="button"
                className={`filter-btn${selectedModule === mod ? ' active' : ''}`}
                onClick={() => setSelectedModule(mod)}
                style={{ padding: '3px 10px', fontSize: '11px' }}
              >
                {mod === 'All' ? trEn('All Modules') : trEn(mod)}
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
            <div style={{ textAlign: 'right' }}>{trEn('Details')}</div>
          </div>

          <div className="table-body">
            {loading ? (
              <div className="empty-table-state">{trEn('Loading audit logs...')}</div>
            ) : visibleLogs.length === 0 ? (
              <div className="empty-table-state">{trEn('No audit logs found matching criteria.')}</div>
            ) : (
              pageItems.map((log) => {
                const meta = actionMeta(log.action);
                const oldSnippet = formatValueSnippet(log.oldValue);
                const newSnippet = formatValueSnippet(log.newValue);
                const userDisplay = !log.user || log.user === '—' ? trEn('Hệ thống (System / Admin)') : log.user;

                return (
                  <div
                    key={log.id}
                    className="table-row auditor-logs-grid"
                    onClick={() => setSelectedLog(log)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: '12px', color: 'rgba(0,33,71,0.6)' }}>{log.timestamp}</div>
                    <div className="col-name" style={{ fontWeight: '600', color: '#002147' }}>{userDisplay}</div>
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
                        {trEn(meta.label)}
                      </span>
                    </div>
                    <div style={{ fontWeight: '600', color: '#002147', fontSize: '12px' }}>
                      {log.module} {log.target && log.target !== '—' && <span style={{ color: '#c5a059' }}>#{log.target}</span>}
                    </div>
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
                      {oldSnippet}
                    </div>
                    <div
                      title={log.newValue}
                      style={{
                        fontSize: '12px',
                        color: '#16a34a',
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {newSnippet}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#002147',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        {trEn('Details ›')}
                      </button>
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

      {/* Detail Modal */}
      {selectedLog && (
        <AuditLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default AuditorAuditLogs;
