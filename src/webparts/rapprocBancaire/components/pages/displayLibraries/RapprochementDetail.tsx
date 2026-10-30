import * as React from 'react';
import { Action } from '../../../../rapprochements/workflow/models';
import type {
  IDonneesTransition,
  IRapprochementWorkflow,
  ValeurPayload
} from '../../../../rapprochements/workflow/models/Rapprochement';
import { appliquerTransition, getActionsDisponibles } from '../../../../rapprochements/workflow/workflow';
import styles from './RapprochementDetail.module.scss';
import type { IRapprochementService } from './services/IRapprochementService';
import type {
  IRapprochement,
  IRapprochementAttachment,
  IRapprochementUpdate,
  IUserAccess,
  PoleKey
} from './services/models';
import { toServiceUpdate, toWorkflowRapprochement, toWorkflowRoles } from './workflowAdapter';

interface IRapprochementDetailProps {
  item: IRapprochement;
  pole: PoleKey;
  dataService: IRapprochementService;
  userAccess: IUserAccess;
  onClose: () => void;
  onUpdated: () => void;
}

type EditableField = 'month' | 'year' | 'account' | 'company' | 'genre' | 'description';

interface IEditableValues {
  month: string;
  year: string;
  account: string;
  company: string;
  genre: string;
  description: string;
}

const formatDate = (value?: string): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const formatMetadataDate = (value?: string): string => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
};

