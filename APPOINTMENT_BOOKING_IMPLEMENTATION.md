# Appointment Booking Feature Implementation

## Overview

This document outlines the appointment booking system that has been implemented for the SehatQueue application. Patients can now book appointments with specific doctors and departments, see their queue position, and track their wait times.

## Features Implemented

### 1. **Backend - Appointment Model & API**

#### New Database Model: `Appointment.js`

- **patientId**: Reference to User model
- **patientName**: Patient's full name
- **patientPhone**: Patient's contact number
- **department**: Healthcare department (Cardiology, Neurology, etc.)
- **doctor**: Assigned doctor name
- **appointmentDate**: Scheduled date and time
- **status**: Tracks appointment lifecycle (scheduled, waiting, in-progress, completed, cancelled)
- **queuePosition**: Patient's position in the queue for that day/doctor
- **estimatedWaitTime**: Calculated wait time in minutes
- **createdAt/updatedAt**: Timestamps

#### New API Route: `/api/appointments`

**Endpoints Created:**

1. **GET** `/patient/:patientId`
   - Fetch all appointments for a patient
   - Returns: Array of appointments sorted by date (newest first)

2. **GET** `/queue-position/:appointmentId`
   - Get current queue position and wait time for specific appointment
   - Calculates: How many patients are ahead + total in queue
   - Estimated wait = (queue position) × 15 minutes per patient

3. **GET** `/upcoming/:patientId`
   - Fetch upcoming scheduled appointments only
   - Returns: Appointments with future dates that are not completed/cancelled

4. **POST** `/book`
   - Create new appointment
   - Request body:
     ```json
     {
       "patientId": "user_id",
       "patientName": "John Doe",
       "patientPhone": "9876543210",
       "department": "Cardiology",
       "doctor": "Dr. Rajesh Kumar",
       "appointmentDate": "2026-03-15"
     }
     ```
   - Automatically calculates queue position and wait time
   - Returns: Created appointment object

5. **PUT** `/:appointmentId/status`
   - Update appointment status
   - Used when appointment transitions through lifecycle stages

6. **DELETE** `/:appointmentId`
   - Cancel appointment (sets status to 'cancelled')
   - Returns: Updated appointment with cancelled status

---

### 2. **Frontend - Patient Dashboard (Components)**

#### A. **BookingFormModal.jsx**

A modal dialog for booking appointments with:

- **Department dropdown**: 6 departments available
  - Cardiology
  - Neurology
  - Dermatology
  - Orthopedics
  - Pediatrics
  - Psychiatry

- **Doctor dropdown**: Filtered by selected department
  - 3 doctors per department
  - Dynamically populated based on department selection

- **Queue Information Display**:
  - Shows patients currently ahead in queue
  - Displays estimated wait time
  - Live calculation when doctor is selected

- **Date Picker**:
  - Minimum date set to today
  - Prevents booking in the past

- **API Integration**:
  - Sends booking request to `/api/appointments/book`
  - Includes auth token in header
  - Displays error messages for failed bookings

#### B. **AppointmentsListView.jsx**

Displays patient's appointments in a table format:

- **Columns**:
  - Date
  - Department
  - Doctor Name
  - Queue Position (e.g., "2/15")
  - Estimated Wait Time
  - Status badge (Scheduled, Waiting, In Progress, Completed, Cancelled)
  - Cancel button (only for scheduled appointments)

- **Status Colors**:
  - Scheduled: Green
  - Waiting: Blue
  - In Progress: Yellow
  - Completed: Gray
  - Cancelled: Red

#### C. **Updated PatientDashboard Index**

Enhanced main component with:

- **State management**:
  - `showBookingModal`: Controls modal visibility
  - `appointments`: Stores user's appointments
  - `loadingAppointments`: Loading indicator

- **Functions added**:
  - `fetchAppointments()`: Loads appointments on component mount
  - `handleBookAppointment()`: Adds new appointment to list
  - `handleCancelAppointment()`: Removes cancelled appointment

- **Book Appointment Section**:
  - New button in appointments view: "+ Book Appointment"
  - Opens BookingFormModal on click
  - Updates appointment list after successful booking

---

### 3. **Frontend - Check Wait Time Page (Predict.js)**

#### Enhanced Features:

1. **Upcoming Appointments Section** (NEW)
   - Displays all upcoming appointments at the top
   - Shows for each appointment:
     - Date
     - Department
     - Doctor Name
     - Estimated Wait Time (highlighted in orange)
     - Queue Position

   - Automatically fetches when user visits the page
   - Shows helpful message if no appointments booked yet

2. **General Queue Prediction** (EXISTING - PRESERVED)
   - Original AI prediction form moved below appointments
   - Allows general queue analysis without appointment

---

## How It Works - User Flow

### Booking an Appointment

1. **Patient navigates** to "My Appointments" section in sidebar
2. **Clicks** "+ Book Appointment" button
3. **Booking Modal Opens** with form
4. **Patient fills form**:
   - Selects Department → Doctor dropdown updates automatically
   - Selects Doctor → Queue info appears showing patients ahead
   - Selects Date from date picker
