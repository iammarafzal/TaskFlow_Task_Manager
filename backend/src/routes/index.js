// src/routes/index.js
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import taskRoutes from './task.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

// Mount individual domain route trees onto the v1 API root namespace
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/tasks', taskRoutes);
router.use('/', dashboardRoutes); // Directly mounts /dashboard and /notifications under root v1

export default router;