// src/routes/task.routes.js
import { Router } from 'express';
import {
    getTasks,
    createTask,
    getTaskById,
    updateTask,
    deleteTask,
    getFocusTask
} from '../controllers/task.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Secure all task interactions to isolate multi-tenant processing layers
router.use(authenticateToken);

// GET /api/v1/tasks/focus (Must be registered BEFORE standard parameter routes)
router.get('/focus', getFocusTask);

// GET & POST /api/v1/tasks
router.route('/')
    .get(getTasks)
    .post(createTask);

// GET, PUT, & DELETE /api/v1/tasks/:id
router.route('/:id')
    .get(getTaskById)
    .put(updateTask)
    .delete(deleteTask);

export default router;