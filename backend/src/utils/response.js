class ApiResponse {
    // Success response
    static success(res, data = null, message = 'Success', statusCode = 200) {
        return res.status(statusCode).json({
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        });
    }

    // Error response
    static error(res, message = 'Error', statusCode = 500, errors = null) {
        const response = {
            success: false,
            message,
            timestamp: new Date().toISOString()
        };
        
        if (errors) {
            response.errors = errors;
        }
        
        return res.status(statusCode).json(response);
    }

    // Created response (201)
    static created(res, data = null, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    }

    // No content response (204)
    static noContent(res) {
        return res.status(204).send();
    }

    // Bad request response (400)
    static badRequest(res, message = 'Bad request', errors = null) {
        return this.error(res, message, 400, errors);
    }

    // Unauthorized response (401)
    static unauthorized(res, message = 'Unauthorized') {
        return this.error(res, message, 401);
    }

    // Forbidden response (403)
    static forbidden(res, message = 'Forbidden') {
        return this.error(res, message, 403);
    }

    // Not found response (404)
    static notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404);
    }

    // Conflict response (409)
    static conflict(res, message = 'Resource already exists') {
        return this.error(res, message, 409);
    }

    // Validation error response (422)
    static validationError(res, errors, message = 'Validation failed') {
        return this.error(res, message, 422, errors);
    }
}

module.exports = ApiResponse;
