const BaseController = require("./BaseController");
const SupabaseService = require("../services/SupabaseService");

class ProblemController extends BaseController {
  constructor() {
    super("ProblemController");
  }

  getProblemList = async (req, res) => {
    try {
      const problems = await SupabaseService.getProblemList();
      this.sendSuccess(res, problems);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  getProblemConfig = async (req, res) => {
    const { problemId } = req.params;
    try {
      const config = await SupabaseService.getProblemConfig(problemId);
      this.sendSuccess(res, config);
    } catch (error) {
      this.sendError(res, error);
    }
  };

  getTestCases = async (req, res) => {
    const { problemId } = req.params;
    try {
      const testCases = await SupabaseService.getTestCases(problemId);
      this.sendSuccess(res, testCases);
    } catch (error) {
      this.sendError(res, error);
    }
  };
}

module.exports = new ProblemController();