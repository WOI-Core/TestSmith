const express = require("express");
const router = express.Router();

const SupabaseService = require('../services/SupabaseService');
const ProblemController = require("../controllers/ProblemController");

console.log('[Routes] Initializing Problem routes...');

const supabaseService = new SupabaseService();
const problemController = new ProblemController(supabaseService);

router.get("/", (req, res, next) => {
    console.log('[Routes] Matched GET /api/problems');
    problemController.getAll(req, res, next);
});

router.get("/:id", (req, res, next) => {
    console.log(`[Routes] Matched GET /api/problems/:id with id: "${req.params.id}"`);
    problemController.getById(req, res, next);
});

module.exports = router;