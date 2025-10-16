import pool from '../config/database.js';

const clearStats = async () => {
  try {
    console.log('🧹 Clearing all player statistics...');

    // Reset all statistics columns to 0
    const result = await pool.query(
      `UPDATE users 
       SET games_played = 0,
           games_won = 0,
           total_score = 0,
           best_score = 0,
           words_guessed = 0
       WHERE games_played > 0 OR games_won > 0 OR total_score > 0`
    );

    console.log(`✅ Cleared statistics for ${result.rowCount} user(s)`);

    // Verify the reset
    const checkResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE games_played > 0 OR games_won > 0 OR total_score > 0`
    );

    if (checkResult.rows[0].count === '0') {
      console.log('✅ All statistics successfully cleared!');
    } else {
      console.log(`⚠️  Warning: ${checkResult.rows[0].count} users still have statistics`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing stats:', error);
    process.exit(1);
  }
};

clearStats();
