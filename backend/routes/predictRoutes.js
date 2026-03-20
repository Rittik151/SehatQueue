const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  try {
    // Features: [queue_length, triage_level, hour_of_day, staff_count]
    const { features } = req.body;
    const response = await axios.post(process.env.FLASK_API_URL, { features });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'AI Service Unavailable' });
  }
});

module.exports = router;