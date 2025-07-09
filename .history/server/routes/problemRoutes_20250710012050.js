const express = require('express');
const ProblemController = require('../controllers/ProblemController');

const router = express.Router();

// Route to get all problems from the database table (if still needed)
router.get('/', ProblemController.getAllProblems);

// New route to get problems from Supabase Storage bucket
router.get('/from-storage', ProblemController.getProblemsFromStorage);

// Route to get a single problem by ID from the database table (if still needed)
router.get('/:id', ProblemController.getProblemById);

// Route to create a new problem (inserts into DB and uploads to storage)
router.post('/', ProblemController.createProblem);

// Route to sync a problem with SearchSmith (fetches from storage, updates DB)
router.post('/sync-searchsmith', ProblemController.syncWithSearchsmith);

// Route to search problems (proxied to SearchSmith)
router.post('/search', ProblemController.searchProblems);


module.exports = router;
