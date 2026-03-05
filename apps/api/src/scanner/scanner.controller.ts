import { Body, Controller, Post } from '@nestjs/common';
import { scanRequestSchema, ScanResult } from '@yo-te-invito/shared';
import { ScannerService } from './scanner.service';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly service: ScannerService) {}

  @Post('scan')
  async scan(@Body() body: unknown) {
    const parsed = scanRequestSchema.parse(body);
    return this.service.scan(parsed);
  }
}
