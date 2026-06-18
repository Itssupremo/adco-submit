const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const sucRoutes = require('./routes/sucRoutes');
const userRoutes = require('./routes/userRoutes');
const agendaRoutes              = require('./routes/agendaRoutes');
const documentRoutes            = require('./routes/documentRoutes');
const dateBoardMeetingRoutes    = require('./routes/dateBoardMeetingRoutes');
const cors = require('cors');
const { seedData } = require('./seed');

const app = express();

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://e-agenda.vercel.app",
      ];
      // Allow requests with no origin (curl, proxied server requests)
      if (!origin) return callback(null, true);
      // Allow any localhost port in development
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      // Allow any .vercel.app subdomain
      if (origin.endsWith('.vercel.app') || allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      }
      const msg =
        "The CORS policy for this site does not allow access from the specified Origin.";
      return callback(new Error(msg), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);
// Preserve pre-parsed body in serverless/hosted environments (like Vercel / DigitalOcean Functions)
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    req._body = true;
  }
  next();
});
app.use(express.json());


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/sucs', sucRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agendas',             agendaRoutes);
app.use('/api/documents',          documentRoutes);
app.use('/api/dateboardmeetings',   dateBoardMeetingRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'e-Agenda System API is running' });
});

// Connect to MongoDB
let isConnected = false;
const connectDB = async () => {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
  console.log('MongoDB connected');

  // Check if database needs auto-seeding
  try {
    const User = require('./models/User');
    const userCount = await User.countDocuments({});
    if (userCount === 0) {
      console.log('No users found in database. Running auto-seeding...');
      await seedData();
      console.log('Auto-seeding completed successfully.');
    }
  } catch (err) {
    console.error('Error during auto-seeding check:', err.message);
  }
};

const startServer = async () => {
  const PORT = process.env.PORT || 5000;
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }).catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
};

// Start server only when this file is executed directly (DigitalOcean/local).
// When required by serverless runtimes (e.g., Vercel), it only exports the app.
if (require.main === module) {
  startServer();
}

// Export for Vercel serverless
module.exports = app;
module.exports.connectDB = connectDB;
