const express = require('express');
const passport = require('passport');
const router = express.Router();
const githubController = require('../controllers/github.controller');

// Debug middleware for GitHub routes
router.use((req, res, next) => {
  console.log('GitHub Route:', {
    method: req.method,
    url: req.url,
    authenticated: req.isAuthenticated(),
    session: req.session,
    user: req.user
  });
  next();
});

// Check if user is authenticated
const isAuthenticated = (req, res, next) => {
  console.log('Checking authentication:', {
    isAuthenticated: req.isAuthenticated(),
    session: req.session,
    user: req.user
  });
  
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ 
    error: 'Not authenticated',
    message: 'Please authenticate with GitHub first'
  });
};

// GitHub OAuth routes
router.get('/auth/github',
  (req, res, next) => {
    console.log('Initiating GitHub OAuth...');
    next();
  },
  passport.authenticate('github', { 
    scope: ['user:email', 'repo', 'read:org'],
    session: true
  })
);

router.get('/auth/github/callback',
  (req, res, next) => {
    console.log('GitHub OAuth callback received:', {
      query: req.query,
      session: req.session
    });
    next();
  },
  passport.authenticate('github', { 
    failureRedirect: '/login',
    session: true
  }),
  (req, res, next) => {
    console.log('After GitHub authentication:', {
      isAuthenticated: req.isAuthenticated(),
      session: req.session,
      user: req.user
    });
    next();
  },
  githubController.handleCallback
);

// GitHub integration routes
router.get('/status', 
  (req, res, next) => {
    console.log('Checking integration status:', {
      authenticated: req.isAuthenticated(),
      session: {
        id: req.session.id,
        cookie: req.session.cookie,
        integrationId: req.session.integrationId
      },
      user: req.user,
      headers: req.headers
    });
    next();
  },
  githubController.getIntegrationStatus
);

router.delete('/remove', 
  isAuthenticated,
  (req, res, next) => {
    console.log('Removing integration:', {
      user: req.user
    });
    next();
  },
  githubController.removeIntegration
);

router.get('/data', 
  isAuthenticated,
  (req, res, next) => {
    console.log('Fetching GitHub data:', {
      user: req.user
    });
    next();
  },
  githubController.fetchGitHubData
);

module.exports = router; 