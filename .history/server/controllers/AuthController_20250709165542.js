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
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { username },
                },
            });

            if (error) {
                return this.badRequest(res, error.message);
            }

            // The database trigger now handles profile creation automatically.
            // No need to call userRepository.create() here.

            this.created(res, { user: data.user });

        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    login = async (req, res) => {
        this.validateRequired(req.body, ['email', 'password']);
        const { email, password } = req.body;

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return this.unauthorized(res, error.message);
            }
            
            const userProfile = await this.userRepository.getById(data.user.id);

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