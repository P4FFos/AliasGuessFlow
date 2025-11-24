import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

const translations = {
  en: {
    // App name
    appName: 'AliasGuessFlow',
    
    // Auth
    login: 'Login',
    register: 'Register',
    username: 'Username',
    password: 'Password',
    alreadyHaveAccount: 'Already have an account?',
    loginHere: 'Login here',
    dontHaveAccount: "Don't have an account?",
    registerHere: 'Register here',
    createAccount: 'Create your account to start playing!',
    welcomeBack: 'Welcome back! Login to continue.',
    logout: 'Logout',
    atLeast6Characters: 'At least 6 characters',
    
    // Home
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    enterRoomCode: 'Enter room code',
    join: 'Join',
    
    // Lobby
    gameLobby: 'Game Lobby',
    leave: 'Leave',
    team: 'Team',
    waitingToJoinTeam: 'Waiting to Join Team',
    noPlayersYet: 'No players yet',
    gameSettings: 'Game Settings',
    edit: 'Edit',
    hide: 'Hide',
    roundTime: 'Round Time (seconds)',
    wordsToWin: 'Words to Win',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    mixed: 'Mixed',
    save: 'Save',
    cancel: 'Cancel',
    startGame: 'Start Game',
    ready: 'Ready',
    notReady: 'Not Ready',
    allPlayersMustBeInTeams: 'All players must be in teams and ready to start',
    
    // Game
    round: 'Round',
    explaining: 'Explaining',
    guessing: 'Guessing',
    timeLeft: 'Time Left',
    score: 'Score',
    correct: 'Correct',
    skip: 'Skip',
    waitingForTurn: 'Waiting for turn...',
    gameOver: 'Game Over!',
    wins: 'wins!',
    backToLobby: 'Back to Lobby',
    newGame: 'New Game',
    roundComplete: 'Round Complete!',
    nextRound: 'Next Round',
    readyForNextRound: 'Ready for Next Round',
    waitingForHost: 'Waiting for next explainer to start...',
    wordHistory: 'Word History',
    timeExpired: 'Time Expired! Mark the current word to end the round.',
    noMoreWords: 'No more words available!',
    teamMembers: 'Team Members',
    adjustScores: 'Adjust Scores',
    wordReview: 'Word Review',
    applyChanges: 'Apply Changes',
    confirmScores: 'Confirm Scores',
    waitingForExplainerConfirmation: 'Waiting for previous explainer to confirm scores...',
    
    // Common
    copied: 'Copied!',
    seconds: 's',
    points: 'points',
    welcome: 'Welcome',
    connectingToServer: 'Connecting to server...',
    notConnected: 'Not connected to server',
    reconnecting: 'Reconnecting to server...',
    loading: 'Loading...',
    loadingLobby: 'Loading lobby...',
    loadingStatistics: 'Loading statistics...',
    startingGame: 'Starting game...',
    updatingSettings: 'Updating settings...',
    startNewGame: 'Start a new game',
    enterRoomCodeDescription: 'Enter a room code to join existing game',
    switchLanguage: 'Switch language',
    explainThisWord: 'Explain this word:',
    yourWordWillAppear: 'Your word will appear soon',
    explainerDescribing: 'The explainer is describing a word to their team',
    loadingGame: 'Loading game...',
    copyRoomCode: 'Copy room code',
    copyLobbyLink: 'Copy lobby link',
    copyLink: 'Copy Link',
    shareLobby: 'Share lobby',
    share: 'Share',
    linkCopied: 'Link copied!',
    
    // Chat
    chat: 'Chat',
    noMessagesYet: 'No messages yet. Say hi! 👋',
    typeMessage: 'Type a message...',
    
    // Statistics
    statistics: 'Statistics',
    myStats: 'My Stats',
    leaderboard: 'Leaderboard',
    gamesPlayed: 'Games Played',
    winRate: 'Win Rate',
    bestScore: 'Best Score',
    totalScore: 'Total Score',
    wordsGuessed: 'Words Guessed',
    detailedStats: 'Detailed Statistics',
    avgScore: 'Average Score',
    globalLeaderboard: 'Global Leaderboard',
    noData: 'No data available yet. Play some games!',
    back: 'Back',
  },
  ru: {
    // App name
    appName: 'AliasGuessFlow',
    
    // Auth
    login: 'Войти',
    register: 'Регистрация',
    username: 'Имя пользователя',
    password: 'Пароль',
    alreadyHaveAccount: 'Уже есть аккаунт?',
    loginHere: 'Войти',
    dontHaveAccount: 'Нет аккаунта?',
    registerHere: 'Зарегистрироваться',
    createAccount: 'Создайте аккаунт, чтобы начать играть!',
    welcomeBack: 'С возвращением! Войдите, чтобы продолжить.',
    logout: 'Выйти',
    atLeast6Characters: 'Минимум 6 символов',
    
    // Home
    createRoom: 'Создать комнату',
    joinRoom: 'Присоединиться',
    enterRoomCode: 'Введите код комнаты',
    join: 'Войти',
    
    // Lobby
    gameLobby: 'Игровое лобби',
    leave: 'Выйти',
    team: 'Команда',
    waitingToJoinTeam: 'Ожидание присоединения к команде',
    noPlayersYet: 'Пока нет игроков',
    gameSettings: 'Настройки игры',
    edit: 'Изменить',
    hide: 'Скрыть',
    roundTime: 'Время раунда (секунды)',
    wordsToWin: 'Слов для победы',
    difficulty: 'Сложность',
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Сложно',
    mixed: 'Смешанно',
    saveSettings: 'Сохранить настройки',
    startGame: 'Начать игру',
    ready: 'Готов',
    notReady: 'Не готов',
    allPlayersMustBeInTeams: 'Все игроки должны быть в командах и готовы к старту',
    
    // Game
    round: 'Раунд',
    explaining: 'Объясняет',
    guessing: 'Угадывает',
    timeLeft: 'Осталось времени',
    score: 'Счёт',
    correct: 'Правильно',
    skip: 'Пропустить',
    waitingForTurn: 'Ожидание хода...',
    gameOver: 'Игра окончена!',
    wins: 'победила!',
    backToLobby: 'Вернуться в лобби',
    newGame: 'Новая игра',
    roundComplete: 'Раунд завершён!',
    nextRound: 'Следующий раунд',
    readyForNextRound: 'Готов к следующему раунду',
    waitingForHost: 'Ожидание следующего объясняющего...',
    wordHistory: 'История слов',
    timeExpired: 'Время истекло! Отметьте текущее слово, чтобы завершить раунд.',
    noMoreWords: 'Слова закончились!',
    teamMembers: 'Участники команды',
    adjustScores: 'Изменить очки',
    wordReview: 'Проверка слов',
    applyChanges: 'Применить изменения',
    confirmScores: 'Подтвердить очки',
    waitingForExplainerConfirmation: 'Ожидание подтверждения очков от объясняющего...',
    
    // Common
    copied: 'Скопировано!',
    seconds: 'с',
    points: 'очков',
    welcome: 'Добро пожаловать',
    connectingToServer: 'Подключение к серверу...',
    notConnected: 'Нет подключения к серверу',
    reconnecting: 'Переподключение к серверу...',
    loading: 'Загрузка...',
    loadingLobby: 'Загрузка лобби...',
    loadingStatistics: 'Загрузка статистики...',
    startingGame: 'Начинаем игру...',
    updatingSettings: 'Обновление настроек...',
    startNewGame: 'Начать новую игру',
    enterRoomCodeDescription: 'Введите код комнаты, чтобы присоединиться',
    switchLanguage: 'Сменить язык',
    explainThisWord: 'Объясните это слово:',
    yourWordWillAppear: 'Ваше слово скоро появится',
    explainerDescribing: 'Объясняющий описывает слово своей команде',
    loadingGame: 'Загрузка игры...',
    copyRoomCode: 'Скопировать код комнаты',
    copyLobbyLink: 'Скопировать ссылку на лобби',
    copyLink: 'Скопировать ссылку',
    shareLobby: 'Поделиться лобби',
    share: 'Поделиться',
    linkCopied: 'Ссылка скопирована!',
    
    // Chat
    chat: 'Чат',
    noMessagesYet: 'Пока нет сообщений. Поздоровайтесь! 👋',
    typeMessage: 'Введите сообщение...',
    
    // Statistics
    statistics: 'Статистика',
    myStats: 'Моя статистика',
    leaderboard: 'Таблица лидеров',
    gamesPlayed: 'Игр сыграно',
    winRate: 'Процент побед',
    bestScore: 'Лучший счёт',
    totalScore: 'Общий счёт',
    wordsGuessed: 'Слов угадано',
    detailedStats: 'Подробная статистика',
    avgScore: 'Средний счёт',
    globalLeaderboard: 'Глобальная таблица лидеров',
    noData: 'Нет данных. Сыграйте несколько игр!',
    back: 'Назад',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'ru' : 'en');
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
