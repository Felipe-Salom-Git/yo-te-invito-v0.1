import { Controller, Get, Query } from '@nestjs/common';
import {
  publicContentTagsQuerySchema,
  type PublicContentTagsQuery,
} from '@yo-te-invito/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ContentTagsService } from './content-tags.service';

@Controller('public/tags')
export class PublicContentTagsController {
  constructor(private readonly tags: ContentTagsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(publicContentTagsQuerySchema))
    query: PublicContentTagsQuery,
  ) {
    return this.tags.listPublic(query);
  }
}
