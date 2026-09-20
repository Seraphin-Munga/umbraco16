import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// Ported from Web/Controllers/CustomController.cs -> SaveVirginActive(cmsVirginActive virginObj)
export class SaveVirginActiveDto {
  @IsString()
  @IsNotEmpty()
  Name: string;

  @IsString()
  @IsNotEmpty()
  Surname: string;

  @IsString()
  @IsNotEmpty()
  IdNumber: string;

  @IsString()
  @IsNotEmpty()
  Cellphone: string;

  @IsEmail()
  Email: string;

  @IsString()
  ReferenceNumber?: string;
}
