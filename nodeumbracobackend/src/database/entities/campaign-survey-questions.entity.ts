import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Ported from Web/Controllers/CustomController.cs -> SendSurveyMail() / newOptOut() / AddLeadSource()
// Source POCO (Models/CustomModels/CampaignSurveyQuestions.cs) was missing from
// the legacy checkout; columns reconstructed from usage.
@Entity({ name: 'CampaignSurveyQuestions' })
export class CampaignSurveyQuestionsEntity {
  @PrimaryGeneratedColumn()
  Id: number;

  @Column({ name: 'firstName', type: 'nvarchar', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'cellPhone', type: 'nvarchar', length: 20, nullable: true })
  cellPhone: string;

  @Column({ name: 'email', type: 'nvarchar', length: 150, nullable: true })
  email: string;

  @Column({
    name: 'biggestFinancialWorry',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  biggestFinancialWorry: string;

  @Column({
    name: 'sexiestBankFeature',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  sexiestBankFeature: string;

  @Column({
    name: 'feelLikeADinosaur',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  feelLikeADinosaur: string;

  @Column({
    name: 'partOfSABanking',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  partOfSABanking: string;

  @Column({
    name: 'bankAddMoreValue',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  bankAddMoreValue: string;
}
