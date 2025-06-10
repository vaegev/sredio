import GitHubIntegration from '../models/github-integration.model.js';
import GitHubHelper from '../helpers/github.helper.js';
import logger from '../config/logger.js';
import { ERROR_MESSAGES } from '../constants/error-messages.js';
import axios from 'axios';

// Constants
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Utility functions
const validateUser = (req) => {
  const userId = req.user?.id;
  if (!userId) {
    logger.error('No user ID found in request', { session: req.session });
    throw new Error(ERROR_MESSAGES.NOT_AUTHENTICATED);
  }
  return userId;
};

const validateAccessToken = async (accessToken) => {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Integration-App'
      }
    });
    return response.status === 200;
  } catch (error) {
    logger.error(ERROR_MESSAGES.INVALID_ACCESS_TOKEN, {
      error: error.message,
      response: error.response?.data
    });
    throw new Error(ERROR_MESSAGES.INVALID_ACCESS_TOKEN);
  }
};

// Get integration status
export const getIntegrationStatus = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    const integration = await GitHubIntegration.findOne({ userId });
    
    if (!integration?.accessToken) {
      logger.info('No GitHub integration found', { userId });
      return res.json({ connected: false });
    }

    try {
      const isValid = await validateAccessToken(integration.accessToken);
      if (!isValid) {
        await GitHubIntegration.deleteOne({ userId });
        logger.warn('Removed invalid GitHub integration', { userId });
        return res.json({ connected: false });
      }
    } catch (error) {
      logger.error('Token validation failed', {
        error: error.message,
        userId
      });
      await GitHubIntegration.deleteOne({ userId });
      return res.json({ connected: false });
    }
    
    logger.performance('Checked integration status', {
      userId,
      hasIntegration: true,
      duration: Date.now() - startTime
    });
    
    res.json({ connected: true });
  } catch (error) {
    logger.error(ERROR_MESSAGES.STATUS_ERROR, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      duration: Date.now() - startTime
    });
    res.status(error.message === ERROR_MESSAGES.NOT_AUTHENTICATED ? 401 : 500)
       .json({ error: ERROR_MESSAGES.STATUS_ERROR });
  }
};

// Remove integration
export const removeIntegration = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    await GitHubIntegration.deleteOne({ userId });
    
    logger.performance('Removed GitHub integration', {
      userId,
      duration: Date.now() - startTime
    });
    
    res.json({ message: 'Integration removed successfully' });
  } catch (error) {
    logger.error(ERROR_MESSAGES.REMOVE_ERROR, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      duration: Date.now() - startTime
    });
    res.status(error.message === ERROR_MESSAGES.NOT_AUTHENTICATED ? 401 : 500)
       .json({ error: ERROR_MESSAGES.REMOVE_ERROR });
  }
};

// Fetch GitHub data
export const fetchGitHubData = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    const integration = await GitHubIntegration.findOne({ userId });
    
    if (!integration?.accessToken) {
      logger.error(ERROR_MESSAGES.INTEGRATION_NOT_FOUND, { userId });
      return res.status(404).json({ error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const isValid = await validateAccessToken(integration.accessToken);
    if (!isValid) {
      await GitHubIntegration.deleteOne({ userId });
      logger.warn('Removed invalid GitHub integration', { userId });
      return res.status(401).json({ error: 'GitHub integration is invalid' });
    }

    const githubHelper = new GitHubHelper(integration.accessToken);
    const data = await githubHelper.getAllData();

    logger.performance('Fetched GitHub data', {
      userId,
      duration: Date.now() - startTime,
      dataSize: JSON.stringify(data).length
    });
    
    res.json(data);
  } catch (error) {
    logger.error(ERROR_MESSAGES.FETCH_ERROR, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      duration: Date.now() - startTime
    });
    res.status(error.message === ERROR_MESSAGES.NOT_AUTHENTICATED ? 401 : 500)
       .json({ error: ERROR_MESSAGES.FETCH_ERROR });
  }
};

