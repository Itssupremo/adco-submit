const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const activityLogRoutes         = require('./routes/activityLogRoutes');
const councilRoutes = require('./routes/councilRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const cors = require('cors');
const { seedData } = require('./seed');
const { isLocalAuthEnabled } = require('./utils/localAuth');

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO_URI;

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
      // Allow any .vercel.app or .ondigitalocean.app subdomain
      if (
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.ondigitalocean.app') ||
        allowedOrigins.indexOf(origin) !== -1
      ) {
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
// Mount both with and without /api prefix to support platforms that trim path prefixes.
const mountRoutes = (prefix = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/councils`, councilRoutes);
  app.use(`${prefix}/submissions`, submissionRoutes);
  app.use(`${prefix}/notifications`, notificationRoutes);
  app.use(`${prefix}/settings`, settingsRoutes);
  app.use(`${prefix}/reports`, reportRoutes);
  app.use(`${prefix}/logs`, activityLogRoutes);
};

mountRoutes('/api');
mountRoutes('');

// Health endpoints for platforms/readiness checks
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'backend' });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'backend' });
});

// Connect to MongoDB
let isConnected = false;
const connectDB = async () => {
  if (isLocalAuthEnabled()) {
    console.log('LOCAL_AUTH_ONLY enabled: skipping MongoDB connection');
    return;
  }
  if (isConnected) return;
  if (!mongoUri) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI, DATABASE_URL, or MONGO_URI.');
  }
  await mongoose.connect(mongoUri);
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
    console.error('Error during database initialization/migration:', err.message);
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
