import type { PoleKey, UserRole } from './models';

export const DATA_SOURCE: 'mock' | 'sharepoint' = 'mock';

export const POLES: Record<PoleKey, { label: string; webPath: string }> = {
  sellier: {
    label: 'SELLIER',
    webPath: 'Sellier'
  },
  societesSoeurs: {
    label: 'SOCIÉTÉS SŒURS',
    webPath: 'Sociétés Soeurs'
  }
};

export const POLE_GROUPS: Record<PoleKey, Record<UserRole, string>> = {
  sellier: {
    emetteur: 'Sellier Emetteur',
    auditeurs: 'Sellier Auditeurs',
    signataire1: 'Sellier Signataire 1',
    signataire2: 'Sellier Signataire 2',
    admin: 'Sellier Admin'
  },
  societesSoeurs: {
    emetteur: 'Sociétés Sœurs Emetteur',
    auditeurs: 'Sociétés Sœurs Auditeurs',
    signataire1: 'Sociétés Sœurs Signataire 1',
    signataire2: 'Sociétés Sœurs Signataire 2',
    admin: 'Sociétés Sœurs Admin'
  }
};

export const SHAREPOINT_LISTS = {
  rapprochements: 'Rapprochements',
  archives: 'Archives Rapprochements',
  choiceMatrix: 'MatriceChoiceList'
} as const;

export const SHAREPOINT_FIELDS = {
  id: 'Id',
  title: 'Title',
  month: 'Mois',
  year: 'Annee',
  account: 'Compte',
  company: 'Societe',
  genre: 'Genre',
  status: 'Statut',
  signer1: 'Signataire1Name',
  signer2: 'Signataire2Name',
  period: 'TypeParRap',
  description: 'DescriptionParRap'
} as const;

export const SHAREPOINT_WORKFLOW_FIELDS = {
  emitter: 'EmetteurName',
  beingAnalysedBy: 'BeingAnalysedBy',
  emissionDate: 'DateEmission',
  signatureDate1: 'DateSignature1',
  signatureDate2: 'DateSignature2',
  emitterComment: 'CommentaireEmetteur',
  signer1Comment: 'CommentaireSignataire1',
  signer2Comment: 'CommentaireSignataire2',
  refusalReason1: 'MotifRetour1',
  refusalReason2: 'MotifRetour2',
  refusalComment1: 'CommentaireRetour1',
  refusalComment2: 'CommentaireRetour2',
  secondPass: 'SecondePasse'
} as const;

export const SHAREPOINT_ASSIGNED_SIGNER_FIELDS = {
  signer1: 'Signataire1NameAssigned',
  signer2: 'Signataire2NameAssigned'
} as const;

export const SHAREPOINT_SECOND_PASS_FIELDS = {
  emitter: 'EmetteurNameBis',
  signer1: 'Signataire1NameBis',
  signer2: 'Signataire2NameBis',
  emissionDate: 'DateEmissionBis',
  signatureDate1: 'DateSignature1Bis',
  signatureDate2: 'DateSignature2Bis',
  emitterComment: 'CommentaireEmetteurBis',
  signer1Comment: 'CommentaireSignataire1Bis',
  signer2Comment: 'CommentaireSignataire2Bis',
  refusalReason1: 'MotifRetour1Bis',
  refusalReason2: 'MotifRetour2Bis',
  refusalComment1: 'CommentaireRetour1Bis',
  refusalComment2: 'CommentaireRetour2Bis'
} as const;

export const STATUS_CHOICES = [
  'Brouillon',
  'Soumis au Signataire 1',
  "En cours d'analyse par un Signataire 1",
  'Soumis au Signataire 2',
  "En cours d'analyse par un Signataire 2",
  'Archivé',
  'Refusé',
  'Bloqué'
] as const;

export const GENRE_CHOICES = ['Banque', 'Caisse', 'Carte'] as const;
export const YEAR_CHOICES = ['2026', '2025', '2024', '2023', '2022', '2021'] as const;
export const MONTH_CHOICES = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre'
] as const;
