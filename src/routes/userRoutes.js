const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Auth
router.post('/login', userController.login);

// User management (admin)
router.get('/', userController.getAll);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);

module.exports = router;
