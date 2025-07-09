const BaseController = require('./BaseController');

class ProgressController extends BaseController {
    constructor(progressRepository) {
        super();
        this.progressRepository = progressRepository;
    }

    /**
     * Gets the user's progress, including solved problems.
     * Converted to an arrow function.
     */
    getUserProgress = async (req, res) => {
        try {
            const { userId } = req.params;
            const progress = await this.progressRepository.getUserProgress(userId);
            if (!progress) {
                return this.notFound(res, 'Progress not found for this user.');
            }
            this.ok(res, progress);
        } catch (error) {
            this.internalServerError(res, error);
        }
    };

    /**
     * Gets the overall leaderboard data.
     * Converted to an arrow function.
     */
    getLeaderboard = async (req, res) => {
        try {
            const leaderboard = await this.progressRepository.getLeaderboard();
            this.ok(res, { data: { leaderboard } });
        } catch (error) {
            this.internalServerError(res, error);
        }
    };
}

module.exports = ProgressController;