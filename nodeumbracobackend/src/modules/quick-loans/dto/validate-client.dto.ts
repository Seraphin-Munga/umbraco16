import {
  ApplicationBankingDetails,
  ApplicationEmployment,
  QContactDetails,
  QPersonalDetails,
} from './quick-loans-request.types';

// Ported from Web/Controllers/QuickLoansController.cs -> ValidateClient(Validate form)
// Source (Models/QuickLoanModels/Validate.cs) was missing; reconstructed from
// every `form.*` access in that method.
export class ValidateClientDto {
  mobileNumber: string;
  idNumber: string;
  contactDetails: QContactDetails;
  personalDetails: QPersonalDetails;
  employments: ApplicationEmployment;
  /** Shape unknown - forwarded to the upstream API as-is (`new FinaceDetails(form.finances)` in the legacy code). */
  finances: unknown;
  bank: { applicationBankingDetails: ApplicationBankingDetails[] };
}
