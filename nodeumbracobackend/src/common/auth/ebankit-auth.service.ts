import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Ported from the identical ReturnBasicAuth() method that was duplicated in
// both Web/Controllers/CustomController.cs and Web/Controllers/QuickLoansController.cs.
// The legacy code picks a per-environment password by splitting the target URL
// on "." and looking at segment [1] (e.g. "https://api.stg.africanbank.net" -> "stg").
@Injectable()
export class EbankitAuthService {
  constructor(private readonly config: ConfigService) {}

  private passwordForSegment(segment: string): string {
    switch (segment) {
      case 'dev':
        return this.config.get<string>('EBANKIT_AUTH_PASSWORD_DEV') ?? '';
      case 'int':
        return this.config.get<string>('EBANKIT_AUTH_PASSWORD_INT') ?? '';
      case 'stg':
        return this.config.get<string>('EBANKIT_AUTH_PASSWORD_STG') ?? '';
      case 'trn':
        return this.config.get<string>('EBANKIT_AUTH_PASSWORD_TRN') ?? '';
      default:
        return this.config.get<string>('EBANKIT_AUTH_PASSWORD_DEFAULT') ?? '';
    }
  }

  /** Returns the base64 "username:password" pair for the Basic auth header. */
  getBasicAuthCredentials(url: string): string {
    const segment = url.split('.')[1] ?? '';
    const username =
      this.config.get<string>('EBANKIT_AUTH_USERNAME') ?? 'ebankit';
    const password = this.passwordForSegment(segment);
    return Buffer.from(`${username}:${password}`).toString('base64');
  }

  getBasicAuthHeader(url: string): string {
    return `Basic ${this.getBasicAuthCredentials(url)}`;
  }
}
