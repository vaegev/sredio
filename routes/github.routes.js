import express from 'express';
import passport from 'passport';
import logger from '../config/logger.js';
import * as githubController from '../controllers/github.controller.js';
import {fetchOrgData, fetchOrgRepoCommits} from "../controllers/github.controller.js";

const router = express.Router();

// Middleware for logging GitHub routes
const logGitHubRoute = (req, res, next) => {
  logger.info('GitHub Route:', {
    method: req.method,
    url: req.url,
    authenticated: req.isAuthenticated(),
    session: req.session,
    user: req.user
  });
  next();
};

// Authentication middleware
const isAuthenticated = (req, res, next) => {
  logger.debug('Checking authentication:', {
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

// Apply logging middleware to all routes
router.use(logGitHubRoute);

// GitHub OAuth routes
router.get('/auth/github',
  (req, res, next) => {
    logger.info('Initiating GitHub OAuth...');
    next();
  },
  passport.authenticate('github', { 
    scope: ['user:email', 'repo', 'read:org'],
    session: true
  })
);

router.get('/auth/github/callback',
  (req, res, next) => {
    logger.info('GitHub OAuth callback received:', {
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
    logger.info('After GitHub authentication:', {
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
    logger.debug('Checking integration status:', {
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
    logger.info('Removing integration:', {
      user: req.user
    });
    next();
  },
  githubController.removeIntegration
);

router.get('/data', 
  isAuthenticated,
  (req, res, next) => {
    logger.info('Fetching GitHub data:', {
      user: req.user
    });
    next();
  },
  githubController.fetchGitHubData
);


router.get('/data/orgs',
  isAuthenticated,
  (req, res, next) => {
    logger.info('Fetching GitHub data:', {
      user: req.user
    });
    next();
  },
  githubController.fetchGitHubOrgs
);

router.get('/data/org/:org',
  isAuthenticated,
  (req, res, next) => {
    logger.info('Fetching GitHub data:', {
      user: req.user
    });
    next();
  },
  githubController.fetchOrgData
);

router.get('/data/org/:org/repo/:repo',
  isAuthenticated,
  (req, res, next) => {
    logger.info('Fetching GitHub data:', {
      user: req.user
    });
    next();
  },
  githubController.fetchOrgRepoCommits
);

// Error handling middleware for GitHub routes
router.use((err, req, res, next) => {
  logger.error('GitHub route error:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url
  });
  res.status(500).json({
    error: 'GitHub Integration Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred with GitHub integration'
  });
});

export default router; 