import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';

import { EbankitAuthService } from '../../common/auth/ebankit-auth.service';
import { ApiUrlsService } from '../../common/api-urls/api-urls.service';
import { CustomValidation } from '../../common/validation/custom-validation.util';
import { CallMeBackEntity } from '../../database/entities/call-me-back.entity';
import { CampaignSurveyQuestionsEntity } from '../../database/entities/campaign-survey-questions.entity';
import { MarketingConsentEntity } from '../../database/entities/marketing-consent.entity';
import { VirginActiveEntity } from '../../database/entities/virgin-active.entity';
import { TrackMyLoanAuditEntity } from '../../database/entities/track-my-loan-audit.entity';

import { SaveVirginActiveDto } from './dto/save-virgin-active.dto';
import { SaveMarketingConsentDto } from './dto/save-marketing-consent.dto';
import { SurveyQuestionsDto } from './dto/survey-questions.dto';
import {
  CallMeBackFormDto,
  CallMeBackRequestDto,
} from './dto/call-me-back.dto';
import {
  Applications,
  ApplicationData,
} from './dto/applications-response.types';
import {
  ClientModel,
  OfferRoot,
  RequiredDocumentsModel,
} from './dto/track-my-loan.types';
import {
  ConfigurableParam,
  LeadContent,
  Sms,
  SmsKeyValue,
} from './dto/lead-request.types';

interface JsonEnvelope<T> {
  data: T;
  error: boolean;
  message?: string;
}

