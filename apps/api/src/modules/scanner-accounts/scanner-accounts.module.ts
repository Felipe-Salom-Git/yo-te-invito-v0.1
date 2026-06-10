import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ProducerRolesGuard } from '../../common/guards/producer-roles.guard';
import { GastroRolesGuard } from '../../common/guards/gastro-roles.guard';
import { ScannerAccountsService } from './scanner-accounts.service';
import { ProducerScannerAccountsController } from './producer-scanner-accounts.controller';
import { GastroScannerAccountsController } from './gastro-scanner-accounts.controller';
import { AdminScannerAccountsController } from './admin-scanner-accounts.controller';
import { ScannerAccountSelfController } from './scanner-account-self.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    ProducerScannerAccountsController,
    GastroScannerAccountsController,
    AdminScannerAccountsController,
    ScannerAccountSelfController,
  ],
  providers: [
    ScannerAccountsService,
    ProfilesAuthorizationService,
    ProducerRolesGuard,
    GastroRolesGuard,
  ],
  exports: [ScannerAccountsService],
})
export class ScannerAccountsModule {}
