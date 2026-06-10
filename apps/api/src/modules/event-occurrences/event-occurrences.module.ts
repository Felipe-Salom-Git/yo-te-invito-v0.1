import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventOccurrencesService } from './event-occurrences.service';

@Module({
  imports: [PrismaModule],
  providers: [EventOccurrencesService],
  exports: [EventOccurrencesService],
})
export class EventOccurrencesModule {}
