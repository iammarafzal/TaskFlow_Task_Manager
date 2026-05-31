// src/controllers/user.controller.js
import { z } from 'zod';
import { AppDataSource } from '../database/datasource.js';
import { hashPassword, comparePasswords, generateToken } from '../services/auth.service.js';


const updateProfileSchema = z.object({
    email: z.string().email({ message: "Invalid email format structure." }).optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, { message: "New password must be at least 8 characters long." }).optional()
}).refine(data => {
    // If new password is provided, current password must be provided
    if (data.newPassword && !data.currentPassword) {
        return false;
    }
    return true;
}, {
    message: "Current password is required when setting a new password.",
    path: ["currentPassword"]
});

/**
 * Updates the user's secure profile information (email and password)
 */
export async function updateProfile(req, res, next) {
    try {
        const payload = updateProfileSchema.parse(req.body);
        const userRepository = AppDataSource.getRepository('User');

        const user = await userRepository.findOne({ where: { id: req.user.id } });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User profile not found.' });
        }

        let needsTokenRefresh = false;

        // Handle Email Update
        if (payload.email && payload.email !== user.email) {
            // Check for conflict
            const existingUser = await userRepository.findOne({ where: { email: payload.email } });
            if (existingUser) {
                return res.status(409).json({ success: false, message: 'A user account with this email address already exists.' });
            }
            user.email = payload.email;
            needsTokenRefresh = true;
        }

        // Handle Password Update
        if (payload.newPassword) {
            const isMatch = await comparePasswords(payload.currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'The current password provided is incorrect.' });
            }
            user.password = await hashPassword(payload.newPassword);
        }

        await userRepository.save(user);

        // If email was changed, we must issue a new token
        let token = null;
        if (needsTokenRefresh || payload.newPassword) {
            // Re-authenticate and issue a new token
            token = generateToken(user);
        }

        return res.status(200).json({
            success: true,
            message: 'User profile successfully updated.',
            data: {
                id: user.id,
                email: user.email,
                ...(token && { token })
            }
        });
    } catch (error) {
        return next(error);
    }
}