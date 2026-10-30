export type PoleKey = 'sellier' | 'societesSoeurs';
export type RapprochementPeriod = 'mensuel' | 'trimestriel' | 'archivage';

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
}

export type IRapprochementUpdate = Partial<INewRapprochement>;
