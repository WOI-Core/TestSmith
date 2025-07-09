const express = require('express');
const router = express.Router();

// Ensure the path to your config is correct
const supabase = require('../config/database'); 
const ProblemRepository = require('../repositories/ProblemRepository');
const ProblemController = require('../controllers/ProblemController');

// 1. Instantiate the repository with the Supabase client
const problemRepository = new ProblemRepository(supabase);

// 2. Instantiate the controller with the repository
const problemController = new ProblemController(problemRepository);

// 3. Define the routes and pass the correct controller methods
// This route fetches all problems
router.get('/', problemController.getAll);

// This route fetches a single problem by its ID
router.get('/:id', problemController.getById);

module.exports = router;