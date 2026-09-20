import { IsEmail, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const BOOLISH = [0, 1];

// Ported from Web/Controllers/CustomController.cs -> SaveConsent(Models.MarketingConsent marketingObj)
// Field shape taken 1:1 from Web/Models/MarketingConsent.cs.
export class SaveMarketingConsentDto {
  @IsInt()
  @IsIn(BOOLISH)
  isOptIn: number;

  @IsString()
  Name: string;

  @IsString()
  Surname: string;

  @IsInt()
  IdNumber: number;

  @IsEmail()
  Email: string;

  @IsInt()
  @IsIn(BOOLISH)
  isMailContactable: number;

  @IsString()
  Cellphone: string;

  @IsInt()
  @IsIn(BOOLISH)
  isCellphoneContactable: number;

  @IsOptional()
  @IsString()
  AlternativeNumber?: string;

  @IsInt()
  @IsIn(BOOLISH)
  isAlternativeNumberContactable: number;

  @IsInt()
  @IsIn(BOOLISH)
  isInvestmentSelected: number;

  @IsInt()
  @IsIn(BOOLISH)
  isInsuranceSelected: number;

  @IsInt()
  @IsIn(BOOLISH)
  isLoanAndCreditCardSelected: number;

  @IsInt()
  @IsIn(BOOLISH)
  isTransactionBankingSelected: number;

  @IsOptional()
  @IsString()
  consentSource?: string;
}
