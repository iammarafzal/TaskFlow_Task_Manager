// src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/environment.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

// 1. Production Security Hardening Layers
app.use(helmet());

// 2. Dynamic Cross-Origin Resource Sharing Coordination
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. Request Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. API Core Routing Root Mounting Namespace
app.use('/api/v1', apiRouter);

// 5. Catch-All Standard Route Fallback for Unmapped Endpoints
app.use((req, res, next) => {
    return res.status(404).json({
        success: false,
        message: `Resource Endpoint Not Found: Cannot resolve ${req.method} ${req.url}`
    });
});

// 6. Global Catch-Safe Validation and Error Handler Engine Placement
app.use(errorHandler);

export default app;