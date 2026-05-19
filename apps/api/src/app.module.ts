import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { ProducerModule } from './modules/producer/producer.module';
import { OrderExpirationModule } from './modules/order-expiration/order-expiration.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { FraudModule } from './modules/fraud/fraud.module';
import { MeModule } from './modules/me/me.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { GastroModule } from './modules/gastro/gastro.module';
import { HotelModule } from './modules/hotel/hotel.module';
import { ResaleModule } from './modules/resale/resale.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ReferrerModule } from './modules/referrer/referrer.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    AuthModule,
    EmailModule,
    ScheduleModule.forRoot(),
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
    ProducerModule,
    OrderExpirationModule,
    TicketsModule,
    FraudModule,
    MeModule,
    PayoutsModule,
    GastroModule,
    HotelModule,
    ResaleModule,
    ProfilesModule,
    ReferrerModule,
  ],
})
export class AppModule {}
