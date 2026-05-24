// src/workers/reminder.worker.js
import cron from 'node-cron';
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../database/datasource.js';
import { pushRealtimeNotification } from '../sockets/notification.socket.js';

/**
 * Initializes the background cron task monitor scheduled to run every 10 minutes.
 */
export function initializeCronWorkers() {
    // Pattern: Minute 0,10,20,30,40,50 -> */10 * * * *
    cron.schedule('*/10 * * * *', async () => {
        console.log('[Cron Worker] Initializing predictive task deadline check...');
        try {
            const taskRepository = AppDataSource.getRepository('Task');
            const notificationRepository = AppDataSource.getRepository('Notification');

            const currentTime = new Date();

            // Auto-delete tasks completed more than 10 days ago
            const tenDaysAgo = new Date(currentTime.getTime() - 10 * 24 * 60 * 60 * 1000);
            const deleteResult = await taskRepository.delete({
                status: 'COMPLETED',
                updatedAt: LessThanOrEqual(tenDaysAgo)
            });
            if (deleteResult.affected > 0) {
                console.log(`[Cron Worker] Auto-deleted ${deleteResult.affected} tasks completed more than 10 days ago.`);
            }

            // Compute targeted threshold bounds in milliseconds
            const oneHourMin = new Date(currentTime.getTime() + 50 * 60 * 1000);
            const oneHourMax = new Date(currentTime.getTime() + 60 * 60 * 1000);

            const threeHourMin = new Date(currentTime.getTime() + 170 * 60 * 1000);
            const threeHourMax = new Date(currentTime.getTime() + 180 * 60 * 1000);

            // Fetch pending tasks with related user preference profiles
            const upcomingTasks = await taskRepository.find({
                where: { status: 'PENDING' },
                relations: ['user']
            });

            if (upcomingTasks.length === 0) return;

            for (const task of upcomingTasks) {
                const user = task.user;
                if (!user) continue;

                const deadlineTime = new Date(task.deadline).getTime();
                let targetType = null;
                let messageText = '';

                // Check if the task falls within the 1-hour warning window
                if (deadlineTime >= oneHourMin.getTime() && deadlineTime <= oneHourMax.getTime()) {
                    if (user.remind1h) {
                        targetType = '1-Hour Warning';
                        messageText = `Urgent: Your task "${task.title}" is due in less than an hour!`;
                    }
                }
                // Check if the task falls within the 3-hour warning window
                else if (deadlineTime >= threeHourMin.getTime() && deadlineTime <= threeHourMax.getTime()) {
                    if (user.remind3h) {
                        targetType = '3-Hour Warning';
                        messageText = `Reminder: Your task "${task.title}" is approaching its deadline in less than 3 hours.`;
                    }
                }

                // If a valid alert threshold condition is met, commit and broadcast it
                if (targetType) {
                    // Check for a duplicate notification to prevent spamming within the same window
                    const existingNotification = await notificationRepository.findOne({
                        where: {
                            user: { id: user.id },
                            title: targetType,
                            message: messageText
                        }
                    });

                    if (!existingNotification) {
                        // Persist the notification in the database
                        const alertRecord = notificationRepository.create({
                            title: targetType,
                            message: messageText,
                            user: { id: user.id }
                        });
                        const savedAlert = await notificationRepository.save(alertRecord);

                        // Stream the update through WebSockets for real-time delivery
                        pushRealtimeNotification(user.id, {
                            event: 'NOTIFICATION_RECEIVED',
                            data: {
                                id: savedAlert.id,
                                title: savedAlert.title,
                                message: savedAlert.message,
                                createdAt: savedAlert.createdAt
                            }
                        });

                        console.log(`[Cron Worker] Broadcasted [${targetType}] cleanly to User: ${user.id}`);
                    }
                }
            }
        } catch (workerError) {
            console.error('[Cron Worker Emergency Failure]:', workerError);
        }
    });

    console.log('[Cron System] Background worker monitors deployed successfully.');
}