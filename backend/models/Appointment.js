const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  patientPhone: { type: String, required: true },
  department: { type: String, required: true },
  doctor: { type: String, required: true },
  appointmentDate: { type: Date, required: true },
  status: { type: String, default: 'scheduled' }, // scheduled, waiting, in-progress, completed, cancelled
  queuePosition: { type: Number },
  estimatedWaitTime: { type: Number }, // in minutes
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
