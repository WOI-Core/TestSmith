const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

const ProgressRepository = require('../repositories/ProgressRepository');
const ProgressController = require('../controllers/ProgressController');

// This will now work correctly
const progressRepository = new ProgressRepository(supabase);
const progressController = new ProgressController(progressRepository);

router.get('/user/:userId', progressController.getUserProgress);
router.get('/leaderboard', progressController.getLeaderboard);

module.exports = router;