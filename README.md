# e-Agenda System

--Contact Ian Christopher N. Mangubat
--www.facebook.com/supremo.ian.7

## Quick Start

### Environment
Create [backend/.env.example](c:/Users/Localuser/IanGwapo/abbi-submit/backend/.env.example) as `backend/.env` and fill in your values.

For DigitalOcean Spaces file storage, this project now accepts either `SPACES_*` or `S3_*` variables.

For MongoDB, this project accepts `MONGODB_URI`, `DATABASE_URL`, or `MONGO_URI`.

### Prerequisites
- Node.js (v18+)
- A MongoDB database connection string

### 1. Seed the Database
```bash
cd backend
npm run seed
```

### 2. Start the Backend
```bash
cd backend
npm run dev
```
Backend runs on **http://localhost:5000**

### 3. Start the Frontend
```bash
cd frontend
npm run dev
```
Frontend runs on **http://localhost:3000**

## Demo Credentials
| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | admin    | admin123  |
| User  | user1    | user123   |

## Features
- **Public Page**: View SUC directory (Region, Name, Address, President) with search/filter
- **Admin Dashboard**: Full CRUD, transfer SUCs between CHED Officials
- **User Dashboard**: Add/Edit SUCs in Chairperson & Commissioner sections only
- JWT authentication with role-based access control
- Custom region sorting order
- Bootstrap UI

## Project Structure
```
backend/
  models/         - Mongoose schemas (User, Suc)
  controllers/    - Route handlers
  middleware/     - JWT auth, role-based access
  routes/         - Express routes
  server.js       - Entry point
  seed.js         - Sample data seeder

frontend/
  src/
    components/   - SucTable, AddSucModal, EditSucModal, TransferModal, Navbar
    pages/        - Login, AdminDashboard, UserDashboard, PublicDirectory
    services/     - Axios API client
    App.jsx       - Router & auth state
```
