const mongoose = require('mongoose');

const githubIntegrationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: String,
  profile: {
    id: String,
    username: String,
    displayName: String,
    email: String,
    avatarUrl: String
  },
  connectedAt: {
    type: Date,
    default: Date.now
  },
  lastSyncAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('GitHubIntegration', githubIntegrationSchema); 