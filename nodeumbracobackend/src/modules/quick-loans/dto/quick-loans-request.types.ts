// Ported from Web/Controllers/QuickLoansController.cs and its Models/QuickLoanModels/*.cs
// dependencies. None of the QuickLoanModels source files existed on disk in the
// legacy checkout (folders present, files missing) - every shape below is
// reconstructed purely from how the object is built/read at each call site.
// Treat these as best-effort, NOT verified against an authoritative source.

export interface QuickLoansServiceHeaderRequest {
  channel?: string;
  system?: string;
  user?: string;
  serviceOperation?: string;
  sessionId?: string;
  clientNumber?: string;
  applicationId?: string;
  uniqueTransactionID?: string | null;
}

export type QuickLoansServiceHeaderOfferRequest =
  QuickLoansServiceHeaderRequest;

export interface QuickLoansAuthenticationInput {
  uniqueID: string;
}

export interface QPhoneNumberDetail {
  areaCode: string;
  telephoneNumber: string;
  type: string;
  confirmAreaCode?: string;
  confirmTelephoneNumber?: string;
  countryCode?: string;
}

export interface QEmailDetail {
  emailAddress: string;
  confirmEmailAddress?: string;
  type?: string;
}

export interface QContactDetails {
  phoneNumberDetails: QPhoneNumberDetail[];
  emailDetails: QEmailDetail[];
}

export interface QPersonalDetails {
  idNumber: string;
  clientType?: string;
  idType?: string;
  passportNumber?: string;
  title?: string;
  surname: string;
  firstName: string;
  knownName?: string;
}

export interface ApplicationEmployment {
  reference?: string;
  wageType?: string;
  salaryDepositDay?: string;
  employmentStartDate?: string;
  occupationType?: string;
  employmentType?: string;
  occupationStatus?: string;
  contractEndDate?: string;
  employerName?: string;
  calenderId?: string;
  employeeNumber?: string;
  switchBoardNumber?: string;
  switchBoardAreacode?: string;
}

export interface Employment {
  applicationEmployment: ApplicationEmployment;
}

export interface ApplicationBankingDetails {
  id?: string | number;
  bankCode?: string;
  branchCode?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolder?: string;
}

export interface Bank {
  applicationBankingDetails: ApplicationBankingDetails[];
}

export interface SaveOfferQuickLoan {
  offerId: string;
  clientNumber: number;
  applicationId: number;
  uniqueId: string;
}

export interface QuickLoansRequestContent {
  serviceHeaderRequest?: QuickLoansServiceHeaderRequest;
  serviceHeaderOfferRequest?: QuickLoansServiceHeaderOfferRequest;
  authenticationInput?: QuickLoansAuthenticationInput;
  contactDetails?: QContactDetails;
  personalDetails?: QPersonalDetails;
  employments?: Employment;
  finances?: unknown;
  banks?: Bank;
  bank?: Bank;
  employment?: Employment;
  offer?: SaveOfferQuickLoan;
  applicationdetails?: unknown;
  activityName?: string;
  otpEntered?: string;
  clientNumber?: number;
  applicationID?: number;
  status?: string;
  income?: unknown[];
  expense?: unknown[];
}

export interface QuickLoansRequest {
  content: QuickLoansRequestContent;
}

export interface QuestionnaireForIDRequest {
  id: string;
  idType: string;
  language: string;
  country: string;
}

export interface IAUrlRoot {
  data: {
    questionnaireUrl: string;
  };
}
