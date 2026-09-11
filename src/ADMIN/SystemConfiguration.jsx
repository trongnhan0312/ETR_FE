import { useLanguage } from '../context/LanguageContext';

/**
 * System Configuration — trang hiển thị CÁC NGƯỠNG NGHIỆP VỤ ĐANG ÁP DỤNG THỰC TẾ.
 *
 * Backend hiện CHƯA có endpoint cấu hình động (SystemSettings) — các ngưỡng dưới đây
 * là hằng số được enforce bởi `ETR.Application/Compliance/BusinessRuleEngine.cs`.
 * Trang này trình bày trung thực các giá trị đó thay vì một form lưu giả (placeholder).
 * Khi backend bổ sung endpoint cấu hình, có thể chuyển các giá trị này thành form chỉnh sửa.
 */

const RULE_CONSTANTS = [
  {
    id: 'attendance-threshold',
    name: 'Minimum attendance threshold',
    viName: 'Ngưỡng điểm danh tối thiểu',
    value: '80%',
    scope: 'Mỗi môn học (subject result) phải đạt ≥ 80% mới đủ điều kiện submit ETR.',
  },
  {
    id: 'max-assessment-attempts',
    name: 'Maximum assessment attempts',
    viName: 'Số lần thi lại tối đa',
    value: '3',
    scope: 'Một assessment chỉ cho phép tối đa 3 lần làm bài; quá hạn bị từ chối retake.',
  },
  {
    id: 'attendance-grace-period',
    name: 'Attendance marking grace period',
    viName: 'Thời gian cho phép điểm danh',
    value: '48 hours',
    scope: 'Giảng viên chỉ điểm danh trong vòng 48 giờ sau ngày buổi học; quá hạn cần Academic Staff xử lý.',
  },
  {
    id: 'expiry-email-schedule',
    name: 'Certificate expiry notification schedule',
    viName: 'Lịch email nhắc chứng chỉ hết hạn',
    value: '3 days · 7 days · 1 month',
    scope: 'Hệ thống gửi email nhắc học viên trước khi chứng chỉ hết hạn theo 3 mốc này.',
  },
];

const SystemConfiguration = () => {
  const { tr, lang } = useLanguage();
  const isVi = lang === 'vi';

  return (
    <div className="page-shell">
      <section className="page-header-card">
        <div>
          <p className="eyebrow">{tr('Administrator page 5 of 5')}</p>
          <h1>{tr('System Configuration')}</h1>
          <p className="page-description">
            {tr('Business-rule thresholds currently enforced by the backend (BusinessRuleEngine). These values require a backend release to change.')}
          </p>
        </div>

        <div
          className="page-status-box"
          style={{
            background: 'rgba(217,119,6,0.08)',
            border: '1px solid rgba(217,119,6,0.35)',
            borderRadius: '10px',
            padding: '12px 16px',
            maxWidth: '320px',
          }}
        >
          <strong style={{ color: '#d97706' }}>{tr('Read-only')}</strong>
          <p style={{ fontSize: '12px', color: '#545f71', margin: '4px 0 0' }}>
            {tr('Dynamic configuration endpoints are not available yet — values below are enforced constants in the backend.')}
          </p>
        </div>
      </section>

      <section className="split-panel">
        {RULE_CONSTANTS.map((rule) => (
          <article key={rule.id} className="info-card">
            <p className="section-label">{tr('Enforced business rule')}</p>
            <h2>{isVi ? rule.viName : rule.name}</h2>
            <p
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: '#002147',
                margin: '8px 0',
              }}
            >
              {rule.value}
            </p>
            <p className="hero-copy">
              {isVi ? rule.scope : rule.scope}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default SystemConfiguration;
