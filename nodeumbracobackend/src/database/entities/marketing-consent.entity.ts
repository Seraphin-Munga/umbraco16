import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Ported 1:1 from Web/Models/MarketingConsent.cs (source file was present).
@Entity({ name: 'MarketingConsent' })
export class MarketingConsentEntity {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ name: 'isOptIn', type: 'int' })
  isOptIn: number;

  @Column({ name: 'Name', type: 'nvarchar', length: 100, nullable: true })
  Name: string;

  @Column({ name: 'Surname', type: 'nvarchar', length: 100, nullable: true })
  Surname: string;

  @Column({ name: 'IdNumber', type: 'bigint' })
  IdNumber: string;

  @Column({ name: 'Email', type: 'nvarchar', length: 150, nullable: true })
  Email: string;

  @Column({ name: 'isMailContactable', type: 'int' })
  isMailContactable: number;

  @Column({ name: 'Cellphone', type: 'nvarchar', length: 20, nullable: true })
  Cellphone: string;

  @Column({ name: 'isCellphoneContactable', type: 'int' })
  isCellphoneContactable: number;

  @Column({
    name: 'AlternativeNumber',
    type: 'nvarchar',
    length: 20,
    nullable: true,
  })
  AlternativeNumber: string;

  @Column({ name: 'isAlternativeNumberContactable', type: 'int' })
  isAlternativeNumberContactable: number;

  @Column({ name: 'isInvestmentSelected', type: 'int' })
  isInvestmentSelected: number;

  @Column({ name: 'isInsuranceSelected', type: 'int' })
  isInsuranceSelected: number;

  @Column({ name: 'isLoanAndCreditCardSelected', type: 'int' })
  isLoanAndCreditCardSelected: number;

  @Column({ name: 'isTransactionBankingSelected', type: 'int' })
  isTransactionBankingSelected: number;

  @Column({
    name: 'consentSource',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  consentSource: string;

  @Column({ name: 'consentDate', type: 'datetime' })
  consentDate: Date;
}
