import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '../common/LanguageToggle';

export function Header() {
  const { t } = useTranslation();

  return (
    <header className="app-header">
      <div className="header-left">
        <h1 className="header-title">{t('app.title')}</h1>
        <p className="header-subtitle">{t('app.subtitle')}</p>
      </div>
      <div className="header-right">
        <LanguageToggle />
      </div>
    </header>
  );
}
