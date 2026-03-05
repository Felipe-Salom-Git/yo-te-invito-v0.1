import { Module } from '@nestjs/common';
import { CourtesiesController } from './courtesies.controller';
import { CourtesiesService } from './courtesies.service';

@Module({
  controllers: [CourtesiesController],
  providers: [CourtesiesService],
})
export class CourtesiesModule {}
