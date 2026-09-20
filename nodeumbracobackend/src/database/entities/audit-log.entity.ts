import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Ported from Web/Controllers/QuickLoansController.cs (ValidateClient, SaveOffer,
// GetOffers). Source POCO (Models/QuickLoanModels/AuditLogs.cs) was missing from
// the legacy checkout; columns reconstructed from usage.
@Entity({ name: 'AuditLogs' })
export class AuditLogEntity {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ name: 'IDNumber', type: 'nvarchar', length: 20, nullable: true })
  IDNumber: string;

  @Column({ name: 'Action', type: 'nvarchar', length: 100, nullable: true })
  Action: string;

  @Column({ name: 'Cellphone', type: 'nvarchar', length: 20, nullable: true })
  Cellphone: string;

  @Column({ name: 'DateTime', type: 'datetime' })
  DateTime: Date;

  @Column({ name: 'Request', type: 'nvarchar', length: 'MAX', nullable: true })
  Request: string;

  @Column({ name: 'Response', type: 'nvarchar', length: 'MAX', nullable: true })
  Response: string;

  @Column({ name: 'Url', type: 'nvarchar', length: 500, nullable: true })
  Url: string;
}
