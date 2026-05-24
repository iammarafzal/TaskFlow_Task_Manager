import { DataSource } from 'typeorm';
import { env } from '../config/environment.js';

// Import the user-created schemas
import UserSchema from '../entities/User.js';
import TaskSchema from '../entities/Task.js';
import NotificationSchema from '../entities/Notification.js';

// Set up PostgreSQL adapter settings
export const AppDataSource = new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    // Automatically sync schema structure in database (recommended safe practice for this design)
    synchronize: true,
    logging: false,
    entities: [UserSchema, TaskSchema, NotificationSchema],
    // Use SSL configuration safely across environments
    ssl: env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false } // Force SSL with permissive validation for Cloud Platforms (Railway, Render)
});