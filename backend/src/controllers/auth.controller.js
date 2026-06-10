// src/controllers/auth.controller.js
import { z } from 'zod';
import { AppDataSource } from '../database/datasource.js';
import { registerUser, authenticateCredentials } from '../services/auth.service.js';

// Input Validation Schemas
const signupSchema = z.object({
    name: z.string().min(1, { message: "Name is required." }),
    email: z.string().email({ message: "Invalid email format structure." }),
    password: z.string().min(8, { message: "Password must consist of at least 8 characters." })
});

const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email format structure." }),
    password: z.string().min(1, { message: "Password credential is required." })
});

/**
 * Handles account creation workflows
 */
export async function signup(req, res, next) {
    try {
        const payload = signupSchema.parse(req.body);
        const userRepository = AppDataSource.getRepository('User');

        // Prevent duplicate user registrations
        const existingUser = await userRepository.findOne({ where: { email: payload.email } });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'A user account with this email address already exists.'
            });
        }

        // Provision the new user profile via the Auth Service
        const newUser = await registerUser(payload.name, payload.email, payload.password);

        return res.status(201).json({
            success: true,
            message: 'User identity successfully created.',
            data: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }
        });
    } catch (error) {
        return next(error);
    }
}

/**
 * Handles secure user authentication and login sessions
 */
export async function login(req, res, next) {
    try {
        const payload = loginSchema.parse(req.body);

        // Verify credentials and sign a fresh access token
        const accessToken = await authenticateCredentials(payload.email, payload.password);

        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password credentials provided.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Authentication successful.',
            token: accessToken
        });
    } catch (error) {
        return next(error);
    }
}