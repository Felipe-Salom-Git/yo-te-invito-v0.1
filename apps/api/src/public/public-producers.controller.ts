import { Controller, Get, Param } from '@nestjs/common';
import { PublicProducersService } from './public-producers.service';

@Controller('public/producers')
export class PublicProducersController {
  constructor(private readonly service: PublicProducersService) {}

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.getById(id);
  }
}
