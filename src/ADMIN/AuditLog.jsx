import { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';
import AuditLogDetailModal from '../components/AuditLogDetailModal';

const formatSnippet = (val) => {
  if (!val || val === '—') return '—';
  const str = String(val).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      const parts = [];
      if (obj.Username) parts.push(`User: ${obj.Username}`);
      if (obj.FullName) parts.push(obj.FullName);
      if (obj.Role) parts.push(`Role: ${obj.Role}`);
      if (obj.DepartmentId) parts.push(`Dept #${obj.DepartmentId}`);
      if (obj.ClassId) parts.push(`Lớp #${obj.ClassId}`);
      if (obj.SubjectId) parts.push(`Môn #${obj.SubjectId}`);
      if (parts.length > 0) return parts.join(', ');
      const keys = Object.keys(obj).filter(
        (k) => obj[k] !== null && !['CreatedAt', 'UpdatedAt', 'DeletedAt', 'IsDeleted'].includes(k)
      );
      if (keys.length > 0) return keys.slice(0, 3).map((k) => `${k}: ${obj[k]}`).join(', ');
    } catch {
      // fallback
    }
  }
  return str.length > 45 ? `${str.slice(0, 42)}...` : str;
};

const ACTION_METAS = {
  INSERT: { label: 'Tạo mới (INSERT)', color: '#2563eb', category: 'CREATE' },
  CREATE: { label: 'Tạo mới (CREATE)', color: '#2563eb', category: 'CREATE' },
  UPDATE: { label: 'Cập nhật (UPDATE)', color: '#d97706', category: 'UPDATE' },
  DELETE: { label: 'Xóa (DELETE)', color: '#dc2626', category: 'DELETE' },
  APPROVE: { label: 'Phê duyệt (APPROVE)', color: '#16a34a', category: 'UPDATE' },
  VERIFY: { label: 'Xác minh (VERIFY)', color: '#0891b2', category: 'UPDATE' },
  REJECT: { label: 'Từ chối (REJECT)', color: '#dc2626', category: 'UPDATE' },
  SUBMIT: { label: 'Gửi duyệt (SUBMIT)', color: '#7c3aed', category: 'UPDATE' },
  LOCK: { label: 'Khóa (LOCK)', color: '#475569', category: 'SECURITY' },
  UNLOCK: { label: 'Mở khóa (UNLOCK)', color: '#0d9488', category: 'SECURITY' },
  LOGIN: { label: 'Đăng nhập (LOGIN)', color: '#64748b', category: 'SECURITY' },
  LOGOUT: { label: 'Đăng xuất (LOGOUT)', color: '#64748b', category: 'SECURITY' },
  EXPORT: { label: 'Xuất dữ liệu (EXPORT)', color: '#6d28d9', category: 'SECURITY' },
  IMPORT: { label: 'Nhập dữ liệu (IMPORT)', color: '#4338ca', category: 'CREATE' },
};

const getActionMeta = (action) => {
  const act = String(action || '').toUpperCase().trim();
  for (const [key, val] of Object.entries(ACTION_METAS)) {
    if (act.includes(key)) return val;
  }
  return { label: action || 'UPDATE', color: '#64748b', category: 'OTHER' };
};

