const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/index');
require('dotenv').config();

const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').trim().notEmpty().isMobilePhone().withMessage('Valid phone number is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('zone_id').isInt({ gt: 0 }).withMessage('Valid zone_id is required'),
    body('platform').isIn(['zomato', 'swiggy', 'both']).withMessage('Platform must be zomato, swiggy, or both'),
    body('weekly_income').isFloat({ gt: 0 }).withMessage('weekly_income must be a positive number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone, email, password, city, zone_id, platform, weekly_income, aadhaar_mock, upi_id } = req.body;

    try {
      // Check for duplicate phone/email
      const existing = await query(
        'SELECT id FROM workers WHERE phone = $1 OR email = $2',
        [phone, email]
      );
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'Phone or email already registered.' });
      }

      // Verify zone exists
      const zoneCheck = await query('SELECT id FROM zones WHERE id = $1', [zone_id]);
      if (zoneCheck.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid zone_id.' });
      }

      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      const result = await query(
        `INSERT INTO workers (name, phone, email, password_hash, city, zone_id, platform, weekly_income,
          aadhaar_mock, upi_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, name, phone, email, city, zone_id, platform, weekly_income, created_at`,
        [name, phone, email, password_hash, city, zone_id, platform, weekly_income, aadhaar_mock || null, upi_id || null]
      );

      const worker = result.rows[0];
      const token = jwt.sign(
        { id: worker.id, email: worker.email, role: 'worker' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({ message: 'Registration successful.', token, worker });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Server error during registration.' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const result = await query(
        'SELECT id, name, phone, email, password_hash, city, zone_id, platform, weekly_income, is_verified, upi_id FROM workers WHERE email = $1',
        [email]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const worker = result.rows[0];
      const isMatch = await bcrypt.compare(password, worker.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: worker.id, email: worker.email, role: 'worker' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const { password_hash, ...workerData } = worker;
      return res.json({ message: 'Login successful.', token, worker: workerData });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Server error during login.' });
    }
  }
);

// POST /api/auth/admin/login
router.post(
  '/admin/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const result = await query(
        'SELECT id, name, email, password_hash FROM admins WHERE email = $1',
        [email]
      );

      if (result.rowCount === 0) {
        return res.status(401).json({ error: 'Invalid admin credentials.' });
      }

      const admin = result.rows[0];
      const isMatch = await bcrypt.compare(password, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid admin credentials.' });
      }

      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const { password_hash, ...adminData } = admin;
      return res.json({ message: 'Admin login successful.', token, admin: adminData });
    } catch (err) {
      console.error('Admin login error:', err);
      return res.status(500).json({ error: 'Server error during admin login.' });
    }
  }
);

module.exports = router;
