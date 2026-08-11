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

  /** Dịch chuỗi tĩnh: tự động chuyển sang EN khi lang=en, và VN khi lang=vi, áp dụng cho cả chuỗi nguồn tiếng Việt và tiếng Anh */
  const tr = (text) => {
    if (typeof text !== 'string' || !text) return text;
    if (lang === 'en') {
      const translated = translateVn(text);
      return translated !== undefined ? translated : text;
    } else {
      const translated = translateEn(text);
      return translated !== undefined ? translated : text;
    }
  };

  /** Dịch chuỗi động theo key + params */
  const trt = (key, params) => {
    const template = DICTIONARY[lang]?.[key] ?? DICTIONARY.vi?.[key] ?? key;
    return renderTemplate(template, params);
  };

  /** Dịch chuỗi nguồn tiếng ANH / VI — đồng bộ với tr */
  const trEn = (text) => {
    return tr(text);
  };

  /** Dịch theo key (giữ tương thích với dictionary cũ) */
  const t = (key) => {
    const dictMatch = DICTIONARY[lang]?.[key] ?? DICTIONARY.en?.[key] ?? DICTIONARY.vi?.[key];
    if (dictMatch !== undefined) return dictMatch;
    return tr(key);
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
