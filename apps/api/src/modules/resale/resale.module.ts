import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ResaleController } from './resale.controller';
import { ResaleService } from './resale.service';

@Module({
  imports: [AuthModule],
  controllers: [ResaleController],
  providers: [ResaleService],
})
export class ResaleModule {}
