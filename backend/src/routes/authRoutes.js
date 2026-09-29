import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
<<<<<<< HEAD
router.post('/google', AuthController.googleAuth);
router.post('/google/complete', AuthController.completeGoogleProfile);
=======
>>>>>>> origin/main
router.post('/send-otp', AuthController.sendOtp);
router.post('/verify-otp', AuthController.verifyOtp);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/resend-otp', AuthController.resendOtp);
<<<<<<< HEAD
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
=======
>>>>>>> origin/main

// Protected Authentication Endpoints
router.get('/me', authenticateToken, AuthController.getMe);
router.get('/login-history', authenticateToken, AuthController.getLoginHistory);
<<<<<<< HEAD
router.put('/profile', authenticateToken, AuthController.updateProfile);
router.post('/change-password', authenticateToken, AuthController.changePassword);
=======
>>>>>>> origin/main
router.post('/logout', authenticateToken, AuthController.logout);

export default router;
