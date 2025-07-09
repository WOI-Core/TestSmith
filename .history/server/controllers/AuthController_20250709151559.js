/**
 * Authentication Controller
 * Handles user registration and login using Supabase Auth.
 */
const BaseController = require("./BaseController");
const UserRepository = require("../repositories/UserRepository");
const AuthRepository = require("../repositories/AuthRepository"); // Import the new repository
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

    // 1. First, sign up the user with the Supabase Auth service
    const { data: authData, error: authError } = await AuthRepository.signUp(email, password);

    if (authError || !authData.user) {
      // Handle errors from Supabase Auth, e.g., user already exists
      return this.sendError(res, new Error(authError?.message || "Could not sign up user."), 400);
    }

    // 2. If sign-up is successful, create a corresponding public profile in your 'users' table
    // We use the ID from the authenticated user as the primary key in our public table.
    // NOTE: We do NOT store the password hash here. Supabase handles that securely.
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
}

module.exports = new AuthController();