// Ported from Web/Controllers/CustomController.cs.
// Not ported: buildHTML/buildEmailBody/GetAppropriateCulture and the Growit
// action - they rendered an IronPDF certificate on top of an Umbraco page
// (CurrentUmbracoPage()), which has no headless-API equivalent.
@Injectable()
export class CustomService {
  private readonly logger = new Logger(CustomService.name);
  private readonly validation = new CustomValidation();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly auth: EbankitAuthService,
    private readonly apiUrls: ApiUrlsService,
    @InjectRepository(CallMeBackEntity)
    private readonly callMeBackRepo: Repository<CallMeBackEntity>,
    @InjectRepository(CampaignSurveyQuestionsEntity)
    private readonly surveyRepo: Repository<CampaignSurveyQuestionsEntity>,
    @InjectRepository(MarketingConsentEntity)
    private readonly marketingConsentRepo: Repository<MarketingConsentEntity>,
    @InjectRepository(VirginActiveEntity)
    private readonly virginActiveRepo: Repository<VirginActiveEntity>,
    @InjectRepository(TrackMyLoanAuditEntity)
    private readonly trackMyLoanAuditRepo: Repository<TrackMyLoanAuditEntity>,
  ) {}

  // ---------------------------------------------------------------------
  // Campaign & consent forms
  // ---------------------------------------------------------------------

  /** Ported from SaveVirginActive(cmsVirginActive virginObj). */
  async saveVirginActive(
    dto: SaveVirginActiveDto,
  ): Promise<JsonEnvelope<string>> {
    // NOTE: the legacy action never actually sets isConsentSaved = true on the
    // success path either - it always responds with "False". Preserved as-is.
    const isConsentSaved = false;
    try {
      await this.virginActiveRepo.insert({ ...dto, consentDate: new Date() });

      const urls = this.apiUrls.getCallMeBackUrls('CallMeBack');
      const form: CallMeBackFormDto = {
        FirstNameInput: dto.Name,
        LastNameInput: dto.Surname,
        SAIDInput: dto.IdNumber,
        CellPhoneInput: dto.Cellphone,
        EmailInput: dto.Email,
        cbx: 'on',
        frmLeadSource: 'Virgin Active',
      };

      await this.callMeRequest({
        form,
        prodId: parseInt(urls[0], 10),
        callMeSubject: urls[1],
        callMeContactType: urls[2],
      });
    } catch (err) {
      this.logger.error('saveVirginActive failed', err as Error);
    }
    return { data: String(isConsentSaved), error: false };
  }

  /** Ported from SaveConsent(Models.MarketingConsent marketingObj). */
  async saveConsent(
    dto: SaveMarketingConsentDto,
  ): Promise<JsonEnvelope<string>> {
    const isConsentSaved = false;
    try {
      await this.marketingConsentRepo.insert({
        ...dto,
        IdNumber: String(dto.IdNumber),
        consentDate: new Date(),
      });
    } catch (err) {
      this.logger.error('saveConsent failed', err as Error);
    }
    return { data: String(isConsentSaved), error: false };
  }

  /** Ported from SendSurveyMail(FormCollection form). */
  async sendSurveyMail(dto: SurveyQuestionsDto): Promise<JsonEnvelope<string>> {
    let mailSent = '';
    await this.surveyRepo.insert(dto);
    mailSent += (await this.sendCampaignSurveyMail(dto))
      ? '; Mail sent!'
      : '; Mail not sent';
    return { data: mailSent, error: false };
  }

  /** Ported from newOptOut(FormCollection form). */
  async newOptOut(
    dto: Pick<SurveyQuestionsDto, 'firstName' | 'cellPhone' | 'email'>,
  ): Promise<JsonEnvelope<string>> {
    const fullDto: SurveyQuestionsDto = {
      ...dto,
      biggestFinancialWorry: '',
      sexiestBankFeature: '',
      feelLikeADinosaur: '',
      partOfSABanking: '',
      bankAddMoreValue: '',
    };
    let mailSent = '';
    await this.surveyRepo.insert(fullDto);
    mailSent += (await this.sendCampaignSurveyMail(fullDto))
      ? '; Mail sent!'
      : '; Mail not sent';
    return { data: mailSent, error: false };
  }

  private async sendCampaignSurveyMail(
    dto: SurveyQuestionsDto,
  ): Promise<boolean> {
    try {
      const transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port: Number(this.config.get<string>('SMTP_PORT') ?? 25),
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASSWORD'),
        },
      });

      await transporter.sendMail({
        to: this.config.get<string>('MAIL_TO'),
        from: dto.email,
        subject: 'African Bank & Sowetan Live Campaign Competition',
        html: this.buildSurveyEmailBody(dto),
      });
      return true;
    } catch (err) {
      this.logger.error('sendCampaignSurveyMail failed', err as Error);
      return false;
    }
  }

  private buildSurveyEmailBody(dto: SurveyQuestionsDto): string {
    return (
      `<div>Name:<b> ${dto.firstName}</b></div>` +
      `<div>Cellphone:<b> ${dto.cellPhone}</b></div>` +
      `<div>Email:<b> ${dto.email}</b></div><br>` +
      `<table border="0">` +
      `<tr><td>My biggest financial worry each month: </td><td><b>${dto.biggestFinancialWorry}</td></tr>` +
      `<tr><td>Sexiest bank feature I look for: </td><td><b>${dto.sexiestBankFeature}</b></td></tr>` +
      `<tr><td>Do you feel like a dinosaur if you visit your branch?: </td><td><b>${dto.feelLikeADinosaur}</b></td></tr>` +
      `<tr><td>Are you part of SA’s shared banking community?: </td><td><b>${dto.partOfSABanking}</b></td></tr>` +
      `<tr><td>How can your bank add more value in your life?: </td><td><b>${dto.bankAddMoreValue}</b></td></tr></table>`
    );
  }

  // ---------------------------------------------------------------------
  // Call Me Back API call
  // ---------------------------------------------------------------------

  /** Ported from call_me_request(Form form, int prodId, string call_me_subject, string call_me_contact_type). */
  async callMeRequest(
    dto: CallMeBackRequestDto,
  ): Promise<JsonEnvelope<string | { field: string; error_message: string }>> {
    const { form, prodId, callMeSubject, callMeContactType } = dto;
    const leadSource =
      callMeSubject && callMeSubject !== '' ? callMeSubject : 'VB_DF_CALLBACK';

    let urlApi = '';
    let productCode = '';
    let channelIndicator = 'WEB';

    if (prodId === 1) {
      urlApi = this.config.get<string>('INVESTMENT_API_URL') ?? '';
      productCode = 'INV';
    } else if (prodId === 2) {
      urlApi = this.config.get<string>('CREDIT_API_URL') ?? '';
      productCode = 'CRE';
    } else if (prodId === 3) {
      urlApi = this.config.get<string>('INVESTMENT_API_URL') ?? '';
      channelIndicator = 'CRE';
    } else if (prodId === 4) {
      urlApi = this.config.get<string>('INVESTMENT_API_URL') ?? '';
      productCode = 'INV';
    } else if (prodId === 5) {
      urlApi = this.config.get<string>('INVESTMENT_API_URL') ?? '';
      productCode = callMeContactType ?? '';
    }
    void channelIndicator; // kept for parity with the legacy field; never read after being set

    if (!this.validation.validateString(form.FirstNameInput, 30)) {
      return {
        data: {
          field: 'FirstNameInput',
          error_message: 'The value you provided is not valid',
        },
        error: true,
      };
    }
    if (!this.validation.validateString(form.LastNameInput, 30)) {
      return {
        data: {
          field: 'LastNameInput',
          error_message: 'The value you provided is not valid',
        },
        error: true,
      };
    }
    if (!this.validation.validateId(form.SAIDInput, 13)) {
      return {
        data: {
          field: 'SAIDInput',
          error_message: 'The value you provided is not valid',
        },
        error: true,
      };
    }
    if (!this.validation.validateInteger(form.CellPhoneInput, 12)) {
      return {
        data: {
          field: 'CellPhoneInput',
          error_message: 'The value you provided is not valid',
        },
        error: true,
      };
    }
    if (!this.validation.validateEmail(form.EmailInput)) {
      return {
        data: {
          field: 'EmailInput',
          error_message: 'The value you provided is not valid',
        },
        error: true,
      };
    }

    const lead: LeadContent = {
      personalDetails: {
        firstName: form.FirstNameInput,
        idNumber: form.SAIDInput,
        surname: form.LastNameInput,
      },
      contactDetails: {
        phoneNumberDetails: [
          {
            type: 'MOB',
            areaCode: form.CellPhoneInput.substring(0, 3),
            telephoneNumber: form.CellPhoneInput.substring(3, 10),
          },
        ],
      },
      productDetails: [{ productCode }],
    };
    const leadJson = JSON.stringify(lead);

    try {
      const response = await firstValueFrom(
        this.http.post(urlApi, leadJson, {
          headers: {
            Authorization: this.auth.getBasicAuthHeader(urlApi),
            'X-Channel': 'open-api',
            'X-System': leadSource,
            'X-Service-Operation': 'test',
            'X-Session-ID': '12341',
            'X-User': 'xCMS',
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }),
      );

      const message = this.describeHttpStatus(response.status);
      await this.hasAuditedRecord(
        'CallMeBack',
        '',
        '',
        '',
        '',
        leadJson,
        message,
        'callMeBackFunction',
      );
      await this.logCallBackRequestForTracking(form);

      return { data: message, error: false };
    } catch (err) {
      const axiosErr = err as AxiosError;
      return { data: String(axiosErr.message), error: true };
    }
  }

  /** Ported from returnHttpReponse(HttpWebResponse response). */
  private describeHttpStatus(status: number): string {
    const generic =
      'Unfortunately, we are experiencing technical issues. Please try again in a few minutes.';
    switch (status) {
      case 204:
      case 200:
        return (
          'Your Call Me Back request has been submitted. Please expect a call from one of our friendly agents within 5 minutes.;' +
          status +
          ';9000'
        );
      case 400:
        return "Unfortunately, you do not qualify for a credit product right now. Let African Bank help you to improve your credit score and your financial fitness. Click <a href='https://ib.africanbank.co.za/'><b>here</b></a> to apply now for a MyWORLD bank account with zero monthly bank fees;400;9000";
      default:
        return `${generic};${status};9000`;
    }
  }

  /** Ported from logCallBackRequestForTracking(Form form). */
  private async logCallBackRequestForTracking(
    form: CallMeBackFormDto,
  ): Promise<void> {
    try {
      await this.callMeBackRepo.insert({
        IDNumber: form.SAIDInput,
        CellNumber: form.CellPhoneInput,
        Name: form.FirstNameInput,
        Surname: form.LastNameInput,
        Email: form.EmailInput,
        utm_campaign: form.utm_campaign,
        utm_medium: form.utm_medium,
        utm_source: form.utm_source,
        date_time: new Date(new Date().toDateString()),
      });
    } catch (err) {
      this.logger.error('logCallBackRequestForTracking failed', err as Error);
    }
  }

  // ---------------------------------------------------------------------
  // Track my loan / WIML API calls
  // ---------------------------------------------------------------------

  /** Ported from ClientSearch(string idNumber). */
  async clientSearch(idNumber: string): Promise<JsonEnvelope<string>> {
    const url = this.config.get<string>('APPLICATION_TRACKER_API_URL') ?? '';
    const params: ConfigurableParam[] = [
      { fieldName: 'idNumber', operator: '=', value: idNumber },
    ];

    const responseBody = await this.postToPartnerApi(
      url,
      JSON.stringify(params),
    );
    const clientModel = JSON.parse(responseBody) as ClientModel;
    const clientNumber = String(
      clientModel.data?.[0]?.personalDetails?.clientNumber ?? '',
    );

    await this.getApplications(clientNumber);

    return {
      data: JSON.stringify({ resultCode: 200, resultDescription: 'Ok' }),
      error: false,
    };
  }

  /** Ported from GetApplications(string clientNumber). */
  async getApplications(clientNumber: string): Promise<JsonEnvelope<string>> {
    const url =
      this.config.get<string>('GET_APPLICATION_TRACKER_API_URL') ?? '';
    const params: ConfigurableParam[] = [
      { fieldName: 'clientNumber', operator: '=', value: clientNumber },
    ];

    const responseBody = await this.postToPartnerApi(
      url,
      JSON.stringify(params),
    );
    let result = responseBody;

    let currentApplications: Applications | null = null;
    try {
      currentApplications = JSON.parse(responseBody) as Applications;
    } catch {
      currentApplications = null;
    }

    if (currentApplications && currentApplications.data?.length > 0) {
      for (const app of currentApplications.data) {
        if (app.applicationStatus === 'NEW' && app.applicationType === 'CRE') {
          await this.processNewCreditApplication(app);
        }
      }
    } else {
      result = JSON.stringify({ resultCode: 200, resultDescription: 'Ok' });
    }

    return { data: result, error: false };
  }

  private async processNewCreditApplication(
    app: ApplicationData,
  ): Promise<void> {
    let workflowTempl = '';
    const applicationId = String(app.applicationId);

    switch (app.workflowStatus) {
      case 'INI':
        workflowTempl = 'BOT_INI_SMS';
        break;
      case 'IOF': {
        workflowTempl = 'BOT_IQF_SMS';
        const offers = await this.getOfferAsync(
          String(app.clientNumber),
          applicationId,
        );
        const offerList = offers.results.offerResponse.offers;
        let cashToClient = String(
          offerList[0]?.offerDetails.cashToClient ?? '0',
        );
        for (const offer of offerList) {
          if (offer.offerDetails.cashToClient >= parseFloat(cashToClient)) {
            cashToClient = String(offer.offerDetails.cashToClient);
          }
        }
        if (cashToClient !== '0') {
          await this.sendSMSByAPI(
            workflowTempl,
            app.clientNumber,
            applicationId,
            'GNQ',
            app.applicationStatus,
            cashToClient,
            '',
          );
        }
        break;
      }
      case 'DOC': {
        workflowTempl = 'BOT_DOC_SMS';
        const requiredDocuments = await this.getRequiredDocumentsModel(
          String(app.clientNumber),
          applicationId,
        );
        if (requiredDocuments !== '') {
          await this.sendSMSByAPI(
            workflowTempl,
            app.clientNumber,
            applicationId,
            'GNQ',
            app.applicationStatus,
            '',
            requiredDocuments,
          );
        }
        break;
      }
      case 'BUR':
        workflowTempl = 'BOT_BUR_SMS';
        break;
      case 'ROF':
        workflowTempl = 'BOT_ROF_SMS';
        break;
      case 'MYD':
        workflowTempl = 'BOT_MYD_SMS';
        break;
      case 'WUP':
        workflowTempl = 'BOT_WUP_SMS';
        break;
      case 'BIO':
        workflowTempl = 'BOT_BIO_SMS';
        break;
      case 'WLT':
        workflowTempl = 'BOT_WLT_SMS';
        break;
      case 'DIS':
        workflowTempl = 'BOT_DIS_SMS';
        break;
      case 'DVQ':
        workflowTempl = 'BOT_DVQ_SMS';
        break;
      case 'INQ':
        workflowTempl = 'BOT_INQ_SMS';
        break;
      case 'ARQ':
        workflowTempl = 'BOT_ARQ_SMS';
        break;
      case 'DIS to MWA':
        workflowTempl = 'BOT_DISMW_SMS';
        break;
      default:
        break;
    }

    // Ported as-is: the legacy code sends this unconditional SMS after the
    // workflow-specific branch above, in addition to any SMS already sent
    // inside the IOF/DOC branches.
    await this.sendSMSByAPI(
      workflowTempl,
      app.clientNumber,
      applicationId,
      'GNQ',
      app.applicationStatus,
    );
  }

  /** Ported from GetOfferAsync(string clientNumber, string applicationId). */
  private async getOfferAsync(
    clientNumber: string,
    applicationId: string,
  ): Promise<OfferRoot> {
    const url = `${this.config.get<string>('GET_APPLICATION_TRACKER_GET_OFFER_API_URL')}/${applicationId}`;
    const request = {
      content: {
        serviceHeaderRequest: {
          channel: 'test',
          system: 'ebankit',
          user: 'BSP0031332',
          adUser: 'AMpokeli',
          applicationId: parseInt(applicationId, 10),
          serviceOperation: 'CLIENT',
          sessionId: randomUUID(),
          clientNumber: parseInt(clientNumber, 10),
          uniqueTransactionID: null,
        },
      },
    };
    const responseBody = await this.postToPartnerApi(
      url,
      JSON.stringify(request),
      clientNumber,
      applicationId,
    );
    return JSON.parse(responseBody) as OfferRoot;
  }

  /** Ported from GetRequiredDocumentsModel(string clientNumber, string applicationId). */
  private async getRequiredDocumentsModel(
    clientNumber: string,
    applicationId: string,
  ): Promise<string> {
    const url = `${this.config.get<string>('GET_APPLICATION_TRACKER_GET_DOCUMENTS_API_URL')}/${clientNumber}/${applicationId}`;
    const responseBody = await this.getFromPartnerApi(url);
    const documents = JSON.parse(responseBody) as RequiredDocumentsModel;
    return documents.results.requiredDocumentDetails
      .filter((doc) => !doc.uploaded)
      .map((doc) => doc.subdocumentType)
      .join(',');
  }

  /** Ported from SendSMSByAPI(...). */
  private async sendSMSByAPI(
    workflowNr: string,
    clientNumber: number,
    refNum: string,
    applicationType: string,
    applicationStatus: string,
    maxOffer = '',
    requiredDocuments = '',
  ): Promise<string> {
    const url = this.config.get<string>('SEND_SMS_API_URL') ?? '';
    let smsKeys: SmsKeyValue[];

    if (maxOffer !== '') {
      smsKeys = [
        { key: 'RefNum', value: refNum },
        { key: 'applicationType', value: applicationType },
        { key: 'MaxCreditOfferAmount', value: `R${maxOffer}` },
      ];
    } else if (requiredDocuments !== '') {
      smsKeys = [
        { key: 'RefNum', value: refNum },
        { key: 'applicationType', value: applicationType },
        { key: 'DocumentList', value: requiredDocuments },
      ];
    } else {
      smsKeys = [
        { key: 'RefNum', value: refNum },
        { key: 'applicationType', value: applicationType },
      ];
    }

    const sms: Sms = {
      templateNo: workflowNr,
      clientNumber,
      keyValues: smsKeys,
    };
    const json = JSON.stringify(sms);
    const responseBody = await this.postToPartnerApi(
      url,
      json,
      String(clientNumber),
    );

    await this.hasAuditedRecord(
      String(clientNumber),
      refNum,
      applicationType,
      applicationStatus,
      url,
      json,
      responseBody,
      'CMS',
    );
    return responseBody;
  }

  /** Ported from hasAuditedRecord(...). */
  private async hasAuditedRecord(
    clientNumber: string,
    applicationId: string,
    applicationType: string,
    applicationStatus: string,
    url: string,
    request: string,
    response: string,
    createdBy: string,
  ): Promise<boolean> {
    try {
      await this.trackMyLoanAuditRepo.insert({
        ClientNumber: clientNumber,
        ApplicationId: applicationId,
        ApplicationType: applicationType,
        ApplicationStatus: applicationStatus,
        URLapi: url,
        CreatedBy: createdBy,
        DateTime: new Date(),
        Request: request,
        Response: response,
      });
      return true;
    } catch (err) {
      this.logger.error(
        `hasAuditedRecord failed; Request: ${request}; Response: ${response}; URL: ${url}`,
        err as Error,
      );
      return false;
    }
  }

  // ---------------------------------------------------------------------
  // HTTP helpers (ported from WebRequestGet / WebRequestPost)
  // ---------------------------------------------------------------------

  private async getFromPartnerApi(url: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.get(url, {
        headers: { Authorization: this.auth.getBasicAuthHeader(url) },
      }),
    );
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
  }

  private async postToPartnerApi(
    url: string,
    json: string,
    clientNumber?: string,
    applicationId = '',
  ): Promise<string> {
    const headers: Record<string, string> = {
      Authorization: this.auth.getBasicAuthHeader(url),
      'Content-Type': 'application/json',
    };
    if (applicationId === '') {
      headers['X-Channel'] = 'test';
      headers['X-System'] = 'ebankit';
      if (clientNumber) {
        headers['X-Client-Number'] = clientNumber;
      }
      headers['X-User'] = 'test';
      headers['X-Application-ID'] = applicationId || '123321';
      headers['X-Session-ID'] = 'test';
      headers['X-Service-Operation'] = 'test';
    }

    const response = await firstValueFrom(
      this.http.post(url, json, { headers }),
    );
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
  }
}
