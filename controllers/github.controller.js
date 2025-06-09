const GitHubIntegration = require('../models/github-integration.model');
const GitHubHelper = require('../helpers/github.helper');
const logger = require('../config/logger');

// Store GitHub data in MongoDB
async function storeData(data, userId, accessToken) {
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
      records: Object.values(data).reduce((acc, curr) => acc + curr.length, 0)
    });
  } catch (error) {
    logger.error('Failed to store GitHub data', {
      error: error.message,
      stack: error.stack,
      userId
    });
    throw error;
  }
}

// Get integration status
exports.getIntegrationStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.error('No user ID found in request', { session: req.session });
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const integration = await GitHubIntegration.findOne({ userId });
    logger.performance('Checked integration status', {
      userId,
      hasIntegration: !!integration
    });
    
    res.json({ connected: !!integration });
  } catch (error) {
    logger.error('Failed to get integration status', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to get integration status' });
  }
};

// Remove integration
exports.removeIntegration = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.error('No user ID found in request', { session: req.session });
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await GitHubIntegration.deleteOne({ userId });
    logger.performance('Removed GitHub integration', { userId });
    
    res.json({ message: 'Integration removed successfully' });
  } catch (error) {
    logger.error('Failed to remove integration', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    res.status(500).json({ error: 'Failed to remove integration' });
  }
};

// Fetch GitHub data
exports.fetchGitHubData = async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.error('No user ID found in request', { session: req.session });
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const integration = await GitHubIntegration.findOne({ userId });
    if (!integration || !integration.accessToken) {
      logger.error('No GitHub integration found', { userId });
      return res.status(404).json({ error: 'GitHub integration not found' });
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
    res.status(500).json({ error: 'Failed to fetch GitHub data' });
  }
};

// Handle GitHub OAuth callback
exports.handleCallback = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.error('No user ID found in request', {
        session: req.session,
        headers: req.headers,
        query: req.query
      });
      return res.redirect('http://localhost:4200/integration-error');
    }

    const accessToken = req.user?.accessToken;
    if (!accessToken) {
      logger.error('No access token found in user object', {
        user: req.user,
        session: req.session
      });
      return res.redirect('http://localhost:4200/integration-error');
    }

    const integration = new GitHubIntegration({
      userId,
      accessToken,
      lastUpdated: new Date()
    });
    await integration.save();

    logger.performance('Completed GitHub OAuth process', {
      userId,
      integrationId: integration._id
    });

    res.redirect('http://localhost:4200/integration-success');
  } catch (error) {
    logger.error('Failed to complete GitHub integration', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      session: req.session
    });
    res.redirect('http://localhost:4200/integration-error');
  }
}; 