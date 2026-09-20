// Ported 1:1 from the request/SMS helper classes defined in
// Web/Controllers/CustomController.cs - source was present.

export interface ConfigurableParam {
  value: string;
  operator: string;
  fieldName: string;
}

export interface PhoneNumberDetail {
  type: string;
  areaCode: string;
  telephoneNumber: string;
}

export interface ContactDetails {
  phoneNumberDetails: PhoneNumberDetail[];
}

export interface PersonalDetails {
  idNumber: string;
  surname: string;
  firstName: string;
}

export interface ProductDetail {
  productCode: string;
}

export interface LeadContent {
  personalDetails: PersonalDetails;
  contactDetails: ContactDetails;
  productDetails: ProductDetail[];
}

export interface SmsKeyValue {
  key: string;
  value: string;
}

export interface Sms {
  templateNo: string;
  clientNumber: number;
  keyValues: SmsKeyValue[];
}
