const express = require('express');
const router = express.Router();

// Adjust the path based on your project structure
const supabase = require('../config/supabaseClient'); 
const ProblemRepository = require('../repositories/ProblemRepository');
const ProblemController = require('../controllers/ProblemController');

// 1. Instantiate the repository
const problemRepository = new ProblemRepository(supabase);

// 2. Instantiate the controller with the repository
const problemController = new ProblemController(problemRepository);

// 3. Define the routes and pass the controller methods as callbacks
// This route handles fetching all problems (e.g., GET /api/problems)
router.get('/', problemController.getAll);

// This route handles fetching a single problem by its ID (e.g., GET /api/problems/2124I)
router.get('/:id', problemController.getById);

module.exports = router;