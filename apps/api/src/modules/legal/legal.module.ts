import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { LegalDocumentsService } from './legal-documents.service';
import { MeLegalService } from './me-legal.service';
import { AdminLegalDocumentsController } from './admin-legal-documents.controller';
import { PublicLegalDocumentsController } from './public-legal-documents.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminLegalDocumentsController, PublicLegalDocumentsController],
  providers: [LegalDocumentsService, MeLegalService],
  exports: [LegalDocumentsService, MeLegalService],
})
export class LegalModule {}
