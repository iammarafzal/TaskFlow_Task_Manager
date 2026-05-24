// src/routes/dashboard.routes.js
import { Router } from 'express';
import {
    getDashboardAnalytics,
    getNotifications,
    markNotificationAsRead,
    sendTestNotification
} from '../controllers/dashboard.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Impose token filters to verify resource accessibility constraints
router.use(authenticateToken);

// GET /api/v1/dashboard
router.get('/dashboard', getDashboardAnalytics);

// GET /api/v1/notifications
router.get('/notifications', getNotifications);

// POST /api/v1/notifications/test
router.post('/notifications/test', sendTestNotification);

// PUT /api/v1/notifications/:id/read
router.put('/notifications/:id/read', markNotificationAsRead);

export default router;