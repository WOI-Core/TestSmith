class BaseController {
    constructor() {
        if (this.constructor === BaseController) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    ok(res, data) {
        return res.status(200).json(data);
    }

    internalServerError(res, error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = BaseController;