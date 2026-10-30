import { columns } from './config/columns';
import type {
  IDonneesTransition,
  IResultatTransition,
  IRapprochementWorkflow,
  ValeurPayload
} from './models/Rapprochement';
import { Action, Role, Statut, TypeRapprochement } from './models';

type ActionsParRole = Partial<Record<Role, readonly Action[]>>;
type ReglesParType = Record<TypeRapprochement, ActionsParRole>;
type TypeTransition =
  | 'aucun'
  | 'soumettre'
  | 'prendreMainSignataire1'
  | 'prendreMainSignataire2'
  | 'libererSignataire1'
  | 'libererSignataire2'
  | 'validerVersSignataire2'
  | 'archiver'
  | 'refuser';
type TransitionsParType = Record<TypeRapprochement, Partial<Record<Action, TypeTransition>>>;

export interface INomsChampsWorkflow {
  readonly statut: string;
  readonly secondePasse: string;
  readonly enCoursAnalyseParId: string;
  readonly emetteurId?: string;
  readonly dateEmission?: string;
  readonly commentaireEmetteur?: string;
  readonly signataire1Id?: string;
  readonly dateSignature1?: string;
  readonly commentaireSignataire1?: string;
  readonly motifRetour1?: string;
  readonly commentaireRetour1?: string;
  readonly signataire2Id?: string;
  readonly dateSignature2?: string;
  readonly commentaireSignataire2?: string;
  readonly motifRetour2?: string;
  readonly commentaireRetour2?: string;
}

const rolesAucun: ActionsParRole = {};
const actionsBrouillon: ActionsParRole = {
  [Role.Emetteur]: [Action.Modifier, Action.Soumettre]
};
const actionsSignataire1Mensuel: ActionsParRole = {
  [Role.Signataire1]: [Action.PrendreLaMain, Action.Refuser, Action.ValiderEtArchiver]
};
const actionsSignataire1Trimestriel: ActionsParRole = {
  [Role.Signataire1]: [Action.PrendreLaMain, Action.Refuser, Action.Valider]
};
const actionsSignataire2: ActionsParRole = {
  [Role.Signataire2]: [Action.PrendreLaMain, Action.Refuser, Action.ValiderEtArchiver]
};
const actionsEnCoursSignataire1Mensuel: ActionsParRole = {
  [Role.Signataire1]: [Action.Liberer, Action.Refuser, Action.ValiderEtArchiver]
};
const actionsEnCoursSignataire1Trimestriel: ActionsParRole = {
  [Role.Signataire1]: [Action.Liberer, Action.Refuser, Action.Valider]
};
const actionsEnCoursSignataire2: ActionsParRole = {
  [Role.Signataire2]: [Action.Liberer, Action.Refuser, Action.ValiderEtArchiver]
};

// Cette table est la source de vérité des droits ; un cumul de rôles cumule leurs actions.
const actionsAutorisees: Record<Statut, ReglesParType> = {
  [Statut.Brouillon]: {
    [TypeRapprochement.Mensuel]: actionsBrouillon,
    [TypeRapprochement.Trimestriel]: actionsBrouillon
  },
  [Statut.SoumisSignataire1]: {
    [TypeRapprochement.Mensuel]: actionsSignataire1Mensuel,
    [TypeRapprochement.Trimestriel]: actionsSignataire1Trimestriel
  },
  [Statut.EnCoursSignataire1]: {
    [TypeRapprochement.Mensuel]: actionsEnCoursSignataire1Mensuel,
    [TypeRapprochement.Trimestriel]: actionsEnCoursSignataire1Trimestriel
  },
  [Statut.SoumisSignataire2]: {
    [TypeRapprochement.Mensuel]: actionsSignataire2,
    [TypeRapprochement.Trimestriel]: actionsSignataire2
  },
  [Statut.EnCoursSignataire2]: {
    [TypeRapprochement.Mensuel]: actionsEnCoursSignataire2,
    [TypeRapprochement.Trimestriel]: actionsEnCoursSignataire2
  },
  [Statut.Refuse]: {
    [TypeRapprochement.Mensuel]: actionsBrouillon,
    [TypeRapprochement.Trimestriel]: actionsBrouillon
  },
  [Statut.Bloque]: {
    [TypeRapprochement.Mensuel]: rolesAucun,
    [TypeRapprochement.Trimestriel]: rolesAucun
  },
  [Statut.Archive]: {
    [TypeRapprochement.Mensuel]: rolesAucun,
    [TypeRapprochement.Trimestriel]: rolesAucun
  }
};

