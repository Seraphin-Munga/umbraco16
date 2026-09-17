import type { ProductPageData } from '../api/contentApi';
import { fetchProductLoanPage } from '../api/contentApi';

// /en/home/product-personal-loan/ - see src/routes/personalMenuPages.ts.
const PERSONAL_LOAN_PATH = '/en/home/product-personal-loan/';

export type PersonalLoanContent = ProductPageData;

export async function fetchPersonalLoanContent(signal?: AbortSignal): Promise<PersonalLoanContent> {
  return fetchProductLoanPage(PERSONAL_LOAN_PATH, signal);
}
