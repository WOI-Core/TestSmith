const BaseController = require('./BaseController');

class AuthController extends BaseController {
    constructor(supabase, userRepository) {
        super();
        this.supabase = supabase;
        this.userRepository = userRepository;
    }

    /**
     * Handles user signup.
     * Defined as an arrow function to bind 'this'.
     */
    signup = async (req, res) => {
        const { email, password, username } = req.body;

        if (!email || !password || !username) {
            return this.badRequest(res, 'Missing required fields: email, password, username');
        }

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: { data: { username } },
            });

            if (error) {
                return this.badRequest(res, error.message);
            }

            this.created(res, { user: data.user });

        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    /**
     * Handles user login.
     * Defined as an arrow function to bind 'this'.
     */
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
                // This call will now work correctly.
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