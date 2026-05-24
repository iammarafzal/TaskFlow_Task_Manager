// src/routes/auth.routes.js
import { Router } from 'express';
import { signup, login } from '../controllers/auth.controller.js';

const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', signup);

// POST /api/v1/auth/login
router.post('/login', login);

export default router;