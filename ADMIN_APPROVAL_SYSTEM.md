# Admin Approval System for Doctors and Staff

## Overview

Doctors and Hospital Staff now require admin approval before they can access the system. This ensures quality control and verification of credentials.

## Features Implemented

### 1. **User Model Updates**

- Added `isApproved` field (boolean)
- Added `approvalStatus` field (approved, pending, rejected)
- Added `approvedBy` field (reference to admin who approved)
- Added `approvedAt` field (timestamp of approval)
- Added 'admin' role to the role enum

### 2. **Registration Flow**

- When a user registers as a **Doctor** or **Hospital Staff**:
  - Account is created with `approvalStatus: 'pending'` and `isApproved: false`
  - No login token is provided
  - User receives message: "Registration successful! Your account is pending admin approval. You will be notified once approved."
  - User is redirected to login page
- When a user registers as **Patient**:
  - Account is automatically approved
  - Login token is provided immediately
  - User can access the system right away

### 3. **Login Flow**

- **Approved Doctors/Staff**: Can log in successfully
- **Pending Doctors/Staff**: Login blocked with message: "Your account is pending admin approval. Please wait for approval before logging in."
- **Rejected Doctors/Staff**: Login blocked with message: "Your account has been rejected. Please contact support for more information."

### 4. **Admin Dashboard**

A new admin dashboard at `/admin-dashboard` provides:

- **Pending Approvals Tab**: Shows all doctors and staff awaiting approval
- **All Doctors Tab**: Shows all doctors with their approval status
- **Staff Members Tab**: Shows all staff members with their approval status

### 5. **API Endpoints**

#### Admin Routes (require admin authentication)

- `GET /api/admin/pending-providers` - Get all pending provider registrations
- `GET /api/admin/all-providers` - Get all providers with approval status
- `POST /api/admin/approve-provider/:id` - Approve a provider
- `POST /api/admin/reject-provider/:id` - Reject a provider

## Setup Instructions

### Step 1: Create an Admin User

Before you can approve providers, you need to create an admin user:

```bash
cd backend
node create-admin.js
```

This will create an admin user with:

- Email: admin@sehatqueue.com
- Password: admin123456

**⚠️ IMPORTANT**: Change these credentials in `create-admin.js` before running, or change the password after first login!

### Step 2: Restart the Backend Server

```bash
cd backend
npm start
```

### Step 3: Restart the Frontend

```bash
cd frontend
npm start
```

### Step 4: Login as Admin

1. Go to the login page
2. Login with admin credentials
3. You'll be redirected to `/admin-dashboard`

### Step 5: Test Provider Registration

1. Logout from admin account
2. Register a new user as "Healthcare Provider"
3. You'll see the pending approval message
4. Login back as admin
5. Go to "Pending Approvals" tab
6. Approve or reject the provider
7. Provider can now login (if approved)

## Usage Guide

### For Healthcare Providers

1. Register on the platform selecting "Healthcare Provider" role
2. Wait for admin approval (you'll receive a message)
3. Once approved, you can login and access the provider dashboard

### For Admins

1. Login to the admin dashboard
2. Check the "Pending Approvals" tab regularly
3. Review provider information
4. Click "Approve" to grant access or "Reject" to deny access
5. Use "All Providers" tab to see the complete list of providers

## Database Schema Changes

The User schema now includes:

```javascript
{
  // ... existing fields
  role: {
    type: String,
    enum: ['patient', 'doctor', 'provider', 'staff', 'admin'],
    default: 'patient'
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  approvalStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'approved'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}
```

## Files Modified/Created

### Backend

- ✅ `models/User.js` - Updated with approval fields
- ✅ `routes/authRoutes.js` - Updated registration and login logic
- ✅ `routes/adminRoutes.js` - New admin routes
- ✅ `server.js` - Added admin routes
- ✅ `create-admin.js` - Script to create admin user

### Frontend

- ✅ `pages/AdminDashboard.jsx` - New admin dashboard component
- ✅ `pages/Register/RegisterForm.jsx` - Updated to handle approval flow
- ✅ `pages/Login/LoginForm.jsx` - Updated to handle admin routing
- ✅ `App.js` - Added admin dashboard route

## Security Notes

- Admin routes are protected with JWT authentication
- Only users with role='admin' can access admin endpoints
- Provider approval status is checked on every login attempt
- Rejected providers cannot access the system

## Future Enhancements

- Email notifications when provider is approved/rejected
- Ability for providers to upload verification documents
- Admin notes/comments on provider approvals
- Bulk approval/rejection actions
- Provider status change history/audit log
