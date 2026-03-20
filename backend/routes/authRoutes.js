const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Validate required fields
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Determine approval status based on role
    const userRole = role || 'patient';
    const needsApproval = userRole === 'provider' || userRole === 'staff';
    
    // Create new user
    const user = await User.create({
      fullName,
      email,
      password,
      role: userRole,
      isApproved: !needsApproval,
      approvalStatus: needsApproval ? 'pending' : 'approved'
    });

    // If provider or staff, return success but no token (they need approval first)
    if (needsApproval) {
      return res.status(201).json({
        success: true,
        message: `Registration successful! Your account is pending admin approval. You will be notified once approved. Your role: ${userRole === 'provider' ? 'Doctor' : 'Hospital Staff'}`,
        requiresApproval: true,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus
        }
      });
    }

    // Generate token for non-provider users
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is approved (for providers and staff)
    if ((user.role === 'provider' || user.role === 'staff') && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: user.approvalStatus === 'pending' 
          ? 'Your account is pending admin approval. Please wait for approval before logging in.'
          : 'Your account has been rejected. Please contact support for more information.',
        approvalStatus: user.approvalStatus
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        specialization: user.specialization,
        role: user.role,
        hasFilledProfile: user.hasFilledProfile
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private (requires token)
router.get('/me', async (req, res) => {
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

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        hasFilledProfile: user.hasFilledProfile,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        specialization: user.specialization,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile (phone, age, gender, specialization)
// @access  Private (requires token) - Users can only edit if hasFilledProfile is false, admins can always edit
router.put('/update-profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get the target user ID from request (admin can edit others, regular users edit themselves)
    const targetUserId = req.body.userId || decoded.id;
    const user = await User.findById(targetUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Target user not found'
      });
    }

    // Check permissions: user can only edit themselves if profile not filled, admins can always edit
    if (currentUser.role !== 'admin' && currentUser._id.toString() !== targetUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own profile'
      });
    }

    if (currentUser.role !== 'admin' && user.hasFilledProfile && currentUser._id.toString() === targetUserId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You have already submitted your profile. Only administrators can modify it now.'
      });
    }

    // Extract only allowed fields to update
    const { phone, dateOfBirth, gender, specialization } = req.body;

    // Validate dateOfBirth if provided
    if (dateOfBirth !== undefined && dateOfBirth !== null) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      
      if (isNaN(dob.getTime()) || dob > today) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid date of birth (must be in the past)'
        });
      }
      
      if (age < 0 || age > 150) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid date of birth (calculated age must be between 0 and 150)'
        });
      }
    }

    // Validate gender if provided
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({
        success: false,
        message: 'Gender must be one of: male, female, other'
      });
    }

    // Update only the allowed fields
    if (phone !== undefined) user.phone = phone;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;
    if (gender !== undefined) user.gender = gender;
    if (specialization !== undefined) user.specialization = specialization;

    // Mark profile as filled on first submission (only if not already filled)
    if (!user.hasFilledProfile && (phone || dateOfBirth || gender || specialization)) {
      user.hasFilledProfile = true;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        specialization: user.specialization,
        role: user.role,
        hasFilledProfile: user.hasFilledProfile
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

module.exports = router;
