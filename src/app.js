const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { seedDefaultAdmin } = require('./services/userService');

const app = express();

// Seed default admin on startup
seedDefaultAdmin().catch(err => console.error('Seed error:', err));

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';
app.use(apiPrefix, require('./routes'));

// 404 Handler - must come after all routes
app.use(notFoundHandler);

// Global Error Handler - must be last
app.use(errorHandler);

module.exports = app;
