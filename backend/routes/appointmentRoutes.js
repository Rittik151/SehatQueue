const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');

// Get all appointments for a patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.params.patientId })
      .sort({ appointmentDate: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get queue position for a specific appointment
router.get('/queue-position/:appointmentId', async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Count how many patients are ahead in the same department/doctor on the same day
    const patientsAhead = await Appointment.countDocuments({
      department: appointment.department,
      doctor: appointment.doctor,
      appointmentDate: {
        $gte: new Date(appointment.appointmentDate).setHours(0, 0, 0, 0),
        $lt: new Date(appointment.appointmentDate).setHours(23, 59, 59, 999),
      },
      createdAt: { $lt: appointment.createdAt },
      status: { $in: ['scheduled', 'waiting', 'in-progress'] },
    });

    const totalInQueue = await Appointment.countDocuments({
      department: appointment.department,
      doctor: appointment.doctor,
      appointmentDate: {
        $gte: new Date(appointment.appointmentDate).setHours(0, 0, 0, 0),
        $lt: new Date(appointment.appointmentDate).setHours(23, 59, 59, 999),
      },
      status: { $in: ['scheduled', 'waiting', 'in-progress'] },
    });

    res.json({
      queuePosition: patientsAhead + 1,
      totalInQueue: totalInQueue,
      estimatedWaitTime: (patientsAhead + 1) * 15, // Assuming 15 min per patient
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Book an appointment
router.post('/book', async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientPhone,
      department,
      doctor,
      appointmentDate,
    } = req.body;

    // Check how many patients are already booked for this doctor/department on that day
    const existingAppointments = await Appointment.countDocuments({
      department,
      doctor,
      appointmentDate: {
        $gte: new Date(appointmentDate).setHours(0, 0, 0, 0),
        $lt: new Date(appointmentDate).setHours(23, 59, 59, 999),
      },
      status: { $in: ['scheduled', 'waiting', 'in-progress'] },
    });

    const appointment = new Appointment({
      patientId,
      patientName,
      patientPhone,
      department,
      doctor,
      appointmentDate: new Date(appointmentDate),
      queuePosition: existingAppointments + 1,
      estimatedWaitTime: (existingAppointments + 1) * 15,
    });

    const savedAppointment = await appointment.save();
    res.json({ success: true, appointment: savedAppointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get upcoming appointments for a patient
router.get('/upcoming/:patientId', async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patientId: req.params.patientId,
      appointmentDate: { $gte: new Date() },
      status: { $in: ['scheduled', 'waiting'] },
    }).sort({ appointmentDate: 1 });

    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update appointment status
router.put('/:appointmentId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.appointmentId,
      { status, updatedAt: new Date() },
      { new: true }
    );
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get queue info for a specific doctor/department/date (used by booking form)
router.get('/doctor-queue', async (req, res) => {
  try {
    const { department, doctor, date } = req.query;
    if (!department || !doctor) {
      return res.status(400).json({ message: 'department and doctor are required' });
    }
    const targetDate = date ? new Date(date) : new Date();
    const count = await Appointment.countDocuments({
      department,
      doctor,
      appointmentDate: {
        $gte: new Date(new Date(targetDate).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(targetDate).setHours(23, 59, 59, 999)),
      },
      status: { $in: ['scheduled', 'waiting', 'in-progress'] },
    });
    res.json({ patientsInQueue: count, avgWaitTime: (count + 1) * 15 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel appointment
router.delete('/:appointmentId', async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.appointmentId,
      { status: 'cancelled' },
      { new: true }
    );
    res.json({ success: true, appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