const transitions: Record<Statut, TransitionsParType> = {
  [Statut.Brouillon]: {
    [TypeRapprochement.Mensuel]: {
      [Action.Modifier]: 'aucun',
      [Action.Soumettre]: 'soumettre'
    },
    [TypeRapprochement.Trimestriel]: {
      [Action.Modifier]: 'aucun',
      [Action.Soumettre]: 'soumettre'
    }
  },
  [Statut.SoumisSignataire1]: {
    [TypeRapprochement.Mensuel]: {
      [Action.PrendreLaMain]: 'prendreMainSignataire1',
      [Action.Refuser]: 'refuser',
      [Action.ValiderEtArchiver]: 'archiver'
    },
    [TypeRapprochement.Trimestriel]: {
      [Action.PrendreLaMain]: 'prendreMainSignataire1',
      [Action.Refuser]: 'refuser',
      [Action.Valider]: 'validerVersSignataire2'
    }
  },
  [Statut.EnCoursSignataire1]: {
    [TypeRapprochement.Mensuel]: {
      [Action.Liberer]: 'libererSignataire1',
      [Action.Refuser]: 'refuser',
      [Action.ValiderEtArchiver]: 'archiver'
    },
    [TypeRapprochement.Trimestriel]: {
      [Action.Liberer]: 'libererSignataire1',
      [Action.Refuser]: 'refuser',
      [Action.Valider]: 'validerVersSignataire2'
    }
  },
  [Statut.SoumisSignataire2]: {
    [TypeRapprochement.Mensuel]: {
      [Action.PrendreLaMain]: 'prendreMainSignataire2',
      [Action.Refuser]: 'refuser',
      [Action.ValiderEtArchiver]: 'archiver'
    },
    [TypeRapprochement.Trimestriel]: {
      [Action.PrendreLaMain]: 'prendreMainSignataire2',
      [Action.Refuser]: 'refuser',
      [Action.ValiderEtArchiver]: 'archiver'
    }
  },
  [Statut.EnCoursSignataire2]: {
    [TypeRapprochement.Mensuel]: {
      [Action.Liberer]: 'libererSignataire2',
      [Action.Refuser]: 'refuser',
      [Action.ValiderEtArchiver]: 'archiver'
    },
    [TypeRapprochement.Trimestriel]: {
      [Action.Liberer]: 'libererSignataire2',
      [Action.Refuser]: 'refuser',
      [Action.ValiderEtArchiver]: 'archiver'
    }
  },
  [Statut.Refuse]: {
    [TypeRapprochement.Mensuel]: {
      [Action.Modifier]: 'aucun',
      [Action.Soumettre]: 'soumettre'
    },
    [TypeRapprochement.Trimestriel]: {
      [Action.Modifier]: 'aucun',
      [Action.Soumettre]: 'soumettre'
    }
  },
  [Statut.Bloque]: {
    [TypeRapprochement.Mensuel]: {},
    [TypeRapprochement.Trimestriel]: {}
  },
  [Statut.Archive]: {
    [TypeRapprochement.Mensuel]: {},
    [TypeRapprochement.Trimestriel]: {}
  }
};

const statutParTransition: Record<TypeTransition, (rapprochement: IRapprochementWorkflow) => Statut> = {
  aucun: rapprochement => rapprochement.statut,
  soumettre: () => Statut.SoumisSignataire1,
  prendreMainSignataire1: () => Statut.EnCoursSignataire1,
  prendreMainSignataire2: () => Statut.EnCoursSignataire2,
  libererSignataire1: () => Statut.SoumisSignataire1,
  libererSignataire2: () => Statut.SoumisSignataire2,
  validerVersSignataire2: () => Statut.SoumisSignataire2,
  archiver: () => Statut.Archive,
  refuser: rapprochement => rapprochement.secondePasse ? Statut.Bloque : Statut.Refuse
};

