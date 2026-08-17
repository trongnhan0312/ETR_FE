import { useState, useEffect, useMemo } from 'react';
import { api } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { usePagination } from '../utils/usePagination';
import Pagination from '../components/Pagination';
import AuditLogDetailModal from '../components/AuditLogDetailModal';

const ACADEMIC_ACTION_METAS = {
  INSERT: { label: 'Tạo mới (INSERT)', color: '#2563eb', category: 'CREATE' },
  CREATE: { label: 'Tạo mới (CREATE)', color: '#2563eb', category: 'CREATE' },
  UPDATE: { label: 'Cập nhật (UPDATE)', color: '#d97706', category: 'UPDATE' },
  DELETE: { label: 'Xóa (DELETE)', color: '#dc2626', category: 'DELETE' },
  SUBMIT: { label: 'Gửi duyệt (SUBMIT)', color: '#7c3aed', category: 'WORKFLOW' },
  APPROVE: { label: 'Phê duyệt (APPROVE)', color: '#16a34a', category: 'WORKFLOW' },
  LOCK: { label: 'Khóa (LOCK)', color: '#475569', category: 'WORKFLOW' },
  UNLOCK: { label: 'Mở khóa (UNLOCK)', color: '#0d9488', category: 'WORKFLOW' },
  IMPORT_ATTENDANCE: { label: 'Import điểm danh', color: '#4f46e5', category: 'CLASS' },
  IMPORT_ASSESSMENT: { label: 'Import điểm', color: '#4f46e5', category: 'CLASS' },
};

const getAcademicActionMeta = (action) => {
  const act = String(action || '').toUpperCase().trim();
  for (const [k, v] of Object.entries(ACADEMIC_ACTION_METAS)) {
    if (act.includes(k)) return v;
  }
  return { label: action || 'UPDATE', color: '#64748b', category: 'OTHER' };
};

const formatSnippet = (val) => {
  if (!val || val === '—') return '—';
  const str = String(val).trim();
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const obj = JSON.parse(str);
      const parts = [];
      if (obj.ClassName) parts.push(`Lớp: ${obj.ClassName}`);
      if (obj.ClassId) parts.push(`Lớp #${obj.ClassId}`);
      if (obj.SubjectId) parts.push(`Môn #${obj.SubjectId}`);
      if (obj.InstructorAccountId) parts.push(`GV #${obj.InstructorAccountId}`);
      if (obj.CourseCode) parts.push(`Khóa: ${obj.CourseCode}`);
      if (obj.FullName) parts.push(`Học viên: ${obj.FullName}`);
      if (obj.Username) parts.push(`User: ${obj.Username}`);
      if (parts.length > 0) return parts.join(', ');
      const keys = Object.keys(obj).filter(
        (k) => obj[k] !== null && !['CreatedAt', 'UpdatedAt', 'DeletedAt', 'IsDeleted'].includes(k)
      );
      if (keys.length > 0) return keys.slice(0, 3).map((k) => `${k}: ${obj[k]}`).join(', ');
    } catch {
      // fallback
    }
  }
  return str.length > 50 ? `${str.slice(0, 47)}...` : str;
};

