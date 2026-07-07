const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Council = require('./models/Council');
const Submission = require('./models/Submission');
const Notification = require('./models/Notification');
const SystemSetting = require('./models/SystemSetting');
const ActivityLog = require('./models/ActivityLog');

const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || process.env.MONGO_URI;

const COUNCILS = [
  {
    councilName: 'Administrative Council for Academic Affairs',
    abbreviation: 'ACAD',
    contactEmail: 'acad@usm.edu.ph',
    contactNumber: '09000000001',
    status: 'Active',
  },
  {
    councilName: 'Administrative Council for Finance',
    abbreviation: 'FIN',
    contactEmail: 'finance@usm.edu.ph',
    contactNumber: '09000000002',
    status: 'Active',
  },
  {
    councilName: 'Administrative Council for Student Services',
    abbreviation: 'STUD',
    contactEmail: 'studentservices@usm.edu.ph',
    contactNumber: '09000000003',
    status: 'Active',
  },
];

async function seedData() {
  await Promise.all([
    User.deleteMany({}),
    Council.deleteMany({}),
    Submission.deleteMany({}),
    Notification.deleteMany({}),
    SystemSetting.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  const councils = await Council.insertMany(COUNCILS);
  const councilMap = Object.fromEntries(councils.map((item) => [item.abbreviation, item]));

  const users = await User.create([
    {
      username: 'superadmin',
      password: 'superadmin123',
      email: 'superadmin@usm.edu.ph',
      fullname: 'USM Super Admin',
      role: 'superadmin',
      isActive: true,
    },
    {
      username: 'admin',
      password: 'board1234',
      email: 'board@usm.edu.ph',
      fullname: 'USM Board',
      role: 'board',
      isActive: true,
    },
    {
      username: 'acaduser',
      password: 'acad1234',
      email: 'acad.council@usm.edu.ph',
      fullname: 'ACAD Council Account',
      role: 'council',
      councilId: councilMap.ACAD._id,
      isActive: true,
    },
    {
      username: 'finuser',
      password: 'fin12345',
      email: 'fin.council@usm.edu.ph',
      fullname: 'FIN Council Account',
      role: 'council',
      councilId: councilMap.FIN._id,
      isActive: true,
    },
  ]);

  await SystemSetting.insertMany([
    {
      key: 'systemName',
      value: 'USM - Board Secretary Administrative Council Submission System',
      description: 'Displayed system name',
    },
    {
      key: 'maxUploadSizeMb',
      value: 20,
      description: 'Maximum allowed PDF size in megabytes',
    },
    {
      key: 'allowedMimeTypes',
      value: ['application/pdf'],
      description: 'Permitted upload MIME types',
    },
  ]);

  console.log('Seed complete');
  console.log('Super Admin: superadmin / superadmin123');
  console.log('USM Board: admin / board1234');
  console.log('Council: acaduser / acad1234');
  console.log(`Created ${councils.length} councils and ${users.length} users`);
}

async function seed() {
  try {
    if (!mongoUri) {
      throw new Error('Missing MongoDB connection string. Set MONGODB_URI, DATABASE_URL, or MONGO_URI.');
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for seeding');
    await seedData();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seedData };