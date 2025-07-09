const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

const SubmissionRepository = require('../repositories/SubmissionRepository');
const SubmissionService = require('../services/SubmissionService');
const SubmissionController = require('../controllers/SubmissionController');

// Instantiate dependencies
const submissionRepository = new SubmissionRepository(supabase);
const submissionService = new SubmissionService(submissionRepository);
const submissionController = new SubmissionController(submissionRepository, submissionService);

// Define API routes and map them to the correct controller methods
router.post('/submit', submissionController.submit);
router.get('/user/:userId', submissionController.getSubmissionsByUserId);
router.get('/:submissionId', submissionController.getSubmissionById);

module.exports = router;