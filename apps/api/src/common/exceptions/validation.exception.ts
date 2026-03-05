import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@yo-te-invito/shared';

export interface ValidationDetail {
  path: (string | number)[];
  message: string;
}

export class ValidationException extends HttpException {
  constructor(details: ValidationDetail[]) {
    super(
      {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Validation failed',
        details,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
