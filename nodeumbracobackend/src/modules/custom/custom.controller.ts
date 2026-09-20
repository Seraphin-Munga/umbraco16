import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CustomService } from './custom.service';
import { SaveVirginActiveDto } from './dto/save-virgin-active.dto';
import { SaveMarketingConsentDto } from './dto/save-marketing-consent.dto';
import { SurveyQuestionsDto } from './dto/survey-questions.dto';
import { CallMeBackRequestDto } from './dto/call-me-back.dto';

// Ported from Web/Controllers/CustomController.cs
@Controller('custom')
export class CustomController {
  constructor(private readonly customService: CustomService) {}

  @Post('virgin-active')
  saveVirginActive(@Body() dto: SaveVirginActiveDto) {
    return this.customService.saveVirginActive(dto);
  }

  @Post('marketing-consent')
  saveConsent(@Body() dto: SaveMarketingConsentDto) {
    return this.customService.saveConsent(dto);
  }

  @Post('survey-mail')
  sendSurveyMail(@Body() dto: SurveyQuestionsDto) {
    return this.customService.sendSurveyMail(dto);
  }

  @Post('opt-out')
  newOptOut(
    @Body() dto: Pick<SurveyQuestionsDto, 'firstName' | 'cellPhone' | 'email'>,
  ) {
    return this.customService.newOptOut(dto);
  }

  @Post('call-me-back')
  callMeRequest(@Body() dto: CallMeBackRequestDto) {
    return this.customService.callMeRequest(dto);
  }

  @Get('track-my-loan/client-search')
  clientSearch(@Query('idNumber') idNumber: string) {
    return this.customService.clientSearch(idNumber);
  }

  @Get('track-my-loan/applications')
  getApplications(@Query('clientNumber') clientNumber: string) {
    return this.customService.getApplications(clientNumber);
  }
}
