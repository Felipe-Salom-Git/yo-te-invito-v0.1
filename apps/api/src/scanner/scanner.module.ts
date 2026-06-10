import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfilesAuthorizationService } from '../common/profiles-authorization.service';
import { ScannerAccountsModule } from '../modules/scanner-accounts/scanner-accounts.module';
import { ScannerController } from './scanner.controller';
import { ScannerGastroDiscountService } from './scanner-gastro-discount.service';
import { ScannerService } from './scanner.service';

@Module({
  imports: [AuthModule, ScannerAccountsModule],
  controllers: [ScannerController],
  providers: [ScannerService, ScannerGastroDiscountService, ProfilesAuthorizationService],
})
export class ScannerModule {}
