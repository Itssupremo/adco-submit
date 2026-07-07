const LOCAL_USERS = [
  {
    _id: 'local-superadmin',
    username: 'superadmin',
    password: 'superadmin123',
    email: 'superadmin@usm.edu.ph',
    fullname: 'USM Super Admin',
    role: 'superadmin',
    councilId: null,
    isActive: true,
  },
  {
    _id: 'local-board',
    username: 'admin',
    password: 'board1234',
    email: 'board@usm.edu.ph',
    fullname: 'USM Board',
    role: 'board',
    councilId: null,
    isActive: true,
  },
  {
    _id: 'local-acad',
    username: 'acaduser',
    password: 'acad1234',
    email: 'acad.council@usm.edu.ph',
    fullname: 'ACAD Council Account',
    role: 'council',
    councilId: 'local-council-acad',
    councilName: 'Administrative Council for Academic Affairs',
    isActive: true,
  },
  {
    _id: 'local-fin',
    username: 'finuser',
    password: 'fin12345',
    email: 'fin.council@usm.edu.ph',
    fullname: 'FIN Council Account',
    role: 'council',
    councilId: 'local-council-fin',
    councilName: 'Administrative Council for Finance',
    isActive: true,
  },
];

const isLocalAuthEnabled = () => process.env.LOCAL_AUTH_ONLY === 'true';

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
};

const findLocalUserByUsername = (username) => {
  const normalized = String(username || '').trim().toLowerCase();
  return LOCAL_USERS.find((user) => user.username.toLowerCase() === normalized) || null;
};

const findLocalUserByEmail = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  return LOCAL_USERS.find((user) => String(user.email || '').toLowerCase() === normalized) || null;
};

const findLocalUserById = (id) => LOCAL_USERS.find((user) => user._id === id) || null;

module.exports = {
  isLocalAuthEnabled,
  sanitizeUser,
  findLocalUserByUsername,
  findLocalUserByEmail,
  findLocalUserById,
  LOCAL_USERS,
};