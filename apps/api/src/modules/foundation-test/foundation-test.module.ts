import { Module } from '@nestjs/common';
import { FoundationTestController } from './foundation-test.controller';

@Module({
  controllers: [FoundationTestController],
})
export class FoundationTestModule {}
