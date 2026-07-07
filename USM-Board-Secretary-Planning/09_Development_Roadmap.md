# Development Roadmap

## Phase 0 - Approval Gate

- Approve the planning package
- Confirm final collection names and route names
- Confirm whether query-string token file access is acceptable or should be replaced

## Phase 1 - Foundation

- duplicate the reference repo structure into the new system baseline
- create domain models: `Council`, `Submission`, `SubmissionHistory`, `Notification`, `SystemSetting`
- adapt `User` role enum to `superadmin`, `board`, `council`
- preserve `activityLogger` and `s3Storage` utility style

## Phase 2 - Authentication and Authorization

- implement JWT login and `GET /auth/me`
- implement role guards
- implement ownership checks for council submissions
- implement password reset and password change flows

## Phase 3 - Submission Core

- create council CRUD
- implement one-active-submission rule
- implement upload, replace, approve, return, archive
- implement submission history versioning
- implement PDF streaming and download

## Phase 4 - Dashboards and UI

- build shared layout and sidebar
- implement super admin dashboard
- implement USM board dashboard
- implement council dashboard
- implement upload modal, remarks modal, status badges, notification panel

## Phase 5 - Reports and Notifications

- implement filtered report endpoints
- add PDF, Excel, and print exports
- generate in-app notifications on all required events

## Phase 6 - Hardening

- validate file size at 20 MB and PDF-only uploads
- add request validation utilities
- add login/upload rate limiting
- review audit coverage
- test role boundaries and resource isolation

## Recommended Build Order

1. Backend models and routes
2. Auth middleware and permissions
3. Submission workflow controllers
4. Frontend shell and login
5. Role dashboards
6. Reports, notifications, settings
7. QA and polish

## Delivery Strategy

- keep each domain in a separate branch-sized unit of work
- validate each backend slice with manual endpoint checks or targeted tests
- mirror reference naming and file patterns to reduce architectural drift