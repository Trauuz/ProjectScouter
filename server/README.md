# Server Boundary

Backend code belongs here, separate from route and UI code.

Suggested module shape when backend behavior is added:

- `server/<module>/domain`: entities, value objects, and repository ports.
- `server/<module>/application`: use cases and orchestration.
- `server/<module>/infrastructure`: database, external APIs, and framework adapters.
- `server/<module>/presentation`: route handlers, DTOs, and request mapping.

Dependency direction should stay inward: infrastructure depends on application
and domain contracts, while domain code has no dependency on Next.js, React, or
external services.
