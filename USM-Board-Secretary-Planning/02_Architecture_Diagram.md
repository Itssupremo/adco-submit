# Architecture Diagram

## Reference System

```mermaid
flowchart LR
    U[Browser Client] --> F[React + Vite Frontend]
    F --> AX[Axios Service Layer]
    AX --> E[Express API]
    E --> M[Auth Middleware]
    E --> C[Controllers]
    C --> MM[Mongoose Models]
    MM --> DB[(MongoDB)]
    C --> S3[S3 or Spaces]
    C --> LOG[Activity Logger]
    LOG --> DB
    V[Vercel Serverless Wrapper] --> E
```

## Planned USM System

```mermaid
flowchart LR
    A[Super Admin] --> UI[Shared React Auth Shell]
    B[USM Board] --> UI
    C[Administrative Council] --> UI

    UI --> API[Express API]
    API --> AUTH[JWT Middleware]
    API --> CTL[Controllers]
    CTL --> MOD[Models]
    MOD --> MDB[(MongoDB)]
    CTL --> STORE[PDF Storage: S3 or MongoDB Buffer]
    CTL --> AUDIT[Activity Logs]
    AUDIT --> MDB
    CTL --> NOTE[Notification Records]
    NOTE --> MDB
    API --> RPT[Report Export Logic]
```

## Architectural Direction

- Keep the runtime topology identical to the reference repo.
- Replace the SUC agenda domain with an Administrative Council submission domain.
- Reuse the same client shell, upload pattern, PDF viewer pattern, and audit logging pattern.
- Add a notification module and system settings module without changing the overall shape.