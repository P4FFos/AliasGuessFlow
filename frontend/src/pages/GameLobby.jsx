import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { emitWithTimeout } from '../utils/socketHelpers';
import { Copy, Check, Users, Crown, ArrowLeft, Play, Settings, Link } from 'lucide-react';

function GameLobby() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { t } = useLanguage();
  
  const [gameState, setGameState] = useState(location.state?.room || null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [settings, setSettings] = useState({
    roundTime: 60,
    wordsToWin: 50,
    difficulty: 'mixed',
    teamNames: {
      0: 'Team 1',
      1: 'Team 2'
    }
  });

  // Browser back button warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (gameState && gameState.status === 'playing') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  useEffect(() => {
    if (!socket || !connected || !user) return;

    // Save current room to localStorage for persistence
    localStorage.setItem('currentRoom', roomCode);

    // Remove all previous listeners before setting up new ones
    socket.off('game-state-update');
    socket.off('player-joined');
    socket.off('player-left');
    socket.off('game-started');

    // Always rejoin the room to ensure socket is registered
    // Even if we have state from navigation, the socket connection might be new
    socket.emit('join-room', {
      roomCode: roomCode,
      username: user.username
    }, (response) => {
      if (response.success) {
        console.log('✅ Successfully joined lobby:', response.room.roomCode);
        setGameState(response.room);
        setSettings({
          ...response.room.settings,
          teamNames: response.room.settings.teamNames || { 0: 'Team 1', 1: 'Team 2' }
        });
      } else {
        setError(response.error);
        localStorage.removeItem('currentRoom');
        navigate('/');
      }
    });

    // Listen for game state updates
    socket.on('game-state-update', (state) => {
      setGameState(state);
      setSettings({
        ...state.settings,
        teamNames: state.settings.teamNames || { 0: 'Team 1', 1: 'Team 2' }
      });
    });

    socket.on('player-joined', (data) => {
      console.log('Player joined:', data);
      // Refresh game state
      socket.emit('get-room-state', (response) => {
        if (response.success) {
          setGameState(response.room);
          setSettings({
            ...response.room.settings,
            teamNames: response.room.settings.teamNames || { 0: 'Team 1', 1: 'Team 2' }
          });
        }
      });
    });

    socket.on('player-left', (data) => {
      console.log('Player left:', data);
      // Refresh game state
      socket.emit('get-room-state', (response) => {
        if (response.success) {
          setGameState(response.room);
          setSettings({
            ...response.room.settings,
            teamNames: response.room.settings.teamNames || { 0: 'Team 1', 1: 'Team 2' }
          });
        }
      });
    });

    socket.on('game-started', (state) => {
      navigate(`/game/${roomCode}`);
    });

    return () => {
      socket.off('game-state-update');
      socket.off('player-joined');
      socket.off('player-left');
      socket.off('game-started');
    };
  }, [socket, connected, roomCode, navigate, user]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLobbyLink = () => {
    const lobbyUrl = `${window.location.origin}/lobby/${roomCode}`;
    navigator.clipboard.writeText(lobbyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTeamSelect = async (teamId) => {
    if (!socket || !connected) {
      setError(t('notConnected') || 'Not connected to server');
      return;
    }
    
    console.log('Assigning to team:', teamId);
    try {
      await emitWithTimeout(socket, 'assign-team', { teamId }, 5000);
      setError('');
    } catch (error) {
      console.error('Assign team error:', error.message);
      setError(error.message);
    }
  };

  const handleToggleReady = async () => {
    try {
      await emitWithTimeout(socket, 'toggle-ready', {}, 5000);
      setError('');
    } catch (error) {
      console.error('Toggle ready error:', error.message);
      setError(error.message);
    }
  };

  const handleStartGame = async () => {
    setLoading(true);
    setLoadingMessage(t('startingGame') || 'Starting game...');
    try {
      await emitWithTimeout(socket, 'start-game', {}, 10000);
      // Navigation will happen via game-started event
    } catch (error) {
      console.error('Start game error:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleLeave = () => {
    if (!socket || !connected) {
      // If not connected, just navigate away and cleanup
      localStorage.removeItem('currentRoom');
      navigate('/');
      return;
    }
    
    socket.emit('leave-room', (response) => {
      localStorage.removeItem('currentRoom');
      navigate('/');
    });
  };

  const handleUpdateSettings = async () => {
    if (!socket || !connected) {
      setError(t('notConnected') || 'Not connected to server');
      return;
    }
    
    setLoading(true);
    setLoadingMessage(t('updatingSettings') || 'Updating settings...');
    console.log('Updating settings:', settings);
    try {
      await emitWithTimeout(socket, 'update-settings', { settings }, 10000);
      setShowSettings(false);
      setError('');
    } catch (error) {
      console.error('Update settings error:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue mx-auto mb-4"></div>
          <p className="text-white/70">{t('reconnecting') || 'Reconnecting...'}</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue mx-auto mb-4"></div>
          <p className="text-white/70">{t('loadingLobby')}</p>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.players.find(p => p.userId === user.id);
  const isHost = gameState.hostId === user.id;
  const canStart = isHost && gameState.players.every(p => p.isReady) && 
                   gameState.teams.length >= 2 && 
                   gameState.teams.every(t => t.players.length > 0);

  return (
    <div className="min-h-screen p-4 md:p-8 pb-safe">
      
      {/* Main content */}
      <div className="max-w-4xl mx-auto">
        {/* Main Content */}
        <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleLeave}
            className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            {t('leave')}
          </button>

          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('gameLobby')}</h1>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              {/* Room Code */}
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl font-mono tracking-wider text-blue">{roomCode}</span>
                <button
                  onClick={copyRoomCode}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title={t('copyRoomCode')}
                >
                  {copied ? <Check size={20} className="text-green" /> : <Copy size={20} />}
                </button>
              </div>
              
              {/* Copy Link Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={copyLobbyLink}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                  title={t('copyLobbyLink')}
                >
                  {copiedLink ? (
                    <>
                      <Check size={18} className="text-green" />
                      <span className="hidden sm:inline">{t('linkCopied')}</span>
                    </>
                  ) : (
                    <>
                      <Link size={18} />
                      <span className="hidden sm:inline">{t('copyLink')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="w-20">{/* Spacer */}</div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="bg-blue/20 border border-blue text-blue px-4 py-3 rounded-lg mb-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue"></div>
            <span>{loadingMessage}</span>
          </div>
        )}

        {/* Error message */}
        {error && !loading && (
          <div className="bg-red/20 border border-red text-red px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Teams */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {[0, 1].map((teamId) => {
            const team = gameState.teams.find(t => t.id === teamId);
            const teamPlayers = team ? team.players : [];
            const isMyTeam = currentPlayer?.teamId === teamId;

            return (
              <div
                key={teamId}
                onClick={() => !isMyTeam && handleTeamSelect(teamId)}
                className={`team-card ${isMyTeam ? 'border-blue ring-2 ring-blue/50' : 'cursor-pointer hover:bg-white/10'}`}
                style={{ cursor: isMyTeam ? 'default' : 'pointer' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{team?.name || settings.teamNames[teamId] || `${t('team')} ${teamId + 1}`}</h3>
                  <div className="flex items-center gap-2 text-white/60">
                    <Users size={18} />
                    <span>{teamPlayers.length}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {teamPlayers.length === 0 ? (
                    <p className="text-white/40 text-center py-4">{t('noPlayersYet')}</p>
                  ) : (
                    teamPlayers.map((player) => {
                      const fullPlayer = gameState.players.find(p => p.userId === player.userId);
                      return (
                        <div
                          key={player.userId}
                          className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {gameState.hostId === player.userId && (
                              <Crown size={16} className="text-yellow-400" />
                            )}
                            <span>{player.username}</span>
                          </div>
                          {fullPlayer?.isReady && (
                            <Check size={18} className="text-green" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Unassigned Players */}
        {gameState.players.some(p => p.teamId === null) && (
          <div className="card mb-8">
            <h3 className="text-lg font-bold mb-4">{t('waitingToJoinTeam')}</h3>
            <div className="flex flex-wrap gap-2">
              {gameState.players
                .filter(p => p.teamId === null)
                .map(player => (
                  <div
                    key={player.userId}
                    className="bg-white/5 rounded-lg px-4 py-2 flex items-center gap-2"
                  >
                    {gameState.hostId === player.userId && (
                      <Crown size={16} className="text-yellow-400" />
                    )}
                    <span>{player.username}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Game Settings */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{t('gameSettings')}</h3>
            {isHost && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-blue hover:text-blue-hover transition-colors flex items-center gap-2"
              >
                <Settings size={18} />
                {showSettings ? t('hide') : t('edit')}
              </button>
            )}
          </div>

          {showSettings && isHost ? (
            <div className="space-y-4">
              {/* Round Time */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('roundTime')}</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="15"
                    value={settings.roundTime}
                    onChange={(e) => setSettings({ ...settings, roundTime: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold w-16 text-center">{settings.roundTime}s</span>
                </div>
              </div>

              {/* Words to Win */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('wordsToWin')}</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={settings.wordsToWin}
                    onChange={(e) => setSettings({ ...settings, wordsToWin: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold w-16 text-center">{settings.wordsToWin}</span>
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('difficulty')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {['easy', 'medium', 'hard', 'mixed'].map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setSettings({ ...settings, difficulty: diff })}
                      className={`py-2 px-4 rounded-lg font-semibold capitalize transition-all ${
                        settings.difficulty === diff
                          ? 'bg-blue text-white'
                          : 'bg-white/10 text-white/60 hover:bg-white/20'
                      }`}
                    >
                      {t(diff)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Names */}
              <div>
                <label className="block text-sm font-medium mb-3">{t('teamNames') || 'Team Names'}</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">{t('team')} 1</label>
                    <input
                      type="text"
                      value={settings.teamNames[0]}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        teamNames: { ...settings.teamNames, 0: e.target.value }
                      })}
                      className="input-field"
                      placeholder="Team 1"
                      maxLength={20}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">{t('team')} 2</label>
                    <input
                      type="text"
                      value={settings.teamNames[1]}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        teamNames: { ...settings.teamNames, 1: e.target.value }
                      })}
                      className="input-field"
                      placeholder="Team 2"
                      maxLength={20}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleUpdateSettings}
                className="btn-primary w-full"
              >
                {t('saveSettings')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-white/60 text-sm">{t('roundTime')}</p>
                <p className="text-2xl font-bold">{gameState.settings.roundTime}{t('seconds')}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">{t('wordsToWin')}</p>
                <p className="text-2xl font-bold">{gameState.settings.wordsToWin}</p>
              </div>
              <div>
                <p className="text-white/60 text-sm">{t('difficulty')}</p>
                <p className="text-2xl font-bold capitalize">{t(gameState.settings.difficulty)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-center mb-8 pb-safe">
          {currentPlayer?.teamId !== null && (
            <button
              onClick={handleToggleReady}
              className={`${
                currentPlayer?.isReady ? 'btn-danger' : 'btn-success'
              } px-8 min-h-[48px]`}
            >
              {currentPlayer?.isReady ? t('notReady') : t('ready')}
            </button>
          )}

          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className="btn-primary px-8 flex items-center justify-center gap-2 min-h-[48px]"
            >
              <Play size={20} />
              {t('startGame')}
            </button>
          )}
        </div>

        {isHost && !canStart && (
          <p className="text-center text-white/60 mt-4 text-sm mb-8 pb-safe">
            {t('allPlayersMustBeInTeams')}
          </p>
        )}
        </div>
      </div>
    </div>
  );
}

export default GameLobby;
