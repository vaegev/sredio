const axios = require('axios');
const logger = require('../config/logger');

class GitHubHelper {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.api = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        'Authorization': `token ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
  }

  async getOrganizations() {
    try {
      const response = await this.api.get('/user/orgs');
      logger.performance('Fetched organizations', {
        count: response.data.length,
        duration: response.headers['x-response-time']
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch organizations', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      throw error;
    }
  }

  async getOrganizationRepos(org) {
    try {
      const response = await this.api.get(`/orgs/${org}/repos`);
      logger.performance('Fetched organization repos', {
        org,
        count: response.data.length,
        duration: response.headers['x-response-time']
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch organization repos', {
        error: error.message,
        stack: error.stack,
        org,
        response: error.response?.data
      });
      throw error;
    }
  }

  async getRepoCommits(owner, repo) {
    try {
      const response = await this.api.get(`/repos/${owner}/${repo}/commits`);
      logger.performance('Fetched repo commits', {
        owner,
        repo,
        count: response.data.length,
        duration: response.headers['x-response-time']
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch repo commits', {
        error: error.message,
        stack: error.stack,
        owner,
        repo,
        response: error.response?.data
      });
      throw error;
    }
  }

  async getRepoPulls(owner, repo) {
    try {
      const response = await this.api.get(`/repos/${owner}/${repo}/pulls`);
      logger.performance('Fetched repo pulls', {
        owner,
        repo,
        count: response.data.length,
        duration: response.headers['x-response-time']
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch repo pulls', {
        error: error.message,
        stack: error.stack,
        owner,
        repo,
        response: error.response?.data
      });
      throw error;
    }
  }

  async getRepoIssues(owner, repo) {
    try {
      const response = await this.api.get(`/repos/${owner}/${repo}/issues`);
      logger.performance('Fetched repo issues', {
        owner,
        repo,
        count: response.data.length,
        duration: response.headers['x-response-time']
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch repo issues', {
        error: error.message,
        stack: error.stack,
        owner,
        repo,
        response: error.response?.data
      });
      throw error;
    }
  }

  async getIssueComments(owner, repo, issueNumber) {
    try {
      const response = await this.api.get(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`);
      logger.performance('Fetched issue comments', {
        owner,
        repo,
        issueNumber,
        count: response.data.length,
        duration: response.headers['x-response-time']
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch issue comments', {
        error: error.message,
        stack: error.stack,
        owner,
        repo,
        issueNumber,
        response: error.response?.data
      });
      throw error;
    }
  }

  async getOrganizationMembers(org) {
    try {
      const response = await this.api.get(`/orgs/${org}/members`);
      logger.performance('Fetched organization members', {
        org,
        count: response.data.length,
        duration: response.headers['x-response-time']
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch organization members', {
        error: error.message,
        stack: error.stack,
        org,
        response: error.response?.data
      });
      throw error;
    }
  }

  async getAllData() {
    try {
      const startTime = Date.now();
      const organizations = await this.getOrganizations();
      const data = {
        organizations: [],
        totalRepos: 0,
        totalCommits: 0,
        totalPulls: 0,
        totalIssues: 0
      };

      for (const org of organizations) {
        const orgData = {
          name: org.login,
          repos: []
        };

        const repos = await this.getOrganizationRepos(org.login);
        data.totalRepos += repos.length;

        for (const repo of repos) {
          const repoData = {
            name: repo.name,
            commits: await this.getRepoCommits(org.login, repo.name),
            pulls: await this.getRepoPulls(org.login, repo.name),
            issues: await this.getRepoIssues(org.login, repo.name)
          };

          data.totalCommits += repoData.commits.length;
          data.totalPulls += repoData.pulls.length;
          data.totalIssues += repoData.issues.length;

          orgData.repos.push(repoData);
        }

        data.organizations.push(orgData);
      }

      logger.performance('Fetched all GitHub data', {
        duration: Date.now() - startTime,
        organizations: data.organizations.length,
        totalRepos: data.totalRepos,
        totalCommits: data.totalCommits,
        totalPulls: data.totalPulls,
        totalIssues: data.totalIssues
      });

      return data;
    } catch (error) {
      logger.error('Failed to fetch all GitHub data', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = GitHubHelper; 