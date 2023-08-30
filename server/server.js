require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3003;
const { google } = require('googleapis');
// const Photos = require('googlephotos');
const url = require('url');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URL = process.env.REDIRECT_URL;
const NODE_ENV = process.env.NODE_ENV;
const SESSION_SECRET = process.env.SESSION_SECRET;
let ACCESS_TOKEN = process.env.GOOGLE_ACCESS_TOKEN;
let REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

console.log('Initial ACCESS_TOKEN:', ACCESS_TOKEN);
console.log('Initial REFRESH_TOKEN:', REFRESH_TOKEN);

console.log(`Redirect URL is: ${REDIRECT_URL}`);

// Enforce HTTPS redirection in production
if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Log serving file
app.use((req, res, next) => {
  console.log(`Serving file at path: ${req.path}`);
  next();
});

// Set referrer-policy header
app.use((req, res, next) => {
  if (req.headers.host === 'localhost' && req.protocol === 'http') {
    res.set('Referrer-Policy', 'no-referrer-when-downgrade');
  }
  next();
});

// Setting content-type headers for files
app.use((req, res, next) => {
  const contentTypeMap = {
    '.js': 'application/javascript',
    '.html': 'text/html',
    '.css': 'text/css',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };

  const ext = path.extname(req.url);
  if (contentTypeMap[ext]) {
    res.setHeader('Content-Type', contentTypeMap[ext]);
  }

  next();
});

// Add middleware 
app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Serve static files
app.use(express.static(path.join(__dirname, '../src/')));

app.get('/config', (req, res) => {
  res.json({
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
  });
});

//* Obtaining OAuth 2.0 access tokens
// Set up your OAuth2 client for the API
console.log(`Creating OAuth2 client with Redirect URL: ${REDIRECT_URL}`);
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URL,
);

console.log('OAuth2 client CREATED: ', oauth2Client);

// Redirect to Google's OAuth 2.0 server
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // Gets refresh token
  scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
  // scope: Photos.Scopes.READ_ONLY,
  include_granted_scopes: true,
  response_type: 'code',
});

// Redirect to Google's OAuth 2.0 server
app.get('/authorize', (req, res) => {
  res.redirect(authUrl);
  // This response will be sent back to the specified redirect URL 
  // with endpoint /oauth2callback
});

// Exchange authorization code for access and refresh tokens
app.get('/oauth2callback', async (req, res) => {
  try {
    console.log('Received request for /oauth2callback');
    const q = url.parse(req.url, true).query;
    console.log('Parsed query parameters:', q);
    if (q.error) {
      console.error('Error in query parameters:', q.error);
      res.status(400).send('Authentication failed');
      return;
    }
    // Get access and refresh tokens
    console.log('Attempting to get tokens with code:', q.code);
    const { tokens } = await oauth2Client.getToken(q.code);
    // console.log('Received tokens:', tokens);

    oauth2Client.setCredentials(tokens);
    console.log('Credentials set in OAuth2 client');

    // Check if tokens are already assigned, update .env variables
    if (ACCESS_TOKEN === 'NOT_ASSIGNED_YET') {
      ACCESS_TOKEN = tokens.access_token;
      process.env.GOOGLE_ACCESS_TOKEN = ACCESS_TOKEN;
    }
    
    if (REFRESH_TOKEN === 'NOT_ASSIGNED_YET') {
      REFRESH_TOKEN = tokens.refresh_token;
      process.env.GOOGLE_REFRESH_TOKEN = REFRESH_TOKEN; 
    }
    console.log('Tokens assigned to .env variables:', { ACCESS_TOKEN, REFRESH_TOKEN });

    // Check if the access token is expired and refresh it if necessary
    if (oauth2Client.isTokenExpiring()) {
      const refreshedTokens = await oauth2Client.getAccessToken();
      if (refreshedTokens) {
        console.log('Access token refreshed:', refreshedTokens.token);
        ACCESS_TOKEN = refreshedTokens.token;
        process.env.GOOGLE_ACCESS_TOKEN = ACCESS_TOKEN;
      }
    }

    // Update session tokens (only if not already assigned)
    if (!req.session.accessToken) {
      req.session.accessToken = ACCESS_TOKEN;
      req.session.refreshToken = REFRESH_TOKEN;
    }
    console.log('Tokens stored in session:', {
      accessToken: req.session.accessToken,
      refreshToken: req.session.refreshToken,
    });
  
    res.cookie('accessToken', ACCESS_TOKEN, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'None',
    });
    console.log('Cookie set with name "accessToken"');

    // Redirect to home page
    res.redirect('/');
  } catch (error) {
    console.error('ERROR in /oauth2callback:', error);
    res.status(500).send('Something went wrong!');  
  }
});

// Fetch photos from Google Photos
app.get('/photos', async (req, res) => {
  console.log('Received request for /photos.');

  // Access token is available, proceed with the API request
  const accessToken = req.session.accessToken;
  const refreshToken = req.session.refreshToken;
  console.log('Retrieved tokens from session:', { accessToken, refreshToken });
  
  try {
    console.log('Trying request for /photos');

    // Use the stored tokens to authenticate
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Make the API request to Google Photos
    const Photos = google.photoslibrary;
    const response = await Photos.mediaItems.search({
      version: 'v1',     
      auth: oauth2Client,
      resource:  {
        pageSize: 100,
      },
    });

    console.log('Received API response:', response.data);
    res.json(response.data);

    if (response.data && response.data.mediaItems) {
      console.log('Received photos:', response.data.mediaItems);
      res.json(response.data.mediaItems);
    } else {
      console.error('Error: Unexpected API response structure', response);
      res.status(500).send('Unexpected API response structure');
    }

  } catch (err) {
    console.error('ERROR getting photos:', err);
    res.status(500).send(`Something went wrong! Error: ${err.message}`);
  }
});

// Check if user is authenticated
app.get('/is-authenticated', (req, res) => {
  console.log('Cookies in /is-authenticated:', req.cookies);
  console.log('Cookie header in /is-authenticated:', req.headers.cookie);

  if (req.cookies.accessToken) {
    res.status(200).json({ isAuthenticated: true });
  } else {
    res.status(200).json({ isAuthenticated: false });
  }
});

// Clear access token cookie 
app.post('/logout', (req, res) => {
  res.clearCookie('accessToken');
  res.status(200).json({ success: true });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Something went wrong!');
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
