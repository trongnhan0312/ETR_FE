import { useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const ACTION_COLORS = {
  INSERT: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Tạo mới (INSERT)' },
  CREATE: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', label: 'Tạo mới (CREATE)' },
  UPDATE: { bg: '#fefce8', text: '#a16207', border: '#fef08a', label: 'Cập nhật (UPDATE)' },
  DELETE: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Xóa (DELETE)' },
  APPROVE: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: 'Phê duyệt (APPROVE)' },
  VERIFY: { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc', label: 'Xác minh (VERIFY)' },
  REJECT: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', label: 'Từ chối (REJECT)' },
  SUBMIT: { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', label: 'Gửi duyệt (SUBMIT)' },
  COMPLETE: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', label: 'Hoàn tất (COMPLETE)' },
  LOCK: { bg: '#f8fafc', text: '#334155', border: '#cbd5e1', label: 'Khóa (LOCK)' },
  UNLOCK: { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4', label: 'Mở khóa (UNLOCK)' },
  EXPORT: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe', label: 'Xuất dữ liệu (EXPORT)' },
  IMPORT: { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', label: 'Nhập dữ liệu (IMPORT)' },
};

const getActionColor = (action) => {
  const key = String(action || '').toUpperCase().trim();
  for (const [k, v] of Object.entries(ACTION_COLORS)) {
    if (key.includes(k)) return v;
  }
  return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0', label: action || 'N/A' };
};

const parseJsonSafe = (val) => {
  if (!val || val === '—') return null;
  const str = String(val).trim();
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }
  return null;
};

const AuditLogDetailModal = ({ log, onClose }) => {
  const { tr, trEn } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!log) return null;

  const actionStyle = getActionColor(log.action || log.actionType);
  const oldJson = parseJsonSafe(log.oldValue);
  const newJson = parseJsonSafe(log.newValue);

  const actorName = log.user || log.actor || (log.accountId ? `Account #${log.accountId}` : trEn('Hệ thống (System / Admin)'));
  const logId = log.id || log.auditLogId || '—';
  const timestamp = log.timestamp || log.time || log.date || (log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '—');
  const moduleName = log.module || log.entityName || '—';
  const recordId = log.target || log.recordId || '—';
  const etrId = log.etrCourseRecordId || log.etrRecordId || null;
  const details = log.details || log.description || log.detail || '—';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #002147 0%, #031731 100%)',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #c5a059',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.05em',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(197, 160, 89, 0.2)',
                  color: '#fef08a',
                  border: '1px solid rgba(197, 160, 89, 0.4)',
                }}
              >
                LOG #{logId}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  backgroundColor: actionStyle.bg,
                  color: actionStyle.text,
                  border: `1px solid ${actionStyle.border}`,
                }}
              >
                {trEn(actionStyle.label)}
              </span>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: '8px 0 0 0', color: '#ffffff' }}>
              {trEn('Chi tiết Nhật ký Kiểm toán / Audit Log Details')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Metadata Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
                {trEn('Thời gian / Timestamp')}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', marginTop: '4px' }}>
                {timestamp}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
                {trEn('Người thực hiện / Actor')}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#002147', marginTop: '4px' }}>
                {actorName}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
                {trEn('Phân hệ / Module Entity')}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                {moduleName} {recordId !== '—' && <span style={{ color: '#c5a059' }}>#{recordId}</span>}
              </div>
            </div>

            {etrId && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
                  {trEn('Hồ sơ ETR / Record ID')}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#0284c7', marginTop: '4px' }}>
                  #ETR-{String(etrId).padStart(4, '0')}
                </div>
              </div>
            )}
          </div>

          {/* Description Section */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#002147', marginBottom: '6px', textTransform: 'uppercase' }}>
              {trEn('Mô tả hành động / Action Details')}
            </div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#334155',
                lineHeight: '1.5',
              }}
            >
              {details}
            </div>
          </div>

          {/* Values Comparison (Old vs New) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {/* Old Value */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#fafafa',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  background: '#f1f5f9',
                  borderBottom: '1px solid #e2e8f0',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: '#dc2626' }}>◀</span> {trEn('Giá trị cũ / Old Value')}
              </div>
              <div style={{ padding: '14px', fontSize: '12px' }}>
                {oldJson ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.entries(oldJson).map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          background: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #f1f5f9',
                        }}
                      >
                        <strong style={{ color: '#475569' }}>{k}:</strong>
                        <span style={{ color: '#0f172a', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>
                          {v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: log.oldValue && log.oldValue !== '—' ? '#334155' : '#94a3b8', fontStyle: log.oldValue && log.oldValue !== '—' ? 'normal' : 'italic', wordBreak: 'break-word' }}>
                    {log.oldValue || '—'}
                  </div>
                )}
              </div>
            </div>

            {/* New Value */}
            <div
              style={{
                border: '1px solid #bbf7d0',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#f0fdf4',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  background: '#dcfce7',
                  borderBottom: '1px solid #bbf7d0',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>▶</span> {trEn('Giá trị mới / New Value')}
              </div>
              <div style={{ padding: '14px', fontSize: '12px' }}>
                {newJson ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.entries(newJson).map(([k, v]) => (
                      <div
                        key={k}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          background: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #dcfce7',
                        }}
                      >
                        <strong style={{ color: '#166534' }}>{k}:</strong>
                        <span style={{ color: '#0f172a', maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word', fontWeight: '500' }}>
                          {v === null ? 'null' : typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: log.newValue && log.newValue !== '—' ? '#15803d' : '#94a3b8', fontStyle: log.newValue && log.newValue !== '—' ? 'normal' : 'italic', wordBreak: 'break-word', fontWeight: '500' }}>
                    {log.newValue || '—'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Raw JSON Accordion */}
          <details
            style={{
              background: '#0f172a',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#f8fafc',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: '700', color: '#c5a059', outline: 'none' }}>
              {trEn('Xem dữ liệu thô (Raw JSON Payload)')}
            </summary>
            <pre style={{ marginTop: '10px', overflowX: 'auto', whiteSpace: 'pre-wrap', color: '#e2e8f0', lineHeight: '1.4' }}>
              {JSON.stringify(log, null, 2)}
            </pre>
          </details>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 22px',
              background: '#002147',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#0a356c'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#002147'; }}
          >
            {tr('Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetailModal;