5. **Patient clicks** "Book Appointment"
6. **API Call** sends data to backend
7. **Backend processes**:
   - Counts existing appointments for that doctor/dept/day
   - Calculates queue position
   - Calculates estimated wait time (position × 15 min)
   - Saves appointment to database
8. **Modal closes**, appointment appears in list
9. **Patient sees** queue position and wait time

### Checking Wait Time

1. **Patient navigates** to "Check Wait Time" page (Predict)
2. **Upcoming appointments display** at top showing:
   - Appointment details (date, dept, doctor)
   - Current queue position
   - Estimated wait time
3. **Patient can also** use general prediction tool below

### Cancelling an Appointment

1. **Patient views** appointment in appointments table
2. **Clicks** "Cancel" button (only for scheduled appointments)
3. **Confirmation dialog** appears
4. **If confirmed**:
   - API DELETE request sent
   - Appointment status changed to 'cancelled'
   - Removed from patient's active appointments list

---

## Sample Departments & Doctors

```javascript
Cardiology: ["Dr. Rajesh Kumar", "Dr. Priya Singh", "Dr. Amit Patel"];

Neurology: ["Dr. Vikram Rao", "Dr. Neha Sharma", "Dr. Anil Verma"];

Dermatology: ["Dr. Kavya Desai", "Dr. Sanjay Nair", "Dr. Isha Gupta"];

Orthopedics: ["Dr. Rohan Mehta", "Dr. Deepika Chopra", "Dr. Vikas Singh"];

Pediatrics: ["Dr. Anjali Reddy", "Dr. Harsh Patel", "Dr. Meera Bhat"];

Psychiatry: ["Dr. Arjun Kumar", "Dr. Sonal Dixit", "Dr. Rahul Sharma"];
```

---

## Database Schema

### Appointments Collection

```javascript
{
  _id: ObjectId,
  patientId: ObjectId (Reference to User),
  patientName: String,
  patientPhone: String,
  department: String,
  doctor: String,
  appointmentDate: Date,
  status: String (enum),
  queuePosition: Number,
  estimatedWaitTime: Number,
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

---

## API Integration Points

### Base URL: `http://localhost:5000`

### Headers Required:

```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}'
}
```

### Example Requests:

**Book Appointment:**

```
POST /api/appointments/book
Body: {
  patientId: "65f4a2b1c8d9e00f1g2h3i4j",
  patientName: "Arjun Kumar",
  patientPhone: "9876543210",
  department: "Cardiology",
  doctor: "Dr. Rajesh Kumar",
  appointmentDate: "2026-03-10"
}
Response: { success: true, appointment: {...} }
```

**Get Upcoming Appointments:**

```
GET /api/appointments/upcoming/{patientId}
Response: [
  {
    _id: "...",
    department: "Cardiology",
    doctor: "Dr. Rajesh Kumar",
    appointmentDate: "2026-03-10T14:00:00Z",
    queuePosition: 2,
    estimatedWaitTime: 30,
    status: "scheduled"
  }
]
```

**Cancel Appointment:**

```
DELETE /api/appointments/{appointmentId}
Response: { success: true, appointment: {...} }
```

---

## File Structure

### Backend

```
backend/
├── models/
│   ├── Appointment.js (NEW)
│   ├── Queue.js
│   └── User.js
├── routes/
│   ├── appointmentRoutes.js (NEW)
│   ├── authRoutes.js
│   └── queueRoutes.js
└── server.js (UPDATED)
```

### Frontend

```
frontend/src/pages/PatientDashboard/
├── components/
│   ├── BookingFormModal.jsx (NEW)
│   ├── AppointmentsListView.jsx (NEW)
│   ├── AppointmentsView.jsx
│   └── [other components]
├── hooks/
│   └── usePatientData.js
└── index.jsx (UPDATED)

frontend/src/pages/
└── Predict.js (UPDATED)
```

---

## Key Features

✅ **Appointment Booking**: Easy-to-use modal form
✅ **Queue Visibility**: Shows how many patients are ahead
✅ **Wait Time Estimation**: Calculates based on queue position
✅ **Appointment Management**: View, cancel, reschedule (cancel existing + book new)
✅ **Status Tracking**: Appointments tracked through lifecycle
✅ **Database Persistence**: All appointments saved in MongoDB
✅ **Real-time Display**: Immediate updates in UI
✅ **Error Handling**: User-friendly error messages
✅ **Department Filtering**: Doctors filtered by department
✅ **Date Validation**: Can't book in the past

---

## Testing the Feature

1. **Login** as a patient
2. **Go to** "My Appointments" section
3. **Click** "+ Book Appointment"
4. **Fill the form**:
   - Select: Cardiology
   - Select: Dr. Rajesh Kumar
   - Select: Today's date
5. **Click** "Book Appointment"
6. **Verify** appointment appears in the list with queue position
7. **Go to** "Check Wait Time" page
8. **Verify** appointment shows with wait time
9. **Click** "Cancel" to test cancellation

---

## Notes

- Estimated wait time is calculated as: Queue Position × 15 minutes
- Queue position is automatically calculated based on appointment creation time
- Patients can only cancel "scheduled" appointments
- Database is queried for real-time queue counts when booking
- API uses token-based authentication for security
