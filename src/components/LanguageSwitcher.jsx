import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher = ({ className = "lang-switcher", dark = false }) => {
  const { lang, toggleLanguage } = useLanguage();

  const isVi = lang === 'vi';

  // Chế độ nền tối (Login / Homepage): chữ trắng, viền trắng mờ
  const colors = dark
    ? {
        text: '#ffffff',
        border: 'rgba(255, 255, 255, 0.35)',
        borderHover: '#ffffff',
        bg: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.14) 100%)',
        shadow: '0 2px 4px rgba(0,0,0,0.25)',
        shadowHover: '0 4px 10px rgba(0,0,0,0.35)',
      }
    : {
        text: '#002147',
        border: 'rgba(197, 160, 89, 0.4)',
        borderHover: '#c5a059',
        bg: 'linear-gradient(135deg, rgba(0, 33, 71, 0.05) 0%, rgba(197, 160, 89, 0.1) 100%)',
        shadow: '0 2px 4px rgba(0,0,0,0.04)',
        shadowHover: '0 4px 8px rgba(197,160,89,0.2)',
      };

  return (
    <button
      className={`${className} lang-switcher-btn`}
      type="button"
      onClick={toggleLanguage}
      title={isVi ? "Switch to English" : "Chuyển sang Tiếng Việt"}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '20px',
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        color: colors.text,
        fontSize: '12px',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        userSelect: 'none',
        outline: 'none',
        boxShadow: colors.shadow
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.borderHover;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = colors.shadowHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = colors.shadow;
      }}
    >
      <span style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}>
        {isVi ? '🇻🇳' : '🇬🇧'}
      </span>
      <span>
        {isVi ? 'VIETNAMESE (VN)' : 'ENGLISH (EN)'}
      </span>
      <svg width="8" height="6" viewBox="0 0 7 5" fill="none" style={{ marginLeft: '2px', transition: 'transform 0.2s' }}>
        <path d="M3.5 4.31667L0 0.816667L0.816667 0L3.5 2.68333L6.18333 0L7 0.816667L3.5 4.31667Z" fill="currentColor" />
      </svg>
    </button>
  );
};

export default LanguageSwitcher;
