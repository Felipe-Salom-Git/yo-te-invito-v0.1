import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { PublicModule } from './public/public.module';
import { ScannerModule } from './scanner/scanner.module';
import { FoundationTestModule } from './modules/foundation-test/foundation-test.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    PublicModule,
    ScannerModule,
    FoundationTestModule,
  ],
})
export class AppModule {}
