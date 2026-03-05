# API Conventions — Yo Te Invito (NestJS)

## Overview

This document describes how to build controllers, services, and use validation/auth in the API.

---

## Controller / Service Boundaries

- **Controllers**: HTTP only — validate input, call services, return responses. No business logic.
- **Services**: Business logic, orchestration. Call Prisma or other services.
- **Pipes**: Validation (Zod).
- **Guards**: Authentication and authorization.
- **Filters**: Format all errors to the standard shape.

---

## ZodValidationPipe

Use for body, query, or params validation.

```typescript
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { mySchema } from '@yo-te-invito/shared';

@Post('example')
@UsePipes(new ZodValidationPipe(mySchema))
create(@Body() body: z.infer<typeof mySchema>) {
  return this.service.create(body);
}
```

For query params:

```typescript
@Get()
@UsePipes(new ZodValidationPipe(querySchema))
list(@Query() query: z.infer<typeof querySchema>) {
  return this.service.list(query);
}
```

Schemas live in `packages/shared`. Controllers import and pass to the pipe.

---

## DevAuthGuard

Development-only auth via `X-Dev-User-Id` header.

**Activation**: Only when `NODE_ENV === 'development'` OR `DEV_AUTH_ENABLED === 'true'`.

**Usage**:

```typescript
@Get('protected')
@UseGuards(DevAuthGuard)
protected() {
  return { ok: true };
}
```

The guard loads the user from Prisma (ignores soft-deleted) and attaches to `request.user`.

---

## RequireRole Decorator + RolesGuard

Enforce role-based access. Use **after** DevAuthGuard (or future JWT guard).

```typescript
@Get('admin-only')
@UseGuards(DevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
adminOnly() {
  return { ok: true };
}
```

- No user → 401 UNAUTHORIZED
- Role mismatch → 403 FORBIDDEN

---

## CurrentUser Decorator

Extract the authenticated user from the request:

```typescript
@Get('me')
@UseGuards(DevAuthGuard)
me(@CurrentUser() user: { id: string; tenantId: string; role: string }) {
  return user;
}
```

---

## Standard Error Shape

All errors return:

```json
{
  "statusCode": number,
  "code": "ERROR_CODE",
  "message": string,
  "details": [] | null,
  "timestamp": "ISO8601",
  "path": string
}
```

See `packages/shared` for `ErrorCode` and `ApiErrorResponse`.
