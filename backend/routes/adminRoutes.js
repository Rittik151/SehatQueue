const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify admin or staff token
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Allow both admin and staff to access these routes
    if (user.role !== 'admin' && user.role !== 'staff') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin or Staff privileges required.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// @route   GET /api/admin/pending-providers
// @desc    Get all pending provider and staff registrations
// @access  Admin only
router.get('/pending-providers', verifyAdmin, async (req, res) => {
  try {
    const pendingProviders = await User.find({
      role: { $in: ['provider', 'staff'] },
      approvalStatus: 'pending',
      isApproved: false
    }).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingProviders.length,
      providers: pendingProviders
    });
  } catch (error) {
    console.error('Error fetching pending providers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching pending providers',
      error: error.message
    });
  }
});

// @route   GET /api/admin/all-providers
// @desc    Get all providers and staff with their approval status
// @access  Admin only
router.get('/all-providers', verifyAdmin, async (req, res) => {
  try {
    const providers = await User.find({
      role: { $in: ['provider', 'staff'] }
    }).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: providers.length,
      providers: providers
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching providers',
      error: error.message
    });
  }
});

// @route   POST /api/admin/approve-provider/:id
// @desc    Approve a provider or staff registration
// @access  Admin only
router.post('/approve-provider/:id', verifyAdmin, async (req, res) => {
  try {
    const providerId = req.params.id;
    
    const provider = await User.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (provider.role !== 'provider' && provider.role !== 'staff') {
      return res.status(400).json({
        success: false,
        message: 'User is not a provider or staff member'
      });
    }

    // Update provider/staff approval status
    provider.isApproved = true;
    provider.approvalStatus = 'approved';
    provider.approvedBy = req.user._id;
    provider.approvedAt = new Date();
    
    await provider.save();

    res.status(200).json({
      success: true,
      message: `${provider.role === 'staff' ? 'Staff' : 'Provider'} approved successfully`,
      provider: {
        id: provider._id,
        fullName: provider.fullName,
        email: provider.email,
        role: provider.role,
        approvalStatus: provider.approvalStatus,
        approvedAt: provider.approvedAt
      }
    });
  } catch (error) {
    console.error('Error approving user:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving user',
      error: error.message
    });
  }
});

// @route   POST /api/admin/reject-provider/:id
// @desc    Reject a provider or staff registration
// @access  Admin only
router.post('/reject-provider/:id', verifyAdmin, async (req, res) => {
  try {
    const providerId = req.params.id;
    const { reason } = req.body;
    
    const provider = await User.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (provider.role !== 'provider' && provider.role !== 'staff') {
      return res.status(400).json({
        success: false,
        message: 'User is not a provider or staff member'
      });
    }

    // Update provider/staff approval status
    provider.isApproved = false;
    provider.approvalStatus = 'rejected';
    provider.approvedBy = req.user._id;
    provider.approvedAt = new Date();
    
    await provider.save();

    res.status(200).json({
      success: true,
      message: `${provider.role === 'staff' ? 'Staff' : 'Provider'} rejected successfully`,
      provider: {
        id: provider._id,
        fullName: provider.fullName,
        email: provider.email,
        role: provider.role,
        approvalStatus: provider.approvalStatus
      }
    });
  } catch (error) {
    console.error('Error rejecting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting user',
      error: error.message
    });
  }
});

// @route   GET /api/admin/all-patients
// @desc    Get all patients with their appointment counts
// @access  Admin only
router.get('/all-patients', verifyAdmin, async (req, res) => {
  try {
    const Appointment = require('../models/Appointment');
    
    // Get all users with role 'patient'
    const patients = await User.find({
      role: 'patient'
    }).select('-password').sort({ createdAt: -1 });

    // Get appointment counts for each patient
    const patientsWithVisits = await Promise.all(
      patients.map(async (patient) => {
        const appointmentCount = await Appointment.countDocuments({
          patientId: patient._id
        });

        return {
          id: patient._id,
          name: patient.fullName,
          email: patient.email,
          phone: patient.phone || 'N/A',
          age: patient.dateOfBirth 
            ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365))
            : 'N/A',
          gender: patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'N/A',
          visits: appointmentCount,
          status: patient.isApproved ? 'Active' : 'Inactive',
          joinDate: patient.createdAt
        };
      })
    );

    res.status(200).json({
      success: true,
      count: patientsWithVisits.length,
      patients: patientsWithVisits
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patients',
      error: error.message
    });
  }
});

// @route   POST /api/admin/block-patient/:id
// @desc    Block or unblock a patient
// @access  Admin only
router.post('/block-patient/:id', verifyAdmin, async (req, res) => {
  try {
    const patientId = req.params.id;
    const patient = await User.findById(patientId);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    if (patient.role !== 'patient') {
      return res.status(400).json({
        success: false,
        message: 'User is not a patient'
      });
    }

    // Toggle the approval status
    patient.isApproved = !patient.isApproved;
    await patient.save();

    res.status(200).json({
      success: true,
      message: `Patient ${patient.isApproved ? 'unblocked' : 'blocked'} successfully`,
      patient: {
        id: patient._id,
        fullName: patient.fullName,
        email: patient.email,
        isApproved: patient.isApproved
      }
    });
  } catch (error) {
    console.error('Error blocking/unblocking patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating patient status',
      error: error.message
    });
  }
});

// @route   POST /api/admin/block-staff/:id
// @desc    Block or unblock a staff member
// @access  Admin only
router.post('/block-staff/:id', verifyAdmin, async (req, res) => {
  try {
    const staffId = req.params.id;
    const staff = await User.findById(staffId);
    
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    if (staff.role !== 'staff') {
      return res.status(400).json({
        success: false,
        message: 'User is not a staff member'
      });
    }

    // Toggle the approval status
    staff.isApproved = !staff.isApproved;
    await staff.save();

    res.status(200).json({
      success: true,
      message: `Staff member ${staff.isApproved ? 'unblocked' : 'blocked'} successfully`,
      staff: {
        id: staff._id,
        fullName: staff.fullName,
        email: staff.email,
        isApproved: staff.isApproved
      }
    });
  } catch (error) {
    console.error('Error blocking/unblocking staff:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating staff status',
      error: error.message
    });
  }
});

// @route   POST /api/admin/block-provider/:id
// @desc    Block or unblock a provider/doctor
// @access  Admin only
router.post('/block-provider/:id', verifyAdmin, async (req, res) => {
  try {
    const providerId = req.params.id;
    const provider = await User.findById(providerId);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    if (provider.role !== 'provider' && provider.role !== 'doctor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a provider or doctor'
      });
    }

    // Toggle the approval status
    provider.isApproved = !provider.isApproved;
    await provider.save();

    res.status(200).json({
      success: true,
      message: `Provider ${provider.isApproved ? 'unblocked' : 'blocked'} successfully`,
      provider: {
        id: provider._id,
        fullName: provider.fullName,
        email: provider.email,
        isApproved: provider.isApproved
      }
    });
  } catch (error) {
    console.error('Error blocking/unblocking provider:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating provider status',
      error: error.message
    });
  }
});

module.exports = router;
