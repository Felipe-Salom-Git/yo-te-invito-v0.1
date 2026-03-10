import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { CourtesiesController } from './courtesies.controller';
import { CourtesiesService } from './courtesies.service';

@Module({
  imports: [AuthModule],
  controllers: [CourtesiesController],
  providers: [CourtesiesService],
})
export class CourtesiesModule {}
