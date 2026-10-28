import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const requireAdminAuth = async (req, res, next) => {
  res.set('Cache-Control', 'no-store');

  const authorization = req.get('authorization');
  const tokenMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = req.cookies?.adminToken || tokenMatch?.[1];

  if (!token) {
    return res.status(401).json({ message: 'Authorization token is required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload !== 'object' || typeof payload.adminId !== 'string') {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    const admin = await Admin.findById(payload.adminId);
    if (!admin || (payload.tokenVersion ?? 0) !== (admin.tokenVersion ?? 0)) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    req.admin = admin;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export default requireAdminAuth;
