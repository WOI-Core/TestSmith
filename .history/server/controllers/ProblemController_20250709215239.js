const BaseController = require("./BaseController");

class ProblemController extends BaseController {
  constructor(supabaseService) {
    super();
    this.supabaseService = supabaseService;
  }

  getById = async (req, res) => {
    console.log('[Controller] ProblemController.getById called.');
    try {
      const { id } = req.params;
      console.log(`[Controller] Fetching data for problemId: "${id}"`);
      const problem = await this.supabaseService.getProblemById(id);

      if (!problem) {
        console.log(`[Controller] Problem with id "${id}" not found in service. Sending 404.`);
        return this.notFound(res, `Problem with ID "${id}" could not be found.`);
      }
      
      console.log(`[Controller] Successfully found problem data for "${id}". Sending 200 OK.`);
      this.ok(res, problem);
    } catch (error) {
      console.error('[Controller] An error occurred in getById:', error);
      this.internalServerError(res, error);
    }
  };

  getAll = async (req, res) => {
      // getAll logic here
  }
}

module.exports = ProblemController;