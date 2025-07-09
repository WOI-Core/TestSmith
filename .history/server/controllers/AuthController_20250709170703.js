const BaseController = require('./BaseController');

class AuthController extends BaseController {
    constructor(supabase, userRepository) {
        super();
        this.supabase = supabase;
        this.userRepository = userRepository;
    }

    /**
     * Use an arrow function for the signup method.
     * This automatically binds the correct 'this' context.
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

            // The database trigger handles profile creation.
            this.created(res, { user: data.user });

        } catch (error) {
            // This call will now work correctly.
            this.internalServerError(res, error);
        }
    };

    /**
     * Use an arrow function for the login method as well.
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
                return this.unauthorized(res, error.message);
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
            // This call will also work correctly.
            this.internalServerError(res, error);
        }
    };
}

module.exports = AuthController;