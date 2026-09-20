import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Ported 1:1 from Web/Models/TrackMyLoanAudit.cs (source file was present).
@Entity({ name: 'cmsTrackMyLoanAudit' })
export class TrackMyLoanAuditEntity {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({
    name: 'ClientNumber',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  ClientNumber: string;

  @Column({
    name: 'ApplicationId',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  ApplicationId: string;

  @Column({
    name: 'ApplicationType',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  ApplicationType: string;

  @Column({
    name: 'ApplicationStatus',
    type: 'nvarchar',
    length: 50,
    nullable: true,
  })
  ApplicationStatus: string;

  @Column({ name: 'URLapi', type: 'nvarchar', length: 500, nullable: true })
  URLapi: string;

  @Column({ name: 'Request', type: 'nvarchar', length: 'MAX', nullable: true })
  Request: string;

  @Column({ name: 'Response', type: 'nvarchar', length: 'MAX', nullable: true })
  Response: string;

  @Column({ name: 'DateTime', type: 'datetime' })
  DateTime: Date;

  @Column({ name: 'CreatedBy', type: 'nvarchar', length: 100, nullable: true })
  CreatedBy: string;
}
