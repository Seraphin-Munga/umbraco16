// Ported from Web/Controllers/QuickLoansController.cs step-logging endpoints.
// Mirrors QqStepLogEntity's writable fields (cmsQQStepLog - source missing,
// reconstructed from usage).
export class QqStepLogDto {
  PhoneNumber: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  PersonalDetailsRequestString?: string;
  FinancialDetails?: string;
  MarketingConsent?: string;
  EmployeeDetails?: string;
  SelectedOffer?: string;
  OTPValue?: string;
  Offers?: string;
  URL?: string;
  iaFlag?: string;
  beginIAClicked?: string;
  iaGeneratedURL?: string;
}
