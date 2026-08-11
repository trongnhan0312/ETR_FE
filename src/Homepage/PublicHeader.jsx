import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';

const PublicHeader = () => {
  const navigate = useNavigate();
  const { tr } = useLanguage();

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <header className="landing-navbar">
      <div className="nav-brand" onClick={() => navigate('/')}>
        <div className="brand-logo-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#FF7A36" stroke="#FF7A36" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="brand-logo-text">
          <span className="logo-main">ETR</span>
          <span className="logo-sub">AVIATION</span>
        </div>
      </div>

      <nav className="nav-links">
        <NavLink to="/records" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>{tr('Records')}</NavLink>
        <NavLink to="/competency" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>{tr('Competency')}</NavLink>
        <NavLink to="/compliance" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>{tr('Compliance')}</NavLink>
        <NavLink to="/analytics" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>{tr('Analytics')}</NavLink>
        <NavLink to="/integrations" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>{tr('Integrations')}</NavLink>
        <NavLink to="/regulatory-library" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>{tr('Library')}</NavLink>
      </nav>

      <div className="nav-actions">
        <LanguageSwitcher dark />
        <button type="button" className="btn-sign-in" onClick={handleGoToLogin}>
          {tr('Sign in')}
        </button>
      </div>
    </header>
  );
};

export default PublicHeader;
