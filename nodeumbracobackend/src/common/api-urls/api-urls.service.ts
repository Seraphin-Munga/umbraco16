import { Injectable, NotFoundException } from '@nestjs/common';
import quickLoansApiUrls from './quick-loans-api-urls.json';
import callMeBackUrls from './call-me-back-urls.json';

interface ApiUrlEntry {
  Name: string;
  UrlList: { Url: string }[];
}

// Ported from GetURLs()/GetJsonData() in QuickLoansController.cs and
// CustomController.cs, which both read a JSON file of named URL lists.
// The original match is a *substring* Contains() check, not equality, and it
// always takes the first matching entry - both behaviours are preserved here.
@Injectable()
export class ApiUrlsService {
  private findFirstMatch(
    entries: ApiUrlEntry[],
    methodName: string,
  ): ApiUrlEntry {
    const match = entries.find((entry) => entry.Name.includes(methodName));
    if (!match) {
      throw new NotFoundException(
        `No API URL configuration found for "${methodName}"`,
      );
    }
    return match;
  }

  /** Mirrors QuickLoansController.GetURLs(methodname). */
  getQuickLoansUrls(methodName: string): string[] {
    return this.findFirstMatch(
      quickLoansApiUrls as ApiUrlEntry[],
      methodName,
    ).UrlList.map((u) => u.Url);
  }

  getQuickLoansUrl(methodName: string): string {
    return this.getQuickLoansUrls(methodName)[0];
  }

  /** Mirrors QuickLoansController.isAuthenticatedUrl(url). */
  isAuthenticatedUrl(url: string): boolean {
    return this.getQuickLoansUrls('isAuthenticatedUrl').includes(url);
  }

  /** Mirrors CustomController.GetJsonData(methodname). */
  getCallMeBackUrls(methodName: string): string[] {
    return this.findFirstMatch(
      callMeBackUrls as ApiUrlEntry[],
      methodName,
    ).UrlList.map((u) => u.Url);
  }
}
