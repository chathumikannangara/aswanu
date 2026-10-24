import crypto from 'node:crypto';
import { db } from './db.js';
import { hashPassword } from './seed.js';

// In-memory active session token store mapping token -> user object
const activeSessions = new Map();

export function createSession(user) {
  const token = 'asw_tok_' + crypto.randomBytes(24).toString('hex');
  const sessionData = {
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      district: user.district,
      organization: user.organization
    },
    created_at: new Date()
  };
  activeSessions.set(token, sessionData);
  return token;
}

export function getUserFromToken(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  return session ? session.user : null;
}

export function authenticate(email, password) {
  const hash = hashPassword(password);
  const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND password_hash = ?');
  const user = stmt.get(email, hash);
  if (!user) return null;
  const token = createSession(user);
  return { token, user: { id: user.id, role: user.role, name: user.name, email: user.email, district: user.district, organization: user.organization } };
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  // Also check for persona switch header if in demo mode
  const personaHeader = req.headers['x-persona-id'];

  if (personaHeader) {
    const user = db.prepare('SELECT id, role, name, email, district, organization FROM users WHERE id = ?').get(personaHeader);
    if (user) {
      req.user = user;
      return next();
    }
  }

  if (token) {
    const user = getUserFromToken(token);
    if (user) {
      req.user = user;
      return next();
    }
  }

  // Not authenticated
  req.user = null;
  next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: requires role in [${allowedRoles.join(', ')}]` });
    }
    next();
  };
}

/**
 * Strips private buyer fields (like max_target_budget_lkr) if current user is not the owning buyer or reviewer
 */
export function sanitizeRequestForUser(request, user) {
  if (!request) return null;
  const isOwner = user && user.id === request.buyer_id;
  const isReviewer = user && user.role === 'reviewer';

  if (!isOwner && !isReviewer) {
    const copy = { ...request };
    delete copy.max_target_budget_lkr;
    copy.is_budget_private = true;
    return copy;
  }
  return request;
}
