import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import { Strategy as GitHubStrategy } from 'passport-github2';
import path from 'path';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import githubRoutes from './routes/github.routes.js';
import logger from './config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure logging
const logRequest = (req, res, next) => {
  const { method, url, headers, body } = req;
  logger.info('Request received:', { method, url, headers, body });
  next();
};

// Configure error logging
const logError = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url
  });
  next(err);
};

// Middleware
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(logRequest);

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};
app.use(cors(corsOptions));

// Session configuration
const sessionConfig = {
  secret: config.session.secret,
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    httpOnly: true,
    path: '/'
  },
  name: 'github.sid'
};
app.use(session(sessionConfig));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection with error handling
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    });
    logger.info('Connected to MongoDB');
  } catch (err) {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  }
};
connectDB();

// Passport GitHub Strategy
const githubStrategy = new GitHubStrategy({
    clientID: config.github.clientID,
    clientSecret: config.github.clientSecret,
    callbackURL: config.github.callbackURL,
    scope: ['user:email', 'repo', 'read:org']
  },
  (accessToken, refreshToken, profile, done) => {
    logger.info('GitHub Strategy callback received:', { 
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName
      },
      accessToken: !!accessToken,
      refreshToken: !!refreshToken
    });

    const user = {
      id: profile.id,
      accessToken,
      refreshToken,
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        avatarUrl: profile.photos?.[0]?.value
      }
    };

    return done(null, user);
  }
);

passport.use(githubStrategy);

passport.serializeUser((user, done) => {
  logger.info('Serializing user:', {
    id: user.profile.id,
    username: user.profile.username
  });
  done(null, user);
});

passport.deserializeUser((user, done) => {
  logger.info('Deserializing user:', {
    id: user.profile.id,
    username: user.profile.username
  });
  done(null, user);
});

// Session debug middleware
const sessionDebug = (req, res, next) => {
  logger.debug('Session state:', {
    id: req.session.id,
    cookie: req.session.cookie,
    user: req.user,
    isAuthenticated: req.isAuthenticated()
  });
  next();
};
app.use(sessionDebug);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.get('/test-auth', (req, res) => {
  res.json({ 
    authenticated: req.isAuthenticated(),
    user: req.user,
    session: req.session
  });
});

app.use('/api/github', githubRoutes);

// 404 handler
app.use((req, res) => {
  logger.warn('404 Not Found:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Error handling
app.use(logError);
app.use((err, req, res, next) => {
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;
