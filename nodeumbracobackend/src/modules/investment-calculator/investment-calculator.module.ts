import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { InvestmentCalculatorController } from './investment-calculator.controller';
import { InvestmentCalculatorService } from './investment-calculator.service';

@Module({
  imports: [HttpModule],
  controllers: [InvestmentCalculatorController],
  providers: [InvestmentCalculatorService],
})
export class InvestmentCalculatorModule {}
