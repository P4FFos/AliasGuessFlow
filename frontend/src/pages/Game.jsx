import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { emitWithTimeout } from '../utils/socketHelpers';
import { Check, X, Trophy, ArrowLeft, Play } from 'lucide-react';

function Game() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { t } = useLanguage();
  
  const [gameState, setGameState] = useState(null);
  const [explainerView, setExplainerView] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [roundEnded, setRoundEnded] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState(null);
  const [wordAdjustments, setWordAdjustments] = useState({});

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
    socket.off('explainer-view');
    socket.off('time-update');
    socket.off('score-update');
    socket.off('round-ended');
    socket.off('round-started');
    socket.off('game-ended');
    socket.off('timer-expired');

    // Rejoin room on reconnection
    socket.emit('join-room', {
      roomCode: roomCode,
      username: user.username
    }, (response) => {
      if (response.success) {
        console.log('✅ Successfully rejoined room:', response.room.status);
        setGameState(response.room);
        
        // If we're the explainer and game is playing, request explainer view
        if (response.room.status === 'playing' && 
            response.room.currentRound && 
            response.room.currentRound.explainerId === user.id) {
          console.log('🎤 Requesting explainer view after reconnection');
          // Explainer view should be sent automatically by backend, but request as backup
          socket.emit('get-room-state', (resp) => {
            if (resp.success) {
              setGameState(resp.room);
            }
          });
        }
      } else {
        console.error('Failed to rejoin room:', response.error);
        localStorage.removeItem('currentRoom');
        navigate('/');
      }
    });

    socket.on('game-state-update', (state) => {
      console.log('Game state updated:', state);
      setGameState(state);
    });

    socket.on('explainer-view', (view) => {
      console.log('📝 Explainer view received:', view);
      setExplainerView(view);
      if (view) {
        setTimeRemaining(Math.floor(view.timeRemaining / 1000));
      }
    });

    socket.on('time-update', (data) => {
      setTimeRemaining(Math.floor(data.timeRemaining / 1000));
    });

    socket.on('timer-expired', () => {
      console.log('⏰ Timer expired event received');
    });

    socket.on('score-update', (data) => {
      setGameState(prev => ({
        ...prev,
        scores: data.scores
      }));
    });

    socket.on('round-ended', (result) => {
      console.log('🏁 Round ended');
      setRoundEnded(true);
      setExplainerView(null);
      // Request updated game state to get waitingForNextRound flag
      socket.emit('get-room-state', (response) => {
        if (response.success) {
          setGameState(response.room);
        }
      });
    });

    socket.on('round-started', (state) => {
      console.log('▶️ Round started');
      setGameState(state);
      setRoundEnded(false);
    });

    socket.on('game-ended', (result) => {
      console.log('🏆 GAME ENDED EVENT RECEIVED:', result);
      setGameEnded(true);
      setWinner(result);
      setRoundEnded(false); // Clear round ended state
      // Update game state with final data
      setGameState(prev => ({
        ...prev,
        status: 'finished',
        scores: result.finalScores,
        teams: result.teams
      }));
    });

    return () => {
      socket.off('game-state-update');
      socket.off('explainer-view');
      socket.off('time-update');
      socket.off('score-update');
      socket.off('round-ended');
      socket.off('round-started');
      socket.off('game-ended');
      socket.off('timer-expired');
    };
  }, [socket, connected, roomCode, navigate, user]);

  const handleGuess = async (correct) => {
    try {
      await emitWithTimeout(socket, 'guess-word', { correct }, 5000);
    } catch (error) {
      console.error('Guess error:', error.message);
      // Don't show error to user - just log it, the game state will sync
    }
  };

  const handleConfirmReady = async () => {
    console.log('Confirming ready for next round...');
    try {
      await emitWithTimeout(socket, 'confirm-ready-next-round', {}, 5000);
      console.log('Ready confirmed successfully');
    } catch (error) {
      console.error('Confirm ready error:', error.message);
    }
  };

  const handleStartNextRound = async () => {
    try {
      await emitWithTimeout(socket, 'start-next-round', {}, 5000);
    } catch (error) {
      console.error('Start round error:', error.message);
    }
  };

  const handleLeave = () => {
    if (!socket || !connected) {
      localStorage.removeItem('currentRoom');
      navigate('/');
      return;
    }
    
    socket.emit('leave-room', (response) => {
      localStorage.removeItem('currentRoom');
      navigate('/');
    });
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
          <p className="text-white/70">{t('loadingGame')}</p>
        </div>
      </div>
    );
  }

  const isExplainer = gameState.currentRound?.explainerId === user.id;
  const currentTeam = gameState.teams.find(t => t.id === gameState.currentRound?.teamId);

  // Game ended view
  if (gameEnded && winner && gameState) {
    const winningTeam = gameState.teams.find(t => t.id === winner.winner);
    console.log('Rendering game ended view:', { 
      winningTeam, 
      winner, 
      gameState,
      'gameState.scores': gameState.scores,
      'winner.finalScores': winner.finalScores
    });
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card max-w-2xl w-full text-center">
          <Trophy size={64} className="text-yellow-400 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-4 text-white">{t('gameOver')}!</h1>
          <h2 className="text-3xl mb-8 text-green font-bold">
            {winningTeam?.name} {t('wins')}! 🎉
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {gameState.teams.map(team => (
              <div key={team.id} className="card">
                <h3 className="text-xl font-bold mb-2 text-white">{team.name}</h3>
                <p className="text-4xl font-bold text-blue">
                  {gameState.scores[team.id] || winner.finalScores[team.id] || 0}
                </p>
                <p className="text-gray-300 text-sm">{t('points')}</p>
              </div>
            ))}
          </div>

          <button 
            onClick={() => {
              socket.emit('leave-room', () => {
                localStorage.removeItem('currentRoom');
                navigate('/');
              });
            }} 
            className="btn-primary"
          >
            {t('newGame')}
          </button>
        </div>
      </div>
    );
  }

  // Round ended view
  if (roundEnded || gameState?.waitingForNextRound) {
    // If no valid next explainer (game ending), show game ended screen
    if (!gameState?.nextExplainerId && gameState?.status === 'finished') {
      return null; // Will be handled by game ended view
    }

    const isNextExplainer = gameState?.nextExplainerId === user.id;
    const wasPreviousExplainer = gameState?.currentRound?.explainerId === user.id;
    const nextExplainerName = gameState?.players.find(p => p.userId === gameState?.nextExplainerId)?.username;
    console.log('Round ended view - isNextExplainer:', isNextExplainer, 'readyForNextRound:', gameState?.readyForNextRound);
    
    const handleWordAdjustment = (index, value, event) => {
      // Prevent scroll jumping on mobile
      if (event && event.target) {
        event.target.blur();
      }
      setWordAdjustments(prev => ({
        ...prev,
        [index]: value
      }));
    };

    const applyAdjustments = async () => {
      // Send adjustments to backend
      try {
        await emitWithTimeout(socket, 'adjust-word-scores', { adjustments: wordAdjustments }, 5000);
        setWordAdjustments({});
        // Refresh game state
        try {
          const resp = await emitWithTimeout(socket, 'get-room-state', {}, 5000);
          setGameState(resp.room);
        } catch (err) {
          console.error('Failed to refresh game state:', err.message);
        }
      } catch (error) {
        console.error('Failed to apply adjustments:', error.message);
      }
    };

    const handleConfirmScores = async () => {
      console.log('🎯 Confirming scores...');
      try {
        const response = await emitWithTimeout(socket, 'confirm-scores-ready', {}, 5000);
        console.log('📊 Confirm scores response:', response);
        if (response.gameEnded) {
          console.log('✅ Game will end - waiting for game-ended event');
        } else {
          console.log('➡️ Game continues to next round');
        }
      } catch (error) {
        console.error('Confirm scores error:', error.message);
      }
    };
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4 pb-safe">
        <div className="card max-w-2xl w-full text-center overflow-hidden">
          <h1 className="text-3xl font-bold mb-8">{t('roundComplete')}</h1>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {gameState.teams.map(team => (
              <div key={team.id} className="card">
                <h3 className="text-xl font-bold mb-2">{team.name}</h3>
                <p className="text-4xl font-bold text-blue">{gameState.scores[team.id]}</p>
                <p className="text-white/60 text-sm">{t('points')}</p>
              </div>
            ))}
          </div>

          {/* Word Review for Previous Explainer */}
          {wasPreviousExplainer && gameState.currentRound?.wordHistory && gameState.currentRound.wordHistory.length > 0 && (
            <div className="card mb-8">
              <h3 className="text-lg font-bold mb-4">{t('wordReview')}</h3>
              <p className="text-sm text-white/60 mb-4">{t('adjustScores')}</p>
              <div className="space-y-2 max-h-64 overflow-y-auto overscroll-contain">
                {gameState.currentRound.wordHistory.map((item, index) => {
                  const adjustment = wordAdjustments[index] !== undefined ? wordAdjustments[index] : (item.correct ? 1 : 0);
                  return (
                    <div key={index} className="flex items-center justify-between text-sm py-2 px-4 bg-white/5 rounded">
                      <span className="text-white/80 flex-1 text-left">{item.word}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleWordAdjustment(index, -1, e)}
                          className={`px-3 py-1 rounded min-w-[44px] ${adjustment === -1 ? 'bg-red text-white' : 'bg-white/10 text-white/60'}`}
                          title="Wrong answer (-1 point)"
                        >
                          -1
                        </button>
                        <button
                          onClick={(e) => handleWordAdjustment(index, 0, e)}
                          className={`px-3 py-1 rounded min-w-[44px] ${adjustment === 0 ? 'bg-gray-500 text-white' : 'bg-white/10 text-white/60'}`}
                          title="Skip (0 points)"
                        >
                          0
                        </button>
                        <button
                          onClick={(e) => handleWordAdjustment(index, 1, e)}
                          className={`px-3 py-1 rounded min-w-[44px] ${adjustment === 1 ? 'bg-green text-white' : 'bg-white/10 text-white/60'}`}
                          title="Correct (+1 point)"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {Object.keys(wordAdjustments).length > 0 && (
                <button onClick={applyAdjustments} className="btn-primary mt-4">
                  {t('applyChanges')}
                </button>
              )}
            </div>
          )}

          {/* Word History for non-explainers */}
          {!wasPreviousExplainer && gameState.currentRound?.wordHistory && gameState.currentRound.wordHistory.length > 0 && (
            <div className="card mb-8">
              <h3 className="text-lg font-bold mb-4">{t('wordHistory')}</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {gameState.currentRound.wordHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm py-2 px-4 bg-white/5 rounded">
                    <span className="text-white/80">{item.word}</span>
                    {item.correct ? (
                      <Check size={18} className="text-green" />
                    ) : (
                      <X size={18} className="text-red" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous explainer confirms scores first */}
          {wasPreviousExplainer && !gameState.explainerConfirmedScores ? (
            <button onClick={handleConfirmScores} className="btn-success flex items-center justify-center gap-2 mx-auto px-8 min-h-[48px] mb-4">
              <Check size={20} />
              {t('confirmScores')}
            </button>
          ) : isNextExplainer && gameState.explainerConfirmedScores ? (
            !gameState.readyForNextRound ? (
              <button onClick={handleConfirmReady} className="btn-success flex items-center justify-center gap-2 mx-auto px-8 min-h-[48px] mb-4">
                <Check size={20} />
                {t('readyForNextRound')}
              </button>
            ) : (
              <button onClick={handleStartNextRound} className="btn-primary flex items-center justify-center gap-2 mx-auto px-8 min-h-[48px] mb-4">
                <Play size={20} />
                {t('nextRound')}
              </button>
            )
          ) : (
            <p className="text-white/60">
              {!gameState.explainerConfirmedScores 
                ? t('waitingForExplainerConfirmation')
                : `${t('waitingForHost')} ${nextExplainerName ? `(${nextExplainerName})` : ''}`
              }
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 pb-safe overflow-hidden">
      
      {/* Main content */}
      <div className="max-w-4xl mx-auto h-[calc(100vh-2rem)]">
        {/* Main Content */}
        <div className="overflow-y-auto overscroll-contain pb-16 md:pb-8 h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleLeave}
            className="text-white/60 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            {t('leave')}
          </button>

          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold mb-1">
              {timeRemaining > 0 ? timeRemaining : '0'}
            </div>
            <div className="text-xs text-white/60">{t('seconds')}</div>
          </div>

          <div className="w-20">{/* Spacer for alignment */}</div>
        </div>

        {/* Scores and Team Members */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {gameState.teams.map(team => {
            const isActive = team.id === gameState.currentRound?.teamId;
            return (
              <div
                key={team.id}
                className={`card py-3 px-4 ${isActive ? 'border-blue ring-2 ring-blue/50' : ''}`}
              >
                <h3 className="text-base font-bold mb-1">{team.name}</h3>
                <p className="text-2xl font-bold text-blue mb-1">{gameState.scores[team.id]}</p>
                <p className="text-white/60 text-xs mb-2">/ {gameState.settings.wordsToWin}</p>
                
                {/* Team Members */}
                <div className="border-t border-white/10 pt-2 mt-2">
                  <p className="text-xs text-white/50 mb-1">{t('teamMembers')}:</p>
                  <div className="space-y-0.5">
                    {team.players.map(player => (
                      <div key={player.userId} className="text-sm text-white/80 flex items-center gap-2">
                        {gameState.currentRound?.explainerId === player.userId && isActive && (
                          <span className="text-yellow-400">🎤</span>
                        )}
                        {player.username}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Round Info */}
        <div className="card py-3 px-4 mb-3 text-center">
          <h2 className="text-lg md:text-xl font-bold mb-1">
            {currentTeam?.name}'s Turn
          </h2>
          <p className="text-sm text-white/70">
            {t('explaining')}: {gameState.players.find(p => p.userId === gameState.currentRound?.explainerId)?.username}
          </p>
        </div>

        {/* Explainer View */}
        {isExplainer && explainerView ? (
          <div className="space-y-3">
            {/* Timer Expired Warning */}
            {gameState.currentRound?.timerExpired && (
              <div className="card bg-red/20 border-red text-center">
                <p className="text-red font-bold">{t('timeExpired')}</p>
              </div>
            )}
            
            <div className="card py-4 px-4 text-center">
              <p className="text-white/60 text-xs mb-2">{t('explainThisWord')}</p>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-blue break-words">
                {explainerView.currentWord || t('noMoreWords')}
              </h1>
              <div className="flex gap-2 text-xs text-white/60 justify-center mb-3">
                <span>✓ {explainerView.wordsGuessed}</span>
                <span>✗ {explainerView.wordsSkipped}</span>
              </div>
              
              {/* Processed Words (Horizontal) */}
              {gameState.currentRound?.wordHistory && gameState.currentRound.wordHistory.length > 0 && (
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="flex flex-wrap gap-1.5 justify-center max-h-16 overflow-y-auto overscroll-contain">
                    {gameState.currentRound.wordHistory.map((item, index) => (
                      <span
                        key={index}
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          item.correct 
                            ? 'bg-green/20 text-green border border-green/30' 
                            : 'bg-red/20 text-red border border-red/30'
                        }`}
                      >
                        {item.word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 pb-safe">
              <button
                onClick={() => handleGuess(true)}
                className="btn-success py-6 text-lg flex items-center justify-center gap-2 min-h-[56px]"
              >
                <Check size={24} />
                {t('correct')}
              </button>
              <button
                onClick={() => handleGuess(false)}
                className="btn-danger py-6 text-lg flex items-center justify-center gap-2 min-h-[56px]">
                <X size={24} />
                {t('skip')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="card text-center py-8">
              <h2 className="text-2xl font-bold mb-4">
                {t('waitingForTurn')}
              </h2>
              <p className="text-white/70">
                {isExplainer 
                  ? t('yourWordWillAppear')
                  : t('explainerDescribing')}
              </p>
            </div>

            {/* Word History for non-explainers */}
            {gameState.currentRound?.wordHistory && gameState.currentRound.wordHistory.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-bold mb-3">{t('wordHistory')}</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto overscroll-contain">
                  {gameState.currentRound.wordHistory.slice().reverse().map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-white/80">{item.word}</span>
                      {item.correct ? (
                        <Check size={16} className="text-green" />
                      ) : (
                        <X size={16} className="text-red" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default Game;
