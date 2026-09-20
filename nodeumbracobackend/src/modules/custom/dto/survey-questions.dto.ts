import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Ported from Web/Controllers/CustomController.cs -> SendSurveyMail(FormCollection form) / newOptOut(FormCollection form)
// The legacy action read positional form fields (ddInputResult0..3); this DTO
// exposes the same data as named JSON fields instead.
export class SurveyQuestionsDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  cellPhone: string;

  @IsEmail()
  email: string;

  @IsString()
  biggestFinancialWorry?: string;

  @IsString()
  sexiestBankFeature?: string;

  @IsString()
  feelLikeADinosaur?: string;

  @IsString()
  partOfSABanking?: string;

  @IsString()
  bankAddMoreValue?: string;
}
