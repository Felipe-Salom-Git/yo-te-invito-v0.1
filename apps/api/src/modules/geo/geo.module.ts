import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { GeoController } from './geo.controller';
import { GeoRefService } from './georef.service';
import { GeoService } from './geo.service';

@Module({
  imports: [AuthModule],
  controllers: [GeoController],
  providers: [GeoService, GeoRefService],
  exports: [GeoService, GeoRefService],
})
export class GeoModule {}
