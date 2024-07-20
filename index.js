const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const bcrypt = require('bcryptjs');

const app = express();
app.use(bodyParser.json());

const users = {};
const preferences = {};

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (users[username]) {
    return res.status(400).json({ message: 'Username already exists' });
  }
  const hashedPassword = bcrypt.hashSync(password, 8);
  const accessCode = uuid.v4();
  users[username] = { password: hashedPassword, accessCode };
  return res.status(201).json({ accessCode });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// Add or edit preferences
app.post('/preferences', (req, res) => {
    const { username, accessCode, startDate, endDate, destination, vacationType } = req.body;
  
    if (!users[username] || users[username].accessCode !== accessCode) {
      return res.status(403).json({ message: 'Invalid access code' });
    }
  
    if (new Date(endDate) - new Date(startDate) > 7 * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'Vacation cannot exceed one week' });
    }
  
    preferences[username] = { startDate, endDate, destination, vacationType };
    return res.status(200).json({ message: 'Preferences saved' });
  });

app.get('/preferences', (req, res) => {
    return res.status(200).json(preferences);
  });
  
  function calculateResults(preferences) {
    const dates = [];
    const destinations = {};
    const vacationTypes = {};
  
    for (const username in preferences) {
      const { startDate, endDate, destination, vacationType } = preferences[username];
      dates.push({ startDate: new Date(startDate), endDate: new Date(endDate) });
  
      if (!destinations[destination]) destinations[destination] = 0;
      destinations[destination]++;
  
      if (!vacationTypes[vacationType]) vacationTypes[vacationType] = 0;
      vacationTypes[vacationType]++;
    }
  
    const commonStartDate = dates.reduce((latest, { startDate }) => latest > startDate ? latest : startDate, dates[0].startDate);
    const commonEndDate = dates.reduce((earliest, { endDate }) => earliest < endDate ? earliest : endDate, dates[0].endDate);
  
    const majorityDestination = Object.keys(destinations).reduce((a, b) => destinations[a] > destinations[b] ? a : b);
    const majorityVacationType = Object.keys(vacationTypes).reduce((a, b) => vacationTypes[a] > vacationTypes[b] ? a : b);
  
    return {
      startDate: commonStartDate,
      endDate: commonEndDate,
      destination: majorityDestination,
      vacationType: majorityVacationType
    };
  }

  app.get('/results', (req, res) => {
    if (Object.keys(preferences).length < 5) {
      return res.status(400).json({ message: 'All preferences are not yet submitted' });
    }
    const results = calculateResults(preferences);
    return res.status(200).json(results);
  });
  