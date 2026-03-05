# API Contracts (Slice 01)

## Overview
This document defines how we structure API requests, responses, and errors across the Yo Te Invito platform. By maintaining strict contracts, we ensure that the web, scanner, and api apps can communicate predictably.

## 1. Source of Truth
The `packages/shared` package is the single source of truth for all API contracts.
- **Zod schemas** define the exact runtime shape of data.
- **TypeScript types** are derived directly from Zod schemas (`z.infer<typeof Schema>`).

Backend controllers and frontend API clients MUST use these shared definitions.

## 2. Standard Response Wrapper
All successful API responses should be wrapped in a standard structure.

```typescript
// packages/shared/src/contracts/response.ts
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

## 3. Standard Error Format

Errors returned by the NestJS API must follow a predictable shape so the frontend can handle them uniformly.

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

**ErrorCode enum** (`packages/shared`):

- `VALIDATION_FAILED`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `INTERNAL_ERROR`
- `CONFLICT`

## 4. RESTful Conventions
- **GET /resource**: List items, supports pagination (`?page=1&limit=20`). Returns `ApiResponse<Resource[]>`.
- **GET /resource/:id**: Get single item. Returns `ApiResponse<Resource>`.
- **POST /resource**: Create item. Body validated by Zod. Returns `ApiResponse<Resource>` (201).
- **PATCH /resource/:id**: Update item partially. Body validated by Zod. Returns `ApiResponse<Resource>` (200).
- **DELETE /resource/:id**: Soft or hard delete item. Returns 204 No Content.

## 5. Versioning
In V1, versioning is handled at the URL level in the API app:
`http://api.domain.com/v1/*`

Breaking changes to contracts will require bumping the API version.
