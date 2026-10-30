import { columns } from './config/columns';
import {
  appliquerTransition,
  getActionsDisponibles,
  getNomsChamps,
  getStatutSuivant
} from './workflow';
import type { IDonneesTransition, IRapprochementWorkflow } from './models/Rapprochement';
import { Action, Role, Statut, TypeRapprochement } from './models';

const roles = [Role.Emetteur, Role.Signataire1, Role.Signataire2];
const types = [TypeRapprochement.Mensuel, TypeRapprochement.Trimestriel];
const statuts = [
  Statut.Brouillon,
  Statut.SoumisSignataire1,
  Statut.EnCoursSignataire1,
  Statut.SoumisSignataire2,
  Statut.EnCoursSignataire2,
  Statut.Refuse,
  Statut.Bloque,
  Statut.Archive
];
const actions = [
  Action.Modifier,
  Action.Soumettre,
  Action.PrendreLaMain,
  Action.Liberer,
  Action.Valider,
  Action.ValiderEtArchiver,
  Action.Refuser
];

type IExpectedActions = Record<Statut, Record<TypeRapprochement, Record<Role, Action[]>>>;

const aucuneAction: Record<Role, Action[]> = {
  [Role.Emetteur]: [],
  [Role.Signataire1]: [],
  [Role.Signataire2]: []
};
const actionsEmetteur: Record<Role, Action[]> = {
  [Role.Emetteur]: [Action.Modifier, Action.Soumettre],
  [Role.Signataire1]: [],
  [Role.Signataire2]: []
};

const expectedActions: IExpectedActions = {
  [Statut.Brouillon]: {
    [TypeRapprochement.Mensuel]: actionsEmetteur,
    [TypeRapprochement.Trimestriel]: actionsEmetteur
  },
  [Statut.SoumisSignataire1]: {
    [TypeRapprochement.Mensuel]: {
      ...aucuneAction,
      [Role.Signataire1]: [Action.PrendreLaMain, Action.Refuser, Action.ValiderEtArchiver]
    },
    [TypeRapprochement.Trimestriel]: {
      ...aucuneAction,
      [Role.Signataire1]: [Action.PrendreLaMain, Action.Refuser, Action.Valider]
    }
  },
  [Statut.EnCoursSignataire1]: {
    [TypeRapprochement.Mensuel]: {
      ...aucuneAction,
      [Role.Signataire1]: [Action.Liberer, Action.Refuser, Action.ValiderEtArchiver]
    },
    [TypeRapprochement.Trimestriel]: {
      ...aucuneAction,
      [Role.Signataire1]: [Action.Liberer, Action.Refuser, Action.Valider]
    }
  },
  [Statut.SoumisSignataire2]: {
    [TypeRapprochement.Mensuel]: {
      ...aucuneAction,
      [Role.Signataire2]: [Action.PrendreLaMain, Action.Refuser, Action.ValiderEtArchiver]
    },
    [TypeRapprochement.Trimestriel]: {
      ...aucuneAction,
      [Role.Signataire2]: [Action.PrendreLaMain, Action.Refuser, Action.ValiderEtArchiver]
    }
  },
  [Statut.EnCoursSignataire2]: {
    [TypeRapprochement.Mensuel]: {
      ...aucuneAction,
      [Role.Signataire2]: [Action.Liberer, Action.Refuser, Action.ValiderEtArchiver]
    },
    [TypeRapprochement.Trimestriel]: {
      ...aucuneAction,
      [Role.Signataire2]: [Action.Liberer, Action.Refuser, Action.ValiderEtArchiver]
    }
  },
  [Statut.Refuse]: {
    [TypeRapprochement.Mensuel]: actionsEmetteur,
    [TypeRapprochement.Trimestriel]: actionsEmetteur
  },
  [Statut.Bloque]: {
    [TypeRapprochement.Mensuel]: aucuneAction,
    [TypeRapprochement.Trimestriel]: aucuneAction
  },
  [Statut.Archive]: {
    [TypeRapprochement.Mensuel]: aucuneAction,
    [TypeRapprochement.Trimestriel]: aucuneAction
  }
};

const rapprochement = (
  statut: Statut,
  type: TypeRapprochement,
  secondePasse: boolean = false
): IRapprochementWorkflow => ({ statut, type, secondePasse });

const donnees = (
  role: Role,
  valeurs: Omit<IDonneesTransition, 'roles'> = {}
): IDonneesTransition => ({
  ...valeurs,
  roles: [role]
});

