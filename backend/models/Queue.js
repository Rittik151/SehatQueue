const mongoose = require('mongoose');
const QueueSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  phone: { type: String, required: true },
  department: { type: String, required: true },
  triageLevel: { type: Number, required: true }, // 1 (Critical) to 5 (Non-urgent)
  predictedWait: { type: Number },
  checkInTime: { type: Date, default: Date.now },
  status: { type: String, default: 'waiting' } // waiting, in-consultation, completed
});
module.exports = mongoose.model('Queue', QueueSchema);