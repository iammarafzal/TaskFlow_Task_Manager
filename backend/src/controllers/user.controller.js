// src/controllers/user.controller.js
import { z } from 'zod';
import { AppDataSource } from '../database/datasource.js';

const updateSettingsSchema = z.object({
    dailyDigestTime: z.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d$/, {
        message: "Time format must strictly match a 24-hour clock cycle configuration (HH:MM)."
    }).optional(),
    remind1h: z.boolean().optional(),
    remind3h: z.boolean().optional()
});

/**
 * Extracts and displays the profile settings for the authenticated requester
 */
export async function getSettings(req, res, next) {
    try {
        const userRepository = AppDataSource.getRepository('User');
        const user = await userRepository.findOne({ where: { id: req.user.id } });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User settings target profile missing.' });
        }

        return res.status(200).json({
            success: true,
            data: {
                dailyDigestTime: user.dailyDigestTime,
                remind1h: user.remind1h,
                remind3h: user.remind3h
            }
        });
    } catch (error) {
        return next(error);
    }
}

/**
 * Updates individual settings fields securely
 */
export async function updateSettings(req, res, next) {
    try {
        const payload = updateSettingsSchema.parse(req.body);
        const userRepository = AppDataSource.getRepository('User');

        await userRepository.update({ id: req.user.id }, payload);

        return res.status(200).json({
            success: true,
            message: 'User configuration preferences successfully synchronized.'
        });
    } catch (error) {
        return next(error);
    }
}