# ERROR_HANDLING_TEMPLATE.md
## Centralized Error Handling Template
### Ticketera – Yo Te Invito

This template defines a consistent error strategy for the API.

Goals:
- predictable error shape for frontend
- correct HTTP status codes
- safe logging (no secrets)
- centralized mapping (avoid per-controller ad-hoc responses)

---

# 1) Error Shape (Response Contract)

Recommended API error response:

~~~json
{
  "error": {
    "code": "DOMAIN_RULE",
    "message": "Invitations can only be created for published events",
    "details": {
      "hint": "Publish the event first"
    }
  }
}
~~~

Rules:
- `code`: stable machine-readable identifier
- `message`: human-readable
- `details`: optional, for client debugging (no secrets)

---

# 2) Error Types

Define a standard `AppError` (or equivalent):
- `code: string`
- `message: string`
- `status: number`
- `details?: unknown`

Also handle:
- Zod errors (400)
- Prisma known errors (409/400 depending)
- Unknown errors (500)

---

# 3) Mapping Table

Suggested mapping (adjust to your policy):

| Source | HTTP | code |
|------:|-----:|------|
| Zod validation | 400 | VALIDATION_ERROR |
| Not authenticated | 401 | UNAUTHENTICATED |
| Not authorized | 403 | FORBIDDEN |
| Not found | 404 | NOT_FOUND |
| Conflict | 409 | CONFLICT |
| Domain rule violation | 422 | DOMAIN_RULE |
| Unknown | 500 | INTERNAL_ERROR |

---

# 4) Implementation Skeleton

## 4.1 AppError
~~~ts
// src/errors/AppError.ts
export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
~~~

## 4.2 Error Middleware (Express example)
~~~ts
// src/api/middleware/errorHandler.ts
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../../errors/AppError";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // 1) Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: { issues: err.issues },
      },
    });
  }

  // 2) AppError
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // 3) Prisma (optional: add known error mapping)
  // if (isPrismaKnownRequestError(err)) { ... }

  // 4) Unknown
  // Log safely (avoid secrets)
  console.error("Unhandled error:", err);

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Unexpected error",
    },
  });
}
~~~

---

# 5) Logging Guidelines

- log correlation id / request id if available
- avoid logging tokens, passwords, secrets
- for validation errors, logging issues is OK
- for unknown errors, log stack on server only

---

# 6) Frontend Handling Guidelines

Frontend should:
- rely on `error.code` to branch behavior
- display `error.message` to user only when safe
- treat `details` as optional debug info

---

# 7) AI Self-Review

- [ ] Controllers call `next(err)` (no ad-hoc error JSON)
- [ ] Zod errors mapped to 400
- [ ] Domain errors mapped consistently
- [ ] Unknown errors return 500 with safe message
- [ ] Error response shape stable

# End of ERROR_HANDLING_TEMPLATE.md