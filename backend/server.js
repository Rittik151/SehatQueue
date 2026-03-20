require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/queue', require('./routes/queueRoutes'));
app.use('/api/predict', require('./routes/predictRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));