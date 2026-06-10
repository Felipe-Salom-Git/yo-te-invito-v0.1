import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { LegalDocumentsService } from './legal-documents.service';
import { LegalSignupService } from './legal-signup.service';
import { MeLegalService } from './me-legal.service';
import { EventPublicationLegalService } from './event-publication-legal.service';
import { AdminLegalDocumentsController } from './admin-legal-documents.controller';
import { PublicLegalDocumentsController } from './public-legal-documents.controller';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [AdminLegalDocumentsController, PublicLegalDocumentsController],
  providers: [
    LegalDocumentsService,
    MeLegalService,
    LegalSignupService,
    EventPublicationLegalService,
    ProfilesAuthorizationService,
  ],
  exports: [
    LegalDocumentsService,
    MeLegalService,
    LegalSignupService,
    EventPublicationLegalService,
  ],
})
export class LegalModule {}
