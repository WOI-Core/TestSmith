const BaseController = require('./BaseController');

class AuthController extends BaseController {
    constructor(supabase, userRepository) {
        super();
        this.supabase = supabase;
        this.userRepository = userRepository;
    }

    // Use arrow functions to preserve the 'this' context
    signup = async (req, res) => {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            return this.badRequest(res, 'Missing required fields: email, password, username');
        }

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username },
                },
            });

            if (error) {
                // Use the inherited badRequest method
                return this.badRequest(res, error.message);
            }

            // The database trigger handles profile creation.
            // Respond with the user data from the auth signup.
            this.created(res, { user: data.user });

        } catch (error) {
            // Use the inherited internalServerError method
            this.internalServerError(res, error);
        }
    };

    // Use arrow functions to preserve the 'this' context
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
                return this.unauthorized(res, error.message);
            }
            
            // Fetch the full user profile from your public.users table
            const userProfile = await this.userRepository.getById(data.user.id);

            if (!userProfile) {
                return this.notFound(res, "User profile not found.");
            }

            this.ok(res, {
                token: data.session.access_token,
                user: userProfile // Send the full profile
            });
        } catch (error) {
            this.internalServerError(res, error);
        }
    };
}

module.exports = AuthController;