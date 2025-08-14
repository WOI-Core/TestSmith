const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

const SubmissionRepository = require('../repositories/SubmissionRepository');
const SubmissionService = require('../services/SubmissionService');
const SubmissionController = require('../controllers/SubmissionController');

// Correctly instantiate the controller with its dependencies
const submissionRepository = new SubmissionRepository(supabase);
const submissionService = new SubmissionService(submissionRepository, supabase);
const submissionController = new SubmissionController(submissionRepository, submissionService);

// Route to handle new submissions
router.post('/submit', (req, res) => submissionController.submit(req, res));
router.post('/webhook', (req, res) => submissionController.handleJudge0Webhook(req, res));

// Route to get all submissions for a specific user
router.get('/user/:userId', (req, res) => submissionController.getSubmissionsByUserId(req, res));

// Route to get a single submission by its ID
router.get('/:submissionId', (req, res) => submissionController.getSubmissionById(req, res));

module.exports = router;