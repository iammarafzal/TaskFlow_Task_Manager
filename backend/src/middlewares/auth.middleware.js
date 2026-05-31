// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import { env } from '../config/environment.js';
import { AppDataSource } from '../database/datasource.js';

/**
 * Express middleware to enforce JSON Web Token authentication and establish
 * strict tenant boundaries by loading context onto the request lifecycle.
 */
export async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];

        // Check for the presence of the Authorization header
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access Denied: No authentication token provided.'
            });
        }

        // Extract the raw token string
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access Denied: Malformed authentication token.'
            });
        }

        // Verify token cryptographic signature
        let decoded;
        try {
            decoded = jwt.verify(token, env.JWT_SECRET);
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Access Denied: Invalid or expired authentication token.'
            });
        }

        // Ensure the token payload contains the subject identity identifier
        if (!decoded || !decoded.sub) {
            return res.status(401).json({
                success: false,
                message: 'Access Denied: Corrupt token payload structure.'
            });
        }

        // Connect to the database and locate the active user record
        const userRepository = AppDataSource.getRepository('User');
        const user = await userRepository.findOne({
            where: { id: decoded.sub }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Access Denied: Authenticated user no longer exists.'
            });
        }

        // Inject user context securely into the request pipeline
        req.user = {
            id: user.id,
            email: user.email
        };

        // Proceed to the next middleware or matching controller action safely
        return next();
    } catch (error) {
        // Forward critical execution exceptions into the global handler block
        return next(error);
    }
}