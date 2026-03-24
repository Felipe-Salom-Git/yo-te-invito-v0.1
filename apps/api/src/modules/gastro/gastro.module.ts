import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { GastroController } from './gastro.controller';
import { GastroService } from './gastro.service';

@Module({
  imports: [AuthModule],
  controllers: [GastroController],
  providers: [ProfilesAuthorizationService, GastroRolesGuard, GastroService],
})
export class GastroModule {}
