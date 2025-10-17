import jwt from 'jsonwebtoken';
import gameManager from '../game/GameManager.js';

export const setupGameSocket = (io) => {
  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Create room
    socket.on('create-room', (data, callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('create-room called without callback');
          return;
        }
        
        const { username, settings } = data;
        if (!username || !settings) {
          return callback({ success: false, error: 'Missing required fields' });
        }
        
        const room = gameManager.createRoom(socket.userId, settings);
        gameManager.joinRoom(room.roomCode, socket.userId, username, socket.id);
        
        socket.join(room.roomCode);
        console.log(`🎮 Room created: ${room.roomCode} by ${username}`);
        
        callback({ success: true, room: room.getGameState() });
      } catch (error) {
        console.error('Error creating room:', error);
        callback({ success: false, error: error.message });
      }
    });

    // Join room
    socket.on('join-room', (data, callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('join-room called without callback');
          return;
        }
        
        const { roomCode, username } = data;
        if (!roomCode || !username) {
          return callback({ success: false, error: 'Missing room code or username' });
        }
        
        // Check if player is already in room (reconnection)
        const existingRoom = gameManager.getRoomByUserId(socket.userId);
        const isReconnection = existingRoom && existingRoom.roomCode === roomCode;
        
        const room = gameManager.joinRoom(roomCode, socket.userId, username, socket.id);
        room.updateActivity();
        
        socket.join(roomCode);
        
        // Only notify others if this is a NEW player, not reconnection
        if (!isReconnection) {
          socket.to(roomCode).emit('player-joined', {
            userId: socket.userId,
            username
          });
          
          // Send updated game state to everyone in the room
          io.to(roomCode).emit('game-state-update', room.getGameState());
        }

        callback({ success: true, room: room.getGameState() });
        
        // If game is in progress and this user is the explainer, send them the word
        if (room.status === 'playing' && room.currentRound && room.currentRound.explainerId === socket.userId) {
          console.log(`🎤 Explainer reconnected, sending view`);
          socket.emit('explainer-view', room.getExplainerView());
          
          // Restart timer if it was paused due to disconnect
          if (!room.timerInterval && room.currentRound.isActive) {
            console.log(`▶️  Explainer reconnected, resuming timer`);
            startRoundTimer(io, room);
          } else if (room.timerInterval) {
            console.log(`⏰ Timer already running`);
          }
        }
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Get room state (for players already in room)
    socket.on('get-room-state', (callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('get-room-state called without callback');
          return;
        }
        
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }
        
        room.updateActivity();

        callback({ success: true, room: room.getGameState() });
        
        // If game is in progress and this user is the explainer, send them the word
        if (room.status === 'playing' && room.currentRound && room.currentRound.explainerId === socket.userId) {
          console.log(`🎤 Sending explainer view via get-room-state`);
          socket.emit('explainer-view', room.getExplainerView());
          
          // Ensure timer is running for active rounds
          if (!room.timerInterval && room.currentRound.isActive) {
            console.log(`▶️  Starting timer from get-room-state`);
            startRoundTimer(io, room);
          }
        }
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Leave room
    socket.on('leave-room', (callback) => {
      try {
        const roomCode = gameManager.userRooms.get(socket.userId);
        const result = gameManager.leaveRoom(socket.userId);
        
        if (result && !result.roomDeleted && roomCode) {
          const room = gameManager.rooms.get(roomCode);
          if (room) {
            // Emit updated game state to remaining players
            io.to(roomCode).emit('game-state-update', room.getGameState());
          }
          socket.to(roomCode).emit('player-left', { userId: socket.userId });
          socket.leave(roomCode);
        }

        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Assign team
    socket.on('assign-team', (data, callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('assign-team called without callback');
          return;
        }
        const { teamId } = data;
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        room.updateActivity();
        room.assignPlayerToTeam(socket.userId, teamId);
        
        io.to(room.roomCode).emit('game-state-update', room.getGameState());
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Update settings
    socket.on('update-settings', (data, callback) => {
      try {
        const { settings } = data;
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        if (room.hostId !== socket.userId) {
          throw new Error('Only host can update settings');
        }

        if (room.status !== 'waiting') {
          throw new Error('Cannot update settings after game started');
        }

        // Validate settings - type checking and bounds
        if (typeof settings.roundTime !== 'number' || isNaN(settings.roundTime)) {
          throw new Error('Round time must be a number');
        }
        if (settings.roundTime < 30 || settings.roundTime > 180) {
          throw new Error('Round time must be between 30 and 180 seconds');
        }

        if (typeof settings.wordsToWin !== 'number' || isNaN(settings.wordsToWin)) {
          throw new Error('Words to win must be a number');
        }
        if (settings.wordsToWin < 10 || settings.wordsToWin > 100) {
          throw new Error('Words to win must be between 10 and 100');
        }

        if (typeof settings.difficulty !== 'string' || !['easy', 'medium', 'hard', 'mixed'].includes(settings.difficulty)) {
          throw new Error('Invalid difficulty level');
        }

        if (typeof settings.language !== 'string' || !['en', 'ru'].includes(settings.language)) {
          throw new Error('Invalid language');
        }

        // Update settings
        room.updateActivity();
        room.settings = settings;
        
        // Update existing team names if provided
        if (settings.teamNames) {
          room.teams.forEach(team => {
            if (settings.teamNames[team.id]) {
              team.name = settings.teamNames[team.id];
            }
          });
        }
        
        io.to(room.roomCode).emit('game-state-update', room.getGameState());
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Toggle ready
    socket.on('toggle-ready', (callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('toggle-ready called without callback');
          return;
        }
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        room.updateActivity();
        room.togglePlayerReady(socket.userId);
        
        io.to(room.roomCode).emit('game-state-update', room.getGameState());
        callback({ success: true, canStart: room.canStartGame() });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Start game
    socket.on('start-game', (callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('start-game called without callback');
          return;
        }
        
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        if (room.hostId !== socket.userId) {
          throw new Error('Only host can start the game');
        }
        
        // Prevent double start
        if (room.status === 'playing') {
          console.warn('⚠️ Game already started');
          return callback({ success: false, error: 'Game already started' });
        }

        room.updateActivity();
        room.startGame();
        
        io.to(room.roomCode).emit('game-started', room.getGameState());
        
        // Send word to explainer
        const explainerSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.userId === room.currentRound.explainerId);
        
        if (explainerSocket) {
          explainerSocket.emit('explainer-view', room.getExplainerView());
        }

        // Start round timer
        startRoundTimer(io, room);

        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Guess word (correct/skip)
    socket.on('guess-word', (data, callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('guess-word called without callback');
          return;
        }
        const { correct } = data;
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        if (!room.currentRound || room.currentRound.explainerId !== socket.userId) {
          throw new Error('Not your turn to explain');
        }

        room.updateActivity();
        const result = room.guessWord(correct);
        
        if (result.gameEnded) {
          // Game ended - endGame already called in guessWord
          io.to(room.roomCode).emit('game-ended', {
            winner: result.winner,
            finalScores: room.scores,
            teams: room.teams
          });
          callback({ success: true, gameEnded: true });
        } else if (result.roundEnded) {
          // Round ended after timer expired
          io.to(room.roomCode).emit('round-ended', result.result);
          callback({ success: true, roundEnded: true });
        } else {
          // Update scores for all (game still in progress)
          io.to(room.roomCode).emit('score-update', {
            scores: room.scores,
            teamId: room.currentRound.teamId
          });
          
          // Send updated game state to all players (includes word history)
          io.to(room.roomCode).emit('game-state-update', room.getGameState());
          
          // Send next word to explainer
          socket.emit('explainer-view', room.getExplainerView());
          callback({ success: true, nextWord: result.nextWord });
        }
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // End round manually
    socket.on('end-round', (callback) => {
      try {
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        const roundResult = room.endRound();
        
        io.to(room.roomCode).emit('round-ended', roundResult);
        
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Confirm ready for next round
    socket.on('confirm-ready-next-round', (callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('confirm-ready-next-round called without callback');
          return;
        }
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        // Get the next explainer ID using the room's method
        const nextExplainerId = room.getNextExplainerId();
        
        if (!nextExplainerId) {
          throw new Error('Could not determine next explainer');
        }

        // Only the next explainer can confirm ready
        if (socket.userId !== nextExplainerId) {
          throw new Error('Only the next explainer can confirm ready');
        }

        room.updateActivity();
        room.confirmReadyForNextRound();
        io.to(room.roomCode).emit('game-state-update', room.getGameState());

        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Start next round (only after ready confirmation)
    socket.on('start-next-round', (callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('start-next-round called without callback');
          return;
        }
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        if (!room.readyForNextRound) {
          throw new Error('Must confirm ready first');
        }

        room.updateActivity();
        room.startNewRound();
        
        io.to(room.roomCode).emit('round-started', room.getGameState());
        
        // Send word to new explainer
        const explainerSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.userId === room.currentRound.explainerId);
        
        if (explainerSocket) {
          explainerSocket.emit('explainer-view', room.getExplainerView());
        }

        // Start round timer
        startRoundTimer(io, room);

        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Adjust word scores
    socket.on('adjust-word-scores', (data, callback) => {
      try {
        const { adjustments } = data;
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        if (!room.currentRound || room.currentRound.explainerId !== socket.userId) {
          throw new Error('Only the explainer can adjust scores');
        }

        room.updateActivity();
        room.adjustWordScores(adjustments);
        io.to(room.roomCode).emit('game-state-update', room.getGameState());

        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Confirm scores ready (previous explainer)
    socket.on('confirm-scores-ready', (callback) => {
      try {
        if (!callback || typeof callback !== 'function') {
          console.error('confirm-scores-ready called without callback');
          return;
        }
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        if (!room.currentRound || room.currentRound.explainerId !== socket.userId) {
          throw new Error('Only the previous explainer can confirm scores');
        }

        room.updateActivity();
        const result = room.confirmScoresReady();
        
        if (result.gameEnded) {
          // Game ended after score confirmation
          io.to(room.roomCode).emit('game-ended', {
            winner: result.winner,
            finalScores: room.scores,
            teams: room.teams
          });
          callback({ success: true, gameEnded: true });
        } else {
          io.to(room.roomCode).emit('game-state-update', room.getGameState());
          callback({ success: true });
        }
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Chat message
    socket.on('send-chat-message', (data, callback) => {
      try {
        const { message } = data;
        const room = gameManager.getRoomByUserId(socket.userId);
        
        if (!room) {
          throw new Error('Not in a room');
        }

        if (!message || message.trim().length === 0) {
          throw new Error('Message cannot be empty');
        }

        if (message.length > 500) {
          throw new Error('Message too long');
        }

        room.updateActivity();
        const chatMessage = room.addChatMessage(socket.userId, socket.username, message.trim());
        
        // Broadcast to room
        io.to(room.roomCode).emit('chat-message', chatMessage);
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Join as spectator
    socket.on('join-as-spectator', (data, callback) => {
      try {
        const { roomCode } = data;
        const room = gameManager.getRoom(roomCode);
        
        if (!room) {
          throw new Error('Room not found');
        }

        room.addSpectator(socket.userId, socket.username, socket.id);
        socket.join(roomCode);
        
        callback({ success: true, room: room.getSpectatorView() });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Leave spectator mode
    socket.on('leave-spectator', (callback) => {
      try {
        const roomCode = gameManager.userRooms.get(socket.userId);
        const room = gameManager.getRoom(roomCode);
        
        if (room) {
          room.removeSpectator(socket.userId);
          socket.leave(roomCode);
        }
        
        callback({ success: true });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      const result = gameManager.handleDisconnect(socket.id);
      
      if (result) {
        const room = gameManager.getRoom(result.roomCode);
        
        // If the explainer disconnected during their turn, pause the timer
        if (room && room.status === 'playing' && room.currentRound && 
            room.currentRound.explainerId === result.userId && 
            room.timerInterval) {
          console.log(`⏸️  Explainer disconnected, pausing timer`);
          clearInterval(room.timerInterval);
          room.timerInterval = null;
        }
        
        io.to(result.roomCode).emit('player-disconnected', {
          userId: result.userId
        });
      }
    });
  });
};

// Helper function to manage round timer
const startRoundTimer = (io, room) => {
  // Clear existing timer if any
  if (room.timerInterval) {
    console.log(`⏰ Clearing existing timer for room ${room.roomCode}`);
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  
  console.log(`⏰ Starting new timer for room ${room.roomCode}`);
  let tickCount = 0;
  
  room.timerInterval = setInterval(() => {
    tickCount++;
    
    // Safety check: if room doesn't exist or is finished, clear timer
    if (!room || room.status === 'finished') {
      console.log(`⏰ Room finished, clearing timer (room: ${room?.roomCode})`);
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      return;
    }
    
    if (!room.currentRound || !room.currentRound.isActive) {
      console.log(`⏰ Round inactive, clearing timer (room: ${room.roomCode})`);
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      return;
    }

    const timeRemaining = room.currentRound.endTime - Date.now();
    
    if (timeRemaining <= 0 && !room.currentRound.timerExpired) {
      // Timer expired - mark it but don't end round yet
      console.log(`⏰ Timer expired for room ${room.roomCode}`);
      room.handleTimerExpired();
      io.to(room.roomCode).emit('timer-expired');
      io.to(room.roomCode).emit('game-state-update', room.getGameState());
      // Keep checking in case round needs to end
    } else if (timeRemaining > 0) {
      // Send time updates every second
      io.to(room.roomCode).emit('time-update', {
        timeRemaining: Math.max(0, timeRemaining)
      });
    }
    
    // Safety: auto-clear after 5 minutes to prevent orphaned timers
    if (tickCount > 300) {
      console.warn(`⚠️ Timer ran for 5+ minutes, force clearing (room: ${room.roomCode})`);
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
  }, 1000);
};

export default setupGameSocket;
