// src/middlewares/error.middleware.js
import { ZodError } from 'zod';

/**
 * Global centralized error-handling middleware for Express.
 * Intercepts all operational and unhandled runtime exceptions.
 */
export function errorHandler(err, req, res, next) {
    // 1. Handle Zod Validation Input Failures
    if (err instanceof ZodError) {
        return res.status(400).json({
            success: false,
            message: `Validation Error: ${err.errors.map(e => e.message).join(', ')}`,
            errors: err.errors.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }))
        });
    }

    // 2. Handle Explicit Operational / Custom Errors
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log the complete stack trace internally for engineering diagnostics
    console.error(`[Error Handler] [${req.method} ${req.url}]:`, {
        message: err.message,
        stack: err.stack,
        statusCode
    });

    // 3. Return Clean Production-Safe Payload
    return res.status(statusCode).json({
        success: false,
        message: statusCode === 500 ? 'Internal Server Error' : message
    });
}