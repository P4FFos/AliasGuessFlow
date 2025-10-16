import pool from '../config/database.js';

const initDb = async () => {
  try {
    console.log('Initializing database...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        words_guessed INTEGER DEFAULT 0
      );
    `);

    // Create game_rooms table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_rooms (
        id SERIAL PRIMARY KEY,
        room_code VARCHAR(10) UNIQUE NOT NULL,
        host_id INTEGER REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'waiting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        settings JSONB DEFAULT '{"roundTime": 60, "wordsToWin": 50, "teamsCount": 2}'::jsonb
      );
    `);

    // Create game_sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES game_rooms(id) ON DELETE CASCADE,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        winner_team INTEGER,
        game_data JSONB
      );
    `);

    // Create chat_messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        room_code VARCHAR(10) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        username VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Alter existing users table to add statistics columns (if not exist)
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS games_played INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS games_won INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS best_score INTEGER DEFAULT 0;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS words_guessed INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_game_rooms_code ON game_rooms(room_code);
      CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_code);
    `);

    console.log('Database initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
};

initDb();
