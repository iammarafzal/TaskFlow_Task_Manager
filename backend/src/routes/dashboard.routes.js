// src/routes/dashboard.routes.js
import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/dashboard.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Impose token filters to verify resource accessibility constraints
router.use(authenticateToken);

// GET /api/v1/dashboard
router.get('/dashboard', getDashboardAnalytics);

export default router;