# 🎮 Alias Game

A real-time multiplayer word guessing game where players take turns explaining words to their teammates without using the word itself.

🌐 **Live Demo:** [aliasguessflow.online](https://www.aliasguessflow.online)

## ✨ Features

- **Real-time Multiplayer** - WebSocket-based gameplay with instant updates
- **Team-based Competition** - Create teams and compete for the highest score
- **Customizable Game Settings** - Adjust round time, winning score, and difficulty
- **Bilingual Support** - English and Russian languages
- **Player Statistics** - Track wins, games played, and best scores
- **Global Leaderboard** - Compete with players worldwide
- **Responsive Design** - Play on desktop, tablet, or mobile

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client
- **React Router** - Navigation

### Backend
- **Node.js + Express** - Server framework
- **Socket.IO** - WebSocket server
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Deployment
- **Fly.io** - Hosting (both app and database)
- **GitHub Actions** - CI/CD pipeline
- **Docker** - Containerization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## 🎯 How to Play

1. **Create/Join a Room** - Host creates a room with a unique code
2. **Form Teams** - Players join and select teams (minimum 2 teams)
3. **Set Ready** - All players mark themselves as ready
4. **Start Game** - Host starts when everyone is ready
5. **Explain Words** - Explainer describes the word without saying it
6. **Guess Correctly** - Teammates guess the word before time runs out
7. **Win** - First team to reach the target score wins!

## 📊 Game Settings

- **Round Time:** 30-180 seconds
- **Words to Win:** 10-100 points
- **Difficulty:** Easy, Medium, Hard, Mixed
- **Language:** English or Russian

## 🗂️ Project Structure

```
├── backend/             # Node.js backend
│   ├── config/          # Database configuration
│   ├── game/            # Game logic (GameRoom, GameManager)
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── sockets/         # WebSocket handlers
│   └── scripts/         # Database scripts
├── frontend/            # React frontend
│   └── src/
│       ├── components/  # Reusable components
│       ├── context/     # React context (Auth, Socket, Language)
│       ├── pages/       # Page components
│       └── utils/       # Helper functions
└── .github/workflows/   # CI/CD configuration
```

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

