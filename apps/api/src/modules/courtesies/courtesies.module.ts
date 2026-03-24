import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { CourtesiesController } from './courtesies.controller';
import { CourtesiesService } from './courtesies.service';

@Module({
  imports: [AuthModule],
  controllers: [CourtesiesController],
  providers: [ProfilesAuthorizationService, ProducerRolesGuard, CourtesiesService],
})
export class CourtesiesModule {}
