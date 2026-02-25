const { prisma } = require('../config/db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'production-planning-secret-key';
const JWT_EXPIRES_IN = '7d';

const ALL_PAGES = [
  'dashboard', 'order-dispatch', 'oil-indent', 'oil-indent-approval',
  'lab-confirmation', 'dispatch-planning', 'oil-receipt', 'packing-raw-material',
  'raw-material-issue', 'raw-material-receipt', 'production-entry',
  'balance-material', 'stock-in', 'reports'
];

/**
 * Login - validate credentials using plain text password, return JWT
 */
const loginUser = async (username, password) => {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) throw new Error('Invalid username or password');
  if (user.status === 'inactive') throw new Error('Account is inactive. Please contact admin.');

  // Plain text password comparison
  if (password !== user.password) throw new Error('Invalid username or password');

  // Generate JWT token
  const { password: _, ...userWithoutPassword } = user;
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return { user: userWithoutPassword, token };
};

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Get all users (for Settings page)
 */
const getUsers = async () => {
  const users = await prisma.user.findMany({
    orderBy: { created_at: 'asc' }
  });
  return users.map(({ password, ...u }) => u); // Strip password
};

/**
 * Create user - stores plain text password
 */
const createUser = async (data) => {
  const { username, password, email, phoneNo, role, status, allowedPages } = data;
  const user = await prisma.user.create({
    data: {
      username,
      password: password, // plain text
      email: email || null,
      phone_no: phoneNo || null,
      role: role || 'user',
      status: status || 'active',
      allowed_pages: allowedPages || ALL_PAGES
    }
  });
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Update user - stores plain text password
 */
const updateUser = async (id, data) => {
  const { username, password, email, phoneNo, role, status, allowedPages } = data;
  const updateData = {
    username,
    email: email || null,
    phone_no: phoneNo || null,
    role,
    status,
    allowed_pages: allowedPages
  };
  if (password && password.trim() !== '') {
    updateData.password = password; // plain text
  }
  const user = await prisma.user.update({
    where: { id: Number(id) },
    data: updateData
  });
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Delete user
 */
const deleteUser = async (id) => {
  return await prisma.user.delete({ where: { id: Number(id) } });
};

/**
 * Seed default admin if no users exist
 */
const seedDefaultAdmin = async () => {
  const count = await prisma.user.count();
  if (count === 0) {
    await prisma.user.create({
      data: {
        username: 'admin',
        password: 'admin123', // plain text
        email: 'admin@production.com',
        phone_no: '9999999999',
        role: 'admin',
        status: 'active',
        allowed_pages: ALL_PAGES
      }
    });
    console.log('✅ Default admin user created: username=admin, password=admin123');
  }
};

module.exports = { loginUser, verifyToken, getUsers, createUser, updateUser, deleteUser, seedDefaultAdmin, ALL_PAGES };
