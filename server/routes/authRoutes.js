/**
 * Authentication Routes
 * Handles user registration, login, and role verification
 */
const express = require("express")
const AuthController = require("../controllers/AuthController")

const router = express.Router()

// POST /api/auth/signup - User registration
router.post("/signup", AuthController.signup)

// POST /api/auth/login - User login
router.post("/login", AuthController.login)

// GET /api/auth/verify-role/:userId - Verify user role
router.get("/verify-role/:userId", AuthController.verifyRole)

module.exports = router
