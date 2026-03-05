import { Body, Controller, Post, Query } from '@nestjs/common';
import {
  validateTicketQuerySchema,
  validateTicketBodySchema,
  type ValidateTicketQuery,
  type ValidateTicketBody,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ScannerService } from './scanner.service';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly service: ScannerService) {}

  @Post('validate')
  async validate(
    @Query(new ZodValidationPipe(validateTicketQuerySchema))
    query: ValidateTicketQuery,
    @Body(new ZodValidationPipe(validateTicketBodySchema)) body: ValidateTicketBody,
  ) {
    return this.service.validate(query, body);
  }
}
