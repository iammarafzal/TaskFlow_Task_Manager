// src/routes/user.routes.js
import { Router } from 'express';
import { updateProfile } from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Protect all settings modifications with token validations
router.use(authenticateToken);



// PUT /api/v1/user/profile
router.put('/profile', updateProfile);

export default router;