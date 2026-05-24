// src/controllers/dashboard.controller.js
import { AppDataSource } from '../database/datasource.js';
import { Between } from 'typeorm';
import { pushRealtimeNotification } from '../sockets/notification.socket.js';

/**
 * Generates aggregated data metrics and tracks 7-day completion percentages
 */
export async function getDashboardAnalytics(req, res, next) {
    try {
        const taskRepository = AppDataSource.getRepository('Task');
        const tenantId = req.user.id;

        // Fetch all active tasks for the authenticated tenant
        const allTasks = await taskRepository.find({ where: { user: { id: tenantId } } });

        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter(t => t.status === 'COMPLETED').length;
        const pendingTasks = allTasks.filter(t => t.status === 'PENDING').length;

        const completionProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Trigger burnout warnings if pending effort thresholds exceed 8 hours
        const totalPendingEffort = allTasks.filter(t => t.status === 'PENDING').reduce((sum, t) => sum + t.effort, 0);
        const burnoutWarning = totalPendingEffort > 8;

        // Structure a rolling 7-day analytical window
        const analytics7Days = [];
        const calendarIndex = new Date();
        calendarIndex.setHours(23, 59, 59, 999); // Snap to the end of the current day

        for (let i = 0; i < 7; i++) {
            const currentTargetDate = new Date(calendarIndex);
            currentTargetDate.setDate(calendarIndex.getDate() - i);

            const morningBoundary = new Date(currentTargetDate);
            morningBoundary.setHours(0, 0, 0, 0);

            const eveningBoundary = new Date(currentTargetDate);
            eveningBoundary.setHours(23, 59, 59, 999);

            // Filter local state array to avoid making repetitive database calls
            const dayTasks = allTasks.filter(t => t.createdAt >= morningBoundary && t.createdAt <= eveningBoundary);
            const dayCompleted = dayTasks.filter(t => t.status === 'COMPLETED').length;
            const dayTotal = dayTasks.length;

            const dayPercentage = dayTotal > 0 ? (dayCompleted / dayTotal) * 100 : 0;

            const year = morningBoundary.getFullYear();
            const month = String(morningBoundary.getMonth() + 1).padStart(2, '0');
            const day = String(morningBoundary.getDate()).padStart(2, '0');
            const localDateString = `${year}-${month}-${day}`;

            analytics7Days.push({
                date: localDateString,
                count: dayCompleted,
                percentage: parseFloat(dayPercentage.toFixed(2))
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                completionProgress: parseFloat(completionProgress.toFixed(2)),
                totalTasks,
                completedTasks,
                pendingTasks,
                burnoutWarning,
                analytics7Days: analytics7Days.reverse() // Sort chronologically (oldest to newest)
            }
        });
    } catch (error) {
        return next(error);
    }
}

/**
 * Retrieves unread notification records
 */
export async function getNotifications(req, res, next) {
    try {
        const notificationRepository = AppDataSource.getRepository('Notification');

        const messages = await notificationRepository.find({
            where: { user: { id: req.user.id } },
            order: { createdAt: 'DESC' }
        });

        return res.status(200).json({ success: true, data: messages });
    } catch (error) {
        return next(error);
    }
}

/**
 * Marks a specific notification as read after verifying its ownership
 */
export async function markNotificationAsRead(req, res, next) {
    try {
        const notificationRepository = AppDataSource.getRepository('Notification');
        const notificationId = parseInt(req.params.id, 10);

        const alertItem = await notificationRepository.findOne({
            where: { id: notificationId, user: { id: req.user.id } }
        });

        if (!alertItem) {
            return res.status(404).json({ success: false, message: 'Notification item not found or access denied.' });
        }

        alertItem.isRead = true;
        await notificationRepository.save(alertItem);

        return res.status(200).json({ success: true, message: 'Notification status marked as read.' });
    } catch (error) {
        return next(error);
    }
}

/**
 * Sends a test notification and registers it to the notifications log
 */
export async function sendTestNotification(req, res, next) {
    try {
        const notificationRepository = AppDataSource.getRepository('Notification');
        const alertRecord = notificationRepository.create({
            title: 'Test Notification',
            message: 'A test Daily Summary has been sent to your registered email.',
            user: { id: req.user.id }
        });
        const savedAlert = await notificationRepository.save(alertRecord);

        // Stream the update through WebSockets for real-time delivery
        pushRealtimeNotification(req.user.id, {
            event: 'NOTIFICATION_RECEIVED',
            data: {
                id: savedAlert.id,
                title: savedAlert.title,
                message: savedAlert.message,
                createdAt: savedAlert.createdAt
            }
        });

        return res.status(200).json({ success: true, message: 'Test notification sent and saved.' });
    } catch (error) {
        return next(error);
    }
}