export const RapprochementDetail: React.FC<IRapprochementDetailProps> = ({
  item,
  pole,
  dataService,
  userAccess,
  onClose,
  onUpdated
}) => {
  const [pendingAction, setPendingAction] = React.useState<Action | undefined>();
  const [comment, setComment] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');
  const [isSaving, setIsSaving] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [attachments, setAttachments] = React.useState<IRapprochementAttachment[]>(item.attachments || []);
  const [isLoadingAttachments, setIsLoadingAttachments] = React.useState<boolean>(true);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [editValues, setEditValues] = React.useState<IEditableValues>({
    month: item.month,
    year: item.year,
    account: item.account,
    company: item.company,
    genre: item.genre,
    description: item.description || ''
  });
  const workflowContextState = React.useMemo<{
    context?: IRapprochementWorkflow;
    error?: string;
  }>(() => {
    try {
      return { context: toWorkflowRapprochement(item) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }, [item]);
  const workflowRoles = toWorkflowRoles(userAccess.roles);
  const availableActions = workflowContextState.context
    ? getActionsDisponibles(workflowContextState.context, workflowRoles)
    : [];
  const canPerform = (action: Action): boolean => availableActions.indexOf(action) !== -1;

  React.useEffect(() => {
    let isCurrentRequest = true;
    dataService.getAttachments(pole, item.id, item.period).then(
      result => {
        if (isCurrentRequest) {
          setAttachments(result);
          setIsLoadingAttachments(false);
        }
      },
      error => {
        if (isCurrentRequest) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setIsLoadingAttachments(false);
        }
      }
    );

    return () => {
      isCurrentRequest = false;
    };
  }, [dataService, item.id, item.period, pole]);

  const saveChanges = async (changes: IRapprochementUpdate): Promise<boolean> => {
    setErrorMessage('');
    setIsSaving(true);
    try {
      await dataService.updateRapprochement(pole, item.id, changes);
      onUpdated();
      return true;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const applyWorkflowAction = async (
    action: Action,
    data: Omit<IDonneesTransition, 'roles'> = {}
  ): Promise<boolean> => {
    const workflowContext = workflowContextState.context;
    if (!workflowContext) {
      setErrorMessage(workflowContextState.error || 'Les actions sont indisponibles pour cet élément.');
      return false;
    }

    try {
      const transition = appliquerTransition(workflowContext, action, {
        ...data,
        roles: workflowRoles
      });
      return await saveChanges(toServiceUpdate(transition, workflowContext.secondePasse));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      return false;
    }
  };

  const handleTakeControl = async (): Promise<void> => {
    await applyWorkflowAction(
      Action.PrendreLaMain,
      userAccess.currentUserId === undefined ? {} : { utilisateurId: userAccess.currentUserId }
    );
  };

  const handleReleaseControl = async (): Promise<void> => {
    await applyWorkflowAction(Action.Liberer);
  };

  const handleConfirmAction = async (): Promise<void> => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction === Action.Refuser) {
      if (!reason.trim()) {
        setErrorMessage('Indiquez le motif du refus.');
        return;
      }
    }

    const saved = await applyWorkflowAction(pendingAction, {
      date: new Date().toISOString(),
      commentaire: comment,
      ...(pendingAction === Action.Refuser ? { motif: reason.trim() } : {}),
      ...(userAccess.currentUserId === undefined ? {} : { utilisateurId: userAccess.currentUserId })
    });
    if (saved) {
      setPendingAction(undefined);
    }
  };

  const handleSaveEdit = async (): Promise<void> => {
    const company = editValues.company.trim();
    const year = editValues.year.trim();
    const month = editValues.month.trim();
    const account = editValues.account.trim();
    const modifications: Record<string, ValeurPayload> = {
      title: [company, year, month, account].filter(Boolean).join(' - '),
      company,
      year,
      month,
      account,
      genre: editValues.genre.trim(),
      description: editValues.description.trim()
    };
    const saved = await applyWorkflowAction(Action.Modifier, { modifications });
    if (saved) {
      setIsEditing(false);
    }
  };

  const startAction = (action: Action): void => {
    setErrorMessage('');
    setComment('');
    setReason('');
    setPendingAction(action);
  };

  const field = (label: string, value?: React.ReactNode): JSX.Element | null => {
    const hasValue = typeof value === 'string'
      ? Boolean(value.trim())
      : value !== undefined && value !== null && value !== false;
    if (!hasValue) {
      return null;
    }

    return (
      <tr key={label}>
        <td className={styles.fieldLabel}>{label}</td>
        <td className={styles.fieldValue}>{value}</td>
      </tr>
    );
  };

  const editableField = (label: string, key: EditableField): JSX.Element => (
    <tr key={label}>
      <td className={styles.fieldLabel}>{label}</td>
      <td className={styles.fieldValue}>
        {key === 'description' ? (
          <textarea
            value={editValues[key]}
            onChange={event => setEditValues(values => ({ ...values, [key]: event.currentTarget.value }))}
            rows={3}
            disabled={isSaving}
          />
        ) : (
          <input
            value={editValues[key]}
            onChange={event => setEditValues(values => ({ ...values, [key]: event.currentTarget.value }))}
            disabled={isSaving}
          />
        )}
      </td>
    </tr>
  );

  const metadataField = (label: string, value: string): JSX.Element | null => (
    value.trim()
      ? <div key={label}>{label} {value}</div>
      : null
  );

  const attachmentValue = isLoadingAttachments
    ? 'Chargement des pièces jointes…'
    : attachments.length > 0
      ? (
        <div className={styles.attachmentList}>
          {attachments.map(attachment => (
            <a key={`${attachment.name}-${attachment.url}`} href={attachment.url} target="_blank" rel="noreferrer">
              {attachment.name}
            </a>
          ))}
        </div>
      )
      : '';

  return (
    <section className={styles.detail} aria-labelledby="rapprochement-detail-title">
      <h2 className={styles.title} id="rapprochement-detail-title" hidden>Détail du rapprochement</h2>

      <table className={styles.fields}>
        <tbody>
        {field('Titre', item.title)}
        {field('Type', item.period === 'mensuel' ? 'Mensuel' : 'Trimestriel')}
        {field('Statut', item.status)}
        {isEditing ? (
          <>
            {editableField('Genre', 'genre')}
            {editableField('Société', 'company')}
            {editableField('Compte', 'account')}
            {editableField('Année', 'year')}
            {editableField('Mois', 'month')}
            {editableField('Description', 'description')}
          </>
        ) : (
          <>
            {field('Genre', item.genre)}
            {field('Société', item.company)}
            {field('Compte', item.account)}
            {field('Année', item.year)}
            {field('Mois', item.month)}
            {field('Description', item.description)}
          </>
        )}
        {field('Pièce(s) jointe(s)', attachmentValue)}
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

      {pendingAction && (
        <div className={styles.actionForm}>
          <h3>
            {pendingAction === Action.Soumettre
              ? 'Soumettre le rapprochement'
              : pendingAction === Action.Refuser
                ? 'Refuser le rapprochement'
                : 'Valider le rapprochement'}
          </h3>
          {pendingAction === Action.Refuser && (
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
      {workflowContextState.error && (
        <p className={styles.error} role="alert">{workflowContextState.error}</p>
      )}

      <footer className={styles.footer}>
        <div className={styles.metadata}>
          {metadataField('Type de contenu :', item.contentType || '')}
          {metadataField('Créé le', [formatMetadataDate(item.created), item.author ? `par ${item.author}` : ''].filter(Boolean).join(' '))}
          {metadataField('Dernière modification le', [
            formatMetadataDate(item.modified),
            item.editor ? `par ${item.editor}` : ''
          ].filter(Boolean).join(' '))}
        </div>
        <div className={styles.actions} aria-label="Actions du rapprochement">
          <button type="button" disabled={isSaving} onClick={onClose}>Retour</button>
          {isEditing ? (
            <>
              <button type="button" disabled={isSaving} onClick={handleSaveEdit}>
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" disabled={isSaving} onClick={() => {
                setEditValues({
                  month: item.month,
                  year: item.year,
                  account: item.account,
                  company: item.company,
                  genre: item.genre,
                  description: item.description || ''
                });
                setIsEditing(false);
              }}>
                Annuler
              </button>
            </>
          ) : (
            <>
              {canPerform(Action.Modifier) && (
                <button type="button" disabled={isSaving} onClick={() => setIsEditing(true)}>
                  Modifier
                </button>
              )}
              {canPerform(Action.Soumettre) && (
                <button type="button" disabled={isSaving} onClick={() => startAction(Action.Soumettre)}>
                  Soumettre à la validation
                </button>
              )}
              {canPerform(Action.PrendreLaMain) && (
                <button type="button" disabled={isSaving} onClick={handleTakeControl}>
                  Commencer l’analyse
                </button>
              )}
              {canPerform(Action.Liberer) && (
                <button type="button" disabled={isSaving} onClick={handleReleaseControl}>
                  Arrêter l’analyse
                </button>
              )}
              {canPerform(Action.Refuser) && (
                <button type="button" disabled={isSaving} onClick={() => startAction(Action.Refuser)}>
                  Refuser le rapprochement
                </button>
              )}
              {(canPerform(Action.Valider) || canPerform(Action.ValiderEtArchiver)) && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => startAction(
                    canPerform(Action.Valider) ? Action.Valider : Action.ValiderEtArchiver
                  )}
                >
                  {canPerform(Action.Valider)
                    ? 'Valider et transmettre au signataire 2'
                    : 'Valider et archiver le rapprochement'}
                </button>
              )}
            </>
          )}
        </div>
      </footer>
    </section>
  );
};
