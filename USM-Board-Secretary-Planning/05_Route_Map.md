# Route Map

## Reference API Surface

### Auth

| Method | URL | Auth | Request | Response | Validation |
| --- | --- | --- | --- | --- | --- |
| POST | /api/auth/login | Public | `{ username or email, password }` | `{ token, user }` | credentials required |
| POST | /api/auth/login-by-email | Public | `{ email }` | `{ token, user }` | email required |
| GET | /api/auth/me | Bearer token | none | `{ user }` | valid JWT required |

### Users

| Method | URL | Auth | Request | Response | Validation |
| --- | --- | --- | --- | --- | --- |
| GET | /api/users | managerOrAbove | none | `User[]` | scoped by role |
| POST | /api/users | managerOrAbove | user payload | created user | fullname, username, password required |
| PUT | /api/users/me | authenticated | `{ email, username, password }` | updated user | username uniqueness when changed |
| PUT | /api/users/:id | managerOrAbove | editable user payload | updated user | scope checks, self-role-change blocked |
| DELETE | /api/users/:id | managerOrAbove | none | `{ message }` | cannot delete self; scoped by role |

### SUCs

| Method | URL | Auth | Request | Response | Validation |
| --- | --- | --- | --- | --- | --- |
| GET | /api/sucs/public | Public | optional `region` query | public SUC list | none |
| GET | /api/sucs/occ-officials | Public | none | OCC official list | none |
| GET | /api/sucs | authenticated | none | `Suc[]` | scoped by role |
| POST | /api/sucs | authenticated + userSectionAccess | SUC payload | created SUC | `sucName`, `region`, `section` required |
| PUT | /api/sucs/:id | authenticated + userSectionAccess | SUC payload | updated SUC | section checks for `user` role |
| DELETE | /api/sucs/:id | adminOrAbove | none | `{ message }` | SUC must exist |
| PUT | /api/sucs/:id/transfer | adminOrAbove | `{ occCode }` | updated SUC | valid OCC code required |

### Agendas

| Method | URL | Auth | Request | Response | Validation |
| --- | --- | --- | --- | --- | --- |
| GET | /api/agendas | authenticated | `sucId`, `year` query | agenda records | both query values required |
| GET | /api/agendas/status | authenticated | none | aggregated upload status list | scoped by role |
| GET | /api/agendas/file/:agendaId/:type | bearer or `?token=` | optional `v` query | PDF stream | valid token and existing file |
| POST | /api/agendas/:sucId/:quarter | managerOrAbove | multipart with `year`, `sucName`, `oldAgenda?`, `newAgenda?` | updated agenda record | PDF only, 16 MB per file |
| DELETE | /api/agendas/:sucId/:quarter | managerOrAbove | `year` query | `{ message }` | year required |

### Documents

| Method | URL | Auth | Request | Response | Validation |
| --- | --- | --- | --- | --- | --- |
| GET | /api/documents | authenticated | `sucId`, `year`, `pageType` query | document records | all required |
| GET | /api/documents/file/:docId | bearer or `?token=` | optional `v` query | PDF stream | valid token and existing file |
| POST | /api/documents/:sucId/:pageType/:slot | managerOrAbove | multipart with `year`, `sucName`, `file` | updated document record | PDF only, 16 MB |
| DELETE | /api/documents/:sucId/:pageType/:slot | managerOrAbove | `year` query | `{ message }` | year required |

### Board Meeting Reminders

| Method | URL | Auth | Request | Response | Validation |
| --- | --- | --- | --- | --- | --- |
| GET | /api/dateboardmeetings | authenticated | none | reminder list | scoped by role |
| POST | /api/dateboardmeetings | adminOrAbove | reminder payload | created reminder | `sucAbbreviation` and `meetingDate` required |
| PUT | /api/dateboardmeetings/:id | authenticated | reminder payload | updated reminder | users only edit own SUC and limited fields |
| DELETE | /api/dateboardmeetings/:id | adminOrAbove | none | `{ message }` | reminder must exist |

### Activity Logs

| Method | URL | Auth | Request | Response | Validation |
| --- | --- | --- | --- | --- | --- |
| GET | /api/logs | adminOrAbove | none | log list | admin sees own OCC only |

## Planned USM Route Map

### Auth

| Method | URL | Auth | Purpose |
| --- | --- | --- | --- |
| POST | /api/auth/login | Public | login for all roles |
| GET | /api/auth/me | Bearer token | restore current user |
| PUT | /api/users/me | Bearer token | profile update |
| PUT | /api/users/me/password | Bearer token | password change |

### User Management

| Method | URL | Auth | Purpose |
| --- | --- | --- | --- |
| GET | /api/users | superadmin | list users |
| POST | /api/users | superadmin | create user |
| PUT | /api/users/:id | superadmin | edit user |
| DELETE | /api/users/:id | superadmin | delete user |
| POST | /api/users/:id/reset-password | superadmin | reset password |

### Councils

| Method | URL | Auth | Purpose |
| --- | --- | --- | --- |
| GET | /api/councils | superadmin and board | view councils |
| POST | /api/councils | superadmin | create council |
| PUT | /api/councils/:id | superadmin | update council |
| DELETE | /api/councils/:id | superadmin | delete council |

### Submissions

| Method | URL | Auth | Purpose |
| --- | --- | --- | --- |
| GET | /api/submissions | authenticated | filtered submission list by role |
| GET | /api/submissions/my-current | council | current own submission |
| GET | /api/submissions/:id | authenticated | view metadata |
| GET | /api/submissions/file/:id | bearer token | stream current PDF |
| GET | /api/submissions/file/:id/history/:version | bearer token | stream previous PDF version |
| POST | /api/submissions | council | upload initial PDF |
| PUT | /api/submissions/:id/replace | council | replace returned or pending PDF |
| PUT | /api/submissions/:id/approve | board | approve submission |
| PUT | /api/submissions/:id/return | board | return submission with remarks |
| PUT | /api/submissions/:id/archive | superadmin | archive approved submission |

### Notifications

| Method | URL | Auth | Purpose |
| --- | --- | --- | --- |
| GET | /api/notifications | authenticated | list notifications |
| PUT | /api/notifications/:id/read | authenticated | mark single notification read |
| PUT | /api/notifications/read-all | authenticated | mark all read |

### Logs, Reports, Settings

| Method | URL | Auth | Purpose |
| --- | --- | --- | --- |
| GET | /api/logs | superadmin | activity logs |
| GET | /api/reports/submissions | superadmin and board | report filters + export |
| GET | /api/settings | superadmin | read system settings |
| PUT | /api/settings | superadmin | update settings |

## Planned Route Rules

- Keep route naming plural and lowercase.
- Keep route files split by domain.
- Keep upload/download endpoints separate from metadata endpoints.
- Keep controller logic aligned with the reference repo: explicit checks and plain JSON responses.