import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { LegalDocumentsService } from './legal-documents.service';
import { LegalSignupService } from './legal-signup.service';
import { MeLegalService } from './me-legal.service';
import { AdminLegalDocumentsController } from './admin-legal-documents.controller';
import { PublicLegalDocumentsController } from './public-legal-documents.controller';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [AdminLegalDocumentsController, PublicLegalDocumentsController],
  providers: [LegalDocumentsService, MeLegalService, LegalSignupService],
  exports: [LegalDocumentsService, MeLegalService, LegalSignupService],
})
export class LegalModule {}
