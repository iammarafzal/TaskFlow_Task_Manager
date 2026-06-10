import { DataSource } from 'typeorm';
import { env } from '../config/environment.js';

// Import the user-created schemas
import UserSchema from '../entities/User.js';
import TaskSchema from '../entities/Task.js';

// Set up PostgreSQL adapter settings
const isProduction = env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    // Automatically sync schema structure in database only in development
    synchronize: !isProduction,
    logging: !isProduction,
    entities: [UserSchema, TaskSchema],
    migrations: ['src/database/migrations/*.js'],
    // Use SSL configuration safely across environments
    ssl: env.DATABASE_URL.includes('localhost') || env.DATABASE_URL.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false } // Force SSL with permissive validation for Cloud Platforms like Supabase
});