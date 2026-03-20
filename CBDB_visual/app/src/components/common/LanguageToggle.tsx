import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  return (
    <button
      className="language-toggle"
      onClick={() => i18n.changeLanguage(isZh ? 'en' : 'zh')}
      title={isZh ? 'Switch to English' : '切换到中文'}
    >
      {isZh ? 'EN' : '中文'}
    </button>
  );
}
