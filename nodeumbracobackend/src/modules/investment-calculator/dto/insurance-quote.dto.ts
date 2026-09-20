// Ported 1:1 from Web/Models/Insurance.cs (source was present).
export class Dependent {
  coverAmount: number;
  dateOfBirth: string;
  gender: string;
}

export class InsuranceDetails {
  coverAmount: number;
  spouses: Dependent[];
  children: Dependent[];
  parents: Dependent[];
  extendedFamily: Dependent[];
}

export class InsurancePersonalDetails {
  idNumber: string;
  passportNumber: string;
  surname: string;
  firstName: string;
  dateOfBirth: string;
  gender: string;
}

export class InsuranceQuoteDto {
  type: string;
  subType: string;
  personalDetails: InsurancePersonalDetails;
  insuranceDetails: InsuranceDetails;
}
