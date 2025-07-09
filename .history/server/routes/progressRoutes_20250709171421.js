const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

const ProgressRepository = require('../repositories/ProgressRepository');
const ProgressController = require('../controllers/ProgressController');

// Instantiate dependencies
const progressRepository = new ProgressRepository(supabase);
const progressController = new ProgressController(progressRepository);

// Define API routes and map them to the correct controller methods
router.get('/user/:userId', progressController.getUserProgress);
router.get('/leaderboard', progressController.getLeaderboard);

module.exports = router;