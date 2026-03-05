import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { PublicModule } from './public/public.module';
import { PublicPaymentsModule } from './modules/public-payments/public-payments.module';
import { ScannerModule } from './scanner/scanner.module';
import { FoundationTestModule } from './modules/foundation-test/foundation-test.module';
import { CourtesiesModule } from './modules/courtesies/courtesies.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    PublicModule,
    PublicPaymentsModule,
    ScannerModule,
    FoundationTestModule,
    CourtesiesModule,
    ReferralsModule,
    ReviewsModule,
    AuditModule,
    AdminModule,
  ],
})
export class AppModule {}
