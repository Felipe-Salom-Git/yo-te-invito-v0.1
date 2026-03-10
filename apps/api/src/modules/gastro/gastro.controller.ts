import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtOrDevAuthGuard } from '../../auth/jwt-or-dev-auth.guard';
import { GastroService } from './gastro.service';

@Controller('gastro')
@UseGuards(JwtOrDevAuthGuard)
export class GastroController {
  constructor(private readonly service: GastroService) {}

  @Get('events/:eventId/content')
  async listContent(@Param('eventId') eventId: string) {
    return this.service.listContent(eventId);
  }

  @Post('events/:eventId/content')
  async createContent(@Param('eventId') eventId: string, @Body() body: unknown) {
    return this.service.createContent(eventId, body);
  }

  @Patch('content/:id')
  async updateContent(@Param('id') id: string, @Body() body: unknown) {
    return this.service.updateContent(id, body);
  }

  @Get('events/:eventId/discounts')
  async listDiscounts(@Param('eventId') eventId: string) {
    return this.service.listDiscounts(eventId);
  }

  @Post('events/:eventId/discounts')
  async createDiscount(@Param('eventId') eventId: string, @Body() body: unknown) {
    return this.service.createDiscount(eventId, body);
  }

  @Patch('discounts/:id')
  async updateDiscount(@Param('id') id: string, @Body() body: unknown) {
    return this.service.updateDiscount(id, body);
  }

  @Get('validations')
  async listValidations(@Param('discountId') _discountId?: string) {
    return this.service.listValidations();
  }

  @Post('validations')
  async recordValidation(@Body() body: { discountId: string; userId?: string; orderId?: string }) {
    return this.service.recordValidation(body.discountId, body.userId, body.orderId);
  }
}
