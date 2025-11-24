import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

function LanguageToggle() {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 rounded-xl transition-all duration-300 border-2 border-white/30 hover:border-blue shadow-lg hover:shadow-xl hover:shadow-blue/20 transform hover:scale-105 active:scale-95"
      title={t('switchLanguage')}
    >
      <Globe size={20} className="text-blue" />
      <span className="font-bold text-blue">{language.toUpperCase()}</span>
    </button>
  );
}

export default LanguageToggle;
