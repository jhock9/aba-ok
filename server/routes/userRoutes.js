const router = require('express').Router();
const logger = require('../config/winston');
const User = require('../models/userModel');
const Appointment = require('../models/appointmentModel');

router.post('/create-user', async (req, res) => {
  logger.info('Received request for /create-user...');
  const { fullname, username, password, role } = req.body;
  
  // Validation checks
  if (!fullname || !username || !password || !role) {
    return res.status(400).json({ error: 'Full name, username, password, and role are required' });
  }
  
  // Check if username already exists
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists.' });
  }
  
  // Password = 4 digit code
  if (!password.match(/^\d{4}$/)) {
    return res.status(400).json({ error: 'Password must be a 4 digit code.' });
  }
  
  logger.info('New user validated...');
  try {
    const user = new User({ fullname, username, password, role });
    await user.save();
    
    // Create a new appointment for the new user
    const newAppointment = new Appointment({ client: user._id });
    await newAppointment.save();
    user.defaultAppointment = newAppointment._id;
    await user.save();
    
    res.status(201).json({ success: true });
  } catch (error) {
    logger.error(`ERROR: ${error}`);
    res.status(400).json({ error: error.message });
  } 
});

router.get('/refresh-users', async (req, res) => {
  logger.info('Received request for /refresh-users...');
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    logger.error(`ERROR fetching users from database: ${error}`);
    res.status(400).json({ error: error.message });
  }
});

router.get('/user-id/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (user) {
      res.json(user._id);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.toString() });
  }
});

// Export to server.js
module.exports = router;
