const userService = require('../services/userService');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const result = await userService.loginUser(username, password);
    // result = { user, token }
    res.status(200).json({ success: true, user: result.user, token: result.token });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const users = await userService.getUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const create = async (req, res) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
};

const update = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
};

const remove = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = { login, getAll, create, update, remove };
