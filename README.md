# USM BoardHUB

--Contact Ian Christopher N. Mangubat
--www.facebook.com/supremo.ian.7

## Quick Start

### Environment
Create [backend/.env.example](c:/Users/Localuser/IanGwapo/abbi-submit/backend/.env.example) as `backend/.env` and fill in your values.

Create `frontend/.env` from `frontend/.env.example` when the frontend is deployed separately from the backend.

For DigitalOcean Spaces file storage, this project now accepts either `SPACES_*` or `S3_*` variables.

For MongoDB, this project accepts `MONGODB_URI`, `DATABASE_URL`, or `MONGO_URI`.

For a Vercel frontend that talks to a DigitalOcean backend, set `VITE_API_BASE_URL` to your DigitalOcean backend URL, usually `https://your-backend-domain/api`.

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

## Deployment

### Vercel frontend
- Public site: `https://adco-submit.vercel.app`
- Set `VITE_API_BASE_URL` in Vercel to your DigitalOcean backend URL, for example `https://your-backend-domain/api`

### DigitalOcean backend
- Set `ALLOWED_ORIGINS=https://adco-submit.vercel.app,http://localhost:5173,http://localhost:3000`
- Keep `MONGODB_URI` pointed at your DigitalOcean MongoDB cluster
- Fill `SPACES_KEY` and `SPACES_SECRET` so uploads are stored in DigitalOcean Spaces

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
