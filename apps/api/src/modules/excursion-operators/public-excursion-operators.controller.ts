import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  excursionOperatorIdParamsSchema,
  type ExcursionOperatorIdParams,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ExcursionOperatorsService } from './excursion-operators.service';
import { z } from 'zod';

const publicExcursionOperatorQuerySchema = z.object({
  tenantId: z.string().min(1),
});

@Controller('public/excursion-operators')
export class PublicExcursionOperatorsController {
  constructor(private readonly excursionOperators: ExcursionOperatorsService) {}

  @Get(':id')
  async getDetail(
    @Param(new ZodValidationPipe(excursionOperatorIdParamsSchema))
    params: ExcursionOperatorIdParams,
    @Query(new ZodValidationPipe(publicExcursionOperatorQuerySchema))
    query: z.infer<typeof publicExcursionOperatorQuerySchema>,
  ) {
    return this.excursionOperators.getPublicDetail(query.tenantId, params.id);
  }
}
