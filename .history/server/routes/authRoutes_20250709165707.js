/**
 * Authentication Routes
 * Defines the routes for user authentication
 */
const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/AuthController");

// POST /api/auth/signup
router.post("/signup", AuthController.signup);

// POST /api/auth/login
router.post("/login", AuthController.login);

// GET /api/auth/verify/:userId
router.get("/verify/:userId", AuthController.verifyRole);

module.exports = router;
