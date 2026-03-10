import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { GastroController } from './gastro.controller';
import { GastroService } from './gastro.service';

@Module({
  imports: [AuthModule],
  controllers: [GastroController],
  providers: [GastroService],
})
export class GastroModule {}
