// src/controllers/task.controller.js
import { z } from 'zod';
import { AppDataSource } from '../database/datasource.js';
import { calculatePriorityScore } from '../services/score.service.js';

const createTaskSchema = z.object({
    title: z.string().min(1, { message: "Task title context cannot be left blank." }),
    impact: z.enum(['HIGH', 'MEDIUM', 'LOW'], { message: "Impact metric must match HIGH, MEDIUM, or LOW values." }),
    deadline: z.string().datetime({ message: "Deadline must resolve to a valid ISO 8601 timezone-aware format." }),
    effort: z.number().positive({ message: "Effort metrics require absolute positive floating point values." }),
    status: z.enum(['PENDING', 'COMPLETED']).optional().default('PENDING')
});

const updateTaskSchema = createTaskSchema.partial().extend({
    status: z.enum(['PENDING', 'COMPLETED']).optional()
});

const bulkCreateTasksSchema = z.array(createTaskSchema);

/**
 * Lists all tasks for the logged-in user
 */
export async function getTasks(req, res, next) {
    try {
        const taskRepository = AppDataSource.getRepository('Task');

        // Explicit tenant isolation barrier
        const tasks = await taskRepository.find({
            where: { user: { id: req.user.id } },
            order: { score: 'DESC', createdAt: 'ASC' }
        });

        return res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        return next(error);
    }
}

/**
 * Locates a single task by ID with strict validation ownership constraints
 */
export async function getTaskById(req, res, next) {
    try {
        const taskRepository = AppDataSource.getRepository('Task');
        const task = await taskRepository.findOne({
            where: { id: req.params.id, user: { id: req.user.id } }
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'Requested task not found or access denied.' });
        }

        return res.status(200).json({ success: true, data: task });
    } catch (error) {
        return next(error);
    }
}

/**
 * Provisions a fresh task, executing score equations immediately before persisting
 */
export async function createTask(req, res, next) {
    try {
        const payload = createTaskSchema.parse(req.body);
        const taskRepository = AppDataSource.getRepository('Task');

        // Run priority score calculations
        const computedScore = calculatePriorityScore({
            impact: payload.impact,
            deadline: new Date(payload.deadline),
            status: payload.status
        });

        const taskEntityInstance = taskRepository.create({
            ...payload,
            deadline: new Date(payload.deadline),
            score: computedScore,
            completedAt: payload.status === 'COMPLETED' ? new Date() : null,
            user: { id: req.user.id }
        });

        const savedTask = await taskRepository.save(taskEntityInstance);

        return res.status(201).json({ success: true, data: savedTask });
    } catch (error) {
        return next(error);
    }
}

/**
 * Bulk provisions tasks, executing score equations immediately before persisting
 */
export async function bulkCreateTasks(req, res, next) {
    try {
        const payload = bulkCreateTasksSchema.parse(req.body);
        const taskRepository = AppDataSource.getRepository('Task');

        const taskEntities = payload.map(taskData => {
            const computedScore = calculatePriorityScore({
                impact: taskData.impact,
                deadline: new Date(taskData.deadline),
                status: taskData.status
            });

            return taskRepository.create({
                ...taskData,
                deadline: new Date(taskData.deadline),
                score: computedScore,
                completedAt: taskData.status === 'COMPLETED' ? new Date() : null,
                user: { id: req.user.id }
            });
        });

        const savedTasks = await taskRepository.save(taskEntities);

        return res.status(201).json({ success: true, data: savedTasks });
    } catch (error) {
        return next(error);
    }
}

/**
 * Modifies parameters of a specific task and updates its priority score
 */
export async function updateTask(req, res, next) {
    try {
        const payload = updateTaskSchema.parse(req.body);
        const taskRepository = AppDataSource.getRepository('Task');

        // Confirm that the targeted record belongs to the active tenant
        const task = await taskRepository.findOne({
            where: { id: req.params.id, user: { id: req.user.id } }
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'Requested task not found or access denied.' });
        }

        // Merge modified adjustments
        if (payload.title !== undefined) task.title = payload.title;
        if (payload.impact !== undefined) task.impact = payload.impact;
        if (payload.deadline !== undefined) task.deadline = new Date(payload.deadline);
        if (payload.effort !== undefined) task.effort = payload.effort;
        if (payload.status !== undefined) {
            task.status = payload.status;
            if (payload.status === 'COMPLETED') {
                task.completedAt = new Date();
            } else if (payload.status === 'PENDING') {
                task.completedAt = null;
            }
        }

        // Recalculate priority scores based on updated metrics
        task.score = calculatePriorityScore({
            impact: task.impact,
            deadline: task.deadline,
            status: task.status
        });

        const updatedTask = await taskRepository.save(task);

        return res.status(200).json({ success: true, data: updatedTask });
    } catch (error) {
        return next(error);
    }
}

/**
 * Safely removes a task from the system
 */
export async function deleteTask(req, res, next) {
    try {
        const taskRepository = AppDataSource.getRepository('Task');
        const task = await taskRepository.findOne({
            where: { id: req.params.id, user: { id: req.user.id } }
        });

        if (!task) {
            return res.status(404).json({ success: false, message: 'Requested task not found or access denied.' });
        }

        await taskRepository.remove(task);

        return res.status(200).json({ success: true, message: 'Task item successfully destroyed.' });
    } catch (error) {
        return next(error);
    }
}

/**
 * Returns the highest-priority items requiring immediate user focus
 */
export async function getFocusTasks(req, res, next) {
    try {
        const taskRepository = AppDataSource.getRepository('Task');

        const focusTasks = await taskRepository.find({
            where: { user: { id: req.user.id }, status: 'PENDING' },
            order: { score: 'DESC', deadline: 'ASC' },
            take: 3
        });

        return res.status(200).json({ success: true, data: focusTasks });
    } catch (error) {
        return next(error);
    }
}