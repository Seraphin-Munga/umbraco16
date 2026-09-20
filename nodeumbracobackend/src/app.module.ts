import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfigFactory } from './database/typeorm.config';
import { CustomModule } from './modules/custom/custom.module';
import { InvestmentCalculatorModule } from './modules/investment-calculator/investment-calculator.module';
import { QuickLoansModule } from './modules/quick-loans/quick-loans.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: typeOrmConfigFactory,
    }),
    CustomModule,
    InvestmentCalculatorModule,
    QuickLoansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
