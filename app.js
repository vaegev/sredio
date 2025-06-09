const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const GitHubStrategy = require('passport-github2').Strategy;
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const config = require('./config/config');

// Import routes
const githubRoutes = require('./routes/github.routes');

const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log('Request received:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  next();
});

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Session configuration
app.use(session({
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
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection with updated options
mongoose.connect(config.mongoUri, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Passport GitHub Strategy
passport.use(new GitHubStrategy({
    clientID: config.github.clientID,
    clientSecret: config.github.clientSecret,
    callbackURL: config.github.callbackURL,
    scope: ['user:email', 'repo', 'read:org']
  },
  function(accessToken, refreshToken, profile, done) {
    console.log('GitHub Strategy callback received:', { 
      profile: {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName
      },
      accessToken: !!accessToken,
      refreshToken: !!refreshToken
    });

    // Create a user object that will be stored in the session
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
));

passport.serializeUser((user, done) => {
  console.log('Serializing user:', {
    id: user.profile.id,
    username: user.profile.username
  });
  // Store the entire user object in the session
  done(null, user);
});

passport.deserializeUser((user, done) => {
  console.log('Deserializing user:', {
    id: user.profile.id,
    username: user.profile.username
  });
  // Return the user object as is
  done(null, user);
});

// Add debug middleware for session
app.use((req, res, next) => {
  console.log('Session state:', {
    id: req.session.id,
    cookie: req.session.cookie,
    user: req.user,
    isAuthenticated: req.isAuthenticated()
  });
  next();
});

// Test routes
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

// Routes
app.use('/api/github', githubRoutes);

// 404 handler
app.use((req, res, next) => {
  console.log('404 Not Found:', {
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
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Something broke!',
    message: err.message
  });
});

module.exports = app;
