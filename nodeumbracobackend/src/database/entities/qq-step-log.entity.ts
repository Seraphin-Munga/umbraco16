import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Ported from Web/Controllers/QuickLoansController.cs, which reads/writes this
// table directly via raw SQL and NPoco ("select ... from cmsQQStepLog ...").
// Source POCO (Models/QuickLoanModels/cmsQQStepLog.cs) was missing from the
// legacy checkout; columns reconstructed from every read/write site in that
// controller.
@Entity({ name: 'cmsQQStepLog' })
export class QqStepLogEntity {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ name: 'PhoneNumber', type: 'nvarchar', length: 30, nullable: true })
  PhoneNumber: string;

  @Column({ name: 'CreatedDate', type: 'datetime', nullable: true })
  CreatedDate: Date;

  @Column({ name: 'utm_source', type: 'nvarchar', length: 200, nullable: true })
  utm_source: string;

  @Column({
    name: 'utm_campaign',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  utm_campaign: string;

  @Column({ name: 'utm_medium', type: 'nvarchar', length: 200, nullable: true })
  utm_medium: string;

  @Column({
    name: 'PersonalDetailsRequestString',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  PersonalDetailsRequestString: string;

  @Column({
    name: 'FinancialDetails',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  FinancialDetails: string;

  @Column({
    name: 'MarketingConsent',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  MarketingConsent: string;

  @Column({
    name: 'EmployeeDetails',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  EmployeeDetails: string;

  @Column({
    name: 'SelectedOffer',
    type: 'nvarchar',
    length: 'MAX',
    nullable: true,
  })
  SelectedOffer: string;

  @Column({ name: 'OTPValue', type: 'nvarchar', length: 'MAX', nullable: true })
  OTPValue: string;

  @Column({ name: 'Offers', type: 'nvarchar', length: 'MAX', nullable: true })
  Offers: string;

  @Column({ name: 'URL', type: 'nvarchar', length: 500, nullable: true })
  URL: string;

  @Column({ name: 'iaFlag', type: 'nvarchar', length: 10, nullable: true })
  iaFlag: string;

  @Column({
    name: 'beginIAClicked',
    type: 'nvarchar',
    length: 10,
    nullable: true,
  })
  beginIAClicked: string;

  @Column({
    name: 'iaGeneratedURL',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  iaGeneratedURL: string;
}
