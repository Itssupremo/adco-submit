const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const User = require('./models/User');
const Suc = require('./models/Suc');

// ── Fixed accounts ────────────────────────────────────────────────────────────
const FIXED_USERS = [
  // Super Admin
  {
    username: 'icmangubat',
    password: 'IanGwapo',
    email: 'icmangubat@ched.gov.ph',
    fullname: 'System Admin',
    role: 'superadmin',
    occCode: '',
    sucAbbreviation: '',
  },
  // Admins (Commissioners)
  {
    username: 'ocsca',
    password: 'ocsca123',
    email: 'oc@ched.gov.ph',
    fullname: 'Chairperson Shirley C. Agrupis',
    role: 'admin',
    occCode: 'OCSCA',
    sucAbbreviation: '',
  },
  {
    username: 'ocdra',
    password: 'ocdra123',
    email: 'commissionerapag@ched.gov.ph',
    fullname: 'Commissioner Desiderio R. Apag III',
    role: 'admin',
    occCode: 'OCDRA',
    sucAbbreviation: '',
  },
  {
    username: 'ocmao',
    password: 'ocmao123',
    email: 'commissionerong@ched.gov.ph',
    fullname: 'Commissioner Michelle Aguilar-Ong',
    role: 'admin',
    occCode: 'OCMAO',
    sucAbbreviation: '',
  },
  {
    username: 'ocmqm',
    password: 'ocmqm123',
    email: 'commissionermallari@ched.gov.ph',
    fullname: 'Commissioner Myrna Q. Mallari',
    role: 'admin',
    occCode: 'OCMQM',
    sucAbbreviation: '',
  },
  {
    username: 'ocrpa',
    password: 'ocrpa123',
    email: 'commissioneraquino@ched.gov.ph',
    fullname: 'Commissioner Ricmar P. Aquino',
    role: 'admin',
    occCode: 'OCRPA',
    sucAbbreviation: '',
  },
];

// ── Region + OCC helpers ──────────────────────────────────────────────────────
const REGION_MAP = {
  'III': '3', 'Region 3': '3',
  'IV': '4', '4A': '4',
  'V': '5', 'Region 5': '5', 'Region 5 ': '5',
  'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9',
  'X': '10', 'XI': '11', 'XII': '12', '13': 'CARAGA',
};

const OCC_OFFICIALS = {
  'OCSCA': { name: 'Chairperson Shirley C. Agrupis',      section: 'Chairperson' },
  'OCDRA': { name: 'Commissioner Desiderio R. Apag III',  section: 'Commissioner' },
  'OCRPA': { name: 'Commissioner Ricmar P. Aquino',       section: 'Commissioner' },
  'OCMQM': { name: 'Commissioner Myrna Q. Mallari',       section: 'Commissioner' },
  'OCMAO': { name: 'Commissioner Michelle Aguilar-Ong',   section: 'Commissioner' },
};

const normalizeRegion = (raw) => {
  const val = String(raw || '').trim();
  return REGION_MAP[val] || val;
};
const mapOcc = (occ) => OCC_OFFICIALS[occ] || { name: occ, section: 'Other' };

// ── Load SUCs from XLSX ───────────────────────────────────────────────────────
function loadSucsFromXlsx() {
  const filePath = path.join(__dirname, 'data', 'SUC DATABASE.xlsx');
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  return rows.map((r) => ({
    sucName:              (r['State College / University Name'] || '').trim(),
    abbreviation:         (r['Abbreviation'] || '').trim(),
    region:               normalizeRegion(r['SUCs Region']),
    address:              '',
    president:            (r['Name of President'] || '').trim(),
    email:                (r['Email'] || '').trim(),
    contact:              String(r['Number'] || '').trim(),
    boardSecretaryName:   (r['Board Secretary Name'] || '').trim(),
    boardSecretaryEmail:  (r['Email_1'] || '').trim(),
    boardSecretaryContact: String(r['Number_1'] || '').trim(),
    occCode:              (r['OCC'] || '').trim(),
    chedOfficial:         mapOcc((r['OCC'] || '').trim()).name,
    section:              mapOcc((r['OCC'] || '').trim()).section,
  })).filter((s) => s.sucName);
}

// ── Generate SUC user accounts from XLSX rows ────────────────────────────────
function buildSucUsers(rows) {
  const seen = {};
  return rows.map((s) => {
    if (!s.abbreviation) return null;

    // Handle duplicate abbreviations
    let username = s.abbreviation;
    if (seen[username]) {
      seen[username]++;
      username = `${s.abbreviation}_${seen[username]}`;
    } else {
      seen[username] = 1;
    }

    return {
      username,
      password:        s.abbreviation,   // password = original abbreviation
      email:           '',
      fullname:        s.sucName,
      role:            'user',
      occCode:         s.occCode,
      sucAbbreviation: s.abbreviation,
    };
  }).filter(Boolean);
}

// ── Seed Data Logic ───────────────────────────────────────────────────────────
async function seedData() {
  await User.deleteMany({});
  await Suc.deleteMany({});

  // Insert fixed accounts
  await User.create(FIXED_USERS);
  console.log('=== Fixed Accounts ===');
  FIXED_USERS.forEach((u) => {
    const tag = u.role === 'superadmin' ? '[SUPERADMIN]' : '[ADMIN]';
    console.log(`${tag}  ${u.fullname.padEnd(42)} username: ${u.username.padEnd(15)} email: ${u.email}`);
  });

  // Insert SUCs + SUC user accounts
  const sucs = loadSucsFromXlsx();
  await Suc.insertMany(sucs);

  const sucUsers = buildSucUsers(sucs);
  await User.create(sucUsers);

  console.log(`\n=== SUC User Accounts (${sucUsers.length}) ===`);
  console.log('Role: user  |  password = abbreviation (original)');
  sucUsers.forEach((u) => {
    console.log(`[USER]  ${u.fullname.slice(0, 48).padEnd(50)} username: ${u.username.padEnd(15)} pwd: ${u.password}`);
  });

  console.log(`\nSeeding complete: ${FIXED_USERS.length} fixed + ${sucUsers.length} SUC accounts | ${sucs.length} SUCs`);
}

// ── Seed Standalone Command ──────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected for seeding\n');
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

