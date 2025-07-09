class BaseController {
    constructor() {
        if (this.constructor === BaseController) {
            throw new Error("Abstract classes can't be instantiated.");
        }
    }

    ok(res, data) {
        return res.status(200).json(data);
    }

    created(res, data) {
        return res.status(201).json(data);
    }

    badRequest(res, message = 'Bad Request') {
        return res.status(400).json({ message });
    }

    unauthorized(res, message = 'Unauthorized') {
        return res.status(401).json({ message });
    }

    notFound(res, message = 'Not Found') {
        return res.status(404).json({ message });
    }

    internalServerError(res, error) {
        console.error(error); // Log the actual error
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}

module.exports = BaseController;