const AuditLog = () => {
  const { tr, trEn } = useLanguage();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrud, setSelectedCrud] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [data, accounts] = await Promise.all([
          api.get('/Audit?page=1&pageSize=100').catch(() => []),
          api.get('/Accounts').catch(() => []),
        ]);
        const audits = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        const accountList = Array.isArray(accounts) ? accounts : Array.isArray(accounts?.items) ? accounts.items : [];
        const accountMap = new Map();
        accountList.forEach((acc) => {
          if (acc?.accountId) accountMap.set(acc.accountId, acc.username || acc.fullName || `Account #${acc.accountId}`);
        });

        setAuditLogs(
          audits.map((a) => {
            const actMeta = getActionMeta(a.actionType);
            const userLabel = a.accountId
              ? (accountMap.get(a.accountId) || `Account #${a.accountId}`)
              : trEn('Hệ thống (System / Admin)');
            return {
              id: a.auditLogId || a.id || '—',
              user: userLabel,
              accountId: a.accountId,
              action: a.actionType || 'UPDATE',
              actionMeta: actMeta,
              module: a.entityName || 'System',
              recordId: a.recordId,
              target: a.recordId,
              etrCourseRecordId: a.etrRecordId,
              oldValue: a.oldValue || '—',
              newValue: a.newValue || '—',
              description: a.description || `${a.actionType || ''} ${a.entityName || ''} #${a.recordId ?? ''}`.trim(),
              details: a.description || `${a.actionType || ''} ${a.entityName || ''} #${a.recordId ?? ''}`.trim(),
              date: a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : '—',
              timestamp: a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : '—',
              status: 'Success',
            };
          })
        );
      } catch (err) {
        console.error('Error loading audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const modules = useMemo(() => {
    const list = [...new Set(auditLogs.map((l) => l.module).filter(Boolean))].sort();
    return ['ALL', ...list];
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        String(log.id).toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.description.toLowerCase().includes(q) ||
        String(log.recordId || '').toLowerCase().includes(q);

      const matchCrud =
        selectedCrud === 'ALL' ||
        log.actionMeta.category === selectedCrud ||
        String(log.action).toUpperCase().includes(selectedCrud);

      const matchModule = selectedModule === 'ALL' || log.module === selectedModule;

      return matchSearch && matchCrud && matchModule;
    });
  }, [auditLogs, searchQuery, selectedCrud, selectedModule]);

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredLogs, {
    pageSize: 10,
    resetKey: `${searchQuery}|${selectedCrud}|${selectedModule}`,
  });

  return (
    <div className="page-shell">
      {/* Header Card */}
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{tr('Quản trị viên hệ thống / Admin Portal')}</p>
          <h1>{tr('Nhật ký Hoạt động Hệ thống (System Audit Trail)')}</h1>
          <p className="page-description">
            {tr('Theo dõi toàn bộ vận hành, can thiệp kỹ thuật và bảo mật. Lưu trữ bất biến mọi thao tác CRUD (Tạo mới, Cập nhật, Xóa, Phê duyệt, Bảo mật).')}
          </p>
        </div>
      </section>

      {/* Overview Filter Bar */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <input
              type="text"
              placeholder={tr('Tìm theo ID, người thực hiện, mô tả...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>

          {/* CRUD Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              {tr('Thao tác CRUD:')}
            </span>
            {[
              { key: 'ALL', label: tr('Tất cả') },
              { key: 'CREATE', label: tr('Tạo mới (CREATE)') },
              { key: 'UPDATE', label: tr('Cập nhật (UPDATE)') },
              { key: 'DELETE', label: tr('Xóa (DELETE)') },
              { key: 'SECURITY', label: tr('Bảo mật & Hệ thống') },
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            {tr('Phân hệ (Module):')}
          </span>
          {modules.map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setSelectedModule(mod)}
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                border: selectedModule === mod ? '1px solid #c5a059' : '1px solid #e2e8f0',
                background: selectedModule === mod ? 'rgba(197, 160, 89, 0.15)' : '#f8fafc',
                color: selectedModule === mod ? '#92400e' : '#64748b',
                fontSize: '11px',
                fontWeight: selectedModule === mod ? '700' : '500',
                cursor: 'pointer',
              }}
            >
              {mod === 'ALL' ? tr('Tất cả Module') : mod}
            </button>
          ))}
        </div>
      </section>

      {/* Main Table Section */}
      <section className="table-section" style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>
              {tr('Nhật ký chi tiết')} ({filteredLogs.length})
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
              {tr('Nhấp vào bất kỳ dòng nào để mở cửa sổ xem toàn bộ chi tiết thay đổi và cấu trúc dữ liệu JSON.')}
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ minWidth: '1050px' }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 140px 150px 140px 140px 1.5fr 110px',
                padding: '12px 16px',
                background: '#002147',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '11px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                alignItems: 'center',
              }}
            >
              <div>{tr('Log ID')}</div>
              <div>{tr('Thời gian')}</div>
              <div>{tr('Người thực hiện')}</div>
              <div>{tr('Hành động (CRUD)')}</div>
              <div>{tr('Phân hệ')}</div>
              <div>{tr('Mô tả thay đổi')}</div>
              <div style={{ textAlign: 'right' }}>{tr('Thao tác')}</div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                {tr('Đang tải dữ liệu audit...')}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                {tr('Không tìm thấy bản ghi nhật ký nào phù hợp.')}
              </div>
            ) : (
              pageItems.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedLog(entry)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 140px 150px 140px 140px 1.5fr 110px',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    alignItems: 'center',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    background: '#ffffff',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                >
                  <div style={{ fontWeight: '700', color: '#c5a059' }}>#{entry.id}</div>
                  <div style={{ color: '#64748b' }}>{entry.timestamp}</div>
                  <div style={{ fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.user}
                  </div>
                  <div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '700',
                        backgroundColor: `${entry.actionMeta.color}1a`,
                        color: entry.actionMeta.color,
                        whiteSpace: 'nowrap',
                        display: 'inline-block',
                      }}
                    >
                      {trEn(entry.actionMeta.label)}
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', color: '#002147' }}>
                    {entry.module} {entry.recordId && <span style={{ color: '#64748b' }}>#{entry.recordId}</span>}
                  </div>
                  <div
                    title={entry.details}
                    style={{
                      color: '#475569',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {entry.details}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedLog(entry);
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
                      {tr('Chi tiết ›')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          total={total}
          pageSize={10}
        />
      </section>

      {/* Audit Log Detail Modal */}
      {selectedLog && (
        <AuditLogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default AuditLog;