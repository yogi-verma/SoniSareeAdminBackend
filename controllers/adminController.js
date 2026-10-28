import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

const adminCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000
};

export const createAdmin = async (req, res) => {
  try {
    const { name, password } = req.body;

    if (typeof name !== 'string' || !name.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Name and password are required.' });
    }

    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(409).json({ message: 'Admin has already been created.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await Admin.create({ name: name.trim(), password: hashedPassword });

    return res.status(201).json({
      message: 'Admin created successfully.',
      admin: { id: admin._id, name: admin.name }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Admin has already been created.' });
    }

    console.error('Create admin failed:', error.message);
    return res.status(500).json({ message: 'Could not create admin.' });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { password } = req.body;

    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Password is required.' });
    }

    const admin = await Admin.findOne().select('+password');
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ message: 'Invalid password.' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured.');
      return res.status(500).json({ message: 'Login is not configured.' });
    }

    const token = jwt.sign(
      { adminId: admin._id.toString(), tokenVersion: admin.tokenVersion ?? 0 },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('adminToken', token, adminCookieOptions);
    // Keep the bearer response header available for manual API clients such as Postman.
    res.set('Authorization', `Bearer ${token}`);

    return res.status(200).json({
      message: 'Login successful.',
      admin: { id: admin._id, name: admin.name }
    });
  } catch (error) {
    console.error('Admin login failed:', error.message);
    return res.status(500).json({ message: 'Could not log in.' });
  }
};

export const getLoggedInAdmin = (req, res) => {
  return res.status(200).json({
    loggedIn: true,
    admin: { id: req.admin._id, name: req.admin.name }
  });
};

export const logoutAdmin = async (req, res) => {
  try {
    const updateResult = await Admin.updateOne(
      { _id: req.admin._id },
      { $inc: { tokenVersion: 1 } }
    );

    if (updateResult.matchedCount !== 1) {
      return res.status(401).json({ message: 'Admin session is no longer valid.' });
    }

    res.clearCookie('adminToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/'
    });
    return res.status(200).json({ loggedIn: false, message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Admin logout failed:', error.message);
    return res.status(500).json({ message: 'Could not log out.' });
  }
};
