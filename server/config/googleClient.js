require('dotenv').config();
const { google } = require('googleapis');
const logger = require('./winston');
const Token = require('../models/tokenModel');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;
logger.info(`Environment variables: REDIRECT_URL = ${REDIRECT_URL}`);

// Set up your OAuth2 client for the API
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URL,
);
logger.info('OAuth2 client CREATED...');

// Fetch the refresh token from the database
Token.findOne({}, (err, tokenDoc) => {
  if (err) {
    logger.error('Failed to fetch refresh token from database:', err);
  } else if (tokenDoc) {
    oauth2Client.setCredentials({ refresh_token: tokenDoc.refreshToken });
  }
});

// Listen for the "tokens" event for refreshing the access token when expired
oauth2Client.on('tokens', (tokens) => {
  if (tokens.refresh_token) {
    // Update the refresh token in the database
    Token.findOneAndUpdate({}, { refreshToken: tokens.refresh_token }, { upsert: true }, (err) => {
      if (err) {
        logger.error('Failed to update refresh token in database:', err);
      }
    });
  }
});

// Export to server.js and googleAuthRoutes.js, respectively
module.exports = {
  GOOGLE_CLIENT_ID,
  oauth2Client
};
