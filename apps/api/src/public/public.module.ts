import { Module } from '@nestjs/common';
import { PublicEventsController } from './public-events.controller';
import { PublicEventsService } from './public-events.service';
import { PublicTicketTypesController } from './public-ticket-types.controller';
import { PublicTicketTypesService } from './public-ticket-types.service';
import { PublicOrdersController } from './public-orders.controller';
import { PublicOrdersService } from './public-orders.service';

@Module({
  controllers: [
    PublicEventsController,
    PublicTicketTypesController,
    PublicOrdersController,
  ],
  providers: [PublicEventsService, PublicTicketTypesService, PublicOrdersService],
})
export class PublicModule {}
