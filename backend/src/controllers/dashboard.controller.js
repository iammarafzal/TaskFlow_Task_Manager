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

        // Structure a rolling 7-day analytical window based on task completion dates
        const dailyCounts = [];
        const calendarIndex = new Date();
        calendarIndex.setHours(23, 59, 59, 999); // Snap to the end of the current day

        for (let i = 0; i < 7; i++) {
            const currentTargetDate = new Date(calendarIndex);
            currentTargetDate.setDate(calendarIndex.getDate() - i);

            const morningBoundary = new Date(currentTargetDate);
            morningBoundary.setHours(0, 0, 0, 0);

            const eveningBoundary = new Date(currentTargetDate);
            eveningBoundary.setHours(23, 59, 59, 999);

            // Primary: count tasks whose completedAt falls within this day
            const completedWithTimestamp = allTasks.filter(t => {
                if (t.status !== 'COMPLETED' || !t.completedAt) return false;
                const d = new Date(t.completedAt);
                return d >= morningBoundary && d <= eveningBoundary;
            }).length;

            // Fallback: legacy completed tasks without completedAt — use updatedAt instead
            const completedLegacy = allTasks.filter(t => {
                if (t.status !== 'COMPLETED' || t.completedAt) return false;
                const d = new Date(t.updatedAt);
                return d >= morningBoundary && d <= eveningBoundary;
            }).length;

            const dayCount = completedWithTimestamp + completedLegacy;

            const year = morningBoundary.getFullYear();
            const month = String(morningBoundary.getMonth() + 1).padStart(2, '0');
            const day = String(morningBoundary.getDate()).padStart(2, '0');
            const localDateString = `${year}-${month}-${day}`;

            dailyCounts.push({ date: localDateString, count: dayCount });
        }

        // Reverse to chronological order (oldest → newest) before sending
        dailyCounts.reverse();

        // Auto-scale: height relative to the busiest day in this window (avoids flat charts)
        const maxCount = Math.max(...dailyCounts.map(d => d.count), 1);
        const analytics7Days = dailyCounts.map(d => ({
            date: d.date,
            count: d.count,
            percentage: parseFloat(((d.count / maxCount) * 100).toFixed(2))
        }));

        return res.status(200).json({
            success: true,
            data: {
                completionProgress: parseFloat(completionProgress.toFixed(2)),
                totalTasks,
                completedTasks,
                pendingTasks,
                burnoutWarning,
                analytics7Days // Already in chronological order (oldest → newest)
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