const AcademicAuditLogs = () => {
  const { tr, trEn } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScope, setSelectedScope] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadAcademicLogs();
  }, []);

  const loadAcademicLogs = async () => {
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

      const mapped = audits.map((a) => {
        const meta = getAcademicActionMeta(a.actionType);
        const userLabel = a.accountId
          ? (accountMap.get(a.accountId) || `Account #${a.accountId}`)
          : trEn('Hệ thống (System / Admin)');

        return {
          id: a.auditLogId || a.id || '—',
          timestamp: a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : '—',
          user: userLabel,
          actor: userLabel,
          accountId: a.accountId,
          action: a.actionType || 'UPDATE',
          actionMeta: meta,
          module: a.entityName || 'Academic',
          recordId: a.recordId,
          target: a.recordId,
          etrCourseRecordId: a.etrRecordId,
          oldValue: a.oldValue || '—',
          newValue: a.newValue || '—',
          details: a.description || `${a.actionType || 'UPDATE'} ${a.entityName || 'record'} #${a.recordId || ''}`.trim(),
        };
      });

      setLogs(mapped);
    } catch (err) {
      console.error('Error loading academic audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        String(log.id).toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.module.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        String(log.recordId || '').toLowerCase().includes(q);

      let matchScope = true;
      if (selectedScope === 'CLASSES') {
        matchScope = /class|classsubject|schedule|session/i.test(log.module);
      } else if (selectedScope === 'LEARNERS') {
        matchScope = /account|userprofile|enrollment|student/i.test(log.module);
      } else if (selectedScope === 'COURSES') {
        matchScope = /course|subject/i.test(log.module);
      } else if (selectedScope === 'ETR') {
        matchScope = /etr|approval/i.test(log.module);
      } else if (selectedScope === 'CRUD_CREATE') {
        matchScope = /insert|create/i.test(log.action);
      } else if (selectedScope === 'CRUD_UPDATE') {
        matchScope = /update|modify/i.test(log.action);
      } else if (selectedScope === 'CRUD_DELETE') {
        matchScope = /delete/i.test(log.action);
      }

      return matchSearch && matchScope;
    });
  }, [logs, searchQuery, selectedScope]);

  const { page, setPage, pageCount, pageItems, total } = usePagination(filteredLogs, {
    pageSize: 10,
    resetKey: `${searchQuery}|${selectedScope}`,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <section className="content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#002147', margin: 0 }}>
            {tr('Nhật ký Điều chỉnh Giáo vụ (Academic Audit Trail)')}
          </h1>
          <div className="divider-gold" style={{ width: '40px', height: '3px', background: '#c5a059', margin: '8px 0 12px' }} />
          <p className="header-description" style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {tr('Kiểm tra các log điều chỉnh liên quan đến việc xếp lớp, phân công giảng viên, lịch học hoặc thông tin hồ sơ học viên. Xem chi tiết mọi thao tác CRUD.')}
          </p>
        </div>

        <button
          type="button"
          onClick={loadAcademicLogs}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: '#002147',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          {tr('Làm mới')}
        </button>
      </section>

      {/* Filter Card */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <input
            type="text"
            placeholder={tr('Tìm kiếm theo ID, mã lớp, học viên, môn học...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '320px',
              maxWidth: '100%',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
            }}
          />

          {/* Scope Filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
              {tr('Lọc nghiệp vụ:')}
            </span>
            {[
              { key: 'ALL', label: tr('Tất cả') },
              { key: 'CLASSES', label: tr('Xếp lớp & Giảng viên') },
              { key: 'LEARNERS', label: tr('Học viên & Ghi danh') },
              { key: 'COURSES', label: tr('Khóa học & Môn') },
              { key: 'ETR', label: tr('Hồ sơ ETR') },
              { key: 'CRUD_CREATE', label: tr('Tạo mới (INSERT)') },
              { key: 'CRUD_UPDATE', label: tr('Cập nhật (UPDATE)') },
              { key: 'CRUD_DELETE', label: tr('Xóa (DELETE)') },
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedScope(s.key)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: selectedScope === s.key ? 'none' : '1px solid #cbd5e1',
                  background: selectedScope === s.key ? '#002147' : '#ffffff',
                  color: selectedScope === s.key ? '#ffffff' : '#334155',
                  fontSize: '12px',
                  fontWeight: selectedScope === s.key ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Table */}
      <section
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#002147', margin: 0 }}>
              {tr('Danh sách Nhật ký Điều chỉnh')} ({filteredLogs.length})
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
              {tr('Nhấp vào dòng bất kỳ để mở cửa sổ đối chiếu thay đổi trước/sau và xem cấu trúc JSON.')}
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ minWidth: '1050px' }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 140px 150px 150px 140px 1.5fr 100px',
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
              <div>{tr('Đối tượng')}</div>
              <div>{tr('Mô tả chi tiết')}</div>
              <div style={{ textAlign: 'right' }}>{tr('Thao tác')}</div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                {tr('Đang tải dữ liệu audit giáo vụ...')}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                {tr('Chưa có bản ghi audit nào phù hợp.')}
              </div>
            ) : (
              pageItems.map((entry) => {
                const newSnippet = formatSnippet(entry.newValue);
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedLog(entry)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '70px 140px 150px 150px 140px 1.5fr 100px',
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
                      {entry.details} {newSnippet !== '—' && <span style={{ color: '#16a34a', fontSize: '11px', marginLeft: '4px' }}>({newSnippet})</span>}
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
                );
              })
            )}
          </div>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          pageCount={pageCount}
          onChange={setPage}
          total={total}
          pageSize={10}
        />
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

export default AcademicAuditLogs;
