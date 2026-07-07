# Repository Analysis

## Executive Summary

The reference repository is a monorepo-style MERN application split into:

- `backend`: Express API, Mongoose models, JWT auth, Multer uploads, optional S3-backed file storage
- `frontend`: Vite + React + React Router + Bootstrap client
- `api`: serverless wrapper exposing the Express app for Vercel
- `scripts`: documentation generator
- `Iangwapo`: generated documentation bundle

The system is not layered into services or repositories. Its dominant backend pattern is route -> controller -> model, with utility helpers for activity logging and storage. The frontend uses a single authenticated shell, role-based routing, a shared sidebar, and page-level state managed with hooks.

## Runtime Architecture

### Backend

- Express app defined in `backend/server.js`
- MongoDB connection initialized once and reused
- Routes mounted twice: with `/api` and without `/api`
- Automatic database seeding runs when no users exist
- Simple migration logic runs during startup for missing `occCode` values on `board_member` users

### Frontend

- React app bootstrapped by Vite
- Auth state stored in `localStorage`
- Token attached to all requests via Axios interceptor
- Role-based page access decided in `frontend/src/App.jsx`

### Deployment

- Vercel serves the frontend build
- `api/index.js` imports the Express app for serverless execution
- Vercel rewrite sends `/api/*` traffic into the single serverless handler

## Folder Structure Assessment

### Present in Reference Repo

- `backend/controllers`
- `backend/models`
- `backend/middleware`
- `backend/routes`
- `backend/utils`
- `backend/data`
- `frontend/src/components`
- `frontend/src/pages`
- `frontend/src/services`
- `frontend/public`

### Not Present as First-Class Folders

- no dedicated `services` layer in backend
- no `repositories` layer
- no `config` folder; config is environment-driven and inline
- no database migrations or seeders directory convention beyond `seed.js`
- no `uploads` folder because files are stored in MongoDB buffers or S3-compatible storage

## Authentication Flow

### Mechanism

- JWT-based authentication only
- No session store
- No refresh token flow
- Token lifetime: 7 days
- Client persistence: `localStorage`

### Auth Endpoints

- `POST /auth/login`
- `POST /auth/login-by-email`
- `GET /auth/me`

### Middleware

- `authenticate`
- `superAdminOnly`
- `adminOrAbove`
- `managerOrAbove`
- `userSectionAccess`

### Role Model in Reference Repo

- `superadmin`
- `admin`
- `user`
- `board_member`

### Access Pattern

- route-level middleware provides coarse enforcement
- controllers add second-level data-scope checks
- data visibility depends on `occCode` and `sucAbbreviation`

## Database Structure

The database is MongoDB using Mongoose schemas. There are no SQL tables, migrations, or relational constraints.

### Collections

- `users`
- `sucs`
- `agendas`
- `documents`
- `dateboardmeetings`
- `activitylogs`

### Relationship Style

- direct ObjectId reference only where file-bearing records point to `Suc`
- string-based association for many ownership rules, especially `occCode` and `sucAbbreviation`

### Naming Conventions

- models are singular PascalCase
- controller exports are lower camel case verbs
- route bases are plural lowercase nouns
- response shape is usually raw document JSON or `{ message: string }`

### Migrations and Seeders

- no migration framework
- one startup migration embedded in `server.js`
- one seeder script: `backend/seed.js`
- seeding imports SUC data from `backend/data/SUC DATABASE.xlsx`

## API Design Assessment

### General Style

- REST-like endpoints
- JSON responses for metadata
- multipart form uploads for PDFs
- inline file streaming for PDFs
- minimal validation
- controller-level filtering rather than policy abstractions

### Endpoint Groups

- Auth
- Users
- SUCs
- Agendas
- Documents
- Board meeting reminders
- Activity logs

## Frontend UI Assessment

### Layout

- single authenticated application shell
- left sidebar navigation
- top bar with page title and theme toggle
- footer shared across authenticated pages

### Key Screens

- login
- admin dashboard
- user dashboard
- user management
- board meeting reminder management
- regular board meeting uploads
- special board meeting uploads
- minutes uploads
- analytics
- activity logs
- my account

### Reusable Components

- sidebar
- header/footer
- PDF viewer modal
- add/edit SUC modals
- meeting reminder modal
- transfer modal

### Interaction Pattern

- Bootstrap-driven tables and cards
- page-local state with `useState` and `useEffect`
- no global state library
- modal-heavy CRUD for management flows

## Coding Standards Observed

### Backend

- CommonJS modules
- controller-per-domain organization
- plain async controller functions exported from files
- Mongoose schemas co-located in `models`
- no TypeScript
- sparse comments, mostly functional

### Frontend

- JSX components by page or reusable component
- direct Axios service wrappers in one file
- inline constants for options and labels
- Bootstrap classes mixed with custom CSS variables and styles

### Error Handling

- try/catch in controllers
- generic `500 Server error` fallback
- specific `400`, `401`, `403`, `404` responses when handled
- no centralized error middleware

### Validation

- manual field presence checks
- Multer MIME type validation for PDFs
- Mongoose enum constraints
- no request schema validation library

### Logging

- activity/audit logging in MongoDB
- errors logged with `console.error`
- no structured logger

## Security Review

### Positive Controls

- bcrypt password hashing
- JWT verification middleware
- role-based route guards
- file MIME check for PDFs
- file size limits in Multer
- Mongoose avoids raw SQL injection classes by design

### Gaps

- no CSRF strategy documented
- no rate limiting
- no helmet-style hardening
- no centralized input sanitization
- JWT accepted in query string for file viewing
- seed credentials are predictable and committed
- file access relies on valid token plus document ID, with no separate download authorization abstraction

## File Upload Flow in Reference Repo

### How Upload Works

- Multer reads PDFs into memory
- controller either stores binary in MongoDB or uploads to S3-compatible storage
- document history is preserved before overwrite

### Where Files Are Stored

- primary mode if S3 configured: object storage under `uploads/...`
- fallback mode: MongoDB `Buffer`

### Filename Generation

- original filename preserved in metadata
- S3 object key generated as `uploads/<timestamp>-<random>-<sanitized-original-name>.<ext>`

### Download/View Flow

- client opens a PDF viewer modal
- server streams the stored PDF with `Content-Type: application/pdf`

### Delete Flow

- reset endpoints delete the record and remove S3 objects for current and historical files
- when a file is merely replaced, the old version is archived, not deleted

## Architectural Implications for the New USM System

The new system should preserve these traits to remain consistent:

- same monorepo split
- same Express + Mongoose + React + Vite stack
- same route -> controller -> model backend pattern
- same JWT auth pattern
- same Bootstrap plus custom CSS UI approach
- same PDF viewer and upload interaction style
- same audit logging utility pattern

The new system should simplify domain complexity:

- remove quarterly agenda model complexity
- replace multi-file agenda/document slots with one submission record per council
- keep approval workflow, role gates, dashboards, logs, and notifications aligned with the reference patterns