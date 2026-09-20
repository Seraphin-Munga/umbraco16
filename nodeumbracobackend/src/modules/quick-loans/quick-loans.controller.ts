import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QuickLoansService } from './quick-loans.service';
import { QqStepLogDto } from './dto/qq-step-log.dto';
import { ValidateClientDto } from './dto/validate-client.dto';
import {
  ApplicationDetailsDto,
  CancelApplicationDetailsDto,
  OtpClientCallBackDto,
  OtpClientNumberDto,
  PatchToIofDto,
  SaveApplicationBankingDto,
  SaveApplicationEmploymentDto,
  SaveApplicationFinanceDto,
  SaveClientContactDetailsDto,
  SaveClientDetailsDto,
} from './dto/application.dto';

// Ported from Web/Controllers/QuickLoansController.cs
@Controller('quick-loans')
export class QuickLoansController {
  constructor(private readonly service: QuickLoansService) {}

  @Get('qq-step-log')
  getQqByPhone(@Query('phoneNumber') phoneNumber: string) {
    return this.service.getQqByPhone(phoneNumber);
  }

  @Post('qq-step-log/personal-details')
  logPersonalDetails(@Body() dto: QqStepLogDto) {
    return this.service.logPersonalDetails(dto);
  }

  @Post('qq-step-log/offers-details')
  logOffersDetails(@Body() dto: QqStepLogDto) {
    return this.service.logOffersDetails(dto);
  }

  @Post('qq-step-log/employee-details')
  logEmployeeDetails(@Body() dto: QqStepLogDto) {
    return this.service.logEmployeeDetails(dto);
  }

  @Post('qq-step-log/marketing-consent-details')
  logMarketingConsentDetails(@Body() dto: QqStepLogDto) {
    return this.service.logMarketingConsentDetails(dto);
  }

  @Post('qq-step-log/financial-details')
  logFinancialDetails(@Body() dto: QqStepLogDto) {
    return this.service.logFinancialDetails(dto);
  }

  @Post('qq-step-log/begin-ia')
  beginIA(@Body() dto: QqStepLogDto) {
    return this.service.beginIA(dto);
  }

  @Post('qq-step-log/otp-offer-detail')
  logOtpOfferDetail(@Body() dto: QqStepLogDto) {
    return this.service.logOtpOfferDetail(dto);
  }

  @Post('qq-step-log/selected-offer')
  logSelectedOffer(@Body() dto: QqStepLogDto) {
    return this.service.logSelectedOffer(dto);
  }

  @Post('validate-client')
  validateClient(@Body() dto: ValidateClientDto) {
    return this.service.validateClient(dto);
  }

  @Post('applications')
  createApplication(@Body() dto: ApplicationDetailsDto) {
    return this.service.createApplication(dto);
  }

  @Post('applications/cancel')
  cancelApplication(@Body() dto: CancelApplicationDetailsDto) {
    return this.service.cancelApplication(dto);
  }

  @Post('otp/client-number')
  otpClientNumber(@Body() dto: OtpClientNumberDto) {
    return this.service.otpClientNumber(dto);
  }

  @Post('otp/callback')
  otpCallBack(@Body() dto: OtpClientCallBackDto) {
    return this.service.otpCallBack(dto);
  }

  @Post('applications/employment')
  saveApplicationEmployment(@Body() dto: SaveApplicationEmploymentDto) {
    return this.service.saveApplicationEmployment(dto);
  }

  @Post('applications/banking')
  saveApplicationBanking(@Body() dto: SaveApplicationBankingDto) {
    return this.service.saveApplicationBanking(dto);
  }

  @Post('applications/finance')
  saveApplicationFinance(@Body() dto: SaveApplicationFinanceDto) {
    return this.service.saveApplicationFinance(dto);
  }

  @Post('offers/save')
  saveOffer(@Body() dto: PatchToIofDto) {
    return this.service.saveOffer(dto);
  }

  @Post('questionnaire/:number')
  getQuestionnaireForID(@Param('number') number: string) {
    return this.service.getQuestionnaireForID(number);
  }

  @Post('offers')
  getOffers(@Body() dto: OtpClientCallBackDto) {
    return this.service.getOffers(dto);
  }

  @Post('clients')
  saveClientDetails(@Body() dto: SaveClientDetailsDto) {
    return this.service.saveClientDetails(dto);
  }

  @Post('clients/contact-details')
  saveClientContactDetails(@Body() dto: SaveClientContactDetailsDto) {
    return this.service.saveClientContactDetails(dto);
  }

  @Get('employers/search')
  searchEmployer(
    @Query('employerName') employerName: string,
    @Query('employeeType') employeeType: string,
  ) {
    return this.service.searchEmployer(employerName, employeeType);
  }

  @Get('employment-types')
  getEmploymentTypes() {
    return this.service.getEmploymentTypes();
  }

  @Get('occupation-types')
  getOccupationTypes(@Query('occType') occType: string) {
    return this.service.getOccupationTypes(occType);
  }

  @Get('banks/search')
  searchBank(@Query('bankName') bankName: string) {
    return this.service.searchBank(bankName);
  }
}
