/**
 * Standard API error response shape
 */

import type { ErrorCode } from '../enums/error-codes';

export interface ApiErrorResponse {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details: unknown[] | null;
  timestamp: string;
  path: string;
}
