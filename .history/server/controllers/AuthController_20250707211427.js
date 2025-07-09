/**
 * Authentication Controller
 * Handles user registration and login
 */
const bcrypt = require("bcrypt")
const BaseController = require("./BaseController")
const UserRepository = require("../repositories/UserRepository")
const { validateUser } = require("../validators/userValidator")
const config = require("../config")

class AuthController extends BaseController {
  constructor() {
    super("AuthController")
  }

  /**
   * User registration
   */
  signup = this.asyncHandler(async (req, res) => {
    const { username, email, password, role = "user" } = req.body

    // Validate required fields
    if (!this.validateRequired(req, res, ["username", "email", "password"])) {
      return
    }

    // Validate user data
    const { error } = validateUser({ username, email, password, role })
    if (error) {
      return this.sendError(res, new Error(error.details[0].message), 400)
    }

    try {
      // Check if user already exists
      const existingUser = await UserRepository.findByUsernameOrEmail(username)
      if (existingUser) {
        return this.sendError(res, new Error("Username or email already exists"), 409)
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, config.security.saltRounds)

      // Create user
      const result = await UserRepository.createUser({
        username,
        email,
        password_hash: passwordHash,
        role,
      })

      this.sendSuccess(
        res,
        {
          userId: result.lastID,
          username,
          role,
        },
        "User created successfully",
        201,
      )
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * User login
   */
  login = this.asyncHandler(async (req, res) => {
    const { username, password } = req.body

    // Validate required fields
    if (!this.validateRequired(req, res, ["username", "password"])) {
      return
    }

    try {
      // Find user
      const user = await UserRepository.findByUsernameOrEmail(username)
      if (!user) {
        return this.sendError(res, new Error("Invalid credentials"), 401)
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      if (!isValidPassword) {
        return this.sendError(res, new Error("Invalid credentials"), 401)
      }

      this.sendSuccess(
        res,
        {
          userId: user.id,
          username: user.username,
          role: user.role || "user",
        },
        "Login successful",
      )
    } catch (error) {
      this.sendError(res, error)
    }
  })

  /**
   * Verify user role
   */
  verifyRole = this.asyncHandler(async (req, res) => {
    const { userId } = req.params

    try {
      const user = await UserRepository.findById(userId)
      if (!user) {
        return this.sendError(res, new Error("User not found"), 404)
      }

      this.sendSuccess(res, {
        role: user.role || "user",
      })
    } catch (error) {
      this.sendError(res, error)
    }
  })
}

module.exports = new AuthController()
