import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { FoundationTestController } from './foundation-test.controller';

@Module({
  imports: [AuthModule],
  controllers: [FoundationTestController],
})
export class FoundationTestModule {}
