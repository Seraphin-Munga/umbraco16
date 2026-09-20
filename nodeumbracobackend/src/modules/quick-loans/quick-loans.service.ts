import { HttpService } from '@nestjs/axios';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import { EbankitAuthService } from '../../common/auth/ebankit-auth.service';
import { ApiUrlsService } from '../../common/api-urls/api-urls.service';
import { QqStepLogEntity } from '../../database/entities/qq-step-log.entity';
import { AuditLogEntity } from '../../database/entities/audit-log.entity';

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
import { QuickLoansRequest } from './dto/quick-loans-request.types';

interface JsonEnvelope<T> {
  data: T;
  error: boolean;
}

// Ported from Web/Controllers/QuickLoansController.cs.
// Not ported: GetLoanData/AffiliateRedirect (relied on ASP.NET Session, which
// has no equivalent in this stateless API) and Index(ContentModel) (Umbraco
// content rendering).
@Injectable()
export class QuickLoansService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly auth: EbankitAuthService,
    private readonly apiUrls: ApiUrlsService,
    @InjectRepository(QqStepLogEntity)
    private readonly qqStepLogRepo: Repository<QqStepLogEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
  ) {}

  // ---------------------------------------------------------------------
  // cmsQQStepLog drop-off logging
  // ---------------------------------------------------------------------

  /** Ported from GetQQEntry(string phoneNumber). */
  private async getQqEntry(
    phoneNumber: string,
  ): Promise<QqStepLogEntity | null> {
    return this.qqStepLogRepo.findOne({
      where: { PhoneNumber: phoneNumber },
      order: { Id: 'DESC' },
    });
  }

  /**
   * Merges `patch` into the most recent step-log row for this phone number
   * (creating one if none exists) and saves it.
   *
   * NOTE: the legacy NPoco Update() call in each LogXxxDetails() method wrote
   * every mapped column from a freshly-constructed object, which - since only
   * a handful of fields were ever set on it - silently nulled out the other
   * historical columns (Offers, FinancialDetails, etc.) on every call. That
   * looked like an unintentional bug rather than desired behaviour, so this
   * port merges into the existing row instead of reproducing the data loss.
   */
  private async upsertStepLog(
    phoneNumber: string,
    patch: Partial<QqStepLogEntity>,
  ): Promise<QqStepLogEntity> {
    const existing = await this.getQqEntry(phoneNumber);
    const merged: Partial<QqStepLogEntity> = {
      ...existing,
      ...patch,
      PhoneNumber: phoneNumber,
      CreatedDate: new Date(),
    };
    return this.qqStepLogRepo.save(merged);
  }

  async logPersonalDetails(dto: QqStepLogDto): Promise<JsonEnvelope<number>> {
    await this.upsertStepLog(dto.PhoneNumber, {
      PersonalDetailsRequestString: dto.PersonalDetailsRequestString,
      utm_source: dto.utm_source,
      utm_campaign: dto.utm_campaign,
      utm_medium: dto.utm_medium,
    });
    return { data: 1, error: false };
  }

  async logOffersDetails(
    dto: QqStepLogDto,
  ): Promise<JsonEnvelope<QqStepLogEntity>> {
    const saved = await this.upsertStepLog(dto.PhoneNumber, {
      Offers: dto.Offers,
      URL: dto.URL,
    });
    return { data: saved, error: false };
  }

  async logEmployeeDetails(
    dto: QqStepLogDto,
  ): Promise<JsonEnvelope<QqStepLogEntity>> {
    const saved = await this.upsertStepLog(dto.PhoneNumber, {
      EmployeeDetails: dto.EmployeeDetails,
      URL: dto.URL,
    });
    return { data: saved, error: false };
  }

  async logMarketingConsentDetails(
    dto: QqStepLogDto,
  ): Promise<JsonEnvelope<QqStepLogEntity>> {
    const saved = await this.upsertStepLog(dto.PhoneNumber, {
      MarketingConsent: dto.MarketingConsent,
      URL: dto.URL,
    });
    return { data: saved, error: false };
  }

  async logFinancialDetails(
    dto: QqStepLogDto,
  ): Promise<JsonEnvelope<QqStepLogEntity>> {
    const saved = await this.upsertStepLog(dto.PhoneNumber, {
      FinancialDetails: dto.FinancialDetails,
      URL: dto.URL,
    });
    return { data: saved, error: false };
  }

  async beginIA(dto: QqStepLogDto): Promise<JsonEnvelope<QqStepLogEntity>> {
    await this.requireExistingEntry(dto.PhoneNumber);
    const saved = await this.upsertStepLog(dto.PhoneNumber, {
      beginIAClicked: 'Yes',
    });
    return { data: saved, error: false };
  }

  async logOtpOfferDetail(
    dto: QqStepLogDto,
  ): Promise<JsonEnvelope<QqStepLogEntity>> {
    await this.requireExistingEntry(dto.PhoneNumber);
    const saved = await this.upsertStepLog(dto.PhoneNumber, {
      OTPValue: dto.OTPValue,
      Offers: dto.Offers,
      URL: dto.URL,
    });
    return { data: saved, error: false };
  }

  async logSelectedOffer(
    dto: QqStepLogDto,
  ): Promise<JsonEnvelope<QqStepLogEntity>> {
    await this.requireExistingEntry(dto.PhoneNumber);
    const saved = await this.upsertStepLog(dto.PhoneNumber, {
      SelectedOffer: dto.SelectedOffer,
      URL: dto.URL,
    });
    return { data: saved, error: false };
  }

  private async requireExistingEntry(
    phoneNumber: string,
  ): Promise<QqStepLogEntity> {
    const existing = await this.getQqEntry(phoneNumber);
    if (!existing) {
      throw new NotFoundException(
        `No cmsQQStepLog entry found for phone number ${phoneNumber}`,
      );
    }
    return existing;
  }

  /** Ported from GetQQByPhone(string phoneNumber). */
  async getQqByPhone(
    phoneNumber: string,
  ): Promise<JsonEnvelope<QqStepLogEntity | null>> {
    if (!phoneNumber?.trim()) {
      return { data: null, error: false };
    }
    return { data: await this.getQqEntry(phoneNumber), error: false };
  }

  // ---------------------------------------------------------------------
  // Application flow
  // ---------------------------------------------------------------------

  /** Ported from ValidateClient(Validate form). */
  async validateClient(form: ValidateClientDto): Promise<JsonEnvelope<string>> {
    const url = this.apiUrls.getQuickLoansUrl('ValidateClient');
    const phone = form.contactDetails.phoneNumberDetails[0];
    const email = form.contactDetails.emailDetails[0];

    const request: QuickLoansRequest = {
      content: {
        serviceHeaderRequest: {
          channel: 'Web',
          system: 'CMS',
          user: form.mobileNumber,
          serviceOperation: 'QQ',
          sessionId: randomUUID(),
          clientNumber: form.idNumber,
        },
        contactDetails: {
          phoneNumberDetails: [
            {
              areaCode: phone.areaCode,
              telephoneNumber: phone.telephoneNumber,
              type: phone.type,
              confirmAreaCode: phone.areaCode,
              confirmTelephoneNumber: phone.telephoneNumber,
              countryCode: '27',
            },
          ],
          emailDetails: [
            {
              emailAddress: email.emailAddress,
              confirmEmailAddress: email.emailAddress,
              type: 'HOM',
            },
          ],
        },
        personalDetails: {
          idNumber: form.personalDetails.idNumber,
          clientType: form.personalDetails.clientType,
          idType: '01',
          passportNumber: '',
          title: form.personalDetails.title,
          surname: form.personalDetails.surname,
          firstName: form.personalDetails.firstName,
          knownName: '',
        },
        employments: {
          applicationEmployment: {
            reference: form.employments.reference ?? '',
            wageType: form.employments.wageType ?? '',
            salaryDepositDay: form.employments.salaryDepositDay ?? '',
            employmentStartDate: form.employments.employmentStartDate ?? '',
            occupationType: form.employments.occupationType ?? '',
            employmentType: form.employments.employmentType ?? '',
            occupationStatus: form.employments.occupationStatus ?? '',
            contractEndDate: form.employments.contractEndDate ?? '',
            employerName: form.employments.employerName ?? '',
            calenderId: form.employments.calenderId ?? '',
            employeeNumber: form.employments.employeeNumber ?? '',
            switchBoardNumber: form.employments.switchBoardNumber ?? '',
            switchBoardAreacode: form.employments.switchBoardAreacode ?? '',
          },
        },
        finances: form.finances,
        banks: {
          applicationBankingDetails: [form.bank.applicationBankingDetails[0]],
        },
      },
    };

    const requestJson = JSON.stringify(request);
    let responseBody = '';
    try {
      responseBody = await this.postToPartnerApi(url, requestJson);

      await this.auditLogRepo.insert({
        IDNumber: form.idNumber,
        Action: 'ValidateClient',
        Cellphone: form.mobileNumber,
        DateTime: new Date(),
        Request: requestJson,
        Response: responseBody,
        Url: url,
      });

      await this.logFinancialDetails({
        PhoneNumber: form.mobileNumber,
        FinancialDetails: requestJson,
        URL: url,
      });

      return { data: responseBody, error: false };
    } catch (err) {
      const message = (err as Error).message;
      await this.auditLogRepo.insert({
        IDNumber: form.idNumber,
        Action: 'ValidateClient',
        Cellphone: form.mobileNumber,
        DateTime: new Date(),
        Request: requestJson,
        Response: message,
        Url: url,
      });
      return { data: message, error: true };
    }
  }

  /** Ported from CreateApplication(ApplicationDetails form). */
  async createApplication(
    form: ApplicationDetailsDto,
  ): Promise<JsonEnvelope<string>> {
    const url = this.apiUrls.getQuickLoansUrl('CreateApplication');
    const request: QuickLoansRequest = {
      content: { serviceHeaderRequest: {}, applicationdetails: form },
    };
    const result = await this.postToPartnerApi(url, JSON.stringify(request));
    return { data: result, error: false };
  }

  /** Ported from CancelApplication(CancelApplicationDetails form). */
  async cancelApplication(
    form: CancelApplicationDetailsDto,
  ): Promise<JsonEnvelope<string>> {
    const url = this.apiUrls.getQuickLoansUrl('CancelApplication');
    const request: QuickLoansRequest = {
      content: {
        clientNumber: parseInt(form.clientNumber, 10),
        applicationID: parseInt(form.applicationId, 10),
        status: 'REJ',
        serviceHeaderRequest: {
          uniqueTransactionID: '',
          system: 'EBANKIT',
          serviceOperation: 'CREDIT',
          channel: 'BFO',
          applicationId: form.applicationId,
          user: 'BWayne',
        },
      },
    };
    const result = await this.postToPartnerApi(url, JSON.stringify(request));
    return { data: result, error: false };
  }

  /** Ported from OtpClientNumber(OtpClientNumber form). */
  async otpClientNumber(
    form: OtpClientNumberDto,
  ): Promise<JsonEnvelope<string>> {
    const baseUrl = this.apiUrls.getQuickLoansUrl('OtpClientNumber');
    const url = `${baseUrl}/${form.clientNumber}`;
    const request: QuickLoansRequest = {
      content: {
        serviceHeaderRequest: {
          sessionId: randomUUID(),
          applicationId: form.applicationId,
          channel: 'Web',
        },
        activityName: form.activityName,
      },
    };
    const result = await this.postToPartnerApi(url, JSON.stringify(request));
    return { data: result, error: false };
  }

  /** Ported from OtpCallBack(OtpClientCallBack form). */
  async otpCallBack(form: OtpClientCallBackDto): Promise<JsonEnvelope<string>> {
    const baseUrl = this.apiUrls.getQuickLoansUrl('OtpCallBack');
    const url = `${baseUrl}/${form.clientNumber}`;
    const request: QuickLoansRequest = {
      content: {
        authenticationInput: { uniqueID: form.uniqueId },
        serviceHeaderRequest: {
          channel: 'Web',
          system: 'CMS',
          applicationId: '0',
          serviceOperation: 'QQ',
          uniqueTransactionID: null,
          sessionId: randomUUID(),
        },
        otpEntered: form.otpEntered,
        activityName: form.activityName,
      },
    };
    const result = await this.postToPartnerApi(url, JSON.stringify(request));
    return { data: result, error: false };
  }

  /** Ported from SaveApplicationEmployment(SaveApplicationEmployment form). */
  async saveApplicationEmployment(
    form: SaveApplicationEmploymentDto,
  ): Promise<JsonEnvelope<string>> {
    const baseUrl = this.apiUrls.getQuickLoansUrl('SaveApplicationEmployment');
    const url = `${baseUrl}/${form.applicationId}`;
    const request: QuickLoansRequest = {
      content: {
        serviceHeaderRequest: {
          serviceOperation: 'CREDIT',
          sessionId: randomUUID(),
          applicationId: form.applicationId,
        },
        employment: { applicationEmployment: form.employment },
      },
    };
    const result = await this.postToPartnerApi(url, JSON.stringify(request));
    return { data: result, error: false };
  }

  /** Ported from SaveApplicationBanking(SaveApplicationBanking form). */
  async saveApplicationBanking(
    form: SaveApplicationBankingDto,
  ): Promise<JsonEnvelope<string>> {
    const baseUrl = this.apiUrls.getQuickLoansUrl('SaveApplicationBanking');
    const url = `${baseUrl}/${form.applicationId}`;
    const request: QuickLoansRequest = {
      content: {
        serviceHeaderRequest: {
          sessionId: randomUUID(),
          applicationId: form.applicationId,
        },
        bank: form.bank,
        clientNumber: parseInt(form.clientNumber, 10),
      },
    };
    const result = await this.postToPartnerApi(url, JSON.stringify(request));
    return { data: result, error: false };
  }

  /** Ported from SaveApplicationFinance(SaveApplicationFinance form). */
  async saveApplicationFinance(
    form: SaveApplicationFinanceDto,
  ): Promise<JsonEnvelope<string>> {
    const baseUrl = this.apiUrls.getQuickLoansUrl('SaveApplicationFinance');
    const url = `${baseUrl}/${form.applicationId}`;
    const request: QuickLoansRequest = {
      content: {
        serviceHeaderRequest: {
          sessionId: randomUUID(),
          applicationId: form.applicationId,
        },
        income: form.income,
        expense: form.expense,
      },
    };
    const result = await this.postToPartnerApi(url, JSON.stringify(request));
    return { data: result, error: false };
  }

  /** Ported from SaveOffer(PatchToIOF form). */
  async saveOffer(form: PatchToIofDto): Promise<JsonEnvelope<string | null>> {
    const url = this.apiUrls.getQuickLoansUrl('SaveOffer');
    const request: QuickLoansRequest = {
      content: {
        serviceHeaderRequest: {
          system: 'EBANKIT',
          uniqueTransactionID: form.uniqueTransactionId,
          serviceOperation: 'CLIENT',
          channel: 'Web',
          clientNumber: String(form.clientNumber),
          sessionId: randomUUID(),
          applicationId: String(form.applicationId),
          user: 'CALLSM95',
        },
        offer: {
          offerId: form.offerId,
          clientNumber: form.clientNumber,
          applicationId: form.applicationId,
          uniqueId: form.uniqueId,
        },
      },
    };
    const requestJson = JSON.stringify(request);

    try {
      const result = await this.postToPartnerApi(url, requestJson);

      await this.auditLogRepo.insert({
        IDNumber: form.IDNumber,
        Action: 'SaveOffer',
        Cellphone: form.mobileNumber,
        DateTime: new Date(),
        Request: requestJson,
        Response: result,
        Url: url,
      });

      await this.logSelectedOffer({
        PhoneNumber: form.mobileNumber,
        SelectedOffer: requestJson,
        URL: url,
      });

      return { data: result, error: false };
    } catch (err) {
      await this.auditLogRepo.insert({
        IDNumber: form.IDNumber,
        Action: 'SaveOffer',
        Cellphone: form.mobileNumber,
        DateTime: new Date(),
        Request: requestJson,
        Response: (err as Error).message,
        Url: url,
      });
      return { data: null, error: true };
    }
  }

  /** Ported from GetQuestionnaireForID(string number). */
  async getQuestionnaireForID(number: string): Promise<JsonEnvelope<string>> {
    const url = this.apiUrls.getQuickLoansUrl('QuestionnaireForID');
    const request = { id: number, idType: '01', language: 'en', country: 'GB' };
    const result = await this.postWithHeaders(
      url,
      JSON.stringify(request),
      number,
    );

    const stepLog = await this.qqStepLogRepo
      .createQueryBuilder('log')
      .where(
        '(log.PersonalDetailsRequestString LIKE :num AND log.beginIAClicked = :yes) OR log.iaFlag = :one',
        { num: `%${number}%`, yes: 'Yes', one: '1' },
      )
      .orderBy('log.Id', 'DESC')
      .getOne();

    if (!stepLog) {
      throw new NotFoundException(
        `No cmsQQStepLog entry found matching ${number}`,
      );
    }

    const iaResponse = JSON.parse(result) as {
      data: { questionnaireUrl: string };
    };
    stepLog.iaGeneratedURL = iaResponse.data.questionnaireUrl;
    stepLog.CreatedDate = new Date();
    await this.qqStepLogRepo.save(stepLog);

    return { data: result, error: false };
  }

  /** Ported from GetOffers(OtpClientCallBack form). */
  async getOffers(form: OtpClientCallBackDto): Promise<JsonEnvelope<string>> {
    const url = this.apiUrls.getQuickLoansUrl('GetOffer');
    const request: QuickLoansRequest = {
      content: {
        authenticationInput: { uniqueID: form.uniqueId },
        serviceHeaderRequest: {
          channel: 'CMS',
          system: 'EBANKIT',
          user: 'TALT13',
          applicationId: '0',
          serviceOperation: 'CLIENT',
          uniqueTransactionID: form.uniqueId,
          sessionId: randomUUID(),
        },
        otpEntered: form.otpEntered,
        activityName: 'ContactabilityQQ',
      },
    };
    const requestJson = JSON.stringify(request);

    try {
      const result = await this.postToPartnerApi(url, requestJson);

      await this.auditLogRepo.insert({
        IDNumber: form.IDNumber,
        Action: 'GetOffers',
        Cellphone: form.mobileNumber,
        DateTime: new Date(),
        Request: requestJson,
        Response: result,
        Url: url,
      });

      await this.logOffersDetails({
        PhoneNumber: form.mobileNumber,
        Offers: result,
      });

      return { data: result, error: false };
    } catch (err) {
      const message = (err as Error).message;
      await this.auditLogRepo.insert({
        IDNumber: form.IDNumber,
        Action: 'GetOffers',
        Cellphone: form.mobileNumber,
        DateTime: new Date(),
        Request: requestJson,
        Response: message,
        Url: url,
      });
      return { data: message, error: false };
    }
  }

  /** Ported from SaveClientDetails(Web.Controllers.PersonalDetails form) - the legacy body ignores `form` entirely. */
  async saveClientDetails(
    form: SaveClientDetailsDto,
  ): Promise<JsonEnvelope<string>> {
    void form;
    const url = this.apiUrls.getQuickLoansUrl('SaveClientDetails');
    const request: QuickLoansRequest = {
      content: { serviceHeaderRequest: {} },
    };
    const result = await this.postToPartnerApi(url, JSON.stringify(request));
    return { data: result, error: false };
  }

  /** Ported from SaveClientContactDetails(SaveClientContactDetails form). */
  async saveClientContactDetails(
    form: SaveClientContactDetailsDto,
  ): Promise<JsonEnvelope<string>> {
    const baseUrl = this.apiUrls.getQuickLoansUrl('SaveClientContactDetails');
    const url = `${baseUrl}/${form.clientNumber}`;
    const request: QuickLoansRequest = {
      content: { serviceHeaderRequest: {} },
    };
    const result = await this.postToPartnerApi(url, JSON.stringify(request));
    return { data: result, error: false };
  }

  /** Ported from SearchEmployer(string employerName, string employeeType). */
  async searchEmployer(
    employerName: string,
    employeeType: string,
  ): Promise<string> {
    const baseUrl = this.apiUrls.getQuickLoansUrl('SearchEmployer');
    return this.getFromPartnerApi(`${baseUrl}/${employerName}/${employeeType}`);
  }

  /** Ported from GetEmploymentTypes(). */
  async getEmploymentTypes(): Promise<string> {
    return this.getFromPartnerApi(
      this.apiUrls.getQuickLoansUrl('GetEmploymentTypes'),
    );
  }

  /** Ported from GetOccupationTypes(string occType). */
  async getOccupationTypes(occType: string): Promise<string> {
    if (!occType) {
      return '';
    }
    const baseUrl = this.apiUrls.getQuickLoansUrl('GetOccupationTypes');
    return this.getFromPartnerApi(`${baseUrl}${occType.toLowerCase()}`);
  }

  /** Ported from SearchBank(string _bankName) - the bank name parameter is unused in the legacy code too. */
  async searchBank(bankName: string): Promise<string> {
    void bankName;
    return this.getFromPartnerApi(this.apiUrls.getQuickLoansUrl('SearchBank'));
  }

  // ---------------------------------------------------------------------
  // HTTP helpers (ported from WebRequestGet / WebRequestPost / WebRequestWithHeadersPost)
  // ---------------------------------------------------------------------

  private async getFromPartnerApi(url: string): Promise<string> {
    const headers: Record<string, string> = {};
    if (this.apiUrls.isAuthenticatedUrl(url)) {
      headers.Authorization = `Basic ${Buffer.from('ebankit:manage').toString('base64')}`;
    }
    const response = await firstValueFrom(this.http.get(url, { headers }));
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
  }

  private async postToPartnerApi(url: string, json: string): Promise<string> {
    const response = await firstValueFrom(
      this.http.post(url, json, {
        headers: {
          Authorization: this.auth.getBasicAuthHeader(url),
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }),
    );
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
  }

  private async postWithHeaders(
    url: string,
    json: string,
    clientNumber: string,
  ): Promise<string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.apiUrls.isAuthenticatedUrl(url)) {
      headers.Authorization = this.auth.getBasicAuthHeader(url);
      headers['X-Channel'] = 'WEB';
      headers['X-Service-Operation'] = ' getURL';
      headers['X-System'] = 'WEB';
      headers['X-User'] = '  User1';
      headers['X-Client-Number'] = clientNumber;
      headers['X-Session-ID'] = '12341';
    }
    const response = await firstValueFrom(
      this.http.post(url, json, { headers }),
    );
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
  }
}
