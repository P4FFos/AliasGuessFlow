import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { emitWithTimeout } from '../utils/socketHelpers';
import LanguageToggle from '../components/LanguageToggle';
import { Plus, LogOut, Users, Trophy } from 'lucide-react';

function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  // Check for saved room on mount
  useEffect(() => {
    if (!socket || !connected || !user) return;
    
    const savedRoom = localStorage.getItem('currentRoom');
    if (savedRoom) {
      console.log('🔄 Attempting to rejoin saved room:', savedRoom);
      // Try to rejoin the saved room
      socket.emit('get-room-state', (response) => {
        if (response.success) {
          console.log('✅ Saved room found, redirecting...');
          // Room still exists, redirect to it
          if (response.room.status === 'playing') {
            navigate(`/game/${savedRoom}`, { replace: true });
          } else {
            navigate(`/lobby/${savedRoom}`, { replace: true });
          }
        } else {
          // Room doesn't exist anymore, clear it
          console.log('❌ Saved room no longer exists');
          localStorage.removeItem('currentRoom');
        }
      });
    }
  }, [socket, connected, user, navigate]);

  const handleCreateRoom = async () => {
    if (!socket || !connected) {
      setError(t('notConnected') || 'Not connected to server');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await emitWithTimeout(socket, 'create-room', {
        username: user.username,
        settings: {
          roundTime: 60,
          wordsToWin: 50,
          teamsCount: 2,
          difficulty: 'mixed',
          language: language,
          teamNames: {
            0: 'Team 1',
            1: 'Team 2'
          }
        }
      }, 15000);
      
      // Navigate to lobby - the lobby will handle joining
      navigate(`/lobby/${response.room.roomCode}`, { state: { room: response.room } });
    } catch (error) {
      console.error('Failed to create room:', error);
      setError(error.message || t('failedToCreateRoom') || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');

    const code = roomCode.toUpperCase();
    // Just navigate - the lobby will handle joining
    navigate(`/lobby/${code}`);
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-200 bg-clip-text text-transparent">
            {t('appName')}
          </h1>
          <div className="mt-4 flex items-center justify-center gap-2 text-white/60">
            <Users size={18} />
            <span>{t('welcome')}, {user.username}!</span>
          </div>
        </div>

        {/* Connection Status */}
        {!connected && (
          <div className="bg-red/20 border border-red text-red px-4 py-3 rounded-lg mb-6 text-center">
            {t('connectingToServer')}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red/20 border border-red text-red px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Create Room */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">{t('createRoom')}</h2>
            <p className="text-white/70 mb-6">{t('startNewGame')}</p>
            <button
              onClick={handleCreateRoom}
              disabled={loading || !connected}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              {t('createRoom')}
            </button>
          </div>

          {/* Join Room */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">{t('joinRoom')}</h2>
            <p className="text-white/70 mb-6">{t('enterRoomCode')}</p>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="input-field text-center text-2xl tracking-widest"
                placeholder="ABC123"
                maxLength={6}
                disabled={loading || !connected}
              />
              <button
                type="submit"
                disabled={loading || !connected}
                className="btn-secondary w-full"
              >
                {t('join')}
              </button>
            </form>
          </div>
        </div>

        {/* Statistics & Logout */}
        <div className="flex justify-center gap-6">
          <button
            onClick={() => navigate('/statistics')}
            className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
          >
            <Trophy size={18} />
            {t('statistics') || 'Statistics'}
          </button>
          <button
            onClick={handleLogout}
            className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
          >
            <LogOut size={18} />
            {t('logout')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;
