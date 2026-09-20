import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../../common/auth/auth.module';
import { ApiUrlsModule } from '../../common/api-urls/api-urls.module';
import { QqStepLogEntity } from '../../database/entities/qq-step-log.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

import { QuickLoansController } from './quick-loans.controller';
import { QuickLoansService } from './quick-loans.service';

@Module({
  imports: [
    HttpModule,
    AuthModule,
    ApiUrlsModule,
    TypeOrmModule.forFeature([QqStepLogEntity, AuditLogEntity]),
  ],
  controllers: [QuickLoansController],
  providers: [QuickLoansService],
})
export class QuickLoansModule {}
