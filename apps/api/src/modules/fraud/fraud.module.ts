import { Module } from '@nestjs/common';
import { FraudDetectionController } from './fraud-detection.controller';
import { FraudDetectionService } from './fraud-detection.service';

@Module({
  controllers: [FraudDetectionController],
  providers: [FraudDetectionService],
})
export class FraudModule {}
