/**
 * Authentication Controller
 * Handles user registration and login using Supabase Auth.
 */
const BaseController = require("./BaseController");
const UserRepository = require("../repositories/UserRepository");
const AuthRepository = require("../repositories/AuthRepository");

class AuthController extends BaseController {
  constructor() {
    super("AuthController");
  }

  signup = this.asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const { data: authData, error: authError } = await AuthRepository.signUp(email, password);

    if (authError || !authData.user) {
      return this.sendError(res, new Error(authError?.message || "Could not sign up user."), 400);
    }

    const newUser = await UserRepository.createUser(authData.user.id, username, email);
    if (!newUser) {
      return this.sendError(res, new Error("Could not create user profile after signup."), 500);
    }
    
    this.sendSuccess(res, newUser, "User created successfully.", 201);
  });

  login = this.asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!this.validateRequired(req, res, ["email", "password"])) return;

    const { data, error } = await AuthRepository.signIn(email, password);
    if (error) {
      return this.sendError(res, new Error(error.message || "Invalid credentials"), 401);
    }

    this.sendSuccess(res, data, "Login successful");
  });

  verifyRole = this.asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await UserRepository.findById(userId);
    if (!user) {
      return this.sendError(res, new Error("User not found"), 404);
    }
    this.sendSuccess(res, { role: user.role || "user" });
  });
}

module.exports = new AuthController();
