import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../../common/auth/auth.module';
import { ApiUrlsModule } from '../../common/api-urls/api-urls.module';
import { CallMeBackEntity } from '../../database/entities/call-me-back.entity';
import { CampaignSurveyQuestionsEntity } from '../../database/entities/campaign-survey-questions.entity';
import { MarketingConsentEntity } from '../../database/entities/marketing-consent.entity';
import { VirginActiveEntity } from '../../database/entities/virgin-active.entity';
import { TrackMyLoanAuditEntity } from '../../database/entities/track-my-loan-audit.entity';

import { CustomController } from './custom.controller';
import { CustomService } from './custom.service';

@Module({
  imports: [
    HttpModule,
    AuthModule,
    ApiUrlsModule,
    TypeOrmModule.forFeature([
      CallMeBackEntity,
      CampaignSurveyQuestionsEntity,
      MarketingConsentEntity,
      VirginActiveEntity,
      TrackMyLoanAuditEntity,
    ]),
  ],
  controllers: [CustomController],
  providers: [CustomService],
})
export class CustomModule {}
