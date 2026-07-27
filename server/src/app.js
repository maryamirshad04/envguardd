require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const inviteRoutes = require('./routes/invites');
const shareRoutes = require('./routes/share');
const cliRoutes = require('./routes/cli');
const logger = require('./utils/logger');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim());

logger.info({ allowedOrigins }, 'CORS allowed origins');

app.use(
  cors({
    origin: (origin, callback) => {
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

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/auth/cli', cliRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api', shareRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url, origin: req.headers.origin });
  next();
});

module.exports = app;