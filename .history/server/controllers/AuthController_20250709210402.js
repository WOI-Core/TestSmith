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
            return this.badRequest(res, 'Missing required fields: email, password, username');
        }

        try {
            // Step 1: Sign up the user with Supabase Auth
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email,
                password,
                options: { data: { username } },
            });

            if (authError) {
                return this.badRequest(res, authError.message);
            }

            if (!authData.user) {
                return this.internalServerError(res, new Error("Supabase returned no user data."));
            }

            // The database trigger handles creating the user profile.
            // We now just need to confirm it exists.
            const userProfile = await this.userRepository.getById(authData.user.id);

            if (!userProfile) {
                // This is a critical error if the trigger fails.
                return this.internalServerError(res, new Error("User profile not created after signup."));
            }
            
            this.created(res, { user: userProfile });

        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    login = async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return this.badRequest(res, 'Missing required fields: email, password');
        }

        try {
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                return this.unauthorized(res, "Invalid credentials.");
            }
            
            const userProfile = await this.userRepository.getById(authData.user.id);

            if (!userProfile) {
                return this.notFound(res, "User profile not found.");
            }

            this.ok(res, {
                token: authData.session.access_token,
                user: userProfile
            });
        } catch (error) {
            this.internalServerError(res, error);
        }
    };
}

module.exports = AuthController;