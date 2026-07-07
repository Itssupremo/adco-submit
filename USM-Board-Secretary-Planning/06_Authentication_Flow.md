# Authentication Flow

## Reference Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant API as Express API
    participant DB as MongoDB

    U->>FE: submit credentials
    FE->>API: POST /auth/login
    API->>DB: find user by username or email
    API->>API: compare bcrypt hash
    API->>API: sign JWT for 7 days
    API-->>FE: token + user payload
    FE->>FE: save token in localStorage
    FE->>API: GET /auth/me with Bearer token
    API->>API: verify JWT
    API->>DB: load user
    API-->>FE: current user
```

## Planned USM Flow

### Login

1. User submits username and password.
2. Backend validates credentials using bcrypt.
3. Backend issues JWT with role and user id payload.
4. Frontend stores token in `localStorage`.
5. Frontend restores state using `GET /auth/me`.

### Protected Route Pattern

1. Axios interceptor attaches `Authorization: Bearer <token>`.
2. `authenticate` middleware verifies the token.
3. Middleware fetches the user and attaches `req.user`.
4. Route middleware checks role.
5. Controller applies resource-level ownership constraints.

### Role Guards for USM

- `superAdminOnly`
- `boardOnly`
- `councilOnly`
- `boardOrSuperAdmin`

### Resource Ownership Rules

- Super Admin: unrestricted
- USM Board: can view all submissions and act on review states
- Administrative Council: can view and mutate only its own submission

## Planned Authorization Matrix in Flow Form

```mermaid
flowchart TD
    A[Request enters route] --> B{JWT valid?}
    B -- No --> X[401 Unauthorized]
    B -- Yes --> C[Load req.user]
    C --> D{Role allowed on route?}
    D -- No --> Y[403 Forbidden]
    D -- Yes --> E{Own resource required?}
    E -- No --> F[Controller executes]
    E -- Yes --> G{Resource belongs to council user?}
    G -- No --> Y
    G -- Yes --> F
```

## Security Decisions to Preserve or Improve

### Preserve

- JWT-based stateless auth
- bcrypt password hashing
- middleware-centered enforcement

### Improve During Implementation

- avoid query-string tokens for file access if possible
- add rate limiting for login and upload endpoints
- centralize request validation
- log password reset and approval actions explicitly