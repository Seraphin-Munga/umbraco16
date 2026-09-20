import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Ported from Web/Controllers/CustomController.cs -> logCallBackRequestForTracking()
// Source POCO (Models/CustomModels/CallMeBack.cs) was missing from the legacy
// checkout; columns below are reconstructed from how the object is constructed
// and inserted there.
@Entity({ name: 'CallMeBack' })
export class CallMeBackEntity {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ name: 'IDNumber', type: 'nvarchar', length: 20, nullable: true })
  IDNumber: string;

  @Column({ name: 'CellNumber', type: 'nvarchar', length: 20, nullable: true })
  CellNumber: string;

  @Column({ name: 'Name', type: 'nvarchar', length: 100, nullable: true })
  Name: string;

  @Column({ name: 'Surname', type: 'nvarchar', length: 100, nullable: true })
  Surname: string;

  @Column({ name: 'Email', type: 'nvarchar', length: 150, nullable: true })
  Email: string;

  @Column({
    name: 'utm_campaign',
    type: 'nvarchar',
    length: 200,
    nullable: true,
  })
  utm_campaign: string;

  @Column({ name: 'utm_medium', type: 'nvarchar', length: 200, nullable: true })
  utm_medium: string;

  @Column({ name: 'utm_source', type: 'nvarchar', length: 200, nullable: true })
  utm_source: string;

  @Column({ name: 'date_time', type: 'datetime' })
  date_time: Date;
}
