// src/workers/reminder.worker.js
import cron from 'node-cron';
import { LessThanOrEqual, IsNull } from 'typeorm';
import { AppDataSource } from '../database/datasource.js';

/**
 * Initializes the background cron task monitor scheduled to run every 10 minutes.
 */
export function initializeCronWorkers() {
    // Pattern: Minute 0,10,20,30,40,50 -> */10 * * * *
    cron.schedule('*/10 * * * *', async () => {
        console.log('[Cron Worker] Initializing predictive task deadline check...');
        try {
            const taskRepository = AppDataSource.getRepository('Task');

            const currentTime = new Date();

            // Auto-delete tasks completed more than 10 days ago (using completedAt with updatedAt fallback)
            const tenDaysAgo = new Date(currentTime.getTime() - 10 * 24 * 60 * 60 * 1000);
            const deleteResult = await taskRepository.delete([
                {
                    status: 'COMPLETED',
                    completedAt: LessThanOrEqual(tenDaysAgo)
                },
                {
                    status: 'COMPLETED',
                    completedAt: IsNull(),
                    updatedAt: LessThanOrEqual(tenDaysAgo)
                }
            ]);
            if (deleteResult.affected > 0) {
                console.log(`[Cron Worker] Auto-deleted ${deleteResult.affected} tasks completed more than 10 days ago.`);
            }


        } catch (workerError) {
            console.error('[Cron Worker Emergency Failure]:', workerError);
        }
    });

    console.log('[Cron System] Background worker monitors deployed successfully.');
}