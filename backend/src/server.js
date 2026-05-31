// src/server.js
import http from 'http';
import app from './app.js';
import { env } from './config/environment.js';
import { AppDataSource } from './database/datasource.js';
import { initializeCronWorkers } from './workers/reminder.worker.js';

// Instantiate the decoupled native HTTP engine context wrapping the Express configuration
const httpServer = http.createServer(app);

/**
 * Initializes and orchestrates the absolute launch sequence dependencies of the system backend.
 */
async function runBootstrapSequence() {
    try {
        console.log('[Bootstrap] Initializing production database connection sequence...');

        // 1. Establish underlying TypeORM PostgreSQL communication pipelines
        await AppDataSource.initialize();
        console.log('[Bootstrap] Database connection context synced and verified successfully.');



        // 3. Launch background predictive task monitoring crons
        initializeCronWorkers();

        // 4. Bind the server to the validated runtime execution port
        httpServer.listen(env.PORT, () => {
            console.log(`=======================================================`);
            console.log(`  OBSIDIANFLOW GATEWAY RUNNING ONLINE (PORT ${env.PORT})   `);
            console.log(`  Target Mode Environment: Localhost/Production Cluster `);
            console.log(`  Gateway Interface Address: http://localhost:${env.PORT}   `);
            console.log(`=======================================================`);
        });

    } catch (initializationFailure) {
        console.error('=======================================================');
        console.error(' CRITICAL SYSTEM BOOTSTRAP INITIALIZATION COLLAPSE   ');
        console.error('=======================================================');
        console.error(initializationFailure);
        process.exit(1);
    }
}

/**
 * Executes a clean operational release of system holds before terminating process execution paths.
 * @param {string} incomingSignal - The OS termination identifier.
 */
async function executeGracefulTeardown(incomingSignal) {
    console.log(`\n[Teardown] Event catch triggered via ${incomingSignal}. Beginning absolute teardown sequence...`);

    // Close the network inbound channel to prevent accepting incoming connections
    httpServer.close(async () => {
        console.log('[Teardown] Network ingress channel successfully offline.');
        try {
            if (AppDataSource.isInitialized) {
                await AppDataSource.destroy();
                console.log('[Teardown] PostgreSQL database resource pools cleared cleanly.');
            }
            console.log('[Teardown] Execution process exiting safely.');
            process.exit(0);
        } catch (teardownException) {
            console.error('[Teardown Error] Encountered errors while clearing database infrastructure:', teardownException);
            process.exit(1);
        }
    });

    // Force shutdown failsafe if background closures stall beyond 10 seconds
    setTimeout(() => {
        console.error('[Teardown Failsafe] Forced isolation override triggered after timeout.');
        process.exit(1);
    }, 10000);
}

// Attach listeners for unexpected process interruptions or hosting platform events
process.on('SIGINT', () => executeGracefulTeardown('SIGINT'));
process.on('SIGTERM', () => executeGracefulTeardown('SIGTERM'));

// Trigger application execution
runBootstrapSequence();