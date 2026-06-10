import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from potential .env file
dotenv.config();

// Schema definition for operational environments
const environmentSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    
    PORT: z
        .string()
        .default('8000')
        .transform((val) => parseInt(val, 10)),

    DATABASE_URL: z
        .string()
        .url()
        .refine(
            (val) => val.startsWith('postgresql://') || val.startsWith('postgres://'),
            { message: 'DATABASE_URL must be a valid PostgreSQL connection string (postgres:// or postgresql://)' }
        ),

    JWT_SECRET: z
        .string()
        .min(12, 'JWT_SECRET must be at least 12 characters long for production security'),

    CORS_ALLOWED_ORIGINS: z
        .string()
        .default('http://localhost:5173,http://localhost:3000')
        .transform((val) => val.split(',').map((origin) => origin.trim()))
});

// Validate process.env variables immediately at initialization
let env;
try {
    env = environmentSchema.parse(process.env);
} catch (error) {
    console.error('❌ Environment configuration validation failed:');
    console.error(JSON.stringify(error.errors, null, 2));
    // Immediately crash the application safely to prevent running in an unstable state
    process.exit(1);
}

export { env };