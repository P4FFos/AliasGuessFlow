import express from 'express';
import jwt from 'jsonwebtoken';
import statisticsService from '../services/statisticsService.js';

const router = express.Router();

// Auth middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Get current user's statistics
router.get('/me', authenticate, async (req, res) => {
  try {
    const stats = await statisticsService.getPlayerStats(req.userId);
    res.json(stats || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific user's statistics
router.get('/user/:userId', async (req, res) => {
  try {
    const stats = await statisticsService.getPlayerStats(parseInt(req.params.userId));
    res.json(stats || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const leaderboard = await statisticsService.getLeaderboard(limit);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
