// Ported from Web/Models/TrackMyLoanModels/{ClientModel,RequiredDocumentsModel}.cs
// and QuickLoansModels' OfferRoot - none of those source files existed on disk;
// shapes reconstructed purely from field access in CustomController.cs.

export interface ClientModel {
  data: {
    personalDetails: {
      clientNumber: string | number;
    };
  }[];
}

export interface OfferDetails {
  cashToClient: number;
}

export interface Offer {
  offerDetails: OfferDetails;
}

export interface OfferResponse {
  offers: Offer[];
}

export interface OfferRoot {
  results: {
    offerResponse: OfferResponse;
  };
}

export interface RequiredDocumentDetail {
  uploaded: boolean;
  subdocumentType: string;
}

export interface RequiredDocumentsModel {
  results: {
    requiredDocumentDetails: RequiredDocumentDetail[];
  };
}
