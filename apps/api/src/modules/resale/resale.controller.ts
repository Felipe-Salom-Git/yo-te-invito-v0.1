import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { ResaleService } from './resale.service';

@Controller('resale')
@UseGuards(JwtOrDevAuthGuard)
export class ResaleController {
  constructor(private readonly service: ResaleService) {}

  @Get('listings/active')
  async listActive() {
    return this.service.listActive();
  }

  @Get('listings/:id')
  async get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Get('events/:eventId/listings')
  async listByEvent(@Param('eventId') eventId: string) {
    return this.service.listByEvent(eventId);
  }

  @Post('listings')
  async create(@Body() body: unknown) {
    return this.service.create(body);
  }

  @Post('listings/:id/purchase')
  async purchase(@Param('id') id: string, @Body('buyerUserId') buyerUserId: string) {
    return this.service.purchase(id, buyerUserId);
  }
}
