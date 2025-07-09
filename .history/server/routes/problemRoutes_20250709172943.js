const express = require("express");
const router = express.Router();

const SupabaseService = require('../services/SupabaseService');
const ProblemController = require("../controllers/ProblemController");

const supabaseService = new SupabaseService();
const problemController = new ProblemController(supabaseService);

router.get("/", problemController.getAll);

module.exports = router;