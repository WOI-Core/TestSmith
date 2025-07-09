const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const ProblemRepository = require('../repositories/ProblemRepository');
const ProblemController = require('../controllers/ProblemController');

const problemRepository = new ProblemRepository(supabase);
const problemController = new ProblemController(problemRepository);

router.get('/', problemController.getAll);
router.get('/:id', problemController.getById);

module.exports = router;