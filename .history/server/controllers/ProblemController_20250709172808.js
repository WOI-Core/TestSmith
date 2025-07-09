const BaseController = require("./BaseController");

class ProblemController extends BaseController {
  constructor(supabaseService) {
    super();
    this.supabaseService = supabaseService;
  }

  getAll = async (req, res) => {
    try {
      const problems = await this.supabaseService.getProblemList();
      this.ok(res, problems);
    } catch (error) {
      this.internalServerError(res, error);
    }
  };
}

module.exports = ProblemController;