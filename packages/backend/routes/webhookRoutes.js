const express = require('express');
const router = express.Router();
const supabase = require('../config/database');

const SubmissionRepository = require('../repositories/SubmissionRepository');
const SubmissionService = require('../services/SubmissionService');
const WebhookController = require('../controllers/WebhookController');

const submissionRepository = new SubmissionRepository(supabase);
const submissionService = new SubmissionService(submissionRepository, supabase);
const webhookController = new WebhookController(submissionService);

router.post('/judge0', (req, res) => webhookController.handleJudge0Webhook(req, res));

module.exports = router; 