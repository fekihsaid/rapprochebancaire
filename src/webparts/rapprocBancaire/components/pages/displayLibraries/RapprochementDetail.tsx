import * as React from 'react';
import styles from './RapprochementDetail.module.scss';
import type { IRapprochementService } from './services/IRapprochementService';
import type {
  IRapprochement,
  IRapprochementUpdate,
  IUserAccess,
  PoleKey
} from './services/models';

interface IRapprochementDetailProps {
  item: IRapprochement;
  pole: PoleKey;
  dataService: IRapprochementService;
  userAccess: IUserAccess;
  onClose: () => void;
  onUpdated: () => void;
}

type WorkflowAction = 'submit' | 'refuse' | 'validate';

const formatDate = (value?: string): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export const RapprochementDetail: React.FC<IRapprochementDetailProps> = ({
  item,
  pole,
  dataService,
  userAccess,
  onClose,
  onUpdated
}) => {
  const [pendingAction, setPendingAction] = React.useState<WorkflowAction | undefined>();
  const [comment, setComment] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const isSigner1 = userAccess.roles.indexOf('signataire1') !== -1;
  const isSigner2 = userAccess.roles.indexOf('signataire2') !== -1;
  const canSubmit = userAccess.roles.indexOf('emetteur') !== -1
    && (item.status === 'Brouillon' || item.status === 'Refusé');
  const signer1Status = item.status === 'Soumis au Signataire 1'
    || item.status === "En cours d'analyse par un Signataire 1";
  const signer2Status = item.status === 'Soumis au Signataire 2'
    || item.status === "En cours d'analyse par un Signataire 2";
  const canReviewAsSigner1 = isSigner1 && signer1Status;
  const canReviewAsSigner2 = isSigner2 && signer2Status;
  const canTakeControl = (item.status === 'Soumis au Signataire 1' && isSigner1)
    || (item.status === 'Soumis au Signataire 2' && isSigner2);
  const canReleaseControl = (item.status === "En cours d'analyse par un Signataire 1" && isSigner1)
    || (item.status === "En cours d'analyse par un Signataire 2" && isSigner2);
  const canArchiveOnValidation = canReviewAsSigner2 || (canReviewAsSigner1 && item.period === 'mensuel');
  const canPassToSigner2 = canReviewAsSigner1 && item.period !== 'mensuel';

  const saveChanges = async (changes: IRapprochementUpdate): Promise<void> => {
    setErrorMessage('');
    setIsSaving(true);
    try {
      await dataService.updateRapprochement(pole, item.id, changes);
      onUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const updateStatus = (status: string, changes: IRapprochementUpdate): Promise<void> => (
    saveChanges({ status, ...changes })
  );

  const handleTakeControl = async (): Promise<void> => {
    await updateStatus(
      item.status === 'Soumis au Signataire 1'
        ? "En cours d'analyse par un Signataire 1"
        : "En cours d'analyse par un Signataire 2",
      { beingAnalysedById: userAccess.currentUserId }
    );
  };

  const handleReleaseControl = async (): Promise<void> => {
    await updateStatus(
      item.status === "En cours d'analyse par un Signataire 1"
        ? 'Soumis au Signataire 1'
        : 'Soumis au Signataire 2',
      { beingAnalysedById: null }
    );
  };

  const handleConfirmAction = async (): Promise<void> => {
    if (!pendingAction) {
      return;
    }

    const now = new Date().toISOString();
    let status: string;
    let changes: IRapprochementUpdate;
    if (pendingAction === 'submit') {
      status = 'Soumis au Signataire 1';
      changes = {
        emitterId: userAccess.currentUserId,
        emissionDate: now,
        emitterComment: comment,
        useSecondPassFields: Boolean(item.secondPass)
      };
    } else if (pendingAction === 'refuse') {
      if (!reason.trim()) {
        setErrorMessage('Indiquez le motif du refus.');
        return;
      }
      const isSecondSigner = signer2Status;
      status = item.secondPass ? 'Bloqué' : 'Refusé';
      changes = {
        beingAnalysedById: null,
        secondPass: true,
        useSecondPassFields: Boolean(item.secondPass),
        ...(isSecondSigner
          ? {
            signer2Id: userAccess.currentUserId,
            refusalReason2: reason.trim(),
            refusalComment2: comment
          }
          : {
            signer1Id: userAccess.currentUserId,
            refusalReason1: reason.trim(),
            refusalComment1: comment
          })
      };
    } else {
      const isSecondSigner = signer2Status;
      status = isSecondSigner || item.period === 'mensuel'
        ? 'Archivé'
        : 'Soumis au Signataire 2';
      changes = isSecondSigner
        ? {
          beingAnalysedById: null,
          signer2Id: userAccess.currentUserId,
          signatureDate2: now,
          signer2Comment: comment,
          useSecondPassFields: Boolean(item.secondPass)
        }
        : {
          beingAnalysedById: null,
          signer1Id: userAccess.currentUserId,
          signatureDate1: now,
          signer1Comment: comment,
          useSecondPassFields: Boolean(item.secondPass)
        };
    }

    await saveChanges({ status, ...changes });
  };

  const startAction = (action: WorkflowAction): void => {
    setErrorMessage('');
    setComment('');
    setReason('');
    setPendingAction(action);
  };

  const field = (label: string, value?: string): JSX.Element | null => {
    if (!value || !value.trim()) {
      return null;
    }

    return (
      <tr key={label}>
        <td className={styles.fieldLabel}>{label}</td>
        <td className={styles.fieldValue}>{value}</td>
      </tr>
    );
  };

  return (
    <section className={styles.detail} aria-labelledby="rapprochement-detail-title">
      <button className={styles.backButton} type="button" onClick={onClose}>
        Retour à la liste
      </button>
      <h2 className={styles.title} id="rapprochement-detail-title">Détail du rapprochement</h2>

      <table className={styles.fields}>
        <tbody>
        {field('Titre', item.title)}
        {field('Type', item.period === 'mensuel' ? 'Mensuel' : 'Trimestriel')}
        {field('Statut', item.status)}
        {field('Genre', item.genre)}
        {field('Société', item.company)}
        {field('Compte', item.account)}
        {field('Année', item.year)}
        {field('Mois', item.month)}
        {field('Description', item.description)}
        {field('Émetteur', item.emitter)}
        {field('Date d’émission', formatDate(item.emissionDate))}
        {field('Signataire 1 assigné', item.signer1Assigned)}
        {field('Signataire 1', item.signer1)}
        {field('Date de signature 1', formatDate(item.signatureDate1))}
        {field('Commentaire signataire 1', item.signer1Comment)}
        {field('Signataire 2 assigné', item.signer2Assigned)}
        {field('Signataire 2', item.signer2)}
        {field('Date de signature 2', formatDate(item.signatureDate2))}
        {field('Commentaire signataire 2', item.signer2Comment)}
        {field('Commentaire émetteur', item.emitterComment)}
        {field('Motif de refus signataire 1', item.refusalReason1)}
        {field('Commentaire retour signataire 1', item.refusalComment1)}
        {field('Motif de refus signataire 2', item.refusalReason2)}
        {field('Commentaire retour signataire 2', item.refusalComment2)}
        {field('En cours d’analyse par', item.beingAnalysedBy)}
        {item.secondPass && (
          <>
            {field('Émetteur (seconde passe)', item.emitterBis)}
            {field('Date d’émission (seconde passe)', formatDate(item.emissionDateBis))}
            {field('Signataire 1 (seconde passe)', item.signer1Bis)}
            {field('Date de signature 1 (seconde passe)', formatDate(item.signatureDate1Bis))}
            {field('Commentaire signataire 1 (seconde passe)', item.signer1CommentBis)}
            {field('Signataire 2 (seconde passe)', item.signer2Bis)}
            {field('Date de signature 2 (seconde passe)', formatDate(item.signatureDate2Bis))}
            {field('Commentaire signataire 2 (seconde passe)', item.signer2CommentBis)}
            {field('Commentaire émetteur (seconde passe)', item.emitterCommentBis)}
            {field('Motif de refus signataire 1 (seconde passe)', item.refusalReason1Bis)}
            {field('Commentaire retour signataire 1 (seconde passe)', item.refusalComment1Bis)}
            {field('Motif de refus signataire 2 (seconde passe)', item.refusalReason2Bis)}
            {field('Commentaire retour signataire 2 (seconde passe)', item.refusalComment2Bis)}
          </>
        )}
        </tbody>
      </table>

      <div className={styles.actions} aria-label="Actions du rapprochement">
        {canSubmit && (
          <button type="button" disabled={isSaving} onClick={() => startAction('submit')}>
            Soumettre à la validation
          </button>
        )}
        {canTakeControl && (
          <button type="button" disabled={isSaving} onClick={handleTakeControl}>
            Commencer l’analyse
          </button>
        )}
        {canReleaseControl && (
          <button type="button" disabled={isSaving} onClick={handleReleaseControl}>
            Arrêter l’analyse
          </button>
        )}
        {(canReviewAsSigner1 || canReviewAsSigner2) && (
          <>
            <button type="button" disabled={isSaving} onClick={() => startAction('refuse')}>
              Refuser le rapprochement
            </button>
            {(canArchiveOnValidation || canPassToSigner2) && (
              <button type="button" disabled={isSaving} onClick={() => startAction('validate')}>
                {canPassToSigner2
                  ? 'Valider et transmettre au signataire 2'
                  : 'Valider et archiver le rapprochement'}
              </button>
            )}
          </>
        )}
      </div>

      {pendingAction && (
        <div className={styles.actionForm}>
          <h3>
            {pendingAction === 'submit'
              ? 'Soumettre le rapprochement'
              : pendingAction === 'refuse'
                ? 'Refuser le rapprochement'
                : 'Valider le rapprochement'}
          </h3>
          {pendingAction === 'refuse' && (
            <label>
              Motif du refus
              <input value={reason} onChange={event => setReason(event.currentTarget.value)} />
            </label>
          )}
          <label>
            Commentaire
            <textarea value={comment} onChange={event => setComment(event.currentTarget.value)} rows={3} />
          </label>
          <div className={styles.formActions}>
            <button type="button" disabled={isSaving} onClick={handleConfirmAction}>
              {isSaving ? 'Enregistrement…' : 'Confirmer'}
            </button>
            <button type="button" disabled={isSaving} onClick={() => setPendingAction(undefined)}>
              Annuler
            </button>
          </div>
        </div>
      )}
      {errorMessage && <p className={styles.error} role="alert">{errorMessage}</p>}
    </section>
  );
};
