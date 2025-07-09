/**
 * Authentication Controller
 * Handles user registration and login using Supabase Auth.
 */
const BaseController = require("./BaseController");
const UserRepository = require("../repositories/UserRepository");
const AuthRepository = require("../repositories/AuthRepository");
const { validateUser } = require("../validators/userValidator");

class AuthController extends BaseController {
  constructor() {
    super("AuthController");
  }

  /**
   * User registration using Supabase Auth
   */
  signup = this.asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    const { data: authData, error: authError } = await AuthRepository.signUp(email, password);

    if (authError || !authData.user) {
      return this.sendError(res, new Error(authError?.message || "Could not sign up user."), 400);
    }

    const newUser = await UserRepository.createUser(
      authData.user.id,
      username,
      email
    );

    if (!newUser) {
        return this.sendError(res, new Error("Could not create user profile after signup."), 500);
    }
    
    this.sendSuccess(
      res,
      {
        userId: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
      "User created successfully. Please check your email to verify your account.",
      201
    );
  });

  /**
   * User login using Supabase Auth
   */
  login = this.asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!this.validateRequired(req, res, ["email", "password"])) {
      return;
    }

    const { data, error } = await AuthRepository.signIn(email, password);

    if (error) {
      return this.sendError(res, new Error(error.message || "Invalid credentials"), 401);
    }

    this.sendSuccess(
      res,
      {
        user: data.user,
        session: data.session,
      },
      "Login successful"
    );
  });

  /**
   * Verify user role
   */
  verifyRole = this.asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await UserRepository.findById(userId);
    if (!user) {
      return this.sendError(res, new Error("User not found"), 404);
    }

    this.sendSuccess(res, {
      role: user.role || "user",
    });
  });
}

module.exports = new AuthController();
