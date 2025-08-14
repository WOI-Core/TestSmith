const BaseController = require('./BaseController');

class ProgressController extends BaseController {
    constructor(progressRepository) {
        super();
        this.progressRepository = progressRepository;
    }

    getUserProgress = async (req, res) => {
        try {
            const { userId } = req.params;
            if (!userId) {
                return this.badRequest(res, 'User ID is required.');
            }
            const progress = await this.progressRepository.getUserProgress(userId);
            this.ok(res, progress);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    getLeaderboard = async (req, res) => {
        try {
            const leaderboard = await this.progressRepository.getLeaderboard();
            // Send the leaderboard data directly
            this.ok(res, leaderboard);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };
}

module.exports = ProgressController;