describe('getActionsDisponibles', () => {
  statuts.forEach(statut => {
    types.forEach(type => {
      roles.forEach(role => {
        it(`${statut} / ${type} / ${role}`, () => {
          expect(getActionsDisponibles(rapprochement(statut, type), [role]))
            .toEqual(expectedActions[statut][type][role]);
        });
      });
    });
  });

  it('cumule les actions de plusieurs rôles sans doublons', () => {
    expect(getActionsDisponibles(
      rapprochement(Statut.Brouillon, TypeRapprochement.Mensuel),
      [Role.Emetteur, Role.Signataire1, Role.Emetteur]
    )).toEqual([Action.Modifier, Action.Soumettre]);
  });
});

describe('getStatutSuivant', () => {
  statuts.forEach(statut => {
    types.forEach(type => {
      const item = rapprochement(statut, type);
      const actionsAutoriseesPourLeCas = roles.reduce<Action[]>(
        (accumulees, role) => accumulees.concat(expectedActions[statut][type][role]),
        []
      );

      actions.forEach(action => {
        const estAutorisee = actionsAutoriseesPourLeCas.indexOf(action) !== -1;
        it(`${statut} / ${type} / ${action} ${estAutorisee ? 'est permise' : 'est interdite'}`, () => {
          if (!estAutorisee) {
            expect(() => getStatutSuivant(item, action)).toThrow(/n'est pas autorisée/);
            return;
          }

          const statutAttendu: Record<Action, Statut> = {
            [Action.Modifier]: statut,
            [Action.Soumettre]: Statut.SoumisSignataire1,
            [Action.PrendreLaMain]: statut === Statut.SoumisSignataire1
              ? Statut.EnCoursSignataire1
              : Statut.EnCoursSignataire2,
            [Action.Liberer]: statut === Statut.EnCoursSignataire1
              ? Statut.SoumisSignataire1
              : Statut.SoumisSignataire2,
            [Action.Valider]: Statut.SoumisSignataire2,
            [Action.ValiderEtArchiver]: Statut.Archive,
            [Action.Refuser]: Statut.Refuse
          };
          expect(getStatutSuivant(item, action)).toBe(statutAttendu[action]);
        });
      });
    });
  });

  it('bloque au refus pendant la seconde passe', () => {
    expect(getStatutSuivant(
      rapprochement(Statut.EnCoursSignataire1, TypeRapprochement.Trimestriel, true),
      Action.Refuser
    )).toBe(Statut.Bloque);
  });
});

describe('getNomsChamps', () => {
  it('retourne les champs d’émetteur en première passe', () => {
    expect(getNomsChamps(Statut.Brouillon, false)).toMatchObject({
      statut: columns.statut,
      secondePasse: columns.secondePasse,
      emetteurId: columns.emetteurId,
      dateEmission: columns.dateEmission,
      commentaireEmetteur: columns.commentaireEmetteur
    });
  });

  it('retourne les champs du Signataire 1 suffixés Bis en seconde passe', () => {
    expect(getNomsChamps(Statut.EnCoursSignataire1, true)).toMatchObject({
      signataire1Id: columns.signataire1BisId,
      dateSignature1: columns.dateSignature1Bis,
      commentaireSignataire1: columns.commentaireSignataire1Bis,
      motifRetour1: columns.motifRetour1Bis,
      commentaireRetour1: columns.commentaireRetour1Bis,
      enCoursAnalyseParId: columns.enCoursAnalyseParId
    });
  });

  it('retourne les champs du Signataire 2 suffixés Bis en seconde passe', () => {
    expect(getNomsChamps(Statut.SoumisSignataire2, true)).toMatchObject({
      signataire2Id: columns.signataire2BisId,
      dateSignature2: columns.dateSignature2Bis,
      commentaireSignataire2: columns.commentaireSignataire2Bis,
      motifRetour2: columns.motifRetour2Bis,
      commentaireRetour2: columns.commentaireRetour2Bis
    });
  });

  it('ne retourne aucun champ de signature pour les statuts terminaux', () => {
    expect(getNomsChamps(Statut.Archive, false)).toEqual({
      statut: columns.statut,
      secondePasse: columns.secondePasse,
      enCoursAnalyseParId: columns.enCoursAnalyseParId
    });
    expect(getNomsChamps(Statut.Bloque, true)).toEqual({
      statut: columns.statut,
      secondePasse: columns.secondePasse,
      enCoursAnalyseParId: columns.enCoursAnalyseParId
    });
  });
});

describe('appliquerTransition', () => {
  const date = '2026-10-30T11:30:00+01:00';

  it('soumet un brouillon avec émetteur, date ISO et commentaire', () => {
    const resultat = appliquerTransition(
      rapprochement(Statut.Brouillon, TypeRapprochement.Trimestriel),
      Action.Soumettre,
      donnees(Role.Emetteur, { utilisateurId: 12, date, commentaire: 'Prêt pour validation' })
    );
    expect(resultat.statut).toBe(Statut.SoumisSignataire1);
    expect(resultat.payload).toEqual({
      [columns.statut]: Statut.SoumisSignataire1,
      [columns.secondePasse]: false,
      [columns.emetteurId]: 12,
      [columns.dateEmission]: '2026-10-30T10:30:00.000Z',
      [columns.commentaireEmetteur]: 'Prêt pour validation'
    });
  });

  it('resoumet un refus en seconde passe avec les champs Bis', () => {
    const resultat = appliquerTransition(
      rapprochement(Statut.Refuse, TypeRapprochement.Trimestriel, true),
      Action.Soumettre,
      donnees(Role.Emetteur, { utilisateurId: 12, date, commentaire: 'Nouvelle version' })
    );
    expect(resultat.statut).toBe(Statut.SoumisSignataire1);
    expect(resultat.payload).toEqual({
      [columns.statut]: Statut.SoumisSignataire1,
      [columns.secondePasse]: true,
      [columns.emetteurBisId]: 12,
      [columns.dateEmissionBis]: '2026-10-30T10:30:00.000Z',
      [columns.commentaireEmetteurBis]: 'Nouvelle version'
    });
  });

  it('prend et libère la main de manière explicite', () => {
    const prise = appliquerTransition(
      rapprochement(Statut.SoumisSignataire1, TypeRapprochement.Mensuel),
      Action.PrendreLaMain,
      donnees(Role.Signataire1, { utilisateurId: 24 })
    );
    expect(prise.statut).toBe(Statut.EnCoursSignataire1);
    expect(prise.payload[columns.enCoursAnalyseParId]).toBe(24);

    const liberation = appliquerTransition(
      rapprochement(Statut.EnCoursSignataire2, TypeRapprochement.Trimestriel),
      Action.Liberer,
      donnees(Role.Signataire2)
    );
    expect(liberation.statut).toBe(Statut.SoumisSignataire2);
    expect(liberation.payload[columns.enCoursAnalyseParId]).toBeNull();
  });

  it('enregistre une validation trimestrielle du Signataire 1', () => {
    const resultat = appliquerTransition(
      rapprochement(Statut.EnCoursSignataire1, TypeRapprochement.Trimestriel),
      Action.Valider,
      donnees(Role.Signataire1, { utilisateurId: 31, date, commentaire: 'Validé' })
    );
    expect(resultat.statut).toBe(Statut.SoumisSignataire2);
    expect(resultat.payload).toEqual({
      [columns.statut]: Statut.SoumisSignataire2,
      [columns.signataire1Id]: 31,
      [columns.dateSignature1]: '2026-10-30T10:30:00.000Z',
      [columns.commentaireSignataire1]: 'Validé'
    });
  });

  it('enregistre la signature et le commentaire dans Bis pendant la seconde passe', () => {
    const resultat = appliquerTransition(
      rapprochement(Statut.EnCoursSignataire1, TypeRapprochement.Trimestriel, true),
      Action.Valider,
      donnees(Role.Signataire1, { utilisateurId: 31, date, commentaire: 'Validé en seconde passe' })
    );
    expect(resultat.statut).toBe(Statut.SoumisSignataire2);
    expect(resultat.payload).toEqual({
      [columns.statut]: Statut.SoumisSignataire2,
      [columns.signataire1BisId]: 31,
      [columns.dateSignature1Bis]: '2026-10-30T10:30:00.000Z',
      [columns.commentaireSignataire1Bis]: 'Validé en seconde passe'
    });
  });

  it('archive un rapprochement mensuel après la signature du Signataire 1', () => {
    const resultat = appliquerTransition(
      rapprochement(Statut.SoumisSignataire1, TypeRapprochement.Mensuel),
      Action.ValiderEtArchiver,
      donnees(Role.Signataire1, { utilisateurId: 31, date })
    );
    expect(resultat.statut).toBe(Statut.Archive);
    expect(resultat.payload[columns.signataire1Id]).toBe(31);
    expect(resultat.payload[columns.dateSignature1]).toBe('2026-10-30T10:30:00.000Z');
  });

  it('enregistre la signature du Signataire 2 et archive', () => {
    const resultat = appliquerTransition(
      rapprochement(Statut.EnCoursSignataire2, TypeRapprochement.Trimestriel),
      Action.ValiderEtArchiver,
      donnees(Role.Signataire2, { utilisateurId: 42, date })
    );
    expect(resultat.statut).toBe(Statut.Archive);
    expect(resultat.payload[columns.signataire2Id]).toBe(42);
    expect(resultat.payload[columns.dateSignature2]).toBe('2026-10-30T10:30:00.000Z');
  });

  it('enregistre un refus en première passe et active la seconde passe', () => {
    const resultat = appliquerTransition(
      rapprochement(Statut.EnCoursSignataire1, TypeRapprochement.Trimestriel),
      Action.Refuser,
      donnees(Role.Signataire1, {
        utilisateurId: 31,
        motif: 'Pièce manquante',
        commentaire: 'À compléter'
      })
    );
    expect(resultat.statut).toBe(Statut.Refuse);
    expect(resultat.payload).toEqual({
      [columns.statut]: Statut.Refuse,
      [columns.enCoursAnalyseParId]: null,
      [columns.secondePasse]: true,
      [columns.signataire1Id]: 31,
      [columns.motifRetour1]: 'Pièce manquante',
      [columns.commentaireRetour1]: 'À compléter'
    });
  });

  it('utilise les colonnes Bis et bloque au refus de seconde passe', () => {
    const resultat = appliquerTransition(
      rapprochement(Statut.EnCoursSignataire2, TypeRapprochement.Trimestriel, true),
      Action.Refuser,
      donnees(Role.Signataire2, { utilisateurId: 42, motif: 'Écart non résolu' })
    );
    expect(resultat.statut).toBe(Statut.Bloque);
    expect(resultat.payload).toEqual({
      [columns.statut]: Statut.Bloque,
      [columns.enCoursAnalyseParId]: null,
      [columns.secondePasse]: true,
      [columns.signataire2BisId]: 42,
      [columns.motifRetour2Bis]: 'Écart non résolu'
    });
  });

  it('retourne les modifications sans changer le statut pour Modifier', () => {
    const resultat = appliquerTransition(
      rapprochement(Statut.Refuse, TypeRapprochement.Mensuel, true),
      Action.Modifier,
      donnees(Role.Emetteur, { modifications: {} })
    );
    expect(resultat).toEqual({ statut: Statut.Refuse, payload: {} });
  });

  it('rejette une action interdite', () => {
    expect(() => appliquerTransition(
      rapprochement(Statut.Archive, TypeRapprochement.Mensuel),
      Action.Soumettre,
      donnees(Role.Emetteur)
    )).toThrow(/n'est pas autorisée/);
  });

  it('rejette un refus sans motif', () => {
    expect(() => appliquerTransition(
      rapprochement(Statut.SoumisSignataire1, TypeRapprochement.Mensuel),
      Action.Refuser,
      donnees(Role.Signataire1, { utilisateurId: 1 })
    )).toThrow(/motif est requis/);
  });

  it('rejette les données de signature sans utilisateur ou date valide', () => {
    const item = rapprochement(Statut.SoumisSignataire1, TypeRapprochement.Trimestriel);
    expect(() => appliquerTransition(item, Action.Valider, donnees(Role.Signataire1, { date })))
      .toThrow(/identifiant utilisateur est requis/);
    expect(() => appliquerTransition(
      item,
      Action.Valider,
      donnees(Role.Signataire1, { utilisateurId: 1, date: 'invalide' })
    ))
      .toThrow(/date valide est requise/);
  });

  it('refuse une action permise par le statut mais interdite aux rôles fournis', () => {
    expect(() => appliquerTransition(
      rapprochement(Statut.SoumisSignataire1, TypeRapprochement.Mensuel),
      Action.PrendreLaMain,
      donnees(Role.Emetteur, { utilisateurId: 1 })
    )).toThrow(/n'est pas autorisée pour les rôles fournis/);
  });
});
