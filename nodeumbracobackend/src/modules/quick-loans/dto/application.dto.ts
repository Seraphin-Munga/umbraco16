// Ported from QuickLoansController.cs. Both source POCOs were missing from the
// legacy checkout and neither method reads specific fields off `form` beyond
// what's listed - the rest of the payload is forwarded upstream verbatim.

/** CreateApplication(ApplicationDetails form) - shape otherwise unknown, forwarded as-is. */
export class ApplicationDetailsDto {
  [key: string]: unknown;
}

/** CancelApplication(CancelApplicationDetails form) */
export class CancelApplicationDetailsDto {
  clientNumber: string;
  applicationId: string;
}

/** OtpClientNumber(OtpClientNumber form) */
export class OtpClientNumberDto {
  activityName: string;
  applicationId: string;
  clientNumber: string;
}

/** OtpCallBack(OtpClientCallBack form) / GetOffers(OtpClientCallBack form) */
export class OtpClientCallBackDto {
  uniqueId: string;
  otpEntered: string;
  activityName?: string;
  clientNumber: string;
  IDNumber?: string;
  mobileNumber: string;
}

/** SaveApplicationEmployment(SaveApplicationEmployment form) */
export class SaveApplicationEmploymentDto {
  applicationId: string;
  employment: import('./quick-loans-request.types').ApplicationEmployment;
}

/** SaveApplicationBanking(SaveApplicationBanking form) */
export class SaveApplicationBankingDto {
  applicationId: string;
  clientNumber: string;
  bank: {
    applicationBankingDetails: import('./quick-loans-request.types').ApplicationBankingDetails[];
  };
}

/** SaveApplicationFinance(SaveApplicationFinance form) */
export class SaveApplicationFinanceDto {
  applicationId: string;
  income: unknown[];
  expense: unknown[];
}

/** SaveOffer(PatchToIOF form) */
export class PatchToIofDto {
  uniqueTransactionId: string;
  clientNumber: number;
  applicationId: number;
  offerId: string;
  uniqueId: string;
  IDNumber: string;
  mobileNumber: string;
}

/** SaveClientContactDetails(SaveClientContactDetails form) - only clientNumber is ever read. */
export class SaveClientContactDetailsDto {
  clientNumber: string;
}

/**
 * SaveClientDetails(Web.Controllers.PersonalDetails form) - the legacy action
 * never actually reads any field off `form`; kept as an (effectively unused)
 * passthrough body for route parity.
 */
export class SaveClientDetailsDto {
  [key: string]: unknown;
}
