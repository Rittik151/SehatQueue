const express = require('express');
const router = express.Router();
const Queue = require('../models/Queue');

router.get('/', async (req, res) => {
  const list = await Queue.find({ status: 'waiting' }).sort({ triageLevel: 1, checkInTime: 1 });
  res.json(list);
});

router.post('/add', async (req, res) => {
  const newPatient = new Queue(req.body);
  await newPatient.save();
  res.json(newPatient);
});

module.exports = router;