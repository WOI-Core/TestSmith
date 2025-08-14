const BaseController = require('./BaseController');

class AuthController extends BaseController {
    constructor(supabase, userRepository) {
        super();
        this.supabase = supabase;
        this.userRepository = userRepository;
    }

    signup = async (req, res) => {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            console.error("[AuthController] Signup failed: Missing required fields.");
            return this.badRequest(res, 'Missing required fields: email, password, username');
        }

        try {
            console.log(`[AuthController] Attempting signup for email: ${email}`);
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email,
                password,
                options: { data: { username } },
            });

            if (authError) {
                console.error("[AuthController] Supabase auth error:", authError.message);
                return this.badRequest(res, authError.message);
            }

            if (!authData.user) {
                const noUserDataError = new Error("Supabase returned null for user and error after signup.");
                console.error("[AuthController] Signup failed:", noUserDataError.message);
                return this.internalServerError(res, noUserDataError);
            }

            console.log(`[AuthController] Supabase user created successfully: ${authData.user.id}`);
            
            const userProfile = await this.userRepository.getById(authData.user.id);

            if (!userProfile) {
                const triggerError = new Error(`Profile verification failed for user ID ${authData.user.id}. The database trigger may have failed.`);
                console.error("[AuthController] Critical error:", triggerError.message);
                return this.internalServerError(res, triggerError);
            }

            console.log(`[AuthController] User profile verified for: ${userProfile.username}`);
            
            this.created(res, { user: userProfile });

        } catch (error) {
            console.error("[AuthController] An unexpected error occurred during signup:", error);
            this.internalServerError(res, error);
        }
    };

    login = async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return this.badRequest(res, 'Missing required fields: email, password');
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return this.unauthorized(res, "Invalid credentials.");
            }
            
            const userProfile = await this.userRepository.getById(data.user.id);

            if (!userProfile) {
                return this.notFound(res, "User profile not found.");
            }

            this.ok(res, {
                token: data.session.access_token,
                user: userProfile
            });
        } catch (error) {
            this.internalServerError(res, error);
        }
    };
}

module.exports = AuthController;