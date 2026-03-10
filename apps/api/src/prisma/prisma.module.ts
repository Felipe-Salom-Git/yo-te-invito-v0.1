import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { EventCapacityGuardService } from '../common/event-capacity-guard.service';

@Global()
@Module({
  providers: [PrismaService, EventCapacityGuardService],
  exports: [PrismaService, EventCapacityGuardService],
})
export class PrismaModule {}
