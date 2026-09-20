import { Body, Controller, Post } from '@nestjs/common';
import { InvestmentCalculatorService } from './investment-calculator.service';
import { InsuranceQuoteDto } from './dto/insurance-quote.dto';

// Ported from Web/Controllers/InvestmentCalculatorController.cs
@Controller('investment-calculator')
export class InvestmentCalculatorController {
  constructor(private readonly service: InvestmentCalculatorService) {}

  @Post()
  investmentCalculator(@Body() form: InsuranceQuoteDto) {
    return this.service.getQuote(form);
  }
}
