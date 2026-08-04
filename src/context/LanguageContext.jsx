import { createContext, useContext, useState, useEffect } from 'react';
import { translateVn, translateEn, DICTIONARY, renderTemplate } from '../utils/translate';

const LanguageContext = createContext();

export const dictionary = DICTIONARY;

export const LanguageProvider = ({ children }) => {
  // Mặc định là TIẾNG ANH. Nếu user đã lưu lựa chọn trước đó thì tôn trọng.
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('app_language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('app_language', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'vi' : 'en'));
  };

  /** Dịch chuỗi tĩnh: nguồn là tiếng Việt, hiển thị EN khi lang=en, VN khi lang=vi */
  const tr = (text) => {
    if (typeof text !== 'string' || !text) return text;
    if (lang === 'vi') return text;
    return translateVn(text);
  };

  /** Dịch chuỗi động theo key + params */
  const trt = (key, params) => {
    const template = DICTIONARY[lang]?.[key] ?? DICTIONARY.vi?.[key] ?? key;
    return renderTemplate(template, params);
  };

  /** Dịch chuỗi nguồn tiếng ANH → VN (dùng cho các khu viết sẵn tiếng Anh như Auditor).
   *  Khi lang=en trả nguyên bản tiếng Anh; khi lang=vi tra EN_TO_VN. */
  const trEn = (text) => {
    if (typeof text !== 'string' || !text) return text;
    if (lang === 'en') return text;
    return translateEn(text);
  };

  /** Dịch theo key (giữ tương thích với dictionary cũ) */
  const t = (key) => {
    return DICTIONARY[lang]?.[key] ?? DICTIONARY.en?.[key] ?? DICTIONARY.vi?.[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, tr, trt, t, trEn }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
