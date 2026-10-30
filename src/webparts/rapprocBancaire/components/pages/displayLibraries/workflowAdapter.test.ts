import { columns } from '../../../../rapprochements/workflow/config/columns';
import type { IResultatTransition } from '../../../../rapprochements/workflow/models/Rapprochement';
import { Role, Statut, TypeRapprochement } from '../../../../rapprochements/workflow/models';
import type { IRapprochement } from './services/models';
import { toServiceUpdate, toWorkflowRapprochement, toWorkflowRoles } from './workflowAdapter';

const item: IRapprochement = {
  id: 1,
  title: 'Rapprochement test',
  month: 'Mars',
  year: '2026',
  account: '5120',
  company: 'Société test',
  genre: 'Banque',
  status: 'Soumis au Signataire 1',
  signer1: '',
  signer2: '',
  period: 'trimestriel',
  secondPass: false
};

describe('adaptateur du workflow de la WebPart', () => {
  it('convertit le statut, le type et la seconde passe de la WebPart', () => {
    expect(toWorkflowRapprochement(item)).toEqual({
      statut: Statut.SoumisSignataire1,
      type: TypeRapprochement.Trimestriel,
      secondePasse: false
    });
  });

  it('désactive le workflow pour les éléments de la liste d’archives', () => {
    expect(toWorkflowRapprochement({ ...item, period: 'archivage' })).toBeUndefined();
  });

  it('signale un statut de liste inconnu plutôt que de lui attribuer une règle', () => {
    expect(() => toWorkflowRapprochement({ ...item, status: 'En attente' }))
      .toThrow('Le statut « En attente » n\'est pas reconnu par le workflow.');
  });

  it('ne transmet au moteur que les trois rôles définis par le workflow', () => {
    expect(toWorkflowRoles(['admin', 'emetteur', 'auditeurs', 'signataire1']))
      .toEqual([Role.Emetteur, Role.Signataire1]);
  });

  it('traduit les clés temporaires du workflow vers le contrat de service', () => {
    const transition: IResultatTransition = {
      statut: Statut.SoumisSignataire1,
      payload: {
        [columns.statut]: Statut.SoumisSignataire1,
        [columns.secondePasse]: false,
        [columns.emetteurId]: 7,
        [columns.dateEmission]: '2026-03-01T10:00:00.000Z',
        [columns.commentaireEmetteur]: 'À vérifier'
      }
    };

    expect(toServiceUpdate(transition, false)).toEqual({
      status: 'Soumis au Signataire 1',
      secondPass: false,
      emitterId: 7,
      emissionDate: '2026-03-01T10:00:00.000Z',
      emitterComment: 'À vérifier',
      useSecondPassFields: false
    });
  });

  it('traduit les champs Bis et la valeur null de libération sans exposer de marqueur TODO', () => {
    const transition: IResultatTransition = {
      statut: Statut.EnCoursSignataire2,
      payload: {
        [columns.statut]: Statut.EnCoursSignataire2,
        [columns.enCoursAnalyseParId]: null,
        [columns.signataire2BisId]: 12,
        [columns.dateSignature2Bis]: '2026-03-02T10:00:00.000Z',
        [columns.commentaireSignataire2Bis]: 'Validé'
      }
    };
    const update = toServiceUpdate(transition, true);

    expect(update).toEqual({
      status: "En cours d'analyse par un Signataire 2",
      beingAnalysedById: null,
      signer2Id: 12,
      signatureDate2: '2026-03-02T10:00:00.000Z',
      signer2Comment: 'Validé',
      useSecondPassFields: true
    });
    expect(Object.keys(update).some(key => key.startsWith('TODO_'))).toBe(false);
  });

  it('conserve les modifications du formulaire comme propriétés métier du service', () => {
    const transition: IResultatTransition = {
      statut: Statut.Brouillon,
      payload: {
        title: 'Nouveau titre',
        company: 'Nouvelle société'
      }
    };

    expect(toServiceUpdate(transition, false)).toEqual({
      title: 'Nouveau titre',
      company: 'Nouvelle société',
      useSecondPassFields: false
    });
  });
});
