import type { PersonalLoanCampaignData } from '../api/contentApi';
import { fetchPersonalLoanCampaign } from '../api/contentApi';

// /en/home/product-personal-loan/ - see src/routes/personalMenuPages.ts.
// This is the route personalLoanCampaign.cshtml (not productPersonalLoan.cshtml)
// renders at - see src/api/contentApi.ts's "PERSONAL LOAN CAMPAIGN" section.
const PERSONAL_LOAN_PATH = '/en/home/product-personal-loan/';

export type PersonalLoanContent = PersonalLoanCampaignData;

export async function fetchPersonalLoanContent(signal?: AbortSignal): Promise<PersonalLoanContent> {
  return fetchPersonalLoanCampaign(PERSONAL_LOAN_PATH, signal);
}
