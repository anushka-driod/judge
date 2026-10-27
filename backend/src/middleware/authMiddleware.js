import jwt from 'jsonwebtoken';
import UserModel, { sanitizeUser } from '../models/userModel.js';
import LawyerPortalService from '../services/lawyerPortalService.js';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware: Verify Bearer JWT Token and attach user to request
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      error: 'Authentication token required. Please sign in.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'Session expired or user not found.',
      });
    }

    req.user = sanitizeUser(user);
    req.user.lawyerId = decoded.lawyerId || user.user_metadata?.lawyerId || user.metadata?.lawyerId;
    req.userId = user.id;

    // Attach dynamic advocate status so changes in admin status reflect immediately on active sessions
    if (req.user.role === 'lawyer' || req.user.role === 'advocate') {
      try {
        const lawyer = await LawyerPortalService.getLawyerProfile(req.user.lawyerId || req.user.email || req.user.id);
        if (lawyer) {
          req.user.verification_status = lawyer.verification_status;
          req.user.admin_remarks = lawyer.admin_remarks;
        }
      } catch (_) {}
    }

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired token. Please sign in again.',
    });
  }
}

/**
 * Middleware: Optional authentication (attaches req.user if Bearer token present)
 */
export async function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authenticateToken(req, res, next);
}

/**
 * Middleware: Role-based authorization
 * @param  {...string} roles - e.g. 'user', 'lawyer', 'admin'
 */
export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Sign-in required.' });
    }

    const userRole = (req.user.role || '').toLowerCase();
    const allowed = roles.map((r) => r.toLowerCase());
    if (!allowed.includes(userRole)) {
      return res.status(403).json({
        error: `Forbidden. This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
}

/**
 * Middleware: Ensure email is verified before proceeding
 */
export function requireVerifiedEmail(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Sign-in required.' });
  }

  const isVerified = Boolean(req.user.emailVerified || req.user.email_verified);
  if (!isVerified) {
    return res.status(403).json({
      error: 'Please verify your email address before continuing.',
      code: 'EMAIL_NOT_VERIFIED',
      email: req.user.email,
    });
  }

  next();
}

/**
 * Middleware: Verify advocate approval status
 * Enforces that pending, rejected, or suspended advocates cannot access protected advocate chambers
 */
export async function requireApprovedAdvocate(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. Sign-in required.' });
  }

  const role = (req.user.role || '').toLowerCase();
  if (role === 'admin') {
    return next();
  }

  if (role !== 'lawyer' && role !== 'advocate') {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN_ROLE',
      error: 'This action requires advocate authorization.',
    });
  }

  const identifier = req.user.lawyerId || req.user.id || req.user.email;
  let lawyer = null;
  try {
    lawyer = await LawyerPortalService.getLawyerProfile(identifier);
  } catch (_) {}

  const status = String(lawyer?.verification_status || req.user.verification_status || 'PENDING').toUpperCase();

  if (status !== 'VERIFIED' && status !== 'ACTIVE') {
    return res.status(403).json({
      success: false,
      code: status === 'PENDING' ? 'ADVOCATE_PENDING_APPROVAL' : `ADVOCATE_${status}`,
      error: `Advocate access restricted. Application status is '${status}'.`,
      verification_status: status,
      applicationId: lawyer?.id || identifier,
      remarks: lawyer?.admin_remarks || 'Application under administrative review.',
    });
  }

  req.lawyer = lawyer;
  next();
}

/**
 * Middleware: Block pending, rejected, or suspended advocates from accessing citizen chatbot/conversations.
 * Citizens and approved advocates (or admins) may use chat; unapproved advocates must see their status page.
 */
export async function requireCitizenOrApproved(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();

  try {
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    if (!token) return next();

    let user = req.user;
    if (!user) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = await UserModel.findById(decoded.id);
      } catch (_) {}
    }

    if (user) {
      const role = (user.role || '').toLowerCase();
      if (role === 'lawyer' || role === 'advocate') {
        const identifier = user.lawyerId || user.id || user.email;
        let lawyer = null;
        try {
          lawyer = await LawyerPortalService.getLawyerProfile(identifier);
        } catch (_) {}

        const status = String(lawyer?.verification_status || user.verification_status || 'PENDING').toUpperCase();
        if (status !== 'VERIFIED' && status !== 'ACTIVE') {
          return res.status(403).json({
            success: false,
            code: 'ADVOCATE_PENDING_APPROVAL',
            error: 'Your advocate registration is awaiting administrator approval. You cannot access the citizen chatbot.',
            verification_status: status,
            applicationId: lawyer?.id || identifier,
            remarks: lawyer?.admin_remarks || 'Your advocate registration is awaiting administrator approval.',
          });
        }
      }
    }
  } catch (_) {}

  next();
}
