import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => changeLanguage('en')}
        className={`px-3 py-1.5 text-sm rounded-md ${
          i18n.language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        {t('languageSwitcherEnglish')}
      </button>
      <button
        onClick={() => changeLanguage('ar')}
        className={`px-3 py-1.5 text-sm rounded-md ${
          i18n.language === 'ar' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        {t('languageSwitcherArabic')}
      </button>
    </div>
  );
}
