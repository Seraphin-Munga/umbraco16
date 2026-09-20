import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CallMeBackEntity } from './entities/call-me-back.entity';
import { CampaignSurveyQuestionsEntity } from './entities/campaign-survey-questions.entity';
import { MarketingConsentEntity } from './entities/marketing-consent.entity';
import { VirginActiveEntity } from './entities/virgin-active.entity';
import { TrackMyLoanAuditEntity } from './entities/track-my-loan-audit.entity';
import { QqStepLogEntity } from './entities/qq-step-log.entity';
import { AuditLogEntity } from './entities/audit-log.entity';

export const typeOrmConfigFactory = (
  config: ConfigService,
): TypeOrmModuleOptions => {
  const instanceName = config.get<string>('DB_INSTANCE');
  const port = config.get<string>('DB_PORT');

  return {
    type: 'mssql',
    host: config.get<string>('DB_HOST'),
    ...(port ? { port: Number(port) } : {}),
    username: config.get<string>('DB_USER'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_NAME'),
    options: {
      ...(instanceName ? { instanceName } : {}),
      encrypt: config.get<string>('DB_ENCRYPT') === 'true',
      trustServerCertificate:
        config.get<string>('DB_TRUST_SERVER_CERT') !== 'false',
    },
    entities: [
      CallMeBackEntity,
      CampaignSurveyQuestionsEntity,
      MarketingConsentEntity,
      VirginActiveEntity,
      TrackMyLoanAuditEntity,
      QqStepLogEntity,
      AuditLogEntity,
    ],
    // The legacy app read/wrote these tables as pre-existing NPoco POCOs.
    // Never let TypeORM auto-create/alter them against the real database.
    synchronize: false,
  };
};
