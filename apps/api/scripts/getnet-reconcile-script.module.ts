import { Module } from '@nestjs/common';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PublicPaymentsModule } from '../src/modules/public-payments/public-payments.module';

/**
 * Minimal Nest context for `payments:reconcile-getnet` CLI (avoids full AppModule + schedulers).
 */
@Module({
  imports: [PrismaModule, PublicPaymentsModule],
})
export class GetnetReconcileScriptModule {}
