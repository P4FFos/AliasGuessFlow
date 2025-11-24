import { getRandomWords } from '../data/words.js';
import statisticsService from '../services/statisticsService.js';

class GameRoom {
  constructor(roomCode, hostId, settings) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.status = 'waiting'; // waiting, playing, finished
    this.settings = settings;
    this.players = new Map();
    this.teams = [];
    this.scores = {};
    this.currentRound = null;
    this.currentTeamIndex = 0;
    this.teamExplainerIndex = {}; // Track last explainer index per team
    this.words = [];
    this.usedWords = new Set();
    this.gameHistory = [];
    this.waitingForNextRound = false;
    this.readyForNextRound = false;
    this.explainerConfirmedScores = false;
    this.lastActivity = Date.now(); // Track last activity for cleanup
    this.createdAt = Date.now(); // Track when room was created
    this.spectators = new Map(); // userId -> {userId, username, socketId}
    this.chatMessages = []; // In-memory chat (could be moved to DB)
    this.timerInterval = null; // Store timer interval for cleanup
    this.isStarting = false; // Lock to prevent race condition on game start
    this.scoresAdjusted = false; // Prevent multiple score adjustments
  }

  updateActivity() {
    this.lastActivity = Date.now();
  }

  cleanup() {
    // Clear timer interval if exists
    if (this.timerInterval) {
      console.log(`🧹 Cleaning up timer for room ${this.roomCode}`);
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Clear any other potential timeouts or intervals
    this.players.clear();
    this.spectators.clear();
    this.words = [];
    this.usedWords.clear();
    this.gameHistory = [];
    this.chatMessages = [];
  }

  addPlayer(userId, username, socketId) {
    if (this.status !== 'waiting') {
      throw new Error('Cannot join game in progress');
    }

    this.players.set(userId, {
      userId,
      username,
      socketId,
      teamId: null,
      isReady: false
    });

    return this.getGameState();
  }

  removePlayer(userId) {
    this.players.delete(userId);
    
    // Remove from team
    const emptyTeamIds = [];
    this.teams.forEach(team => {
      team.players = team.players.filter(p => p.userId !== userId);
      if (team.players.length === 0) {
        emptyTeamIds.push(team.id);
      }
    });

    // Clean up empty teams and their data
    emptyTeamIds.forEach(teamId => {
      delete this.scores[teamId];
      delete this.teamExplainerIndex[teamId];
    });
    this.teams = this.teams.filter(team => team.players.length > 0);

    // If host left, assign new host
    if (userId === this.hostId && this.players.size > 0) {
      this.hostId = this.players.keys().next().value;
    }

    // If current explainer left during their turn, end the round
    if (this.currentRound && this.currentRound.explainerId === userId) {
      this.currentRound.isActive = false;
      this.waitingForNextRound = true;
    }

    // If less than 2 teams remain, end the game
    if (this.status === 'playing' && this.teams.length < 2) {
      this.status = 'finished';
      this.currentRound = null;
    }

    return this.getGameState();
  }

  assignPlayerToTeam(userId, teamId) {
    const player = this.players.get(userId);
    if (!player) throw new Error('Player not found');

    // Don't allow team changes during active game or game start
    if (this.status === 'playing' || this.isStarting) {
      throw new Error('Cannot change teams during an active game');
    }

    // Remove from old team
    if (player.teamId !== null) {
      const oldTeam = this.teams.find(t => t.id === player.teamId);
      if (oldTeam) {
        oldTeam.players = oldTeam.players.filter(p => p.userId !== userId);
      }
    }

    // Add to new team
    player.teamId = teamId;
    let team = this.teams.find(t => t.id === teamId);
    
    if (!team) {
      // Use custom team name from settings if available
      const teamName = this.settings.teamNames && this.settings.teamNames[teamId]
        ? this.settings.teamNames[teamId]
        : `Team ${teamId + 1}`;
      
      team = {
        id: teamId,
        name: teamName,
        players: [],
        score: 0
      };
      this.teams.push(team);
      this.scores[teamId] = 0;
    }

    team.players.push({
      userId: player.userId,
      username: player.username
    });

    return this.getGameState();
  }

  togglePlayerReady(userId) {
    const player = this.players.get(userId);
    if (!player) throw new Error('Player not found');
    
    player.isReady = !player.isReady;
    return this.getGameState();
  }

  canStartGame() {
    if (this.players.size < 2) return false;
    if (this.teams.length < 2) return false;
    
    // Check all teams have at least one player
    for (const team of this.teams) {
      if (team.players.length === 0) return false;
    }

    // Check all players are ready
    for (const player of this.players.values()) {
      if (!player.isReady) return false;
    }

    return true;
  }

  startGame() {
    // Prevent race condition - only one game start allowed
    if (this.isStarting) {
      throw new Error('Game is already starting');
    }
    
    if (!this.canStartGame()) {
      throw new Error('Cannot start game - not all conditions met');
    }

    this.isStarting = true;
    this.status = 'playing';
    this.words = getRandomWords(200, this.settings.difficulty, this.settings.language);
    this.usedWords.clear();
    
    // Initialize scores
    this.teams.forEach(team => {
      this.scores[team.id] = 0;
    });

    // Start first round
    this.startNewRound();
    
    return this.getGameState();
  }

  startNewRound() {
    // Reset round flags
    this.waitingForNextRound = false;
    this.readyForNextRound = false;
    this.explainerConfirmedScores = false;
    this.scoresAdjusted = false;
    
    // Rotate to next team
    if (this.currentRound) {
      this.currentTeamIndex = (this.currentTeamIndex + 1) % this.teams.length;
    }
    
    const team = this.teams[this.currentTeamIndex];
    
    // Rotate explainer within team - use tracked index per team
    if (this.teamExplainerIndex[team.id] === undefined) {
      this.teamExplainerIndex[team.id] = 0;
    } else {
      this.teamExplainerIndex[team.id] = (this.teamExplainerIndex[team.id] + 1) % team.players.length;
    }
    
    const explainerIndex = this.teamExplainerIndex[team.id];

    this.currentRound = {
      teamId: team.id,
      teamIndex: this.currentTeamIndex,
      explainerIndex,
      explainerId: team.players[explainerIndex].userId,
      startTime: Date.now(),
      endTime: Date.now() + (this.settings.roundTime * 1000),
      currentWordIndex: 0,
      wordsGuessed: [],
      wordsSkipped: [],
      wordHistory: [],
      isActive: true,
      timerExpired: false
    };

    this.waitingForNextRound = false;
    this.readyForNextRound = false;
    this.explainerConfirmedScores = false;
    return this.getCurrentWord();
  }

  confirmScoresReady() {
    this.explainerConfirmedScores = true;
    
    // Check if game should end after score confirmation
    const winnerTeamId = this.checkForWinner();
    if (winnerTeamId !== null) {
      this.endGame(winnerTeamId);
      return { gameEnded: true, winner: winnerTeamId };
    }
    
    return { gameEnded: false };
  }

  confirmReadyForNextRound() {
    this.readyForNextRound = true;
  }

  handleTimerExpired() {
    if (this.currentRound && this.currentRound.isActive) {
      this.currentRound.timerExpired = true;
      // Round stays active - explainer can still mark the current word
    }
  }

  getNextExplainerId() {
    if (!this.currentRound) return null;
    if (this.teams.length === 0) return null;
    
    const nextTeamIndex = (this.currentTeamIndex + 1) % this.teams.length;
    const nextTeam = this.teams[nextTeamIndex];
    
    if (!nextTeam || nextTeam.players.length === 0) return null;
    
    // Calculate next explainer index for that team
    let nextExplainerIndex;
    if (this.teamExplainerIndex[nextTeam.id] === undefined) {
      nextExplainerIndex = 0;
    } else {
      nextExplainerIndex = (this.teamExplainerIndex[nextTeam.id] + 1) % nextTeam.players.length;
    }
    
    return nextTeam.players[nextExplainerIndex].userId;
  }

  getCurrentWord() {
    if (!this.currentRound || !this.currentRound.isActive) {
      return null;
    }

    // Find next unused word
    while (this.currentRound.currentWordIndex < this.words.length) {
      const word = this.words[this.currentRound.currentWordIndex];
      if (!this.usedWords.has(word)) {
        return word;
      }
      this.currentRound.currentWordIndex++;
    }

    // No more words - end round automatically
    if (this.currentRound.isActive) {
      console.warn('⚠️  Word bank depleted - ending round');
      this.currentRound.isActive = false;
      this.waitingForNextRound = true;
    }
    
    return null; // No more words
  }

  guessWord(correct) {
    if (!this.currentRound || !this.currentRound.isActive) {
      throw new Error('No active round');
    }

    // Validate word exists
    if (this.currentRound.currentWordIndex >= this.words.length) {
      throw new Error('No more words available');
    }

    const word = this.words[this.currentRound.currentWordIndex];
    if (!word) {
      throw new Error('Invalid word index');
    }
    
    this.usedWords.add(word);

    // Add to word history
    this.currentRound.wordHistory.push({
      word,
      correct,
      timestamp: Date.now()
    });

    if (correct) {
      this.currentRound.wordsGuessed.push(word);
      this.scores[this.currentRound.teamId] += 1;
    } else {
      this.currentRound.wordsSkipped.push(word);
      // Skipped words decrease score by 1 (but don't go below 0)
      this.scores[this.currentRound.teamId] = Math.max(0, this.scores[this.currentRound.teamId] - 1);
    }

    this.currentRound.currentWordIndex++;

    // If timer expired, end round after marking the word
    if (this.currentRound.timerExpired) {
      const roundResult = this.endRound();
      
      // Check if any team won after round ends
      const winnerTeamId = this.checkForWinner();
      if (winnerTeamId !== null) {
        return { roundEnded: true, result: roundResult, gameWillEnd: true, potentialWinner: winnerTeamId };
      }
      
      return { roundEnded: true, result: roundResult };
    }

    return { nextWord: this.getCurrentWord() };
  }

  checkForWinner() {
    for (const [teamId, score] of Object.entries(this.scores)) {
      if (score >= this.settings.wordsToWin) {
        return parseInt(teamId);
      }
    }
    return null;
  }

  adjustWordScores(adjustments) {
    if (!this.currentRound) return;
    
    // Prevent multiple adjustments
    if (this.scoresAdjusted) {
      throw new Error('Scores already adjusted for this round');
    }

    const teamId = this.currentRound.teamId;
    let scoreDelta = 0;

    // Calculate score changes
    Object.entries(adjustments).forEach(([index, newValue]) => {
      const wordIndex = parseInt(index);
      if (this.currentRound.wordHistory[wordIndex]) {
        // Get current value (either adjusted value or original)
        const currentValue = this.currentRound.wordHistory[wordIndex].adjustedValue !== undefined
          ? this.currentRound.wordHistory[wordIndex].adjustedValue
          : (this.currentRound.wordHistory[wordIndex].correct ? 1 : -1);
        
        scoreDelta += (newValue - currentValue);
        
        // Update word history
        this.currentRound.wordHistory[wordIndex].correct = newValue === 1;
        this.currentRound.wordHistory[wordIndex].adjusted = true;
        this.currentRound.wordHistory[wordIndex].adjustedValue = newValue;
      }
    });

    // Apply score delta
    this.scores[teamId] = Math.max(0, this.scores[teamId] + scoreDelta);
    this.scoresAdjusted = true;
  }

  endRound() {
    if (!this.currentRound) return;

    this.currentRound.isActive = false;
    this.gameHistory.push({ ...this.currentRound });
    this.waitingForNextRound = true;

    return {
      guessed: this.currentRound.wordsGuessed.length,
      skipped: this.currentRound.wordsSkipped.length,
      teamScore: this.scores[this.currentRound.teamId],
      wordHistory: this.currentRound.wordHistory
    };
  }

  // Spectator methods
  addSpectator(userId, username, socketId) {
    this.spectators.set(userId, {
      userId,
      username,
      socketId
    });
    return this.getSpectatorView();
  }

  removeSpectator(userId) {
    this.spectators.delete(userId);
  }

  getSpectatorView() {
    return {
      ...this.getGameState(),
      isSpectator: true,
      currentWord: this.currentRound && this.currentRound.isActive 
        ? this.words[this.currentRound.currentWordIndex] 
        : null
    };
  }

  // Chat methods
  addChatMessage(userId, username, message) {
    const chatMessage = {
      id: Date.now() + Math.random(),
      userId,
      username,
      message,
      timestamp: Date.now()
    };
    this.chatMessages.push(chatMessage);
    
    // Keep only last 100 messages
    if (this.chatMessages.length > 100) {
      this.chatMessages = this.chatMessages.slice(-100);
    }
    
    return chatMessage;
  }

  getChatMessages(limit = 50) {
    return this.chatMessages.slice(-limit);
  }

  endGame(winnerTeamId) {
    this.status = 'finished';
    this.currentRound = null;
    
    const winnerTeam = this.teams.find(t => t.id === winnerTeamId);
    
    // Update statistics for all players
    const gameData = {
      scores: this.scores,
      teams: this.teams,
      winner: winnerTeam
    };
    
    this.players.forEach((player) => {
      statisticsService.updatePlayerStats(player.userId, player.teamId, gameData)
        .catch(err => console.error('Error updating player stats:', err));
    });
    
    return {
      winner: winnerTeamId,
      finalScores: this.scores,
      teams: this.teams
    };
  }

  getGameState() {
    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      status: this.status,
      settings: this.settings,
      players: Array.from(this.players.values()),
      teams: this.teams,
      scores: this.scores,
      spectators: Array.from(this.spectators.values()).map(s => ({userId: s.userId, username: s.username})),
      chatMessages: this.getChatMessages(),
      waitingForNextRound: this.waitingForNextRound,
      readyForNextRound: this.readyForNextRound,
      explainerConfirmedScores: this.explainerConfirmedScores,
      nextExplainerId: this.waitingForNextRound ? this.getNextExplainerId() : null,
      currentRound: this.currentRound ? {
        teamId: this.currentRound.teamId,
        explainerId: this.currentRound.explainerId,
        timeRemaining: Math.max(0, this.currentRound.endTime - Date.now()),
        isActive: this.currentRound.isActive,
        timerExpired: this.currentRound.timerExpired || false,
        wordsGuessed: this.currentRound.wordsGuessed.length,
        wordsSkipped: this.currentRound.wordsSkipped.length,
        wordHistory: this.currentRound.wordHistory || []
      } : null
    };
  }

  getExplainerView() {
    if (!this.currentRound || !this.currentRound.isActive) {
      return null;
    }

    return {
      currentWord: this.getCurrentWord(),
      timeRemaining: Math.max(0, this.currentRound.endTime - Date.now()),
      wordsGuessed: this.currentRound.wordsGuessed.length,
      wordsSkipped: this.currentRound.wordsSkipped.length,
      teamScore: this.scores[this.currentRound.teamId]
    };
  }
}

export default GameRoom;
