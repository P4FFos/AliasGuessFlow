import pool from '../config/database.js';

class StatisticsService {
  // Update player statistics after game ends
  async updatePlayerStats(userId, teamId, gameData) {
    try {
      const { scores, teams, winner } = gameData;
      const playerTeam = teams.find(t => t.players.some(p => p.userId === userId));
      
      if (!playerTeam) return;

      const playerScore = scores[playerTeam.id];
      const won = winner?.id === playerTeam.id ? 1 : 0;

      await pool.query(
        `UPDATE users 
         SET games_played = games_played + 1,
             games_won = games_won + $1,
             total_score = total_score + $2,
             best_score = GREATEST(best_score, $2)
         WHERE id = $3`,
        [won, playerScore, userId]
      );
    } catch (error) {
      console.error('Error updating player stats:', error);
    }
  }

  // Update words guessed count
  async updateWordsGuessed(userId, count) {
    try {
      await pool.query(
        `UPDATE users 
         SET words_guessed = words_guessed + $1
         WHERE id = $2`,
        [count, userId]
      );
    } catch (error) {
      console.error('Error updating words guessed:', error);
    }
  }

  // Get player statistics
  async getPlayerStats(userId) {
    try {
      const result = await pool.query(
        `SELECT id, username, games_played, games_won, total_score, 
                best_score, words_guessed,
                CASE WHEN games_played > 0 
                     THEN ROUND((games_won::decimal / games_played * 100), 2)
                     ELSE 0 
                END as win_rate
         FROM users 
         WHERE id = $1`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting player stats:', error);
      return null;
    }
  }

  // Get leaderboard
  async getLeaderboard(limit = 100) {
    try {
      const result = await pool.query(
        `SELECT id, username, games_played, games_won, total_score, 
                best_score, words_guessed,
                CASE WHEN games_played > 0 
                     THEN ROUND((games_won::decimal / games_played * 100), 2)
                     ELSE 0 
                END as win_rate
         FROM users 
         WHERE games_played > 0
         ORDER BY total_score DESC, games_won DESC, best_score DESC
         LIMIT $1`,
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }
}

export default new StatisticsService();
