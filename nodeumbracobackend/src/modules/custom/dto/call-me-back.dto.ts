import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

// Ported from Web/Controllers/CustomController.cs -> class Form : tracking_info
export class CallMeBackFormDto {
  @IsString()
  FirstNameInput: string;

  @IsString()
  LastNameInput: string;

  @IsString()
  EmailInput: string;

  @IsString()
  SAIDInput: string;

  @IsString()
  CellPhoneInput: string;

  @IsOptional()
  @IsString()
  MessageInput?: string;

  @IsOptional()
  @IsString()
  cbx?: string;

  @IsOptional()
  @IsString()
  frmLeadSource?: string;

  @IsOptional()
  @IsString()
  utm_source?: string;

  @IsOptional()
  @IsString()
  utm_medium?: string;

  @IsOptional()
  @IsString()
  utm_campaign?: string;
}

// Ported from call_me_request(Form form, int prodId, string call_me_subject, string call_me_contact_type)
export class CallMeBackRequestDto {
  form: CallMeBackFormDto;

  /** 1=Investments, 2=Loans, 3=Insurance, 4/5=Transactions */
  @IsInt()
  @IsIn([1, 2, 3, 4, 5])
  prodId: number;

  @IsOptional()
  @IsString()
  callMeSubject?: string;

  @IsOptional()
  @IsString()
  callMeContactType?: string;
}
