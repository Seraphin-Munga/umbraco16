import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import { InsuranceQuoteDto } from './dto/insurance-quote.dto';
import { ApiResponseInvest } from './dto/api-response-invest.types';

interface JsonEnvelope<T> {
  data: T;
  error: boolean;
  message?: string;
}

// Ported 1:1 from Web/Controllers/InvestmentCalculatorController.cs (source was present).
@Injectable()
export class InvestmentCalculatorService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private getBasicAuthHeader(): string {
    const username =
      this.config.get<string>('INVESTMENT_CALCULATOR_AUTH_USERNAME') ??
      'ebankit';
    const password =
      this.config.get<string>('INVESTMENT_CALCULATOR_AUTH_PASSWORD') ?? '';
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  async getQuote(
    form: InsuranceQuoteDto,
  ): Promise<JsonEnvelope<ApiResponseInvest | null>> {
    const url =
      this.config.get<string>('INVESTMENT_CALCULATOR_QUOTES_URL') ?? '';

    try {
      const response = await firstValueFrom(
        this.http.post<ApiResponseInvest>(url, form, {
          headers: {
            Authorization: this.getBasicAuthHeader(),
            'X-User': 'Test',
            'X-System': 'ebankit',
            'X-Channel': 'web',
            'X-Service-Operation': 'payments',
            'X-Session-Id': 'reiorepropeprier',
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }),
      );

      if (response.status >= 200 && response.status < 300) {
        return { data: response.data, error: false };
      }
      return {
        data: null,
        error: true,
        message: `Request failed with status: ${response.status}`,
      };
    } catch (err) {
      const axiosErr = err as AxiosError;
      return {
        data: null,
        error: true,
        message: axiosErr.message,
      };
    }
  }
}
