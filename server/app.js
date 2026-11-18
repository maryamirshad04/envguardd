require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./src/routes/auth');
const companyRoutes = require('./src/routes/companies');
const inviteRoutes = require('./src/routes/invites');
const shareRoutes = require('./src/routes/share');
const logger = require('./src/utils/logger');
const auditRoutes = require('./src/routes/audit');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim());

logger.info({ allowedOrigins }, 'CORS allowed origins');

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        logger.debug({ origin }, 'CORS allowed');
        callback(null, true);
      } else {
        logger.warn({ origin, allowedOrigins }, 'CORS blocked');
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// --- Other middleware ---
app.use(express.json());
app.use(cookieParser());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api', shareRoutes);
app.use('/api/audit', auditRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, origin: req.headers.origin });
  next();
});

module.exports = app;