const exigerTransition = (rapprochement: IRapprochementWorkflow, action: Action): TypeTransition => {
  const transition = transitions[rapprochement.statut][rapprochement.type][action];
  if (!transition) {
    throw new Error(
      `L'action « ${action} » n'est pas autorisée depuis le statut « ${rapprochement.statut} » pour le type « ${rapprochement.type} ».`
    );
  }
  return transition;
};

const exigerUtilisateur = (donnees: IDonneesTransition): number => {
  if (donnees.utilisateurId === undefined || !Number.isFinite(donnees.utilisateurId)) {
    throw new Error('Un identifiant utilisateur est requis pour cette action.');
  }
  return donnees.utilisateurId;
};

const exigerDateIso = (donnees: IDonneesTransition): string => {
  if (!donnees.date || Number.isNaN(Date.parse(donnees.date))) {
    throw new Error('Une date valide est requise pour cette action.');
  }
  return new Date(donnees.date).toISOString();
};

const ajouterSiDefini = (
  payload: Record<string, ValeurPayload>,
  nomChamp: string | undefined,
  valeur: ValeurPayload | undefined
): void => {
  if (nomChamp && valeur !== undefined) {
    payload[nomChamp] = valeur;
  }
};

export const getActionsDisponibles = (
  rapprochement: IRapprochementWorkflow,
  roles: readonly Role[]
): Action[] => {
  const regles = actionsAutorisees[rapprochement.statut][rapprochement.type];
  const actions = new Set<Action>();
  roles.forEach(role => (regles[role] || []).forEach(action => actions.add(action)));
  return Array.from(actions);
};

export const getStatutSuivant = (
  rapprochement: IRapprochementWorkflow,
  action: Action
): Statut => {
  const typeTransition = exigerTransition(rapprochement, action);
  return statutParTransition[typeTransition](rapprochement);
};

export const getNomsChamps = (
  statut: Statut,
  secondePasse: boolean
): INomsChampsWorkflow => {
  const noms: INomsChampsWorkflow = {
    statut: columns.statut,
    secondePasse: columns.secondePasse,
    enCoursAnalyseParId: columns.enCoursAnalyseParId
  };

  const champsEmetteur = {
    emetteurId: secondePasse ? columns.emetteurBisId : columns.emetteurId,
    dateEmission: secondePasse ? columns.dateEmissionBis : columns.dateEmission,
    commentaireEmetteur: secondePasse ? columns.commentaireEmetteurBis : columns.commentaireEmetteur
  };
  const champsSignataire1 = {
    signataire1Id: secondePasse ? columns.signataire1BisId : columns.signataire1Id,
    dateSignature1: secondePasse ? columns.dateSignature1Bis : columns.dateSignature1,
    commentaireSignataire1: secondePasse
      ? columns.commentaireSignataire1Bis
      : columns.commentaireSignataire1,
    motifRetour1: secondePasse ? columns.motifRetour1Bis : columns.motifRetour1,
    commentaireRetour1: secondePasse ? columns.commentaireRetour1Bis : columns.commentaireRetour1
  };
  const champsSignataire2 = {
    signataire2Id: secondePasse ? columns.signataire2BisId : columns.signataire2Id,
    dateSignature2: secondePasse ? columns.dateSignature2Bis : columns.dateSignature2,
    commentaireSignataire2: secondePasse
      ? columns.commentaireSignataire2Bis
      : columns.commentaireSignataire2,
    motifRetour2: secondePasse ? columns.motifRetour2Bis : columns.motifRetour2,
    commentaireRetour2: secondePasse ? columns.commentaireRetour2Bis : columns.commentaireRetour2
  };

  const champsParStatut: Record<Statut, Partial<INomsChampsWorkflow>> = {
    [Statut.Brouillon]: champsEmetteur,
    [Statut.SoumisSignataire1]: champsSignataire1,
    [Statut.EnCoursSignataire1]: champsSignataire1,
    [Statut.SoumisSignataire2]: champsSignataire2,
    [Statut.EnCoursSignataire2]: champsSignataire2,
    [Statut.Refuse]: champsEmetteur,
    [Statut.Bloque]: {},
    [Statut.Archive]: {}
  };

  return { ...noms, ...champsParStatut[statut] };
};

