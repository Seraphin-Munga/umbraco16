// Ported 1:1 from Web/Models/ApiResponseInvest.cs (source was present).
export interface QuoteData {
  type: string;
  subType: string;
  currency: string;
  maximumCapital: number | null;
  maximumTerm: number | null;
  maximumCreditInterestRate: number | null;
  maximumDebitInterestRate: number | null;
  coverAmount: string;
  premium: string;
  premiumFrequency: string;
}

export interface Links {
  self: string;
}

export interface Meta {
  totalPages: number;
}

export interface ApiResponseInvest {
  data: QuoteData;
  links: Links;
  meta: Meta;
}
