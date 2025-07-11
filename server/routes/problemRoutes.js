// server/routes/problemRoutes.js
const express = require('express');
const ProblemController = require('../controllers/ProblemController');

const router = express.Router();

router.get('/from-storage', ProblemController.getProblemsFromStorage);

router.get('/untagged', ProblemController.getUntaggedProblems);

router.get('/details-from-storage/:problem_id', ProblemController.getProblemDetailsFromStorage);

router.get('/', ProblemController.getAllProblems);

router.get('/:id', ProblemController.getProblemById);

router.post('/', ProblemController.createProblem);

router.post('/sync-searchsmith', ProblemController.syncWithSearchsmith);

router.post('/searchsmith-results', ProblemController.getSearchsmithResults);

router.post('/search', ProblemController.searchProblems);

router.post('/cleanup-duplicates', ProblemController.cleanupDuplicates);

module.exports = router;