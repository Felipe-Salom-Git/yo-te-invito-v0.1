import { Controller, Post } from '@nestjs/common';
import { FraudDetectionService } from './fraud-detection.service';

@Controller('internal/jobs')
export class FraudDetectionController {
  constructor(private readonly service: FraudDetectionService) {}

  @Post('fraud-detection')
  async runFraudDetection() {
    return this.service.runFraudDetectionJob();
  }
}
