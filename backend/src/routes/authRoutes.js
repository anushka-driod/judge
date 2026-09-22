import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/send-otp', AuthController.sendOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-otp', AuthController.resendOtp);

// Protected Authentication Endpoints
router.get('/me', authenticateToken, AuthController.getMe);
router.get('/login-history', authenticateToken, AuthController.getLoginHistory);
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
