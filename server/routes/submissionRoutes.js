const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

const SubmissionRepository = require('../repositories/SubmissionRepository');
const SubmissionService = require('../services/SubmissionService');
const SubmissionController = require('../controllers/SubmissionController');

// Instantiate dependencies
const submissionRepository = new SubmissionRepository(supabase);
const submissionService = new SubmissionService(submissionRepository, supabase);
const submissionController = new SubmissionController(submissionRepository, submissionService);

// Define API routes, binding the controller context to each method
router.post('/submit', submissionController.submit.bind(submissionController));
router.get('/user/:userId', submissionController.getSubmissionsByUserId.bind(submissionController));
router.get('/:submissionId', submissionController.getSubmissionById.bind(submissionController));

module.exports = router;