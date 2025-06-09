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
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.status === 200;
  } catch (error) {
    logger.error('Invalid access token', {
      error: error.message,
      response: error.response?.data
    });
    return false;
  }
};

// Store GitHub data in MongoDB
async function storeData(data, userId, accessToken) {
  const startTime = Date.now();
  try {
    await GitHubIntegration.deleteMany({ userId });
    const integration = new GitHubIntegration({
      userId,
      accessToken,
      data,
      lastUpdated: new Date()
    });
    await integration.save();
    
    logger.performance('Stored GitHub data', {
      userId,
      collections: Object.keys(data).length,
      records: Object.values(data).reduce((acc, curr) => acc + curr.length, 0),
      duration: Date.now() - startTime
    });
  } catch (error) {
    logger.error('Failed to store GitHub data', {
      error: error.message,
      stack: error.stack,
      userId,
      duration: Date.now() - startTime
    });
    throw new Error('Failed to store GitHub data');
  }
}

// Get integration status
export const getIntegrationStatus = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    const integration = await GitHubIntegration.findOne({ userId });
    
    if (integration?.accessToken) {
      const isValid = await validateAccessToken(integration.accessToken);
      if (!isValid) {
        await GitHubIntegration.deleteOne({ userId });
        logger.warn('Removed invalid GitHub integration', { userId });
        return res.json({ connected: false });
      }
    }
    
    logger.performance('Checked integration status', {
      userId,
      hasIntegration: !!integration,
      duration: Date.now() - startTime
    });
    
    res.json({ connected: !!integration });
  } catch (error) {
    logger.error('Failed to get integration status', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      duration: Date.now() - startTime
    });
    res.status(error.message === 'Not authenticated' ? 401 : 500)
       .json({ error: 'Failed to get integration status' });
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
    logger.error('Failed to remove integration', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      duration: Date.now() - startTime
    });
    res.status(error.message === 'Not authenticated' ? 401 : 500)
       .json({ error: 'Failed to remove integration' });
  }
};

// Fetch GitHub data
export const fetchGitHubData = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    const integration = await GitHubIntegration.findOne({ userId });
    
    if (!integration?.accessToken) {
      logger.error('No GitHub integration found', { userId });
      return res.status(404).json({ error: 'GitHub integration not found' });
    }

    const isValid = await validateAccessToken(integration.accessToken);
    if (!isValid) {
      await GitHubIntegration.deleteOne({ userId });
      logger.warn('Removed invalid GitHub integration', { userId });
      return res.status(401).json({ error: 'GitHub integration is invalid' });
    }

    const githubHelper = new GitHubHelper(integration.accessToken);
    const data = await githubHelper.getAllData();
    await storeData(data, userId, integration.accessToken);
    
    logger.performance('Fetched GitHub data', {
      userId,
      duration: Date.now() - startTime,
      dataSize: JSON.stringify(data).length
    });
    
    res.json(data);
  } catch (error) {
    logger.error('Failed to fetch GitHub data', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      duration: Date.now() - startTime
    });
    res.status(error.message === 'Not authenticated' ? 401 : 500)
       .json({ error: 'Failed to fetch GitHub data' });
  }
};

// Handle GitHub OAuth callback
export const handleCallback = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = validateUser(req);
    const accessToken = validateAccessToken(req.user);

    if (!accessToken) {
      throw new Error('Invalid access token');
    }

    const integration = new GitHubIntegration({
      userId,
      accessToken,
      lastUpdated: new Date()
    });
    await integration.save();

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
    res.redirect(`${FRONTEND_URL}/integration-error`);
  }
}; 