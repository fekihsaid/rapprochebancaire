import { columns } from '../../../../rapprochements/workflow/config/columns';
import type {
  IRapprochementWorkflow,
  IResultatTransition,
  ValeurPayload
} from '../../../../rapprochements/workflow/models/Rapprochement';
import { Role, Statut, TypeRapprochement } from '../../../../rapprochements/workflow/models';
import type { IRapprochement, IRapprochementUpdate, UserRole } from './services/models';

const statutDepuisAffichage: Record<string, Statut> = {
  Brouillon: Statut.Brouillon,
  'Soumis au Signataire 1': Statut.SoumisSignataire1,
  "En cours d'analyse par un Signataire 1": Statut.EnCoursSignataire1,
  'Soumis au Signataire 2': Statut.SoumisSignataire2,
  "En cours d'analyse par un Signataire 2": Statut.EnCoursSignataire2,
  Refusé: Statut.Refuse,
  Bloqué: Statut.Bloque,
  Archivé: Statut.Archive
};

const statutPourAffichage: Record<Statut, string> = {
  [Statut.Brouillon]: 'Brouillon',
  [Statut.SoumisSignataire1]: 'Soumis au Signataire 1',
  [Statut.EnCoursSignataire1]: "En cours d'analyse par un Signataire 1",
  [Statut.SoumisSignataire2]: 'Soumis au Signataire 2',
  [Statut.EnCoursSignataire2]: "En cours d'analyse par un Signataire 2",
  [Statut.Refuse]: 'Refusé',
  [Statut.Bloque]: 'Bloqué',
  [Statut.Archive]: 'Archivé'
};

const roleWorkflow: Partial<Record<UserRole, Role>> = {
  emetteur: Role.Emetteur,
  signataire1: Role.Signataire1,
  signataire2: Role.Signataire2
};

export const toWorkflowRapprochement = (
  item: IRapprochement
): IRapprochementWorkflow | undefined => {
  if (item.period === 'archivage') {
    return undefined;
  }

  const statut = statutDepuisAffichage[item.status];
  if (!statut) {
    throw new Error(`Le statut « ${item.status} » n'est pas reconnu par le workflow.`);
  }

  return {
    statut,
    type: item.period === 'mensuel' ? TypeRapprochement.Mensuel : TypeRapprochement.Trimestriel,
    secondePasse: Boolean(item.secondPass)
  };
};

export const toWorkflowRoles = (roles: readonly UserRole[]): Role[] => (
  roles.reduce<Role[]>((mappedRoles, role) => {
    const mappedRole = roleWorkflow[role];
    if (mappedRole && mappedRoles.indexOf(mappedRole) === -1) {
      mappedRoles.push(mappedRole);
    }
    return mappedRoles;
  }, [])
);

const readString = (
  payload: Readonly<Record<string, ValeurPayload>>,
  key: string
): string | undefined => {
  const value = payload[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`La valeur du champ workflow « ${key} » doit être une chaîne.`);
  }
  return value;
};

const readNumber = (
  payload: Readonly<Record<string, ValeurPayload>>,
  key: string
): number | undefined => {
  const value = payload[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`La valeur du champ workflow « ${key} » doit être un identifiant numérique.`);
  }
  return value;
};

const readNullableNumber = (
  payload: Readonly<Record<string, ValeurPayload>>,
  key: string
): number | null | undefined => { // eslint-disable-line @rushstack/no-new-null
  const value = payload[key];
  // SharePoint REST exige null pour vider explicitement un champ Personne.
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`La valeur du champ workflow « ${key} » doit être un identifiant numérique ou null.`);
  }
  return value;
};

const readBoolean = (
  payload: Readonly<Record<string, ValeurPayload>>,
  key: string
): boolean | undefined => {
  const value = payload[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new Error(`La valeur du champ workflow « ${key} » doit être un booléen.`);
  }
  return value;
};

export const toServiceUpdate = (
  transition: IResultatTransition,
  secondePasse: boolean
): IRapprochementUpdate => {
  const payload = transition.payload;
  const update: IRapprochementUpdate = { useSecondPassFields: secondePasse };

  if (payload[columns.statut] !== undefined) {
    update.status = statutPourAffichage[transition.statut];
  }

  const secondPass = readBoolean(payload, columns.secondePasse);
  if (secondPass !== undefined) {
    update.secondPass = secondPass;
  }

  const beingAnalysedById = readNullableNumber(payload, columns.enCoursAnalyseParId);
  if (beingAnalysedById !== undefined) {
    update.beingAnalysedById = beingAnalysedById;
  }

  const textFields: Array<[string, (value: string) => void]> = [
    ['title', value => { update.title = value; }],
    ['month', value => { update.month = value; }],
    ['year', value => { update.year = value; }],
    ['account', value => { update.account = value; }],
    ['company', value => { update.company = value; }],
    ['genre', value => { update.genre = value; }],
    ['description', value => { update.description = value; }],
    [columns.dateEmission, value => { update.emissionDate = value; }],
    [columns.commentaireEmetteur, value => { update.emitterComment = value; }],
    [columns.dateSignature1, value => { update.signatureDate1 = value; }],
    [columns.commentaireSignataire1, value => { update.signer1Comment = value; }],
    [columns.motifRetour1, value => { update.refusalReason1 = value; }],
    [columns.commentaireRetour1, value => { update.refusalComment1 = value; }],
    [columns.dateSignature2, value => { update.signatureDate2 = value; }],
    [columns.commentaireSignataire2, value => { update.signer2Comment = value; }],
    [columns.motifRetour2, value => { update.refusalReason2 = value; }],
    [columns.commentaireRetour2, value => { update.refusalComment2 = value; }],
    [columns.dateEmissionBis, value => { update.emissionDate = value; }],
    [columns.commentaireEmetteurBis, value => { update.emitterComment = value; }],
    [columns.dateSignature1Bis, value => { update.signatureDate1 = value; }],
    [columns.commentaireSignataire1Bis, value => { update.signer1Comment = value; }],
    [columns.motifRetour1Bis, value => { update.refusalReason1 = value; }],
    [columns.commentaireRetour1Bis, value => { update.refusalComment1 = value; }],
    [columns.dateSignature2Bis, value => { update.signatureDate2 = value; }],
    [columns.commentaireSignataire2Bis, value => { update.signer2Comment = value; }],
    [columns.motifRetour2Bis, value => { update.refusalReason2 = value; }],
    [columns.commentaireRetour2Bis, value => { update.refusalComment2 = value; }]
  ];
  textFields.forEach(([key, assign]) => {
    const value = readString(payload, key);
    if (value !== undefined) {
      assign(value);
    }
  });

  const personFields: Array<[string, (value: number) => void]> = [
    [columns.emetteurId, value => { update.emitterId = value; }],
    [columns.signataire1Id, value => { update.signer1Id = value; }],
    [columns.signataire2Id, value => { update.signer2Id = value; }],
    [columns.emetteurBisId, value => { update.emitterId = value; }],
    [columns.signataire1BisId, value => { update.signer1Id = value; }],
    [columns.signataire2BisId, value => { update.signer2Id = value; }]
  ];
  personFields.forEach(([key, assign]) => {
    const value = readNumber(payload, key);
    if (value !== undefined) {
      assign(value);
    }
  });

  return update;
};
