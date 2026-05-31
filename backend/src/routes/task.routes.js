// src/routes/task.routes.js
import { Router } from 'express';
import {
    getTasks,
    createTask,
    getTaskById,
    updateTask,
    deleteTask,
    getFocusTasks,
    bulkCreateTasks
} from '../controllers/task.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Secure all task interactions to isolate multi-tenant processing layers
router.use(authenticateToken);

// GET /api/v1/tasks/focus (Must be registered BEFORE standard parameter routes)
router.get('/focus', getFocusTasks);

// GET & POST /api/v1/tasks
router.route('/')
    .get(getTasks)
    .post(createTask);

// POST /api/v1/tasks/bulk
router.post('/bulk', bulkCreateTasks);

// GET, PUT, & DELETE /api/v1/tasks/:id
router.route('/:id')
    .get(getTaskById)
    .put(updateTask)
    .delete(deleteTask);

export default router;