export const appliquerTransition = (
  rapprochement: IRapprochementWorkflow,
  action: Action,
  donnees: IDonneesTransition
): IResultatTransition => {
  if (getActionsDisponibles(rapprochement, donnees.roles).indexOf(action) === -1) {
    throw new Error(
      `L'action « ${action} » n'est pas autorisée pour les rôles fournis depuis le statut « ${rapprochement.statut} ».`
    );
  }

  const typeTransition = exigerTransition(rapprochement, action);
  const statut = statutParTransition[typeTransition](rapprochement);
  const noms = getNomsChamps(rapprochement.statut, rapprochement.secondePasse);
  const payload: Record<string, ValeurPayload> = {};

  if (typeTransition === 'aucun') {
    Object.assign(payload, donnees.modifications || {});
    return { statut, payload };
  }

  payload[noms.statut] = statut;

  const transitionActions: Record<
    Exclude<TypeTransition, 'aucun'>,
    () => void
  > = {
    soumettre: () => {
      payload[noms.secondePasse] = rapprochement.secondePasse;
      payload[noms.emetteurId as string] = exigerUtilisateur(donnees);
      payload[noms.dateEmission as string] = exigerDateIso(donnees);
      ajouterSiDefini(payload, noms.commentaireEmetteur, donnees.commentaire);
    },
    prendreMainSignataire1: () => {
      payload[noms.enCoursAnalyseParId] = exigerUtilisateur(donnees);
    },
    prendreMainSignataire2: () => {
      payload[noms.enCoursAnalyseParId] = exigerUtilisateur(donnees);
    },
    libererSignataire1: () => {
      payload[noms.enCoursAnalyseParId] = null;
    },
    libererSignataire2: () => {
      payload[noms.enCoursAnalyseParId] = null;
    },
    validerVersSignataire2: () => {
      payload[noms.signataire1Id as string] = exigerUtilisateur(donnees);
      payload[noms.dateSignature1 as string] = exigerDateIso(donnees);
      ajouterSiDefini(payload, noms.commentaireSignataire1, donnees.commentaire);
    },
    archiver: () => {
      const estSignataire1 = rapprochement.statut === Statut.SoumisSignataire1
        || rapprochement.statut === Statut.EnCoursSignataire1;
      const nomSignataire = estSignataire1 ? noms.signataire1Id : noms.signataire2Id;
      const nomDateSignature = estSignataire1 ? noms.dateSignature1 : noms.dateSignature2;
      const nomCommentaire = estSignataire1
        ? noms.commentaireSignataire1
        : noms.commentaireSignataire2;
      payload[nomSignataire as string] = exigerUtilisateur(donnees);
      payload[nomDateSignature as string] = exigerDateIso(donnees);
      ajouterSiDefini(payload, nomCommentaire, donnees.commentaire);
    },
    refuser: () => {
      if (!donnees.motif || !donnees.motif.trim()) {
        throw new Error('Un motif est requis pour refuser le rapprochement.');
      }
      const estSignataire1 = rapprochement.statut === Statut.SoumisSignataire1
        || rapprochement.statut === Statut.EnCoursSignataire1;
      const nomSignataire = estSignataire1 ? noms.signataire1Id : noms.signataire2Id;
      const nomMotif = estSignataire1 ? noms.motifRetour1 : noms.motifRetour2;
      const nomCommentaire = estSignataire1 ? noms.commentaireRetour1 : noms.commentaireRetour2;
      payload[nomSignataire as string] = exigerUtilisateur(donnees);
      payload[noms.enCoursAnalyseParId] = null;
      payload[noms.secondePasse] = true;
      payload[nomMotif as string] = donnees.motif.trim();
      ajouterSiDefini(payload, nomCommentaire, donnees.commentaire);
    }
  };
  transitionActions[typeTransition]();

  return { statut, payload };
};
