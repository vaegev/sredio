import mongoose from 'mongoose';

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

export default mongoose.model('GitHubIntegration', githubIntegrationSchema); 