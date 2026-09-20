// Ported 1:1 from the classes defined at the bottom of Web/Controllers/CustomController.cs
// ("Applications Model returned by the GetApplications" region) - source was present.

export interface ApplicationData {
  applicationId: number;
  clientNumber: number;
  applicationStatus: string;
  applicationType: string;
  workflowStatus: string;
  company: string;
  channel: string;
  originationBranch: number;
  branch: number;
  externalReference: string;
  createdBy: string;
  creationDate: string;
  lastUpdatedBy: string;
  lastUpdatedTime: string;
  concludedBy: string;
}

export interface NavLinks {
  next: string;
  previous: string;
  last: string;
  first: string;
}

export interface ApplicationMeta {
  totalPages: number;
  pageSize: number;
  pageItems: number;
}

export interface Applications {
  data: ApplicationData[];
  links: NavLinks;
  meta: ApplicationMeta;
}
