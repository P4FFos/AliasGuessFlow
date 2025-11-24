import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { WifiOff } from 'lucide-react';

function ConnectionStatus() {
  const { connected } = useSocket();
  const { t } = useLanguage();

  // Only show when disconnected
  if (connected) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red/90 backdrop-blur-sm border border-red text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-pulse">
      <WifiOff size={20} />
      <span className="font-medium">{t('reconnecting') || 'Reconnecting to server...'}</span>
    </div>
  );
}

export default ConnectionStatus;
