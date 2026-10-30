import type { PoleKey } from './models';

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
