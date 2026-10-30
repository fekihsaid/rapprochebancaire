import type { Role, Statut, TypeRapprochement } from './index';

export interface IRapprochementWorkflow {
  readonly statut: Statut;
  readonly type: TypeRapprochement;
  readonly secondePasse: boolean;
}

// null est nécessaire pour vider explicitement le champ d'analyse dans le payload.
// eslint-disable-next-line @rushstack/no-new-null
export type ValeurPayload = string | number | boolean | null;

export interface IDonneesTransition {
  readonly roles: readonly Role[];
  readonly utilisateurId?: number;
  readonly date?: string;
  readonly commentaire?: string;
  readonly motif?: string;
  readonly modifications?: Readonly<Record<string, ValeurPayload>>;
}

export interface IResultatTransition {
  readonly statut: Statut;
  readonly payload: Readonly<Record<string, ValeurPayload>>;
}
