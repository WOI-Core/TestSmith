const express = require("express");
const router = express.Router();

const SupabaseService = require('../services/SupabaseService');
const ProblemController = require("../controllers/ProblemController");

const supabaseService = new SupabaseService();
const problemController = new ProblemController(supabaseService);

// Route to get the list of all problems
router.get("/", problemController.getAll);

// Route to get a single problem by its ID
router.get("/:id", problemController.getById);

module.exports = router;