// Fetch GitHub data
export const fetchGitHubOrgs = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    const integration = await GitHubIntegration.findOne({ userId });

    if (!integration?.accessToken) {
      logger.error(ERROR_MESSAGES.INTEGRATION_NOT_FOUND, { userId });
      return res.status(404).json({ error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const isValid = await validateAccessToken(integration.accessToken);
    if (!isValid) {
      await GitHubIntegration.deleteOne({ userId });
      logger.warn('Removed invalid GitHub integration', { userId });
      return res.status(401).json({ error: 'GitHub integration is invalid' });
    }

    const githubHelper = new GitHubHelper(integration.accessToken);
    const data = await githubHelper.getOrganizations();

    logger.performance('Fetched GitHub data', {
      userId,
      duration: Date.now() - startTime,
      dataSize: JSON.stringify(data).length
    });

    res.json(data);
  } catch (error) {
    logger.error(ERROR_MESSAGES.FETCH_ERROR, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      duration: Date.now() - startTime
    });
    res.status(error.message === ERROR_MESSAGES.NOT_AUTHENTICATED || error.message === ERROR_MESSAGES.INVALID_ACCESS_TOKEN ? 401 : 500)
       .json({ error: ERROR_MESSAGES.FETCH_ERROR });
  }
};
// Fetch GitHub data
export const fetchOrgData = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    const integration = await GitHubIntegration.findOne({ userId });

    if (!integration?.accessToken) {
      logger.error(ERROR_MESSAGES.INTEGRATION_NOT_FOUND, { userId });
      return res.status(404).json({ error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const isValid = await validateAccessToken(integration.accessToken);
    if (!isValid) {
      await GitHubIntegration.deleteOne({ userId });
      logger.warn('Removed invalid GitHub integration', { userId });
      return res.status(401).json({ error: 'GitHub integration is invalid' });
    }

    const githubHelper = new GitHubHelper(integration.accessToken);
    const data = await githubHelper.getOrganizationRepos(req.params.org);

    logger.performance('Fetched GitHub data', {
      userId,
      duration: Date.now() - startTime,
      dataSize: JSON.stringify(data).length
    });

    res.json(data);
  } catch (error) {
    logger.error(ERROR_MESSAGES.FETCH_ERROR, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      duration: Date.now() - startTime
    });
    res.status(error.message === ERROR_MESSAGES.NOT_AUTHENTICATED ? 401 : 500)
       .json({ error: ERROR_MESSAGES.FETCH_ERROR });
  }
};

// Fetch GitHub data
export const fetchOrgRepoCommits = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    const integration = await GitHubIntegration.findOne({ userId });

    if (!integration?.accessToken) {
      logger.error(ERROR_MESSAGES.INTEGRATION_NOT_FOUND, { userId });
      return res.status(404).json({ error: ERROR_MESSAGES.INTEGRATION_NOT_FOUND });
    }

    const isValid = await validateAccessToken(integration.accessToken);
    if (!isValid) {
      await GitHubIntegration.deleteOne({ userId });
      logger.warn('Removed invalid GitHub integration', { userId });
      return res.status(401).json({ error: 'GitHub integration is invalid' });
    }

    const githubHelper = new GitHubHelper(integration.accessToken);
    const data = await githubHelper.getRepoCommits(req.params.org, req.params.repo);

    logger.performance('Fetched GitHub data', {
      userId,
      duration: Date.now() - startTime,
      dataSize: JSON.stringify(data).length
    });

    res.json(data);
  } catch (error) {
    logger.error(ERROR_MESSAGES.FETCH_ERROR, {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      duration: Date.now() - startTime
    });
    res.status(error.message === ERROR_MESSAGES.NOT_AUTHENTICATED ? 401 : 500)
       .json({ error: ERROR_MESSAGES.FETCH_ERROR });
  }
};

// Handle GitHub OAuth callback
export const handleCallback = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    const accessToken = req.user?.accessToken;

    if (!accessToken) {
      throw new Error(ERROR_MESSAGES.NO_ACCESS_TOKEN);
    }

    // Validate the token
    const isValid = await validateAccessToken(accessToken);
    if (!isValid) {
      throw new Error(ERROR_MESSAGES.INVALID_ACCESS_TOKEN);
    }

    // Check if integration already exists
    let integration = await GitHubIntegration.findOne({ userId });
    
    if (integration) {
      // Update existing integration
      integration.accessToken = accessToken;
      integration.lastUpdated = new Date();
      await integration.save();
    } else {
      // Create new integration
      integration = new GitHubIntegration({
        userId,
        accessToken,
        lastUpdated: new Date()
      });
      await integration.save();
    }

    logger.performance('Completed GitHub OAuth process', {
      userId,
      integrationId: integration._id,
      duration: Date.now() - startTime
    });

    res.redirect(`${FRONTEND_URL}/integration-success`);
  } catch (error) {
    logger.error('Failed to complete GitHub integration', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      session: req.session,
      duration: Date.now() - startTime
    });
    res.redirect(`${FRONTEND_URL}`);
  }
}; 