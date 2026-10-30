export type PoleKey = 'sellier' | 'societesSoeurs';
export type RapprochementPeriod = 'mensuel' | 'trimestriel' | 'archivage';
export type UserRole = 'emetteur' | 'auditeurs' | 'signataire1' | 'signataire2' | 'admin';

export interface IUserAccess {
  roles: UserRole[];
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canManageWorkflow: boolean;
  currentUserId?: number;
}

export interface IRapprochement {
  id: number;
  title: string;
  month: string;
  year: string;
  account: string;
  company: string;
  genre: string;
  status: string;
  signer1: string;
  signer2: string;
  period: RapprochementPeriod;
  description?: string;
  emitter?: string;
  signer1Assigned?: string;
  signer2Assigned?: string;
  beingAnalysedBy?: string;
  emissionDate?: string;
  signatureDate1?: string;
  signatureDate2?: string;
  emitterComment?: string;
  signer1Comment?: string;
  signer2Comment?: string;
  refusalReason1?: string;
  refusalReason2?: string;
  refusalComment1?: string;
  refusalComment2?: string;
  emitterBis?: string;
  signer1Bis?: string;
  signer2Bis?: string;
  emissionDateBis?: string;
  signatureDate1Bis?: string;
  signatureDate2Bis?: string;
  emitterCommentBis?: string;
  signer1CommentBis?: string;
  signer2CommentBis?: string;
  refusalReason1Bis?: string;
  refusalReason2Bis?: string;
  refusalComment1Bis?: string;
  refusalComment2Bis?: string;
  secondPass?: boolean;
  contentType?: string;
  created?: string;
  modified?: string;
  author?: string;
  editor?: string;
  attachments?: IRapprochementAttachment[];
}

export interface IRapprochementAttachment {
  name: string;
  url: string;
}

export interface IChoiceMatrixEntry {
  genre: string;
  company: string;
  account: string;
}

export interface INewRapprochement {
  title: string;
  month: string;
  year: string;
  account: string;
  company: string;
  genre: string;
  status: string;
  period: Exclude<RapprochementPeriod, 'archivage'>;
  description?: string;
  signer1Id?: number;
  signer2Id?: number;
  emitterId?: number;
  emissionDate?: string;
}

export interface IRapprochementUpdate extends Partial<INewRapprochement> {
  emitterId?: number;
  // SharePoint REST requires null to clear this Person field.
  // eslint-disable-next-line @rushstack/no-new-null
  beingAnalysedById?: number | null;
  emissionDate?: string;
  signatureDate1?: string;
  signatureDate2?: string;
  emitterComment?: string;
  signer1Comment?: string;
  signer2Comment?: string;
  refusalReason1?: string;
  refusalReason2?: string;
  refusalComment1?: string;
  refusalComment2?: string;
  useSecondPassFields?: boolean;
  secondPass?: boolean;
}
