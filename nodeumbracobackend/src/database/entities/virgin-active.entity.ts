import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Ported 1:1 from Web/Models/cmsVirginActive.cs (the compiled one per Web.csproj;
// a second, uncompiled definition of the same class name also existed on disk
// and was ignored).
@Entity({ name: 'cmsVirginActive' })
export class VirginActiveEntity {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ name: 'IdNumber', type: 'nvarchar', length: 20, nullable: true })
  IdNumber: string;

  @Column({ name: 'Name', type: 'nvarchar', length: 100, nullable: true })
  Name: string;

  @Column({ name: 'Surname', type: 'nvarchar', length: 100, nullable: true })
  Surname: string;

  @Column({ name: 'consentDate', type: 'datetime' })
  consentDate: Date;

  @Column({
    name: 'ReferenceNumber',
    type: 'nvarchar',
    length: 100,
    nullable: true,
  })
  ReferenceNumber: string;

  @Column({ name: 'Cellphone', type: 'nvarchar', length: 20, nullable: true })
  Cellphone: string;

  @Column({ name: 'Email', type: 'nvarchar', length: 150, nullable: true })
  Email: string;
}
